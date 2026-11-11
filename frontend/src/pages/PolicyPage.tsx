import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';

type PolicyKey = 'shipping' | 'refund' | 'privacy' | 'terms' | 'contact';

const LAST_UPDATED = '11 November 2026';

const TABS: { key: PolicyKey; label: string; path: string }[] = [
  { key: 'terms', label: 'Terms & Conditions', path: '/policies/terms-of-service' },
  { key: 'refund', label: 'Returns, Refunds & Cancellation', path: '/policies/refund-policy' },
  { key: 'shipping', label: 'Shipping', path: '/policies/shipping-policy' },
  { key: 'privacy', label: 'Privacy', path: '/policies/privacy-policy' },
  { key: 'contact', label: 'Contact & FAQ', path: '/policies/contact' }
];

const Section: React.FC<{ title: string; id?: string; children: React.ReactNode }> = ({ title, id, children }) => (
  <section id={id} className="space-y-2 scroll-mt-28">
    <h3 className="font-bold uppercase tracking-wider text-black text-sm">{title}</h3>
    <div className="space-y-2">{children}</div>
  </section>
);

const List: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

export const PolicyPage: React.FC = () => {
  const location = useLocation();
  const settings = useSettingsStore((s) => s.settings);
  const path = location.pathname;
  const key: PolicyKey =
    path.includes('refund') || path.includes('return') || path.includes('cancel')
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
    else window.scrollTo(0, 0);
  }, [location.hash, key]);

  const title = TABS.find((t) => t.key === key)?.label || 'Policies';
  useEffect(() => {
    document.title = `${title} | LEVIX`;
  }, [title]);

  const free = settings.freeShippingThreshold;
  const fee = settings.shippingFee;
  /** True when every order ships free (no minimum, or no fee set). Follows Admin → Store Settings. */
  const freeAll = !(free > 0 && fee > 0);
  const deliverySentence = freeAll
    ? 'Delivery is free on every order across India, with no minimum order value.'
    : `Delivery is free on orders of ₹${free.toLocaleString('en-IN')} or more; orders below this carry a delivery charge of ₹${fee.toLocaleString('en-IN')}.`;
  const email = settings.supportEmail || 'levixfashions@gmail.com';
  const phone = settings.supportPhone?.trim();
  const brand = 'LEVIX';
  const legal = settings.legalName?.trim() || brand;
  const address = settings.businessAddress?.trim();
  const officer = settings.grievanceOfficer?.trim();
  const gstin = settings.gstin?.trim();
  const city = settings.jurisdictionCity?.trim();
  const insta = settings.instagramHandle?.replace(/^@/, '');
  const cod = Boolean(settings.codEnabled);
  const codFee = settings.codFee || 0;
  const codMax = settings.codMaxOrder || 0;
  const codSentence = cod
    ? `Cash on Delivery (COD) is also available${codMax > 0 ? ` for orders up to ₹${codMax.toLocaleString('en-IN')}` : ''}${codFee > 0 ? `, with a COD fee of ₹${codFee.toLocaleString('en-IN')}` : ''}. COD orders are paid to the courier in cash or by UPI on delivery.`
    : 'Cash on Delivery (COD) is not available.';

  const Mail = <a className="underline font-semibold text-black" href={`mailto:${email}`}>{email}</a>;
  const contactLine = (
    <>
      {Mail}
      {phone ? (
        <>
          {' '}or WhatsApp <span className="font-semibold text-black">{phone}</span>
        </>
      ) : null}
    </>
  );

  const BusinessInfo = (
    <div className="bg-white border border-black/10 p-4 space-y-1">
      <p><span className="font-semibold text-black">Business name:</span> {legal}{legal !== brand ? ` (trading as ${brand})` : ''}</p>
      {address && <p className="whitespace-pre-line"><span className="font-semibold text-black">Registered address:</span> {address}</p>}
      <p><span className="font-semibold text-black">Email:</span> {Mail}</p>
      {phone && <p><span className="font-semibold text-black">Phone / WhatsApp:</span> {phone}</p>}
      {gstin && <p><span className="font-semibold text-black">GSTIN:</span> {gstin}</p>}
      <p><span className="font-semibold text-black">Website:</span> thelevix.shop</p>
    </div>
  );

  const Grievance = (
    <>
      <p>
        In line with the Consumer Protection (E-Commerce) Rules, 2020 and the Information Technology Rules, 2021, you can raise any complaint with our Grievance Officer:
      </p>
      <div className="bg-white border border-black/10 p-4 space-y-1">
        <p><span className="font-semibold text-black">Grievance Officer:</span> {officer || `${legal} customer care`}</p>
        <p><span className="font-semibold text-black">Email:</span> {Mail}</p>
        {phone && <p><span className="font-semibold text-black">Phone:</span> {phone}</p>}
        {address && <p className="whitespace-pre-line"><span className="font-semibold text-black">Address:</span> {address}</p>}
      </div>
      <p>We acknowledge every complaint within 48 hours and aim to resolve it within 30 days of receiving it.</p>
    </>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 space-y-8 text-black">
      <div className="border-b border-black/10 pb-6 space-y-4">
        <div>
          <span className="text-[10px] font-mono text-[#FF5400] font-bold uppercase tracking-widest">LEVIX Policies</span>
          <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight mt-1">{title}</h1>
          {key !== 'contact' && <p className="text-[11px] text-neutral-500 mt-2">Last updated: {LAST_UPDATED}</p>}
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
        {/* ------------------------------------------------------------------ TERMS */}
        {key === 'terms' && (
          <>
            <Section title="1. About these terms">
              <p>
                The website thelevix.shop (the "Website") is owned and operated by {legal}{legal !== brand ? `, trading as ${brand}` : ''} ("{brand}", "we", "us").
                By browsing the Website, creating an account or placing an order, you agree to these Terms & Conditions together with our{' '}
                <Link className="underline" to="/policies/refund-policy">Returns, Refunds & Cancellation policy</Link>,{' '}
                <Link className="underline" to="/policies/shipping-policy">Shipping policy</Link> and{' '}
                <Link className="underline" to="/policies/privacy-policy">Privacy policy</Link>. If you do not agree, please do not use the Website.
              </p>
              {BusinessInfo}
            </Section>
            <Section title="2. Eligibility & your account">
              <List
                items={[
                  'You must be at least 18 years old, or use the Website under the supervision of a parent or guardian.',
                  'Please give accurate name, phone, email and delivery details. Orders with incorrect details may be delayed or cancelled.',
                  'You are responsible for keeping your account secure. Sign-in is handled by Google Firebase; we never see your password.'
                ]}
              />
            </Section>
            <Section title="3. Products">
              <List
                items={[
                  'We try to show every product, colour and print as accurately as possible. Small differences can occur because of screen settings and photography.',
                  'Acid-wash and garment-dyed pieces are treated by hand, so the wash pattern and shade vary from piece to piece. This is part of the product, not a defect.',
                  'Please check the size guide on each product page before ordering. Measurements can vary by up to 1–2 cm.',
                  'Drops are made in limited quantities. Products are available only while stock lasts and we may limit quantities per customer.'
                ]}
              />
            </Section>
            <Section title="4. Prices & payment">
              <List
                items={[
                  `All prices are in Indian Rupees (₹) and include applicable taxes (GST). ${deliverySentence} The final amount, including any charges, is shown at checkout before you pay.`,
                  `Online payments are processed securely by Razorpay (UPI, debit/credit cards, net banking and wallets). ${codSentence}`,
                  'If a product is listed at an obviously wrong price because of a technical or typing error, we may cancel the order and refund the full amount.'
                ]}
              />
            </Section>
            <Section title="5. Orders">
              <List
                items={[
                  'Your order is confirmed only after your payment is successful. You will see a confirmation page and can track it under My Orders.',
                  'We may cancel an order (with a full refund) if the item goes out of stock, the delivery address is not serviceable, or we suspect fraudulent or unauthorised activity.'
                ]}
              />
            </Section>
            <Section title="6. Shipping, returns & cancellation">
              <p>
                {deliverySentence} Delivery timelines are explained in our <Link className="underline" to="/policies/shipping-policy">Shipping policy</Link>.
                <span className="font-semibold text-black"> We accept returns only for damaged, defective or wrong items</span> reported within 48 hours of delivery — see the{' '}
                <Link className="underline" to="/policies/refund-policy">Returns, Refunds & Cancellation policy</Link>.
              </p>
            </Section>
            <Section title="7. Discount codes">
              <p>Discount codes are valid only for the period and conditions shown, cannot be combined unless stated, have no cash value and may be withdrawn at any time. A code cannot be applied after an order is placed.</p>
            </Section>
            <Section title="8. Intellectual property">
              <p>All LEVIX names, logos, designs, artwork, photos, videos and text on the Website belong to {brand} or are used with permission. You may not copy, reproduce or sell them without our written consent.</p>
            </Section>
            <Section title="9. Acceptable use">
              <p>You agree not to misuse the Website — for example by attempting fraud, using someone else's payment details, interfering with the Website's security, or copying content or product data using automated tools.</p>
            </Section>
            <Section title="10. Limitation of liability">
              <p>
                To the extent permitted by law, {brand} is not liable for indirect or consequential losses arising from the use of the Website or our products. Our total liability for any order is limited to the amount you paid for that order.
                Nothing in these terms limits your rights under the Consumer Protection Act, 2019.
              </p>
            </Section>
            <Section title="11. Governing law & disputes">
              <p>
                These terms are governed by the laws of India. Any dispute will be subject to the jurisdiction of the courts at {city || 'the city of our registered business address'}, India,
                without affecting your right to approach a consumer commission under the Consumer Protection Act, 2019.
              </p>
            </Section>
            <Section title="12. Grievance redressal" id="grievance">
              {Grievance}
            </Section>
            <Section title="13. Changes to these terms">
              <p>We may update these terms from time to time. The version published on this page at the time of your order applies to that order.</p>
            </Section>
          </>
        )}

        {/* ------------------------------------------------------------------ RETURNS / REFUNDS / CANCELLATION */}
        {key === 'refund' && (
          <>
            <div className="bg-black text-white p-4 space-y-1">
              <p className="font-bold uppercase tracking-wider text-[11px]">In short</p>
              <p>
                We accept returns <span className="font-semibold">only if the product you receive is damaged, defective or not what you ordered</span>, and it is reported within{' '}
                <span className="font-semibold">48 hours of delivery</span> with an unboxing video. We do not accept returns or exchanges for size, fit, or change of mind.
              </p>
            </div>

            <Section title="1. What is covered" id="returns">
              <p>You can request a replacement or refund if:</p>
              <List
                items={[
                  'The product arrived damaged — for example torn, holed, stained or with a damaged print.',
                  'The product has a manufacturing defect such as faulty stitching, a peeling print or a broken seam.',
                  'You received the wrong product, colour or size (different from what is shown in your order).',
                  'An item from your order is missing from the parcel.'
                ]}
              />
            </Section>

            <Section title="2. What is not covered">
              <List
                items={[
                  'Size or fit issues — please check the size guide before ordering. We do not offer size exchanges.',
                  'Change of mind, or a product "not looking as expected" when it matches the product description.',
                  'Small colour differences caused by screens, and natural variation in acid-wash / garment-dyed pieces.',
                  'Products that have been worn, washed, ironed, altered, or damaged after delivery.',
                  'Damage claims reported after 48 hours of delivery, or without an unboxing video.'
                ]}
              />
            </Section>

            <Section title="3. How to report a damaged or wrong item" id="report">
              <p>Within 48 hours of delivery, contact us at {contactLine} with:</p>
              <List
                items={[
                  'Your order number (for example LVX-…).',
                  'Clear photos of the product, the damage and the size label.',
                  'A continuous unboxing video that starts with the sealed parcel and its shipping label.'
                ]}
              />
              <p>Please keep the product unused, with its tags and original packaging, until your claim is resolved.</p>
              <p>
                If the parcel looks damaged or tampered with when it arrives, please refuse it or note it with the courier and inform us right away.
              </p>
            </Section>

            <Section title="4. What happens next">
              <List
                items={[
                  'We review your claim within 2 business days and reply by email or WhatsApp.',
                  'If approved, we arrange a free pickup of the item. If pickup is not available at your pin code, we will ask you to ship it back and reimburse the courier cost.',
                  'Once we receive and check the item, we send a free replacement of the same product. If it is out of stock, we issue a full refund.',
                  'If the claim is approved without needing the item back (for example a missing item), we ship the replacement or refund straight away.'
                ]}
              />
            </Section>

            <Section title="5. Refunds" id="refund">
              <List
                items={[
                  'Approved refunds for online payments go back to the original payment method through Razorpay. For Cash on Delivery orders, we refund to a UPI ID or bank account you share with us. We do not refund in cash.',
                  'We start the refund within 2 business days of approval. Your bank or UPI app usually shows it within 5–7 business days.',
                  freeAll ? 'For damaged, defective or wrong items, we refund the full amount you paid for the order.' : 'For damaged, defective or wrong items, we refund the full amount including any delivery charge you paid.',
                  'If money was deducted but your order was not confirmed (a failed payment), the amount is reversed automatically by Razorpay / your bank, usually within 5–7 business days.'
                ]}
              />
            </Section>

            <Section title="6. Order cancellation" id="cancellation">
              <List
                items={[
                  `You can cancel an order before it is dispatched by contacting us at ${email}${phone ? ` or ${phone}` : ''} with your order number. You will receive a full refund.`,
                  'Once an order has been dispatched, it can no longer be cancelled.',
                  'We may cancel an order if an item goes out of stock, the address is not serviceable, or a payment looks fraudulent. In such cases you receive a full refund.'
                ]}
              />
            </Section>

            <Section title="7. Payment options">
              <p>Online payments are processed through Razorpay. {codSentence}</p>
              {cod && <p>Repeatedly refusing COD parcels may lead us to disable Cash on Delivery for your future orders.</p>}
            </Section>

            <Section title="8. Need help?">
              <p>Reach us at {contactLine}. Unresolved complaints can be escalated to our Grievance Officer listed in the <Link className="underline" to="/policies/terms-of-service#grievance">Terms & Conditions</Link>.</p>
            </Section>
          </>
        )}

        {/* ------------------------------------------------------------------ SHIPPING */}
        {key === 'shipping' && (
          <>
            <Section title="1. Where we ship">
              <p>We ship to all serviceable pin codes across India. We do not ship internationally at the moment.</p>
            </Section>
            <Section title="2. Delivery charges">
              <p>
                {deliverySentence}{' '}
                {freeAll ? 'You will never be charged for standard delivery at checkout.' : 'Any delivery charge is always shown at checkout before you pay.'}
              </p>
            </Section>
            <Section title="3. Processing time">
              <p>Orders are packed and dispatched within 1–3 business days after payment is confirmed. Orders placed on Sundays or public holidays are processed on the next business day.</p>
            </Section>
            <Section title="4. Delivery time">
              <p>Delivery usually takes 3–7 business days after dispatch, and up to 10 business days for remote locations. Delays caused by weather, strikes, courier issues or other events outside our control may occasionally extend this.</p>
            </Section>
            <Section title="5. Tracking your order">
              <p>
                Once your order ships, the courier name and tracking number appear under My Orders in your account. You can also check it on the{' '}
                <Link className="underline" to="/pages/track">Track your order</Link> page.
              </p>
            </Section>
            <Section title="6. Address & failed delivery">
              <List
                items={[
                  'Please make sure your address, pin code and phone number are correct — we cannot change the address once the order is dispatched.',
                  'If a parcel comes back to us because the address was wrong or nobody was available after the courier\'s attempts, we will contact you. Re-shipping such a parcel may carry a delivery charge, even when delivery is normally free.'
                ]}
              />
            </Section>
            <Section title="7. Damaged or tampered parcels">
              <p>
                If the parcel looks damaged or opened, please refuse it or record an unboxing video, and contact us within 48 hours of delivery at {contactLine}. See the{' '}
                <Link className="underline" to="/policies/refund-policy#report">damage claim steps</Link>.
              </p>
            </Section>
          </>
        )}

        {/* ------------------------------------------------------------------ PRIVACY */}
        {key === 'privacy' && (
          <>
            <Section title="1. Who we are">
              <p>
                This policy explains how {legal}{legal !== brand ? ` (${brand})` : ''} collects and uses your personal data when you use thelevix.shop, in line with the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.
              </p>
            </Section>
            <Section title="2. Data we collect">
              <List
                items={[
                  'Account details: your name, email address and, if you sign in with Google, your Google profile name and photo.',
                  'Order details: delivery name, address, pin code, phone number, items ordered and order history.',
                  'Payment status: whether a payment succeeded and its Razorpay reference. Your card, UPI or bank details are entered on Razorpay and never reach or stay on our servers.',
                  'Technical data: basic information such as browser type, device and IP address, kept in server logs for security.'
                ]}
              />
            </Section>
            <Section title="3. Why we use it">
              <List
                items={[
                  'To process, deliver and support your orders, including returns and refunds.',
                  'To keep your account, bag and saved items working.',
                  'To prevent fraud and keep the Website secure.',
                  'To meet legal, tax and accounting requirements.',
                  'To send you news about new drops and offers — only if you subscribe. You can unsubscribe at any time.'
                ]}
              />
            </Section>
            <Section title="4. Who we share it with">
              <p>We share only what is needed, with:</p>
              <List
                items={[
                  'Razorpay — to process payments and refunds.',
                  'Courier and logistics partners — your name, address and phone number, to deliver your order.',
                  'Google Firebase — for secure sign-in.',
                  'Our hosting provider — to run the Website and store data securely.',
                  'Government or law-enforcement authorities — only when required by law.'
                ]}
              />
              <p className="font-semibold text-black">We never sell your personal data.</p>
            </Section>
            <Section title="5. Cookies & browser storage">
              <p>We use your browser's storage only to keep you signed in, remember your bag and saved items, and remember small preferences (for example that you've already seen the opening animation). We do not use advertising cookies.</p>
            </Section>
            <Section title="6. How long we keep it">
              <p>We keep your account data while your account is active. Order and invoice records are kept for as long as Indian tax and accounting laws require. After that, data is deleted or anonymised.</p>
            </Section>
            <Section title="7. Security">
              <p>The Website runs on HTTPS, admin access is restricted, and payment data is handled entirely by Razorpay. No method is 100% secure, but we take reasonable steps to protect your data.</p>
            </Section>
            <Section title="8. Your rights">
              <p>
                You can ask us to access, correct or delete your personal data, withdraw your consent, or nominate someone to act on your behalf, by writing to {Mail}. We respond within 30 days.
                Some data may need to be kept for legal reasons (for example, invoices).
              </p>
            </Section>
            <Section title="9. Children">
              <p>The Website is not meant for children under 18 without the involvement of a parent or guardian. We do not knowingly collect data from children.</p>
            </Section>
            <Section title="10. Grievance Officer">{Grievance}</Section>
            <Section title="11. Changes to this policy">
              <p>If we change this policy, we will update it on this page with a new "Last updated" date.</p>
            </Section>
          </>
        )}

        {/* ------------------------------------------------------------------ CONTACT */}
        {key === 'contact' && (
          <>
            <Section title="Customer support">
              {BusinessInfo}
              {insta && (
                <p>
                  Instagram:{' '}
                  <a className="underline font-semibold text-black" href={`https://instagram.com/${insta}`} target="_blank" rel="noreferrer">
                    @{insta}
                  </a>
                </p>
              )}
              <p>Support hours: Monday – Saturday, 10:00 AM – 7:00 PM IST. Please include your order number for order-related queries. We reply within 24–48 hours.</p>
            </Section>

            <Section title="Grievance Officer" id="grievance">
              {Grievance}
            </Section>

            <Section title="Frequently asked questions" id="faq">
              <div className="space-y-4">
                {[
                  ['Can I return or exchange for a different size?', 'No. We only accept returns for damaged, defective or wrong items reported within 48 hours of delivery. Please check the size guide on the product page before ordering.'],
                  ['What should I do if my T-shirt arrives damaged?', 'Contact us within 48 hours of delivery with your order number, photos and an unboxing video. We will send a free replacement, or a full refund if the item is out of stock.'],
                  ['Do you offer Cash on Delivery (COD)?', cod ? `Yes. ${codSentence}` : 'No. All orders are prepaid securely through Razorpay — UPI, cards, net banking and wallets.'],
                  ['Do you charge for delivery?', freeAll ? 'No. Delivery is free on every order across India — even if you buy just one T-shirt.' : deliverySentence],
                  ['How long does delivery take?', 'Orders are dispatched within 1–3 business days and usually delivered within 3–7 business days after that.'],
                  ['Can I cancel my order?', 'Yes, before it is dispatched — contact us with your order number for a full refund. Dispatched orders cannot be cancelled.'],
                  ['When will I get my refund?', 'We start approved refunds within 2 business days. Your bank or UPI app usually shows the money within 5–7 business days.'],
                  ['Why does my acid-wash tee look slightly different from the photo?', 'Every acid-wash piece is treated by hand, so each one has its own unique wash pattern. This is normal and not a defect.']
                ].map(([q, a]) => (
                  <div key={q}>
                    <p className="font-semibold text-black">{q}</p>
                    <p>{a}</p>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
};
