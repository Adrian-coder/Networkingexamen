const app = document.getElementById('app');
const logoutBtn = document.getElementById('logoutBtn');
const toastEl = document.getElementById('toast');

const ATTEMPT_KEY = 'networkingPracticeAttemptV3';
const PREF_KEY = 'networkingPracticePrefsV3';

const state = {
  config: null,
  questions: [],
  answers: {},
  skipped: new Set(),
  index: 0,
  result: null,
  filter: 'all',
  testMeta: null,
  showTranslation: false,
  savedAttempt: null
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const typeName = q => q.type === 'matrix'
  ? (q.labels || ['Yes', 'No']).join(' / ')
  : ({single:'Un răspuns', multiple:'Răspunsuri multiple', matching:'Potrivire', dropdown:'Dropdown'}[q.type] || q.type);

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toastEl.classList.remove('show'), 2300);
}

async function api(url, opts = {}) {
  const r = await fetch(url, {
    headers: {'Content-Type':'application/json', ...(opts.headers || {})},
    credentials: 'same-origin',
    ...opts
  });
  let data = {};
  try { data = await r.json(); } catch {}
  if (r.status === 401 && url !== '/api/login') {
    renderLogin();
    throw new Error('Sesiunea a expirat.');
  }
  if (!r.ok) throw new Error(data.error || 'Eroare de server');
  return data;
}

function readPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    state.showTranslation = Boolean(p.showTranslation);
  } catch {}
}

function savePrefs() {
  localStorage.setItem(PREF_KEY, JSON.stringify({showTranslation: state.showTranslation}));
}

function readSavedAttempt() {
  try {
    const a = JSON.parse(localStorage.getItem(ATTEMPT_KEY) || 'null');
    if (!a || !Array.isArray(a.ids) || !a.ids.length) return null;
    return a;
  } catch {
    return null;
  }
}

function saveAttempt() {
  if (!state.questions.length || state.result) return;
  const payload = {
    version: 3,
    ids: state.questions.map(q => q.id),
    answers: state.answers,
    skipped: [...state.skipped],
    index: state.index,
    testMeta: state.testMeta,
    savedAt: Date.now()
  };
  localStorage.setItem(ATTEMPT_KEY, JSON.stringify(payload));
  state.savedAttempt = payload;
}

function clearAttempt() {
  localStorage.removeItem(ATTEMPT_KEY);
  state.savedAttempt = null;
}

function renderLogin() {
  state.config = null;
  state.questions = [];
  state.answers = {};
  state.skipped = new Set();
  state.result = null;
  logoutBtn.classList.add('hidden');
  app.innerHTML = `
    <section class="card pad center">
      <div class="login-logo">N</div>
      <h1 class="h1">Networking<br></h1>
      <p class="muted">Acces protejat. Introdu parola pentru a deschide banca de întrebări.</p>
      <form id="loginForm">
        <div class="field"><label>Parolă</label><input id="password" class="input" type="password" autocomplete="current-password" placeholder="••••••••" required></div>
        <button class="btn full">Intră la teste</button>
      </form>
      <p id="loginError" class="muted error-text"></p>
    </section>`;
  document.getElementById('loginForm').onsubmit = async e => {
    e.preventDefault();
    const err = document.getElementById('loginError');
    err.textContent = '';
    try {
      await api('/api/login', {method:'POST', body:JSON.stringify({password:document.getElementById('password').value})});
      await loadConfig();
    } catch (x) {
      err.textContent = x.message;
    }
  };
}

async function loadConfig() {
  try {
    state.config = await api('/api/config');
    state.savedAttempt = readSavedAttempt();
    logoutBtn.classList.remove('hidden');
    renderSetup();
  } catch {
    renderLogin();
  }
}

function formatSavedTime(ts) {
  try {
    return new Intl.DateTimeFormat('ro-RO', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}).format(new Date(ts));
  } catch { return ''; }
}

