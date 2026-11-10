import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundApi } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';

const app = express();

// Hostinger (LiteSpeed / nginx) sits in front of Node — trust it so req.ip is the real visitor.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // CSP is left off because Razorpay Checkout and Firebase Auth load from many Google/Razorpay domains.
    contentSecurityPolicy: false,
    // Needed for Google sign-in popups and Razorpay checkout windows.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(compression());

const allowedOrigins = new Set(
  [env.FRONTEND_URL, 'https://thelevix.shop', 'https://www.thelevix.shop', 'http://localhost:5173', 'http://localhost:4173'].filter(
    Boolean
  )
);
app.use(
  '/api',
  cors({
    origin: (origin, callback) => {
      // Same-origin requests and server-to-server calls (Razorpay webhooks) have no Origin header.
      if (!origin || allowedOrigins.has(origin) || env.NODE_ENV !== 'production') return callback(null, true);
      return callback(null, false);
    },
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Anonymous-Token'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400
  })
);

app.use(
  express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf; // needed to verify Razorpay webhook signatures
    }
  })
);
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  let database = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'unavailable';
  }
  res.set('Cache-Control', 'no-store');
  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'degraded',
    database,
    service: 'levix',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime())
  });
});

app.use('/api', apiRateLimiter);
app.use('/api/store', storeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', notFoundApi);

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
const frontendDist =
  possiblePaths.find((p) => {
    try {
      return fs.existsSync(path.join(p, 'index.html'));
    } catch {
      return false;
    }
  }) || '';

if (frontendDist) {
  console.log(`✓ Serving storefront from: ${frontendDist}`);
  app.use(
    express.static(frontendDist, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('sw.js') || filePath.endsWith('index.html') || filePath.endsWith('manifest.json')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    })
  );
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    // Missing static files (old hashed assets etc.) should 404, not return the HTML page.
    if (/\.[a-z0-9]{2,5}$/i.test(req.path)) {
      res.status(404).end();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  console.warn('⚠️ frontend/dist not found. Checked:', possiblePaths);
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.status(503).send('<h1>LEVIX</h1><p>The store is being updated. Please refresh in a moment.</p>');
  });
}

app.use(errorHandler);

export { app };
export default app;
