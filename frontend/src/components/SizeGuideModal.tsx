import React from 'react';
import { X } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export const SizeGuideModal: React.FC = () => {
  const { isSizeGuideOpen, closeSizeGuide } = useCartStore();

  if (!isSizeGuideOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[6px] transition-opacity"
        onClick={closeSizeGuide}
      />

      <div className="lx-sheet relative w-full max-w-lg rounded-[28px] p-6 z-10 space-y-5">
        <div className="flex items-center justify-between border-b border-black/[0.07] pb-4">
          <div>
            <h3 className="text-[21px] font-semibold tracking-[-0.025em] text-[#0b0b0f]">
              Oversized Fit Guide
            </h3>
            <p className="text-xs text-neutral-600">All garment measurements are recorded in inches.</p>
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
                <th className="py-2.5 px-3">Chest</th>
                <th className="py-2.5 px-3">Length</th>
                <th className="py-2.5 px-3">Shoulder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] text-[13px]">
              <tr>
                <td className="py-2.5 px-3 font-bold">S</td>
                <td className="py-2.5 px-3">44"</td>
                <td className="py-2.5 px-3">28.5"</td>
                <td className="py-2.5 px-3">20.5"</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">M</td>
                <td className="py-2.5 px-3">46"</td>
                <td className="py-2.5 px-3">29.5"</td>
                <td className="py-2.5 px-3">21.5"</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">L</td>
                <td className="py-2.5 px-3">48"</td>
                <td className="py-2.5 px-3">30.5"</td>
                <td className="py-2.5 px-3">22.5"</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">XL</td>
                <td className="py-2.5 px-3">50"</td>
                <td className="py-2.5 px-3">31.5"</td>
                <td className="py-2.5 px-3">23.5"</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">XXL</td>
                <td className="py-2.5 px-3">52"</td>
                <td className="py-2.5 px-3">32.5"</td>
                <td className="py-2.5 px-3">24.5"</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-white/70 p-4 rounded-[16px] border border-black/[0.07] text-[13px] text-[#3a3a3f] space-y-1">
          <p className="font-semibold text-[#0b0b0f]">Fit note</p>
          <p>
            Levix garments feature a signature dropped shoulder and relaxed oversized silhouette. If you prefer a regular tailored fit, we recommend selecting one size smaller than your usual size.
          </p>
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
