import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/db.js';

/**
 * Best sellers: every product gets a `salesScore` = units sold in the last 30 days.
 * Counted orders: paid online orders and COD orders that are not cancelled or refunded.
 * Categories with "Auto-sort by best sellers" on show pinned products first, then the highest scores.
 */
const WINDOW_DAYS = 30;
const COUNTED: OrderStatus[] = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

let timer: NodeJS.Timeout | null = null;
let running = false;
let again = false;
const listeners: Array<() => void> = [];

/** Called after a change (e.g. caches to clear) once the new scores are saved. */
export function onSalesScoresUpdated(fn: () => void) {
  listeners.push(fn);
}

export async function recomputeSalesScores(): Promise<number> {
  if (running) {
    again = true;
    return 0;
  }
  running = true;
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { createdAt: { gte: since }, status: { in: COUNTED }, paymentStatus: { not: PaymentStatus.REFUNDED } }
      },
      _sum: { quantity: true }
    });
    const want = new Map<string, number>();
    for (const r of rows) want.set(r.productId, Number(r._sum.quantity || 0));

    const current = await prisma.product.findMany({ select: { id: true, salesScore: true } });
    const changes = current.filter((p) => (want.get(p.id) || 0) !== p.salesScore);
    for (let i = 0; i < changes.length; i += 50) {
      const chunk = changes.slice(i, i + 50);
      await prisma.$transaction(chunk.map((p) => prisma.product.update({ where: { id: p.id }, data: { salesScore: want.get(p.id) || 0 } })));
    }
    if (changes.length) listeners.forEach((fn) => { try { fn(); } catch { /* ignore */ } });
    return changes.length;
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSalesRecompute();
    }
  }
}

/** Debounced: many orders/admin edits in a burst cause one recount a few seconds later. */
export function scheduleSalesRecompute(delayMs = 4000) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    recomputeSalesScores().catch((err) => console.error('Best-seller recount failed:', err?.message || err));
  }, delayMs);
  timer.unref?.();
}

/** Recount at start-up and every hour (so old orders drop out of the 30-day window). */
export function startSalesScoreJob() {
  scheduleSalesRecompute(15000);
  const t = setInterval(() => scheduleSalesRecompute(0), 60 * 60 * 1000);
  t.unref?.();
}

type Sortable = { pinned?: boolean | null; salesScore?: number | null; position?: number | null; createdAt?: Date | string | null };

/** Pinned first (in your manual order), then most sold, then your manual order, then newest. */
export function bestSellerCompare(a: Sortable, b: Sortable): number {
  const pa = a.pinned ? 1 : 0;
  const pb = b.pinned ? 1 : 0;
  if (pa !== pb) return pb - pa;
  if (!pa) {
    const s = (b.salesScore || 0) - (a.salesScore || 0);
    if (s) return s;
  }
  const pos = (a.position ?? 0) - (b.position ?? 0);
  if (pos) return pos;
  return +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0);
}

export function sortBestSellers<T extends Sortable>(list: T[]): T[] {
  return [...list].sort(bestSellerCompare);
}
