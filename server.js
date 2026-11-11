var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  default: () => server_default,
  serverInstance: () => serverInstance
});
module.exports = __toCommonJS(server_exports);

// src/app.ts
var import_express10 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_compression = __toESM(require("compression"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs3 = __toESM(require("fs"), 1);

// src/config/env.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_zod = require("zod");
import_dotenv.default.config();
var envSchema = import_zod.z.object({
  NODE_ENV: import_zod.z.string().default("production"),
  PORT: import_zod.z.union([import_zod.z.string(), import_zod.z.number()]).optional(),
  DATABASE_URL: import_zod.z.string().optional().default(""),
  FRONTEND_URL: import_zod.z.string().optional().default("https://thelevix.shop"),
  // Comma separated list of owner/admin emails (must be Firebase-verified emails)
  ADMIN_EMAILS: import_zod.z.string().optional().default("levixfashions@gmail.com"),
  // Firebase Admin (only the project id is required to verify ID tokens)
  FIREBASE_PROJECT_ID: import_zod.z.string().optional(),
  VITE_FIREBASE_PROJECT_ID: import_zod.z.string().optional(),
  FIREBASE_CLIENT_EMAIL: import_zod.z.string().optional(),
  FIREBASE_PRIVATE_KEY: import_zod.z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: import_zod.z.string().optional(),
  // Razorpay
  RAZORPAY_KEY_ID: import_zod.z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: import_zod.z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: import_zod.z.string().optional().default("")
}).passthrough();
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.warn("\u26A0\uFE0F Environment configuration warning:", parsed.error.format());
}
var data = parsed.success ? parsed.data : process.env;
var env = {
  NODE_ENV: String(data.NODE_ENV || "production"),
  DATABASE_URL: String(data.DATABASE_URL || ""),
  FRONTEND_URL: String(data.FRONTEND_URL || "https://thelevix.shop").replace(/\/+$/, ""),
  ADMIN_EMAILS: String(data.ADMIN_EMAILS || "levixfashions@gmail.com").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
  FIREBASE_PROJECT_ID: data.FIREBASE_PROJECT_ID || data.VITE_FIREBASE_PROJECT_ID || "",
  FIREBASE_CLIENT_EMAIL: data.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: data.FIREBASE_PRIVATE_KEY,
  FIREBASE_SERVICE_ACCOUNT_PATH: data.FIREBASE_SERVICE_ACCOUNT_PATH,
  RAZORPAY_KEY_ID: String(data.RAZORPAY_KEY_ID || ""),
  RAZORPAY_KEY_SECRET: String(data.RAZORPAY_KEY_SECRET || ""),
  RAZORPAY_WEBHOOK_SECRET: String(data.RAZORPAY_WEBHOOK_SECRET || "")
};
var isProduction = env.NODE_ENV === "production";
function isAdminEmail(email) {
  if (!email) return false;
  return env.ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// src/config/db.ts
var import_client = require("@prisma/client");
var globalForPrisma = globalThis;
var prisma = globalForPrisma.__levixPrisma ?? new import_client.PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
});
globalForPrisma.__levixPrisma = prisma;

// src/middleware/rateLimiter.ts
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var apiRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  max: 900,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a few minutes and try again." }
});
var authRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many account requests. Please try again later." }
});
var checkoutRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 10 * 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please wait a few minutes." }
});

// src/middleware/errorHandler.ts
var import_zod2 = require("zod");
var import_client2 = require("@prisma/client");
var AppError = class _AppError extends Error {
  statusCode;
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, _AppError.prototype);
  }
};
function notFoundApi(req, res) {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
}
function errorHandler(err, req, res, _next) {
  if (err instanceof import_zod2.ZodError) {
    const first = err.errors[0];
    res.status(400).json({
      error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Validation error",
      details: err.errors.map((e) => ({ field: e.path.join("."), message: e.message }))
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  if (err instanceof import_client2.Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = err.meta?.target;
      res.status(409).json({ error: `A record with this ${Array.isArray(target) ? target.join(", ") : target || "value"} already exists` });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "The requested record was not found" });
      return;
    }
    if (err.code === "P2003") {
      res.status(400).json({ error: "This record is linked to other data and cannot be changed that way" });
      return;
    }
  }
  if (err instanceof import_client2.Prisma.PrismaClientInitializationError) {
    console.error("Database unavailable:", err.message);
    res.status(503).json({ error: "Store database is temporarily unavailable. Please try again shortly." });
    return;
  }
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({
    error: "Something went wrong on our side. Please try again.",
    ...process.env.NODE_ENV === "development" ? { message: err?.message } : {}
  });
}
var asyncHandler = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

// src/routes/authRoutes.ts
var import_express = require("express");

// src/middleware/verifyFirebaseToken.ts
var import_client3 = require("@prisma/client");

// src/config/firebase-admin.ts
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_fs = __toESM(require("fs"), 1);
var firebaseApp = null;
function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;
  if (import_firebase_admin.default.apps.length > 0 && import_firebase_admin.default.apps[0]) {
    firebaseApp = import_firebase_admin.default.apps[0];
    return firebaseApp;
  }
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH && import_fs.default.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = JSON.parse(import_fs.default.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
    firebaseApp = import_firebase_admin.default.initializeApp({ credential: import_firebase_admin.default.credential.cert(serviceAccount) });
    console.log("\u2713 Firebase Admin initialised with service account file.");
    return firebaseApp;
  }
  const privateKey = (env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const keyLooksValid = privateKey.includes("-----BEGIN PRIVATE KEY-----") && privateKey.length > 1e3;
  if (env.FIREBASE_PRIVATE_KEY && !keyLooksValid) {
    console.warn("\u26A0\uFE0F FIREBASE_PRIVATE_KEY looks like a placeholder \u2014 ignoring it and verifying tokens with the project id only.");
  }
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && keyLooksValid) {
    firebaseApp = import_firebase_admin.default.initializeApp({
      credential: import_firebase_admin.default.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
    console.log("\u2713 Firebase Admin initialised with service account credentials.");
    return firebaseApp;
  }
  if (!env.FIREBASE_PROJECT_ID) {
    throw new Error("FIREBASE_PROJECT_ID is not configured \u2014 cannot verify sign-in tokens.");
  }
  firebaseApp = import_firebase_admin.default.initializeApp({ projectId: env.FIREBASE_PROJECT_ID });
  console.log(`\u2713 Firebase Admin initialised for token verification (project: ${env.FIREBASE_PROJECT_ID}).`);
  return firebaseApp;
}
var adminAuth = () => getFirebaseAdmin().auth();

// src/middleware/verifyFirebaseToken.ts
var USER_CACHE_TTL_MS = 5 * 60 * 1e3;
var userCache = /* @__PURE__ */ new Map();
function extractBearer(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}
async function syncUser(decoded) {
  const uid = decoded.uid;
  const email = (decoded.email || `${uid}@users.thelevix.shop`).trim().toLowerCase();
  const emailVerified = Boolean(decoded.email_verified);
  const role = emailVerified && isAdminEmail(email) ? import_client3.Role.ADMIN : import_client3.Role.CUSTOMER;
  const cacheKey = `${uid}:${email}:${role}`;
  const cached = userCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.user;
  let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { firebaseUid: uid, role, ...decoded.name && !byEmail.name ? { name: decoded.name } : {} }
      });
    } else {
      user = await prisma.user.create({
        data: { firebaseUid: uid, email, name: decoded.name || null, role }
      });
    }
  } else if (user.email !== email || user.role !== role || !user.name && decoded.name) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { email, role, ...!user.name && decoded.name ? { name: decoded.name } : {} }
    });
  }
  const authUser = {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified
  };
  userCache.set(cacheKey, { user: authUser, expires: Date.now() + USER_CACHE_TTL_MS });
  if (userCache.size > 5e3) {
    const now = Date.now();
    for (const [k, v] of userCache) if (v.expires < now) userCache.delete(k);
  }
  return authUser;
}
async function verifyFirebaseToken(req, res, next) {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch (err) {
    res.status(401).json({ error: "Your session has expired. Please sign in again." });
    return;
  }
  try {
    req.user = await syncUser(decoded);
    next();
  } catch (err) {
    next(err);
  }
}
async function optionalAuth(req, _res, next) {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    const decoded = await adminAuth().verifyIdToken(token);
    req.user = await syncUser(decoded);
  } catch {
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  if (req.user.role !== import_client3.Role.ADMIN || !req.user.emailVerified || !isAdminEmail(req.user.email)) {
    res.status(403).json({ error: "Admin access is restricted to the store owner." });
    return;
  }
  next();
}

// src/controllers/authController.ts
var import_zod3 = require("zod");
var phoneSchema = import_zod3.z.string().trim().transform((v) => v.replace(/[\s-]/g, "")).refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number");
var addressSchema = import_zod3.z.object({
  fullName: import_zod3.z.string().trim().min(2).max(100),
  line1: import_zod3.z.string().trim().min(3).max(200),
  line2: import_zod3.z.string().trim().max(200).optional().or(import_zod3.z.literal("")).transform((v) => v || void 0),
  city: import_zod3.z.string().trim().min(2).max(80),
  state: import_zod3.z.string().trim().min(2).max(80),
  postalCode: import_zod3.z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code"),
  country: import_zod3.z.string().trim().default("India"),
  phone: phoneSchema,
  isDefault: import_zod3.z.boolean().default(false)
});
async function getProfile(req, res) {
  if (!req.user) throw new AppError("Please sign in to continue.", 401);
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      _count: { select: { orders: true, reviews: true } }
    }
  });
  if (!user) throw new AppError("Profile not found", 404);
  res.set("Cache-Control", "no-store");
  res.json({ user: { ...user, emailVerified: req.user.emailVerified } });
}
async function updateProfile(req, res) {
  if (!req.user) throw new AppError("Please sign in to continue.", 401);
  const { name, phone } = import_zod3.z.object({
    name: import_zod3.z.string().trim().min(2).max(100).optional(),
    phone: phoneSchema.optional()
  }).parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...name ? { name } : {}, ...phone ? { phone } : {} }
  });
  res.json({ user });
}
async function addAddress(req, res) {
  if (!req.user) throw new AppError("Please sign in to continue.", 401);
  const data2 = addressSchema.parse(req.body);
  const count = await prisma.address.count({ where: { userId: req.user.id } });
  if (count >= 10) throw new AppError("You can save up to 10 addresses", 400);
  const makeDefault = data2.isDefault || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
    }
    return tx.address.create({ data: { ...data2, isDefault: makeDefault, userId: req.user.id } });
  });
  res.status(201).json({ address });
}
async function setDefaultAddress(req, res) {
  if (!req.user) throw new AppError("Please sign in to continue.", 401);
  const address = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!address) throw new AppError("Address not found", 404);
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: address.id }, data: { isDefault: true } })
  ]);
  res.json({ success: true });
}
async function deleteAddress(req, res) {
  if (!req.user) throw new AppError("Please sign in to continue.", 401);
  await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
  res.json({ success: true });
}

// src/routes/authRoutes.ts
var router = (0, import_express.Router)();
router.use(authRateLimiter);
router.use(verifyFirebaseToken);
router.get("/profile", asyncHandler(getProfile));
router.put("/profile", asyncHandler(updateProfile));
router.post("/addresses", asyncHandler(addAddress));
router.patch("/addresses/:id/default", asyncHandler(setDefaultAddress));
router.delete("/addresses/:id", asyncHandler(deleteAddress));
var authRoutes_default = router;

// src/routes/productRoutes.ts
var import_express2 = require("express");

// src/utils/serialize.ts
var SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL"];
function sizeRank(size) {
  const idx = SIZE_ORDER.indexOf(size.toUpperCase());
  if (idx !== -1) return idx;
  const n = Number(size);
  return Number.isFinite(n) ? 100 + n : 1e3;
}
function sortVariants(variants = []) {
  const colorOrder = /* @__PURE__ */ new Map();
  [...variants].sort((a, b) => a.createdAt && b.createdAt ? +a.createdAt - +b.createdAt : 0).forEach((v) => {
    const k = (v.color || "").toLowerCase();
    if (!colorOrder.has(k)) colorOrder.set(k, colorOrder.size);
  });
  return [...variants].sort(
    (a, b) => (colorOrder.get((a.color || "").toLowerCase()) ?? 0) - (colorOrder.get((b.color || "").toLowerCase()) ?? 0) || sizeRank(a.size) - sizeRank(b.size)
  );
}
function genderFilter(value) {
  const v = String(value || "").toLowerCase();
  if (v === "men") return { gender: { in: ["MEN", "UNISEX"] } };
  if (v === "women") return { gender: { in: ["WOMEN", "UNISEX"] } };
  return null;
}
function serializeProduct(p) {
  if (!p) return p;
  return {
    ...p,
    images: [...p.images || []].sort((a, b) => a.sortOrder - b.sortOrder),
    variants: sortVariants(p.variants || [])
  };
}
function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}
var productListInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" }, take: 8 },
  variants: {
    select: { id: true, productId: true, size: true, color: true, colorHex: true, sku: true, stockQuantity: true, priceDelta: true, createdAt: true }
  }
};
var productFullInclude = {
  category: true,
  images: { orderBy: { sortOrder: "asc" } },
  variants: true
};