function renderSetup() {
  const c = state.config;
  state.savedAttempt = readSavedAttempt();
  const chapterOpts = [
    `<option value="all">Toate capitolele (1–5)</option>`,
    ...c.chapters.map(x => `<option value="${x.id}">${x.id}. ${esc(x.title)} — ${x.count}</option>`)
  ].join('');

  const resume = state.savedAttempt ? `
    <section class="resume-card card">
      <div>
        <span class="resume-kicker">Test salvat automat</span>
        <b>Ai un test neterminat cu ${state.savedAttempt.ids.length} întrebări.</b>
        <small>Ultima salvare: ${esc(formatSavedTime(state.savedAttempt.savedAt))}</small>
      </div>
      <div class="resume-actions">
        <button id="discardSaved" class="ghost">Șterge</button>
        <button id="resumeSaved" class="btn">Continuă testul →</button>
      </div>
    </section>` : '';

  app.innerHTML = `
    <div class="hero">
      <div><h1>Testare Networking</h1><p class="muted">Alege capitolul, numărul de întrebări și ordinea. Modul examen folosește 40 de întrebări amestecate.</p></div>
      <div class="stat-pill">${c.total} întrebări în banca actuală</div>
    </div>
    ${resume}
    <div class="setup-grid">
      <section class="card pad">
        <h2 class="h2">Configurează testul</h2>
        <p class="muted">Pentru studiu poți parcurge întrebările în ordinea capitolelor. Răspunsurile și explicațiile apar doar după finalizare.</p>
        <div class="controls">
          <div class="field"><label>Capitol</label><select id="chapter" class="select">${chapterOpts}</select></div>
          <div class="field"><label>Număr întrebări</label><select id="count" class="select"></select></div>
          <div class="field"><label>Ordine</label><select id="order" class="select"><option value="source">În ordinea capitolelor</option><option value="mixed">Amestecat</option></select></div>
        </div>
        <label class="translation-pref">
          <input id="translationPref" type="checkbox" ${state.showTranslation ? 'checked' : ''}>
          <span><b>Arată traducerea în română</b><small>Originalul în engleză rămâne principal. Traducerea apare doar la itemii unde este disponibilă.</small></span>
        </label>
        <div class="setup-actions">
          <button id="exam40" class="quick"><strong>40</strong>Mod examen</button>
          <button id="start" class="btn">Începe testul →</button>
        </div>
      </section>
      <aside class="card pad">
        <h2 class="h2">Capitole</h2>
        <div class="chapters">${c.chapters.map(x => `
          <div class="chapter-row">
            <div><b>${x.id}. ${esc(x.title)}</b><span>${x.sections.length} secțiuni</span></div>
            <b>${x.count}</b>
          </div>`).join('')}</div>
      </aside>
    </div>`;

  const chapter = document.getElementById('chapter');
  const count = document.getElementById('count');
  function updateCounts() {
    const sel = chapter.value === 'all' ? c.total : c.chapters.find(x => String(x.id) === chapter.value).count;
    const vals = [10,20,30,40,50,75,100].filter(n => n <= sel);
    if (!vals.includes(Math.min(40, sel))) vals.push(Math.min(40, sel));
    vals.sort((a,b) => a-b);
    count.innerHTML = [...new Set(vals)].map(n => `<option ${n === Math.min(40, sel) ? 'selected' : ''}>${n}</option>`).join('') + `<option value="all">Toate (${sel})</option>`;
  }
  chapter.onchange = updateCounts;
  updateCounts();

  document.getElementById('translationPref').onchange = e => {
    state.showTranslation = e.target.checked;
    savePrefs();
  };
  document.getElementById('exam40').onclick = () => {
    chapter.value = 'all';
    updateCounts();
    count.value = '40';
    document.getElementById('order').value = 'mixed';
    toast('Mod examen: 40 întrebări amestecate');
  };
  document.getElementById('start').onclick = startTest;

  if (state.savedAttempt) {
    document.getElementById('resumeSaved').onclick = resumeSavedAttempt;
    document.getElementById('discardSaved').onclick = () => { clearAttempt(); renderSetup(); };
  }
}

async function startTest() {
  try {
    const body = {
      chapter: document.getElementById('chapter').value,
      count: document.getElementById('count').value,
      order: document.getElementById('order').value
    };
    const data = await api('/api/test', {method:'POST', body:JSON.stringify(body)});
    state.questions = data.questions;
    state.answers = {};
    state.skipped = new Set();
    state.index = 0;
    state.result = null;
    state.testMeta = body;
    saveAttempt();
    renderTest();
  } catch (e) { toast(e.message); }
}

async function resumeSavedAttempt() {
  const a = readSavedAttempt();
  if (!a) return renderSetup();
  try {
    const data = await api('/api/test', {method:'POST', body:JSON.stringify({ids:a.ids})});
    state.questions = data.questions;
    state.answers = a.answers || {};
    state.skipped = new Set(a.skipped || []);
    state.index = Math.min(Math.max(Number(a.index) || 0, 0), Math.max(0, state.questions.length - 1));
    state.result = null;
    state.testMeta = a.testMeta || {mode:'resume'};
    renderTest();
    toast('Testul a fost restaurat.');
  } catch (e) {
    toast(e.message);
  }
}

