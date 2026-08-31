const { isAuthorized } = require('../lib/auth');
const { getQuestions, gradeQuestion, answerLabel } = require('../lib/questions');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const bank = new Map(getQuestions().map(q => [q.id, q]));
  const answers = Array.isArray((req.body || {}).answers) ? req.body.answers : [];
  const results=[];
  let earned=0, max=0, fullCorrect=0;
  for (const a of answers) {
    const q = bank.get(Number(a.id));
    if (!q) continue;
    const g = gradeQuestion(q, a.value, Boolean(a.skipped));
    earned += g.earned; max += g.max;
    if (g.status === 'correct') fullCorrect++;
    results.push({
      id:q.id, code:`N-${String(q.id).padStart(3,'0')}`, chapter:q.chapter, chapterTitle:q.chapterTitle,
      section:q.section, sectionTitle:q.sectionTitle, type:q.type, prompt:q.prompt, images:q.images || [],
      status:g.status, earned:g.earned, max:g.max, userAnswer:g.normalized,
      correctAnswer:answerLabel(q), explanation:q.explanation || ''
    });
  }
  const percent = max ? Math.round((earned / max) * 100) : 0;
  return res.status(200).json({ percent, earned, max, fullCorrect, totalQuestions:results.length, results });
};
