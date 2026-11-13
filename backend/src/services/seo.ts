import fs from 'fs';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { getSettings } from './store.js';
import { genderFilter } from '../utils/serialize.js';

/**
 * Server-side SEO for the React storefront.
 * Every page request gets the right <title>, description, canonical link, social-preview (Open Graph /
 * Twitter) tags and Google structured data (JSON-LD) baked into the HTML — so Google, WhatsApp,
 * Instagram and Facebook see real product info without running JavaScript. A <noscript> block adds
 * crawlable text and links. The React app then takes over as normal.
 */

const SITE = () => (env.FRONTEND_URL || 'https://thelevix.shop').replace(/\/+$/, '');
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const clip = (s: string, n: number) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
};
const abs = (u?: string | null) => {
  if (!u) return '';
  const clean = u.split('#')[0];
  return /^https?:\/\//i.test(clean) ? clean : `${SITE()}${clean.startsWith('/') ? '' : '/'}${clean}`;
};
const inr = (paise: number) => (paise / 100).toFixed(2);

export interface SeoPage {
  status: number;
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: 'website' | 'product';
  noindex?: boolean;
  jsonLd: object[];
  noscript: string;
  extraMeta?: string;
}

const PRIVATE = /^\/(admin|account|checkout|cart|login|register|forgot-password|order-success|wishlist)(\/|$)/;

const POLICY_TITLES: Record<string, [string, string]> = {
  'terms-of-service': ['Terms & Conditions', 'Terms and conditions for shopping at LEVIX — orders, pricing, payments, delivery and your rights.'],
  'refund-policy': ['Returns, Refunds & Cancellation', 'LEVIX returns policy: replacements or refunds for damaged, defective or wrong items reported within 48 hours of delivery.'],
  'shipping-policy': ['Shipping & Delivery', 'Free delivery on every LEVIX order across India. Orders are dispatched within 2–5 business days with tracking.'],
  'privacy-policy': ['Privacy Policy', 'How LEVIX collects, uses and protects your personal data, in line with India’s DPDP Act 2023.'],
  contact: ['Contact & FAQ', 'Contact LEVIX — support email, WhatsApp, grievance officer and answers to common questions.']
};

function breadcrumb(items: [string, string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url }))
  };
}

function productLinks(products: { name: string; slug: string; basePrice: number }[]) {
  return `<ul>${products
    .map((p) => `<li><a href="/products/${esc(p.slug)}">${esc(p.name)}</a> — ₹${Math.round(p.basePrice / 100)}</li>`)
    .join('')}</ul>`;
}

