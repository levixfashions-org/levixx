import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Edit2, ExternalLink, Image as ImageIcon, Layers, Plus, Search, Trash2, X } from 'lucide-react';
import { apiClient } from '../../services/api';
import { Product } from '../../types';
import { AdminNav } from '../../components/admin/AdminNav';
import { ImageUploader } from '../../components/admin/ImageUploader';

interface AdminCollection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  mobileBannerUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  homeLayout: 'NONE' | 'CAROUSEL' | 'GRID';
  showInGallery: boolean;
  showInMenu: boolean;
  productIds: string[];
}

const LAYOUTS = [
  { value: 'NONE', label: 'Not on homepage' },
  { value: 'CAROUSEL', label: 'Homepage carousel (swipe row)' },
  { value: 'GRID', label: 'Homepage grid (2 rows of 4)' }
];

const empty = (): AdminCollection => ({
  id: '',
  name: '',
  slug: '',
  description: '',
  bannerImageUrl: '',
  mobileBannerUrl: '',
  isActive: true,
  sortOrder: 0,
  homeLayout: 'CAROUSEL',
  showInGallery: false,
  showInMenu: true,
  productIds: []
});

/**
 * Curated collections = the building blocks of the homepage:
 *  - "Homepage carousel / grid" sections (in sort order)
 *  - the full-width banner slideshow ("Show in banner slideshow")
 *  - the Collections menu
 */
