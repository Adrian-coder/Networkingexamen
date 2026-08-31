const { isAuthorized } = require('../lib/auth');
const { getQuestions } = require('../lib/questions');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  const qs = getQuestions();
  const chapters = [];
  for (const q of qs) {
    let c = chapters.find(x => x.id === q.chapter);
    if (!c) { c = { id:q.chapter, title:q.chapterTitle, count:0, sections:{} }; chapters.push(c); }
    c.count++;
    c.sections[q.section] = c.sections[q.section] || { id:q.section, title:q.sectionTitle, count:0 };
    c.sections[q.section].count++;
  }
  chapters.forEach(c => c.sections = Object.values(c.sections));
  return res.status(200).json({ total: qs.length, chapters });
};
