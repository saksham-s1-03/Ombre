import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';
const PASSWORD = process.env.ADMIN_PASSWORD || (isProd ? null : 'admin123');
if (!PASSWORD) {
  console.error('ADMIN_PASSWORD must be set when NODE_ENV=production.');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD) console.warn('[warn] Using the default admin password "admin123". Set ADMIN_PASSWORD before deploying.');

const SECRET = process.env.TOKEN_SECRET || randomBytes(32).toString('hex');
const TTL_MS = 8 * 60 * 60 * 1000;

const sha = (s) => createHash('sha256').update(String(s)).digest();
const sign = (body) => createHmac('sha256', SECRET).update(body).digest('base64url');

export const checkPassword = (attempt) => timingSafeEqual(sha(attempt), sha(PASSWORD));

export function issueToken() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [body, sig] = token.split('.');
  const good = Buffer.from(sign(body));
  const given = Buffer.from(sig || '');
  if (good.length !== given.length || !timingSafeEqual(good, given)) return false;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now(); }
  catch { return false; }
}