export const AdminCollectionsPage: React.FC = () => {
  const [collections, setCollections] = useState<AdminCollection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminCollection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([apiClient.get('/admin/collections'), apiClient.get('/admin/products')]);
      setCollections(c.data.collections || []);
      setProducts(p.data.products || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  };
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: editing.name.trim(),
      slug: editing.slug.trim() || undefined,
      description: editing.description || '',
      bannerImageUrl: (editing.bannerImageUrl || '').trim(),
      mobileBannerUrl: (editing.mobileBannerUrl || '').trim(),
      isActive: editing.isActive,
      sortOrder: Number(editing.sortOrder) || 0,
      homeLayout: editing.homeLayout,
      showInGallery: editing.showInGallery,
      showInMenu: editing.showInMenu,
      productIds: editing.productIds
    };
    if (payload.showInGallery && !payload.bannerImageUrl) {
      setSaving(false);
      setError('Add a banner image URL to show this collection in the banner slideshow.');
      return;
    }
    try {
      if (editing.id) await apiClient.put(`/admin/collections/${editing.id}`, payload);
      else await apiClient.post('/admin/collections', payload);
      setEditing(null);
      flash(`✓ "${payload.name}" saved — the homepage updates within a few seconds.`);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: AdminCollection) => {
    if (!window.confirm(`Delete collection "${c.name}"? Products are not deleted.`)) return;
    try {
      await apiClient.delete(`/admin/collections/${c.id}`);
      flash('Collection deleted.');
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const move = async (c: AdminCollection, dir: -1 | 1) => {
    const list = [...collections];
    const i = list.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setCollections(list);
    try {
      await Promise.all(list.map((x, idx) => (x.sortOrder !== idx ? apiClient.put(`/admin/collections/${x.id}`, { sortOrder: idx }) : null)));
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleProduct = (id: string) => {
    if (!editing) return;
    const has = editing.productIds.includes(id);
    setEditing({ ...editing, productIds: has ? editing.productIds.filter((x) => x !== id) : [...editing.productIds, id] });
  };
  const moveProduct = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const ids = [...editing.productIds];
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    setEditing({ ...editing, productIds: ids });
  };

  const input = 'w-full bg-white border border-black/20 p-2.5 text-sm focus:border-black focus:outline-none';
  const label = 'block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1';
  const pickerResults = products.filter(
    (p) => !pickerQuery.trim() || p.name.toLowerCase().includes(pickerQuery.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#EFEFEF] pb-24">
      <AdminNav />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>HOMEPAGE BUILDER</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black mt-1">Collections & Home</h1>
            <p className="text-xs text-neutral-600 mt-1 max-w-2xl">
              Each collection can be a homepage carousel or grid, a slide in the full-width banner slideshow, and a link in the Collections menu.
              Order here = order on the homepage. Hero image & texts are in Store Settings.
            </p>
          </div>
          <button onClick={() => { setError(null); setEditing(empty()); }} className="px-5 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-4 h-4" /> New collection
          </button>
        </div>

        {msg && <div className="p-3 bg-black text-white text-xs font-semibold">{msg}</div>}
        {error && !editing && <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs">{error}</div>}

        <div className="bg-white border border-black/10 divide-y divide-black/5">
          {loading ? (
            <p className="p-10 text-center text-xs text-neutral-500 font-mono uppercase">Loading…</p>
          ) : collections.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-600 space-y-2">
              <p>No collections yet.</p>
              <p className="text-xs">Example: create "Winter Drop" → layout "Homepage carousel" → tick "Show in banner slideshow" → pick its products.</p>
            </div>
          ) : (
            collections.map((c, idx) => (
              <div key={c.id} className={`flex items-center gap-4 p-4 ${!c.isActive ? 'opacity-50' : ''}`}>
                <div className="flex flex-col">
                  <button onClick={() => move(c, -1)} disabled={idx === 0} className="p-1 disabled:opacity-20" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => move(c, 1)} disabled={idx === collections.length - 1} className="p-1 disabled:opacity-20" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="w-24 h-14 bg-neutral-100 overflow-hidden flex items-center justify-center shrink-0">
                  {c.bannerImageUrl ? <img src={c.bannerImageUrl} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-neutral-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-[11px] text-neutral-500 font-mono">/collections/{c.slug} • {c.productIds.length} products</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px] font-bold uppercase">
                    {c.homeLayout !== 'NONE' && <span className="px-2 py-0.5 bg-black text-white">{c.homeLayout === 'GRID' ? 'Home grid' : 'Home carousel'}</span>}
                    {c.showInGallery && <span className="px-2 py-0.5 bg-[#FF5400] text-white">Banner slide</span>}
                    {c.showInMenu && <span className="px-2 py-0.5 bg-neutral-200">In menu</span>}
                    {!c.isActive && <span className="px-2 py-0.5 bg-neutral-300">Hidden</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Link to={`/admin/products?new=1&collection=${c.id}`} className="px-3 py-2 bg-black text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" title="Add a new product to this collection">
                    <Plus className="w-3.5 h-3.5" /> Add product
                  </Link>
                  <Link to={`/admin/products?collection=${c.id}`} className="px-3 py-2 border border-black/20 text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-100" title="See products in this collection">
                    View products
                  </Link>
                  {c.isActive && <Link to={`/collections/${c.slug}`} target="_blank" className="p-2 hover:bg-neutral-100" title="View"><ExternalLink className="w-4 h-4" /></Link>}
                  <button onClick={() => { setError(null); setEditing({ ...c, description: c.description || '', bannerImageUrl: c.bannerImageUrl || '', mobileBannerUrl: c.mobileBannerUrl || '' }); }} className="p-2 hover:bg-neutral-100" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => remove(c)} className="p-2 hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && !saving && setEditing(null)}>
          <form onSubmit={save} className="bg-white w-full max-w-4xl my-4 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-black/10 sticky top-0 bg-white z-10">
              <h2 className="font-black text-xl uppercase">{editing.id ? 'Edit collection' : 'New collection'}</h2>
              <button type="button" onClick={() => setEditing(null)} className="p-1.5" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              {error && <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Name *</label>
                  <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={input} placeholder="e.g. Winter Drop 2026" />
                </div>
                <div>
                  <label className={label}>URL handle</label>
                  <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} className={`${input} font-mono`} placeholder="auto from name" />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Short description</label>
                  <input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={input} />
                </div>
                <div>
                  <ImageUploader
                    single
                    label="Banner image (desktop, landscape)"
                    value={editing.bannerImageUrl ? [editing.bannerImageUrl] : []}
                    onChange={(urls) => setEditing({ ...editing, bannerImageUrl: urls[0] || '' })}
                    hint="Used for the homepage banner slideshow & collection page. Wide photo works best."
                  />
                </div>
                <div>
                  <ImageUploader
                    single
                    label="Banner image (mobile, optional)"
                    value={editing.mobileBannerUrl ? [editing.mobileBannerUrl] : []}
                    onChange={(urls) => setEditing({ ...editing, mobileBannerUrl: urls[0] || '' })}
                    hint="Portrait photo for phones. If empty, the desktop banner is used."
                  />
                </div>
                <div>
                  <label className={label}>Homepage layout</label>
                  <select value={editing.homeLayout} onChange={(e) => setEditing({ ...editing, homeLayout: e.target.value as any })} className={input}>
                    {LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-2 text-xs font-semibold">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editing.showInGallery} onChange={(e) => setEditing({ ...editing, showInGallery: e.target.checked })} className="accent-black w-4 h-4" /> Show in homepage banner slideshow</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editing.showInMenu} onChange={(e) => setEditing({ ...editing, showInMenu: e.target.checked })} className="accent-black w-4 h-4" /> Show in Collections menu</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} className="accent-black w-4 h-4" /> Visible on the site</label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Products in this collection ({editing.productIds.length}) — order shown on site</label>
                  <div className="border border-black/15 max-h-80 overflow-y-auto divide-y divide-black/5">
                    {editing.productIds.length === 0 && <p className="p-4 text-xs text-neutral-500">Pick products from the list on the right.</p>}
                    {editing.productIds.map((id, i) => {
                      const p = productById.get(id);
                      if (!p) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 p-2 text-xs">
                          <div className="flex flex-col">
                            <button type="button" onClick={() => moveProduct(i, -1)} disabled={i === 0} className="disabled:opacity-20"><ArrowUp className="w-3 h-3" /></button>
                            <button type="button" onClick={() => moveProduct(i, 1)} disabled={i === editing.productIds.length - 1} className="disabled:opacity-20"><ArrowDown className="w-3 h-3" /></button>
                          </div>
                          <div className="w-8 h-10 bg-neutral-100 overflow-hidden shrink-0">{p.images[0] && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}</div>
                          <span className="flex-1 truncate">{p.name}</span>
                          <button type="button" onClick={() => toggleProduct(id)} className="text-red-600 p-1"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={label}>Add products</label>
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="Search products" className="w-full border border-black/15 pl-8 pr-2 py-2 text-xs focus:outline-none focus:border-black" />
                  </div>
                  <div className="border border-black/15 max-h-72 overflow-y-auto divide-y divide-black/5">
                    {pickerResults.map((p) => {
                      const selected = editing.productIds.includes(p.id);
                      return (
                        <button type="button" key={p.id} onClick={() => toggleProduct(p.id)} className={`w-full flex items-center gap-2 p-2 text-xs text-left hover:bg-neutral-50 ${selected ? 'bg-neutral-100' : ''}`}>
                          <div className="w-8 h-10 bg-neutral-100 overflow-hidden shrink-0">{p.images[0] && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}</div>
                          <span className="flex-1 truncate">{p.name}{!p.isActive && ' (hidden)'}</span>
                          <span className={`text-[10px] font-bold ${selected ? 'text-green-700' : 'text-neutral-400'}`}>{selected ? 'ADDED' : '+ ADD'}</span>
                        </button>
                      );
                    })}
                    {pickerResults.length === 0 && <p className="p-4 text-xs text-neutral-500">No products found. Add products first in Products.</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-black/10 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setEditing(null)} className="px-5 py-3 border border-black/20 text-xs font-bold uppercase">Cancel</button>
              <button disabled={saving} className="px-6 py-3 bg-black text-white text-xs font-bold uppercase disabled:opacity-50">{saving ? 'Saving…' : 'Save collection'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