// src/controllers/productController.ts
function buildOrderBy(sort) {
  switch (sort) {
    case "price-asc":
      return { basePrice: "asc" };
    case "price-desc":
      return { basePrice: "desc" };
    case "name-asc":
      return { name: "asc" };
    case "newest":
      return { createdAt: "desc" };
    case "featured":
    default:
      return [{ isFeatured: "desc" }, { createdAt: "desc" }];
  }
}
async function getProducts(req, res) {
  const { category, collection, search, sort, featured, gender } = req.query;
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "24"), 10) || 24));
  const skip = (page - 1) * take;
  const where = { isActive: true };
  const catSlug = category || collection;
  const g = genderFilter(gender || (catSlug === "men" || catSlug === "women" ? catSlug : ""));
  if (g) Object.assign(where, g);
  if (catSlug && !["all", "all-products", "new-in", "men", "women"].includes(catSlug)) {
    where.OR = [
      { category: { slug: catSlug } },
      { collections: { some: { collection: { slug: catSlug, isActive: true } } } }
    ];
  }
  if (featured === "true") where.isFeatured = true;
  const and = [];
  const sizes = String(req.query.sizes || "").split(",").map((v) => v.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  const inStock = req.query.inStock === "true";
  if (sizes.length || inStock) {
    and.push({
      variants: {
        some: {
          ...sizes.length ? { size: { in: sizes } } : {},
          ...inStock ? { stockQuantity: { gt: 0 } } : {}
        }
      }
    });
  }
  const colors = String(req.query.colors || "").split(",").map((v) => v.trim().toUpperCase()).filter(Boolean).slice(0, 20);
  if (colors.length) and.push({ colorGroup: { in: colors } });
  const minPrice = parseInt(String(req.query.minPrice || ""), 10);
  const maxPrice = parseInt(String(req.query.maxPrice || ""), 10);
  if (Number.isFinite(minPrice) && minPrice > 0) and.push({ basePrice: { gte: minPrice } });
  if (Number.isFinite(maxPrice) && maxPrice > 0) and.push({ basePrice: { lte: maxPrice } });
  if (and.length) where.AND = [...Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [], ...and];
  if (search && search.trim()) {
    const q = search.trim().slice(0, 100);
    const searchOr = [
      { name: { contains: q } },
      { description: { contains: q } },
      { slug: { contains: q } },
      { category: { name: { contains: q } } }
    ];
    where.AND = [...Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [], { OR: searchOr }];
  }
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy: buildOrderBy(sort), skip, take, include: productListInclude })
  ]);
  res.set("Cache-Control", "public, max-age=30");
  res.json({
    products: products.map(serializeProduct),
    pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) }
  });
}
async function getProductBySlug(req, res) {
  const { slug } = req.params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      ...productFullInclude,
      reviews: { where: { isApproved: true }, orderBy: { createdAt: "desc" }, take: 10 }
    }
  });
  if (!product || !product.isActive) {
    throw new AppError("This product is no longer available", 404);
  }
  const relatedProducts = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      isActive: true,
      ...product.categoryId ? { categoryId: product.categoryId } : {},
      ...product.gender === "MEN" ? genderFilter("men") : product.gender === "WOMEN" ? genderFilter("women") : {}
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 4,
    include: productListInclude
  });
  res.set("Cache-Control", "public, max-age=30");
  res.json({ product: serializeProduct(product), relatedProducts: relatedProducts.map(serializeProduct) });
}
async function getCategories(_req, res) {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { isActive: true } } } } }
  });
  res.set("Cache-Control", "public, max-age=60");
  res.json({ categories });
}
async function getFilterOptions(_req, res) {
  const [variants, colors, agg] = await Promise.all([
    prisma.productVariant.findMany({ where: { product: { isActive: true } }, distinct: ["size"], select: { size: true } }),
    prisma.product.findMany({ where: { isActive: true, colorGroup: { not: null } }, distinct: ["colorGroup"], select: { colorGroup: true } }),
    prisma.product.aggregate({ where: { isActive: true }, _min: { basePrice: true }, _max: { basePrice: true } })
  ]);
  const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  res.set("Cache-Control", "public, max-age=60");
  res.json({
    sizes: variants.map((v) => v.size).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99)),
    colors: colors.map((c) => c.colorGroup).filter(Boolean),
    minPrice: agg._min.basePrice || 0,
    maxPrice: agg._max.basePrice || 0
  });
}

// src/routes/productRoutes.ts
var router2 = (0, import_express2.Router)();
router2.get("/", asyncHandler(getProducts));
router2.get("/filters/options", asyncHandler(getFilterOptions));
router2.get("/:slug", asyncHandler(getProductBySlug));
var productRoutes_default = router2;

// src/routes/collectionRoutes.ts
var import_express3 = require("express");

// src/controllers/collectionController.ts
function orderByFor(sort) {
  switch (sort) {
    case "price-asc":
      return { basePrice: "asc" };
    case "price-desc":
      return { basePrice: "desc" };
    case "newest":
      return { createdAt: "desc" };
    default:
      return [{ isFeatured: "desc" }, { createdAt: "desc" }];
  }
}
async function getCollections(_req, res) {
  const [collections, categories] = await Promise.all([
    prisma.collection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { products: true } } }
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { isActive: true } } } } }
    })
  ]);
  const curated = collections.map((c) => ({
    id: c.id,
    type: "collection",
    name: c.name,
    slug: c.slug,
    description: c.description,
    bannerImageUrl: c.bannerImageUrl,
    mobileBannerUrl: c.mobileBannerUrl,
    _count: { products: c._count.products }
  }));
  const seen = new Set(curated.map((c) => c.slug));
  const cats = categories.filter((c) => !seen.has(c.slug)).map((c) => ({
    id: c.id,
    type: "category",
    name: c.name,
    slug: c.slug,
    description: c.description,
    bannerImageUrl: c.imageUrl,
    group: c.group,
    _count: { products: c._count.products }
  }));
  res.set("Cache-Control", "public, max-age=60");
  res.json({ collections: [...curated, ...cats] });
}
async function getCollectionBySlug(req, res) {
  const { slug } = req.params;
  const sort = String(req.query.sort || "featured");
  const g = genderFilter(req.query.gender);
  const matchesGender = (p) => !g || g.gender.in.includes(p.gender || "UNISEX");
  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: { product: { include: productListInclude } }
      }
    }
  });
  if (collection && collection.isActive) {
    let products2 = collection.products.map((cp) => cp.product).filter((p) => p.isActive && matchesGender(p));
    if (sort === "price-asc") products2 = products2.sort((a, b) => a.basePrice - b.basePrice);
    else if (sort === "price-desc") products2 = products2.sort((a, b) => b.basePrice - a.basePrice);
    else if (sort === "newest") products2 = products2.sort((a, b) => +b.createdAt - +a.createdAt);
    res.json({
      collection: {
        id: collection.id,
        type: "collection",
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        bannerImageUrl: collection.bannerImageUrl,
        mobileBannerUrl: collection.mobileBannerUrl
      },
      products: products2.map(serializeProduct)
    });
    return;
  }
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category && (slug === "men" || slug === "women")) {
    const dept = genderFilter(slug);
    const products2 = await prisma.product.findMany({
      where: { isActive: true, ...dept },
      orderBy: orderByFor(sort),
      take: 300,
      include: productListInclude
    });
    res.json({
      collection: { id: slug, type: "department", name: slug === "men" ? "Men" : "Women", slug, description: null, bannerImageUrl: null },
      products: products2.map(serializeProduct)
    });
    return;
  }
  if (!category) throw new AppError("Collection not found", 404);
  const products = await prisma.product.findMany({
    where: { isActive: true, categoryId: category.id, ...g || {} },
    orderBy: orderByFor(sort),
    take: 200,
    include: productListInclude
  });
  res.json({
    collection: {
      id: category.id,
      type: "category",
      name: category.name,
      slug: category.slug,
      description: category.description,
      bannerImageUrl: category.imageUrl,
      group: category.group
    },
    products: products.map(serializeProduct)
  });
}

// src/routes/collectionRoutes.ts
var router3 = (0, import_express3.Router)();
router3.get("/", asyncHandler(getCollections));
router3.get("/:slug", asyncHandler(getCollectionBySlug));
var collectionRoutes_default = router3;

// src/routes/cartRoutes.ts
var import_express4 = require("express");

// src/controllers/cartController.ts
var import_zod4 = require("zod");

// src/services/store.ts
var DEFAULT_SETTINGS = {
  announcementText: "FREE DELIVERY ON ALL ORDERS \u2022 THE 1ST DROP IS LIVE \u2022 SECURE CHECKOUT \u2022 ",
  heroHeadline: "STREETWEAR ARCHITECTURE",
  heroSubtitle: "Heavyweight Custom-Milled Silhouettes & Limited Private Drops.",
  supportEmail: "levixfashions@gmail.com",
  supportPhone: "",
  instagramHandle: "thelevix.shop",
  freeShippingThreshold: 0,
  shippingFee: 150,
  announcementEnabled: false,
  heroDesktopImage: "",
  heroMobileImage: "",
  heroDesktopVideo: "",
  heroMobileVideo: "",
  legalName: "LEVIX",
  businessAddress: "",
  grievanceOfficer: "",
  gstin: "",
  jurisdictionCity: "",
  codEnabled: false,
  codFee: 0,
  codMaxOrder: 0,
  heroLink: "/collections/all-products",
  heroCtaText: "Shop now",
  latestDropTitle: "Latest drop",
  seoTitle: "Feel the Luxury of Premium Streetwear with LEVIX",
  seoText: "LEVIX is an independent streetwear label built around heavyweight fabrics, oversized silhouettes and limited drops. Every piece is designed to drape well, last long and look better with every wear.",
  shippingInfo: "Free delivery pan-India on every order, no minimum.\nDispatched within 1\u20133 business days.\nTracking shared as soon as your order ships.",
  careInfo: "Wash cold, inside out.\nDo not bleach.\nDo not tumble dry.\nIron on reverse, avoiding prints."
};
var DEFAULT_CATEGORIES = [
  {
    name: "Overlength T-Shirts",
    slug: "overlength-t-shirts",
    description: "Elongated drape and dropped-shoulder streetwear silhouettes cut from heavyweight combed cotton.",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1400&q=80",
    sortOrder: 0,
    group: "TOP"
  },
  {
    name: "Waffle Boxy Fit Full Sleeves",
    slug: "waffle-boxy-fit-full-sleeves",
    description: "Heavyweight thermal waffle-knit long sleeves with an exaggerated boxy fit.",
    imageUrl: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=1400&q=80",
    sortOrder: 1,
    group: "TOP"
  },
  {
    name: "Acid Wash T-Shirts",
    slug: "acid-wash-t-shirts",
    description: "Vintage hand-treated mineral and acid wash tees with a lived-in finish.",
    imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1400&q=80",
    sortOrder: 2,
    group: "TOP"
  }
];
var cache = null;
var CACHE_MS = 30 * 1e3;
function toPublic(row) {
  const out = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const v = row?.[key];
    out[key] = v === null || v === void 0 ? DEFAULT_SETTINGS[key] : v;
  }
  return out;
}
async function getSettings() {
  if (cache && cache.expires > Date.now()) return cache.value;
  const row = await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", ...DEFAULT_SETTINGS }
  });
  const value = toPublic(row);
  cache = { value, expires: Date.now() + CACHE_MS };
  return value;
}
async function saveSettings(data2) {
  const row = await prisma.storeSetting.upsert({
    where: { id: "default" },
    update: data2,
    create: { id: "default", ...DEFAULT_SETTINGS, ...data2 }
  });
  const value = toPublic(row);
  cache = { value, expires: Date.now() + CACHE_MS };
  return value;
}
function calculateShippingPaise(subtotalPaise, settings) {
  if (subtotalPaise <= 0) return 0;
  const threshold = Math.max(0, settings.freeShippingThreshold) * 100;
  if (threshold === 0 || subtotalPaise >= threshold) return 0;
  return Math.max(0, settings.shippingFee) * 100;
}
var DEFAULT_DROPS = [
  { slug: "first-drop", name: "1st Drop", sortOrder: 0 },
  { slug: "second-drop", name: "2nd Drop", sortOrder: 1 },
  { slug: "third-drop", name: "3rd Drop", sortOrder: 2 }
];
async function ensureStoreDefaults() {
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  await getSettings();
  const row = await prisma.storeSetting.findUnique({ where: { id: "default" }, select: { defaultsVersion: true } });
  if ((row?.defaultsVersion ?? 0) < 1) {
    for (const d of DEFAULT_DROPS) {
      const exists = await prisma.collection.findUnique({ where: { slug: d.slug } });
      if (!exists) {
        await prisma.collection.create({
          data: { ...d, homeLayout: "CAROUSEL", showInMenu: true, showInGallery: false, isActive: true }
        });
      }
    }
    await prisma.storeSetting.update({ where: { id: "default" }, data: { defaultsVersion: 1 } });
    console.log("\u2713 Created default drop collections (1st, 2nd, 3rd Drop).");
  }
  if ((row?.defaultsVersion ?? 0) < 2) {
    const current = await prisma.storeSetting.findUnique({ where: { id: "default" }, select: { announcementText: true } });
    const text = current?.announcementText || "";
    if (/EXCHANGE/i.test(text)) {
      const cleaned = text.split("\u2022").map((part) => part.trim()).filter((part) => part && !/EXCHANGE/i.test(part)).join(" \u2022 ");
      await prisma.storeSetting.update({ where: { id: "default" }, data: { announcementText: cleaned ? `${cleaned} \u2022 ` : "" } });
    }
    await prisma.storeSetting.update({ where: { id: "default" }, data: { defaultsVersion: 2 } });
  }
  if ((row?.defaultsVersion ?? 0) < 3) {
    const cur = await prisma.storeSetting.findUnique({ where: { id: "default" }, select: { announcementText: true, shippingInfo: true } });
    const ann = (cur?.announcementText || "").split("\u2022").map((part) => part.trim()).filter((part) => part && !/(SHIPPING|DELIVERY)/i.test(part));
    const info = (cur?.shippingInfo || "").split("\n").map((l) => l.trim()).filter((l) => l && !/free[- ](delivery|shipping)/i.test(l));
    await prisma.storeSetting.update({
      where: { id: "default" },
      data: {
        freeShippingThreshold: 0,
        announcementText: ["FREE DELIVERY ON ALL ORDERS", ...ann].join(" \u2022 ") + " \u2022 ",
        shippingInfo: ["Free delivery pan-India on every order, no minimum.", ...info].join("\n"),
        defaultsVersion: 3
      }
    });
    cache = null;
    console.log("\u2713 Free delivery on all orders switched on.");
  }
}

