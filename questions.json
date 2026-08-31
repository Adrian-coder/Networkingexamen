const fs = require('fs');
const path = require('path');

let cache = null;
function getQuestions() {
  if (!cache) {
    const p = path.join(process.cwd(), 'data', 'questions.json');
    cache = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return cache;
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function unique(arr) {
  return [...new Set(arr)];
}

function publicQuestion(q) {
  const base = {
    id: q.id,
    code: `N-${String(q.id).padStart(3, '0')}`,
    chapter: q.chapter,
    chapterTitle: q.chapterTitle,
    section: q.section,
    sectionTitle: q.sectionTitle,
    type: q.type,
    prompt: q.prompt,
    images: (q.images || []).map(id => ({ id, url: `/api/image?id=${encodeURIComponent(id)}` }))
  };
  if (q.type === 'single' || q.type === 'multiple') base.options = q.options;
  if (q.type === 'matrix') {
    base.statements = q.statements;
    base.labels = q.labels;
  }
  if (q.type === 'matching') {
    base.items = q.pairs.map(x => x.left);
    base.choices = shuffled(unique(q.pairs.map(x => x.right)));
  }
  if (q.type === 'dropdown') {
    base.items = q.items.map(x => x.stem);
    base.choices = q.choices;
  }
  return base;
}

function normalizeAnswer(q, value) {
  if (q.type === 'single') return String(value || '').toUpperCase();
  if (q.type === 'multiple') return Array.isArray(value) ? value.map(String).map(x => x.toUpperCase()).sort() : [];
  if (q.type === 'matrix') return Array.isArray(value) ? value.map(v => v === true || v === 'true' || v === 1 || v === '1') : [];
  if (q.type === 'matching' || q.type === 'dropdown') return Array.isArray(value) ? value.map(v => String(v ?? '')) : [];
  return value;
}

function gradeQuestion(q, value, skipped) {
  if (skipped) {
    const max = ['matrix','matching','dropdown'].includes(q.type)
      ? (q.type === 'matrix' ? q.correct.length : q.type === 'matching' ? q.pairs.length : q.correct.length)
      : 1;
    return { earned: 0, max, status: 'skipped', normalized: normalizeAnswer(q, value) };
  }
  const ans = normalizeAnswer(q, value);
  if (q.type === 'single') {
    const ok = ans === q.correct[0];
    return { earned: ok ? 1 : 0, max: 1, status: ok ? 'correct' : 'wrong', normalized: ans };
  }
  if (q.type === 'multiple') {
    const target = [...q.correct].sort();
    const ok = JSON.stringify(ans) === JSON.stringify(target);
    return { earned: ok ? 1 : 0, max: 1, status: ok ? 'correct' : 'wrong', normalized: ans };
  }
  if (q.type === 'matrix') {
    const max = q.correct.length;
    let earned = 0;
    for (let i=0;i<max;i++) if (ans[i] === q.correct[i]) earned++;
    return { earned, max, status: earned === max ? 'correct' : earned ? 'partial' : 'wrong', normalized: ans };
  }
  if (q.type === 'matching') {
    const target = q.pairs.map(x => x.right);
    const max = target.length;
    let earned = 0;
    for (let i=0;i<max;i++) if (ans[i] === target[i]) earned++;
    return { earned, max, status: earned === max ? 'correct' : earned ? 'partial' : 'wrong', normalized: ans };
  }
  if (q.type === 'dropdown') {
    const target = q.correct;
    const max = target.length;
    let earned = 0;
    for (let i=0;i<max;i++) if (ans[i] === target[i]) earned++;
    return { earned, max, status: earned === max ? 'correct' : earned ? 'partial' : 'wrong', normalized: ans };
  }
  return { earned: 0, max: 1, status: 'wrong', normalized: ans };
}

function answerLabel(q) {
  if (q.type === 'single') return q.correct[0];
  if (q.type === 'multiple') return q.correct.join(', ');
  if (q.type === 'matrix') return q.correct.map((x,i) => `${i+1}. ${x ? q.labels[0] : q.labels[1]}`).join(' | ');
  if (q.type === 'matching') return q.pairs.map((x,i) => `${i+1}. ${x.left} → ${x.right}`).join(' | ');
  if (q.type === 'dropdown') return q.items.map((x,i) => `${i+1}. ${x.stem} → ${q.correct[i]}`).join(' | ');
  return '';
}

module.exports = { getQuestions, shuffled, publicQuestion, gradeQuestion, answerLabel };
