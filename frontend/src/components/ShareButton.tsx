import React, { useEffect, useRef, useState } from 'react';

interface Props {
  name: string;
  slug: string;
  /** Price in paise, shown in the message. */
  pricePaise?: number;
  className?: string;
  iconClass?: string;
  /** Small caption shown under the icon. */
  label?: string;
}

const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 15V3" />
    <path d="M8 7l4-4 4 4" />
    <path d="M5 12v6a3 3 0 003 3h8a3 3 0 003-3v-6" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** Copy text even on browsers without the async clipboard API. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the older method */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Share a product. On phones this opens the normal share sheet (WhatsApp, Instagram, Messages…);
 * on desktop it copies the link. The link shows the product photo and price in chats because the
 * server adds the product's preview tags to /products/:slug.
 */
export const ShareButton: React.FC<Props> = ({ name, slug, pricePaise, className = '', iconClass = 'w-[16px] h-[16px]', label }) => {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flash = (s: 'copied' | 'failed') => {
    setState(s);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2200);
  };

  const onShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/products/${slug}`;
    const price = pricePaise ? ` — ₹${Math.round(pricePaise / 100).toLocaleString('en-IN')}` : '';
    const text = `Check out ${name}${price} on LEVIX`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name} | LEVIX`, text, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return; // user closed the sheet
        /* any other error: fall back to copying */
      }
    }
    flash((await copyText(`${text}\n${url}`)) ? 'copied' : 'failed');
  };

  return (
    <span className="relative inline-flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onShare}
        aria-label={`Share ${name}`}
        title="Share"
        className={className}
      >
        {state === 'copied' ? <CheckIcon className={iconClass} /> : <ShareIcon className={iconClass} />}
      </button>
      {label && <span aria-hidden="true" className="text-[10.5px] font-medium leading-none text-[#6e6e73]">{label}</span>}
      <span role="status" aria-live="polite" className="sr-only">
        {state === 'copied' ? 'Link copied' : state === 'failed' ? 'Could not copy the link' : ''}
      </span>
      {state !== 'idle' && (
        <span className="absolute right-0 top-full mt-1.5 z-30 whitespace-nowrap rounded-full bg-black px-2.5 py-1 text-[10.5px] font-semibold text-white shadow-lg lx-fade-in pointer-events-none">
          {state === 'copied' ? 'Link copied' : 'Couldn’t copy — copy the address bar'}
        </span>
      )}
    </span>
  );
};