// src/controllers/cartController.ts
var cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      variant: {
        include: {
          product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 30 } } }
        }
      }
    }
  }
};
function imageForColor(images, color) {
  if (color) {
    const match = images.find((i) => i.color && i.color.toLowerCase() === color.toLowerCase());
    if (match) return match.url;
  }
  return images.find((i) => !i.color)?.url || images[0]?.url || null;
}
var ANON_TOKEN_RE = /^[A-Za-z0-9_-]{16,80}$/;
function getAnonymousToken(req) {
  const raw = req.headers["x-anonymous-token"] || (req.body && typeof req.body.anonymousToken === "string" ? req.body.anonymousToken : void 0) || (typeof req.query.anonymousToken === "string" ? req.query.anonymousToken : void 0);
  if (!raw) return void 0;
  const token = String(raw).trim();
  return ANON_TOKEN_RE.test(token) ? token : void 0;
}
async function resolveCart(userId, anonymousToken) {
  if (userId) {
    let cart = await prisma.cart.findUnique({ where: { userId }, include: cartInclude });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId }, include: cartInclude });
    }
    if (anonymousToken) {
      const guestCart = await prisma.cart.findUnique({ where: { anonymousToken }, include: { items: true } });
      if (guestCart && guestCart.id !== cart.id) {
        if (guestCart.items.length > 0) {
          for (const item of guestCart.items) {
            const existing = cart.items.find((i) => i.variantId === item.variantId);
            if (existing) {
              await prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: Math.max(existing.quantity, item.quantity) }
              });
            } else {
              await prisma.cartItem.create({ data: { cartId: cart.id, variantId: item.variantId, quantity: item.quantity } });
            }
          }
        }
        await prisma.cart.delete({ where: { id: guestCart.id } }).catch(() => void 0);
        cart = await prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: cartInclude });
      }
    }
    return cart;
  }
  if (anonymousToken) {
    let cart = await prisma.cart.findUnique({ where: { anonymousToken }, include: cartInclude });
    if (!cart) {
      cart = await prisma.cart.create({ data: { anonymousToken }, include: cartInclude });
    }
    return cart;
  }
  throw new AppError("Cart session missing. Please refresh the page.", 400);
}
async function formatCart(cart) {
  const settings = await getSettings();
  let subtotalPaise = 0;
  const items = cart.items.filter((item) => item.variant && item.variant.product && item.variant.product.isActive).map((item) => {
    const unitPrice = item.variant.product.basePrice + item.variant.priceDelta;
    const total = unitPrice * item.quantity;
    subtotalPaise += total;
    return {
      id: item.id,
      variantId: item.variantId,
      quantity: item.quantity,
      size: item.variant.size,
      color: item.variant.color,
      colorHex: item.variant.colorHex,
      stockQuantity: item.variant.stockQuantity,
      productId: item.variant.product.id,
      productName: item.variant.product.name,
      productSlug: item.variant.product.slug,
      unitPricePaise: unitPrice,
      totalPaise: total,
      imageUrl: imageForColor(item.variant.product.images, item.variant.color)
    };
  });
  const shippingPaise = calculateShippingPaise(subtotalPaise, settings);
  const threshold = settings.shippingFee > 0 ? Math.max(0, settings.freeShippingThreshold) * 100 : 0;
  return {
    cartId: cart.id,
    items,
    itemCount: items.reduce((acc, it) => acc + it.quantity, 0),
    subtotalPaise,
    shippingPaise,
    totalPaise: subtotalPaise + shippingPaise,
    freeShippingThresholdPaise: threshold,
    remainingForFreeShippingPaise: Math.max(0, threshold - subtotalPaise)
  };
}
async function sendCart(req, res) {
  const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
  res.set("Cache-Control", "no-store");
  res.json(await formatCart(cart));
}
async function getCart(req, res) {
  await sendCart(req, res);
}
var addToCartSchema = import_zod4.z.object({
  variantId: import_zod4.z.string().min(1).max(64),
  quantity: import_zod4.z.number().int().min(1).max(20).default(1)
});
async function addToCart(req, res) {
  const { variantId, quantity } = addToCartSchema.parse(req.body);
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } });
  if (!variant || !variant.product.isActive) {
    throw new AppError("This size is no longer available", 404);
  }
  const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
  const existing = cart.items.find((i) => i.variantId === variantId);
  const newQuantity = (existing?.quantity || 0) + quantity;
  if (variant.stockQuantity <= 0) {
    throw new AppError(`${variant.color ? variant.color + " / " : ""}Size ${variant.size} is sold out`, 400);
  }
  if (newQuantity > variant.stockQuantity) {
    throw new AppError(`Only ${variant.stockQuantity} left in size ${variant.size}`, 400);
  }
  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQuantity } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
  }
  await sendCart(req, res);
}
async function findOwnedItem(req, itemId) {
  const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
  if (!item) throw new AppError("Item not found in your bag", 404);
  return item;
}
async function updateCartItem(req, res) {
  const { quantity } = import_zod4.z.object({ quantity: import_zod4.z.number().int().min(0).max(20) }).parse(req.body);
  const item = await findOwnedItem(req, req.params.id);
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    if (quantity > item.variant.stockQuantity) {
      throw new AppError(`Only ${item.variant.stockQuantity} left in size ${item.variant.size}`, 400);
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }
  await sendCart(req, res);
}
async function removeCartItem(req, res) {
  const item = await findOwnedItem(req, req.params.id);
  await prisma.cartItem.delete({ where: { id: item.id } });
  await sendCart(req, res);
}

// src/routes/cartRoutes.ts
var router4 = (0, import_express4.Router)();
router4.use(optionalAuth);
router4.get("/", asyncHandler(getCart));
router4.post("/items", asyncHandler(addToCart));
router4.put("/items/:id", asyncHandler(updateCartItem));
router4.delete("/items/:id", asyncHandler(removeCartItem));
var cartRoutes_default = router4;

// src/routes/orderRoutes.ts
var import_express5 = require("express");

// src/controllers/orderController.ts
var import_zod5 = require("zod");
var import_client5 = require("@prisma/client");

// src/config/razorpay.ts
var import_razorpay = __toESM(require("razorpay"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var instance = null;
function isRazorpayConfigured() {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}
function getRazorpay() {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay keys are not configured");
  }
  if (!instance) {
    instance = new import_razorpay.default({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  }
  return instance;
}
function safeEqualHex(a, b) {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length === 0 || ab.length !== bb.length) return false;
    return import_crypto.default.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = import_crypto.default.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}
function verifyWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = import_crypto.default.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

// src/services/orders.ts
var import_crypto2 = __toESM(require("crypto"), 1);
var import_client4 = require("@prisma/client");
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(length) {
  const bytes = import_crypto2.default.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
function generateOrderNumber() {
  const d = /* @__PURE__ */ new Date();
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1e3);
  const ymd = ist.toISOString().slice(2, 10).replace(/-/g, "");
  return `LVX-${ymd}-${randomCode(6)}`;
}
function generateAccessKey() {
  return import_crypto2.default.randomBytes(24).toString("base64url");
}
function safeEqual(a, b) {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && import_crypto2.default.timingSafeEqual(ab, bb);
}
async function evaluateCoupon(rawCode, subtotalPaise) {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new AppError("Enter a coupon code", 400);
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) throw new AppError("This coupon code is not valid", 400);
  if (coupon.validUntil && coupon.validUntil.getTime() < Date.now()) {
    throw new AppError("This coupon has expired", 400);
  }
  if (coupon.maxUses !== null && coupon.maxUses !== void 0 && coupon.usedCount >= coupon.maxUses) {
    throw new AppError("This coupon has reached its usage limit", 400);
  }
  if (subtotalPaise < coupon.minOrderPaise) {
    throw new AppError(
      `Add items worth Rs. ${Math.ceil((coupon.minOrderPaise - subtotalPaise) / 100).toLocaleString("en-IN")} more to use ${code}`,
      400
    );
  }
  let discountPaise = coupon.discountType === import_client4.DiscountType.PERCENTAGE ? Math.round(subtotalPaise * Math.min(100, coupon.discountValue) / 100) : coupon.discountValue;
  discountPaise = Math.max(0, Math.min(discountPaise, subtotalPaise));
  const description = coupon.discountType === import_client4.DiscountType.PERCENTAGE ? `${coupon.discountValue}% off` : `Rs. ${(coupon.discountValue / 100).toLocaleString("en-IN")} off`;
  return { code, discountPaise, description };
}
async function markOrderPaid(orderId, info) {
  return prisma.$transaction(
    async (tx) => {
      const transition = await tx.order.updateMany({
        where: { id: orderId, paymentStatus: { not: import_client4.PaymentStatus.PAID } },
        data: {
          status: import_client4.OrderStatus.PAID,
          paymentStatus: import_client4.PaymentStatus.PAID,
          paidAt: /* @__PURE__ */ new Date(),
          stockDeducted: true
        }
      });
      if (transition.count === 0) return false;
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
      await tx.payment.upsert({
        where: { orderId },
        update: {
          status: import_client4.PaymentStatus.PAID,
          razorpayOrderId: info.razorpayOrderId,
          razorpayPaymentId: info.razorpayPaymentId,
          razorpaySignature: info.razorpaySignature ?? void 0,
          ...info.rawPayload ? { rawPayload: info.rawPayload } : {}
        },
        create: {
          orderId,
          amountPaise: info.amountPaise ?? order.totalPaise,
          razorpayOrderId: info.razorpayOrderId,
          razorpayPaymentId: info.razorpayPaymentId,
          razorpaySignature: info.razorpaySignature ?? null,
          status: import_client4.PaymentStatus.PAID,
          ...info.rawPayload ? { rawPayload: info.rawPayload } : {}
        }
      });
      const oversold = [];
      for (const item of order.items) {
        if (!item.variantId) continue;
        const dec = await tx.productVariant.updateMany({
          where: { id: item.variantId, stockQuantity: { gte: item.quantity } },
          data: { stockQuantity: { decrement: item.quantity } }
        });
        if (dec.count === 0) {
          await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stockQuantity: 0 } });
          oversold.push(`${item.productName} (${[item.color, item.size].filter(Boolean).join(" / ")}) x${item.quantity}`);
        }
      }
      if (oversold.length) {
        console.warn(`\u26A0\uFE0F Order ${order.orderNumber} paid but stock was short for: ${oversold.join(", ")}`);
        await tx.order.update({
          where: { id: orderId },
          data: {
            adminNotes: `${order.adminNotes ? order.adminNotes + "\n" : ""}\u26A0\uFE0F Stock was short when payment completed: ${oversold.join(", ")}`
          }
        });
      }
      if (order.couponCode) {
        await tx.coupon.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
      }
      if (order.cartId) {
        await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
      }
      return true;
    },
    { timeout: 2e4, maxWait: 1e4 }
  );
}
function formatAddress(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return "";
  return [snapshot.fullName, snapshot.line1, snapshot.line2, snapshot.city, snapshot.state, snapshot.postalCode, snapshot.country].filter(Boolean).join(", ");
}

