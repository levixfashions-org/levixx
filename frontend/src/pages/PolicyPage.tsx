import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';

type PolicyKey = 'shipping' | 'refund' | 'privacy' | 'terms' | 'contact';

const TABS: { key: PolicyKey; label: string; path: string }[] = [
  { key: 'shipping', label: 'Shipping', path: '/policies/shipping-policy' },
  { key: 'refund', label: 'Returns & Refunds', path: '/policies/refund-policy' },
  { key: 'privacy', label: 'Privacy', path: '/policies/privacy-policy' },
  { key: 'terms', label: 'Terms', path: '/policies/terms-of-service' },
  { key: 'contact', label: 'Contact', path: '/policies/contact' }
];

const Section: React.FC<{ title: string; id?: string; children: React.ReactNode }> = ({ title, id, children }) => (
  <section id={id} className="space-y-2 scroll-mt-24">
    <h3 className="font-bold uppercase tracking-wider text-black text-sm">{title}</h3>
    <div className="space-y-2">{children}</div>
  </section>
);

export const PolicyPage: React.FC = () => {
  const location = useLocation();
  const settings = useSettingsStore((s) => s.settings);
  const path = location.pathname;
  const key: PolicyKey = path.includes('refund') || path.includes('return')
    ? 'refund'
    : path.includes('privacy')
      ? 'privacy'
      : path.includes('terms')
        ? 'terms'
        : path.includes('contact')
          ? 'contact'
          : 'shipping';

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash, key]);

  const free = settings.freeShippingThreshold;
  const fee = settings.shippingFee;
  const email = settings.supportEmail;
  const title = TABS.find((t) => t.key === key)?.label || 'Policies';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 space-y-8 text-black">
      <div className="border-b border-black/10 pb-6 space-y-4">
        <div>
          <span className="text-[10px] font-mono text-[#FF5400] font-bold uppercase tracking-widest">LEVIX Policies</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight mt-1">{title}</h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              to={t.path}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider border ${
                t.key === key ? 'bg-black text-white border-black' : 'border-black/20 text-neutral-700 hover:border-black'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="text-xs text-neutral-700 leading-relaxed space-y-6">
        {key === 'shipping' && (
          <>
            <Section title="1. Where we ship">
              <p>We currently ship across India. Every order is packed and dispatched from our studio after payment is confirmed.</p>
            </Section>
            <Section title="2. Shipping charges">
              <p>
                {free > 0
                  ? `Shipping is free on orders of RS. ${free.toLocaleString('en-IN')} or more. Orders below this amount carry a delivery fee of RS. ${fee.toLocaleString('en-IN')}.`
                  : 'Shipping is free on all orders.'}{' '}
                The exact amount is always shown before you pay.
              </p>
            </Section>
            <Section title="3. Dispatch & delivery time">
              <p>Orders are usually dispatched within 1–3 business days. Delivery typically takes 3–7 business days depending on your location.</p>
              <p>Once your order ships, the courier name and tracking number appear under My Orders in your account.</p>
            </Section>
            <Section title="4. Delivery issues">
              <p>If your parcel is delayed, damaged or appears tampered with, please contact us within 48 hours of delivery at <a className="underline" href={`mailto:${email}`}>{email}</a> with your order number and photos.</p>
            </Section>
          </>
        )}

        {key === 'refund' && (
          <>
            <Section title="1. Size exchanges" id="returns">
              <p>We offer size exchanges within 7 days of delivery. Items must be unworn, unwashed and returned with original tags and packaging.</p>
              <p>To request an exchange, email <a className="underline" href={`mailto:${email}`}>{email}</a> with your order number, the item and the size you need.</p>
            </Section>
            <Section title="2. Damaged or wrong items" id="refund">
              <p>If you receive a damaged, defective or incorrect item, contact us within 48 hours of delivery with photos. We will replace the item or issue a full refund if a replacement isn't available.</p>
            </Section>
            <Section title="3. Cancellations">
              <p>You can cancel an order before it is dispatched by emailing us. Once shipped, orders cannot be cancelled but may be eligible for exchange.</p>
            </Section>
            <Section title="4. Refund timelines">
              <p>Approved refunds are issued to the original payment method through Razorpay. Banks usually reflect the amount within 5–7 business days.</p>
              <p>If a payment was deducted but the order was not confirmed, the amount is automatically refunded by Razorpay/your bank.</p>
            </Section>
          </>
        )}

        {key === 'privacy' && (
          <>
            <Section title="1. Information we collect">
              <p>When you create an account or place an order we collect your name, email address, phone number and shipping address. Sign-in is handled securely by Google Firebase Authentication — we never see or store your password.</p>
            </Section>
            <Section title="2. Payments">
              <p>Payments are processed by Razorpay. Card, UPI and bank details are entered on Razorpay's secure checkout and are never stored on our servers.</p>
            </Section>
            <Section title="3. How we use your information">
              <p>We use your details only to process and deliver orders, provide customer support and, if you subscribe, send you news about new drops. You can unsubscribe at any time.</p>
            </Section>
            <Section title="4. Sharing">
              <p>We share delivery details with our courier partners only to ship your order. We do not sell your personal information.</p>
            </Section>
            <Section title="5. Your choices">
              <p>You can update your details from your account or ask us to delete your account and data by emailing <a className="underline" href={`mailto:${email}`}>{email}</a>.</p>
            </Section>
          </>
        )}

        {key === 'terms' && (
          <>
            <Section title="1. Overview">
              <p>This website is operated by LEVIX. By using the site or placing an order you agree to these terms.</p>
            </Section>
            <Section title="2. Products & pricing">
              <p>All prices are in Indian Rupees and include applicable taxes. We try to show colours and details accurately, but slight variations may occur. Drops are limited and we may limit quantities per customer.</p>
            </Section>
            <Section title="3. Orders">
              <p>An order is confirmed only after successful payment. We may cancel and fully refund an order if an item becomes unavailable or if we suspect fraud.</p>
            </Section>
            <Section title="4. Intellectual property">
              <p>All designs, logos, images and content on this site belong to LEVIX and may not be used without permission.</p>
            </Section>
            <Section title="5. Contact">
              <p>Questions about these terms? Email <a className="underline" href={`mailto:${email}`}>{email}</a>.</p>
            </Section>
          </>
        )}

        {key === 'contact' && (
          <>
            <Section title="Customer support">
              <p>Email: <a className="underline font-semibold text-black" href={`mailto:${email}`}>{email}</a></p>
              {settings.supportPhone && <p>Phone / WhatsApp: <a className="underline font-semibold text-black" href={`tel:${settings.supportPhone.replace(/\s/g, '')}`}>{settings.supportPhone}</a></p>}
              {settings.instagramHandle && (
                <p>
                  Instagram:{' '}
                  <a className="underline font-semibold text-black" href={`https://instagram.com/${settings.instagramHandle.replace(/^@/, '')}`} target="_blank" rel="noreferrer">
                    @{settings.instagramHandle.replace(/^@/, '')}
                  </a>
                </p>
              )}
              <p>Support hours: Monday – Saturday, 10:00 AM – 7:00 PM IST. Please include your order number for order-related queries.</p>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};