async function build(pathname: string): Promise<SeoPage> {
  const site = SITE();
  const settings = await getSettings();
  const brand = 'LEVIX';
  const defaultTitle = 'LEVIX | Premium Streetwear — Overlength, Waffle & Acid Wash Tees';
  const defaultDesc = clip(
    settings.seoText?.trim() ||
      'LEVIX — premium heavyweight streetwear from India. Overlength tees, waffle boxy full sleeves and acid wash tees. Free delivery on every order.',
    160
  );
  const defaultImage = abs(settings.heroDesktopImage) || `${site}/hero_desktop.jpg`;
  const base: SeoPage = {
    status: 200,
    title: defaultTitle,
    description: defaultDesc,
    canonical: `${site}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`,
    image: defaultImage,
    type: 'website',
    jsonLd: [],
    noscript: ''
  };

  if (PRIVATE.test(pathname)) return { ...base, noindex: true, title: `${brand}` };

  // ---------------- Home ----------------
  if (pathname === '/') {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      take: 24,
      select: { name: true, slug: true, basePrice: true }
    });
    const insta = settings.instagramHandle ? `https://www.instagram.com/${settings.instagramHandle.replace(/^@/, '')}/` : null;
    return {
      ...base,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: brand,
          legalName: settings.legalName || brand,
          url: site,
          logo: `${site}/icons/icon-512.png`,
          ...(insta ? { sameAs: [insta] } : {}),
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: settings.supportEmail || undefined,
              telephone: settings.supportPhone || undefined,
              areaServed: 'IN',
              availableLanguage: ['en', 'hi']
            }
          ]
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: brand,
          url: site,
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${site}/search?q={search_term_string}` },
            'query-input': 'required name=search_term_string'
          }
        }
      ],
      noscript: `<h1>${esc(defaultTitle)}</h1><p>${esc(defaultDesc)}</p>${productLinks(products)}`
    };
  }

  // ---------------- Product ----------------
  const pm = pathname.match(/^\/products\/([^/]+)\/?$/);
  if (pm) {
    const slug = decodeURIComponent(pm[1]);
    const p = await prisma.product.findUnique({
      where: { slug },
      include: { category: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true }
    });
    if (!p || !p.isActive) {
      return { ...base, status: 404, noindex: true, title: `Product not found | ${brand}`, description: 'This product is no longer available.' };
    }
    const url = `${site}/products/${p.slug}`;
    const images = p.images.map((i) => abs(i.url)).filter(Boolean);
    const inStock = p.variants.some((v) => v.stockQuantity > 0);
    const sizes = [...new Set(p.variants.map((v) => v.size))];
    const colours = [...new Set(p.variants.map((v) => v.color).filter(Boolean))] as string[];
    const price = inr(p.basePrice);
    const desc = clip(`${p.name} — ₹${Math.round(p.basePrice / 100)}${p.comparePrice && p.comparePrice > p.basePrice ? ` (MRP ₹${Math.round(p.comparePrice / 100)})` : ''}. ${p.description}`, 160);
    const offer: any = {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: brand },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'INR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 7, unitCode: 'DAY' }
        }
      }
    };
    if (p.comparePrice && p.comparePrice > p.basePrice) {
      offer.priceSpecification = [
        { '@type': 'UnitPriceSpecification', price, priceCurrency: 'INR' },
        { '@type': 'UnitPriceSpecification', priceType: 'https://schema.org/StrikethroughPrice', price: inr(p.comparePrice), priceCurrency: 'INR' }
      ];
    }
    const crumbs: [string, string][] = [['Home', `${site}/`]];
    if (p.category) crumbs.push([p.category.name, `${site}/collections/${p.category.slug}`]);
    crumbs.push([p.name, url]);
    return {
      ...base,
      title: `${p.name} | ${brand}`,
      description: desc,
      canonical: url,
      image: images[0] || defaultImage,
      type: 'product',
      extraMeta: `<meta property="product:price:amount" content="${price}" /><meta property="product:price:currency" content="INR" /><meta property="product:availability" content="${inStock ? 'in stock' : 'out of stock'}" /><meta property="product:brand" content="${brand}" />`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          description: clip(p.description, 5000),
          image: images,
          sku: p.variants[0]?.sku || p.slug,
          brand: { '@type': 'Brand', name: brand },
          ...(p.category ? { category: p.category.name } : {}),
          ...(colours.length ? { color: colours.join(', ') } : {}),
          size: sizes.join(', '),
          audience: { '@type': 'PeopleAudience', suggestedGender: p.gender === 'MEN' ? 'male' : p.gender === 'WOMEN' ? 'female' : 'unisex' },
          offers: offer
        },
        breadcrumb(crumbs)
      ],
      noscript: `<h1>${esc(p.name)}</h1><p>₹${Math.round(p.basePrice / 100)}${p.comparePrice && p.comparePrice > p.basePrice ? ` <s>₹${Math.round(p.comparePrice / 100)}</s>` : ''} · ${inStock ? 'In stock' : 'Sold out'} · Sizes ${esc(sizes.join(', '))}</p><p>${esc(p.description)}</p>${images
        .slice(0, 4)
        .map((src) => `<img src="${esc(src)}" alt="${esc(p.name)}" />`)
        .join('')}`
    };
  }

  // ---------------- Collections ----------------
  if (pathname === '/collections' || pathname === '/collections/') {
    return { ...base, title: `Collections | ${brand}`, description: clip('Shop every LEVIX collection and category — overlength tees, waffle boxy full sleeves, acid wash tees and limited drops.', 160) };
  }
  const cm = pathname.match(/^\/collections\/([^/]+)\/?$/);
  if (cm) {
    const slug = decodeURIComponent(cm[1]);
    let name = '';
    let description = '';
    let image = '';
    let products: { name: string; slug: string; basePrice: number }[] = [];
    const sel = { name: true, slug: true, basePrice: true } as const;
    if (slug === 'all-products' || slug === 'new-in') {
      name = slug === 'new-in' ? 'New Arrivals' : 'All Products';
      products = await prisma.product.findMany({ where: { isActive: true }, orderBy: slug === 'new-in' ? { createdAt: 'desc' } : [{ position: 'asc' }, { createdAt: 'desc' }], take: 60, select: sel });
    } else if (slug === 'men' || slug === 'women') {
      name = slug === 'men' ? 'Men' : 'Women';
      image = abs(slug === 'men' ? settings.menCoverImage : settings.womenCoverImage);
      products = await prisma.product.findMany({ where: { isActive: true, ...genderFilter(slug)! }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 60, select: sel });
      description = `Shop LEVIX streetwear for ${name.toLowerCase()} — overlength tees, waffle full sleeves and acid wash tees. Free delivery across India.`;
    } else {
      const col = await prisma.collection.findUnique({
        where: { slug },
        include: { products: { orderBy: { sortOrder: 'asc' }, where: { product: { isActive: true } }, take: 60, include: { product: { select: sel } } } }
      });
      if (col && col.isActive) {
        name = col.name;
        description = col.description || '';
        image = abs(col.bannerImageUrl);
        products = col.products.map((cp) => cp.product);
      } else {
        const cat = await prisma.category.findUnique({ where: { slug } });
        if (!cat) return { ...base, status: 404, noindex: true, title: `Not found | ${brand}`, description: 'This collection does not exist.' };
        name = cat.name;
        description = cat.description || '';
        image = abs(cat.imageUrl);
        products = await prisma.product.findMany({ where: { isActive: true, categoryId: cat.id }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 60, select: sel });
      }
    }
    const url = `${site}/collections/${slug}`;
    const desc = clip(description || `Shop ${name} at LEVIX — premium heavyweight streetwear with free delivery across India.`, 160);
    return {
      ...base,
      title: `${name} | ${brand}`,
      description: desc,
      canonical: url,
      image: image || defaultImage,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `${name} | ${brand}`,
          url,
          description: desc,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: products.length,
            itemListElement: products.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${site}/products/${p.slug}`, name: p.name }))
          }
        },
        breadcrumb([
          ['Home', `${site}/`],
          [name, url]
        ])
      ],
      noscript: `<h1>${esc(name)}</h1><p>${esc(desc)}</p>${productLinks(products)}`
    };
  }

  // ---------------- Policies & pages ----------------
  const pol = pathname.match(/^\/policies\/([^/]+)\/?$/) || (pathname === '/pages/contact' ? [pathname, 'contact'] : null);
  if (pol && POLICY_TITLES[pol[1]]) {
    const [t, d] = POLICY_TITLES[pol[1]];
    return { ...base, title: `${t} | ${brand}`, description: d, canonical: `${site}/policies/${pol[1]}`, noscript: `<h1>${esc(t)}</h1><p>${esc(d)}</p>` };
  }
  const pages: Record<string, [string, string]> = {
    '/pages/about': ['Our Story', 'LEVIX is an independent Indian streetwear label built around heavyweight fabrics, oversized silhouettes and limited drops.'],
    '/pages/track': ['Track Your Order', 'Track your LEVIX order with your order number and email.'],
    '/pages/store': ['Pan-India Delivery', 'LEVIX ships streetwear across India with free delivery on every order.'],
    '/search': ['Search', 'Search LEVIX streetwear.']
  };
  const pg = pages[pathname.replace(/\/+$/, '')];
  if (pg) return { ...base, title: `${pg[0]} | ${brand}`, description: pg[1], noindex: pathname.startsWith('/search') };

  return { ...base, status: 404, noindex: true, title: `Page not found | ${brand}` };
}

