import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useHomeStore } from '../store/homeStore';
import { useSettingsStore } from '../store/settingsStore';
import { useAuth } from '../context/AuthContext';
import { ProductRail } from '../components/ProductRail';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { GallerySlider, Slide } from '../components/GallerySlider';
import { StoriesBar } from '../components/StoriesBar';
import { HomeSection } from '../types';

const Hero: React.FC = () => {
  const s = useSettingsStore((st) => st.settings);
  const desktop = s.heroDesktopImage || '/hero_desktop.jpg';
  const mobile = s.heroMobileImage || (s.heroDesktopImage ? s.heroDesktopImage : '/hero_mobile.jpg');
  return (
    <section className="relative w-full h-[100svh] min-h-[560px] max-h-[1000px] overflow-hidden bg-neutral-300">
      <Link to={s.heroLink || '/collections/all-products'} aria-label={s.heroCtaText || 'Shop now'} className="absolute inset-0">
        <picture>
          <source media="(max-width: 767px)" srcSet={mobile} />
          <img src={desktop} alt="LEVIX campaign" className="w-full h-full object-cover object-center" loading="eager" fetchPriority="high" />
        </picture>
      </Link>
      <div className="absolute bottom-[7%] inset-x-0 flex justify-center pointer-events-none">
        <Link
          to={s.heroLink || '/collections/all-products'}
          className="pointer-events-auto text-[12px] font-medium text-black md:text-white border-b border-current pb-0.5 hover:opacity-70 transition-opacity"
        >
          {s.heroCtaText || 'Shop now'}
        </Link>
      </div>
    </section>
  );
};

const GridSection: React.FC<{ section: HomeSection }> = ({ section }) => (
  <section className="px-2 md:px-[10px]">
    <div className="flex items-center justify-between px-2 md:px-3 mb-3">
      <h2 className="lx-title">{section.name}</h2>
      <Link to={`/collections/${section.slug}`} className="px-4 py-[5px] rounded-full bg-white text-[10px] font-medium hover:bg-neutral-100">
        View all
      </Link>
    </div>
    <ProductGrid products={section.products.slice(0, 8)} />
  </section>
);

const renderSection = (section: HomeSection) =>
  section.layout === 'GRID' ? (
    <GridSection key={section.id} section={section} />
  ) : (
    <ProductRail key={section.id} title={section.name} products={section.products} href={`/collections/${section.slug}`} />
  );

export const HomePage: React.FC = () => {
  const { data, loading, error, fetchHome } = useHomeStore();
  const settings = useSettingsStore((s) => s.settings);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchHome(true);
  }, [fetchHome]);

  useEffect(() => {
    document.title = 'LEVIX | Premium Streetwear';
  }, []);

  // Banner slideshow: collections marked "show in gallery", otherwise category banners.
  const slides: Slide[] = data
    ? data.gallery.length
      ? data.gallery.map((g) => ({ id: g.id, name: g.name, href: `/collections/${g.slug}`, image: g.bannerImageUrl!, mobileImage: g.mobileBannerUrl }))
      : data.menu.categories
          .filter((c) => c.imageUrl)
          .map((c) => ({ id: c.id, name: c.name, href: `/collections/${c.slug}`, image: c.imageUrl! }))
    : [];

  const departments = (data?.menu.departments || []).filter((d) => d.count > 0);
  const stories = data
    ? [
        ...departments.map((d) => ({ id: `dept-${d.key}`, name: d.name, href: `/collections/${d.key}`, image: d.coverImage })),
        ...data.menu.collections.map((c) => ({ id: c.id, name: c.name, href: `/collections/${c.slug}`, image: c.bannerImageUrl })),
        ...data.menu.categories.map((c) => ({ id: c.id, name: c.name, href: `/collections/${c.slug}`, image: c.imageUrl }))
      ].slice(0, 10)
    : [];

  const sections = data?.sections || [];
  const [first, ...rest] = sections;
  const empty = data && data.latestDrop.length === 0;

  return (
    <div className="pb-6">
      <Hero />
      <StoriesBar stories={stories} />

      <div className="space-y-4 md:space-y-5 mt-2 md:mt-3">
        {loading && !data ? (
          <div className="px-2 md:px-[10px] pt-4">
            <ProductGridSkeleton count={4} />
          </div>
        ) : error && !data ? (
          <div className="mx-2 md:mx-[10px] lx-panel p-8 text-center text-[12px] text-neutral-600">
            {error} <button onClick={() => fetchHome(true)} className="underline ml-1">Try again</button>
          </div>
        ) : empty ? (
          <div className="mx-2 md:mx-[10px] lx-panel py-16 px-6 text-center space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Coming soon</p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">New drops are on the way</h2>
            <p className="text-[12px] text-neutral-600 max-w-md mx-auto">
              Follow <span className="font-semibold text-black">@{settings.instagramHandle || 'thelevix.shop'}</span> for early access.
            </p>
            {isAdmin && (
              <Link to="/admin/products" className="inline-block mt-2 px-5 py-2.5 rounded-full bg-black text-white text-[11px] font-semibold">
                + Add your first product
              </Link>
            )}
          </div>
        ) : (
          <>
            <ProductRail
              title={settings.latestDropTitle || 'Latest drop'}
              products={data?.latestDrop || []}
              href="/collections/new-in"
              variant="plain"
            />
            {departments.length > 0 && (
              <section className="px-2 md:px-[10px]">
                <div className="flex items-center justify-between px-1 pb-2.5">
                  <h2 className="lx-title">Shop by department</h2>
                </div>
                <div className={`grid gap-[6px] ${departments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {departments.map((d) => (
                    <Link key={d.key} to={`/collections/${d.key}`} className="group relative block aspect-[4/5] md:aspect-[16/11] rounded-[12px] overflow-hidden bg-[#DADADA]">
                      {d.coverImage && (
                        <img src={d.coverImage} alt={d.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                      <div className="absolute left-3 right-3 bottom-3 md:left-5 md:bottom-5 flex items-end justify-between text-white">
                        <div>
                          <p className="text-[22px] md:text-[34px] font-black uppercase leading-none tracking-tight">{d.name}</p>
                          <p className="text-[10.5px] mt-1 opacity-90">{d.count} {d.count === 1 ? 'piece' : 'pieces'}</p>
                        </div>
                        <span className="px-3.5 py-1.5 rounded-full bg-white text-black text-[10.5px] font-semibold">Shop {d.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {first && renderSection(first)}
            <GallerySlider slides={slides} />
            {rest.map(renderSection)}
          </>
        )}
      </div>
    </div>
  );
};
