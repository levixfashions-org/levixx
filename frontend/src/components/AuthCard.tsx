import React from 'react';

/** Shared frosted-glass frame for Sign in, Create account and Reset password. */
export const AuthCard: React.FC<{ title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, subtitle, children, footer }) => (
  <div className="lx-login relative min-h-[calc(100svh-64px)] flex items-center justify-center px-4 py-12 sm:py-16 overflow-hidden">
    <div className="lx-login-wallpaper" aria-hidden="true" />
    <div className="lx-login-card relative w-full max-w-[400px] px-6 py-8 sm:px-9 sm:py-10">
      <div className="flex flex-col items-center text-center">
        <span className="lx-app-icon w-[60px] h-[60px] rounded-[17px] flex items-center justify-center">
          <svg viewBox="0 0 230 255" className="w-[24px] h-[27px]" aria-hidden="true">
            <defs>
              <linearGradient id="lxAuthOr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FF8A45" />
                <stop offset="1" stopColor="#FF5400" />
              </linearGradient>
            </defs>
            <g fill="url(#lxAuthOr)">
              <path d="M0 0H51V203H230V255H0Z" />
              <path d="M65 38H111L184 203H138Z" />
              <path d="M144 38H190L116 203H70Z" />
            </g>
          </svg>
        </span>
        <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.03em] text-[#0b0b0f]">{title}</h1>
        <p className="mt-1 text-[13.5px] text-[#6e6e73]">{subtitle}</p>
      </div>
      {children}
      {footer && <div className="mt-7 text-center text-[13px] text-[#6e6e73]">{footer}</div>}
    </div>
  </div>
);

export const AuthError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div role="alert" className="mt-6 px-3.5 py-3 rounded-[14px] bg-red-50/90 border border-red-200 text-red-700 text-[12.5px] font-medium">
    {children}
  </div>
);

export const AuthDivider: React.FC = () => (
  <div className="my-6 flex items-center gap-3 text-[12px] text-[#8e8e93]">
    <span className="h-px flex-1 bg-black/[0.08]" />
    or
    <span className="h-px flex-1 bg-black/[0.08]" />
  </div>
);

export const authLabel = 'block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1';
export const authInput = 'lx-field w-full h-12 px-4 text-[15px]';
export const authButton = 'lx-btn-primary w-full h-12 mt-2 flex items-center justify-center gap-2 text-[15px] font-semibold disabled:opacity-60';
export const authLink = 'font-semibold text-[#0b0b0f] hover:text-[#ff5400]';
