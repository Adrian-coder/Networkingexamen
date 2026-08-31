const { createSessionToken, setSessionCookie, safeEqual } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const expected = process.env.TEST_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!expected || !secret) return res.status(500).json({ error: 'Serverul nu este configurat. Setează TEST_PASSWORD și SESSION_SECRET în Vercel.' });
  const password = String((req.body || {}).password || '');
  if (!safeEqual(password, expected)) return res.status(401).json({ error: 'Parolă incorectă.' });
  const token = createSessionToken();
  if (!token) return res.status(500).json({ error: 'Nu s-a putut crea sesiunea.' });
  setSessionCookie(res, token);
  return res.status(200).json({ ok: true });
};
