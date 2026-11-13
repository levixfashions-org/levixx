import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, ExternalLink, X, Copy, Search, Package, Image as ImageIcon, Eye, EyeOff, Star, Palette, ChevronUp, ChevronDown, ChevronsUp, Pin, TrendingUp } from 'lucide-react';
import { apiClient, COLOR_GROUPS, COLOR_SWATCHES } from '../../services/api';
import { Category, Gender, Product } from '../../types';
import { AdminNav } from '../../components/admin/AdminNav';
import { ImageUploader } from '../../components/admin/ImageUploader';

const SIZE_PRESETS: { label: string; sizes: string[] }[] = [
  { label: 'S – XXL', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
  { label: 'XS – XXL', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { label: 'Waist 28 – 36', sizes: ['28', '30', '32', '34', '36'] },
  { label: 'Free size', sizes: ['OS'] }
];

const QUICK_COLOURS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#111111' },
  { name: 'White', hex: '#F5F5F5' },
  { name: 'Grey', hex: '#8A8A8A' },
  { name: 'Navy', hex: '#1B2A4A' },
  { name: 'Brown', hex: '#6B4226' },
  { name: 'Olive', hex: '#5B6331' },
  { name: 'Beige', hex: '#D8C8A8' },
  { name: 'Red', hex: '#B3121F' }
];

interface ColourRow {
  key: string;
  name: string;
  hex: string;
  images: string[];
  stock: Record<string, string>;
}

const GENDERS: { value: Gender; label: string; hint: string }[] = [
  { value: 'MEN', label: 'Men', hint: 'Shows in the Men section' },
  { value: 'WOMEN', label: 'Women', hint: 'Shows in the Women section' },
  { value: 'UNISEX', label: 'Unisex', hint: 'Shows in both Men & Women' }
];
const genderLabel = (g?: string | null) => (g === 'MEN' ? 'Men' : g === 'WOMEN' ? 'Women' : 'Unisex');
const asGender = (v: string | null): Gender | null => (v === 'MEN' || v === 'WOMEN' || v === 'UNISEX' ? v : null);

const newKey = () => Math.random().toString(36).slice(2);
const blankColour = (sizes: string[], name = '', hex = '#111111'): ColourRow => ({
  key: newKey(),
  name,
  hex,
  images: [],
  stock: Object.fromEntries(sizes.map((s) => [s, '0']))
});

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Turns a saved product back into editor state (sizes + colour rows with their photos and stock). */
function toEditor(p: Product): { sizes: string[]; colours: ColourRow[] } {
  const sizes: string[] = [];
  const colourOrder: string[] = [];
  const hexByColour: Record<string, string> = {};
  for (const v of p.variants) {
    if (!sizes.includes(v.size)) sizes.push(v.size);
    const c = v.color || '';
    if (!colourOrder.includes(c)) colourOrder.push(c);
    if (v.colorHex) hexByColour[c] = v.colorHex;
  }
  if (!colourOrder.length) colourOrder.push('');
  const colours = colourOrder.map((c, idx) => {
    const imgs = p.images
      .filter((im) => (im.color || '') === c || (!im.color && idx === 0 && c !== ''))
      .map((im) => im.url);
    const stock: Record<string, string> = {};
    sizes.forEach((s) => {
      const v = p.variants.find((x) => (x.color || '') === c && x.size === s);
      stock[s] = v ? String(v.stockQuantity) : '0';
    });
    return { key: newKey(), name: c, hex: hexByColour[c] || '#111111', images: imgs, stock };
  });
  // Single-colour product: all photos belong to it.
  if (colours.length === 1) colours[0].images = p.images.map((im) => im.url);
  return { sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL', 'XXL'], colours };
}

export const AdminProductsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCollections, setAllCollections] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | Gender>(asGender((params.get('gender') || '').toUpperCase()) || 'ALL');
  const [gender, setGender] = useState<Gender>('UNISEX');
  const [collectionFilter, setCollectionFilter] = useState(params.get('collection') || 'ALL');
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
  const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL']);
  const [newSize, setNewSize] = useState('');
  const [colours, setColours] = useState<ColourRow[]>([blankColour(['S', 'M', 'L', 'XL', 'XXL'])]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [colorGroup, setColorGroup] = useState('');
  const [collectionIds, setCollectionIds] = useState<string[]>([]);

  const multiColour = colours.length > 1;

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 6000);
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
      return catRes.data.categories || [];
    } catch (err: any) {
      setLoadError(err.message || 'Failed to load products');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll().then((cats) => {
      // Opened from "Collections → Add product": start a new product already in that collection.
      if (params.get('new') === '1') {
        resetForm(cats);
        const col = params.get('collection');
        if (col) setCollectionIds([col]);
        const g = asGender((params.get('gender') || '').toUpperCase());
        if (g) setGender(g);
        setShowModal(true);
        const next = new URLSearchParams(params);
        next.delete('new');
        setParams(next, { replace: true });
      }
    });
    try {
      const raw = localStorage.getItem('levix_custom_products');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed) && parsed.length > 0) setLegacyProducts(parsed);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          description: lp.description && lp.description.length >= 5 ? lp.description : `${lp.name} by LEVIX.`,
          details: lp.details || null,
          fabricCare: lp.fabricCare || null,
          fitGuide: lp.fitGuide || null,
          basePrice: Number(lp.basePrice) || 0,
          comparePrice: lp.comparePrice ? Number(lp.comparePrice) : null,
          isFeatured: Boolean(lp.isFeatured),
          isActive: lp.isActive !== false,
          categoryName: lp.category?.name || null,
          images: imgs.map((url: string) => ({ url })),
          variants: variants.length ? variants : ['S', 'M', 'L', 'XL', 'XXL'].map((size) => ({ size, stockQuantity: 0, priceDelta: 0 }))
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

  const resetForm = (cats: Category[] = categories) => {
    const defaultSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    setEditingProduct(null);
    setName('');
    setSlug('');
    setSlugTouched(false);
    setCategoryId(cats[0]?.id || '');
    setNewCategoryName('');
    setPriceINR('');
    setComparePriceINR('');
    setDescription('');
    setDetails('');
    setFabricCare('100% cotton. Cold gentle wash inside out. Do not tumble dry.');
    setFitGuide('Oversized fit. Choose your usual size for a relaxed drape, or size down for a closer fit.');
    setSizes(defaultSizes);
    setNewSize('');
    setColours([blankColour(defaultSizes)]);
    setIsFeatured(false);
    setIsActive(true);
    setColorGroup('');
    setGender(genderFilter !== 'ALL' ? genderFilter : 'UNISEX');
    setCollectionIds(collectionFilter !== 'ALL' ? [collectionFilter] : []);
    setFormError(null);
  };

  const fillForm = (p: Product, asCopy = false) => {
    const ed = toEditor(p);
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
    setSizes(ed.sizes);
    setNewSize('');
    setColours(ed.colours);
    setIsFeatured(Boolean(p.isFeatured));
    setIsActive(asCopy ? true : p.isActive);
    setColorGroup(p.colorGroup || '');
    setGender(asGender(p.gender || null) || 'UNISEX');
    setCollectionIds(p.collectionIds || []);
    setFormError(null);
    setShowModal(true);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  /* ---------- sizes & colours helpers ---------- */
  const applySizes = (next: string[]) => {
    const clean = [...new Set(next.map((s) => s.trim().toUpperCase()).filter(Boolean))];
    setSizes(clean);
    setColours((cur) => cur.map((c) => ({ ...c, stock: Object.fromEntries(clean.map((s) => [s, c.stock[s] ?? '0'])) })));
  };
  const addSize = () => {
    if (newSize.trim()) applySizes([...sizes, newSize]);
    setNewSize('');
  };
  const updateColour = (key: string, patch: Partial<ColourRow>) => setColours((cur) => cur.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const addColour = (preset?: { name: string; hex: string }) => {
    // When a second colour is added, the first colour's name box appears so it can be named too.
    setColours((cur) => [...cur, blankColour(sizes, preset?.name || '', preset?.hex || '#8A8A8A')]);
  };
  const removeColour = (key: string) =>
    setColours((cur) => {
      const next = cur.filter((c) => c.key !== key);
      return next.length ? next : [blankColour(sizes)];
    });

  const totalStockOf = (c: ColourRow) => sizes.reduce((a, s) => a + (parseInt(c.stock[s], 10) || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!sizes.length) return setFormError('Add at least one size.');
    if (multiColour) {
      const names = colours.map((c) => c.name.trim());
      if (names.some((n) => !n)) return setFormError('Give every colour a name (e.g. Black, Off-White).');
      if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) return setFormError('Two colours have the same name.');
      const noPhotos = colours.find((c) => c.images.length === 0);
      if (noPhotos) return setFormError(`Add at least one photo for the colour "${noPhotos.name}".`);
    } else if (colours[0].images.length === 0) {
      return setFormError('Add at least one product photo.');
    }

    const basePaise = Math.round(parseFloat(priceINR || '0') * 100);
    if (!basePaise || basePaise <= 0) return setFormError('Enter a valid price.');
    const comparePaise = comparePriceINR ? Math.round(parseFloat(comparePriceINR) * 100) : null;

    const images = colours.flatMap((c) => c.images.map((url) => ({ url, color: multiColour || c.name.trim() ? c.name.trim() || null : null })));
    const variants = colours.flatMap((c) =>
      sizes.map((size) => ({
        size,
        color: multiColour || c.name.trim() ? c.name.trim() || null : null,
        colorHex: multiColour || c.name.trim() ? c.hex : null,
        stockQuantity: Math.max(0, parseInt(c.stock[size], 10) || 0),
        priceDelta: 0
      }))
    );

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
      gender,
      collectionIds,
      images,
      variants
    };
    if (categoryId === '__new__') {
      if (!newCategoryName.trim()) return setFormError('Enter the new product type name.');
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

  /** Pinned products stay on top of their category even when it auto-sorts by best sellers. */
  const handleTogglePin = async (p: Product) => {
    const next = !p.pinned;
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, pinned: next } : x)));
    try {
      await apiClient.put(`/admin/products/${p.id}/pin`, { pinned: next });
      flash(next ? `📌 "${p.name}" pinned to the top of its category.` : `"${p.name}" unpinned — best-seller order applies.`);
    } catch (err: any) {
      setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, pinned: !next } : x)));
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

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQ = !q || p.name.toLowerCase().includes(q) || p.slug.includes(q);
      const matchesCat = categoryFilter === 'ALL' || p.category?.id === categoryFilter;
      const matchesCol = collectionFilter === 'ALL' || (p.collectionIds || []).includes(collectionFilter);
      const matchesGender = genderFilter === 'ALL' || (p.gender || 'UNISEX') === genderFilter;
      return matchesQ && matchesCat && matchesCol && matchesGender;
    });
  }, [products, searchTerm, categoryFilter, collectionFilter, genderFilter]);
  /**
   * Move a product to a new place in the list that is currently shown (1 = first).
   * With filters on, only the shown products swap places among themselves; everything else keeps its spot.
   */
  const moveProduct = async (id: string, toIndex: number) => {
    const shown = filtered.map((p) => p.id);
    const from = shown.indexOf(id);
    const to = Math.max(0, Math.min(shown.length - 1, toIndex));
    if (from < 0 || from === to) return;
    shown.splice(to, 0, shown.splice(from, 1)[0]);
    const shownSet = new Set(shown);
    const byId = new Map(products.map((p) => [p.id, p]));
    let k = 0;
    const next = products.map((p) => (shownSet.has(p.id) ? byId.get(shown[k++])! : p));
    const before = products;
    setProducts(next);
    setActionMsg(null);
    try {
      await apiClient.put('/admin/products/reorder', { ids: next.map((p) => p.id) });
    } catch (err: any) {
      setProducts(before);
      setActionMsg(err.message || 'Could not save the new order. Please try again.');
    }
  };

  const genderCount = (g: Gender) => products.filter((p) => (p.gender || 'UNISEX') === g).length;

  const colourNamesOf = (p: Product) => [...new Set(p.variants.map((v) => v.color).filter(Boolean))] as string[];

  const inputClass = 'w-full bg-white border border-black/20 p-2.5 text-sm focus:border-black focus:outline-none';
  const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1';
  const sectionTitle = 'text-[12px] font-black uppercase tracking-wider text-black flex items-center gap-2';

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
          <button onClick={openAddModal} className="px-5 py-3 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 flex items-center gap-2 shadow-md">
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
            <button onClick={() => loadAll()} className="underline">Retry</button>
          </div>
        )}

        <p className="text-[11px] text-neutral-600 bg-white border border-black/10 px-3 py-2">
          <b>Product order:</b> use the ▲ ▼ arrows, the ⏫ button (move to No. 1), or type a position number and press Enter. The shop shows products in this order and updates instantly. Tip: pick a category or collection filter first to arrange just that group.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'MEN', 'WOMEN', 'UNISEX'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGenderFilter(g)}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider border ${genderFilter === g ? 'bg-black text-white border-black' : 'bg-white border-black/15 hover:border-black'}`}
            >
              {g === 'ALL' ? `All (${products.length})` : `${genderLabel(g)} (${genderCount(g)})`}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search products..." className="w-full bg-white border border-black/15 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-black" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white border border-black/15 px-3 py-2.5 text-sm">
            <option value="ALL">All product types</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={collectionFilter} onChange={(e) => setCollectionFilter(e.target.value)} className="bg-white border border-black/15 px-3 py-2.5 text-sm">
            <option value="ALL">All collections</option>
            {allCollections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="bg-white border border-black/10 shadow-sm overflow-x-auto">
          <table className="w-full text-xs min-w-[940px]">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500 font-mono">
              <tr>
                <th className="py-3 px-3 text-left">Position</th>
                <th className="py-3 px-4 text-left">Image</th>
                <th className="py-3 px-4 text-left">Product</th>
                <th className="py-3 px-4 text-left">Type / Collections</th>
                <th className="py-3 px-4 text-left">Price</th>
                <th className="py-3 px-4 text-left">Stock</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center text-neutral-500 font-mono uppercase">Loading catalog...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-500">
                    {products.length === 0 ? 'No products yet. Click "Add Product" to publish your first drop.' : 'No products match these filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p, idx) => {
                  const totalStock = p.variants.reduce((a, v) => a + v.stockQuantity, 0);
                  const cols = colourNamesOf(p);
                  const colNames = (p.collectionIds || []).map((id) => allCollections.find((c) => c.id === id)?.name).filter(Boolean);
                  return (
                    <tr key={p.id} className={`hover:bg-neutral-50/60 ${!p.isActive ? 'opacity-60' : ''}`}>
                      <td className="py-3 px-3 align-middle">
                        <div className="flex items-center gap-1.5">
                          <input
                            key={`${p.id}-${idx}`}
                            type="number"
                            min={1}
                            max={filtered.length}
                            defaultValue={idx + 1}
                            aria-label={`Position of ${p.name}`}
                            title="Type a position number and press Enter"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            onBlur={(e) => {
                              const n = parseInt(e.target.value, 10);
                              if (Number.isFinite(n) && n !== idx + 1) moveProduct(p.id, n - 1);
                              else e.target.value = String(idx + 1);
                            }}
                            className="w-11 h-9 border border-black/20 text-center font-mono font-bold text-[12px] focus:border-black focus:outline-none"
                          />
                          <div className="flex flex-col gap-0.5">
                            <button type="button" disabled={idx === 0} onClick={() => moveProduct(p.id, idx - 1)} aria-label={`Move ${p.name} up`} title="Move up" className="w-8 h-[17px] flex items-center justify-center border border-black/20 bg-white hover:bg-black hover:text-white disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-black">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" disabled={idx === filtered.length - 1} onClick={() => moveProduct(p.id, idx + 1)} aria-label={`Move ${p.name} down`} title="Move down" className="w-8 h-[17px] flex items-center justify-center border border-black/20 bg-white hover:bg-black hover:text-white disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-black">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button type="button" disabled={idx === 0} onClick={() => moveProduct(p.id, 0)} aria-label={`Move ${p.name} to the top`} title="Move to top (No. 1)" className="w-8 h-9 flex items-center justify-center border border-black/20 bg-white hover:bg-black hover:text-white disabled:opacity-25 disabled:hover:bg-white disabled:hover:text-black">
                            <ChevronsUp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-12 h-16 bg-neutral-100 overflow-hidden flex items-center justify-center">
                          {p.images[0] ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <ImageIcon className="w-4 h-4 text-neutral-400" />}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-black">{p.name}</p>
                        <p className="text-[11px] text-neutral-500 font-mono">/{p.slug}</p>
                        {cols.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {p.variants.filter((v, i, arr) => v.color && arr.findIndex((x) => x.color === v.color) === i).map((v) => (
                              <span key={v.color!} title={v.color!} className="w-3 h-3 rounded-full border border-black/15" style={{ background: v.colorHex || '#ccc' }} />
                            ))}
                            <span className="text-[10px] text-neutral-500 ml-1">{cols.length} colour{cols.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-700">
                        <span className={`inline-block mb-1 px-2 py-0.5 text-[9.5px] font-bold uppercase ${p.gender === 'MEN' ? 'bg-blue-100 text-blue-800' : p.gender === 'WOMEN' ? 'bg-pink-100 text-pink-800' : 'bg-neutral-200 text-neutral-700'}`}>{genderLabel(p.gender)}</span>
                        <p>{p.category?.name || '—'}</p>
                        {colNames.length > 0 && <p className="text-[10px] text-neutral-500 mt-0.5">{colNames.join(', ')}</p>}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold">RS. {(p.basePrice / 100).toLocaleString('en-IN')}</span>
                        {p.comparePrice ? <span className="block text-[11px] text-neutral-400 line-through">RS. {(p.comparePrice / 100).toLocaleString('en-IN')}</span> : null}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${totalStock === 0 ? 'text-red-600' : totalStock <= 10 ? 'text-yellow-700' : 'text-black'}`}>{totalStock}</span>
                        <span className="block text-[10px] text-neutral-500">{p.variants.length} variant{p.variants.length === 1 ? '' : 's'}</span>
                      </td>
                      <td className="py-3 px-4 space-y-1">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-700'}`}>{p.isActive ? 'Live' : 'Hidden'}</span>
                        {p.isFeatured && <span className="flex items-center gap-1 text-[10px] text-[#FF5400] font-bold uppercase"><Star className="w-3 h-3" /> Featured</span>}
                        {p.pinned && <span className="flex items-center gap-1 text-[10px] text-black font-bold uppercase"><Pin className="w-3 h-3" /> Pinned</span>}
                        <span className="flex items-center gap-1 text-[10px] text-neutral-500" title="Units sold in the last 30 days (paid / COD orders, not cancelled or refunded)"><TrendingUp className="w-3 h-3" /> {p.salesScore || 0} sold · 30d</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => fillForm(p)} title="Edit" className="p-2 hover:bg-neutral-100"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => fillForm(p, true)} title="Duplicate" className="p-2 hover:bg-neutral-100"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleTogglePin(p)} title={p.pinned ? 'Unpin (let best sellers decide)' : 'Pin to the top of its category'} aria-pressed={!!p.pinned} className={`p-2 ${p.pinned ? 'bg-black text-white' : 'hover:bg-neutral-100'}`}><Pin className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleToggleActive(p)} title={p.isActive ? 'Hide from store' : 'Show in store'} className="p-2 hover:bg-neutral-100">
                            {p.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {p.isActive && <Link to={`/products/${p.slug}`} target="_blank" title="View in store" className="p-2 hover:bg-neutral-100"><ExternalLink className="w-3.5 h-3.5" /></Link>}
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
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-start justify-center p-2 sm:p-6 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-white w-full max-w-4xl my-2 sm:my-4 shadow-2xl border border-black/10">
            <div className="flex items-center justify-between p-5 border-b border-black/10 sticky top-0 bg-white z-10">
              <h2 className="font-display font-black text-xl uppercase tracking-tight">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <button type="button" onClick={() => !saving && setShowModal(false)} className="p-1.5 hover:bg-neutral-100" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-8">
              {formError && <div role="alert" className="p-3 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">{formError}</div>}

              {/* 1. Basics */}
              <section className="space-y-4">
                <p className={sectionTitle}>1. Basics</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Product name *</label>
                    <input required value={name} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} className={inputClass} placeholder="e.g. Signature Overlength Heavyweight Tee" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Web address</label>
                    <div className="flex items-center border border-black/20 bg-neutral-50">
                      <span className="px-2 text-[11px] text-neutral-500 font-mono whitespace-nowrap">thelevix.shop/products/</span>
                      <input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }} className="flex-1 min-w-0 bg-white p-2.5 text-sm font-mono focus:outline-none" placeholder="auto-generated" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Price (₹) *</label>
                    <input required type="number" min="1" step="1" value={priceINR} onChange={(e) => setPriceINR(e.target.value)} className={`${inputClass} font-mono`} placeholder="2999" />
                  </div>
                  <div>
                    <label className={labelClass}>MRP / original price (₹)</label>
                    <input type="number" min="0" step="1" value={comparePriceINR} onChange={(e) => setComparePriceINR(e.target.value)} className={`${inputClass} font-mono`} placeholder="optional — shows a SALE badge" />
                  </div>
                </div>
              </section>

              {/* 2. Where it appears */}
              <section className="space-y-4">
                <p className={sectionTitle}>2. Where it appears</p>
                <div>
                  <label className={labelClass}>Who is it for?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {GENDERS.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setGender(g.value)}
                        className={`py-3 px-2 border text-center transition-colors ${gender === g.value ? 'border-black bg-black text-white' : 'border-black/15 bg-white hover:border-black'}`}
                      >
                        <span className="block text-sm font-bold uppercase tracking-wider">{g.label}</span>
                        <span className={`block text-[10px] mt-0.5 ${gender === g.value ? 'text-white/70' : 'text-neutral-500'}`}>{g.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Product type</label>
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                      <option value="">None</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="__new__">+ New product type…</option>
                    </select>
                    {categoryId === '__new__' && <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className={`${inputClass} mt-2`} placeholder="e.g. Hoodies" />}
                    <p className="text-[10.5px] text-neutral-500 mt-1">Overlength, Waffle, Acid Wash… shown as filter chips & in the menu.</p>
                  </div>
                  <div>
                    <label className={labelClass}>Collections / drops</label>
                    {allCollections.length === 0 ? (
                      <p className="text-[11px] text-neutral-500">No collections yet — create them in "Collections & Home".</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {allCollections.map((c) => {
                          const on = collectionIds.includes(c.id);
                          return (
                            <button key={c.id} type="button" onClick={() => setCollectionIds(on ? collectionIds.filter((x) => x !== c.id) : [...collectionIds, c.id])} className={`px-3 py-1.5 rounded-full border text-[11px] ${on ? 'border-black bg-black text-white' : 'border-black/15 hover:border-black'}`}>
                              {on ? '✓ ' : '+ '}{c.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[10.5px] text-neutral-500 mt-1">Pick 1st / 2nd / 3rd Drop etc. A product can be in several.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-black w-4 h-4" /> Visible in store</label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-black w-4 h-4" /> Show first in "Latest drop"</label>
                </div>
              </section>

              {/* 3. Sizes */}
              <section className="space-y-3">
                <p className={sectionTitle}>3. Sizes</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {sizes.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-black text-white text-[11px] font-bold">
                      {s}
                      <button type="button" onClick={() => applySizes(sizes.filter((x) => x !== s))} className="w-4 h-4 rounded-full hover:bg-white/20 flex items-center justify-center" aria-label={`Remove size ${s}`}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  <input value={newSize} onChange={(e) => setNewSize(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }} placeholder="Add size" className="w-24 border border-black/20 px-2 py-1 text-[11px] uppercase rounded-full focus:outline-none focus:border-black" />
                  <button type="button" onClick={addSize} className="text-[11px] font-bold underline">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                  <span className="text-neutral-500 py-1">Quick sets:</span>
                  {SIZE_PRESETS.map((p) => <button key={p.label} type="button" onClick={() => applySizes(p.sizes)} className="px-2.5 py-1 rounded-full border border-black/15 hover:border-black">{p.label}</button>)}
                </div>
              </section>

              {/* 4. Colours, photos & stock */}
              <section className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className={sectionTitle}><Palette className="w-4 h-4" /> 4. {multiColour ? 'Colours, photos & stock' : 'Photos & stock'}</p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10.5px] text-neutral-500">Add colour:</span>
                    {QUICK_COLOURS.filter((q) => !colours.some((c) => c.name.toLowerCase() === q.name.toLowerCase())).slice(0, 6).map((q) => (
                      <button key={q.name} type="button" onClick={() => addColour(q)} className="flex items-center gap-1 px-2 py-1 rounded-full border border-black/15 text-[10.5px] hover:border-black">
                        <span className="w-3 h-3 rounded-full border border-black/15" style={{ background: q.hex }} />{q.name}
                      </button>
                    ))}
                    <button type="button" onClick={() => addColour()} className="px-2.5 py-1 rounded-full bg-black text-white text-[10.5px] font-bold">+ Other</button>
                  </div>
                </div>
                {!multiColour && <p className="text-[11px] text-neutral-500 -mt-2">Only one colour? Just add photos and stock below. Selling it in more colours? Click a colour above — each colour gets its own photos and stock.</p>}

                {colours.map((c, idx) => (
                  <div key={c.key} className="border border-black/15 p-4 space-y-4 bg-neutral-50/50">
                    {(multiColour || c.name) && (
                      <div className="flex flex-wrap items-center gap-3">
                        <input type="color" value={c.hex} onChange={(e) => updateColour(c.key, { hex: e.target.value })} className="w-10 h-10 border border-black/20 p-0.5 bg-white cursor-pointer" aria-label="Colour swatch" />
                        <input value={c.name} onChange={(e) => updateColour(c.key, { name: e.target.value })} placeholder={`Colour ${idx + 1} name (e.g. Black)`} className={`${inputClass} max-w-xs`} />
                        <span className="text-[11px] text-neutral-500">{totalStockOf(c)} in stock</span>
                        <button type="button" onClick={() => removeColour(c.key)} className="ml-auto text-[11px] text-red-600 font-semibold flex items-center gap-1 hover:underline"><Trash2 className="w-3.5 h-3.5" /> Remove colour</button>
                      </div>
                    )}

                    <ImageUploader
                      value={c.images}
                      onChange={(urls) => updateColour(c.key, { images: urls })}
                      max={12}
                      label={multiColour ? `Photos of ${c.name || 'this colour'} *` : 'Product photos *'}
                      compact={multiColour}
                    />

                    <div>
                      <p className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">Stock per size{multiColour && c.name ? ` — ${c.name}` : ''}</p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {sizes.map((s) => (
                          <label key={s} className="border border-black/15 bg-white p-1.5 text-center">
                            <span className="block text-[11px] font-bold">{s}</span>
                            <input type="number" min="0" inputMode="numeric" value={c.stock[s] ?? '0'} onChange={(e) => updateColour(c.key, { stock: { ...c.stock, [s]: e.target.value } })} className="w-full text-center font-mono text-sm border-t border-black/10 mt-1 pt-1 focus:outline-none" aria-label={`Stock for ${c.name || ''} ${s}`} />
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-3 mt-1.5 text-[10.5px]">
                        <button type="button" onClick={() => { const v = window.prompt('Set the same stock for every size:', '10'); if (v !== null) updateColour(c.key, { stock: Object.fromEntries(sizes.map((s) => [s, String(Math.max(0, parseInt(v, 10) || 0))])) }); }} className="underline">Same stock for all sizes</button>
                        <button type="button" onClick={() => updateColour(c.key, { stock: Object.fromEntries(sizes.map((s) => [s, '0'])) })} className="underline text-neutral-500">Mark all sold out</button>
                      </div>
                    </div>
                  </div>
                ))}

                <div>
                  <label className={labelClass}>Colour family (for "Shop by colour")</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setColorGroup('')} className={`px-3 py-1 rounded-full border text-[11px] ${!colorGroup ? 'border-black bg-black text-white' : 'border-black/15'}`}>None</button>
                    {COLOR_GROUPS.map((cg) => (
                      <button key={cg} type="button" onClick={() => setColorGroup(cg)} className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] ${colorGroup === cg ? 'border-black ring-1 ring-black' : 'border-black/15'}`}>
                        <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: COLOR_SWATCHES[cg] }} />
                        {cg.charAt(0) + cg.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* 5. Description */}
              <section className="space-y-4">
                <p className={sectionTitle}>5. Description</p>
                <div>
                  <label className={labelClass}>Description *</label>
                  <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="What makes this piece special..." />
                </div>
                <div>
                  <label className={labelClass}>Product details (one per line)</label>
                  <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} className={inputClass} placeholder={'280 GSM combed cotton\nPuff print on back\nRibbed neck'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Fabric & care</label>
                    <textarea rows={3} value={fabricCare} onChange={(e) => setFabricCare(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Fit guide</label>
                    <textarea rows={3} value={fitGuide} onChange={(e) => setFitGuide(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </section>
            </div>

            <div className="p-4 sm:p-5 border-t border-black/10 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setShowModal(false)} disabled={saving} className="px-5 py-3 border border-black/20 text-xs font-bold uppercase tracking-wider">Cancel</button>
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
