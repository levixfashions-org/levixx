import { Role } from '@prisma/client';
import { adminAuth } from '../config/firebase-admin.js';
import { prisma } from '../config/db.js';
import { isAdminEmail } from '../config/env.js';
// Small in-memory cache so we don't hit MySQL on every authenticated request.
const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const userCache = new Map();
function extractBearer(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
        return null;
    const token = header.slice(7).trim();
    return token || null;
}
async function syncUser(decoded) {
    const uid = decoded.uid;
    const email = (decoded.email || `${uid}@users.thelevix.shop`).trim().toLowerCase();
    const emailVerified = Boolean(decoded.email_verified);
    // Only a Google/Firebase-verified owner email becomes ADMIN.
    const role = emailVerified && isAdminEmail(email) ? Role.ADMIN : Role.CUSTOMER;
    const cacheKey = `${uid}:${email}:${role}`;
    const cached = userCache.get(cacheKey);
    if (cached && cached.expires > Date.now())
        return cached.user;
    let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) {
        // Same email may exist from an earlier sign-in method — re-link it.
        const byEmail = await prisma.user.findUnique({ where: { email } });
        if (byEmail) {
            user = await prisma.user.update({
                where: { id: byEmail.id },
                data: { firebaseUid: uid, role, ...(decoded.name && !byEmail.name ? { name: decoded.name } : {}) }
            });
        }
        else {
            user = await prisma.user.create({
                data: { firebaseUid: uid, email, name: decoded.name || null, role }
            });
        }
    }
    else if (user.email !== email || user.role !== role || (!user.name && decoded.name)) {
        user = await prisma.user.update({
            where: { id: user.id },
            data: { email, role, ...(!user.name && decoded.name ? { name: decoded.name } : {}) }
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
    if (userCache.size > 5000) {
        const now = Date.now();
        for (const [k, v] of userCache)
            if (v.expires < now)
                userCache.delete(k);
    }
    return authUser;
}
/** Requires a valid Firebase ID token. */
export async function verifyFirebaseToken(req, res, next) {
    const token = extractBearer(req);
    if (!token) {
        res.status(401).json({ error: 'Please sign in to continue.' });
        return;
    }
    let decoded;
    try {
        decoded = await adminAuth().verifyIdToken(token);
    }
    catch (err) {
        res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
        return;
    }
    try {
        req.user = await syncUser(decoded);
        next();
    }
    catch (err) {
        next(err);
    }
}
/** Attaches req.user when a valid token is present, otherwise continues as a guest. */
export async function optionalAuth(req, _res, next) {
    const token = extractBearer(req);
    if (!token)
        return next();
    try {
        const decoded = await adminAuth().verifyIdToken(token);
        req.user = await syncUser(decoded);
    }
    catch {
        // invalid/expired token → treat as guest
    }
    next();
}
export function requireAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Please sign in to continue.' });
        return;
    }
    if (req.user.role !== Role.ADMIN || !req.user.emailVerified || !isAdminEmail(req.user.email)) {
        res.status(403).json({ error: 'Admin access is restricted to the store owner.' });
        return;
    }
    next();
}
