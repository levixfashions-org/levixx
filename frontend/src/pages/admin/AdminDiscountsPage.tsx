import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient, DiscountCode } from '../../services/api';
import { AdminNav } from '../../components/admin/AdminNav';
import { Plus, Trash2, Tag, Percent, Check, X, Copy, CheckCircle2 } from 'lucide-react';

export const AdminDiscountsPage: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('20');
  const [minOrderINR, setMinOrderINR] = useState('1999');
  const [maxDiscountINR, setMaxDiscountINR] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/discounts');
      setDiscounts(res.data.discounts || []);
    } catch (err) {
      console.warn('Failed to load discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
      return;
    }
    if (user && isAdmin) {
      loadDiscounts();
    }
  }, [user, isAdmin, authLoading, navigate]);

  const handleOpenAdd = () => {
    setCode('');
    setType('PERCENTAGE');
    setValue('20');
    setMaxDiscountINR('');
    setMinOrderINR('1999');
    setExpiresAt('');
    setIsActive(true);
    setShowModal(true);
  };

  // Highest active offer, shown in the summary card (with its cap if it has one).
  const bestOffer = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const live = discounts.filter((d) => d.isActive && (!d.expiresAt || d.expiresAt >= today));
    if (!live.length) return null;
    const pct = live.filter((d) => d.type === 'PERCENTAGE').sort((a, b) => b.value - a.value)[0];
    const flat = live.filter((d) => d.type === 'FIXED').sort((a, b) => b.value - a.value)[0];
    const pick = pct || flat;
    if (!pick) return null;
    if (pick.type === 'PERCENTAGE') {
      return {
        title: `${pick.value}% OFF`,
        note: pick.maxDiscountPaise ? `${pick.code} · max RS. ${(pick.maxDiscountPaise / 100).toLocaleString('en-IN')} per order` : `${pick.code} · no maximum limit`
      };
    }
    return { title: `RS. ${pick.value} OFF`, note: `${pick.code} · flat discount` };
  })();

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    try {
      await apiClient.post('/admin/discounts', {
        code: code.trim().toUpperCase(),
        type,
        value: parseFloat(value),
        minOrderINR: parseFloat(minOrderINR) || 0,
        maxDiscountINR: type === 'PERCENTAGE' && parseFloat(maxDiscountINR) > 0 ? parseFloat(maxDiscountINR) : null,
        expiresAt,
        isActive
      });
      setShowModal(false);
      setActionMsg(`✓ Promo code "${code.toUpperCase()}" created successfully!`);
      await loadDiscounts();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save discount code');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await apiClient.patch(`/admin/discounts/${id}/toggle`, {});
      await loadDiscounts();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (id: string, codeName: string) => {
    if (!window.confirm(`Delete discount code "${codeName}"?`)) return;
    try {
      await apiClient.delete(`/admin/discounts/${id}`);
      setActionMsg(`✓ Discount code "${codeName}" deleted.`);
      await loadDiscounts();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete discount code');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#EFEFEF] pb-24">
      <AdminNav />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
              <Tag className="w-3.5 h-3.5" />
              <span>MARKETING & PROMOTIONS</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black mt-1">
              Discount & Promo Codes
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              Create and manage coupon codes for marketing campaigns, private drops, and customer cart incentives.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 bg-[#FF5400] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e04a00] flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo Code</span>
          </button>
        </div>

        {actionMsg && (
          <div className="p-4 bg-black text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-[#FF5400]" />
              <span>{actionMsg}</span>
            </div>
            <button onClick={() => setActionMsg(null)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Active Coupons</span>
            <p className="font-display font-black text-3xl text-black">
              {discounts.filter(d => d.isActive).length}
            </p>
            <p className="text-[11px] text-green-700 font-semibold">Available for customers at checkout</p>
          </div>

          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Total Codes</span>
            <p className="font-display font-black text-3xl text-black">
              {discounts.length}
            </p>
            <p className="text-[11px] text-neutral-600 font-medium">In store promotion registry</p>
          </div>

          <div className="bg-white p-6 border border-black/10 shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Best active offer</span>
            <p className="font-display font-black text-3xl text-black font-mono">
              {bestOffer ? bestOffer.title : '—'}
            </p>
            <p className="text-[11px] text-neutral-600 font-medium">{bestOffer ? bestOffer.note : 'No active coupons right now'}</p>
          </div>
        </div>

        {/* Discounts Table */}
        {loading ? (
          <div className="py-20 text-center font-mono text-xs uppercase text-neutral-500">
            Loading promo codes...
          </div>
        ) : (
          <div className="bg-white border border-black/10 shadow-sm overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-black/10 uppercase tracking-wider text-[10px] text-neutral-500 bg-neutral-50">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Benefit</th>
                  <th className="py-3 px-4">Min. Cart Requirement</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-sans">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 bg-black text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs">
                          {d.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(d.code)}
                          title="Copy Code"
                          className="text-neutral-400 hover:text-black p-1"
                        >
                          {copiedCode === d.code ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-black text-sm">
                      {d.type === 'PERCENTAGE' ? `${d.value}% OFF` : `RS. ${d.value} OFF`}
                      {d.type === 'PERCENTAGE' && d.maxDiscountPaise ? (
                        <span className="block text-[10.5px] font-semibold text-[#FF5400]">up to RS. {(d.maxDiscountPaise / 100).toLocaleString('en-IN')}</span>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-700">
                      Orders over RS. {(d.minOrderPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-500">
                      {d.expiresAt ? `Expires ${d.expiresAt}` : 'No expiry'}
                      {typeof d.usedCount === 'number' ? ` • Used ${d.usedCount}×` : ''}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(d.id)}
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-xs transition-colors cursor-pointer ${
                          d.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                        }`}
                      >
                        {d.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(d.id, d.code)}
                        className="p-1.5 border border-black/20 hover:border-red-600 text-neutral-600 hover:bg-red-600 hover:text-white transition-colors"
                        title="Delete Promo Code"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Modal: Create Discount Code */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white max-w-md w-full shadow-2xl border border-black/20 overflow-hidden">
            
            <div className="flex items-center justify-between p-5 border-b border-black/10 bg-neutral-50">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-[#FF5400]" />
                <h3 className="font-display font-black text-lg uppercase tracking-tight text-black">
                  Create Promo Code
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscount} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block uppercase font-bold text-neutral-700 tracking-wider mb-1">
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LEVIX20"
                  className="w-full border border-black/20 p-2.5 font-mono uppercase font-bold tracking-wider focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-bold text-neutral-700 tracking-wider mb-1">
                    Discount Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full border border-black/20 p-2.5 font-bold uppercase focus:border-black focus:outline-none bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (% OFF)</option>
                    <option value="FIXED">Flat Amount (RS. OFF)</option>
                  </select>
                </div>

                <div>
                  <label className="block uppercase font-bold text-neutral-700 tracking-wider mb-1">
                    {type === 'PERCENTAGE' ? 'Discount Value (%)' : 'Amount (INR)'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={type === 'PERCENTAGE' ? 90 : 10000}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full border border-black/20 p-2.5 font-mono font-bold focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {type === 'PERCENTAGE' && (
                <div className="bg-orange-50 border border-orange-200 p-3">
                  <label className="block uppercase font-bold text-neutral-700 tracking-wider mb-1">
                    Max discount per order (INR) — optional
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxDiscountINR}
                    onChange={(e) => setMaxDiscountINR(e.target.value)}
                    placeholder="e.g. 200  (leave empty for no limit)"
                    className="w-full border border-black/20 p-2.5 font-mono font-bold bg-white focus:border-black focus:outline-none"
                  />
                  <p className="text-[10.5px] text-neutral-600 mt-1">
                    {parseFloat(maxDiscountINR) > 0
                      ? `Customers get ${value || 0}% off, but never more than RS. ${parseFloat(maxDiscountINR).toLocaleString('en-IN')} on one order.`
                      : `No limit — ${value || 0}% off the whole order, however big it is.`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase font-bold text-neutral-700 tracking-wider mb-1">
                    Min Order Value (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderINR}
                    onChange={(e) => setMinOrderINR(e.target.value)}
                    placeholder="1999"
                    className="w-full border border-black/20 p-2.5 font-mono focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block uppercase font-bold text-neutral-700 tracking-wider mb-1">
                    Valid Until (optional)
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full border border-black/20 p-2.5 font-mono focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-black"
                />
                <label htmlFor="activeToggle" className="font-bold uppercase tracking-wider text-neutral-800 cursor-pointer">
                  Activate this promo code immediately
                </label>
              </div>

              <div className="pt-4 border-t border-black/10 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-black/20 hover:border-black text-black uppercase font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-black hover:bg-neutral-800 text-white uppercase font-bold text-xs tracking-wider flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 text-[#FF5400]" />
                  <span>{saving ? 'Saving...' : 'Publish Coupon'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};