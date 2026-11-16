import React from 'react';

interface LevixCartIconProps {
  className?: string;
  itemCount?: number;
}

export const LevixCartIcon: React.FC<LevixCartIconProps> = ({
  className = 'w-[22px] h-[25px]',
  itemCount = 0
}) => {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Bespoke Luxury Shopping Bag with "LEVIX" Branded Cover Plate */}
      <svg
        viewBox="0 0 24 26"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Luxury Arched Bag Handle */}
        <path
          d="M7.5 7.5V5C7.5 2.51 9.51 0.5 12 0.5C14.49 0.5 16.5 2.51 16.5 5V7.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Structured Luxury Bag Body */}
        <path
          d="M2 8H22L20.6 23.8C20.5 24.5 19.9 25 19.2 25H4.8C4.1 25 3.5 24.5 3.4 23.8L2 8Z"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="currentColor"
          fillOpacity="0.04"
        />

        {/* Embossed LEVIX Brand Cover Plate */}
        <rect
          x="4.2"
          y="12.8"
          width="15.6"
          height="8.2"
          rx="1.6"
          fill="currentColor"
        />

        {/* High-Contrast Brand Wordmark on Cover Plate */}
        <text
          x="12"
          y="18.5"
          textAnchor="middle"
          style={{ fill: 'var(--lx-bag-print, #ffffff)' }}
          fontSize="3.9"
          fontWeight="900"
          fontFamily="'Assistant', -apple-system, sans-serif"
          letterSpacing="0.12em"
        >
          LEVIX
        </text>
      </svg>

      {/* Floating Cart Item Counter Badge */}
      {itemCount > 0 && (
        <span className="absolute -top-1.5 -right-2 bg-black text-white text-[9px] font-extrabold w-[17px] h-[17px] rounded-full flex items-center justify-center font-mono border-2 border-[#EFEFEF] shadow-sm animate-in fade-in zoom-in-75 duration-200">
          {itemCount}
        </span>
      )}
    </div>
  );
};
