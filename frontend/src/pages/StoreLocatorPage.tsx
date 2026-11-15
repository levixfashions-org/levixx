import React from 'react';
import { Mail, Globe, Shield, Clock } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

export const StoreLocatorPage: React.FC = () => {
  const settings = useSettingsStore((st) => st.settings);
  const freeAll = !(settings.freeShippingThreshold > 0 && settings.shippingFee > 0);
  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-12 space-y-6 sm:space-y-8">
      <div className="max-w-2xl px-1">
        <span className="lx-eyebrow">Online exclusive</span>
        <h1 className="lx-h1 mt-1">
          Digital Atelier & Concierge
        </h1>
        <p className="lx-sub mt-1.5">
          LEVIX operates exclusively through our online flagship drops at thelevix.shop, shipping streetwear directly to customers across India.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="lx-acct-card p-6 space-y-3">
          <Globe className="w-10 h-10 p-2.5 rounded-[12px] bg-orange-100 text-[#FF5400]" />
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">
            Pan-India delivery
          </h3>
          <p className="text-[13.5px] text-[#6e6e73] leading-relaxed">
            {freeAll ? 'Free delivery on every order. ' : `Free delivery on orders above ₹${settings.freeShippingThreshold.toLocaleString('en-IN')}. `}Each order is packed and dispatched within 2–5 business days and usually delivered within 3–7 business days across India.
          </p>
        </div>

        <div className="lx-acct-card p-6 space-y-3">
          <Mail className="w-10 h-10 p-2.5 rounded-[12px] bg-orange-100 text-[#FF5400]" />
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">
            Customer care
          </h3>
          <p className="text-[13.5px] text-[#6e6e73] leading-relaxed">
            Direct email assistance for orders, sizing recommendations, and delivery tracking:
          </p>
          <a
            href="mailto:levixfashions@gmail.com"
            className="inline-block text-[14px] font-semibold text-[#ff5400] hover:text-[#d94800]"
          >
            levixfashions@gmail.com
          </a>
        </div>

        <div className="lx-acct-card p-6 space-y-3">
          <Shield className="w-10 h-10 p-2.5 rounded-[12px] bg-orange-100 text-[#FF5400]" />
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">
            Damage protection
          </h3>
          <p className="text-[13.5px] text-[#6e6e73] leading-relaxed">
            Received a damaged, defective or wrong item? Report it within 48 hours of delivery with an unboxing video and we'll send a free replacement or a full refund.
          </p>
        </div>
      </div>
    </div>
  );
};