// ---------------- HTML injection ----------------
let template: { file: string; mtime: number; html: string } | null = null;
function loadTemplate(file: string): string {
  const mtime = fs.statSync(file).mtimeMs;
  if (!template || template.file !== file || template.mtime !== mtime) template = { file, mtime, html: fs.readFileSync(file, 'utf8') };
  return template.html;
}

const cache = new Map<string, { at: number; page: SeoPage }>();
const TTL = 60 * 1000;
export function clearSeoCache() {
  cache.clear();
}

export async function renderPage(indexFile: string, pathname: string): Promise<{ status: number; html: string }> {
  const html = loadTemplate(indexFile);
  let page: SeoPage;
  try {
    const hit = cache.get(pathname);
    if (hit && Date.now() - hit.at < TTL) page = hit.page;
    else {
      page = await build(pathname);
      if (cache.size > 2000) cache.clear();
      cache.set(pathname, { at: Date.now(), page });
    }
  } catch (err: any) {
    console.error('SEO render failed:', err?.message || err);
    return { status: 200, html };
  }
  const settings = await getSettings().catch(() => null as any);
  const verify = String((settings as any)?.googleSiteVerification || process.env.GOOGLE_SITE_VERIFICATION || '').trim();
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}" />`,
    `<link rel="canonical" href="${esc(page.canonical)}" />`,
    `<meta name="robots" content="${page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1'}" />`,
    `<meta property="og:type" content="${page.type}" />`,
    `<meta property="og:site_name" content="LEVIX" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${esc(page.canonical)}" />`,
    `<meta property="og:image" content="${esc(page.image)}" />`,
    `<meta property="og:image:alt" content="${esc(page.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${esc(page.image)}" />`,
    page.extraMeta || '',
    verify ? `<meta name="google-site-verification" content="${esc(verify.replace(/^.*content="([^"]+)".*$/, '$1'))}" />` : '',
    ...page.jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`)
  ]
    .filter(Boolean)
    .join('\n    ');
  let out = html.replace(/<!--seo-->[\s\S]*?<!--\/seo-->/, `<!--seo-->\n    ${head}\n    <!--/seo-->`);
  if (page.noscript) out = out.replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${page.noscript}<p>Please enable JavaScript to shop at LEVIX.</p></noscript>`);
  return { status: page.status, html: out };
}
