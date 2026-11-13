import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { isMailConfigured, sendMail } from './mailer.js';
import { getSettings } from './store.js';
import { formatAddress } from './orders.js';

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const rs = (p: number) => `₹${Math.round(p / 100).toLocaleString('en-IN')}`;

/**
 * Sends the "order confirmed" email to the customer and a "new order" alert to the store owner.
 * Only runs when the store mailbox (SMTP_USER / SMTP_PASS) is set up; failures never block checkout.
 */
export async function sendOrderEmails(orderId: string): Promise<void> {
  if (!isMailConfigured()) return;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return;
  const settings = await getSettings();
  const SITE = env.FRONTEND_URL || 'https://thelevix.shop';
  const link = `${SITE}/order-success/${encodeURIComponent(order.orderNumber)}${order.accessKey ? `?key=${encodeURIComponent(order.accessKey)}` : ''}`;
  const cod = order.paymentMethod === 'COD';
  const rows = order.items
    .map(
      (i) => `<tr><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #eee">${esc(i.productName)}<br><span style="color:#777;font-size:12px">${esc([i.color, i.size].filter(Boolean).join(' / '))} × ${i.quantity}</span></td><td style="padding:8px 0;font-size:14px;text-align:right;border-bottom:1px solid #eee">${rs(i.subtotalPaise)}</td></tr>`
    )
    .join('');
  const totals = `
<tr><td style="padding:6px 0;color:#555">Subtotal</td><td style="padding:6px 0;text-align:right">${rs(order.subtotalPaise)}</td></tr>
${order.discountPaise ? `<tr><td style="padding:6px 0;color:#555">Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ''}</td><td style="padding:6px 0;text-align:right">−${rs(order.discountPaise)}</td></tr>` : ''}
<tr><td style="padding:6px 0;color:#555">Delivery</td><td style="padding:6px 0;text-align:right">${order.shippingPaise ? rs(order.shippingPaise) : 'FREE'}</td></tr>
${order.codFeePaise ? `<tr><td style="padding:6px 0;color:#555">COD fee</td><td style="padding:6px 0;text-align:right">${rs(order.codFeePaise)}</td></tr>` : ''}
<tr><td style="padding:10px 0;font-weight:900;font-size:16px">${cod ? 'To pay on delivery' : 'Total paid'}</td><td style="padding:10px 0;text-align:right;font-weight:900;font-size:16px">${rs(order.totalPaise)}</td></tr>`;
  const address = esc(formatAddress(order.shippingAddressSnapshot));
  const wrap = (title: string, intro: string, button: string) => `<!doctype html><html><body style="margin:0;background:#efefef;font-family:Helvetica,Arial,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff">
<tr><td style="background:#000;padding:20px;text-align:center"><span style="color:#fff;font-size:24px;font-weight:900;letter-spacing:8px">LEVIX</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 6px;font-size:20px;text-transform:uppercase">${esc(title)}</h1>
<p style="margin:0 0 18px;font-size:14px;color:#444;line-height:1.6">${intro}</p>
<p style="margin:0 0 4px;font-size:12px;color:#777;text-transform:uppercase;letter-spacing:1px">Order ${esc(order.orderNumber)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;font-size:14px">${totals}</table>
<p style="margin:18px 0 4px;font-size:12px;color:#777;text-transform:uppercase;letter-spacing:1px">Delivering to</p>
<p style="margin:0 0 22px;font-size:14px;line-height:1.5">${address}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#000"><a href="${esc(button === 'admin' ? `${SITE}/admin/orders` : link)}" style="display:inline-block;padding:13px 26px;color:#fff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${button === 'admin' ? 'Open in admin' : 'View your order'}</a></td></tr></table>
</td></tr>
<tr><td style="border-top:1px solid #eee;padding:16px 28px;font-size:11px;color:#888;text-align:center">LEVIX · <a href="${SITE}" style="color:#888">thelevix.shop</a> · Damaged item? Reply within 48 hours of delivery with photos and an unboxing video.</td></tr>
</table></td></tr></table></body></html>`;

  const name = (order.customerName || '').trim().split(' ')[0] || 'there';
  const customerHtml = wrap(
    cod ? 'Order placed' : 'Order confirmed',
    `Hi ${esc(name)}, thank you for shopping with LEVIX! ${cod ? 'Your Cash on Delivery order is confirmed.' : 'We have received your payment.'} We pack and dispatch within 2–5 business days and will share tracking as soon as it ships.`,
    'customer'
  );
  const text = `Order ${order.orderNumber} — ${cod ? 'to pay on delivery' : 'paid'} ${rs(order.totalPaise)}\n${order.items.map((i) => `${i.productName} ${[i.color, i.size].filter(Boolean).join('/')} x${i.quantity}`).join('\n')}\nDelivering to: ${formatAddress(order.shippingAddressSnapshot)}\nView: ${link}`;

  const jobs: Promise<unknown>[] = [
    sendMail(order.customerEmail, `${cod ? 'Order placed' : 'Order confirmed'} — ${order.orderNumber} | LEVIX`, customerHtml, text)
  ];
  const owner = settings.supportEmail || env.ADMIN_EMAILS[0];
  if (owner) {
    const adminHtml = wrap(
      `New order — ${rs(order.totalPaise)}`,
      `${esc(order.customerName)} · ${esc(order.customerEmail)} · ${esc(order.customerPhone || '')}<br>${cod ? '<b>Cash on Delivery</b>' : '<b>Paid online</b>'}`,
      'admin'
    );
    jobs.push(sendMail(owner, `🛍 New order ${order.orderNumber} — ${rs(order.totalPaise)}${cod ? ' (COD)' : ''}`, adminHtml, text));
  }
  const results = await Promise.allSettled(jobs);
  results.forEach((r) => r.status === 'rejected' && console.error('Order email failed:', (r as PromiseRejectedResult).reason?.message));
}