function answerComplete(q, v) {
  if (v == null) return false;
  if (q.type === 'single') return !!v;
  if (q.type === 'multiple') return Array.isArray(v) && v.length > 0;
  if (['matrix','matching','dropdown'].includes(q.type)) {
    return Array.isArray(v) && v.length === ((q.statements || q.items || []).length) && v.every(x => x !== null && x !== undefined && x !== '');
  }
  return false;
}

function completedCount() {
  return state.questions.reduce((n, q) => n + (state.skipped.has(q.id) || answerComplete(q, state.answers[q.id]) ? 1 : 0), 0);
}

function navStatus(q, i) {
  if (i === state.index) return 'current';
  if (state.skipped.has(q.id)) return 'skipped';
  if (answerComplete(q, state.answers[q.id])) return 'answered';
  return '';
}

function stableScrollToQuestion() {
  requestAnimationFrame(() => {
    const el = document.querySelector('.progress-card');
    if (!el) return;
    const target = el.getBoundingClientRect().top + window.scrollY - 92;
    if (Math.abs(window.scrollY - target) > 30) window.scrollTo({top: target, behavior:'auto'});
  });
}

function goToQuestion(i) {
  state.index = i;
  saveAttempt();
  renderTest();
  stableScrollToQuestion();
}

function translationHtml(q) {
  if (!q.translation) return '';
  return `
    <div class="translation-tools">
      <button id="toggleTranslation" class="translation-toggle" type="button">${state.showTranslation ? 'Ascunde RO' : 'Arată RO'}</button>
    </div>
    <div id="translationBlock" class="translation-block ${state.showTranslation ? '' : 'hidden'}"><b>RO:</b> ${esc(q.translation)}</div>`;
}

function renderTest() {
  const q = state.questions[state.index];
  const done = completedCount();
  const pct = state.questions.length ? Math.round((done / state.questions.length) * 100) : 0;

  app.innerHTML = `
    <div class="progress-card card" id="progressCard">
      <div class="progress-line"><i id="progressBar" style="width:${pct}%"></i></div>
      <div class="progress-meta"><span>Întrebarea ${state.index + 1} din ${state.questions.length}</span><span id="progressText">${done}/${state.questions.length} completate • ${pct}%</span></div>
    </div>
    <div class="test-shell">
      <aside class="card nav-card">
        <div class="nav-head"><h3>Navigare</h3><span>${state.questions.length}</span></div>
        <div class="nav-grid">${state.questions.map((x,i) => `<button class="nav-q ${navStatus(x,i)}" data-i="${i}" aria-label="Întrebarea ${i+1}">${i+1}</button>`).join('')}</div>
        <div class="legend">
          <span><i class="dot current"></i>Curentă</span>
          <span><i class="dot answered"></i>Răspunsă</span>
          <span><i class="dot skipped"></i>Sărită</span>
        </div>
      </aside>
      <section class="question-column">
        <article class="card question-card">
          <div class="question-top"><div class="qid">Întrebarea ${state.index + 1}</div><div class="badge">${typeName(q)}</div></div>
          <div class="qmeta"><b>Cap. ${q.chapter}</b><span>•</span><span>${esc(q.section)}</span><span class="qmeta-title">${esc(q.sectionTitle)}</span></div>
          <div class="qtitle">${esc(q.prompt)}</div>
          ${translationHtml(q)}
          ${(q.images || []).map(x => `<img class="qimage" src="${x.url}" alt="Imagine necesară pentru rezolvarea întrebării">`).join('')}
          <div id="answerArea"></div>
        </article>
        <div class="question-actions card">
          <button id="back" class="ghost" ${state.index === 0 ? 'disabled' : ''}>← Înapoi</button>
          <div class="right">
            <button id="skip" class="ghost">Sari peste</button>
            <button id="next" class="btn secondary">${state.index === state.questions.length - 1 ? 'Revizuiește' : 'Următoarea →'}</button>
            <button id="finish" class="btn danger">Termină testul</button>
          </div>
        </div>
      </section>
    </div>`;

  document.querySelectorAll('.nav-q').forEach(b => b.onclick = () => goToQuestion(Number(b.dataset.i)));
  renderAnswerArea(q);
  document.getElementById('back').onclick = () => { if (state.index > 0) goToQuestion(state.index - 1); };
  document.getElementById('skip').onclick = () => {
    state.skipped.add(q.id);
    delete state.answers[q.id];
    saveAttempt();
    if (state.index < state.questions.length - 1) goToQuestion(state.index + 1);
    else refreshProgressAndNav();
  };
  document.getElementById('next').onclick = () => {
    if (state.index < state.questions.length - 1) goToQuestion(state.index + 1);
    else toast('Poți verifica întrebările din navigare sau finaliza testul.');
  };
  document.getElementById('finish').onclick = finishTest;

  const t = document.getElementById('toggleTranslation');
  if (t) t.onclick = () => {
    state.showTranslation = !state.showTranslation;
    savePrefs();
    const block = document.getElementById('translationBlock');
    block.classList.toggle('hidden', !state.showTranslation);
    t.textContent = state.showTranslation ? 'Ascunde RO' : 'Arată RO';
  };
}