// src/controllers/orderController.ts
var createOrderSchema = import_zod5.z.object({
  customerEmail: import_zod5.z.string().trim().toLowerCase().email("Enter a valid email address"),
  customerName: import_zod5.z.string().trim().min(2, "Enter your full name").max(100),
  customerPhone: addressSchema.shape.phone,
  shippingAddress: addressSchema.omit({ isDefault: true }),
  couponCode: import_zod5.z.string().trim().max(40).optional().or(import_zod5.z.literal("")),
  saveAddress: import_zod5.z.boolean().optional(),
  paymentMethod: import_zod5.z.enum(["ONLINE", "COD"]).default("ONLINE")
});
async function validateCoupon(req, res) {
  const { code } = import_zod5.z.object({ code: import_zod5.z.string().trim().min(1).max(40) }).parse(req.body);
  const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
  const formatted = await formatCart(cart);
  if (formatted.items.length === 0) throw new AppError("Your bag is empty", 400);
  const result = await evaluateCoupon(code, formatted.subtotalPaise);
  res.json(result);
}
async function saveCheckoutAddress(req, data2) {
  if (!req.user || !data2.saveAddress) return;
  const existing = await prisma.address.findFirst({
    where: { userId: req.user.id, line1: data2.shippingAddress.line1, postalCode: data2.shippingAddress.postalCode }
  });
  if (existing) return;
  const count = await prisma.address.count({ where: { userId: req.user.id } });
  if (count < 10) {
    await prisma.address.create({ data: { ...data2.shippingAddress, userId: req.user.id, isDefault: count === 0 } }).catch(() => void 0);
  }
}
async function createOrder(req, res) {
  const data2 = createOrderSchema.parse(req.body);
  const isCod = data2.paymentMethod === "COD";
  if (!isCod && !isRazorpayConfigured()) {
    throw new AppError("Online payments are temporarily unavailable. Please try again shortly.", 503);
  }
  const cart = await resolveCart(req.user?.id, getAnonymousToken(req));
  const items = cart.items.filter((i) => i.variant?.product?.isActive);
  if (items.length === 0) throw new AppError("Your bag is empty", 400);
  let subtotalPaise = 0;
  for (const item of items) {
    if (item.quantity > item.variant.stockQuantity) {
      throw new AppError(
        item.variant.stockQuantity <= 0 ? `${item.variant.product.name} (${[item.variant.color, item.variant.size].filter(Boolean).join(" / ")}) just sold out. Please remove it from your bag.` : `Only ${item.variant.stockQuantity} left of ${item.variant.product.name} (${[item.variant.color, item.variant.size].filter(Boolean).join(" / ")}). Please update your bag.`,
        409
      );
    }
    subtotalPaise += (item.variant.product.basePrice + item.variant.priceDelta) * item.quantity;
  }
  let discountPaise = 0;
  let couponCode = null;
  if (data2.couponCode) {
    const coupon = await evaluateCoupon(data2.couponCode, subtotalPaise);
    discountPaise = coupon.discountPaise;
    couponCode = coupon.code;
  }
  const settings = await getSettings();
  const shippingPaise = calculateShippingPaise(subtotalPaise, settings);
  let codFeePaise = 0;
  if (isCod) {
    if (!settings.codEnabled) throw new AppError("Cash on Delivery is not available right now. Please pay online.", 400);
    codFeePaise = Math.max(0, Math.round((settings.codFee || 0) * 100));
  }
  const totalPaise = Math.max(0, subtotalPaise - discountPaise) + shippingPaise + codFeePaise;
  if (totalPaise < 100) throw new AppError("Order total must be at least Rs. 1", 400);
  if (isCod && settings.codMaxOrder > 0 && totalPaise > settings.codMaxOrder * 100) {
    throw new AppError(`Cash on Delivery is available for orders up to Rs. ${settings.codMaxOrder.toLocaleString("en-IN")}. Please pay online.`, 400);
  }
  const orderNumber = generateOrderNumber();
  const accessKey = generateAccessKey();
  const itemRows = items.map((item) => {
    const unit = item.variant.product.basePrice + item.variant.priceDelta;
    return {
      productId: item.variant.product.id,
      variantId: item.variantId,
      productName: item.variant.product.name,
      productSlug: item.variant.product.slug,
      size: item.variant.size,
      color: item.variant.color,
      unitPricePaise: unit,
      quantity: item.quantity,
      subtotalPaise: unit * item.quantity,
      imageUrl: imageForColor(item.variant.product.images, item.variant.color)
    };
  });
  const baseOrder = {
    orderNumber,
    accessKey,
    userId: req.user?.id || null,
    cartId: cart.id,
    customerEmail: data2.customerEmail,
    customerName: data2.customerName,
    customerPhone: data2.customerPhone,
    shippingAddressSnapshot: { ...data2.shippingAddress, phone: data2.shippingAddress.phone },
    subtotalPaise,
    shippingPaise,
    discountPaise,
    totalPaise,
    couponCode
  };
  if (isCod) {
    const order2 = await prisma.$transaction(
      async (tx) => {
        const created = await tx.order.create({
          data: {
            ...baseOrder,
            paymentMethod: "COD",
            codFeePaise,
            status: import_client5.OrderStatus.PROCESSING,
            paymentStatus: import_client5.PaymentStatus.PENDING,
            stockDeducted: true,
            items: { create: itemRows }
          }
        });
        for (const row of itemRows) {
          if (!row.variantId) continue;
          const dec = await tx.productVariant.updateMany({
            where: { id: row.variantId, stockQuantity: { gte: row.quantity } },
            data: { stockQuantity: { decrement: row.quantity } }
          });
          if (dec.count === 0) {
            throw new AppError(`${row.productName} (${[row.color, row.size].filter(Boolean).join(" / ")}) just sold out. Please update your bag.`, 409);
          }
        }
        if (couponCode) await tx.coupon.updateMany({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        return created;
      },
      { timeout: 2e4, maxWait: 1e4 }
    );
    await saveCheckoutAddress(req, data2);
    res.status(201).json({
      order: { id: order2.id, orderNumber: order2.orderNumber, totalPaise: order2.totalPaise, customerEmail: order2.customerEmail, customerName: order2.customerName },
      accessKey,
      paymentMethod: "COD"
    });
    return;
  }
  let rzpOrder;
  try {
    rzpOrder = await getRazorpay().orders.create({
      amount: totalPaise,
      currency: "INR",
      receipt: orderNumber,
      notes: { orderNumber, customerEmail: data2.customerEmail }
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", err?.error || err?.message || err);
    throw new AppError("Could not start the payment. Please try again in a moment.", 502);
  }
  const order = await prisma.order.create({
    data: {
      ...baseOrder,
      paymentMethod: "ONLINE",
      status: import_client5.OrderStatus.PENDING,
      paymentStatus: import_client5.PaymentStatus.PENDING,
      razorpayOrderId: rzpOrder.id,
      items: { create: itemRows }
    },
    include: { items: true }
  });
  await saveCheckoutAddress(req, data2);
  res.status(201).json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      totalPaise: order.totalPaise,
      customerEmail: order.customerEmail,
      customerName: order.customerName
    },
    accessKey,
    razorpayOrderId: rzpOrder.id,
    amountPaise: totalPaise,
    currency: "INR",
    keyId: env.RAZORPAY_KEY_ID
  });
}
async function getUserOrders(req, res) {
  if (!req.user) throw new AppError("Please sign in to continue.", 401);
  const orders = await prisma.order.findMany({
    where: {
      AND: [
        { OR: [{ userId: req.user.id }, { customerEmail: req.user.email }] },
        { OR: [{ paymentStatus: { in: [import_client5.PaymentStatus.PAID, import_client5.PaymentStatus.REFUNDED] } }, { paymentMethod: "COD" }] }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: true }
  });
  res.set("Cache-Control", "no-store");
  res.json({ orders: orders.map(({ accessKey, adminNotes, cartId, ...o }) => o) });
}
async function getOrderByNumber(req, res) {
  const { orderNumber } = req.params;
  const key = typeof req.query.key === "string" ? req.query.key : void 0;
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true } });
  if (!order) throw new AppError("Order not found", 404);
  const isOwner = req.user && (order.userId === req.user.id || order.customerEmail === req.user.email || req.user.role === import_client5.Role.ADMIN);
  if (!isOwner && !safeEqual(key, order.accessKey)) {
    throw new AppError("Order not found", 404);
  }
  const { accessKey, adminNotes, cartId, ...publicOrder } = order;
  res.set("Cache-Control", "no-store");
  res.json({ order: { ...publicOrder, shippingAddress: formatAddress(order.shippingAddressSnapshot) } });
}
async function trackOrder(req, res) {
  const { orderNumber, email } = import_zod5.z.object({ orderNumber: import_zod5.z.string().trim().min(5).max(40), email: import_zod5.z.string().trim().toLowerCase().email() }).parse(req.body);
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    include: { items: { select: { quantity: true } } }
  });
  if (!order || order.customerEmail.toLowerCase() !== email) {
    throw new AppError("No order found with that number and email", 404);
  }
  res.set("Cache-Control", "no-store");
  res.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      courier: order.courier,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt,
      itemCount: order.items.reduce((a, i) => a + i.quantity, 0)
    }
  });
}

// src/routes/orderRoutes.ts
var router5 = (0, import_express5.Router)();
router5.post("/", checkoutRateLimiter, optionalAuth, asyncHandler(createOrder));
router5.post("/validate-coupon", checkoutRateLimiter, optionalAuth, asyncHandler(validateCoupon));
router5.post("/track", checkoutRateLimiter, asyncHandler(trackOrder));
router5.get("/my-orders", verifyFirebaseToken, asyncHandler(getUserOrders));
router5.get("/:orderNumber", optionalAuth, asyncHandler(getOrderByNumber));
var orderRoutes_default = router5;

// src/routes/paymentRoutes.ts
var import_express6 = require("express");

// src/controllers/paymentController.ts
var import_zod6 = require("zod");
var import_client6 = require("@prisma/client");
var verifySchema = import_zod6.z.object({
  orderNumber: import_zod6.z.string().min(5).max(40),
  razorpayOrderId: import_zod6.z.string().min(5).max(60),
  razorpayPaymentId: import_zod6.z.string().min(5).max(60),
  razorpaySignature: import_zod6.z.string().min(10).max(200)
});
async function verifyPayment(req, res) {
  const { orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature } = verifySchema.parse(req.body);
  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw new AppError("Order not found", 404);
  if (!order.razorpayOrderId || order.razorpayOrderId !== razorpayOrderId) {
    throw new AppError("Payment does not match this order", 400);
  }
  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: { status: import_client6.PaymentStatus.FAILED, razorpayPaymentId },
      create: {
        orderId: order.id,
        amountPaise: order.totalPaise,
        razorpayOrderId,
        razorpayPaymentId,
        status: import_client6.PaymentStatus.FAILED
      }
    }).catch(() => void 0);
    throw new AppError("Payment verification failed. If money was deducted it will be refunded automatically.", 400);
  }
  if (order.paymentStatus !== import_client6.PaymentStatus.PAID) {
    try {
      const rzp = getRazorpay();
      const payment = await rzp.payments.fetch(razorpayPaymentId);
      if (payment.order_id !== razorpayOrderId || Number(payment.amount) !== order.totalPaise) {
        throw new AppError("Payment amount mismatch. Please contact support.", 400);
      }
      if (payment.status === "authorized") {
        await rzp.payments.capture(razorpayPaymentId, order.totalPaise, "INR");
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      console.warn("Razorpay payment fetch/capture warning:", err?.error?.description || err?.message);
    }
    await markOrderPaid(order.id, {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amountPaise: order.totalPaise
    });
  }
  res.json({ success: true, orderNumber: order.orderNumber });
}
async function handleWebhook(req, res) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn("Razorpay webhook received but RAZORPAY_WEBHOOK_SECRET is not configured \u2014 ignoring.");
    res.status(503).json({ error: "Webhook not configured" });
    return;
  }
  const signature = req.headers["x-razorpay-signature"];
  if (!signature || !req.rawBody || !verifyWebhookSignature(req.rawBody, signature)) {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }
  const event = req.body?.event;
  const paymentEntity = req.body?.payload?.payment?.entity;
  const rzpOrderId = paymentEntity?.order_id || req.body?.payload?.order?.entity?.id;
  if (rzpOrderId) {
    const order = await prisma.order.findUnique({ where: { razorpayOrderId: rzpOrderId } });
    if (order) {
      if ((event === "payment.captured" || event === "order.paid") && paymentEntity) {
        if (Number(paymentEntity.amount) === order.totalPaise) {
          await markOrderPaid(order.id, {
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: paymentEntity.id,
            amountPaise: Number(paymentEntity.amount),
            rawPayload: req.body.payload
          });
        } else {
          console.error(`Webhook amount mismatch for ${order.orderNumber}: ${paymentEntity.amount} vs ${order.totalPaise}`);
        }
      } else if (event === "payment.failed" && order.paymentStatus !== import_client6.PaymentStatus.PAID && paymentEntity) {
        await prisma.payment.upsert({
          where: { orderId: order.id },
          update: { status: import_client6.PaymentStatus.FAILED, razorpayPaymentId: paymentEntity.id },
          create: {
            orderId: order.id,
            amountPaise: order.totalPaise,
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: paymentEntity.id,
            status: import_client6.PaymentStatus.FAILED
          }
        }).catch(() => void 0);
      }
    }
  }
  res.json({ status: "ok" });
}

// src/routes/paymentRoutes.ts
var router6 = (0, import_express6.Router)();
router6.post("/verify", checkoutRateLimiter, asyncHandler(verifyPayment));
router6.post("/webhook", asyncHandler(handleWebhook));
var paymentRoutes_default = router6;

// src/routes/adminRoutes.ts
var import_express7 = __toESM(require("express"), 1);

