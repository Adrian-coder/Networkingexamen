const { clearSessionCookie } = require('../lib/auth');
module.exports = async (req, res) => {
  clearSessionCookie(res);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true });
};
