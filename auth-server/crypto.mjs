import crypto from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;
export const randomToken = () => crypto.randomBytes(32).toString('base64url');
export const tokenDigest = (token) => crypto.createHash('sha256').update(token).digest('hex');
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 1024) throw new Error('Password must contain at least 12 characters');
  const salt = crypto.randomBytes(32).toString('base64url');
  const derived = await scrypt(password, salt, KEYLEN, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { algorithm: 'scrypt-N32768-r8-p1', salt, hash: derived.toString('hex') };
}
export async function verifyPassword(password, record) {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 1024 || record?.algorithm !== 'scrypt-N32768-r8-p1' || !/^[a-f0-9]{128}$/.test(record.hash || '')) return false;
  const derived = await scrypt(password, record.salt, KEYLEN, { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(Buffer.from(record.hash, 'hex'), derived);
}
