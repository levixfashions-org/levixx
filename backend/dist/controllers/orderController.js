import { z } from 'zod';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { getRazorpay, isRazorpayConfigured } from '../config/razorpay.js';
import { AppError } from '../middleware/errorHandler.js';
import { addressSchema } from './authController.js';
import { formatCart, getAnonymousToken, imageForColor, resolveCart } from './cartController.js';
import { calculateShippingPaise, getSettings } from '../services/store.js';
import { evaluateCoupon, formatAddress, generateAccessKey, generateOrderNumber, safeEqual } from '../services/orders.js';
const createOrderSchema = z.object({
    customerEmail: z.string().trim().toLowerCase().email('Enter a valid email address'),
    customerName: z.string().trim().min(2, 'Enter your full name').max(100),
    customerPhone: addressSchema.shape.phone,
    shippingAddress: addressSchema.omit({ isDefault: true }),
    couponCode: z.string().trim().max(40).optional().or(z.literal('')),
    saveAddress: z.boolean().optional()
});
export async function validateCoupon(req, res) {
    const { code } = z.object({ code: z.string().trim().min(1).max(40) }).parse(req.body);
    const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
    const formatted = await formatCart(cart);
    if (formatted.items.length === 0)
        throw new AppError('Your bag is empty', 400);
    const result = await evaluateCoupon(code, formatted.subtotalPaise);
    res.json(result);
}
export async function createOrder(req, res) {
    if (!isRazorpayConfigured()) {
        throw new AppError('Online payments are temporarily unavailable. Please try again shortly.', 503);
    }
    const data = createOrderSchema.parse(req.body);
    const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
    const items = cart.items.filter((i) => i.variant?.product?.isActive);
    if (items.length === 0)
        throw new AppError('Your bag is empty', 400);
    let subtotalPaise = 0;
    for (const item of items) {
        if (item.quantity > item.variant.stockQuantity) {
            throw new AppError(item.variant.stockQuantity <= 0
                ? `${item.variant.product.name} (${[item.variant.color, item.variant.size].filter(Boolean).join(' / ')}) just sold out. Please remove it from your bag.`
                : `Only ${item.variant.stockQuantity} left of ${item.variant.product.name} (${[item.variant.color, item.variant.size].filter(Boolean).join(' / ')}). Please update your bag.`, 409);
        }
        subtotalPaise += (item.variant.product.basePrice + item.variant.priceDelta) * item.quantity;
    }
    let discountPaise = 0;
    let couponCode = null;
    if (data.couponCode) {
        const coupon = await evaluateCoupon(data.couponCode, subtotalPaise);
        discountPaise = coupon.discountPaise;
        couponCode = coupon.code;
    }
    const settings = await getSettings();
    const shippingPaise = calculateShippingPaise(subtotalPaise, settings);
    const totalPaise = Math.max(0, subtotalPaise - discountPaise) + shippingPaise;
    if (totalPaise < 100)
        throw new AppError('Order total must be at least Rs. 1', 400);
    const orderNumber = generateOrderNumber();
    const accessKey = generateAccessKey();
    let rzpOrder;
    try {
        rzpOrder = await getRazorpay().orders.create({
            amount: totalPaise,
            currency: 'INR',
            receipt: orderNumber,
            notes: { orderNumber, customerEmail: data.customerEmail }
        });
    }
    catch (err) {
        console.error('Razorpay order creation failed:', err?.error || err?.message || err);
        throw new AppError('Could not start the payment. Please try again in a moment.', 502);
    }
    const order = await prisma.order.create({
        data: {
            orderNumber,
            accessKey,
            userId: req.user?.id || null,
            cartId: cart.id,
            customerEmail: data.customerEmail,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            shippingAddressSnapshot: { ...data.shippingAddress, phone: data.shippingAddress.phone },
            subtotalPaise,
            shippingPaise,
            discountPaise,
            totalPaise,
            couponCode,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            razorpayOrderId: rzpOrder.id,
            items: {
                create: items.map((item) => {
                    const unit = item.variant.product.basePrice + item.variant.priceDelta;
                    return {
                        productId: item.variant.product.id,
                        variantId: item.variantId,
                        productName: item.variant.product.name,
                        productSlug: item.variant.product.slug,
                        size: item.variant.size,
                        color: item.variant.color,
                        unitPricePaise: unit,
                        quantity: item.quantity,
                        subtotalPaise: unit * item.quantity,
                        imageUrl: imageForColor(item.variant.product.images, item.variant.color)
                    };
                })
            }
        },
        include: { items: true }
    });
    // Save the address to the customer's account for faster checkout next time.
    if (req.user && data.saveAddress) {
        const existing = await prisma.address.findFirst({
            where: { userId: req.user.id, line1: data.shippingAddress.line1, postalCode: data.shippingAddress.postalCode }
        });
        if (!existing) {
            const count = await prisma.address.count({ where: { userId: req.user.id } });
            if (count < 10) {
                await prisma.address
                    .create({ data: { ...data.shippingAddress, userId: req.user.id, isDefault: count === 0 } })
                    .catch(() => undefined);
            }
        }
    }
    res.status(201).json({
        order: {
            id: order.id,
            orderNumber: order.orderNumber,
            totalPaise: order.totalPaise,
            customerEmail: order.customerEmail,
            customerName: order.customerName
        },
        accessKey,
        razorpayOrderId: rzpOrder.id,
        amountPaise: totalPaise,
        currency: 'INR',
        keyId: env.RAZORPAY_KEY_ID
    });
}
export async function getUserOrders(req, res) {
    if (!req.user)
        throw new AppError('Please sign in to continue.', 401);
    const orders = await prisma.order.findMany({
        where: {
            OR: [{ userId: req.user.id }, { customerEmail: req.user.email }],
            paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] }
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { items: true }
    });
    res.set('Cache-Control', 'no-store');
    res.json({ orders: orders.map(({ accessKey, adminNotes, cartId, ...o }) => o) });
}
export async function getOrderByNumber(req, res) {
    const { orderNumber } = req.params;
    const key = typeof req.query.key === 'string' ? req.query.key : undefined;
    const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
    if (!order)
        throw new AppError('Order not found', 404);
    const isOwner = req.user && (order.userId === req.user.id || order.customerEmail === req.user.email || req.user.role === Role.ADMIN);
    if (!isOwner && !safeEqual(key, order.accessKey)) {
        throw new AppError('Order not found', 404);
    }
    const { accessKey, adminNotes, cartId, ...publicOrder } = order;
    res.set('Cache-Control', 'no-store');
    res.json({ order: { ...publicOrder, shippingAddress: formatAddress(order.shippingAddressSnapshot) } });
}
/** Public order tracking: order number + checkout email. Returns status only (no address or payment details). */
export async function trackOrder(req, res) {
    const { orderNumber, email } = z
        .object({ orderNumber: z.string().trim().min(5).max(40), email: z.string().trim().toLowerCase().email() })
        .parse(req.body);
    const order = await prisma.order.findUnique({
        where: { orderNumber: orderNumber.toUpperCase() },
        include: { items: { select: { quantity: true } } }
    });
    if (!order || order.customerEmail.toLowerCase() !== email) {
        throw new AppError('No order found with that number and email', 404);
    }
    res.set('Cache-Control', 'no-store');
    res.json({
        order: {
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            courier: order.courier,
            trackingNumber: order.trackingNumber,
            createdAt: order.createdAt,
            itemCount: order.items.reduce((a, i) => a + i.quantity, 0)
        }
    });
}
