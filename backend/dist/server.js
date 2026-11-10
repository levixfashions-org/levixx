import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { ensureStoreDefaults } from './services/store.js';
import { isRazorpayConfigured } from './config/razorpay.js';
const rawPort = process.env.PORT || 3000;
function bootstrap() {
    // Hostinger may pass a unix socket path instead of a numeric port.
    const isSocket = typeof rawPort === 'string' && isNaN(Number(rawPort));
    const port = isSocket ? rawPort : Number(rawPort) || 3000;
    const server = isSocket
        ? app.listen(port, () => console.log(`✓ LEVIX listening on socket ${port} [${env.NODE_ENV}]`))
        : app.listen(port, '0.0.0.0', () => console.log(`✓ LEVIX listening on port ${port} [${env.NODE_ENV}]`));
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    if (!isRazorpayConfigured())
        console.warn('⚠️ RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing — checkout is disabled.');
    if (!env.RAZORPAY_WEBHOOK_SECRET)
        console.warn('⚠️ RAZORPAY_WEBHOOK_SECRET missing — payment webhooks are disabled.');
    if (!env.FIREBASE_PROJECT_ID)
        console.warn('⚠️ FIREBASE_PROJECT_ID missing — sign-in will not work.');
    prisma
        .$connect()
        .then(async () => {
        console.log('✓ Connected to MySQL.');
        try {
            await ensureStoreDefaults();
            console.log('✓ Store defaults ready.');
        }
        catch (err) {
            console.error('⚠️ Could not prepare store defaults (did you run `npx prisma db push`?):', err?.message);
        }
    })
        .catch((err) => console.error('⚠️ Database connection failed:', err?.message || err));
    const shutdown = (signal) => {
        console.log(`${signal} received — shutting down gracefully.`);
        server.close(async () => {
            try {
                await prisma.$disconnect();
            }
            catch {
                /* ignore */
            }
            process.exit(0);
        });
        setTimeout(() => process.exit(0), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason));
    return server;
}
const serverInstance = bootstrap();
export default app;
export { app, serverInstance };
