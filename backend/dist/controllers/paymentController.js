import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '../config/db.js';
import { getRazorpay, verifyPaymentSignature, verifyWebhookSignature } from '../config/razorpay.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { markOrderPaid } from '../services/orders.js';
const verifySchema = z.object({
    orderNumber: z.string().min(5).max(40),
    razorpayOrderId: z.string().min(5).max(60),
    razorpayPaymentId: z.string().min(5).max(60),
    razorpaySignature: z.string().min(10).max(200)
});
export async function verifyPayment(req, res) {
    const { orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature } = verifySchema.parse(req.body);
    const order = await prisma.order.findUnique({ where: { orderNumber } });
    if (!order)
        throw new AppError('Order not found', 404);
    // The payment must belong to the Razorpay order that was created for THIS order (and therefore this amount).
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpayOrderId) {
        throw new AppError('Payment does not match this order', 400);
    }
    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
        await prisma.payment
            .upsert({
            where: { orderId: order.id },
            update: { status: PaymentStatus.FAILED, razorpayPaymentId },
            create: {
                orderId: order.id,
                amountPaise: order.totalPaise,
                razorpayOrderId,
                razorpayPaymentId,
                status: PaymentStatus.FAILED
            }
        })
            .catch(() => undefined);
        throw new AppError('Payment verification failed. If money was deducted it will be refunded automatically.', 400);
    }
    if (order.paymentStatus !== PaymentStatus.PAID) {
        // Double-check with Razorpay and capture the payment if it was only authorised.
        try {
            const rzp = getRazorpay();
            const payment = await rzp.payments.fetch(razorpayPaymentId);
            if (payment.order_id !== razorpayOrderId || Number(payment.amount) !== order.totalPaise) {
                throw new AppError('Payment amount mismatch. Please contact support.', 400);
            }
            if (payment.status === 'authorized') {
                await rzp.payments.capture(razorpayPaymentId, order.totalPaise, 'INR');
            }
        }
        catch (err) {
            if (err instanceof AppError)
                throw err;
            // Signature already proves authenticity; a Razorpay API hiccup shouldn't block the customer.
            console.warn('Razorpay payment fetch/capture warning:', err?.error?.description || err?.message);
        }
        await markOrderPaid(order.id, {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            amountPaise: order.totalPaise
        });
    }
    res.json({ success: true, orderNumber: order.orderNumber });
}
export async function handleWebhook(req, res) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
        console.warn('Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured — ignoring.');
        res.status(503).json({ error: 'Webhook not configured' });
        return;
    }
    const signature = req.headers['x-razorpay-signature'];
    if (!signature || !req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
        res.status(400).json({ error: 'Invalid webhook signature' });
        return;
    }
    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;
    const rzpOrderId = paymentEntity?.order_id || req.body?.payload?.order?.entity?.id;
    if (rzpOrderId) {
        const order = await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } });
        if (order) {
            if ((event === 'payment.captured' || event === 'order.paid') && paymentEntity) {
                if (Number(paymentEntity.amount) === order.totalPaise) {
                    await markOrderPaid(order.id, {
                        razorpayOrderId: rzpOrderId,
                        razorpayPaymentId: paymentEntity.id,
                        amountPaise: Number(paymentEntity.amount),
                        rawPayload: req.body.payload
                    });
                }
                else {
                    console.error(`Webhook amount mismatch for ${order.orderNumber}: ${paymentEntity.amount} vs ${order.totalPaise}`);
                }
            }
            else if (event === 'payment.failed' && order.paymentStatus !== PaymentStatus.PAID && paymentEntity) {
                await prisma.payment
                    .upsert({
                    where: { orderId: order.id },
                    update: { status: PaymentStatus.FAILED, razorpayPaymentId: paymentEntity.id },
                    create: {
                        orderId: order.id,
                        amountPaise: order.totalPaise,
                        razorpayOrderId: rzpOrderId,
                        razorpayPaymentId: paymentEntity.id,
                        status: PaymentStatus.FAILED
                    }
                })
                    .catch(() => undefined);
            }
        }
    }
    res.json({ status: 'ok' });
}
