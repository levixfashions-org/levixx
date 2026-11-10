# LEVIX Security Checklist (current implementation)

## Authentication & authorisation
- [x] Sign-in uses real **Firebase Authentication** (Google + Email/Password). Passwords never touch our server.
- [x] Every protected API call verifies the Firebase ID token with `firebase-admin` (`verifyIdToken`). Invalid/expired tokens get `401`.
- [x] No development/mock tokens are accepted in any environment.
- [x] Admin = Firebase-**verified** email listed in `ADMIN_EMAILS` (default `levixfashions@gmail.com`). Enforced server-side on every `/api/admin/*` route; the UI guard is cosmetic only.

## Payments
- [x] Order totals are calculated on the server from database prices (client prices are ignored).
- [x] Coupons are validated on the server (active, expiry, minimum order, usage limit).
- [x] `/api/payments/verify` checks the Razorpay order id belongs to the order, verifies the HMAC signature (timing-safe), and confirms amount with Razorpay.
- [x] Webhook requires `RAZORPAY_WEBHOOK_SECRET` and verifies the signature on the raw body.
- [x] Order is marked paid exactly once (atomic), so stock is never deducted twice. Cancelling a paid order restocks it.
- [x] No mock/sandbox payment paths remain — if Razorpay is not configured, checkout is disabled.

## Data access
- [x] Carts are tied to the signed-in user or a random guest session id; items can only be changed by their owner.
- [x] Order details require the owner's login, admin, or the secret per-order access key given after checkout. Order numbers are random (`LVX-YYMMDD-XXXXXX`).

## Platform
- [x] `trust proxy` enabled so rate limiting uses real visitor IPs.
- [x] Rate limits: API 900 / 15 min / IP, account 200 / 15 min, checkout 30 / 10 min.
- [x] CORS restricted to the store domains.
- [x] Helmet security headers, HSTS, `X-Powered-By` removed, gzip compression.
- [x] Request bodies limited to 1 MB; all inputs validated with Zod.
- [x] Secrets live only in `.env` files, which are git-ignored.

## Owner actions
- [ ] Rotate the Razorpay secret and Firebase service-account key if they were ever shared (e.g. in a zip).
- [ ] Enable 2-step verification on levixfashions@gmail.com (it is the admin key to the store).
- [ ] Turn on Hostinger daily backups for the MySQL database.
