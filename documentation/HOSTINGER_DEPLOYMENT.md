# LEVIX — Go-Live Guide (Hostinger Node.js + MySQL + Firebase + Razorpay)

The whole store runs from **one Node app**: `server.js` (repo root) serves the API at `/api/*`
and the React storefront from `frontend/dist`. Data lives in your **Hostinger MySQL** database.

---

## 1. One-time setup (do these once)

### a) Firebase Authentication (real sign-in)
1. Firebase Console → your project → **Authentication → Sign-in method**
   - Enable **Google**
   - Enable **Email/Password**
2. **Authentication → Settings → Authorized domains** → add `thelevix.shop` and `www.thelevix.shop`.
3. Sign in on the site with **levixfashions@gmail.com via "Continue with Google"** — that account
   (Google-verified) automatically becomes the store admin. Nobody else can.
   To add more admins later, set `ADMIN_EMAILS=a@gmail.com,b@gmail.com`.

### b) Razorpay (real payments)
1. Razorpay Dashboard → **Settings → API Keys** → generate keys (use **Live** keys for real money).
2. **Settings → Webhooks → Add new webhook**
   - URL: `https://thelevix.shop/api/payments/webhook`
   - Secret: any long random text (copy it)
   - Events: `payment.captured`, `order.paid`, `payment.failed`
3. Put the three values in the root `.env` (or Hostinger → Node.js app → Environment variables):
   ```
   RAZORPAY_KEY_ID=rzp_live_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   RAZORPAY_WEBHOOK_SECRET=the-secret-you-typed
   ```
   Without these, checkout shows "Online payments are temporarily unavailable" (no fake orders).

### c) Environment variables (root `.env`)
| Variable | Example | Notes |
|---|---|---|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | `mysql://user:pass@localhost:3306/dbname` | Hostinger MySQL |
| `FRONTEND_URL` | `https://thelevix.shop` | |
| `FIREBASE_PROJECT_ID` | `levix-xxxx` | Enough to verify sign-ins |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | | see above |
| `ADMIN_EMAILS` | `levixfashions@gmail.com` | comma separated |

`frontend/.env` holds the public `VITE_FIREBASE_*` values and is only used when rebuilding the frontend.

---

## 2. Deploying an update

1. Upload / push the project (root `package.json`, `server.js`, `prisma/`, `frontend/dist/`).
2. Hostinger runs `npm install`. The `postinstall` step automatically runs
   `prisma generate` **and** `prisma db push`, which creates/updates the MySQL tables
   (adds the new columns/tables safely, never drops data).
   - If your plan has SSH you can also run it manually: `npm run db:push`
3. Start command: `npm start` (runs `node server.js`).
4. Check `https://thelevix.shop/api/health` → `{"status":"ok","database":"ok"}`.

On first boot the server creates the 3 default categories and the store-settings row automatically.

### Rebuilding after code changes (on your computer)
```bash
cd backend  && npm install && npm run bundle    # writes ../server.js
cd frontend && npm install && npm run build     # writes frontend/dist
```

---

## 3. After go-live checklist
- [ ] Sign in with Google as levixfashions@gmail.com → you land on `/admin`
- [ ] Admin → Products: if you see the yellow "Import" banner, click **Import Now** (moves products the old panel saved in your browser into the real database)
- [ ] Add product images by pasting their Hostinger image URLs
- [ ] Admin → Settings: check announcement text, shipping threshold/fee, support email/phone, category banners
- [ ] Place a ₹1–₹10 test order with a real UPI/card → it appears in Admin → Orders as PAID, stock goes down
- [ ] Refund that test payment from the Razorpay dashboard
