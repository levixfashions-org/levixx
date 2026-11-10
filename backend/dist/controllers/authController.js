import { z } from 'zod';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
const phoneSchema = z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');
export const addressSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    line1: z.string().trim().min(3).max(200),
    line2: z.string().trim().max(200).optional().or(z.literal('')).transform((v) => v || undefined),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
    country: z.string().trim().default('India'),
    phone: phoneSchema,
    isDefault: z.boolean().default(false)
});
export async function getProfile(req, res) {
    if (!req.user)
        throw new AppError('Please sign in to continue.', 401);
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
            addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
            _count: { select: { orders: true, reviews: true } }
        }
    });
    if (!user)
        throw new AppError('Profile not found', 404);
    res.set('Cache-Control', 'no-store');
    res.json({ user: { ...user, emailVerified: req.user.emailVerified } });
}
export async function updateProfile(req, res) {
    if (!req.user)
        throw new AppError('Please sign in to continue.', 401);
    const { name, phone } = z
        .object({
        name: z.string().trim().min(2).max(100).optional(),
        phone: phoneSchema.optional()
    })
        .parse(req.body);
    const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) }
    });
    res.json({ user });
}
export async function addAddress(req, res) {
    if (!req.user)
        throw new AppError('Please sign in to continue.', 401);
    const data = addressSchema.parse(req.body);
    const count = await prisma.address.count({ where: { userId: req.user.id } });
    if (count >= 10)
        throw new AppError('You can save up to 10 addresses', 400);
    const makeDefault = data.isDefault || count === 0;
    const address = await prisma.$transaction(async (tx) => {
        if (makeDefault) {
            await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
        }
        return tx.address.create({ data: { ...data, isDefault: makeDefault, userId: req.user.id } });
    });
    res.status(201).json({ address });
}
export async function setDefaultAddress(req, res) {
    if (!req.user)
        throw new AppError('Please sign in to continue.', 401);
    const address = await prisma.address.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!address)
        throw new AppError('Address not found', 404);
    await prisma.$transaction([
        prisma.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } }),
        prisma.address.update({ where: { id: address.id }, data: { isDefault: true } })
    ]);
    res.json({ success: true });
}
export async function deleteAddress(req, res) {
    if (!req.user)
        throw new AppError('Please sign in to continue.', 401);
    await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
}
