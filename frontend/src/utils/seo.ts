/**
 * Keeps <title>, description, canonical and social-preview tags correct while shoppers move around the
 * site without full page loads (the server already sends the right tags on the first visit).
 */
const SITE = 'https://thelevix.shop';

function meta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export function setSeo(opts: { title: string; description?: string; image?: string | null; path?: string }) {
  if (typeof document === 'undefined') return;
  const title = opts.title;
  document.title = title;
  const url = `${SITE}${opts.path ?? window.location.pathname}`;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
  meta('property', 'og:title', title);
  meta('name', 'twitter:title', title);
  meta('property', 'og:url', url);
  if (opts.description) {
    const d = opts.description.replace(/\s+/g, ' ').trim().slice(0, 160);
    meta('name', 'description', d);
    meta('property', 'og:description', d);
    meta('name', 'twitter:description', d);
  }
  if (opts.image) {
    const src = opts.image.split('#')[0];
    const abs = /^https?:\/\//.test(src) ? src : `${SITE}${src.startsWith('/') ? '' : '/'}${src}`;
    meta('property', 'og:image', abs);
    meta('name', 'twitter:image', abs);
  }
}
