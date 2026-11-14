import crypto from 'crypto';

/**
 * Minimal, dependency-free Web Push (RFC 8030 + VAPID RFC 8292 + message encryption RFC 8291 / aes128gcm RFC 8188).
 * Works with Chrome/Android (FCM), Firefox, Edge and Safari/iOS 16.4+ (Apple Web Push).
 */

export interface VapidKeys {
  publicKey: string; // base64url, 65-byte uncompressed P-256 point
  privateKey: string; // base64url, 32-byte scalar (JWK "d")
}

export interface PushTarget {
  endpoint: string;
  p256dh: string; // base64url
  auth: string; // base64url
}

const b64u = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export function generateVapidKeys(): VapidKeys {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pub = publicKey.export({ format: 'jwk' }) as crypto.JsonWebKey;
  const priv = privateKey.export({ format: 'jwk' }) as crypto.JsonWebKey;
  const raw = Buffer.concat([Buffer.from([4]), fromB64u(pub.x!), fromB64u(pub.y!)]);
  return { publicKey: b64u(raw), privateKey: priv.d! };
}

function vapidPrivateKeyObject(keys: VapidKeys): crypto.KeyObject {
  const raw = fromB64u(keys.publicKey);
  return crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', x: b64u(raw.subarray(1, 33)), y: b64u(raw.subarray(33, 65)), d: keys.privateKey },
    format: 'jwk'
  });
}

/** VAPID Authorization header value for an endpoint's push service. */
export function vapidAuthHeader(endpoint: string, keys: VapidKeys, subject: string): string {
  const aud = new URL(endpoint).origin;
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(Buffer.from(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const data = `${header}.${claims}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: vapidPrivateKeyObject(keys), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${data}.${b64u(sig)}, k=${keys.publicKey}`;
}

const hmac = (key: Buffer, data: Buffer) => crypto.createHmac('sha256', key).update(data).digest();

/** Encrypts a payload for one subscription (aes128gcm, single record). */
export function encryptPayload(target: PushTarget, payload: Buffer, salt = crypto.randomBytes(16), ecdh?: crypto.ECDH): Buffer {
  const uaPublic = fromB64u(target.p256dh);
  const authSecret = fromB64u(target.auth);
  const local = ecdh || crypto.createECDH('prime256v1');
  if (!ecdh) local.generateKeys();
  const asPublic = local.getPublicKey();
  const shared = local.computeSecret(uaPublic);

  // RFC 8291: IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" || 0 || ua_public || as_public, 32)
  const prkKey = hmac(authSecret, shared);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]);
  const ikm = hmac(prkKey, keyInfo);
  // RFC 8188
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([payload, Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
}

export interface SendResult {
  ok: boolean;
  status: number;
  /** Subscription is gone for good (unsubscribed / expired) — delete it. */
  gone: boolean;
}

export async function sendPush(
  target: PushTarget,
  payload: object,
  keys: VapidKeys,
  subject: string,
  opts: { ttl?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high'; topic?: string } = {}
): Promise<SendResult> {
  const body = encryptPayload(target, Buffer.from(JSON.stringify(payload)));
  const headers: Record<string, string> = {
    Authorization: vapidAuthHeader(target.endpoint, keys, subject),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(opts.ttl ?? 4 * 24 * 3600),
    Urgency: opts.urgency || 'normal'
  };
  if (opts.topic) headers.Topic = opts.topic.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(target.endpoint, { method: 'POST', headers, body, signal: ctrl.signal });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, gone: res.status === 404 || res.status === 410 };
  } catch {
    return { ok: false, status: 0, gone: false };
  } finally {
    clearTimeout(timer);
  }
}
