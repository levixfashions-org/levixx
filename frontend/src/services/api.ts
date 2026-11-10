import { authService } from './authService';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const ANON_KEY = 'levix_cart_session';

/** Random guest-cart session id kept in the browser so guests keep their bag between visits. */
export function getAnonymousToken(): string {
  try {
    let token = localStorage.getItem(ANON_KEY);
    if (!token || !/^[A-Za-z0-9_-]{16,80}$/.test(token)) {
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      token = 'g_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(ANON_KEY, token);
    }
    return token;
  } catch {
    return 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export interface StoreSettings {
  announcementText: string;
  heroHeadline: string;
  heroSubtitle: string;
  supportEmail: string;
  supportPhone: string;
  instagramHandle: string;
  freeShippingThreshold: number; // rupees
  shippingFee: number; // rupees
  announcementEnabled: boolean;
  heroDesktopImage: string;
  heroMobileImage: string;
  heroLink: string;
  heroCtaText: string;
  latestDropTitle: string;
  seoTitle: string;
  seoText: string;
  shippingInfo: string;
  careInfo: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  announcementText: 'FREE DOMESTIC SHIPPING ON ORDERS ABOVE RS. 1,999 • NEW LEVIX DROPS LIVE • EASY EXCHANGES • ',
  heroHeadline: 'STREETWEAR ARCHITECTURE',
  heroSubtitle: 'Heavyweight Custom-Milled Silhouettes & Limited Private Drops.',
  supportEmail: 'levixfashions@gmail.com',
  supportPhone: '',
  instagramHandle: 'thelevix.shop',
  freeShippingThreshold: 1999,
  shippingFee: 150,
  announcementEnabled: false,
  heroDesktopImage: '',
  heroMobileImage: '',
  heroLink: '/collections/all-products',
  heroCtaText: 'Shop now',
  latestDropTitle: 'Latest drop',
  seoTitle: 'Feel the Luxury of Premium Streetwear with LEVIX',
  seoText: '',
  shippingInfo: '',
  careInfo: ''
};

/** Colour swatches used by "Shop by colour" chips and filters. */
export const COLOR_SWATCHES: Record<string, string> = {
  BLACKS: 'linear-gradient(90deg,#111,#444)',
  WHITES: 'linear-gradient(90deg,#fff,#ddd)',
  GREYS: 'linear-gradient(90deg,#9a9a9a,#d0d0d0)',
  BLUES: 'linear-gradient(90deg,#1d3fa8,#6aa0ff)',
  BROWNS: 'linear-gradient(90deg,#5b3a22,#b07a4f)',
  GREENS: 'linear-gradient(90deg,#1f7a3a,#8fd16a)',
  NEUTRALS: 'linear-gradient(90deg,#c9b99a,#efe6d6)',
  PURPLES: 'linear-gradient(90deg,#6b2fb3,#d08cff)',
  REDS: 'linear-gradient(90deg,#b3121f,#ff7a59)',
  PINKS: 'linear-gradient(90deg,#e0559a,#ffc0dc)',
  YELLOWS: 'linear-gradient(90deg,#e0b400,#fff07a)',
  ORANGES: 'linear-gradient(90deg,#e05a00,#ffb070)'
};
export const COLOR_GROUPS = Object.keys(COLOR_SWATCHES);

export interface DiscountCode {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number; // percent, or rupees for FIXED
  minOrderPaise: number;
  isActive: boolean;
  expiresAt: string;
  maxUses?: number | null;
  usedCount?: number;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}, retryAuth = true): Promise<{ data: T; status: number }> {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Anonymous-Token', getAnonymousToken());
  const token = await authService.getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError('Network error — please check your internet connection and try again.', 0);
  }

  // Token may have just expired — refresh once and retry.
  if (res.status === 401 && token && retryAuth) {
    await authService.getToken(true);
    return request<T>(endpoint, options, false);
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 200) };
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) ||
      (res.status === 429 ? 'Too many requests — please wait a moment.' : `Request failed (${res.status})`);
    throw new ApiError(message, res.status, data);
  }
  return { data: data as T, status: res.status };
}

function withQuery(endpoint: string, params?: Record<string, any>) {
  if (!params) return endpoint;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const qs = query.toString();
  return qs ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}${qs}` : endpoint;
}

export const apiClient = {
  request,
  get<T = any>(endpoint: string, params?: Record<string, any>) {
    return request<T>(withQuery(endpoint, params), { method: 'GET' });
  },
  post<T = any>(endpoint: string, body?: any) {
    return request<T>(endpoint, { method: 'POST', body: JSON.stringify(body ?? {}) });
  },
  put<T = any>(endpoint: string, body?: any) {
    return request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body ?? {}) });
  },
  patch<T = any>(endpoint: string, body?: any) {
    return request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
  },
  delete<T = any>(endpoint: string) {
    return request<T>(endpoint, { method: 'DELETE' });
  }
};

/** Uploads one image (already compressed) to the admin media library. Returns its public URL. */
export async function uploadImage(blob: Blob, meta: { width?: number; height?: number; fileName?: string } = {}): Promise<string> {
  const token = await authService.getToken();
  if (!token) throw new ApiError('Please sign in again to upload images.', 401);
  const headers: Record<string, string> = {
    'Content-Type': blob.type || 'application/octet-stream',
    Authorization: `Bearer ${token}`
  };
  if (meta.width) headers['X-Image-Width'] = String(meta.width);
  if (meta.height) headers['X-Image-Height'] = String(meta.height);
  if (meta.fileName) headers['X-File-Name'] = encodeURIComponent(meta.fileName.slice(0, 150));
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/admin/media`, { method: 'POST', headers, body: blob });
  } catch {
    throw new ApiError('Network error while uploading. Check your connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Upload failed (${res.status})`, res.status, data);
  return data.url as string;
}

export const formatINR = (paise: number) => `RS. ${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;
