import React from 'react';
import { Mail, Globe, Shield, Clock } from 'lucide-react';

export const StoreLocatorPage: React.FC = () => {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-12 sm:py-16 space-y-12">
      <div className="border-b border-black/10 pb-6 max-w-2xl">
        <span className="text-[10px] font-mono text-[#FF5400] font-bold uppercase tracking-widest">
          ONLINE EXCLUSIVE DIRECTORY
        </span>
        <h1 className="font-display font-black text-3xl sm:text-5xl uppercase tracking-tight text-black mt-1">
          Digital Atelier & Concierge
        </h1>
        <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
          LEVIX operates exclusively through our online flagship drops at thelevix.shop, shipping streetwear directly to customers across India.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 border border-black/10 shadow-sm space-y-4">
          <Globe className="w-6 h-6 text-[#FF5400]" />
          <h3 className="font-display font-bold text-xl uppercase tracking-tight text-black">
            Pan-India Delivery
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Every order is packed and dispatched within 1–3 business days and usually delivered within 3–7 business days across India.
          </p>
        </div>

        <div className="bg-white p-8 border border-black/10 shadow-sm space-y-4">
          <Mail className="w-6 h-6 text-[#FF5400]" />
          <h3 className="font-display font-bold text-xl uppercase tracking-tight text-black">
            Client Concierge
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Direct email assistance for orders, sizing recommendations, and delivery tracking:
          </p>
          <a
            href="mailto:levixfashions@gmail.com"
            className="inline-block font-mono text-xs font-bold text-black border-b border-black hover:text-[#FF5400] hover:border-[#FF5400] transition-colors"
          >
            levixfashions@gmail.com
          </a>
        </div>

        <div className="bg-white p-8 border border-black/10 shadow-sm space-y-4">
          <Shield className="w-6 h-6 text-[#FF5400]" />
          <h3 className="font-display font-bold text-xl uppercase tracking-tight text-black">
            Damage Protection
          </h3>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Received a damaged, defective or wrong item? Report it within 48 hours of delivery with an unboxing video and we'll send a free replacement or a full refund.
          </p>
        </div>
      </div>
    </div>
  );
};
