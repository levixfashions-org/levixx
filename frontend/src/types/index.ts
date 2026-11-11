export interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
  color?: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color?: string | null;
  colorHex?: string | null;
  sku: string;
  stockQuantity: number;
  priceDelta: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  group?: string | null;
  _count?: { products: number };
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  mobileBannerUrl?: string | null;
  type?: 'collection' | 'category';
  group?: string | null;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  details?: string | null;
  fabricCare?: string | null;
  fitGuide?: string | null;
  basePrice: number; // in paise
  comparePrice?: number | null; // in paise
  isFeatured: boolean;
  isActive: boolean;
  colorGroup?: string | null;
  gender?: Gender;
  collectionIds?: string[];
  createdAt?: string;
  category?: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  size: string;
  color?: string | null;
  colorHex?: string | null;
  stockQuantity: number;
  productId: string;
  productName: string;
  productSlug: string;
  unitPricePaise: number;
  totalPaise: number;
  imageUrl: string | null;
}

export interface Cart {
  cartId: string;
  items: CartItem[];
  itemCount: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  freeShippingThresholdPaise: number;
  remainingForFreeShippingPaise: number;
}

export interface Address {
  id?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: string;
  productName: string;
  productSlug: string;
  size: string;
  color?: string | null;
  unitPricePaise: number;
  quantity: number;
  subtotalPaise: number;
  imageUrl?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  shippingAddressSnapshot: Address;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  totalPaise: number;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod?: 'ONLINE' | 'COD';
  codFeePaise?: number;
  razorpayOrderId?: string | null;
  couponCode?: string | null;
  courier?: string | null;
  trackingNumber?: string | null;
  shippingAddress?: string;
  adminNotes?: string | null;
  paidAt?: string | null;
  items: OrderItem[];
  createdAt: string;
}

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  emailVerified?: boolean;
  addresses: Address[];
  _count?: { orders: number };
}

export interface HomeSection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  mobileBannerUrl?: string | null;
  layout: 'CAROUSEL' | 'GRID' | 'NONE';
  products: Product[];
}

export type Gender = 'MEN' | 'WOMEN' | 'UNISEX';

export interface Department {
  key: 'men' | 'women';
  name: string;
  count: number;
  coverImage?: string | null;
  categories: { id: string; name: string; slug: string; group: string; count: number }[];
  collections: { id: string; name: string; slug: string }[];
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  group: string;
  imageUrl?: string | null;
  count: number;
}

export interface HomeData {
  latestDrop: Product[];
  sections: HomeSection[];
  gallery: { id: string; name: string; slug: string; bannerImageUrl?: string | null; mobileBannerUrl?: string | null }[];
  menu: {
    collections: { id: string; name: string; slug: string; bannerImageUrl?: string | null }[];
    categories: MenuCategory[];
    colors: string[];
    departments?: Department[];
  };
}
