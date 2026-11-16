import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-12 space-y-6 sm:space-y-10">
      
      <div className="max-w-3xl space-y-3 px-1">
        <span className="lx-eyebrow">The LEVIX manifesto</span>
        <h1 className="text-[32px] sm:text-[52px] leading-[1.05] font-semibold tracking-[-0.04em] text-[#0b0b0f]">
          Architectural Tailoring & Raw Subcultural Expression
        </h1>
        <p className="text-[15px] text-[#6e6e73] leading-relaxed">
          Founded with an uncompromising global perspective, Levix bridges contemporary luxury couture craftsmanship with unfiltered underground streetwear culture.
        </p>
      </div>

      <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-900 lx-keep rounded-[28px] shadow-[0_30px_70px_-34px_rgba(0,0,0,0.6)] ring-1 ring-black/5">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
          alt="Levix Design Studio"
          className="w-full h-full object-cover object-center opacity-90"
          loading="lazy"
          onError={(e) => ((e.currentTarget.parentElement as HTMLElement).style.display = 'none')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="lx-acct-card p-6 space-y-2.5">
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">
            <span className="text-[#ff5400]">01</span> Textile innovation
          </h3>
          <p className="text-[13.5px] text-[#6e6e73] leading-relaxed">
            Every millimeter of fabric is custom-milled in certified partner ateliers. We utilize 260 to 450 GSM ultra-heavy combed cottons, loopback French terry, and tear-resistant tactical ripstop fabrics designed to age gracefully over decades.
          </p>
        </div>

        <div className="lx-acct-card p-6 space-y-2.5">
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">
            <span className="text-[#ff5400]">02</span> Boxy drape geometry
          </h3>
          <p className="text-[13.5px] text-[#6e6e73] leading-relaxed">
            Our dropped shoulders, reinforced ribbed collars, and structured silhouettes are meticulously patterned to preserve architectural volume without clinging, creating the unmistakable signature Levix fit.
          </p>
        </div>

        <div className="lx-acct-card p-6 space-y-2.5">
          <h3 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">
            <span className="text-[#ff5400]">03</span> Underground streetwear heritage
          </h3>
          <p className="text-[13.5px] text-[#6e6e73] leading-relaxed">
            From high-density botanical embroidery to industrial motorsport capsules, Levix curates rare limited-edition drops that celebrate contemporary subcultural aesthetics and architectural precision.
          </p>
        </div>
      </div>

    </div>
  );
};
