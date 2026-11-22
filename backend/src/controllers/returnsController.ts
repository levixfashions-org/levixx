import { Request, Response } from 'express';
import { OrderStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { safeEqual } from '../services/orders.js';
import { brandedEmail, isMailConfigured, sendMail } from '../services/mailer.js';
import { getSettings } from '../services/store.js';
import { pushToUser } from '../services/push.js';
import { uploadVideoChunk } from './mediaController.js';

/** How long after delivery a customer can report a damaged / defective / wrong item. */
export const RETURN_WINDOW_HOURS = 48;
const OPEN = ['REQUESTED', 'APPROVED', 'PICKED_UP'];
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export const REASONS = {
  DAMAGED: 'Arrived damaged (torn, hole, stain, damaged print)',
  DEFECTIVE: 'Manufacturing defect (stitching, peeling print, seam)',
  WRONG_ITEM: 'Wrong product, colour or size received',
  MISSING: 'Item missing from the parcel'
} as const;

const STATUS_TEXT: Record<string, string> = {
  REQUESTED: 'Request received',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  PICKED_UP: 'Item picked up',
  COMPLETED: 'Completed'
};

/** The time the return window opened (delivery time; older orders fall back to their last update). */
export function deliveredTime(o: { deliveredAt: Date | null; updatedAt: Date }) {
  return o.deliveredAt || o.updatedAt;
}
export function returnDeadline(o: { deliveredAt: Date | null; updatedAt: Date }) {
  return new Date(deliveredTime(o).getTime() + RETURN_WINDOW_HOURS * 3600 * 1000);
}

/** Loads an order the visitor is allowed to see: their own (signed in), or a guest with the order's secret key. */
async function orderForCustomer(req: Request) {
  const orderNumber = String(req.params.orderNumber || '');
  const key = typeof req.query.key === 'string' ? req.query.key : undefined;
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true, returns: { orderBy: { createdAt: 'desc' } } } });
  if (!order) throw new AppError('Order not found', 404);
  const isOwner = req.user && (order.userId === req.user.id || order.customerEmail === req.user.email || req.user.role === Role.ADMIN);
  if (!isOwner && !safeEqual(key, order.accessKey)) throw new AppError('Order not found', 404);
  return order;
}

function assertCanReturn(order: Awaited<ReturnType<typeof orderForCustomer>>) {
  if (order.status !== OrderStatus.DELIVERED) throw new AppError('You can report a problem once your order has been delivered.', 400);
  if (Date.now() > returnDeadline(order).getTime()) {
    throw new AppError(`The ${RETURN_WINDOW_HOURS}-hour window to report a problem with this order has closed. Please contact us if you need help.`, 400);
  }
  if (order.returns.some((r) => OPEN.includes(r.status))) throw new AppError('You already have an open request for this order — we will update you soon.', 409);
}

function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

/** POST /api/returns/:orderNumber/photo — raw image body (the browser shrinks it first). */
export async function uploadReturnPhoto(req: Request, res: Response) {
  const order = await orderForCustomer(req);
  assertCanReturn(order);
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) throw new AppError('No photo received', 400);
  if (body.length > MAX_PHOTO_BYTES) throw new AppError('Photo is too large (max 12 MB)', 413);
  const ext = sniffImage(body);
  if (!ext) throw new AppError('Please upload a JPG, PNG or WEBP photo', 415);
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const file = await prisma.mediaFile.create({
    data: { mime, size: body.length, fileName: `return-${order.orderNumber}`, data: body },
    select: { id: true }
  });
  res.status(201).json({ url: `/media/${file.id}.${ext}` });
}

/** POST /api/returns/:orderNumber/video — the unboxing video, in 4 MB pieces (same format as the admin video upload). */
export async function uploadReturnVideo(req: Request, res: Response) {
  const order = await orderForCustomer(req);
  assertCanReturn(order);
  await uploadVideoChunk(req, res);
}

const mediaUrl = z.string().regex(/^\/media\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|mov|webm)$/i, 'Invalid file');