// src/controllers/adminController.ts
var import_zod7 = require("zod");
var import_client7 = require("@prisma/client");
async function getDashboardMetrics(_req, res) {
  const startOfToday = /* @__PURE__ */ new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [paidAgg, todayAgg, paidOrders, toFulfil, totalCustomers, totalProducts, lowStockVariants, recentOrders, subscribers] = await Promise.all([
    prisma.order.aggregate({ where: { paymentStatus: import_client7.PaymentStatus.PAID }, _sum: { totalPaise: true } }),
    prisma.order.aggregate({
      where: { paymentStatus: import_client7.PaymentStatus.PAID, paidAt: { gte: startOfToday } },
      _sum: { totalPaise: true },
      _count: true
    }),
    prisma.order.count({ where: { paymentStatus: import_client7.PaymentStatus.PAID } }),
    prisma.order.count({ where: { status: { in: [import_client7.OrderStatus.PAID, import_client7.OrderStatus.PROCESSING] } } }),
    prisma.user.count({ where: { role: import_client7.Role.CUSTOMER } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productVariant.findMany({
      where: { stockQuantity: { lte: 5 }, product: { isActive: true } },
      orderBy: { stockQuantity: "asc" },
      include: { product: { select: { name: true, slug: true } } },
      take: 20
    }),
    prisma.order.findMany({
      where: { paymentStatus: import_client7.PaymentStatus.PAID },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { items: true }
    }),
    prisma.subscriber.count()
  ]);
  const totalRevenuePaise = paidAgg._sum.totalPaise || 0;
  res.set("Cache-Control", "no-store");
  res.json({
    metrics: {
      totalOrders: paidOrders,
      ordersToFulfil: toFulfil,
      totalRevenuePaise,
      totalRevenueINR: Math.round(totalRevenuePaise / 100),
      todayRevenueINR: Math.round((todayAgg._sum.totalPaise || 0) / 100),
      todayOrders: todayAgg._count,
      totalCustomers,
      totalProducts,
      lowStockAlertsCount: lowStockVariants.length,
      subscribers
    },
    lowStockVariants,
    recentOrders
  });
}
async function getAllOrders(req, res) {
  const status = typeof req.query.status === "string" ? req.query.status : void 0;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const includeUnpaid = req.query.includeUnpaid === "true";
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const take = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "100"), 10) || 100));
  const where = {};
  if (status && status !== "ALL" && Object.values(import_client7.OrderStatus).includes(status)) {
    where.status = status;
  } else if (!includeUnpaid) {
    where.NOT = { status: import_client7.OrderStatus.PENDING, paymentStatus: { not: import_client7.PaymentStatus.PAID } };
  }
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
      { customerEmail: { contains: search } },
      { customerPhone: { contains: search } }
    ];
  }
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { items: true, payment: { select: { razorpayPaymentId: true, status: true } } }
    })
  ]);
  res.set("Cache-Control", "no-store");
  res.json({
    orders: orders.map(({ accessKey, ...o }) => ({ ...o, shippingAddress: formatAddress(o.shippingAddressSnapshot) })),
    pagination: { page, limit: take, total, totalPages: Math.ceil(total / take) }
  });
}
var updateOrderSchema = import_zod7.z.object({
  status: import_zod7.z.nativeEnum(import_client7.OrderStatus).optional(),
  courier: import_zod7.z.string().trim().max(100).optional(),
  trackingNumber: import_zod7.z.string().trim().max(100).optional(),
  adminNotes: import_zod7.z.string().max(5e3).optional(),
  markCodPaid: import_zod7.z.boolean().optional()
});
async function updateOrder(req, res) {
  const data2 = updateOrderSchema.parse(req.body);
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!order) throw new AppError("Order not found", 404);
  if (data2.status && data2.status !== import_client7.OrderStatus.CANCELLED && data2.status !== import_client7.OrderStatus.PENDING) {
    if (order.paymentStatus !== import_client7.PaymentStatus.PAID && order.paymentMethod !== "COD") {
      throw new AppError("This order has not been paid yet, so it cannot be moved to fulfilment", 400);
    }
  }
  if (data2.markCodPaid) {
    if (order.paymentMethod !== "COD") throw new AppError("Only Cash on Delivery orders can be marked as paid here", 400);
    if (order.status === import_client7.OrderStatus.CANCELLED) throw new AppError("This order is cancelled", 400);
  }
  const updated = await prisma.$transaction(async (tx) => {
    if (data2.status === import_client7.OrderStatus.CANCELLED && order.status !== import_client7.OrderStatus.CANCELLED && order.stockDeducted) {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } }
          });
        }
      }
    }
    return tx.order.update({
      where: { id: order.id },
      data: {
        ...data2.status ? { status: data2.status } : {},
        ...data2.status === import_client7.OrderStatus.CANCELLED && order.stockDeducted ? { stockDeducted: false } : {},
        ...data2.courier !== void 0 ? { courier: data2.courier || null } : {},
        ...data2.trackingNumber !== void 0 ? { trackingNumber: data2.trackingNumber || null } : {},
        ...data2.adminNotes !== void 0 ? { adminNotes: data2.adminNotes || null } : {},
        ...data2.markCodPaid && order.paymentStatus !== import_client7.PaymentStatus.PAID ? { paymentStatus: import_client7.PaymentStatus.PAID, paidAt: /* @__PURE__ */ new Date() } : {}
      },
      include: { items: true }
    });
  });
  const { accessKey, ...o } = updated;
  res.json({ order: { ...o, shippingAddress: formatAddress(o.shippingAddressSnapshot) } });
}
async function deleteOrder(req, res) {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) throw new AppError("Order not found", 404);
  if (order.paymentStatus === import_client7.PaymentStatus.PAID) {
    throw new AppError("Paid orders are kept for your records. Mark it as CANCELLED instead.", 400);
  }
  await prisma.order.delete({ where: { id: order.id } });
  res.json({ success: true });
}
var imageUrl = import_zod7.z.string().trim().max(2e3).refine((v) => /^https?:\/\//i.test(v) || /^\/media\/[0-9a-f-]{36}\.[a-z]+$/i.test(v), "Each image must be uploaded or be a full https:// link");
var imageSchema = import_zod7.z.object({
  url: imageUrl,
  altText: import_zod7.z.string().max(200).optional().nullable(),
  color: import_zod7.z.string().trim().max(40).optional().nullable(),
  isCover: import_zod7.z.boolean().optional(),
  sortOrder: import_zod7.z.number().int().optional()
});
var variantSchema = import_zod7.z.object({
  size: import_zod7.z.string().trim().min(1).max(10),
  color: import_zod7.z.string().trim().max(40).optional().nullable(),
  colorHex: import_zod7.z.string().trim().regex(/^#[0-9a-f]{6}$/i, "Colour code must look like #1A2B3C").optional().nullable().or(import_zod7.z.literal("")),
  stockQuantity: import_zod7.z.number().int().min(0).max(1e5),
  priceDelta: import_zod7.z.number().int().default(0)
});
var productSchema = import_zod7.z.object({
  name: import_zod7.z.string().trim().min(2).max(190),
  slug: import_zod7.z.string().trim().max(120).optional(),
  description: import_zod7.z.string().trim().min(5, "Description must be at least 5 characters").max(2e4),
  details: import_zod7.z.string().max(2e4).optional().nullable(),
  fabricCare: import_zod7.z.string().max(2e4).optional().nullable(),
  fitGuide: import_zod7.z.string().max(2e4).optional().nullable(),
  basePrice: import_zod7.z.number().int().positive("Price must be more than 0"),
  comparePrice: import_zod7.z.number().int().positive().optional().nullable(),
  categoryId: import_zod7.z.string().max(120).optional().nullable(),
  categoryName: import_zod7.z.string().max(120).optional().nullable(),
  isFeatured: import_zod7.z.boolean().default(false),
  isActive: import_zod7.z.boolean().default(true),
  colorGroup: import_zod7.z.string().trim().max(30).optional().nullable().transform((v) => v ? v.toUpperCase() : null),
  gender: import_zod7.z.enum(["MEN", "WOMEN", "UNISEX"]).default("UNISEX"),
  collectionIds: import_zod7.z.array(import_zod7.z.string().max(64)).max(50).optional(),
  images: import_zod7.z.array(imageSchema).min(1, "Add at least one product image").max(60),
  variants: import_zod7.z.array(variantSchema).min(1, "Add at least one size").max(200)
});
async function resolveCategoryId(categoryId, categoryName) {
  if (categoryId) {
    const found = await prisma.category.findFirst({ where: { OR: [{ id: categoryId }, { slug: categoryId }] } });
    if (found) return found.id;
  }
  if (categoryName && categoryName.trim()) {
    const slug = slugify(categoryName);
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name: categoryName.trim(), slug }
    });
    return cat.id;
  }
  return null;
}
function normaliseImages(images) {
  return images.map((img, idx) => ({
    url: img.url,
    altText: img.altText || null,
    color: img.color?.trim() || null,
    sortOrder: idx,
    isCover: idx === 0
  }));
}
var variantKey = (color, size) => `${(color || "").trim().toLowerCase()}|${size.trim().toUpperCase()}`;
function buildSku(slug, size, color) {
  const c = color ? `-${color.toUpperCase().replace(/[^A-Z0-9]+/g, "")}` : "";
  return `${slug.toUpperCase()}${c}-${size.toUpperCase()}`.slice(0, 180);
}
function dedupeVariants(variants) {
  const map = /* @__PURE__ */ new Map();
  for (const v of variants) {
    const color = v.color?.trim() || null;
    map.set(variantKey(color, v.size), {
      size: v.size.trim().toUpperCase(),
      color,
      colorHex: color && v.colorHex ? v.colorHex.toUpperCase() : null,
      stockQuantity: v.stockQuantity,
      priceDelta: v.priceDelta ?? 0
    });
  }
  return [...map.values()];
}
async function loadAdminProduct(id) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: { ...productFullInclude, collections: { select: { collectionId: true } } }
  });
  return p ? { ...p, collectionIds: p.collections.map((c) => c.collectionId) } : p;
}
async function setProductCollections(productId, collectionIds) {
  const unique = [...new Set(collectionIds)];
  const valid = await prisma.collection.findMany({ where: { id: { in: unique } }, select: { id: true } });
  const validIds = valid.map((v) => v.id);
  await prisma.collectionProduct.deleteMany({ where: { productId, collectionId: { notIn: validIds } } });
  for (const collectionId of validIds) {
    const exists = await prisma.collectionProduct.findUnique({ where: { collectionId_productId: { collectionId, productId } } });
    if (!exists) {
      const max = await prisma.collectionProduct.aggregate({ where: { collectionId }, _max: { sortOrder: true } });
      await prisma.collectionProduct.create({ data: { collectionId, productId, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
    }
  }
}
async function getAdminProducts(req, res) {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const products = await prisma.product.findMany({
    where: search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { ...productFullInclude, collections: { select: { collectionId: true } } }
  });
  res.set("Cache-Control", "no-store");
  res.json({
    products: products.map((p) => ({ ...serializeProduct(p), collectionIds: p.collections.map((c) => c.collectionId) }))
  });
}
async function createProduct(req, res) {
  const data2 = productSchema.parse(req.body);
  const slug = slugify(data2.slug || data2.name);
  if (!slug) throw new AppError("Please enter a valid product name", 400);
  if (data2.comparePrice && data2.comparePrice <= data2.basePrice) data2.comparePrice = null;
  const categoryId = await resolveCategoryId(data2.categoryId, data2.categoryName);
  const variants = dedupeVariants(data2.variants);
  const product = await prisma.product.create({
    data: {
      name: data2.name,
      slug,
      description: data2.description,
      details: data2.details || null,
      fabricCare: data2.fabricCare || null,
      fitGuide: data2.fitGuide || null,
      basePrice: data2.basePrice,
      comparePrice: data2.comparePrice || null,
      isFeatured: data2.isFeatured,
      isActive: data2.isActive,
      colorGroup: data2.colorGroup || null,
      gender: data2.gender,
      categoryId,
      images: { create: normaliseImages(data2.images) },
      variants: {
        create: variants.map((v) => ({
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          sku: buildSku(slug, v.size, v.color),
          stockQuantity: v.stockQuantity,
          priceDelta: v.priceDelta
        }))
      }
    },
    include: productFullInclude
  });
  if (data2.collectionIds?.length) await setProductCollections(product.id, data2.collectionIds);
  res.status(201).json({ product: serializeProduct(await loadAdminProduct(product.id)) });
}
async function updateProduct(req, res) {
  const { id } = req.params;
  const data2 = productSchema.partial().parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!existing) throw new AppError("Product not found", 404);
  const slug = data2.slug !== void 0 || data2.name !== void 0 ? slugify(data2.slug || data2.name || existing.slug) : existing.slug;
  const basePrice = data2.basePrice ?? existing.basePrice;
  let comparePrice = data2.comparePrice !== void 0 ? data2.comparePrice : existing.comparePrice;
  if (comparePrice && comparePrice <= basePrice) comparePrice = null;
  const categoryId = data2.categoryId !== void 0 || data2.categoryName !== void 0 ? await resolveCategoryId(data2.categoryId, data2.categoryName) : existing.categoryId;
  await prisma.$transaction(
    async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...data2.name !== void 0 ? { name: data2.name } : {},
          slug,
          ...data2.description !== void 0 ? { description: data2.description } : {},
          ...data2.details !== void 0 ? { details: data2.details || null } : {},
          ...data2.fabricCare !== void 0 ? { fabricCare: data2.fabricCare || null } : {},
          ...data2.fitGuide !== void 0 ? { fitGuide: data2.fitGuide || null } : {},
          basePrice,
          comparePrice: comparePrice || null,
          categoryId,
          ...data2.isFeatured !== void 0 ? { isFeatured: data2.isFeatured } : {},
          ...data2.isActive !== void 0 ? { isActive: data2.isActive } : {},
          ...data2.colorGroup !== void 0 ? { colorGroup: data2.colorGroup || null } : {},
          ...req.body.gender !== void 0 && data2.gender ? { gender: data2.gender } : {}
        }
      });
      if (data2.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({ data: normaliseImages(data2.images).map((img) => ({ ...img, productId: id })) });
      }
      if (data2.variants) {
        const incoming = dedupeVariants(data2.variants);
        const keys = new Set(incoming.map((v) => variantKey(v.color, v.size)));
        const removed = existing.variants.filter((v) => !keys.has(variantKey(v.color, v.size)));
        if (removed.length) {
          await tx.productVariant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
        }
        const kept = existing.variants.filter((v) => keys.has(variantKey(v.color, v.size)));
        for (const v of kept) {
          await tx.productVariant.update({ where: { id: v.id }, data: { sku: `TMP-${v.id}` } });
        }
        for (const v of incoming) {
          const match = kept.find((ev) => variantKey(ev.color, ev.size) === variantKey(v.color, v.size));
          const data3 = {
            size: v.size,
            color: v.color,
            colorHex: v.colorHex,
            sku: buildSku(slug, v.size, v.color),
            stockQuantity: v.stockQuantity,
            priceDelta: v.priceDelta
          };
          if (match) await tx.productVariant.update({ where: { id: match.id }, data: data3 });
          else await tx.productVariant.create({ data: { ...data3, productId: id } });
        }
      } else if (slug !== existing.slug) {
        for (const v of existing.variants) {
          await tx.productVariant.update({ where: { id: v.id }, data: { sku: buildSku(slug, v.size, v.color) } });
        }
      }
    },
    { timeout: 2e4 }
  );
  if (data2.collectionIds) await setProductCollections(id, data2.collectionIds);
  res.json({ product: serializeProduct(await loadAdminProduct(id)) });
}
async function deleteProduct(req, res) {
  const { id } = req.params;
  const product = await prisma.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
  if (!product) throw new AppError("Product not found", 404);
  if (product._count.orderItems > 0) {
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.json({ success: true, archived: true, message: "Product has past orders, so it was hidden from the store instead of deleted." });
    return;
  }
  await prisma.product.delete({ where: { id } });
  res.json({ success: true, archived: false });
}
var categorySchema = import_zod7.z.object({
  name: import_zod7.z.string().trim().min(2).max(120),
  group: import_zod7.z.enum(["TOP", "BOTTOM", "ACCESSORIES"]).optional().nullable(),
  description: import_zod7.z.string().max(2e3).optional().nullable(),
  imageUrl: imageUrl.optional().nullable().or(import_zod7.z.literal("")),
  sortOrder: import_zod7.z.number().int().optional()
});
async function createCategory(req, res) {
  const data2 = categorySchema.parse(req.body);
  const category = await prisma.category.create({
    data: {
      name: data2.name,
      slug: slugify(data2.name),
      description: data2.description || null,
      imageUrl: data2.imageUrl || null,
      sortOrder: data2.sortOrder ?? 0,
      group: data2.group || "TOP"
    }
  });
  res.status(201).json({ category });
}
async function updateCategory(req, res) {
  const data2 = categorySchema.partial().parse(req.body);
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      ...data2.name !== void 0 ? { name: data2.name } : {},
      ...data2.description !== void 0 ? { description: data2.description || null } : {},
      ...data2.imageUrl !== void 0 ? { imageUrl: data2.imageUrl || null } : {},
      ...data2.sortOrder !== void 0 ? { sortOrder: data2.sortOrder } : {},
      ...data2.group !== void 0 ? { group: data2.group || "TOP" } : {}
    }
  });
  res.json({ category });
}
async function deleteCategory(req, res) {
  await prisma.category.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}
