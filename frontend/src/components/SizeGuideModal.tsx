import React from 'react';
import { X } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

type Chart = { title: string; note: string; cols: string[]; rows: Array<{ size: string; values: string[] }>; fit: string };

const WAFFLE: Chart = {
  title: 'Waffle Boxy Fit Guide',
  note: 'All measurements are in inches. Measurements may vary by 5\u201310%.',
  cols: ['Chest', 'Length'],
  rows: [
    { size: 'S', values: ['21', '23'] },
    { size: 'M', values: ['22', '24'] },
    { size: 'L', values: ['23', '25'] },
    { size: 'XL', values: ['24', '26'] }
  ],
  fit: 'Our waffle tees have a boxy, relaxed cut. If you prefer a closer fit, we recommend selecting one size smaller than your usual size.'
};

const STANDARD: Chart = {
  title: 'Oversized Fit Guide',
  note: 'All measurements are in inches. Expect a tolerance of \u00b1 1 inch.',
  cols: ['Chest', 'Length', 'Shoulder', 'Sleeve'],
  rows: [
    { size: 'S', values: ['42', '27.5', '20', '8.5'] },
    { size: 'M', values: ['44', '28', '21', '9'] },
    { size: 'L', values: ['46', '28.5', '22', '9.5'] },
    { size: 'XL', values: ['48', '29', '23', '10'] },
    { size: 'XXL', values: ['50', '29.5', '24', '10.5'] }
  ],
  fit: 'Levix garments feature a signature dropped shoulder and relaxed oversized silhouette. If you prefer a regular tailored fit, we recommend selecting one size smaller than your usual size.'
};

export const SizeGuideModal: React.FC = () => {
  const { isSizeGuideOpen, closeSizeGuide, sizeGuideKind } = useCartStore();

  if (!isSizeGuideOpen) return null;
  const chart = sizeGuideKind === 'waffle' ? WAFFLE : STANDARD;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[6px] transition-opacity"
        onClick={closeSizeGuide}
      />

      <div className="lx-sheet relative w-full max-w-lg rounded-[28px] p-6 z-10 space-y-5">
        <div className="flex items-center justify-between border-b border-black/[0.07] pb-4">
          <div>
            <h3 className="text-[21px] font-semibold tracking-[-0.025em] text-[#0b0b0f]">{chart.title}</h3>
            <p className="text-xs text-neutral-600">{chart.note}</p>
          </div>
          <button
            onClick={closeSizeGuide}
            className="lx-btn-soft w-9 h-9 flex items-center justify-center"
            aria-label="Close size guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Measurement Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-black border-collapse">
            <thead>
              <tr className="border-b border-black/15 text-[12px] font-semibold text-[#6e6e73]">
                <th className="py-2.5 px-3">Size</th>
                {chart.cols.map((c) => (
                  <th key={c} className="py-2.5 px-3">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] text-[13px]">
              {chart.rows.map((r) => (
                <tr key={r.size}>
                  <td className="py-2.5 px-3 font-bold">{r.size}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="py-2.5 px-3">{v}"</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white/70 p-4 rounded-[16px] border border-black/[0.07] text-[13px] text-[#3a3a3f] space-y-1">
          <p className="font-semibold text-[#0b0b0f]">Fit note</p>
          <p>{chart.fit}</p>
        </div>

        <button
          onClick={closeSizeGuide}
          className="lx-btn-primary w-full h-12 text-[15px] font-semibold"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
