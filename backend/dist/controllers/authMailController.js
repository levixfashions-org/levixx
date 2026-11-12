import { z } from 'zod';
import { adminAuth, firebaseHasServiceAccount } from '../config/firebase-admin.js';
import { env } from '../config/env.js';
import { brandedEmail, isMailConfigured, sendMail } from '../services/mailer.js';
const SITE = env.FRONTEND_URL || 'https://thelevix.shop';
/** Firebase builds links on <project>.firebaseapp.com — serve them from our own domain instead
 *  (thelevix.shop/__/auth/* is proxied to Firebase's action handler). */
function onOurDomain(link) {
    try {
        const u = new URL(link);
        const site = new URL(SITE);
        u.protocol = site.protocol;
        u.host = site.host;
        return u.toString();
    }
    catch {
        return link;
    }
}
export function authMailReady() {
    return isMailConfigured() && firebaseHasServiceAccount();
}
function notReady(res) {
    res.status(503).json({ error: 'Branded emails are not configured yet.', fallback: true });
}
/** POST /api/auth-mail/verify — signed-in user asks for a verification email. */
export async function sendVerification(req, res) {
    if (!authMailReady())
        return notReady(res);
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) {
        res.status(401).json({ error: 'Please sign in again.' });
        return;
    }
    const decoded = await adminAuth().verifyIdToken(token);
    const user = await adminAuth().getUser(decoded.uid);
    if (!user.email) {
        res.status(400).json({ error: 'Your account has no email address.' });
        return;
    }
    if (user.emailVerified) {
        res.json({ success: true, alreadyVerified: true });
        return;
    }
    const link = onOurDomain(await adminAuth().generateEmailVerificationLink(user.email, { url: `${SITE}/account` }));
    const name = (user.displayName || '').trim().split(' ')[0] || 'there';
    const { html, text } = brandedEmail({
        preheader: 'Confirm your email to finish setting up your LEVIX account.',
        title: 'Verify your email',
        greeting: `Hi ${name},`,
        body: 'Welcome to LEVIX! Tap the button below to confirm your email address and finish setting up your account.',
        button: 'Verify my email',
        link,
        footnote: "If you didn't create a LEVIX account, you can safely ignore this email."
    });
    await sendMail(user.email, 'Verify your email for LEVIX', html, text);
    res.json({ success: true });
}
/** POST /api/auth-mail/reset — public; always answers the same way so it can't reveal who has an account. */
export async function sendPasswordReset(req, res) {
    if (!authMailReady())
        return notReady(res);
    const { email } = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address').max(190) }).parse(req.body);
    try {
        const link = onOurDomain(await adminAuth().generatePasswordResetLink(email, { url: `${SITE}/login` }));
        const { html, text } = brandedEmail({
            preheader: 'Reset the password for your LEVIX account.',
            title: 'Reset your password',
            greeting: 'Hi,',
            body: 'We received a request to reset the password for your LEVIX account. Tap the button below to choose a new password. The link expires in 1 hour.',
            button: 'Reset password',
            link,
            footnote: "If you didn't ask to reset your password, you can ignore this email — your password won't change."
        });
        await sendMail(email, 'Reset your LEVIX password', html, text);
    }
    catch (err) {
        if (err?.code !== 'auth/user-not-found' && err?.code !== 'auth/email-not-found')
            throw err;
    }
    res.json({ success: true });
}