var settingsSchema = import_zod7.z.object({
  announcementText: import_zod7.z.string().max(1e3),
  heroHeadline: import_zod7.z.string().max(190),
  heroSubtitle: import_zod7.z.string().max(1e3),
  supportEmail: import_zod7.z.string().trim().email().or(import_zod7.z.literal("")),
  supportPhone: import_zod7.z.string().trim().max(30),
  instagramHandle: import_zod7.z.string().trim().max(100).transform((v) => v.replace(/^@/, "")),
  freeShippingThreshold: import_zod7.z.coerce.number().int().min(0).max(1e6),
  shippingFee: import_zod7.z.coerce.number().int().min(0).max(1e5),
  announcementEnabled: import_zod7.z.boolean(),
  heroDesktopImage: import_zod7.z.string().trim().max(2e3).refine((v) => !v || /^https?:\/\//.test(v) || v.startsWith("/"), "Hero image must be a full URL"),
  heroMobileImage: import_zod7.z.string().trim().max(2e3).refine((v) => !v || /^https?:\/\//.test(v) || v.startsWith("/"), "Hero image must be a full URL"),
  heroDesktopVideo: import_zod7.z.string().trim().max(2e3).refine((v) => !v || /^\/media\/[0-9a-f-]{36}\.(mp4|webm|mov)$/i.test(v) || /^https:\/\//.test(v), "Hero video must be an uploaded video"),
  heroMobileVideo: import_zod7.z.string().trim().max(2e3).refine((v) => !v || /^\/media\/[0-9a-f-]{36}\.(mp4|webm|mov)$/i.test(v) || /^https:\/\//.test(v), "Hero video must be an uploaded video"),
  heroLink: import_zod7.z.string().trim().max(500),
  legalName: import_zod7.z.string().trim().max(190),
  businessAddress: import_zod7.z.string().trim().max(1e3),
  grievanceOfficer: import_zod7.z.string().trim().max(190),
  gstin: import_zod7.z.string().trim().toUpperCase().max(15).refine((v) => !v || /^[0-9A-Z]{15}$/.test(v), "GSTIN must be 15 letters/numbers"),
  jurisdictionCity: import_zod7.z.string().trim().max(100),
  codEnabled: import_zod7.z.boolean(),
  codFee: import_zod7.z.coerce.number().int().min(0).max(1e3),
  codMaxOrder: import_zod7.z.coerce.number().int().min(0).max(1e6),
  heroCtaText: import_zod7.z.string().trim().max(60),
  latestDropTitle: import_zod7.z.string().trim().max(100),
  seoTitle: import_zod7.z.string().max(300),
  seoText: import_zod7.z.string().max(2e4),
  shippingInfo: import_zod7.z.string().max(5e3),
  careInfo: import_zod7.z.string().max(5e3)
}).partial();
async function getAdminStoreSettings(_req, res) {
  res.json({ settings: await getSettings() });
}
async function updateAdminStoreSettings(req, res) {
  const data2 = settingsSchema.parse(req.body);
  const settings = await saveSettings(data2);
  res.json({ success: true, settings });
}
function toDiscountDto(c) {
  return {
    id: c.id,
    code: c.code,
    type: c.discountType,
    // percentage → percent; fixed → rupees
    value: c.discountType === import_client7.DiscountType.FIXED ? c.discountValue / 100 : c.discountValue,
    minOrderPaise: c.minOrderPaise,
    isActive: c.isActive,
    expiresAt: c.validUntil ? c.validUntil.toISOString().slice(0, 10) : "",
    maxUses: c.maxUses,
    usedCount: c.usedCount
  };
}
var discountSchema = import_zod7.z.object({
  code: import_zod7.z.string().trim().min(3).max(30).transform((v) => v.toUpperCase()).refine((v) => /^[A-Z0-9_-]+$/.test(v), "Use only letters, numbers, - and _"),
  type: import_zod7.z.enum(["PERCENTAGE", "FIXED"]),
  value: import_zod7.z.coerce.number().positive(),
  minOrderINR: import_zod7.z.coerce.number().min(0).default(0),
  expiresAt: import_zod7.z.string().optional().or(import_zod7.z.literal("")),
  isActive: import_zod7.z.boolean().default(true),
  maxUses: import_zod7.z.coerce.number().int().positive().optional().nullable()
});
async function getAdminDiscounts(_req, res) {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ discounts: coupons.map(toDiscountDto) });
}
async function createAdminDiscount(req, res) {
  const data2 = discountSchema.parse(req.body);
  if (data2.type === "PERCENTAGE" && data2.value > 90) throw new AppError("Percentage discount cannot be more than 90%", 400);
  let validUntil = null;
  if (data2.expiresAt) {
    validUntil = /* @__PURE__ */ new Date(`${data2.expiresAt}T23:59:59+05:30`);
    if (isNaN(validUntil.getTime())) throw new AppError("Invalid expiry date", 400);
  }
  const coupon = await prisma.coupon.create({
    data: {
      code: data2.code,
      discountType: data2.type === "FIXED" ? import_client7.DiscountType.FIXED : import_client7.DiscountType.PERCENTAGE,
      discountValue: data2.type === "FIXED" ? Math.round(data2.value * 100) : Math.round(data2.value),
      minOrderPaise: Math.round(data2.minOrderINR * 100),
      isActive: data2.isActive,
      validUntil,
      maxUses: data2.maxUses ?? null
    }
  });
  res.status(201).json({ success: true, discount: toDiscountDto(coupon) });
}
async function toggleAdminDiscount(req, res) {
  const coupon = await prisma.coupon.findFirst({ where: { OR: [{ id: req.params.id }, { code: req.params.id }] } });
  if (!coupon) throw new AppError("Discount code not found", 404);
  const updated = await prisma.coupon.update({ where: { id: coupon.id }, data: { isActive: !coupon.isActive } });
  res.json({ success: true, discount: toDiscountDto(updated) });
}
async function deleteAdminDiscount(req, res) {
  await prisma.coupon.deleteMany({ where: { OR: [{ id: req.params.id }, { code: req.params.id }] } });
  res.json({ success: true });
}
async function exportSubscribers(req, res) {
  const subs = await prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } });
  if (req.query.format === "json") {
    res.json({ total: subs.length, subscribers: subs });
    return;
  }
  const csv = ["email,subscribed_at", ...subs.map((s) => `${s.email},${s.createdAt.toISOString()}`)].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="levix-subscribers.csv"');
  res.send(csv);
}
var collectionSchema = import_zod7.z.object({
  name: import_zod7.z.string().trim().min(2).max(120),
  slug: import_zod7.z.string().trim().max(120).optional(),
  description: import_zod7.z.string().max(5e3).optional().nullable(),
  bannerImageUrl: imageUrl.optional().nullable().or(import_zod7.z.literal("")),
  mobileBannerUrl: imageUrl.optional().nullable().or(import_zod7.z.literal("")),
  isActive: import_zod7.z.boolean().default(true),
  sortOrder: import_zod7.z.coerce.number().int().default(0),
  homeLayout: import_zod7.z.enum(["NONE", "CAROUSEL", "GRID"]).default("NONE"),
  showInGallery: import_zod7.z.boolean().default(false),
  showInMenu: import_zod7.z.boolean().default(true),
  productIds: import_zod7.z.array(import_zod7.z.string().max(64)).max(500).optional()
});
async function getAdminCollections(_req, res) {
  const collections = await prisma.collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { products: { orderBy: { sortOrder: "asc" }, select: { productId: true } } }
  });
  res.set("Cache-Control", "no-store");
  res.json({
    collections: collections.map(({ products, ...c }) => ({ ...c, productIds: products.map((p) => p.productId) }))
  });
}
async function setCollectionProducts(collectionId, productIds) {
  const unique = [...new Set(productIds)];
  const valid = new Set((await prisma.product.findMany({ where: { id: { in: unique } }, select: { id: true } })).map((p) => p.id));
  const ordered = unique.filter((id) => valid.has(id));
  await prisma.$transaction([
    prisma.collectionProduct.deleteMany({ where: { collectionId } }),
    prisma.collectionProduct.createMany({ data: ordered.map((productId, idx) => ({ collectionId, productId, sortOrder: idx })) })
  ]);
}
async function createCollection(req, res) {
  const data2 = collectionSchema.parse(req.body);
  const slug = slugify(data2.slug || data2.name);
  const clash = await prisma.category.findUnique({ where: { slug } });
  if (clash) throw new AppError(`"${slug}" is already used by a category. Choose a different name or handle.`, 409);
  const collection = await prisma.collection.create({
    data: {
      name: data2.name,
      slug,
      description: data2.description || null,
      bannerImageUrl: data2.bannerImageUrl || null,
      mobileBannerUrl: data2.mobileBannerUrl || null,
      isActive: data2.isActive,
      sortOrder: data2.sortOrder,
      homeLayout: data2.homeLayout,
      showInGallery: data2.showInGallery,
      showInMenu: data2.showInMenu
    }
  });
  if (data2.productIds) await setCollectionProducts(collection.id, data2.productIds);
  res.status(201).json({ collection });
}
async function updateCollection(req, res) {
  const data2 = collectionSchema.partial().parse(req.body);
  const existing = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError("Collection not found", 404);
  const slug = data2.slug !== void 0 ? slugify(data2.slug || data2.name || existing.name) : existing.slug;
  if (slug !== existing.slug && await prisma.category.findUnique({ where: { slug } })) {
    throw new AppError(`"${slug}" is already used by a category.`, 409);
  }
  const collection = await prisma.collection.update({
    where: { id: existing.id },
    data: {
      ...data2.name !== void 0 ? { name: data2.name } : {},
      slug,
      ...data2.description !== void 0 ? { description: data2.description || null } : {},
      ...data2.bannerImageUrl !== void 0 ? { bannerImageUrl: data2.bannerImageUrl || null } : {},
      ...data2.mobileBannerUrl !== void 0 ? { mobileBannerUrl: data2.mobileBannerUrl || null } : {},
      ...data2.isActive !== void 0 ? { isActive: data2.isActive } : {},
      ...data2.sortOrder !== void 0 ? { sortOrder: data2.sortOrder } : {},
      ...data2.homeLayout !== void 0 ? { homeLayout: data2.homeLayout } : {},
      ...data2.showInGallery !== void 0 ? { showInGallery: data2.showInGallery } : {},
      ...data2.showInMenu !== void 0 ? { showInMenu: data2.showInMenu } : {}
    }
  });
  if (data2.productIds) await setCollectionProducts(collection.id, data2.productIds);
  res.json({ collection });
}
async function deleteCollection(req, res) {
  await prisma.collection.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

// src/controllers/homeController.ts
var cache2 = null;
function invalidateHomeCache() {
  cache2 = null;
}
async function getHome(_req, res) {
  if (cache2 && cache2.expires > Date.now()) {
    res.set("Cache-Control", "public, max-age=20");
    res.json(cache2.body);
    return;
  }
  const [settings, latest, collections, categories, colors, genderRows] = await Promise.all([
    getSettings(),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 12,
      include: productListInclude
    }),
    prisma.collection.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          take: 16,
          where: { product: { isActive: true } },
          include: { product: { include: productListInclude } }
        }
      }
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: { where: { isActive: true } } } } }
    }),
    prisma.product.findMany({
      where: { isActive: true, colorGroup: { not: null } },
      distinct: ["colorGroup"],
      select: { colorGroup: true }
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        gender: true,
        categoryId: true,
        collections: { select: { collectionId: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } }
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 2e3
    })
  ]);
  const departments = ["men", "women"].map((key) => {
    const want = key === "men" ? "MEN" : "WOMEN";
    const rows = genderRows.filter((r) => r.gender === want || r.gender === "UNISEX");
    const catCount = /* @__PURE__ */ new Map();
    const colIds = /* @__PURE__ */ new Set();
    rows.forEach((r) => {
      if (r.categoryId) catCount.set(r.categoryId, (catCount.get(r.categoryId) || 0) + 1);
      r.collections.forEach((c) => colIds.add(c.collectionId));
    });
    return {
      key,
      name: key === "men" ? "Men" : "Women",
      count: rows.length,
      coverImage: rows.find((r) => r.gender === want && r.images[0])?.images[0]?.url || rows.find((r) => r.images[0])?.images[0]?.url || null,
      categories: categories.filter((c) => catCount.has(c.id)).map((c) => ({ id: c.id, name: c.name, slug: c.slug, group: c.group || "TOP", count: catCount.get(c.id) || 0 })),
      collections: collections.filter((c) => c.showInMenu && colIds.has(c.id)).map((c) => ({ id: c.id, name: c.name, slug: c.slug }))
    };
  });
  const toSection = (c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    bannerImageUrl: c.bannerImageUrl,
    mobileBannerUrl: c.mobileBannerUrl,
    layout: c.homeLayout,
    products: c.products.map((cp) => serializeProduct(cp.product))
  });
  const body = {
    settings,
    latestDrop: latest.map(serializeProduct),
    sections: collections.filter((c) => (c.homeLayout === "CAROUSEL" || c.homeLayout === "GRID") && c.products.length > 0).map(toSection),
    gallery: collections.filter((c) => c.showInGallery && c.bannerImageUrl).map((c) => ({ id: c.id, name: c.name, slug: c.slug, bannerImageUrl: c.bannerImageUrl, mobileBannerUrl: c.mobileBannerUrl })),
    menu: {
      collections: collections.filter((c) => c.showInMenu && c.products.length > 0).map((c) => ({ id: c.id, name: c.name, slug: c.slug, bannerImageUrl: c.bannerImageUrl })),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        group: c.group || "TOP",
        imageUrl: c.imageUrl,
        count: c._count.products
      })),
      colors: colors.map((c) => c.colorGroup).filter(Boolean),
      departments
    }
  };
  cache2 = { body, expires: Date.now() + 20 * 1e3 };
  res.set("Cache-Control", "public, max-age=20");
  res.json(body);
}

