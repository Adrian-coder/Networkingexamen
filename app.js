const app = document.getElementById('app');
const logoutBtn = document.getElementById('logoutBtn');
const toastEl = document.getElementById('toast');
const state = { config:null, questions:[], answers:{}, skipped:new Set(), index:0, result:null, filter:'all' };

const esc = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const typeName = q => q.type==='matrix' ? (q.labels||['Yes','No']).join(' / ') : ({single:'Un răspuns',multiple:'Răspunsuri multiple',matching:'Potrivire',dropdown:'Dropdown'}[q.type] || q.type);
function toast(msg){toastEl.textContent=msg;toastEl.classList.add('show');setTimeout(()=>toastEl.classList.remove('show'),2200)}
async function api(url, opts={}){
  const r = await fetch(url,{headers:{'Content-Type':'application/json',...(opts.headers||{})},credentials:'same-origin',...opts});
  let data={}; try{data=await r.json()}catch{}
  if(r.status===401 && url!='/api/login'){renderLogin();throw new Error('Sesiunea a expirat.');}
  if(!r.ok) throw new Error(data.error||'Eroare de server');
  return data;
}

function renderLogin(){
  state.config=null;state.questions=[];state.answers={};state.skipped=new Set();logoutBtn.classList.add('hidden');
  app.innerHTML=`<section class="card pad center"><div class="login-logo">N</div><h1 class="h1">Networking<br>Certiport Practice</h1><p class="muted">Acces protejat. Introdu parola pentru a deschide banca de întrebări.</p><form id="loginForm"><div class="field"><label>Parolă</label><input id="password" class="input" type="password" autocomplete="current-password" placeholder="••••••••" required></div><button class="btn full">Intră la teste</button></form><p id="loginError" class="muted" style="color:#a84840"></p></section>`;
  document.getElementById('loginForm').onsubmit=async e=>{e.preventDefault();const err=document.getElementById('loginError');err.textContent='';try{await api('/api/login',{method:'POST',body:JSON.stringify({password:document.getElementById('password').value})});await loadConfig();}catch(x){err.textContent=x.message}};
}
async function loadConfig(){
  try{state.config=await api('/api/config');logoutBtn.classList.remove('hidden');renderSetup();}catch(e){renderLogin();}
}

function renderSetup(){
  const c=state.config;
  const chapterOpts=[`<option value="all">Toate capitolele (1–5)</option>`,...c.chapters.map(x=>`<option value="${x.id}">${x.id}. ${esc(x.title)} — ${x.count}</option>`)].join('');
  app.innerHTML=`<div class="hero"><div><h1>Testare Networking</h1><p class="muted">Alege capitolul, numărul de întrebări și ordinea. Modul examen folosește 40 de întrebări amestecate.</p></div><div class="stat-pill">${c.total} întrebări în banca actuală</div></div>
  <div class="setup-grid"><section class="card pad"><h2 class="h2">Configurează testul</h2><p class="muted">Pentru studiu poți parcurge întrebările în ordinea capitolelor. Răspunsurile și explicațiile apar doar după finalizare.</p>
  <div class="controls"><div class="field"><label>Capitol</label><select id="chapter" class="select">${chapterOpts}</select></div><div class="field"><label>Număr întrebări</label><select id="count" class="select"></select></div><div class="field"><label>Ordine</label><select id="order" class="select"><option value="source">În ordinea capitolelor</option><option value="mixed">Amestecat</option></select></div></div>
  <div class="setup-actions"><button id="exam40" class="quick"><strong>40</strong>Mod examen</button><button id="start" class="btn">Începe testul →</button></div></section>
  <aside class="card pad"><h2 class="h2">Capitole</h2><div class="chapters">${c.chapters.map(x=>`<div class="chapter-row"><div><b>${x.id}. ${esc(x.title)}</b><span>${x.sections.length} secțiuni</span></div><b>${x.count}</b></div>`).join('')}</div></aside></div>`;
  const chapter=document.getElementById('chapter'), count=document.getElementById('count');
  function updateCounts(){const sel=chapter.value==='all'?c.total:c.chapters.find(x=>String(x.id)===chapter.value).count;const vals=[10,20,30,40,50,75,100].filter(n=>n<=sel); if(!vals.includes(Math.min(40,sel)))vals.push(Math.min(40,sel)); vals.sort((a,b)=>a-b); count.innerHTML=[...new Set(vals)].map(n=>`<option ${n===Math.min(40,sel)?'selected':''}>${n}</option>`).join('')+`<option value="all">Toate (${sel})</option>`;}
  chapter.onchange=updateCounts;updateCounts();
  document.getElementById('exam40').onclick=()=>{chapter.value='all';updateCounts();count.value='40';document.getElementById('order').value='mixed';toast('Mod examen: 40 întrebări amestecate');};
  document.getElementById('start').onclick=startTest;
}

