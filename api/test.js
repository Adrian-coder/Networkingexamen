const { isAuthorized } = require('../lib/auth');
const { getQuestions, shuffled, publicQuestion } = require('../lib/questions');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const bank = getQuestions();

  // Resume / retry mode: return only explicitly requested question IDs,
  // preserving their original order. Correct answers are still stripped.
  if (Array.isArray(body.ids) && body.ids.length) {
    const byId = new Map(bank.map(q => [Number(q.id), q]));
    const ids = [...new Set(body.ids.map(Number).filter(Number.isFinite))].slice(0, 500);
    const picked = ids.map(id => byId.get(id)).filter(Boolean);
    if (!picked.length) return res.status(400).json({ error: 'Întrebările salvate nu mai sunt disponibile.' });
    return res.status(200).json({ total: picked.length, questions: picked.map(publicQuestion) });
  }

  const chapter = body.chapter === 'all' ? 'all' : Number(body.chapter);
  const section = body.section && body.section !== 'all' ? String(body.section) : 'all';
  const order = body.order === 'source' ? 'source' : 'mixed';

  let pool = bank.filter(q => chapter === 'all' || q.chapter === chapter);
  if (section !== 'all') pool = pool.filter(q => q.section === section);
  if (!pool.length) return res.status(400).json({ error: 'Nu există întrebări pentru filtrul ales.' });

  let count = body.count === 'all' ? pool.length : Number(body.count || 40);
  count = Math.max(1, Math.min(pool.length, Number.isFinite(count) ? count : 40));

  let picked = order === 'source'
    ? [...pool].sort((a,b) => (a.sourceOrder ?? a.id) - (b.sourceOrder ?? b.id))
    : shuffled(pool);
  picked = picked.slice(0, count);

  return res.status(200).json({ total: picked.length, questions: picked.map(publicQuestion) });
};
