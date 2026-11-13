import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.string().default('production'),
    PORT: z.union([z.string(), z.number()]).optional(),
    DATABASE_URL: z.string().optional().default(''),
    FRONTEND_URL: z.string().optional().default('https://thelevix.shop'),
    // Comma separated list of owner/admin emails (must be Firebase-verified emails)
    ADMIN_EMAILS: z.string().optional().default('levixfashions@gmail.com'),
    // Firebase Admin (only the project id is required to verify ID tokens)
    FIREBASE_PROJECT_ID: z.string().optional(),
    VITE_FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().optional(),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM_NAME: z.string().optional(),
    // Razorpay
    RAZORPAY_KEY_ID: z.string().optional().default(''),
    RAZORPAY_KEY_SECRET: z.string().optional().default(''),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional().default('')
}).passthrough();
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.warn('⚠️ Environment configuration warning:', parsed.error.format());
}
const data = parsed.success ? parsed.data : process.env;
function cleanSecret(v) {
    return String(v ?? '')
        .trim()
        .replace(/^['"`]+|['"`]+$/g, '')
        .trim();
}
export const env = {
    NODE_ENV: String(data.NODE_ENV || 'production'),
    DATABASE_URL: String(data.DATABASE_URL || ''),
    FRONTEND_URL: String(data.FRONTEND_URL || 'https://thelevix.shop').replace(/\/+$/, ''),
    ADMIN_EMAILS: String(data.ADMIN_EMAILS || 'levixfashions@gmail.com')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    FIREBASE_PROJECT_ID: (data.FIREBASE_PROJECT_ID || data.VITE_FIREBASE_PROJECT_ID || ''),
    FIREBASE_CLIENT_EMAIL: data.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: data.FIREBASE_PRIVATE_KEY,
    FIREBASE_SERVICE_ACCOUNT_PATH: data.FIREBASE_SERVICE_ACCOUNT_PATH,
    FIREBASE_SERVICE_ACCOUNT_JSON: data.FIREBASE_SERVICE_ACCOUNT_JSON,
    // Outgoing email (Hostinger mailbox by default)
    SMTP_HOST: String(data.SMTP_HOST || 'smtp.hostinger.com'),
    SMTP_PORT: Number(data.SMTP_PORT || 465),
    SMTP_USER: String(data.SMTP_USER || ''),
    SMTP_PASS: String(data.SMTP_PASS || ''),
    MAIL_FROM_NAME: String(data.MAIL_FROM_NAME || 'LEVIX'),
    // Keys pasted into a hosting panel often pick up spaces or quotes — clean them so Razorpay accepts them.
    RAZORPAY_KEY_ID: cleanSecret(data.RAZORPAY_KEY_ID),
    RAZORPAY_KEY_SECRET: cleanSecret(data.RAZORPAY_KEY_SECRET),
    RAZORPAY_WEBHOOK_SECRET: cleanSecret(data.RAZORPAY_WEBHOOK_SECRET)
};
export const isProduction = env.NODE_ENV === 'production';
export function isAdminEmail(email) {
    if (!email)
        return false;
    return env.ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
