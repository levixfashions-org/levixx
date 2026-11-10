import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, ExternalLink, X, Copy, Search, Package, Image as ImageIcon, ArrowUp, ArrowDown, Eye, EyeOff, Star
} from 'lucide-react';
import { apiClient, COLOR_GROUPS, COLOR_SWATCHES } from '../../services/api';
import { Category, Product } from '../../types';
import { AdminNav } from '../../components/admin/AdminNav';

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

interface SizeRow {
  size: string;
  stock: string;
}

const emptySizes = (): SizeRow[] => DEFAULT_SIZES.map((size) => ({ size, stock: '0' }));

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [legacyProducts, setLegacyProducts] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [priceINR, setPriceINR] = useState('');
  const [comparePriceINR, setComparePriceINR] = useState('');
  const [description, setDescription] = useState('');
  const [details, setDetails] = useState('');
  const [fabricCare, setFabricCare] = useState('');
  const [fitGuide, setFitGuide] = useState('');
  const [images, setImages] = useState<string[]>(['']);
  const [sizes, setSizes] = useState<SizeRow[]>(emptySizes());
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [colorGroup, setColorGroup] = useState('');
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [allCollections, setAllCollections] = useState<{ id: string; name: string }[]>([]);

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 5000);
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [prodRes, catRes, colRes] = await Promise.all([
        apiClient.get('/admin/products'),
        apiClient.get('/store/categories'),
        apiClient.get('/admin/collections')
      ]);
      setProducts(prodRes.data.products || []);
      setCategories(catRes.data.categories || []);
      setAllCollections((colRes.data.collections || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    try {
      const raw = localStorage.getItem('levix_custom_products');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) setLegacyProducts(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  // One-time import of products that the old admin panel saved only in this browser.
  const importLegacy = async () => {
    if (!window.confirm(`Import ${legacyProducts.length} product(s) saved in this browser into the live store?`)) return;
    setImporting(true);
    let ok = 0;
    const failed: string[] = [];
    for (const lp of legacyProducts) {
      try {
        const imgs = (lp.images || []).map((i: any) => i?.url).filter((u: string) => /^https?:\/\//.test(u || ''));
        const variants = (lp.variants || [])
          .filter((v: any) => v?.size)
          .map((v: any) => ({ size: String(v.size).toUpperCase(), stockQuantity: Math.max(0, Number(v.stockQuantity) || 0), priceDelta: 0 }));
        await apiClient.post('/admin/products', {
          name: lp.name,
          slug: lp.slug || slugify(lp.name || ''),
          description: (lp.description && lp.description.length >= 5 ? lp.description : `${lp.name} by LEVIX.`),
          details: lp.details || null,
          fabricCare: lp.fabricCare || null,
          fitGuide: lp.fitGuide || null,
          basePrice: Number(lp.basePrice) || 0,
          comparePrice: lp.comparePrice ? Number(lp.comparePrice) : null,
          isFeatured: Boolean(lp.isFeatured),
          isActive: lp.isActive !== false,
          categoryName: lp.category?.name || null,
          images: imgs.map((url: string) => ({ url })),
          variants: variants.length ? variants : DEFAULT_SIZES.map((size) => ({ size, stockQuantity: 0, priceDelta: 0 }))
        });
        ok++;
      } catch (err: any) {
        failed.push(`${lp.name}: ${err.message}`);
      }
    }
    setImporting(false);
    if (failed.length === 0) {
      try {
        localStorage.setItem('levix_custom_products_imported', localStorage.getItem('levix_custom_products') || '[]');
        localStorage.removeItem('levix_custom_products');
      } catch {
        /* ignore */
      }
      setLegacyProducts([]);
    }
    flash(`Imported ${ok} product(s).${failed.length ? ` ${failed.length} failed — ${failed.join(' | ')}` : ''}`);
    await loadAll();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setName('');
    setSlug('');
    setSlugTouched(false);
    setCategoryId(categories[0]?.id || '');
    setNewCategoryName('');
    setPriceINR('');
    setComparePriceINR('');
    setDescription('');
    setDetails('');
    setFabricCare('100% cotton. Cold gentle wash inside out. Do not tumble dry.');
    setFitGuide('Oversized fit. Choose your usual size for a relaxed drape, or size down for a closer fit.');
    setImages(['']);
    setSizes(emptySizes());
    setIsFeatured(false);
    setIsActive(true);
    setColorGroup('');
    setCollectionIds([]);
    setFormError(null);
  };

  const fillForm = (p: Product, asCopy = false) => {
    setEditingProduct(asCopy ? null : p);
    setName(asCopy ? `${p.name} (Copy)` : p.name);
    setSlug(asCopy ? `${p.slug}-copy` : p.slug);
    setSlugTouched(true);
    setCategoryId(p.category?.id || '');
    setNewCategoryName('');
    setPriceINR(String(Math.round(p.basePrice / 100)));
    setComparePriceINR(p.comparePrice ? String(Math.round(p.comparePrice / 100)) : '');
    setDescription(p.description || '');
    setDetails(p.details || '');
    setFabricCare(p.fabricCare || '');
    setFitGuide(p.fitGuide || '');
    setImages(p.images.length ? p.images.map((i) => i.url) : ['']);
    setSizes(p.variants.length ? p.variants.map((v) => ({ size: v.size, stock: String(v.stockQuantity) })) : emptySizes());
    setIsFeatured(Boolean(p.isFeatured));
    setIsActive(asCopy ? true : p.isActive);
    setColorGroup(p.colorGroup || '');
    setCollectionIds(p.collectionIds || []);
    setFormError(null);
    setShowModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanImages = images.map((u) => u.trim()).filter(Boolean);
    if (cleanImages.length === 0) return setFormError('Add at least one product image URL.');
    const badUrl = cleanImages.find((u) => !/^https?:\/\//i.test(u));
    if (badUrl) return setFormError(`Image URL must start with https:// — "${badUrl.slice(0, 60)}"`);

    const cleanSizes = sizes
      .map((s) => ({ size: s.size.trim().toUpperCase(), stockQuantity: Math.max(0, parseInt(s.stock, 10) || 0), priceDelta: 0 }))
      .filter((s) => s.size);
    if (cleanSizes.length === 0) return setFormError('Add at least one size.');

    const basePaise = Math.round(parseFloat(priceINR || '0') * 100);
    if (!basePaise || basePaise <= 0) return setFormError('Enter a valid price.');
    const comparePaise = comparePriceINR ? Math.round(parseFloat(comparePriceINR) * 100) : null;

    const payload: any = {
      name: name.trim(),
      slug: slugify(slug || name),
      description: description.trim(),
      details: details.trim() || null,
      fabricCare: fabricCare.trim() || null,
      fitGuide: fitGuide.trim() || null,
      basePrice: basePaise,
      comparePrice: comparePaise && comparePaise > basePaise ? comparePaise : null,
      isFeatured,
      isActive,
      colorGroup: colorGroup || null,
      collectionIds,
      images: cleanImages.map((url) => ({ url })),
      variants: cleanSizes
    };
    if (categoryId === '__new__') {
      if (!newCategoryName.trim()) return setFormError('Enter the new category name.');
      payload.categoryName = newCategoryName.trim();
    } else {
      payload.categoryId = categoryId || null;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await apiClient.put(`/admin/products/${editingProduct.id}`, payload);
        flash(`✓ "${payload.name}" updated.`);
      } else {
        await apiClient.post('/admin/products', payload);
        flash(`✓ "${payload.name}" is now live in the store.`);
      }
      setShowModal(false);
      await loadAll();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await apiClient.put(`/admin/products/${p.id}`, { isActive: !p.isActive });
      flash(p.isActive ? `"${p.name}" hidden from the store.` : `"${p.name}" is visible again.`);
      await loadAll();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      const res = await apiClient.delete(`/admin/products/${p.id}`);
      flash(res.data?.archived ? res.data.message : `✓ "${p.name}" deleted.`);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product.');
    }
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const next = [...images];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setImages(next);
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.slug.includes(q);
      const matchesCat = categoryFilter === 'ALL' || p.category?.id === categoryFilter;
      return matchesQ && matchesCat;
    });
  }, [products, searchTerm, categoryFilter]);

  const inputClass = 'w-full bg-white border border-black/20 p-2.5 text-sm focus:border-black focus:outline-none';
  const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1';

  return (
    <div className="min-h-screen bg-[#EFEFEF] pb-24">
      <AdminNav />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 xl:px-12 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/10 pb-6 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-[#FF5400] font-bold">
              <Package className="w-3.5 h-3.5" />
              <span>CATALOG</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl uppercase tracking-tight text-black mt-1">Products</h1>
            <p className="text-xs text-neutral-600 mt-1">{products.length} products • changes go live instantly for every customer.</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-5 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {actionMsg && <div className="p-3 bg-black text-white text-xs font-semibold">{actionMsg}</div>}
        {legacyProducts.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-300 text-yellow-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              Found <b>{legacyProducts.length}</b> product(s) that the old admin panel saved only in this browser (customers could not see them). Import them into the live store?
            </span>
            <button onClick={importLegacy} disabled={importing} className="px-4 py-2 bg-black text-white font-bold uppercase tracking-wider disabled:opacity-50 whitespace-nowrap">
              {importing ? 'Importing...' : 'Import Now'}
            </button>
          </div>
        )}
        {loadError && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold flex items-center justify-between">
            <span>{loadError}</span>
            <button onClick={loadAll} className="underline">Retry</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-white border border-black/15 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white border border-black/15 px-3 py-2.5 text-sm">
            <option value="ALL">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-black/10 shadow-sm overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
              <tr>
                <th className="py-3 px-4 text-left">Image</th>
                <th className="py-3 px-4 text-left">Product</th>
                <th className="py-3 px-4 text-left">Category</th>
                <th className="py-3 px-4 text-left">Price</th>
                <th className="py-3 px-4 text-left">Stock</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center text-neutral-500 font-mono uppercase">Loading catalog...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-neutral-500">
                    {products.length === 0 ? 'No products yet. Click "Add Product" to publish your first drop.' : 'No products match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const totalStock = p.variants.reduce((a, v) => a + v.stockQuantity, 0);
                  return (
                    <tr key={p.id} className={`hover:bg-neutral-50/60 ${!p.isActive ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="w-12 h-16 bg-neutral-100 overflow-hidden flex items-center justify-center">
                          {p.images[0] ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon className="w-4 h-4 text-neutral-400" />}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-black">{p.name}</p>
                        <p className="text-[11px] text-neutral-500 font-mono">/{p.slug}</p>
                      </td>
                      <td className="py-3 px-4 text-neutral-700">{p.category?.name || '—'}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold">RS. {(p.basePrice / 100).toLocaleString('en-IN')}</span>
                        {p.comparePrice ? <span className="block text-[11px] text-neutral-400 line-through">RS. {(p.comparePrice / 100).toLocaleString('en-IN')}</span> : null}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${totalStock === 0 ? 'text-red-600' : totalStock <= 10 ? 'text-yellow-700' : 'text-black'}`}>{totalStock}</span>
                        <span className="block text-[10px] text-neutral-500 font-mono">{p.variants.map((v) => `${v.size}:${v.stockQuantity}`).join(' ')}</span>
                      </td>
                      <td className="py-3 px-4 space-y-1">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-700'}`}>
                          {p.isActive ? 'Live' : 'Hidden'}
                        </span>
                        {p.isFeatured && <span className="flex items-center gap-1 text-[10px] text-[#FF5400] font-bold uppercase"><Star className="w-3 h-3" /> Featured</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => fillForm(p)} title="Edit" className="p-2 hover:bg-neutral-100"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => fillForm(p, true)} title="Duplicate" className="p-2 hover:bg-neutral-100"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleToggleActive(p)} title={p.isActive ? 'Hide from store' : 'Show in store'} className="p-2 hover:bg-neutral-100">
                            {p.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {p.isActive && (
                            <Link to={`/products/${p.slug}`} target="_blank" title="View in store" className="p-2 hover:bg-neutral-100"><ExternalLink className="w-3.5 h-3.5" /></Link>
                          )}
                          <button onClick={() => handleDelete(p)} title="Delete" className="p-2 hover:bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && !saving && setShowModal(false)}>
          <form onSubmit={handleSave} className="bg-white w-full max-w-3xl my-4 shadow-2xl border border-black/10">
            <div className="flex items-center justify-between p-5 border-b border-black/10 sticky top-0 bg-white z-10">
              <h2 className="font-display font-black text-xl uppercase tracking-tight">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 hover:bg-neutral-100" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-6">
              {formError && <div role="alert" className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">{formError}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Product Name *</label>
                  <input required value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} className={inputClass} placeholder="e.g. Signature Overlength Heavyweight Tee" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>URL Handle</label>
                  <div className="flex items-center border border-black/20 bg-neutral-50">
                    <span className="px-2 text-[11px] text-neutral-500 font-mono whitespace-nowrap">/products/</span>
                    <input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} className="flex-1 bg-white p-2.5 text-sm font-mono focus:outline-none" placeholder="auto-generated" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__new__">+ New category…</option>
                  </select>
                  {categoryId === '__new__' && (
                    <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className={`${inputClass} mt-2`} placeholder="New category name" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Price (₹) *</label>
                    <input required type="number" min="1" step="1" value={priceINR} onChange={(e) => setPriceINR(e.target.value)} className={`${inputClass} font-mono`} placeholder="2999" />
                  </div>
                  <div>
                    <label className={labelClass}>MRP / Compare (₹)</label>
                    <input type="number" min="0" step="1" value={comparePriceINR} onChange={(e) => setComparePriceINR(e.target.value)} className={`${inputClass} font-mono`} placeholder="optional" />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <label className={labelClass}>Product Images (URLs) *</label>
                <p className="text-[11px] text-neutral-500">
                  Paste the full link of each image hosted on Hostinger (e.g. https://thelevix.shop/images/tee-front.jpg). The first image is the cover; the second shows on hover.
                </p>
                <div className="space-y-2">
                  {images.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-12 h-14 bg-neutral-100 border border-black/10 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {/^https?:\/\//.test(url.trim()) ? <img src={url.trim()} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-neutral-400" />}
                      </div>
                      <input
                        value={url}
                        onChange={(e) => setImages(images.map((u, i) => (i === idx ? e.target.value : u)))}
                        className={`${inputClass} font-mono text-xs`}
                        placeholder={idx === 0 ? 'Cover image URL (https://...)' : 'Additional image URL'}
                      />
                      <div className="flex flex-col">
                        <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="p-1 disabled:opacity-20" aria-label="Move up"><ArrowUp className="w-3 h-3" /></button>
                        <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} className="p-1 disabled:opacity-20" aria-label="Move down"><ArrowDown className="w-3 h-3" /></button>
                      </div>
                      <button type="button" onClick={() => setImages(images.length > 1 ? images.filter((_, i) => i !== idx) : [''])} className="p-2 text-red-600 hover:bg-red-50" aria-label="Remove image"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
                {images.length < 10 && (
                  <button type="button" onClick={() => setImages([...images, ''])} className="text-[11px] font-bold uppercase tracking-wider underline">+ Add another image</button>
                )}
              </div>

              {/* Sizes */}
              <div className="space-y-2">
                <label className={labelClass}>Sizes & Stock *</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {sizes.map((row, idx) => (
                    <div key={idx} className="border border-black/15 p-2 space-y-1 relative">
                      <input
                        value={row.size}
                        onChange={(e) => setSizes(sizes.map((r, i) => (i === idx ? { ...r, size: e.target.value.toUpperCase() } : r)))}
                        className="w-full text-center font-bold text-sm uppercase bg-neutral-50 p-1 focus:outline-none"
                        maxLength={6}
                        aria-label="Size"
                      />
                      <input
                        type="number"
                        min="0"
                        value={row.stock}
                        onChange={(e) => setSizes(sizes.map((r, i) => (i === idx ? { ...r, stock: e.target.value } : r)))}
                        className="w-full text-center font-mono text-sm border border-black/10 p-1 focus:outline-none focus:border-black"
                        aria-label={`Stock for ${row.size}`}
                      />
                      <button type="button" onClick={() => setSizes(sizes.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-white border border-black/20 rounded-full p-0.5" aria-label="Remove size"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setSizes([...sizes, { size: '', stock: '0' }])} className="text-[11px] font-bold uppercase tracking-wider underline">+ Add size</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Description *</label>
                  <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="What makes this piece special..." />
                </div>
                <div>
                  <label className={labelClass}>Product Details</label>
                  <textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} className={inputClass} placeholder="GSM, print type, neck, finishing..." />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Fabric & Care</label>
                    <textarea rows={3} value={fabricCare} onChange={(e) => setFabricCare(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Fit Guide</label>
                    <textarea rows={3} value={fitGuide} onChange={(e) => setFitGuide(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Colour (for "Shop by colour")</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setColorGroup('')} className={`px-3 py-1 rounded-full border text-[11px] ${!colorGroup ? 'border-black bg-black text-white' : 'border-black/15'}`}>None</button>
                    {COLOR_GROUPS.map((c) => (
                      <button key={c} type="button" onClick={() => setColorGroup(c)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] ${colorGroup === c ? 'border-black ring-1 ring-black' : 'border-black/15'}`}>
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: COLOR_SWATCHES[c] }} />
                        {c.charAt(0) + c.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Collections</label>
                  {allCollections.length === 0 ? (
                    <p className="text-[11px] text-neutral-500">No collections yet — create them in "Collections & Home".</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {allCollections.map((c) => {
                        const on = collectionIds.includes(c.id);
                        return (
                          <button key={c.id} type="button" onClick={() => setCollectionIds(on ? collectionIds.filter((x) => x !== c.id) : [...collectionIds, c.id])} className={`px-3 py-1 rounded-full border text-[11px] ${on ? 'border-black bg-black text-white' : 'border-black/15'}`}>
                            {on ? '✓ ' : '+ '}{c.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-black w-4 h-4" /> Visible in store
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-black w-4 h-4" /> Feature on homepage
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-black/10 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 border border-black/20 text-xs font-bold uppercase tracking-wider">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest disabled:opacity-50">
                {saving ? 'Saving...' : editingProduct ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
