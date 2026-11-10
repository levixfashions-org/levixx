import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { Address } from '../types';
import { User, Package, MapPin, Shield, LogOut, Plus, Trash2 } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { user, profile, loading, logout, isAdmin, refreshProfile } = useAuth();
  const navigate = useNavigate();

  // Address form modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-20 text-center text-xs font-mono uppercase text-neutral-500">
        Loading account...
      </div>
    );
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/auth/addresses', {
        fullName,
        line1,
        city,
        state,
        postalCode,
        phone,
        isDefault
      });
      await refreshProfile();
      setShowAddressModal(false);
      // Reset
      setFullName('');
      setLine1('');
      setCity('');
      setState('');
      setPostalCode('');
      setPhone('');
    } catch (err: any) {
      alert(err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id?: string) => {
    if (!id) return;
    try {
      await apiClient.delete(`/auth/addresses/${id}`);
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to delete address');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-6 gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
            MY ACCOUNT
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black">
            Welcome, {user.displayName || user.email?.split('@')[0]}
          </h1>
          <p className="text-xs text-neutral-600 mt-1">{user.email}</p>
          {!user.emailVerified && user.providerData.some((p) => p.providerId === 'password') && (
            <p className="text-[11px] text-yellow-800 bg-yellow-50 border border-yellow-200 px-2 py-1 mt-2 inline-block">
              Please verify your email — check your inbox for the verification link.
            </p>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2.5 bg-[#FF5400] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#e04a00] flex items-center gap-1.5 shadow-sm"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Catalog Admin</span>
            </Link>
          )}

          <button
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="px-4 py-2.5 border border-black text-black text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Prominent Admin Banner when logged in as Owner */}
      {isAdmin && (
        <div className="p-6 bg-black text-white border-l-4 border-[#FF5400] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-[#FF5400] text-white font-mono text-[10px] font-bold uppercase tracking-widest">
                Owner Mode Active
              </span>
              <span className="text-xs font-mono text-neutral-400">Authenticated as levixfashions@gmail.com</span>
            </div>
            <h3 className="font-display font-black text-xl uppercase tracking-tight text-white">
              Store Administrator Control Center
            </h3>
            <p className="text-xs text-neutral-400">
              Manage product drops, update retail pricing, edit size inventories, and publish new streetwear pieces.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin"
              className="px-5 py-2.5 bg-[#FF5400] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#e04a00] flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>Add / Edit Products</span>
              <Plus className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/admin"
              className="px-4 py-2.5 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 flex items-center gap-1.5 transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>
      )}

      {/* Grid: Overview & Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Quick Navigation (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Link
            to="/account/orders"
            className="block p-5 bg-white border border-black/10 hover:border-black transition-all shadow-sm group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-black" />
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-black">
                    Order History
                  </h3>
                  <p className="text-xs text-neutral-500">Track and view receipts</p>
                </div>
              </div>
              <span className="font-mono font-bold text-sm text-black">
                {profile?._count?.orders || 0}
              </span>
            </div>
          </Link>

          <div className="p-5 bg-white border border-black/10 space-y-3 shadow-sm">
            <h4 className="font-bold text-xs uppercase tracking-wider text-black">
              Account Profile
            </h4>
            <div className="text-xs text-neutral-600 space-y-1.5">
              <p>Email: <span className="font-medium text-black">{user.email}</span></p>
              <p>Status: <span className="font-bold text-[#FF5400] uppercase">Active Member</span></p>
            </div>
          </div>
        </div>

        {/* Right Column: Delivery Addresses (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 border border-black/10 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-black/10 pb-4">
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tight text-black">
                Saved Delivery Addresses
              </h3>
              <p className="text-xs text-neutral-500">Manage addresses for one-click checkout.</p>
            </div>
            <button
              onClick={() => setShowAddressModal(true)}
              className="px-3.5 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Address</span>
            </button>
          </div>

          {/* Address List */}
          {profile?.addresses && profile.addresses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.addresses.map((addr) => (
                <div key={addr.id} className="p-4 border border-black/15 space-y-2 relative bg-neutral-50/60">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs uppercase text-black">
                      {addr.fullName}
                      {addr.isDefault && <span className="ml-2 px-1.5 py-0.5 bg-black text-white text-[9px] tracking-wider">DEFAULT</span>}
                    </span>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-neutral-400 hover:text-red-600 p-1"
                      aria-label="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed font-light">
                    {addr.line1} {addr.line2 ? `, ${addr.line2}` : ''}<br />
                    {addr.city}, {addr.state} - <span className="font-mono">{addr.postalCode}</span>
                  </p>
                  <p className="text-[11px] font-mono text-neutral-500">Phone: {addr.phone}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-neutral-500">
              No saved addresses. Click "Add Address" above to save one.
            </div>
          )}

          {/* Add Address Form Modal */}
          {showAddressModal && (
            <form onSubmit={handleAddAddress} className="border-t border-black/10 pt-6 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-black">Add New Address</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="border border-black/20 p-2.5 text-xs focus:outline-none"
                />
                <input
                  type="tel"
                  required
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border border-black/20 p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <input
                type="text"
                required
                placeholder="Street Address Line 1"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="w-full border border-black/20 p-2.5 text-xs focus:outline-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="border border-black/20 p-2.5 text-xs focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="border border-black/20 p-2.5 text-xs focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="PIN Code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="border border-black/20 p-2.5 text-xs font-mono focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 border border-black/20 text-xs font-bold uppercase tracking-wider hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800"
                >
                  {saving ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
