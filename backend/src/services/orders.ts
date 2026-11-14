import crypto from 'crypto';
import { DiscountType, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** e.g. LVX-261110-7KQ2MP */
export function generateOrderNumber(): string {
  const d = new Date();
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const ymd = ist.toISOString().slice(2, 10).replace(/-/g, '');
  return `LVX-${ymd}-${randomCode(6)}`;
}

export function generateAccessKey(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function safeEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export interface CouponResult {
  code: string;
  discountPaise: number;
  description: string;
}

/** Validates a coupon against a subtotal. Throws AppError with a customer-friendly message if invalid. */
export async function evaluateCoupon(rawCode: string, subtotalPaise: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new AppError('Enter a coupon code', 400);
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) throw new AppError('This coupon code is not valid', 400);
  if (coupon.validUntil && coupon.validUntil.getTime() < Date.now()) {
    throw new AppError('This coupon has expired', 400);
  }
  if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
    throw new AppError('This coupon has reached its usage limit', 400);
  }
  if (subtotalPaise < coupon.minOrderPaise) {
    throw new AppError(
      `Add items worth Rs. ${Math.ceil((coupon.minOrderPaise - subtotalPaise) / 100).toLocaleString('en-IN')} more to use ${code}`,
      400
    );
  }

  let discountPaise =
    coupon.discountType === DiscountType.PERCENTAGE
      ? Math.round((subtotalPaise * Math.min(100, coupon.discountValue)) / 100)
      : coupon.discountValue;
  discountPaise = Math.max(0, Math.min(discountPaise, subtotalPaise));

  const description =
    coupon.discountType === DiscountType.PERCENTAGE
      ? `${coupon.discountValue}% off`
      : `Rs. ${(coupon.discountValue / 100).toLocaleString('en-IN')} off`;

  return { code, discountPaise, description };
}

interface PaymentInfo {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string | null;
  amountPaise?: number;
  rawPayload?: any;
}

/**
 * Marks an order as paid exactly once (safe against the verify call and the webhook racing each other),
 * deducts stock, records the payment, bumps coupon usage and empties the buyer's cart.
 * Returns true if this call performed the transition.
 */
export async function markOrderPaid(orderId: string, info: PaymentInfo): Promise<boolean> {
  const done = await markOrderPaidTx(orderId, info);
  // Confirmation to the customer + "new order" alert to the owner (only if the store mailbox is set up).
  if (done) notifyOrder(orderId);
  return done;
}

/** Fire-and-forget order emails; never blocks or fails a payment. */
export function notifyOrder(orderId: string): void {
  // A new paid / COD order can change the best-seller order on the shop.
  import('./bestsellers.js').then((m) => m.scheduleSalesRecompute()).catch(() => {});
  import('./push.js').then((m) => m.notifyOrderPush(orderId, 'confirmed')).catch(() => {});
  import('./orderEmails.js')
    .then((m) => m.sendOrderEmails(orderId))
    .catch((err) => console.error('Order email error:', err?.message || err));
}

async function markOrderPaidTx(orderId: string, info: PaymentInfo): Promise<boolean> {
  return prisma.$transaction(
    async (tx) => {
      const transition = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: { not: PaymentStatus.PAID } },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          stockDeducted: true
        }
      });
      if (transition.count === 0) return false;

      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });

      await tx.payment.upsert({
        where: { orderId },
        update: {
          status: PaymentStatus.PAID,
          razorpayOrderId: info.razorpayOrderId,
          razorpayPaymentId: info.razorpayPaymentId,
          razorpaySignature: info.razorpaySignature ?? undefined,
          ...(info.rawPayload ? { rawPayload: info.rawPayload as Prisma.InputJsonValue } : {})
        },
        create: {
          orderId,
          amountPaise: info.amountPaise ?? order.totalPaise,
          razorpayOrderId: info.razorpayOrderId,
          razorpayPaymentId: info.razorpayPaymentId,
          razorpaySignature: info.razorpaySignature ?? null,
          status: PaymentStatus.PAID,
          ...(info.rawPayload ? { rawPayload: info.rawPayload as Prisma.InputJsonValue } : {})
        }
      });

      const oversold: string[] = [];
      for (const item of order.items) {
        if (!item.variantId) continue;
        const dec = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } }
        });
        if (dec.count === 0) {
          await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stockQuantity: 0 } });
          oversold.push(`${item.productName} (${[item.color, item.size].filter(Boolean).join(' / ')}) x${item.quantity}`);
        }
      }
      if (oversold.length) {
        console.warn(`⚠️ Order ${order.orderNumber} paid but stock was short for: ${oversold.join(', ')}`);
        await tx.order.update({
          where: { id: orderId },
          data: {
            adminNotes: `${order.adminNotes ? order.adminNotes + '\n' : ''}⚠️ Stock was short when payment completed: ${oversold.join(', ')}`
          }
        });
      }

      if (order.couponCode) {
        await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
      }

      if (order.cartId) {
        await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
      }
      return true;
    },
    { timeout: 20000, maxWait: 10000 }
  );
}

export function formatAddress(snapshot: any): string {
  if (!snapshot || typeof snapshot !== 'object') return '';
  return [snapshot.fullName, snapshot.line1, snapshot.line2, snapshot.city, snapshot.state, snapshot.postalCode, snapshot.country]
    .filter(Boolean)
    .join(', ');
}