async function startTest(){
  try{
    const body={chapter:document.getElementById('chapter').value,count:document.getElementById('count').value,order:document.getElementById('order').value};
    const data=await api('/api/test',{method:'POST',body:JSON.stringify(body)});
    state.questions=data.questions;state.answers={};state.skipped=new Set();state.index=0;state.result=null;renderTest();
  }catch(e){toast(e.message)}
}
function answerComplete(q,v){
  if(v==null)return false;
  if(q.type==='single')return !!v;
  if(q.type==='multiple')return Array.isArray(v)&&v.length>0;
  if(['matrix','matching','dropdown'].includes(q.type))return Array.isArray(v)&&v.length===((q.statements||q.items||[]).length)&&v.every(x=>x!==null&&x!==undefined&&x!=='');
  return false;
}
function navStatus(q,i){if(i===state.index)return'current';if(state.skipped.has(q.id))return'skipped';if(answerComplete(q,state.answers[q.id]))return'answered';return''}
function goToQuestion(i){state.index=i;renderTest();requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));}
function renderTest(){
  const q=state.questions[state.index], pct=Math.round(((state.index+1)/state.questions.length)*100);
  app.innerHTML=`<div class="progress-card card"><div class="progress-line"><i style="width:${pct}%"></i></div><div class="progress-meta"><span>Întrebarea ${state.index+1} din ${state.questions.length}</span><span>${pct}% parcurs</span></div></div><div class="test-shell"><aside class="card nav-card"><h3>Navigare</h3><div class="nav-grid">${state.questions.map((x,i)=>`<button class="nav-q ${navStatus(x,i)}" data-i="${i}">${i+1}</button>`).join('')}</div><div class="legend"><span><i class="dot current"></i>Curentă</span><span><i class="dot answered"></i>Răspuns</span><span><i class="dot skipped"></i>Sărită</span></div></aside><section><article class="card question-card"><div class="question-top"><div class="qid">Întrebarea ${state.index+1}</div><div class="badge">${typeName(q)}</div></div><div class="qmeta">Capitolul ${q.chapter} · ${esc(q.section)} ${esc(q.sectionTitle)}</div><div class="qtitle">${esc(q.prompt)}</div>${(q.images||[]).map(x=>`<img class="qimage" src="${x.url}" alt="Imagine necesară pentru întrebare">`).join('')}<div id="answerArea"></div><div class="question-actions"><button id="back" class="ghost" ${state.index===0?'disabled':''}>← Înapoi</button><div class="right"><button id="skip" class="ghost">Sari peste</button><button id="next" class="btn secondary">${state.index===state.questions.length-1?'Revizuiește':'Următoarea →'}</button><button id="finish" class="btn danger">Termină testul</button></div></div></article></section></div>`;
  document.querySelectorAll('.nav-q').forEach(b=>b.onclick=()=>goToQuestion(Number(b.dataset.i)));
  renderAnswerArea(q);
  document.getElementById('back').onclick=()=>{if(state.index>0)goToQuestion(state.index-1)};
  document.getElementById('skip').onclick=()=>{state.skipped.add(q.id);delete state.answers[q.id];if(state.index<state.questions.length-1)goToQuestion(state.index+1);else renderTest()};
  document.getElementById('next').onclick=()=>{if(state.index<state.questions.length-1)goToQuestion(state.index+1);else toast('Poți verifica întrebările din navigare sau finaliza testul.')};
  document.getElementById('finish').onclick=finishTest;
}
function renderAnswerArea(q){
  const area=document.getElementById('answerArea'), v=state.answers[q.id];
  if(q.type==='single'||q.type==='multiple'){
    area.innerHTML=`<div class="options">${q.options.map(o=>`<label class="option ${(q.type==='single'?v===o.key:(v||[]).includes(o.key))?'selected':''}"><input type="${q.type==='single'?'radio':'checkbox'}" name="opt" value="${o.key}" ${(q.type==='single'?v===o.key:(v||[]).includes(o.key))?'checked':''}><span class="letter">${o.key}</span><span>${esc(o.text)}</span></label>`).join('')}</div>`;
    area.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{state.skipped.delete(q.id);if(q.type==='single')state.answers[q.id]=inp.value;else{let a=Array.isArray(state.answers[q.id])?[...state.answers[q.id]]:[];a=inp.checked?[...new Set([...a,inp.value])]:a.filter(x=>x!==inp.value);state.answers[q.id]=a;}area.querySelectorAll('.option').forEach(label=>{const input=label.querySelector('input');label.classList.toggle('selected',input.checked)});});
  } else if(q.type==='matrix'){
    const arr=Array.isArray(v)?v:Array(q.statements.length).fill(null);
    area.innerHTML=`<table class="matrix"><thead><tr><th>Afirmație</th><th>${esc(q.labels[0])}</th><th>${esc(q.labels[1])}</th></tr></thead><tbody>${q.statements.map((s,i)=>`<tr><td>${esc(s)}</td><td style="text-align:center"><input type="radio" name="m${i}" data-i="${i}" value="true" ${arr[i]===true?'checked':''}></td><td style="text-align:center"><input type="radio" name="m${i}" data-i="${i}" value="false" ${arr[i]===false?'checked':''}></td></tr>`).join('')}</tbody></table>`;
    area.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{const a=Array.isArray(state.answers[q.id])?[...state.answers[q.id]]:Array(q.statements.length).fill(null);a[Number(inp.dataset.i)]=inp.value==='true';state.answers[q.id]=a;state.skipped.delete(q.id);});
  } else if(q.type==='matching'||q.type==='dropdown'){
    const items=q.items, arr=Array.isArray(v)?v:Array(items.length).fill('');
    area.innerHTML=`<div>${items.map((s,i)=>`<div class="match-row"><div>${esc(s)}</div><div class="match-arrow">→</div><select class="select match-select" data-i="${i}"><option value="">Alege...</option>${q.choices.map(c=>`<option value="${esc(c)}" ${arr[i]===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div>`).join('')}</div>`;
    area.querySelectorAll('.match-select').forEach(sel=>sel.onchange=()=>{const a=Array.isArray(state.answers[q.id])?[...state.answers[q.id]]:Array(items.length).fill('');a[Number(sel.dataset.i)]=sel.value;state.answers[q.id]=a;state.skipped.delete(q.id);});
  }
}
async function finishTest(){
  const unanswered=state.questions.filter(q=>!state.skipped.has(q.id)&&!answerComplete(q,state.answers[q.id])).length;
  if(unanswered && !confirm(`Mai ai ${unanswered} întrebări fără răspuns. Vrei să termini testul?`))return;
  const payload=state.questions.map(q=>({id:q.id,value:state.answers[q.id],skipped:state.skipped.has(q.id)||!answerComplete(q,state.answers[q.id])}));
  try{state.result=await api('/api/submit',{method:'POST',body:JSON.stringify({answers:payload})});state.filter='all';renderResults();}catch(e){toast(e.message)}
}
function userAnswerText(r){if(r.type==='matrix')return (r.userAnswer||[]).map((x,i)=>`${i+1}. ${x?'Yes/True':'No/False'}`).join(' | ');if(Array.isArray(r.userAnswer))return r.userAnswer.join(' | ');return r.userAnswer||'—'}
function renderResults(){
  const R=state.result;logoutBtn.classList.remove('hidden');
  app.innerHTML=`<section class="card pad"><div class="results-head"><div class="score-ring" style="--pct:${R.percent}"><strong>${R.percent}%</strong></div><div><h1 class="h1" style="font-size:36px">Rezultatul testului</h1><p class="muted">Punctajul ține cont și de subitemii din Yes/No, matching și dropdown.</p><div class="result-stats"><div class="rstat"><b>${R.earned}/${R.max}</b> puncte</div><div class="rstat"><b>${R.fullCorrect}/${R.totalQuestions}</b> întrebări complet corecte</div><div class="rstat"><b>${R.results.filter(x=>x.status==='skipped').length}</b> sărite</div></div></div></div><div class="setup-actions"><button id="newTest" class="btn secondary">Test nou</button><button id="retryWrong" class="btn">Vezi greșelile ↓</button></div></section><div class="filters"><button class="filter active" data-f="all">Toate</button><button class="filter" data-f="wrong">Greșite / parțiale</button><button class="filter" data-f="correct">Corecte</button><button class="filter" data-f="skipped">Sărite</button></div><div id="resultList" class="result-list"></div>`;
  document.getElementById('newTest').onclick=renderSetup;document.getElementById('retryWrong').onclick=()=>setFilter('wrong');document.querySelectorAll('.filter').forEach(b=>b.onclick=()=>setFilter(b.dataset.f));renderResultList();
}
function setFilter(f){state.filter=f;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.f===f));renderResultList();document.getElementById('resultList').scrollIntoView({behavior:'smooth',block:'start'});}
function renderResultList(){
  const list=document.getElementById('resultList');let rows=state.result.results;
  if(state.filter==='wrong')rows=rows.filter(x=>['wrong','partial'].includes(x.status));else if(state.filter!=='all')rows=rows.filter(x=>x.status===state.filter);
  list.innerHTML=rows.map(r=>`<div class="result-item"><div class="result-summary" data-id="${r.id}"><div class="status-icon ${r.status}">${r.status==='correct'?'✓':r.status==='partial'?'½':r.status==='skipped'?'—':'×'}</div><div><b>Întrebarea ${state.questions.findIndex(q=>q.id===r.id)+1} • ${esc(r.prompt.split('\n')[0].slice(0,110))}${r.prompt.length>110?'…':''}</b><span>Cap. ${r.chapter} • ${r.earned}/${r.max} puncte</span></div><span>Detalii ▾</span></div><div class="result-detail hidden" id="d${r.id}"><div class="answer-box"><b>Răspunsul tău:</b> ${esc(userAnswerText(r))}</div><div class="answer-box"><b>Răspuns corect:</b> ${esc(r.correctAnswer)}</div><h4>De ce?</h4><div class="explanation">${esc(r.explanation)}</div></div></div>`).join('')||`<div class="card pad muted">Nu există întrebări în acest filtru.</div>`;
  list.querySelectorAll('.result-summary').forEach(x=>x.onclick=()=>document.getElementById('d'+x.dataset.id).classList.toggle('hidden'));
}
logoutBtn.onclick=async()=>{try{await api('/api/logout',{method:'POST',body:'{}'})}catch{}renderLogin()};
loadConfig();
