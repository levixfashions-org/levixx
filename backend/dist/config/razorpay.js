import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from './env.js';
let instance = null;
export function isRazorpayConfigured() {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}
export function getRazorpay() {
    if (!isRazorpayConfigured()) {
        throw new Error('Razorpay keys are not configured');
    }
    if (!instance) {
        instance = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
    }
    return instance;
}
/** 'test' / 'live' from the Key ID prefix, or 'invalid' if it doesn't look like a Razorpay key. */
export function razorpayMode() {
    const id = env.RAZORPAY_KEY_ID;
    if (!id)
        return 'missing';
    if (/^rzp_test_[A-Za-z0-9]+$/.test(id))
        return 'test';
    if (/^rzp_live_[A-Za-z0-9]+$/.test(id))
        return 'live';
    return 'invalid';
}
let check = null;
/**
 * Real check that the Key ID + Secret pair works (asks Razorpay for 1 order). Cached for 10 minutes.
 * Returns 'ok', 'keys-rejected' (wrong ID/secret pair) or 'unreachable'.
 */
export async function razorpayKeyCheck() {
    if (!isRazorpayConfigured())
        return 'missing';
    if (check && Date.now() - check.at < 10 * 60 * 1000)
        return check.result;
    let result = 'ok';
    try {
        await Promise.race([
            getRazorpay().orders.all({ count: 1 }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
        ]);
    }
    catch (err) {
        const code = err?.statusCode || err?.error?.code;
        result = code === 401 || /auth/i.test(String(err?.error?.description || err?.message || '')) ? 'keys-rejected' : 'unreachable';
    }
    check = { at: Date.now(), result };
    return result;
}
function safeEqualHex(a, b) {
    try {
        const ab = Buffer.from(a, 'hex');
        const bb = Buffer.from(b, 'hex');
        if (ab.length === 0 || ab.length !== bb.length)
            return false;
        return crypto.timingSafeEqual(ab, bb);
    }
    catch {
        return false;
    }
}
/** Verifies the signature returned by Razorpay Checkout after a successful payment. */
export function verifyPaymentSignature(orderId, paymentId, signature) {
    if (!env.RAZORPAY_KEY_SECRET)
        return false;
    const expected = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    return safeEqualHex(expected, signature);
}
/** Verifies the X-Razorpay-Signature header of a webhook call (uses the raw request body). */
export function verifyWebhookSignature(rawBody, signature) {
    if (!env.RAZORPAY_WEBHOOK_SECRET)
        return false;
    const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return safeEqualHex(expected, signature);
}