const createSchema = z.object({
  reason: z.enum(['DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'MISSING']),
  resolution: z.enum(['REPLACEMENT', 'REFUND']),
  details: z.string().trim().min(10, 'Please describe the problem in a few words (at least 10 characters)').max(2000),
  items: z.array(z.object({ orderItemId: z.string().min(1), quantity: z.number().int().min(1).max(50) })).min(1, 'Choose the item(s) with the problem').max(50),
  photos: z.array(mediaUrl).max(6).default([]),
  videoUrl: mediaUrl.optional().nullable(),
  refundUpi: z.string().trim().max(80).optional().nullable()
});

/** POST /api/returns/:orderNumber — create the request. */
export async function createReturn(req: Request, res: Response) {
  const order = await orderForCustomer(req);
  assertCanReturn(order);
  const data = createSchema.parse(req.body);

  if (data.reason !== 'MISSING' && data.photos.length === 0) throw new AppError('Please add at least one clear photo of the problem.', 400);
  const items = data.items.map((it) => {
    const oi = order.items.find((x) => x.id === it.orderItemId);
    if (!oi) throw new AppError('One of the chosen items is not part of this order', 400);
    if (it.quantity > oi.quantity) throw new AppError(`You ordered only ${oi.quantity} of ${oi.productName}`, 400);
    return { orderItemId: oi.id, productName: oi.productName, size: oi.size, color: oi.color, quantity: it.quantity, imageUrl: oi.imageUrl };
  });
  const cod = order.paymentMethod === 'COD';
  if (data.resolution === 'REFUND' && cod && !data.refundUpi) throw new AppError('Please share a UPI ID for the refund (Cash on Delivery orders are refunded by UPI).', 400);

  const created = await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      reason: data.reason,
      resolution: data.resolution,
      details: data.details,
      items,
      photos: data.photos,
      videoUrl: data.videoUrl || null,
      refundUpi: data.resolution === 'REFUND' && cod ? data.refundUpi || null : null
    }
  });

  notifyNewReturn(order.id, created.id).catch((e) => console.error('Return email failed:', e?.message || e));
  res.status(201).json({ request: publicReturn(created) });
}

