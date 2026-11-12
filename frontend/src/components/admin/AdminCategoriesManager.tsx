import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Layers, Plus, Save, Trash2 } from 'lucide-react';
import { apiClient } from '../../services/api';
import { Category } from '../../types';
import { ImageUploader } from './ImageUploader';
import { ImageFramer } from './ImageFramer';
import { FramedImg } from '../FramedImg';

/** Lets the owner manage categories (used as the store's collections), including their banner image URL. */
export const AdminCategoriesManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<Category>>>({});
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const res = await apiClient.get('/store/categories');
    setCategories(res.data.categories || []);
    setDrafts({});
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  };

  const update = (id: string, patch: Partial<Category>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const save = async (c: Category) => {
    const d = drafts[c.id];
    if (!d) return;
    setBusy(c.id);
    try {
      await apiClient.put(`/admin/categories/${c.id}`, {
        name: d.name ?? c.name,
        description: d.description ?? c.description ?? '',
        imageUrl: (d.imageUrl ?? c.imageUrl ?? '').trim(),
        sortOrder: Number(d.sortOrder ?? c.sortOrder ?? 0),
        group: (d.group ?? c.group) || 'TOP'
      });
      await load();
      flash(`✓ ${d.name ?? c.name} saved.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(null);
    }
  };

  /** Move a category up/down; the menu, homepage slideshow and story bubbles follow this order. */
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[idx], next[j]] = [next[j], next[idx]];
    const before = categories;
    setCategories(next);
    try {
      await apiClient.put('/admin/categories/reorder', { ids: next.map((c) => c.id) });
    } catch (err: any) {
      setCategories(before);
      alert(err.message);
    }
  };

  const remove = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"? Products in it will stay but become uncategorised.`)) return;
    try {
      await apiClient.delete(`/admin/categories/${c.id}`);
      await load();
      flash('Category deleted.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await apiClient.post('/admin/categories', { name: newName.trim(), sortOrder: categories.length });
      setNewName('');
      await load();
      flash('✓ Category added.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const input = 'w-full border border-black/20 p-2 text-xs focus:border-black focus:outline-none';

  return (
    <div className="bg-white border border-black/10 p-6 shadow-sm space-y-5">
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-[#FF5400]" />
        <h2 className="font-bold uppercase tracking-wider text-sm">Categories / Collections</h2>
      </div>
      <p className="text-xs text-neutral-600">
        Categories are product types (T-Shirts, Hoodies, Cargos…). They appear as chips on collection pages and in the menu under Top / Bottom / Accessories. Paste a Hostinger image URL for each banner.
      </p>
      {msg && <div className="p-2.5 bg-black text-white text-xs">{msg}</div>}

      <div className="space-y-4">
        {categories.map((c, idx) => {
          const d = drafts[c.id] || {};
          const img = (d.imageUrl ?? c.imageUrl) || '';
          return (
            <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 border border-black/10 p-3 items-start">
              <div className="md:col-span-2 flex md:flex-col gap-2">
                <div className="flex md:justify-center gap-1">
                  <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 border border-black/20 hover:bg-black hover:text-white disabled:opacity-25" aria-label={`Move ${c.name} up`} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <span className="w-7 h-7 flex items-center justify-center font-mono font-bold text-[12px]">{idx + 1}</span>
                  <button type="button" onClick={() => move(idx, 1)} disabled={idx === categories.length - 1} className="p-1.5 border border-black/20 hover:bg-black hover:text-white disabled:opacity-25" aria-label={`Move ${c.name} down`} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex-1 md:flex-none aspect-[4/3] bg-neutral-100 overflow-hidden relative">
                  {img && <FramedImg src={img} alt={c.name} className="absolute inset-0" />}
                </div>
              </div>
              <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input className={input} value={d.name ?? c.name} onChange={(e) => update(c.id, { name: e.target.value })} aria-label="Category name" />
                <div className="sm:col-span-2">
                  <ImageUploader single compact value={img ? [img] : []} onChange={(urls) => update(c.id, { imageUrl: urls[0] || '' })} hint="Banner for this product type (collection page, menu, slideshow fallback)." />
                  {img && (
                    <div className="mt-2">
                      <ImageFramer value={img} onChange={(u) => update(c.id, { imageUrl: u })} />
                    </div>
                  )}
                </div>
                <input className={`${input} sm:col-span-2`} value={(d.description ?? c.description) || ''} onChange={(e) => update(c.id, { description: e.target.value })} placeholder="Short description" aria-label="Description" />
                <select className={input} value={(d.group ?? c.group) || 'TOP'} onChange={(e) => update(c.id, { group: e.target.value })} aria-label="Menu group">
                  <option value="TOP">Menu group: Top</option>
                  <option value="BOTTOM">Menu group: Bottom</option>
                  <option value="ACCESSORIES">Menu group: Accessories</option>
                </select>
                <p className="text-[10px] text-neutral-500 font-mono self-center">/collections/{c.slug} • {c._count?.products ?? 0} live products</p>
              </div>
              <div className="md:col-span-1 flex md:flex-col gap-2">
                <button type="button" onClick={() => save(c)} disabled={!drafts[c.id] || busy === c.id} className="p-2 bg-black text-white disabled:opacity-30" title="Save"><Save className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => remove(c)} className="p-2 border border-red-200 text-red-600" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={add} className="flex gap-2 max-w-md">
        <input className={input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name" />
        <button type="submit" className="px-4 bg-black text-white text-xs font-bold uppercase flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
      </form>
    </div>
  );
};
