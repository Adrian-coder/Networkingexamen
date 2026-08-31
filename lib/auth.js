const crypto = require('crypto');

const COOKIE_NAME = 'networking_practice_session';
const SESSION_SECONDS = 6 * 60 * 60;

// The session-signing key depends on BOTH SESSION_SECRET and TEST_PASSWORD.
// Therefore, changing either value invalidates every previously issued session
// after the new Vercel deployment becomes active.
function signingKey() {
  const sessionSecret = process.env.SESSION_SECRET || '';
  const testPassword = process.env.TEST_PASSWORD || '';
  if (!sessionSecret || !testPassword) return null;
  return crypto
    .createHash('sha256')
    .update(sessionSecret)
    .update('\0')
    .update(testPassword)
    .digest();
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payload) {
  const key = signingKey();
  if (!key) return null;
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

function createSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ iat: now, exp: now + SESSION_SECONDS }));
  const sig = sign(payload);
  if (!sig) return null;
  return `${payload}.${sig}`;
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function verifySessionToken(token) {
  if (!token || !signingKey()) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = sign(payload);
  if (!expected || !safeEqual(sig, expected)) return false;
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(obj.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('=');
    return i < 0 ? [x, ''] : [x.slice(0, i), decodeURIComponent(x.slice(i + 1))];
  }));
}

function isAuthorized(req) {
  return verifySessionToken(parseCookies(req)[COOKIE_NAME]);
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}

module.exports = { createSessionToken, isAuthorized, setSessionCookie, clearSessionCookie, safeEqual };
