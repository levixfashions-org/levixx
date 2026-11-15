import React, { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/api';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { InstagramGlyph } from '../InstagramGlyph';

interface Row {
  instagram: string;
  orders: number;
  spentPaise: number;
  lastOrderAt: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
}

const rupees = (p: number) => `₹${Math.round(p / 100).toLocaleString('en-IN')}`;

/** Customers who shared their Instagram ID at checkout, ranked by number of orders. */
export const InstagramCustomers: React.FC = () => {
  const live = useLiveRefresh();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [summary, setSummary] = useState<{ handles: number; ordersWithInstagram: number; allOrders: number } | null>(null);
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    apiClient
      .get('/admin/instagram-customers')
      .then((r) => {
        setRows(r.data.customers || []);
        setSummary(r.data.summary || null);
      })
      .catch(() => setRows((v) => v || []));
  }, [live]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/^@/, '');
    const f = (rows || []).filter((r) => !t || r.instagram.includes(t) || (r.name || '').toLowerCase().includes(t));
    return showAll ? f : f.slice(0, 10);
  }, [rows, q, showAll]);

  const share = summary && summary.allOrders ? Math.round((summary.ordersWithInstagram / summary.allOrders) * 100) : 0;

  const exportCsv = () => {
    const head = 'instagram,orders,spent_rupees,last_order,name,email,phone';
    const body = (rows || []).map((r) =>
      [`@${r.instagram}`, r.orders, Math.round(r.spentPaise / 100), r.lastOrderAt ? new Date(r.lastOrderAt).toISOString().slice(0, 10) : '', r.name || '', r.email || '', r.phone || '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[head, ...body].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'levix-instagram-customers.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="bg-white p-6 border border-black/10 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-lg uppercase tracking-tight text-black flex items-center gap-2">
            <InstagramGlyph className="w-4 h-4 text-[#d62976]" /> Instagram customers
          </h3>
          <p className="text-[12px] text-neutral-500">
            {summary
              ? `${summary.handles} customers shared their Instagram · ${summary.ordersWithInstagram} of ${summary.allOrders} orders (${share}%)`
              : 'Customers who add their Instagram ID at checkout, ranked by orders.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search @id or name" className="h-9 px-3 text-[12.5px] border border-black/15 rounded-[10px] w-44 focus:outline-none focus:border-black/40" />
          {!!rows?.length && (
            <button type="button" onClick={exportCsv} className="h-9 px-3 text-[12px] font-semibold border border-black/15 rounded-[10px] hover:bg-neutral-50">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {rows === null ? (
        <div className="space-y-2 animate-pulse">{[0, 1, 2].map((i) => <div key={i} className="h-10 bg-neutral-100 rounded" />)}</div>
      ) : !rows.length ? (
        <p className="text-xs text-neutral-500 py-6 text-center">No Instagram IDs yet — they'll appear here as customers add them at checkout.</p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wider text-neutral-500">
                  <th className="py-2 px-2 w-8">#</th>
                  <th className="py-2 px-2">Instagram</th>
                  <th className="py-2 px-2">Customer</th>
                  <th className="py-2 px-2 text-right">Orders</th>
                  <th className="py-2 px-2 text-right">Spent</th>
                  <th className="py-2 px-2 text-right">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {list.map((r, i) => (
                  <tr key={r.instagram}>
                    <td className="py-2.5 px-2 text-neutral-400 font-mono">{i + 1}</td>
                    <td className="py-2.5 px-2">
                      <a href={`https://instagram.com/${encodeURIComponent(r.instagram)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#9b1d5b] hover:underline">
                        @{r.instagram}
                      </a>
                    </td>
                    <td className="py-2.5 px-2">
                      <p className="text-black truncate max-w-[180px]">{r.name || '—'}</p>
                      <p className="text-[11px] text-neutral-500 truncate max-w-[180px]">{r.email || ''}</p>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className={`inline-block min-w-[28px] px-2 py-0.5 rounded-full font-bold ${r.orders > 1 ? 'bg-[#9b1d5b] text-white' : 'bg-neutral-100 text-neutral-700'}`}>{r.orders}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">{rupees(r.spentPaise)}</td>
                    <td className="py-2.5 px-2 text-right text-neutral-500">{r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && !q && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[12px] font-semibold text-[#ff5400]">
              {showAll ? 'Show top 10' : `Show all ${rows.length}`}
            </button>
          )}
        </>
      )}
    </div>
  );
};
