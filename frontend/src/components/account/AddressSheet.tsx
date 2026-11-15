import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Address } from '../../types';

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export type AddressInput = Omit<Address, 'id' | 'country'> & { country?: string };

const EMPTY: AddressInput = { fullName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', isDefault: false };

/** Same rules as the server, so mistakes show before saving. */
function validate(a: AddressInput): Partial<Record<keyof AddressInput, string>> {
  const e: Partial<Record<keyof AddressInput, string>> = {};
  if (a.fullName.trim().length < 2) e.fullName = 'Enter the full name';
  if (!/^(\+91)?[6-9]\d{9}$/.test(a.phone.replace(/[\s-]/g, ''))) e.phone = 'Enter a valid 10-digit mobile number';
  if (a.line1.trim().length < 3) e.line1 = 'Enter house / flat and street';
  if (a.city.trim().length < 2) e.city = 'Enter the city';
  if (a.state.trim().length < 2) e.state = 'Choose the state';
  if (!/^\d{6}$/.test(a.postalCode.trim())) e.postalCode = 'Enter a 6-digit PIN code';
  return e;
}

interface Props {
  open: boolean;
  initial?: Address | null;
  defaultName?: string;
  onClose: () => void;
  onSave: (a: AddressInput) => Promise<void>;
}

export const AddressSheet: React.FC<Props> = ({ open, initial, defaultName, onClose, onSave }) => {
  const [a, setA] = useState<AddressInput>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setA(initial ? { ...EMPTY, ...initial, line2: initial.line2 || '' } : { ...EMPTY, fullName: defaultName || '' });
    setTouched(false);
    setError(null);
  }, [open, initial, defaultName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const errs = validate(a);
  const show = (k: keyof AddressInput) => (touched ? errs[k] : undefined);
  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setA((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...a, phone: a.phone.replace(/[\s-]/g, ''), postalCode: a.postalCode.trim() });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Could not save this address. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof AddressInput, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`addr-${k}`} className="block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1">{label}</label>
      <input id={`addr-${k}`} value={(a[k] as string) || ''} onChange={set(k)} className={`lx-field w-full h-11 px-3.5 text-[14.5px] ${show(k) ? '!border-red-400' : ''}`} {...props} />
      {show(k) && <p className="mt-1 pl-1 text-[11.5px] text-red-600">{show(k)}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={initial ? 'Edit address' : 'Add address'}>
      <div className="lx-sheet-backdrop absolute inset-0" onClick={onClose} />
      <form onSubmit={submit} noValidate className="lx-sheet relative w-full sm:max-w-[520px] max-h-[92svh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] px-5 sm:px-7 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="sm:hidden mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/15" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-[#0b0b0f]">{initial ? 'Edit address' : 'New address'}</h2>
          <button type="button" onClick={onClose} className="lx-btn-soft w-9 h-9 flex items-center justify-center" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <div role="alert" className="mb-4 px-3.5 py-3 rounded-[14px] bg-red-50/90 border border-red-200 text-red-700 text-[12.5px] font-medium">{error}</div>}

        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {field('fullName', 'Full name', { autoComplete: 'name', placeholder: 'Who receives the parcel' })}
            {field('phone', 'Mobile number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '10-digit number' })}
          </div>
          {field('line1', 'House / flat, street', { autoComplete: 'address-line1', placeholder: 'Flat 12, Green Residency, MG Road' })}
          {field('line2', 'Landmark / area (optional)', { autoComplete: 'address-line2', placeholder: 'Near City Mall' })}
          <div className="grid grid-cols-2 gap-3.5">
            {field('postalCode', 'PIN code', { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code', placeholder: '500001' })}
            {field('city', 'City', { autoComplete: 'address-level2', placeholder: 'Hyderabad' })}
          </div>
          <div>
            <label htmlFor="addr-state" className="block text-[12.5px] font-medium text-[#3a3a3f] mb-1.5 pl-1">State</label>
            <select id="addr-state" value={a.state} onChange={set('state')} autoComplete="address-level1" className={`lx-field w-full h-11 px-3 text-[14.5px] ${show('state') ? '!border-red-400' : ''}`}>
              <option value="">Choose state</option>
              {a.state && !INDIAN_STATES.includes(a.state) && <option value={a.state}>{a.state}</option>}
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {show('state') && <p className="mt-1 pl-1 text-[11.5px] text-red-600">{show('state')}</p>}
          </div>

          <label className="flex items-center gap-3 pt-1 cursor-pointer select-none">
            <input type="checkbox" checked={!!a.isDefault} onChange={(e) => setA((p) => ({ ...p, isDefault: e.target.checked }))} className="w-[18px] h-[18px] accent-[#FF5400]" />
            <span className="text-[13.5px] text-[#3a3a3f]">Use as my default delivery address</span>
          </label>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="lx-btn-soft h-12 text-[14.5px] font-semibold">Cancel</button>
          <button type="submit" disabled={saving} className="lx-btn-primary h-12 text-[14.5px] font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save address'}</button>
        </div>
      </form>
    </div>
  );
};