// src/controllers/mediaController.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_os = __toESM(require("os"), 1);
var import_path = __toESM(require("path"), 1);
var MAX_BYTES = 8 * 1024 * 1024;
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a") return { mime: "image/gif", ext: "gif" };
  if (buf.subarray(4, 12).toString("ascii").startsWith("ftypavif")) return { mime: "image/avif", ext: "avif" };
  return null;
}
async function uploadMedia(req, res) {
  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) throw new AppError("No image received", 400);
  if (body.length > MAX_BYTES) throw new AppError("Image is too large (max 8 MB)", 413);
  const kind = sniff(body);
  if (!kind) throw new AppError("Only JPG, PNG, WEBP, GIF or AVIF images can be uploaded", 415);
  const width = Number(req.headers["x-image-width"]) || null;
  const height = Number(req.headers["x-image-height"]) || null;
  const fileName = String(req.headers["x-file-name"] || "").slice(0, 180) || null;
  const file = await prisma.mediaFile.create({
    data: { mime: kind.mime, size: body.length, width, height, fileName: fileName ? decodeURIComponent(fileName) : null, data: body },
    select: { id: true }
  });
  res.status(201).json({ id: file.id, url: `/media/${file.id}.${kind.ext}`, size: body.length, width, height });
}
var VIDEO_CHUNK = 4 * 1024 * 1024;
var MAX_VIDEO_BYTES = 60 * 1024 * 1024;
function sniffVideo(buf) {
  if (buf.length < 12) return null;
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    return brand.startsWith("qt") ? { mime: "video/quicktime", ext: "mov" } : { mime: "video/mp4", ext: "mp4" };
  }
  if (buf[0] === 26 && buf[1] === 69 && buf[2] === 223 && buf[3] === 163) return { mime: "video/webm", ext: "webm" };
  return null;
}
var extFor = (mime) => mime === "video/webm" ? "webm" : mime === "video/quicktime" ? "mov" : "mp4";
async function uploadVideoChunk(req, res) {
  const body = req.body;
  const id = String(req.headers["x-upload-id"] || "");
  const idx = Number(req.headers["x-chunk-index"]);
  const total = Number(req.headers["x-chunk-total"]);
  const totalSize = Number(req.headers["x-total-size"]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new AppError("Invalid upload id", 400);
  if (!Buffer.isBuffer(body) || body.length === 0) throw new AppError("No video data received", 400);
  if (!Number.isInteger(idx) || !Number.isInteger(total) || total < 1 || idx < 0 || idx >= total) throw new AppError("Invalid video piece", 400);
  if (!Number.isFinite(totalSize) || totalSize <= 0 || totalSize > MAX_VIDEO_BYTES) throw new AppError("Video is too large (max 60 MB)", 413);
  if (total !== Math.ceil(totalSize / VIDEO_CHUNK)) throw new AppError("Video piece count does not match its size", 400);
  const expected = idx < total - 1 ? VIDEO_CHUNK : totalSize - VIDEO_CHUNK * (total - 1);
  if (body.length !== expected) throw new AppError("Video piece has the wrong size \u2014 please try the upload again", 400);
  if (idx === 0) {
    const kind = sniffVideo(body);
    if (!kind) throw new AppError("Only MP4, MOV or WEBM videos can be uploaded", 415);
    const existing = await prisma.mediaFile.findUnique({ where: { id }, select: { complete: true } });
    if (existing?.complete) throw new AppError("This upload is already finished", 409);
    const fileName = String(req.headers["x-file-name"] || "").slice(0, 180);
    await prisma.mediaFile.upsert({
      where: { id },
      update: { mime: kind.mime, size: totalSize, chunkCount: total, complete: false },
      create: {
        id,
        mime: kind.mime,
        size: totalSize,
        fileName: fileName ? decodeURIComponent(fileName) : null,
        data: Buffer.alloc(0),
        chunkCount: total,
        complete: false
      }
    });
  } else {
    const file2 = await prisma.mediaFile.findUnique({ where: { id }, select: { complete: true, chunkCount: true, size: true } });
    if (!file2 || file2.complete || file2.chunkCount !== total || file2.size !== totalSize) throw new AppError("Upload not found \u2014 please start again", 404);
  }
  await prisma.mediaChunk.upsert({
    where: { mediaId_idx: { mediaId: id, idx } },
    update: { data: body },
    create: { mediaId: id, idx, data: body }
  });
  if (idx < total - 1) {
    res.json({ ok: true, received: idx + 1, total });
    return;
  }
  const count = await prisma.mediaChunk.count({ where: { mediaId: id } });
  if (count !== total) throw new AppError("Some video pieces are missing \u2014 please upload again", 400);
  const file = await prisma.mediaFile.update({ where: { id }, data: { complete: true }, select: { mime: true } });
  res.status(201).json({ id, url: `/media/${id}.${extFor(file.mime)}`, size: totalSize });
}
async function serveMedia(req, res) {
  const id = String(req.params.file || "").split(".")[0];
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    res.status(404).end();
    return;
  }
  if (req.headers["if-none-match"] === `"${id}"` && !req.headers.range) {
    res.status(304).end();
    return;
  }
  const meta = await prisma.mediaFile.findUnique({ where: { id }, select: { mime: true, size: true, chunkCount: true, complete: true } });
  if (!meta || !meta.complete) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", meta.mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("ETag", `"${id}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (meta.chunkCount > 0) {
    await streamVideo(req, res, id, meta.size, meta.chunkCount);
    return;
  }
  const file = await prisma.mediaFile.findUnique({ where: { id }, select: { data: true } });
  res.end(Buffer.from(file.data));
}
var CACHE_DIR = import_path.default.join(import_os.default.tmpdir(), "levix-media-cache");
var building = /* @__PURE__ */ new Map();
async function cachedVideoFile(id, size, chunkCount) {
  const file = import_path.default.join(CACHE_DIR, id);
  try {
    const st = await import_fs2.default.promises.stat(file);
    if (st.size === size) return file;
  } catch {
  }
  if (!building.has(id)) {
    const job = (async () => {
      await import_fs2.default.promises.mkdir(CACHE_DIR, { recursive: true });
      const tmp = `${file}.${process.pid}.part`;
      const fh = await import_fs2.default.promises.open(tmp, "w");
      try {
        for (let i = 0; i < chunkCount; i++) {
          const chunk = await prisma.mediaChunk.findUnique({ where: { mediaId_idx: { mediaId: id, idx: i } }, select: { data: true } });
          if (!chunk) throw new Error(`missing chunk ${i}`);
          await fh.write(Buffer.from(chunk.data));
        }
      } finally {
        await fh.close();
      }
      const st = await import_fs2.default.promises.stat(tmp);
      if (st.size === size) await import_fs2.default.promises.rename(tmp, file);
      else await import_fs2.default.promises.unlink(tmp).catch(() => void 0);
    })().catch((err) => console.error("Video cache build failed:", err?.message || err)).finally(() => building.delete(id));
    building.set(id, job);
  }
  return null;
}
async function streamVideo(req, res, id, size, chunkCount) {
  res.setHeader("Accept-Ranges", "bytes");
  let start = 0;
  let end = size - 1;
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || m[1] === "" && m[2] === "") {
      res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
      return;
    }
    if (m[1] === "") {
      start = Math.max(0, size - Number(m[2]));
    } else {
      start = Number(m[1]);
      if (m[2] !== "") end = Math.min(size - 1, Number(m[2]));
    }
    if (start > end || start >= size) {
      res.status(416).setHeader("Content-Range", `bytes */${size}`).end();
      return;
    }
    if (m[2] === "") end = Math.min(end, start + 2 * VIDEO_CHUNK - 1);
    res.status(206).setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
  }
  res.setHeader("Content-Length", String(end - start + 1));
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  const cached = await cachedVideoFile(id, size, chunkCount);
  if (cached) {
    const stream = import_fs2.default.createReadStream(cached, { start, end });
    stream.on("error", () => res.destroy());
    req.on("close", () => stream.destroy());
    stream.pipe(res);
    return;
  }
  let closed = false;
  req.on("close", () => closed = true);
  const first = Math.floor(start / VIDEO_CHUNK);
  const last = Math.min(chunkCount - 1, Math.floor(end / VIDEO_CHUNK));
  for (let i = first; i <= last && !closed; i++) {
    const chunk = await prisma.mediaChunk.findUnique({ where: { mediaId_idx: { mediaId: id, idx: i } }, select: { data: true } });
    if (!chunk) break;
    const buf = Buffer.from(chunk.data);
    const base = i * VIDEO_CHUNK;
    const from = Math.max(0, start - base);
    const to = Math.min(buf.length, end - base + 1);
    if (!res.write(buf.subarray(from, to))) await new Promise((r) => res.once("drain", r));
  }
  res.end();
}

// src/routes/adminRoutes.ts
var router7 = (0, import_express7.Router)();
router7.use(verifyFirebaseToken);
router7.use(requireAdmin);
router7.use((req, res, next) => {
  if (req.method !== "GET") res.on("finish", invalidateHomeCache);
  next();
});
router7.get("/metrics", asyncHandler(getDashboardMetrics));
router7.post("/media", import_express7.default.raw({ type: ["image/*", "application/octet-stream"], limit: "8mb" }), asyncHandler(uploadMedia));
router7.post("/media/video", import_express7.default.raw({ type: ["video/*", "application/octet-stream"], limit: "5mb" }), asyncHandler(uploadVideoChunk));
router7.get("/orders", asyncHandler(getAllOrders));
router7.patch("/orders/:id", asyncHandler(updateOrder));
router7.patch("/orders/:id/status", asyncHandler(updateOrder));
router7.delete("/orders/:id", asyncHandler(deleteOrder));
router7.get("/products", asyncHandler(getAdminProducts));
router7.post("/products", asyncHandler(createProduct));
router7.put("/products/:id", asyncHandler(updateProduct));
router7.delete("/products/:id", asyncHandler(deleteProduct));
router7.post("/categories", asyncHandler(createCategory));
router7.put("/categories/:id", asyncHandler(updateCategory));
router7.delete("/categories/:id", asyncHandler(deleteCategory));
router7.get("/settings", asyncHandler(getAdminStoreSettings));
router7.post("/settings", asyncHandler(updateAdminStoreSettings));
router7.put("/settings", asyncHandler(updateAdminStoreSettings));
router7.get("/discounts", asyncHandler(getAdminDiscounts));
router7.post("/discounts", asyncHandler(createAdminDiscount));
router7.patch("/discounts/:id/toggle", asyncHandler(toggleAdminDiscount));
router7.delete("/discounts/:id", asyncHandler(deleteAdminDiscount));
router7.get("/subscribers", asyncHandler(exportSubscribers));
router7.get("/collections", asyncHandler(getAdminCollections));
router7.post("/collections", asyncHandler(createCollection));
router7.put("/collections/:id", asyncHandler(updateCollection));
router7.delete("/collections/:id", asyncHandler(deleteCollection));
var adminRoutes_default = router7;

