import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { ensureStoreDefaults } from './services/store.js';
import { isRazorpayConfigured } from './config/razorpay.js';
import { startSalesScoreJob, onSalesScoresUpdated } from './services/bestsellers.js';
import { invalidateHomeCache } from './controllers/homeController.js';
import { clearSeoCache } from './services/seo.js';
import { broadcastChange } from './services/live.js';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
/** Creates/updates MySQL tables from prisma/schema.prisma (safe: never drops data). */
function runDbPush() {
    return new Promise((resolve) => {
        const roots = [process.cwd(), path.resolve(process.cwd(), '..')];
        const root = roots.find((r) => fs.existsSync(path.join(r, 'node_modules', 'prisma', 'build', 'index.js')));
        const schema = roots.map((r) => path.join(r, 'prisma', 'schema.prisma')).find((f) => fs.existsSync(f));
        if (!root || !schema) {
            console.warn('⚠️ Cannot auto-create tables: prisma CLI or schema not found.');
            return resolve(false);
        }
        console.log('… Creating/updating database tables (prisma db push)…');
        execFile(process.execPath, [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'db', 'push', '--skip-generate', `--schema=${schema}`], { cwd: root, env: process.env, timeout: 120000 }, (err, stdout, stderr) => {
            if (err) {
                console.error('⚠️ prisma db push failed:', (stderr || stdout || err.message).toString().slice(-800));
                return resolve(false);
            }
            console.log('✓ Database tables are up to date.');
            resolve(true);
        });
    });
}
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
        // Best sellers: recount now and every hour; new scores refresh the shop for everyone.
        onSalesScoresUpdated(() => {
            invalidateHomeCache();
            clearSeoCache();
            broadcastChange('products');
        });
        startSalesScoreJob();
        try {
            await ensureStoreDefaults();
            console.log('✓ Store defaults ready.');
        }
        catch (err) {
            // Tables/columns missing (P2021/P2022) → create them automatically, then retry once.
            if (['P2021', 'P2022'].includes(err?.code) || /does not exist/i.test(err?.message || '')) {
                if (await runDbPush()) {
                    try {
                        await ensureStoreDefaults();
                        console.log('✓ Store defaults ready.');
                    }
                    catch (e) {
                        console.error('⚠️ Store defaults still failing:', e?.message);
                    }
                }
            }
            else {
                console.error('⚠️ Could not prepare store defaults:', err?.message);
            }
        }
    })
        .catch((err) => {
        const msg = String(err?.message || err);
        console.error('⚠️ Database connection failed:', msg);
        if (/P1000|Authentication failed|Access denied/i.test(msg)) {
            console.error('   → The DATABASE_URL username or password is wrong. In hPanel → Databases, copy the exact MySQL username (looks like u123456789_name) and reset its password.');
        }
    });
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
