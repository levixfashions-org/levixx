import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/db.js';
import { getRazorpay, isRazorpayConfigured } from '../config/razorpay.js';
import { AppError } from '../middleware/errorHandler.js';
import { broadcastChange } from './live.js';
import { notifyOrderPush } from './push.js';
/** Refund states kept on the order. */
export const REFUND = {
    REQUESTING: 'REQUESTING', // we are talking to Razorpay right now (guards against double clicks)
    PROCESSING: 'PROCESSING', // Razorpay accepted it; money is on its way (normal speed ≈ 5–7 working days)
    PROCESSED: 'PROCESSED', // money sent back to the customer's original payment method
    FAILED: 'FAILED' // Razorpay refused / failed — can be retried
};
function razorpayError(err) {
    const d = err?.error?.description || err?.error?.reason || err?.message || 'Razorpay could not process the refund';
    return String(d).slice(0, 280);
}
/**
 * Full refund of a paid online order through Razorpay. Safe against double refunds:
 * the order is "locked" (REQUESTING) with a conditional update before Razorpay is called.
 */
export async function refundOrder(orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    if (!order)
        throw new AppError('Order not found', 404);
    if (order.paymentMethod === 'COD')
        throw new AppError('Cash on Delivery orders are refunded by you directly (cash/UPI), not through Razorpay.', 400);
    if (order.paymentStatus !== PaymentStatus.PAID && order.paymentStatus !== PaymentStatus.REFUNDED) {
        throw new AppError('This order was never paid online, so there is nothing to refund.', 400);
    }
    if (order.refundStatus === REFUND.PROCESSED || order.paymentStatus === PaymentStatus.REFUNDED) {
        throw new AppError('This order has already been refunded.', 400);
    }
    if (order.refundStatus === REFUND.PROCESSING)
        throw new AppError('A refund for this order is already on its way.', 400);
    if (order.refundStatus === REFUND.REQUESTING)
        throw new AppError('A refund for this order is being sent right now — please wait a moment.', 409);
    const paymentId = order.payment?.razorpayPaymentId;
    if (!paymentId)
        throw new AppError('No Razorpay payment ID is saved for this order. Refund it from the Razorpay dashboard instead.', 400);
    if (!isRazorpayConfigured())
        throw new AppError('Razorpay keys are not configured on the server.', 503);
    const amount = order.payment?.amountPaise || order.totalPaise;
    if (!amount || amount < 100)
        throw new AppError('Refund amount is too small (Razorpay minimum is ₹1).', 400);
    // Lock: only one refund attempt can win.
    const lock = await prisma.order.updateMany({
        where: { id: order.id, OR: [{ refundStatus: null }, { refundStatus: REFUND.FAILED }] },
        data: { refundStatus: REFUND.REQUESTING, refundError: null, refundRequestedAt: new Date() }
    });
    if (lock.count !== 1)
        throw new AppError('A refund for this order is already in progress.', 409);
    let refund;
    try {
        refund = await getRazorpay().payments.refund(paymentId, {
            amount,
            speed: 'normal',
            receipt: order.orderNumber.slice(0, 40),
            notes: { order_number: order.orderNumber, reason: 'Order cancelled by LEVIX' }
        });
    }
    catch (err) {
        const message = razorpayError(err);
        // Razorpay says it's already fully refunded (e.g. done earlier from the dashboard) → record that instead of failing.
        if (/fully refunded|already been refunded|refunded fully/i.test(message)) {
            const done = await prisma.order.update({
                where: { id: order.id },
                data: { refundStatus: REFUND.PROCESSED, refundAmountPaise: amount, refundedAt: new Date(), paymentStatus: PaymentStatus.REFUNDED, status: OrderStatus.CANCELLED }
            });
            await prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: PaymentStatus.REFUNDED } });
            broadcastChange('orders');
            return { order: done, refund: null, alreadyRefunded: true };
        }
        await prisma.order.update({ where: { id: order.id }, data: { refundStatus: REFUND.FAILED, refundError: message } });
        broadcastChange('orders');
        throw new AppError(`Refund failed: ${message}`, 502);
    }
    const processed = refund?.status === 'processed';
    const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
            refundId: String(refund?.id || '').slice(0, 40) || null,
            refundAmountPaise: Number(refund?.amount) || amount,
            refundStatus: processed ? REFUND.PROCESSED : REFUND.PROCESSING,
            refundError: null,
            ...(processed ? { refundedAt: new Date(), paymentStatus: PaymentStatus.REFUNDED } : {}),
            // A refunded order is always a cancelled order.
            ...(order.status !== OrderStatus.CANCELLED ? { status: OrderStatus.CANCELLED } : {})
        }
    });
    if (processed)
        await prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: PaymentStatus.REFUNDED } });
    notifyOrderPush(order.id, processed ? 'refunded' : 'refund_started');
    broadcastChange('orders');
    return { order: updated, refund, alreadyRefunded: false };
}
/**
 * Razorpay webhook: refund.created / refund.processed / refund.failed.
 * Also records refunds you make by hand in the Razorpay dashboard.
 */
export async function handleRefundWebhook(event, refundEntity) {
    const paymentId = refundEntity?.payment_id;
    if (!paymentId)
        return;
    const payment = await prisma.payment.findFirst({ where: { razorpayPaymentId: paymentId }, select: { orderId: true } });
    if (!payment)
        return;
    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!order)
        return;
    const base = {
        refundId: order.refundId || String(refundEntity.id || '').slice(0, 40) || null,
        refundAmountPaise: Number(refundEntity.amount) || order.refundAmountPaise || order.totalPaise
    };
    if (event === 'refund.processed') {
        if (order.refundStatus === REFUND.PROCESSED)
            return;
        await prisma.order.update({
            where: { id: order.id },
            data: {
                ...base,
                refundStatus: REFUND.PROCESSED,
                refundError: null,
                refundedAt: new Date(),
                paymentStatus: PaymentStatus.REFUNDED,
                ...(order.status !== OrderStatus.CANCELLED ? { status: OrderStatus.CANCELLED } : {})
            }
        });
        await prisma.payment.updateMany({ where: { orderId: order.id }, data: { status: PaymentStatus.REFUNDED } });
        notifyOrderPush(order.id, 'refunded');
    }
    else if (event === 'refund.failed') {
        if (order.refundStatus === REFUND.PROCESSED)
            return;
        await prisma.order.update({
            where: { id: order.id },
            data: { ...base, refundStatus: REFUND.FAILED, refundError: String(refundEntity?.error_description || 'Refund failed at the bank').slice(0, 280) }
        });
    }
    else if (event === 'refund.created') {
        if (order.refundStatus === REFUND.PROCESSED || order.refundStatus === REFUND.PROCESSING)
            return;
        await prisma.order.update({ where: { id: order.id }, data: { ...base, refundStatus: REFUND.PROCESSING, refundRequestedAt: order.refundRequestedAt || new Date() } });
    }
    else
        return;
    broadcastChange('orders');
}