// src/routes/storeRoutes.ts
var import_express8 = require("express");
var import_zod8 = require("zod");
var router8 = (0, import_express8.Router)();
router8.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.set("Cache-Control", "public, max-age=30");
    res.json({ settings: await getSettings() });
  })
);
router8.get("/categories", asyncHandler(getCategories));
router8.get("/home", asyncHandler(getHome));
router8.post(
  "/subscribe",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { email } = import_zod8.z.object({ email: import_zod8.z.string().trim().toLowerCase().email("Enter a valid email address").max(190) }).parse(req.body);
    await prisma.subscriber.upsert({ where: { email }, update: {}, create: { email } });
    res.json({ success: true });
  })
);
var storeRoutes_default = router8;

// src/routes/wishlistRoutes.ts
var import_express9 = require("express");

// src/controllers/wishlistController.ts
var import_zod9 = require("zod");
async function getOrCreateWishlist(userId) {
  return prisma.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
}
async function send(res, userId) {
  const wl = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: { product: { include: productListInclude } }
      }
    }
  });
  const products = (wl?.items || []).map((i) => i.product).filter((p) => p.isActive).map(serializeProduct);
  res.set("Cache-Control", "no-store");
  res.json({ productIds: products.map((p) => p.id), products });
}
async function getWishlist(req, res) {
  if (!req.user) throw new AppError("Please sign in", 401);
  await send(res, req.user.id);
}
async function toggleWishlist(req, res) {
  if (!req.user) throw new AppError("Please sign in", 401);
  const productId = req.params.productId;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new AppError("Product not found", 404);
  const wl = await getOrCreateWishlist(req.user.id);
  const existing = await prisma.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wl.id, productId } } });
  if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
  else await prisma.wishlistItem.create({ data: { wishlistId: wl.id, productId } });
  await send(res, req.user.id);
}
async function mergeWishlist(req, res) {
  if (!req.user) throw new AppError("Please sign in", 401);
  const { productIds } = import_zod9.z.object({ productIds: import_zod9.z.array(import_zod9.z.string().max(64)).max(200) }).parse(req.body);
  const wl = await getOrCreateWishlist(req.user.id);
  if (productIds.length) {
    const valid = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } });
    for (const p of valid) {
      await prisma.wishlistItem.upsert({
        where: { wishlistId_productId: { wishlistId: wl.id, productId: p.id } },
        update: {},
        create: { wishlistId: wl.id, productId: p.id }
      }).catch(() => void 0);
    }
  }
  await send(res, req.user.id);
}
async function getProductsByIds(req, res) {
  const ids = String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
  if (!ids.length) {
    res.json({ products: [] });
    return;
  }
  const products = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true }, include: productListInclude });
  const byId = new Map(products.map((p) => [p.id, p]));
  res.json({ products: ids.map((id) => byId.get(id)).filter(Boolean).map(serializeProduct) });
}

// src/routes/wishlistRoutes.ts
var router9 = (0, import_express9.Router)();
router9.get("/products", asyncHandler(getProductsByIds));
router9.get("/", verifyFirebaseToken, asyncHandler(getWishlist));
router9.post("/merge", verifyFirebaseToken, asyncHandler(mergeWishlist));
router9.post("/:productId", verifyFirebaseToken, asyncHandler(toggleWishlist));
var wishlistRoutes_default = router9;

// src/app.ts
var app = (0, import_express10.default)();
app.set("trust proxy", 1);
app.disable("x-powered-by");
var FIREBASE_AUTH_HOST = `https://${env.FIREBASE_PROJECT_ID || "levix-8bb56"}.firebaseapp.com`;
var readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
  req.on("end", () => resolve(Buffer.concat(chunks)));
  req.on("error", reject);
});
app.all(["/__/auth/*", "/__/firebase/*"], async (req, res) => {
  try {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v !== "string") continue;
      if (["host", "connection", "content-length", "accept-encoding"].includes(k)) continue;
      headers[k] = v;
    }
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const body = hasBody ? await readBody(req) : void 0;
    const upstream = await fetch(FIREBASE_AUTH_HOST + req.originalUrl, {
      method: req.method,
      headers,
      body: body && body.length ? new Uint8Array(body) : void 0,
      redirect: "manual"
    });
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (["content-encoding", "content-length", "transfer-encoding", "connection"].includes(key)) return;
      res.setHeader(key, value);
    });
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error("Auth proxy error:", err?.message);
    res.status(502).send("Sign-in service temporarily unavailable");
  }
});
app.use(
  (0, import_helmet.default)({
    // CSP is left off because Razorpay Checkout and Firebase Auth load from many Google/Razorpay domains.
    contentSecurityPolicy: false,
    // Needed for Google sign-in popups and Razorpay checkout windows.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Keep the same browsing setup as Firebase's sign-in helper pages.
    originAgentCluster: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  })
);
app.use((0, import_compression.default)());
var allowedOrigins = new Set(
  [env.FRONTEND_URL, "https://thelevix.shop", "https://www.thelevix.shop", "http://localhost:5173", "http://localhost:4173"].filter(
    Boolean
  )
);
app.use(
  "/api",
  (0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || env.NODE_ENV !== "production") return callback(null, true);
      return callback(null, false);
    },
    credentials: false,
    allowedHeaders: ["Content-Type", "Authorization", "X-Anonymous-Token"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400
  })
);
app.use(
  import_express10.default.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express10.default.urlencoded({ extended: false, limit: "1mb" }));
app.get("/api/health", async (_req, res) => {
  let database = "ok";
  let databaseProblem;
  try {
    await prisma.$queryRaw`SELECT 1`;
    try {
      await prisma.storeSetting.count();
    } catch {
      database = "unavailable";
      databaseProblem = "connected, but tables are missing (they are created automatically on start-up; restart the app)";
    }
  } catch (err) {
    database = "unavailable";
    const msg = String(err?.message || "");
    databaseProblem = !process.env.DATABASE_URL ? "DATABASE_URL is not set" : /P1000|Authentication failed|Access denied/i.test(msg) ? "wrong database username or password in DATABASE_URL" : /P1001|Can't reach|ECONNREFUSED|ETIMEDOUT/i.test(msg) ? "database server not reachable at the host in DATABASE_URL" : /P1003|does not exist/i.test(msg) ? "database name in DATABASE_URL does not exist" : "database error";
  }
  res.set("Cache-Control", "no-store");
  res.status(database === "ok" ? 200 : 503).json({
    status: database === "ok" ? "ok" : "degraded",
    database,
    ...databaseProblem ? { databaseProblem } : {},
    payments: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    signIn: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID),
    service: "levix",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: Math.round(process.uptime())
  });
});
app.use("/api", apiRateLimiter);
app.use("/api/store", storeRoutes_default);
app.use("/api/auth", authRoutes_default);
app.use("/api/products", productRoutes_default);
app.use("/api/collections", collectionRoutes_default);
app.use("/api/cart", cartRoutes_default);
app.use("/api/orders", orderRoutes_default);
app.use("/api/payments", paymentRoutes_default);
app.use("/api/wishlist", wishlistRoutes_default);
app.use("/api/admin", adminRoutes_default);
app.use("/api", notFoundApi);
app.get("/media/:file", asyncHandler(serveMedia));
app.get(
  "/sitemap.xml",
  asyncHandler(async (_req, res) => {
    const base = "https://thelevix.shop";
    const [products, collections, categories] = await Promise.all([
      prisma.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
      prisma.collection.findMany({ where: { isActive: true }, select: { slug: true } }),
      prisma.category.findMany({ select: { slug: true } })
    ]);
    const fixed = [
      "/",
      "/collections/all-products",
      "/collections/new-in",
      "/collections/men",
      "/collections/women",
      "/pages/about",
      "/pages/track",
      "/policies/terms-of-service",
      "/policies/refund-policy",
      "/policies/shipping-policy",
      "/policies/privacy-policy",
      "/policies/contact"
    ];
    const esc = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const urls = [
      ...fixed.map((u) => `<url><loc>${base}${u}</loc></url>`),
      ...[...collections, ...categories].map((c) => `<url><loc>${base}/collections/${esc(c.slug)}</loc></url>`),
      ...products.map((p) => `<url><loc>${base}/products/${esc(p.slug)}</loc><lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod></url>`)
    ];
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  })
);
var currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
var possiblePaths = [
  import_path2.default.resolve(process.cwd(), "frontend/dist"),
  import_path2.default.resolve(currentDir, "frontend/dist"),
  import_path2.default.resolve(currentDir, "../frontend/dist"),
  import_path2.default.resolve(currentDir, "../../frontend/dist"),
  import_path2.default.resolve(process.cwd(), "dist")
];
var frontendDist = possiblePaths.find((p) => {
  try {
    return import_fs3.default.existsSync(import_path2.default.join(p, "index.html"));
  } catch {
    return false;
  }
}) || "";
if (frontendDist) {
  console.log(`\u2713 Serving storefront from: ${frontendDist}`);
  app.use(
    import_express10.default.static(frontendDist, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${import_path2.default.sep}assets${import_path2.default.sep}`)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith("sw.js") || filePath.endsWith("index.html") || filePath.endsWith("manifest.json")) {
          res.setHeader("Cache-Control", "no-cache");
        } else {
          res.setHeader("Cache-Control", "public, max-age=86400");
        }
      }
    })
  );
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    if (/\.[a-z0-9]{2,5}$/i.test(req.path)) {
      res.status(404).end();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(import_path2.default.join(frontendDist, "index.html"));
  });
} else {
  console.warn("\u26A0\uFE0F frontend/dist not found. Checked:", possiblePaths);
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.status(503).send("<h1>LEVIX</h1><p>The store is being updated. Please refresh in a moment.</p>");
  });
}
app.use(errorHandler);

// src/server.ts
var import_child_process = require("child_process");
var import_path3 = __toESM(require("path"), 1);
var import_fs4 = __toESM(require("fs"), 1);
function runDbPush() {
  return new Promise((resolve) => {
    const roots = [process.cwd(), import_path3.default.resolve(process.cwd(), "..")];
    const root = roots.find((r) => import_fs4.default.existsSync(import_path3.default.join(r, "node_modules", "prisma", "build", "index.js")));
    const schema = roots.map((r) => import_path3.default.join(r, "prisma", "schema.prisma")).find((f) => import_fs4.default.existsSync(f));
    if (!root || !schema) {
      console.warn("\u26A0\uFE0F Cannot auto-create tables: prisma CLI or schema not found.");
      return resolve(false);
    }
    console.log("\u2026 Creating/updating database tables (prisma db push)\u2026");
    (0, import_child_process.execFile)(
      process.execPath,
      [import_path3.default.join(root, "node_modules", "prisma", "build", "index.js"), "db", "push", "--skip-generate", `--schema=${schema}`],
      { cwd: root, env: process.env, timeout: 12e4 },
      (err, stdout, stderr) => {
        if (err) {
          console.error("\u26A0\uFE0F prisma db push failed:", (stderr || stdout || err.message).toString().slice(-800));
          return resolve(false);
        }
        console.log("\u2713 Database tables are up to date.");
        resolve(true);
      }
    );
  });
}
var rawPort = process.env.PORT || 3e3;
function bootstrap() {
  const isSocket = typeof rawPort === "string" && isNaN(Number(rawPort));
  const port = isSocket ? rawPort : Number(rawPort) || 3e3;
  const server = isSocket ? app.listen(port, () => console.log(`\u2713 LEVIX listening on socket ${port} [${env.NODE_ENV}]`)) : app.listen(port, "0.0.0.0", () => console.log(`\u2713 LEVIX listening on port ${port} [${env.NODE_ENV}]`));
  server.keepAliveTimeout = 65e3;
  server.headersTimeout = 66e3;
  if (!isRazorpayConfigured()) console.warn("\u26A0\uFE0F RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing \u2014 checkout is disabled.");
  if (!env.RAZORPAY_WEBHOOK_SECRET) console.warn("\u26A0\uFE0F RAZORPAY_WEBHOOK_SECRET missing \u2014 payment webhooks are disabled.");
  if (!env.FIREBASE_PROJECT_ID) console.warn("\u26A0\uFE0F FIREBASE_PROJECT_ID missing \u2014 sign-in will not work.");
  prisma.$connect().then(async () => {
    console.log("\u2713 Connected to MySQL.");
    try {
      await ensureStoreDefaults();
      console.log("\u2713 Store defaults ready.");
    } catch (err) {
      if (["P2021", "P2022"].includes(err?.code) || /does not exist/i.test(err?.message || "")) {
        if (await runDbPush()) {
          try {
            await ensureStoreDefaults();
            console.log("\u2713 Store defaults ready.");
          } catch (e) {
            console.error("\u26A0\uFE0F Store defaults still failing:", e?.message);
          }
        }
      } else {
        console.error("\u26A0\uFE0F Could not prepare store defaults:", err?.message);
      }
    }
  }).catch((err) => {
    const msg = String(err?.message || err);
    console.error("\u26A0\uFE0F Database connection failed:", msg);
    if (/P1000|Authentication failed|Access denied/i.test(msg)) {
      console.error("   \u2192 The DATABASE_URL username or password is wrong. In hPanel \u2192 Databases, copy the exact MySQL username (looks like u123456789_name) and reset its password.");
    }
  });
  const shutdown = (signal) => {
    console.log(`${signal} received \u2014 shutting down gracefully.`);
    server.close(async () => {
      try {
        await prisma.$disconnect();
      } catch {
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1e4).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => console.error("Unhandled promise rejection:", reason));
  return server;
}
var serverInstance = bootstrap();
var server_default = app;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  serverInstance
});
module.exports = app; module.exports.default = app; module.exports.app = app; module.exports.serverInstance = serverInstance;
