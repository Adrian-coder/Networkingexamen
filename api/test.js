const { isAuthorized } = require('../lib/auth');
const { getQuestions, shuffled, publicQuestion } = require('../lib/questions');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};
  const chapter = body.chapter === 'all' ? 'all' : Number(body.chapter);
  const section = body.section && body.section !== 'all' ? String(body.section) : 'all';
  const order = body.order === 'source' ? 'source' : 'mixed';
  let pool = getQuestions().filter(q => chapter === 'all' || q.chapter === chapter);
  if (section !== 'all') pool = pool.filter(q => q.section === section);
  if (!pool.length) return res.status(400).json({ error: 'Nu există întrebări pentru filtrul ales.' });
  let count = body.count === 'all' ? pool.length : Number(body.count || 40);
  count = Math.max(1, Math.min(pool.length, Number.isFinite(count) ? count : 40));
  let picked = order === 'source' ? [...pool] : shuffled(pool);
  picked = picked.slice(0, count);
  return res.status(200).json({ total: picked.length, questions: picked.map(publicQuestion) });
};
