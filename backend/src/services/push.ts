import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { generateVapidKeys, sendPush, type VapidKeys } from './webpushCore.js';

/** Notification payload read by the service worker (frontend/public/sw.js). */
export interface PushMessage {
  title: string;
  body: string;
  url?: string;
  image?: string | null;
  tag?: string;
}

let keysCache: VapidKeys | null = null;

/** Signing keys: created once on first use and kept in the database (never sent to browsers except the public half). */
export async function getVapidKeys(): Promise<VapidKeys> {
  if (keysCache) return keysCache;
  const row = await prisma.storeSetting.findUnique({ where: { id: 'default' }, select: { vapidKeys: true } });
  if (row?.vapidKeys) {
    try {
      const k = JSON.parse(row.vapidKeys);
      if (k?.publicKey && k?.privateKey) return (keysCache = k);
    } catch {
      /* regenerate below */
    }
  }
  const fresh = generateVapidKeys();
  // Only write if still empty, so two servers starting together agree on one key pair.
  await prisma.storeSetting.updateMany({ where: { id: 'default', vapidKeys: null }, data: { vapidKeys: JSON.stringify(fresh) } });
  const again = await prisma.storeSetting.findUnique({ where: { id: 'default' }, select: { vapidKeys: true } });
  keysCache = again?.vapidKeys ? JSON.parse(again.vapidKeys) : fresh;
  return keysCache!;
}

function subject(): string {
  const list: string[] = Array.isArray(env.ADMIN_EMAILS) ? env.ADMIN_EMAILS : String(env.ADMIN_EMAILS || '').split(',');
  const email = list[0]?.trim() || 'levixfashions@gmail.com';
  return `mailto:${email}`;
}

function siteUrl(path?: string): string {
  const base = (env.FRONTEND_URL || 'https://thelevix.shop').replace(/\/+$/, '');
  if (!path) return base + '/';
  if (/^https?:\/\//i.test(path)) return path;
  return base + (path.startsWith('/') ? path : `/${path}`);
}

function absImage(u?: string | null): string | undefined {
  if (!u) return undefined;
  const clean = u.split('#')[0];
  return /^https?:\/\//i.test(clean) ? clean : siteUrl(clean);
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

async function deliver(subs: Sub[], msg: PushMessage, urgency: 'normal' | 'high' = 'normal') {
  const keys = await getVapidKeys();
  const payload = {
    title: msg.title.slice(0, 80),
    body: msg.body.slice(0, 240),
    url: siteUrl(msg.url),
    image: absImage(msg.image),
    tag: msg.tag
  };
  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  const okIds: string[] = [];
  const failIds: string[] = [];
  // Small parallel batches: fast for a few thousand subscribers, gentle on the server.
  for (let i = 0; i < subs.length; i += 25) {
    const batch = subs.slice(i, i + 25);
    const results = await Promise.all(batch.map((s) => sendPush(s, payload, keys, subject(), { urgency, topic: msg.tag })));
    results.forEach((r, j) => {
      if (r.ok) {
        sent++;
        okIds.push(batch[j].id);
      } else {
        failed++;
        if (r.gone) gone.push(batch[j].id);
        else failIds.push(batch[j].id);
      }
    });
  }
  if (gone.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
  if (okIds.length) await prisma.pushSubscription.updateMany({ where: { id: { in: okIds } }, data: { failCount: 0, lastSentAt: new Date() } });
  if (failIds.length) {
    await prisma.pushSubscription.updateMany({ where: { id: { in: failIds } }, data: { failCount: { increment: 1 } } });
    // Give up on subscriptions that keep failing.
    await prisma.pushSubscription.deleteMany({ where: { failCount: { gte: 5 } } });
  }
  return { sent, failed, removed: gone.length };
}

const SUB_SELECT = { id: true, endpoint: true, p256dh: true, auth: true } as const;

export async function pushToAll(msg: PushMessage) {
  const subs = await prisma.pushSubscription.findMany({ select: SUB_SELECT, take: 50000 });
  return { target: subs.length, ...(await deliver(subs, msg)) };
}

export async function pushToUser(userId: string, msg: PushMessage) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId }, select: SUB_SELECT, take: 20 });
  if (!subs.length) return { target: 0, sent: 0, failed: 0, removed: 0 };
  return { target: subs.length, ...(await deliver(subs, msg, 'high')) };
}

/** Fire-and-forget order updates; never throws into the order flow. */
export function notifyOrderPush(orderId: string, kind: 'confirmed' | 'shipped' | 'delivered') {
  (async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, orderNumber: true, courier: true, trackingNumber: true }
    });
    if (!order?.userId) return;
    const msgs: Record<typeof kind, PushMessage> = {
      confirmed: { title: 'Order confirmed ✅', body: `Thanks for shopping with LEVIX! Order ${order.orderNumber} is confirmed and will be packed soon.`, url: '/account/orders', tag: `order-${order.orderNumber}` },
      shipped: {
        title: 'Your LEVIX order is on the way 🚚',
        body: `Order ${order.orderNumber} has shipped${order.courier ? ` with ${order.courier}` : ''}${order.trackingNumber ? ` · Tracking ${order.trackingNumber}` : ''}.`,
        url: '/account/orders',
        tag: `order-${order.orderNumber}`
      },
      delivered: { title: 'Delivered 📦', body: `Order ${order.orderNumber} has been delivered. Enjoy your LEVIX fit!`, url: '/account/orders', tag: `order-${order.orderNumber}` }
    };
    await pushToUser(order.userId, msgs[kind]);
  })().catch((err) => console.error('Order push failed:', err?.message || err));
}