export function publicReturn(r: { id: string; reason: string; resolution: string; details: string; items: unknown; photos: unknown; videoUrl: string | null; status: string; adminNote: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: r.id,
    reason: r.reason,
    resolution: r.resolution,
    details: r.details,
    items: r.items,
    photos: r.photos,
    videoUrl: r.videoUrl,
    status: r.status,
    adminNote: r.adminNote,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

/** Return info attached to an order for the customer pages. */
export function returnInfo(order: { status: string; deliveredAt: Date | null; updatedAt: Date; returns?: Parameters<typeof publicReturn>[0][] }) {
  const delivered = order.status === OrderStatus.DELIVERED;
  const deadline = delivered ? returnDeadline(order) : null;
  const returns = (order.returns || []).map(publicReturn);
  const open = returns.some((r) => OPEN.includes(r.status));
  return {
    returns,
    returnWindowHours: RETURN_WINDOW_HOURS,
    returnDeadline: deadline,
    canReturn: Boolean(delivered && deadline && Date.now() <= deadline.getTime() && !open)
  };
}

/* ------------------------------------------------------------------ emails */

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function notifyNewReturn(orderId: string, returnId: string) {
  if (!isMailConfigured()) return;
  const [order, r, settings] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.returnRequest.findUnique({ where: { id: returnId } }),
    getSettings()
  ]);
  if (!order || !r) return;
  const SITE = env.FRONTEND_URL || 'https://thelevix.shop';
  const items = (r.items as any[]).map((i) => `${i.productName} (${[i.color, i.size].filter(Boolean).join(' / ')}) × ${i.quantity}`).join(', ');
  const reason = REASONS[r.reason as keyof typeof REASONS] || r.reason;
  const name = (order.customerName || '').trim().split(' ')[0] || 'there';

  const jobs: Promise<unknown>[] = [];
  const cust = brandedEmail({
    preheader: `We received your request for order ${order.orderNumber}.`,
    title: 'Request received',
    greeting: `Hi ${name},`,
    body: `We have received your ${r.resolution === 'REFUND' ? 'refund' : 'replacement'} request for order ${order.orderNumber} (${reason}). Our team will review it within 2 business days and update you by email. Please keep the product unused with its tags and packaging until then.`,
    button: 'View request',
    link: `${SITE}/order-success/${encodeURIComponent(order.orderNumber)}${order.accessKey ? `?key=${encodeURIComponent(order.accessKey)}` : ''}`,
    footnote: 'You can follow the status of your request on your order page at any time.'
  });
  jobs.push(sendMail(order.customerEmail, `Return request received — ${order.orderNumber} | LEVIX`, cust.html, cust.text));

  const owner = settings.supportEmail || env.ADMIN_EMAILS[0];
  if (owner) {
    const photos = (r.photos as string[]).map((p) => `<a href="${SITE}${esc(p)}">${SITE}${esc(p)}</a>`).join('<br>');
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111">
<h2 style="margin:0 0 8px">New return request — ${esc(order.orderNumber)}</h2>
<p><b>${esc(order.customerName)}</b> · ${esc(order.customerEmail)} · ${esc(order.customerPhone || '')}</p>
<p><b>Reason:</b> ${esc(reason)}<br><b>Wants:</b> ${r.resolution === 'REFUND' ? 'Refund' : 'Replacement'}${r.refundUpi ? ` (UPI ${esc(r.refundUpi)})` : ''}<br><b>Items:</b> ${esc(items)}</p>
<p><b>Details:</b><br>${esc(r.details).replace(/\n/g, '<br>')}</p>
${photos ? `<p><b>Photos:</b><br>${photos}</p>` : ''}
${r.videoUrl ? `<p><b>Unboxing video:</b> <a href="${SITE}${esc(r.videoUrl)}">${SITE}${esc(r.videoUrl)}</a></p>` : '<p><b>Unboxing video:</b> not uploaded</p>'}
<p><a href="${SITE}/admin/returns" style="display:inline-block;background:#000;color:#fff;padding:12px 22px;text-decoration:none;font-weight:bold">Review in admin</a></p></div>`;
    const text = `New return request ${order.orderNumber}\n${order.customerName} ${order.customerEmail} ${order.customerPhone}\nReason: ${reason}\nWants: ${r.resolution}\nItems: ${items}\nDetails: ${r.details}\nReview: ${SITE}/admin/returns`;
    jobs.push(sendMail(owner, `↩️ Return request ${order.orderNumber} — ${reason}`, html, text));
  }
  await Promise.allSettled(jobs);
}

async function notifyReturnUpdate(returnId: string) {
  const r = await prisma.returnRequest.findUnique({ where: { id: returnId }, include: { order: true } });
  if (!r) return;
  const order = r.order;
  const SITE = env.FRONTEND_URL || 'https://thelevix.shop';
  const link = `${SITE}/order-success/${encodeURIComponent(order.orderNumber)}${order.accessKey ? `?key=${encodeURIComponent(order.accessKey)}` : ''}`;
  const name = (order.customerName || '').trim().split(' ')[0] || 'there';
  const replace = r.resolution === 'REPLACEMENT';
  const bodies: Record<string, string> = {
    APPROVED: `Good news — your ${replace ? 'replacement' : 'refund'} request for order ${order.orderNumber} has been approved. We will arrange a pickup of the item (or contact you with the next step) shortly.`,
    REJECTED: `We have reviewed your request for order ${order.orderNumber} and unfortunately could not approve it.`,
    PICKED_UP: `We have collected the item from order ${order.orderNumber}. Once it reaches us and is checked, we will ${replace ? 'ship your replacement' : 'start your refund'}.`,
    COMPLETED: replace
      ? `Your replacement for order ${order.orderNumber} has been sent. Thank you for your patience!`
      : `Your refund for order ${order.orderNumber} has been processed. It usually shows in your account within 5–7 business days.`
  };
  const body = bodies[r.status];
  if (!body) return;
  const note = r.adminNote ? ` Note from LEVIX: ${r.adminNote}` : '';
  if (order.userId) {
    pushToUser(order.userId, { title: `Return update: ${STATUS_TEXT[r.status]}`, body: body + note, url: '/account/orders', tag: `return-${order.orderNumber}` }).catch(() => undefined);
  }
  if (!isMailConfigured()) return;
  const mail = brandedEmail({
    preheader: `Update on your request for order ${order.orderNumber}`,
    title: `Return ${STATUS_TEXT[r.status].toLowerCase()}`,
    greeting: `Hi ${name},`,
    body: body + note,
    button: 'View request',
    link,
    footnote: 'Questions? Just reply to this email.'
  });
  await sendMail(order.customerEmail, `Return update — ${STATUS_TEXT[r.status]} — ${order.orderNumber} | LEVIX`, mail.html, mail.text);
}

/* ------------------------------------------------------------------ admin */

/** GET /api/admin/returns?status=OPEN|ALL|REQUESTED|… */
export async function listReturns(req: Request, res: Response) {
  const status = String(req.query.status || 'OPEN').toUpperCase();
  const where = status === 'ALL' ? {} : status === 'OPEN' ? { status: { in: OPEN } } : { status };
  const [rows, counts] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            paymentMethod: true,
            paymentStatus: true,
            totalPaise: true,
            status: true,
            deliveredAt: true,
            updatedAt: true,
            refundStatus: true
          }
        }
      }
    }),
    prisma.returnRequest.groupBy({ by: ['status'], _count: { _all: true } })
  ]);
  res.set('Cache-Control', 'no-store');
  res.json({
    returns: rows.map((r) => ({ ...r, order: { ...r.order, deliveredAt: deliveredTime(r.order) } })),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all]))
  });
}

const updateSchema = z.object({
  status: z.enum(['REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'COMPLETED']).optional(),
  adminNote: z.string().max(2000).optional()
});

/** PATCH /api/admin/returns/:id */
export async function updateReturn(req: Request, res: Response) {
  const data = updateSchema.parse(req.body);
  const before = await prisma.returnRequest.findUnique({ where: { id: req.params.id } });
  if (!before) throw new AppError('Request not found', 404);
  const updated = await prisma.returnRequest.update({
    where: { id: before.id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.adminNote !== undefined ? { adminNote: data.adminNote.trim() || null } : {})
    }
  });
  if (data.status && data.status !== before.status) notifyReturnUpdate(updated.id).catch((e) => console.error('Return update email failed:', e?.message || e));
  res.json({ request: updated });
}
