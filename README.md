# LEVIX — Premium Streetwear Store

Live at [thelevix.shop](https://thelevix.shop). React 19 + Vite + Tailwind storefront, Node/Express API,
Prisma + **MySQL** (Hostinger), **Firebase Authentication**, **Razorpay** payments.

## How it fits together
```
server.js            ← bundled API + serves frontend/dist  (this is what Hostinger runs: `npm start`)
prisma/schema.prisma ← database schema (MySQL). `npm install` runs prisma generate + db push
frontend/            ← React app (src/) and its production build (dist/)
backend/src/         ← API source (TypeScript) — `npm run bundle` rebuilds ../server.js
documentation/       ← go-live guide & security checklist
```

## Features
- **Storefront:** home (hero, featured drops, category lookbook), collections, product pages with size guide & image gallery, search, cart drawer with free-shipping progress, guest + account checkout, order confirmation, order history with courier tracking, policies (shipping, refunds, privacy, terms, contact), newsletter signup, installable PWA.
- **Accounts:** Google or email/password sign-in, password reset, email verification, saved addresses. Guest bags merge into the account bag on sign-in.
- **Payments:** Razorpay (UPI, cards, net banking, wallets). Server-side pricing, coupon validation, signature + amount verification, webhook backup, atomic stock deduction.
- **Admin (`/admin`, owner only):** dashboard (revenue, today, orders to ship, low stock, subscribers CSV), products (multi-image URLs, sizes & stock, hide/show, featured, duplicate), orders (status, courier & tracking, cancel restocks), discount codes (percent/fixed, min order, expiry, usage limit), store settings (announcement, hero text, contacts, shipping rules) and categories with banner images.

## Develop locally
```bash
# API
cd backend && npm install && cp .env.example .env   # fill in values
npm run dev                                          # http://localhost:4000
# Storefront
cd frontend && npm install && cp .env.example .env
npm run dev                                          # http://localhost:5173 (proxies /api)
```

## Build for production
```bash
cd backend  && npm run bundle   # → ../server.js
cd frontend && npm run build    # → frontend/dist
```
See **documentation/HOSTINGER_DEPLOYMENT.md** for the go-live steps (Firebase, Razorpay webhook, env vars).