function refreshProgressAndNav() {
  const done = completedCount();
  const pct = state.questions.length ? Math.round((done / state.questions.length) * 100) : 0;
  const bar = document.getElementById('progressBar');
  const txt = document.getElementById('progressText');
  if (bar) bar.style.width = `${pct}%`;
  if (txt) txt.textContent = `${done}/${state.questions.length} completate • ${pct}%`;
  document.querySelectorAll('.nav-q').forEach((b, i) => {
    b.classList.remove('current','answered','skipped');
    const s = navStatus(state.questions[i], i);
    if (s) b.classList.add(s);
  });
}

function onAnswerChanged(q) {
  state.skipped.delete(q.id);
  saveAttempt();
  refreshProgressAndNav();
}

function renderAnswerArea(q) {
  const area = document.getElementById('answerArea');
  const v = state.answers[q.id];

  if (q.type === 'single' || q.type === 'multiple') {
    area.innerHTML = `<div class="options">${q.options.map(o => `
      <label class="option ${(q.type === 'single' ? v === o.key : (v || []).includes(o.key)) ? 'selected' : ''}">
        <input type="${q.type === 'single' ? 'radio' : 'checkbox'}" name="opt" value="${o.key}" ${(q.type === 'single' ? v === o.key : (v || []).includes(o.key)) ? 'checked' : ''}>
        <span class="letter">${o.key}</span><span>${esc(o.text)}</span>
      </label>`).join('')}</div>`;
    area.querySelectorAll('input').forEach(inp => inp.onchange = () => {
      if (q.type === 'single') state.answers[q.id] = inp.value;
      else {
        let a = Array.isArray(state.answers[q.id]) ? [...state.answers[q.id]] : [];
        a = inp.checked ? [...new Set([...a, inp.value])] : a.filter(x => x !== inp.value);
        state.answers[q.id] = a;
      }
      area.querySelectorAll('.option').forEach(label => label.classList.toggle('selected', label.querySelector('input').checked));
      onAnswerChanged(q);
    });
    return;
  }

  if (q.type === 'matrix') {
    const arr = Array.isArray(v) ? v : Array(q.statements.length).fill(null);
    const yes = q.labels?.[0] || 'Yes';
    const no = q.labels?.[1] || 'No';
    area.innerHTML = `
      <div class="matrix-wrap">
        <table class="matrix">
          <thead><tr><th>Afirmație</th><th>${esc(yes)}</th><th>${esc(no)}</th></tr></thead>
          <tbody>${q.statements.map((s,i) => `
            <tr>
              <td><span class="statement-no">${i+1}</span><span>${esc(s)}</span></td>
              <td><label class="matrix-choice ${arr[i] === true ? 'selected' : ''}"><input type="radio" name="m${i}" data-i="${i}" value="true" ${arr[i] === true ? 'checked' : ''}><span>${esc(yes)}</span></label></td>
              <td><label class="matrix-choice ${arr[i] === false ? 'selected' : ''}"><input type="radio" name="m${i}" data-i="${i}" value="false" ${arr[i] === false ? 'checked' : ''}><span>${esc(no)}</span></label></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>`;
    area.querySelectorAll('input').forEach(inp => inp.onchange = () => {
      const a = Array.isArray(state.answers[q.id]) ? [...state.answers[q.id]] : Array(q.statements.length).fill(null);
      a[Number(inp.dataset.i)] = inp.value === 'true';
      state.answers[q.id] = a;
      const row = inp.closest('tr');
      row.querySelectorAll('.matrix-choice').forEach(l => l.classList.toggle('selected', l.querySelector('input').checked));
      onAnswerChanged(q);
    });
    return;
  }

  if (q.type === 'matching' || q.type === 'dropdown') {
    const items = q.items;
    const arr = Array.isArray(v) ? v : Array(items.length).fill('');
    area.innerHTML = `<div class="matching-list">${items.map((s,i) => `
      <div class="match-row">
        <div class="match-stem"><span class="statement-no">${i+1}</span>${esc(s)}</div>
        <div class="match-arrow">→</div>
        <select class="select match-select" data-i="${i}"><option value="">Alege...</option>${q.choices.map(c => `<option value="${esc(c)}" ${arr[i] === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      </div>`).join('')}</div>`;
    area.querySelectorAll('.match-select').forEach(sel => sel.onchange = () => {
      const a = Array.isArray(state.answers[q.id]) ? [...state.answers[q.id]] : Array(items.length).fill('');
      a[Number(sel.dataset.i)] = sel.value;
      state.answers[q.id] = a;
      onAnswerChanged(q);
    });
  }
}

async function finishTest() {
  const unanswered = state.questions.filter(q => !state.skipped.has(q.id) && !answerComplete(q, state.answers[q.id])).length;
  if (unanswered && !confirm(`Mai ai ${unanswered} întrebări fără răspuns. Vrei să termini testul?`)) return;
  const payload = state.questions.map(q => ({
    id: q.id,
    value: state.answers[q.id],
    skipped: state.skipped.has(q.id) || !answerComplete(q, state.answers[q.id])
  }));
  try {
    state.result = await api('/api/submit', {method:'POST', body:JSON.stringify({answers:payload})});
    state.filter = 'all';
    clearAttempt();
    renderResults();
  } catch (e) { toast(e.message); }
}

function userAnswerText(r) {
  if (r.type === 'matrix') {
    return (r.userAnswer || []).map((x,i) => `${i+1}. ${x ? 'Yes/True' : 'No/False'}`).join(' | ');
  }
  if (Array.isArray(r.userAnswer)) return r.userAnswer.length ? r.userAnswer.join(' | ') : '—';
  return r.userAnswer || '—';
}

function resultCounts() {
  const rows = state.result.results;
  return {
    all: rows.length,
    wrong: rows.filter(x => ['wrong','partial'].includes(x.status)).length,
    correct: rows.filter(x => x.status === 'correct').length,
    skipped: rows.filter(x => x.status === 'skipped').length
  };
}

function chapterStats() {
  const m = new Map();
  for (const r of state.result.results) {
    if (!m.has(r.chapter)) m.set(r.chapter, {chapter:r.chapter, title:r.chapterTitle, earned:0, max:0, questions:0, correct:0});
    const x = m.get(r.chapter);
    x.earned += r.earned;
    x.max += r.max;
    x.questions++;
    if (r.status === 'correct') x.correct++;
  }
  return [...m.values()].sort((a,b) => a.chapter - b.chapter).map(x => ({...x, percent:x.max ? Math.round(x.earned / x.max * 100) : 0}));
}

function renderResults() {
  const R = state.result;
  const counts = resultCounts();
  const wrongIds = R.results.filter(x => ['wrong','partial'].includes(x.status)).map(x => x.id);
  const stats = chapterStats();
  logoutBtn.classList.remove('hidden');

  app.innerHTML = `
    <section class="card pad results-card">
      <div class="results-head">
        <div class="score-ring" style="--pct:${R.percent}"><div><strong>${R.fullCorrect}/${R.totalQuestions}</strong><span>${R.percent}%</span></div></div>
        <div>
          <h1 class="h1 results-title">Rezultatul testului</h1>
          <p class="muted">${R.fullCorrect} întrebări complet corecte din ${R.totalQuestions}. La itemii Yes/No, matching și dropdown se acordă și punctaj parțial.</p>
          <div class="result-stats">
            <div class="rstat"><b>${R.earned}/${R.max}</b><span>puncte</span></div>
            <div class="rstat"><b>${counts.wrong}</b><span>greșite / parțiale</span></div>
            <div class="rstat"><b>${counts.skipped}</b><span>sărite</span></div>
          </div>
        </div>
      </div>
      <div class="results-actions">
        <button id="newTest" class="btn secondary">Test nou</button>
        <button id="retryWrong" class="btn" ${wrongIds.length ? '' : 'disabled'}>Repetă doar greșelile (${wrongIds.length})</button>
      </div>
    </section>

    <section class="card pad chapter-performance">
      <div class="section-title-row"><div><h2 class="h2">Rezultat pe capitole</h2><p class="muted">Vezi rapid unde merită să mai repeți.</p></div></div>
      <div class="chapter-bars">${stats.map(x => `
        <div class="chapter-stat-row">
          <div class="chapter-stat-label"><b>${x.chapter}. ${esc(x.title)}</b><span>${x.correct}/${x.questions} complet corecte</span></div>
          <div class="chapter-stat-meter"><i style="width:${x.percent}%"></i></div>
          <strong>${x.percent}%</strong>
        </div>`).join('')}</div>
    </section>

    <div class="filters">
      <button class="filter active" data-f="all">Toate <b>${counts.all}</b></button>
      <button class="filter" data-f="wrong">Greșite <b>${counts.wrong}</b></button>
      <button class="filter" data-f="correct">Corecte <b>${counts.correct}</b></button>
      <button class="filter" data-f="skipped">Sărite <b>${counts.skipped}</b></button>
    </div>
    <div id="resultList" class="result-list"></div>`;

  document.getElementById('newTest').onclick = renderSetup;
  document.getElementById('retryWrong').onclick = () => retryQuestions(wrongIds);
  document.querySelectorAll('.filter').forEach(b => b.onclick = () => setFilter(b.dataset.f));
  renderResultList();
}

async function retryQuestions(ids) {
  if (!ids.length) return;
  try {
    const data = await api('/api/test', {method:'POST', body:JSON.stringify({ids})});
    state.questions = data.questions;
    state.answers = {};
    state.skipped = new Set();
    state.index = 0;
    state.result = null;
    state.filter = 'all';
    state.testMeta = {mode:'retry-wrong', count:ids.length};
    saveAttempt();
    renderTest();
    toast(`Mini-test creat: ${ids.length} întrebări.`);
  } catch (e) { toast(e.message); }
}

function setFilter(f) {
  state.filter = f;
  document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  renderResultList();
  const list = document.getElementById('resultList');
  if (list) list.scrollIntoView({behavior:'smooth', block:'start'});
}

function renderResultList() {
  const list = document.getElementById('resultList');
  let rows = state.result.results;
  if (state.filter === 'wrong') rows = rows.filter(x => ['wrong','partial'].includes(x.status));
  else if (state.filter !== 'all') rows = rows.filter(x => x.status === state.filter);

  list.innerHTML = rows.map(r => {
    const qNo = state.questions.findIndex(q => q.id === r.id) + 1;
    const icon = r.status === 'correct' ? '✓' : r.status === 'partial' ? '½' : r.status === 'skipped' ? '—' : '×';
    const statusText = r.status === 'correct' ? 'Corect' : r.status === 'partial' ? 'Parțial' : r.status === 'skipped' ? 'Sărită' : 'Greșit';
    return `
      <div class="result-item">
        <div class="result-summary" data-id="${r.id}">
          <div class="status-icon ${r.status}">${icon}</div>
          <div><b>Întrebarea ${qNo} • ${esc(r.prompt.split('\n')[0].slice(0,110))}${r.prompt.length > 110 ? '…' : ''}</b><span>Cap. ${r.chapter} • ${statusText} • ${r.earned}/${r.max} puncte</span></div>
          <span class="details-label">Detalii ▾</span>
        </div>
        <div class="result-detail hidden" id="d${r.id}">
          <div class="answer-box user"><b>Răspunsul tău</b><span>${esc(userAnswerText(r))}</span></div>
          <div class="answer-box correct"><b>Răspuns corect</b><span>${esc(r.correctAnswer)}</span></div>
          <h4>De ce?</h4>
          <div class="explanation">${esc(r.explanation)}</div>
        </div>
      </div>`;
  }).join('') || `<div class="card pad muted">Nu există întrebări în acest filtru.</div>`;

  list.querySelectorAll('.result-summary').forEach(x => x.onclick = () => {
    const detail = document.getElementById('d' + x.dataset.id);
    detail.classList.toggle('hidden');
    const label = x.querySelector('.details-label');
    if (label) label.textContent = detail.classList.contains('hidden') ? 'Detalii ▾' : 'Închide ▴';
  });
}

logoutBtn.onclick = async () => {
  try { await api('/api/logout', {method:'POST', body:'{}'}); } catch {}
  renderLogin();
};

readPrefs();
loadConfig();
