import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { liveStream, liveVersion, broadcastChange } from './services/live.js';
import { razorpayMode, razorpayKeyCheck } from './config/razorpay.js';
import { renderPage } from './services/seo.js';
import { sendVerification, sendPasswordReset, authMailReady } from './controllers/authMailController.js';
import { authRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundApi } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import { serveMedia } from './controllers/mediaController.js';
import { asyncHandler } from './middleware/errorHandler.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
const app = express();
// Hostinger (LiteSpeed / nginx) sits in front of Node — trust it so req.ip is the real visitor.
app.set('trust proxy', 1);
app.disable('x-powered-by');
// ------------------------------------------------------------------------------------------
// Firebase Auth on our own domain: Google's sign-in screen says "continue to thelevix.shop".
// /__/auth/* and /__/firebase/* are passed straight through to Firebase's hosted auth helper.
// IMPORTANT: this runs BEFORE helmet — Firebase's helper pages must NOT get our
// Cross-Origin-Opener-Policy / Referrer-Policy headers, otherwise the Google popup loses
// contact with the page and sign-in reports "cancelled".
// ------------------------------------------------------------------------------------------
const FIREBASE_AUTH_HOST = `https://${env.FIREBASE_PROJECT_ID || 'levix-8bb56'}.firebaseapp.com`;
const readBody = (req) => new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
});
app.all(['/__/auth/*', '/__/firebase/*'], async (req, res) => {
    try {
        const headers = {};
        for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v !== 'string')
                continue;
            if (['host', 'connection', 'content-length', 'accept-encoding'].includes(k))
                continue;
            headers[k] = v;
        }
        const hasBody = !['GET', 'HEAD'].includes(req.method);
        const body = hasBody ? await readBody(req) : undefined;
        const upstream = await fetch(FIREBASE_AUTH_HOST + req.originalUrl, {
            method: req.method,
            headers,
            body: body && body.length ? new Uint8Array(body) : undefined,
            redirect: 'manual'
        });
        res.status(upstream.status);
        upstream.headers.forEach((value, key) => {
            if (['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(key))
                return;
            res.setHeader(key, value);
        });
        // Never let the CDN/browser cache sign-in pages.
        res.setHeader('Cache-Control', 'no-store');
        res.send(Buffer.from(await upstream.arrayBuffer()));
    }
    catch (err) {
        console.error('Auth proxy error:', err?.message);
        res.status(502).send('Sign-in service temporarily unavailable');
    }
});
app.use(helmet({
    // CSP is left off because Razorpay Checkout and Firebase Auth load from many Google/Razorpay domains.
    contentSecurityPolicy: false,
    // Needed for Google sign-in popups and Razorpay checkout windows.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Keep the same browsing setup as Firebase's sign-in helper pages.
    originAgentCluster: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(compression({ filter: (req, res) => !req.path.startsWith('/api/live') && compression.filter(req, res) }));
const allowedOrigins = new Set([env.FRONTEND_URL, 'https://thelevix.shop', 'https://www.thelevix.shop', 'http://localhost:5173', 'http://localhost:4173'].filter(Boolean));
app.use('/api', cors({
    origin: (origin, callback) => {
        // Same-origin requests and server-to-server calls (Razorpay webhooks) have no Origin header.
        if (!origin || allowedOrigins.has(origin) || env.NODE_ENV !== 'production')
            return callback(null, true);
        return callback(null, false);
    },
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Anonymous-Token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400
}));
app.use(express.json({
    limit: '1mb',
    verify: (req, _res, buf) => {
        req.rawBody = buf; // needed to verify Razorpay webhook signatures
    }
}));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.get('/api/health', async (_req, res) => {
    let database = 'ok';
    let databaseProblem;
    try {
        await prisma.$queryRaw `SELECT 1`;
        try {
            await prisma.storeSetting.count();
        }
        catch {
            database = 'unavailable';
            databaseProblem = 'connected, but tables are missing (they are created automatically on start-up; restart the app)';
        }
    }
    catch (err) {
        database = 'unavailable';
        const msg = String(err?.message || '');
        databaseProblem = !process.env.DATABASE_URL
            ? 'DATABASE_URL is not set'
            : /P1000|Authentication failed|Access denied/i.test(msg)
                ? 'wrong database username or password in DATABASE_URL'
                : /P1001|Can't reach|ECONNREFUSED|ETIMEDOUT/i.test(msg)
                    ? 'database server not reachable at the host in DATABASE_URL'
                    : /P1003|does not exist/i.test(msg)
                        ? 'database name in DATABASE_URL does not exist'
                        : 'database error';
    }
    const paymentsMode = razorpayMode();
    const paymentsKeys = paymentsMode === 'missing' ? 'missing' : await razorpayKeyCheck();
    res.set('Cache-Control', 'no-store');
    res.status(database === 'ok' ? 200 : 503).json({
        status: database === 'ok' ? 'ok' : 'degraded',
        database,
        ...(databaseProblem ? { databaseProblem } : {}),
        payments: paymentsKeys === 'ok',
        paymentsMode, // test | live | invalid | missing
        paymentsKeys, // ok | keys-rejected | unreachable | missing
        webhook: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
        signIn: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID),
        emails: authMailReady(),
        service: 'levix',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime())
    });
});
app.get('/api/live', liveStream);
app.get('/api/live/version', liveVersion);
app.use('/api', apiRateLimiter);
app.use('/api/store', storeRoutes);
app.post('/api/auth-mail/verify', authRateLimiter, asyncHandler(sendVerification));
app.post('/api/auth-mail/reset', authRateLimiter, asyncHandler(sendPasswordReset));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/cart', cartRoutes);
// Orders and payments change stock levels — push that live too (so sold-out sizes update instantly).
app.use(['/api/orders', '/api/payments'], (req, res, next) => {
    if (req.method === 'POST')
        res.on('finish', () => res.statusCode < 400 && broadcastChange('stock'));
    next();
});
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', notFoundApi);
// Uploaded images (stored in MySQL)
app.get('/media/:file', asyncHandler(serveMedia));
/* sitemap.xml — every live product (with its photos), collection, category and policy page, for Google */
app.get('/sitemap.xml', asyncHandler(async (_req, res) => {
    const base = (process.env.FRONTEND_URL || 'https://thelevix.shop').replace(/\/+$/, '');
    const [products, collections, categories] = await Promise.all([
        prisma.product.findMany({
            where: { isActive: true },
            orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
            select: { slug: true, name: true, updatedAt: true, images: { orderBy: { sortOrder: 'asc' }, take: 8, select: { url: true } } }
        }),
        prisma.collection.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
        prisma.category.findMany({ select: { slug: true, updatedAt: true } })
    ]);
    const esc = (v) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const abs = (u) => {
        const c = u.split('#')[0];
        return /^https?:\/\//i.test(c) ? c : `${base}${c.startsWith('/') ? '' : '/'}${c}`;
    };
    const day = (d) => d.toISOString().slice(0, 10);
    const today = day(new Date());
    const fixed = [
        ['/', 'daily', '1.0'],
        ['/collections', 'weekly', '0.8'],
        ['/collections/all-products', 'daily', '0.9'],
        ['/collections/new-in', 'daily', '0.8'],
        ['/collections/men', 'daily', '0.8'],
        ['/collections/women', 'daily', '0.8'],
        ['/pages/about', 'monthly', '0.4'],
        ['/pages/track', 'monthly', '0.3'],
        ['/policies/shipping-policy', 'monthly', '0.4'],
        ['/policies/refund-policy', 'monthly', '0.4'],
        ['/policies/terms-of-service', 'yearly', '0.3'],
        ['/policies/privacy-policy', 'yearly', '0.3'],
        ['/policies/contact', 'monthly', '0.4']
    ];
    const urls = [
        ...fixed.map(([u, f, p]) => `<url><loc>${base}${u}</loc><lastmod>${today}</lastmod><changefreq>${f}</changefreq><priority>${p}</priority></url>`),
        ...[...collections, ...categories].map((c) => `<url><loc>${base}/collections/${esc(c.slug)}</loc><lastmod>${day(c.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`),
        ...products.map((p) => `<url><loc>${base}/products/${esc(p.slug)}</loc><lastmod>${day(p.updatedAt)}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority>${p.images
            .map((i) => `<image:image><image:loc>${esc(abs(i.url))}</image:loc><image:title>${esc(p.name)}</image:title></image:image>`)
            .join('')}</url>`)
    ];
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls.join('')}</urlset>`);
}));
// ------------------------------------------------------------------------------------------
// Serve the React storefront (frontend/dist) with proper caching
// ------------------------------------------------------------------------------------------
const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const possiblePaths = [
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(currentDir, 'frontend/dist'),
    path.resolve(currentDir, '../frontend/dist'),
    path.resolve(currentDir, '../../frontend/dist'),
    path.resolve(process.cwd(), 'dist')
];
const frontendDist = possiblePaths.find((p) => {
    try {
        return fs.existsSync(path.join(p, 'index.html'));
    }
    catch {
        return false;
    }
}) || '';
if (frontendDist) {
    console.log(`✓ Serving storefront from: ${frontendDist}`);
    app.use(express.static(frontendDist, {
        index: false,
        setHeaders: (res, filePath) => {
            if (filePath.includes(`${path.sep}assets${path.sep}`)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
            else if (filePath.endsWith('sw.js') || filePath.endsWith('index.html') || filePath.endsWith('manifest.json')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
            else {
                res.setHeader('Cache-Control', 'public, max-age=86400');
            }
        }
    }));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api'))
            return next();
        // Missing static files (old hashed assets etc.) should 404, not return the HTML page.
        if (/\.[a-z0-9]{2,5}$/i.test(req.path)) {
            res.status(404).end();
            return;
        }
        res.setHeader('Cache-Control', 'no-cache');
        // Page-specific SEO (title, description, social previews, structured data) baked into the HTML.
        renderPage(path.join(frontendDist, 'index.html'), req.path)
            .then(({ status, html }) => {
            res.status(status).type('html').send(html);
        })
            .catch(() => res.sendFile(path.join(frontendDist, 'index.html')));
    });
}
else {
    console.warn('⚠️ frontend/dist not found. Checked:', possiblePaths);
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api'))
            return next();
        res.status(503).send('<h1>LEVIX</h1><p>The store is being updated. Please refresh in a moment.</p>');
    });
}
app.use(errorHandler);
export { app };
export default app;
