/* HANSY portfolio — 편집 모드 (/edit/)
   화면 = 실제 사이트. 누르면 선택 → 오른쪽 패널에서 수정 · 끌어서 순서 바꾸기 · 두 번 눌러 글자 고치기
   바뀌면 즉시 화면 반영 → 브라우저에 먼저 보관(새로고침·연결 전에도 유지) → 1.2초 뒤 GitHub 커밋 한 번 → 약 1분 뒤 실제 사이트 반영
   되돌리기 Ctrl+Z · 다시 실행 Ctrl+Shift+Z · 패널 닫기 Esc */
(() => {
  'use strict';
  const PF = window.PF; if (!PF) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { esc, KINDS } = PF;
  const cs = s => (window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'));
  const GH = { owner: 'hansy-daangn', repo: 'pf', branch: 'main', api: 'https://api.github.com' }, R = `/repos/${GH.owner}/${GH.repo}`;
  const TK = 'pf.gh', DRAFT = 'pf.draft';
  const clone = o => JSON.parse(JSON.stringify(o)), same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const r2 = x => Math.round(x * 100) / 100;
  const W = id => PF.S.all.find(w => w.id === id);
  const cur = () => ({ works: PF.S.all, home: PF.S.H });
  const media = w => (w.media = w.media || {});
  const isTool = w => PF.isTool(w);
  const wideSrc = w => { const x = (PF.S.X[w.id] || {}).wide; return x && x.from === PF.sigWide(w) ? x.src : ((w.media || {}).poster_w || PF.posterOf(w)); };
  const svg = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="1.3" fill="currentColor" stroke="none"/>`;
  const IC = {
    undo: svg('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'), redo: svg('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>'), back: svg('<path d="m15 18-6-6 6-6"/>'), play: svg('<path d="M7 5v14l11-7z" fill="currentColor" stroke="none"/>'), pause: svg('<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" stroke="none"/>'),
    eye: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'), eyeOff: svg('<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
    grip: svg(dot(9, 6) + dot(15, 6) + dot(9, 12) + dot(15, 12) + dot(9, 18) + dot(15, 18)), plus: svg('<path d="M12 5v14M5 12h14"/>'), list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  };
  let token = localStorage.getItem(TK) || '';
  let base = clone(cur());            // 마지막으로 GitHub에 있는 상태
  const pend = {};                    // 아직 올리지 않은 새 이미지: 경로 → Blob (IndexedDB에도 보관)
  const uploaded = new Set();         // 이번 세션에 올린 이미지
  const undo = [], redo = [];

  /* ---------- 이미지 보관함(IndexedDB): 새로고침해도 안 사라지게 ---------- */
  const IDB = (() => {
    let p = null;
    const db = () => p || (p = new Promise((res, rej) => { const q = indexedDB.open('pf-edit', 1); q.onupgradeneeded = () => q.result.createObjectStore('img'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }));
    const run = (mode, fn) => db().then(d => new Promise((res, rej) => { const t = d.transaction('img', mode), q = fn(t.objectStore('img')); t.oncomplete = () => res(q && q.result); t.onerror = t.onabort = () => rej(t.error); }));
    return { put: (k, v) => run('readwrite', s => s.put(v, k)), get: k => run('readonly', s => s.get(k)), del: k => run('readwrite', s => s.delete(k)), keys: () => run('readonly', s => s.getAllKeys()) };
  })();

  /* ---------- 위쪽 편집 바 ---------- */
  const bar = document.createElement('div'); bar.className = 'eb';
  bar.innerHTML = `<div class="l"><b class="lg">편집</b><button class="ib u" title="되돌리기 (Ctrl+Z)" aria-label="되돌리기">${IC.undo}</button><button class="ib r" title="다시 실행 (Ctrl+Shift+Z)" aria-label="다시 실행">${IC.redo}</button><span class="vr"></span><button class="tb pl">${IC.list}재생목록</button></div>
<div class="c"><i class="dot"></i><span class="st"></span><span class="sa"></span></div>
<div class="rt"><a class="tb" href="design/" target="_blank" rel="noopener">디자인</a><a class="tb" href="index.html" target="_blank" rel="noopener">사이트 보기 ↗</a><button class="tb cn" hidden>저장 연결</button></div>`;
  document.body.prepend(bar);
  const stEl = $('.st', bar), saEl = $('.sa', bar), cnB = $('.cn', bar), uB = $('.u', bar), rB = $('.r', bar);
  const status = (s, t, act = '') => { bar.dataset.s = s; stEl.textContent = t; saEl.innerHTML = act; };
  const toast = (msg, canUndo = true) => {
    let t = $('.etoast'); if (!t) { t = document.createElement('div'); t.className = 'etoast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = `<span>${esc(msg)}</span>${canUndo ? '<button>되돌리기</button>' : ''}`; t.classList.add('on');
    const b = $('button', t); if (b) b.onclick = () => { uB.click(); t.classList.remove('on'); };
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 4200);
  };

  /* ---------- 상태 변경: 기록 → 화면 → 보관 → 저장 예약 ---------- */
  const snap = () => JSON.stringify(cur());
  const histUI = () => { uB.disabled = !undo.length; rB.disabled = !redo.length; };
  const pushUndo = pre => { undo.push(pre); if (undo.length > 150) undo.shift(); redo.length = 0; histUI(); };
  const change = (fn, { render = true } = {}) => {
    const pre = snap(); fn(PF.S); PF.setData(cur()); if (snap() === pre) return false;
    pushUndo(pre); if (render) rerender(); refreshPanel(); queueSave(); return true;
  };
  const restore = s => { PF.setData(JSON.parse(s)); rerender(); refreshPanel(true); queueSave(); };
  uB.onclick = () => { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); histUI(); };
  rB.onclick = () => { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); histUI(); };
  histUI();

  const featId = () => { const f = $$('.feat .fs')[PF.Feat.i]; return f ? f.dataset.id : null; };
  const rerender = () => {
    const y = scrollY, xs = {}, fid = featId();
    $$('.rows .row').forEach(r => { const sc = $('.sc', r); if (sc) xs[r.dataset.row] = sc.scrollLeft; });
    PF.renderHome(); decorate();
    $$('.rows .row').forEach(r => { const sc = $('.sc', r), x = xs[r.dataset.row]; if (sc && x) { sc.style.scrollBehavior = 'auto'; sc.scrollLeft = x; sc.style.scrollBehavior = ''; } });
    if (fid) { const k = $$('.feat .fs').findIndex(f => f.dataset.id === fid); if (k > 0) PF.Feat.go(k); }
    scrollTo({ top: y, behavior: 'instant' });
  };

  /* ---------- 재생목록 데이터 ---------- */
  const ix = k => +String(k).split('.')[1];
  const rowObj = k => (PF.S.H.rows || [])[ix(k)];
  const validKey = k => k === 'feat' || k === 'rep' || !!rowObj(k);
  const autoIds = k => { const r = rowObj(k); return PF.MDATA.filter(w => (w.kinds || []).includes(r.kind)).map(w => w.id); };
  const viewIds = k => { const H = PF.S.H; if (k === 'feat') return H.billboard || []; if (k === 'rep') return H.rep || []; const r = rowObj(k); return r.ids || autoIds(k); };
  const keyIds = k => { const H = PF.S.H; if (k === 'feat') return H.billboard || (H.billboard = []); if (k === 'rep') return H.rep || (H.rep = []); const r = rowObj(k); if (!r.ids) r.ids = autoIds(k); return r.ids; };   // 바꿀 때만(자동 목록은 이때 직접 관리로 바뀜)
  const listTitle = k => { const H = PF.S.H; if (k === 'feat') return '피처드'; if (k === 'rep') return H.repTitle || '대표 작업'; const r = rowObj(k); return r.title || KINDS[r.kind] || '재생목록'; };
  const setTitle = (k, v) => { const H = PF.S.H; if (k === 'rep') { if (v === '대표 작업') delete H.repTitle; else H.repTitle = v; } else if (k !== 'feat') rowObj(k).title = v; };
  const isHidden = k => k === 'rep' ? !!PF.S.H.repHidden : k === 'feat' ? false : !!rowObj(k).hidden;
  const lists = () => [{ k: 'feat' }, { k: 'rep' }, ...(PF.S.H.rows || []).map((r, i) => ({ k: `rows.${i}` }))];
  const shown = id => { const w = W(id); return !!w && !isTool(w) && !!PF.posterOf(w) && (w.grade ?? 3) <= 2; };
  const inList = (k, id) => viewIds(k).includes(id);
  const moveId = (arr, id, before) => { const k = arr.indexOf(id); if (k < 0) return; arr.splice(k, 1); const j = before ? arr.indexOf(before) : -1; j < 0 ? arr.push(id) : arr.splice(j, 0, id); };
  const unhide = ids => ids.forEach(id => { const w = W(id); if (w && (w.grade ?? 3) > 2) w.grade = 2; });

  /* ---------- 저장: 바뀐 칸만 최신 원본 위에 얹어 커밋(이미지 먼저) ---------- */
  const diff = (b, c) => {
    const d = { works: {}, home: {} };
    c.works.forEach(w => {
      const o = b.works.find(x => x.id === w.id); if (!o) { d.works[w.id] = { __new: w }; return; }
      const ch = {}; new Set([...Object.keys(o), ...Object.keys(w)]).forEach(k => {
        if (k === 'media') new Set([...Object.keys(o.media || {}), ...Object.keys(w.media || {})]).forEach(m => { if (!same((o.media || {})[m], (w.media || {})[m])) ch['media.' + m] = (w.media || {})[m]; });
        else if (!same(o[k], w[k])) ch[k] = w[k];
      });
      if (Object.keys(ch).length) d.works[w.id] = ch;
    });
    new Set([...Object.keys(b.home), ...Object.keys(c.home)]).forEach(k => { if (!same(b.home[k], c.home[k])) d.home[k] = c.home[k]; });
    return d;
  };
  const empty = d => !Object.keys(d.works).length && !Object.keys(d.home).length;
  const merge = (remote, d) => {
    const works = clone(remote.works), home = clone(remote.home);
    Object.entries(d.works).forEach(([id, ch]) => {
      if (ch.__new) { if (!works.find(w => w.id === id)) works.push(clone(ch.__new)); return; }
      const w = works.find(x => x.id === id); if (!w) return;
      Object.entries(ch).forEach(([k, v]) => { if (k.startsWith('media.')) { w.media = w.media || {}; const m = k.slice(6); if (v === undefined) delete w.media[m]; else w.media[m] = clone(v); } else if (v === undefined) delete w[k]; else w[k] = clone(v); });
    });
    Object.entries(d.home).forEach(([k, v]) => { if (v === undefined) delete home[k]; else home[k] = clone(v); });
    return { works, home };
  };
  const nChanged = () => { const d = diff(base, cur()); return Object.keys(d.works).length + Object.keys(d.home).length; };
  const api = async (path, opt = {}) => {
    const r = await fetch(GH.api + path, { ...opt, headers: { Authorization: `Bearer ${token}`, Accept: opt.raw ? 'application/vnd.github.raw' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } });
    if (!r.ok) { const t = await r.text(); const err = new Error(`${r.status} ${t.slice(0, 200)}`); err.status = r.status; throw err; }
    return opt.raw ? r.text() : r.json();
  };
  const remoteState = async sha => { const [works, home] = await Promise.all(['works', 'home'].map(f => api(`${R}/contents/data/${f}.json?ref=${sha}`, { raw: true }).then(JSON.parse))); return { works, home }; };
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
  const HK = { billboard: '피처드', rep: '대표 작업', repTitle: '대표 작업 이름', repHidden: '대표 작업 숨김', rows: '재생목록' };
  const summary = d => { const n = Object.keys(d.works).map(id => ((W(id) || {}).title || id).split(' — ')[0]); const h = Object.keys(d.home).map(k => HK[k] || k); const all = [...new Set([...h, ...n])]; return `편집: ${all.slice(0, 4).join(', ')}${all.length > 4 ? ` 외 ${all.length - 4}건` : ''}`; };
  const refs = () => { const s = new Set(); PF.S.all.forEach(w => { const m = w.media || {}; ['poster', 'poster_w'].forEach(k => m[k] && s.add(m[k])); }); return s; };
  const histRefs = () => { const s = new Set(); [...undo, ...redo].forEach(x => (x.match(/assets\/poster\/e\/[^"]+/g) || []).forEach(p => s.add(p))); return s; };
  const idle = () => {
    cnB.hidden = !!token; const n = nChanged();
    if (!token) return status(n ? 'local' : 'idle', n ? `변경 ${n}건 · 이 브라우저에 보관 중` : '저장 연결 전', n ? '<button data-act="connect">연결하고 저장</button>' : '');
    status(n ? 'busy' : 'ok', n ? `변경 ${n}건 저장 대기` : '저장됨');
  };
  let saving = false, again = false, saveT = 0, retryN = 0, saveN = 0;
  const persist = () => { try { localStorage.setItem(DRAFT, JSON.stringify({ base, cur: cur() })); } catch (e) { } };
  const queueSave = () => { persist(); clearTimeout(saveT); if (!token) return idle(); const n = nChanged(); status(n ? 'busy' : 'ok', n ? `변경 ${n}건 저장 대기` : '저장됨'); if (n) saveT = setTimeout(save, 1200); };
  const save = async () => {
    clearTimeout(saveT);
    if (saving) { again = true; return; }
    if (!token) return idle();
    // 이미지 파일이 없는 새 경로는 저장하지 않고 되돌림(깨진 썸네일 방지)
    const known = new Set(); base.works.forEach(w => { const m = w.media || {}; ['poster', 'poster_w'].forEach(k => m[k] && known.add(m[k])); });
    let fixed = false;
    PF.S.all.forEach(w => { const m = w.media || {}; ['poster', 'poster_w'].forEach(k => { const p = m[k]; if (p && p.startsWith('assets/poster/e/') && !pend[p] && !known.has(p) && !uploaded.has(p)) { const o = ((base.works.find(x => x.id === w.id) || {}).media) || {}; if (o[k]) m[k] = o[k]; else delete m[k]; fixed = true; } }); });
    if (fixed) { PF.setData(cur()); rerender(); refreshPanel(); toast('이미지 파일을 찾지 못해 썸네일 하나를 되돌렸어요', false); }
    const d = diff(base, cur());
    if (empty(d)) { localStorage.removeItem(DRAFT); return idle(); }
    const up = [...refs()].filter(p => pend[p]);
    saving = true; const n = ++saveN; status('busy', '저장 중…');
    try {
      let merged = null, sha = '';
      for (let attempt = 0; !sha; attempt++) {
        const head = (await api(`${R}/git/ref/heads/${GH.branch}`)).object.sha;
        const commit = await api(`${R}/git/commits/${head}`);
        merged = merge(await remoteState(head), d);
        const tree = [];
        const put = async (path, content, encoding) => { const b = await api(`${R}/git/blobs`, { method: 'POST', body: JSON.stringify({ content, encoding }) }); tree.push({ path, mode: '100644', type: 'blob', sha: b.sha }); };
        for (const p of up) await put(p, await b64(pend[p]), 'base64');
        await put('data/works.json', JSON.stringify(merged.works, null, 1) + '\n', 'utf-8');
        await put('data/home.json', JSON.stringify(merged.home, null, 1) + '\n', 'utf-8');
        const t = await api(`${R}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
        const c = await api(`${R}/git/commits`, { method: 'POST', body: JSON.stringify({ message: summary(d), tree: t.sha, parents: [head] }) });
        try { await api(`${R}/git/refs/heads/${GH.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha, force: false }) }); sha = c.sha; }
        catch (e) { if (e.status === 422 && attempt < 3) continue; throw e; }
      }
      up.forEach(p => { uploaded.add(p); delete pend[p]; IDB.del(p).catch(() => { }); });
      const keep = new Set([...refs(), ...histRefs()]); Object.keys(pend).forEach(p => { if (!keep.has(p)) { delete pend[p]; IDB.del(p).catch(() => { }); } });
      const old = base; base = clone(merged);
      const mine = merge(merged, diff(old, cur()));   // 저장하는 동안 고친 것 + 다른 곳에서 바뀐 것 모두 유지
      if (!same(mine, cur())) { PF.setData(mine); rerender(); refreshPanel(); }
      retryN = 0;
      if (nChanged()) persist(); else localStorage.removeItem(DRAFT);
      status('ok', '저장됨 · 사이트 반영 중', `<a href="https://github.com/${GH.owner}/${GH.repo}/commit/${sha}" target="_blank" rel="noopener">커밋 ↗</a>`);
      watchDeploy(merged, n);
    } catch (e) {
      again = false;
      const auth = e.status === 401 || (e.status === 403 && !/rate limit/i.test(e.message));
      if (auth) { token = ''; localStorage.removeItem(TK); cnB.hidden = false; status('err', '연결이 만료됐어요 · 고친 내용은 보관 중', '<button data-act="connect">다시 연결</button>'); }
      else { const wait = [5, 15, 45][retryN]; status('err', wait ? `저장 실패 · ${wait}초 뒤 다시 시도` : '저장 실패 · 고친 내용은 보관 중', '<button data-act="retry">지금 다시 시도</button>'); if (wait) { retryN++; saveT = setTimeout(save, wait * 1000); } }
      console.warn(e);
    } finally { saving = false; if (again) { again = false; queueSave(); } }
  };
  const watchDeploy = async (merged, n) => {   // 실제 사이트 파일이 바뀌었는지 확인
    for (let k = 0; k < 30; k++) {
      await sleep(k ? 8000 : 15000); if (n !== saveN || saving) return;
      try {
        const [w, h] = await Promise.all(['works', 'home'].map(f => fetch(`data/${f}.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json())));
        if (same(w, merged.works) && same(h, merged.home)) { if (n === saveN && bar.dataset.s === 'ok') status('ok', '사이트 반영됨', saEl.innerHTML); return; }
      } catch (e) { }
    }
  };
  saEl.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.dataset.act === 'connect') connect(); if (a.dataset.act === 'retry') { retryN = 0; save(); } });
  cnB.addEventListener('click', () => connect());
  addEventListener('beforeunload', e => { if (saving || (token && nChanged())) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- 창(모달) ---------- */
  const modal = (html, cls = '') => {
    const m = document.createElement('div'); m.className = `emodal ${cls}`; m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`; document.body.appendChild(m);
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    const close = () => { m.remove(); removeEventListener('keydown', key, true); };
    addEventListener('keydown', key, true);
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) close(); });
    m.close = close; return m;
  };
  const loadLatest = async () => {
    try { const head = (await api(`${R}/git/ref/heads/${GH.branch}`)).object.sha; const remote = await remoteState(head); base = clone(remote); PF.setData(clone(remote)); return true; }
    catch (e) { if (e.status === 401) { token = ''; localStorage.removeItem(TK); } return false; }
  };
  const connect = () => {
    if ($('.emodal.cx')) return;
    const m = modal(`<h3>저장 연결 (처음 한 번)</h3><ol>
<li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub 토큰 만들기 ↗</a> 열기</li>
<li>Token name <b>pf-edit</b> · Expiration <b>1년</b></li>
<li>Repository access → <b>Only select repositories</b> → <b>hansy-daangn/pf</b></li>
<li>Permissions → Repository permissions → <b>Contents</b> → <b>Read and write</b></li>
<li>Generate token → 복사해서 아래에 붙여넣기</li></ol>
<input type="password" placeholder="github_pat_…" autocomplete="off" aria-label="GitHub 토큰"><p class="msg"></p><div class="erow"><span class="sp"></span><button class="btn2" data-x>닫기</button><button class="btn2 pri" data-go>연결</button></div>`, 'cx');
    const inp = $('input', m); setTimeout(() => inp.focus(), 30);
    const go = async () => {
      const v = inp.value.trim(); if (!v) return; const prev = token; token = v; $('.msg', m).textContent = '확인 중…';
      try {
        const r = await api(R); if (!r.permissions || !r.permissions.push) throw new Error('perm');
        localStorage.setItem(TK, token); m.close(); cnB.hidden = true;
        const d = diff(base, cur()); status('busy', '최신 내용 불러오는 중…');   // 연결 전에 고친 것은 최신 원본 위에 다시 얹음
        await loadLatest(); if (!empty(d)) PF.setData(merge(cur(), d));
        rerender(); refreshPanel(true); queueSave();
      } catch (e) { token = prev; $('.msg', m).textContent = '연결 실패 — 저장소 선택과 Contents 읽기·쓰기 권한을 확인해 주세요'; }
    };
    $('[data-go]', m).onclick = go; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  };

  /* ---------- 끌어서 순서 바꾸기(공통): id 기준 · 가장자리 자동 스크롤 · 자리 바뀜 애니메이션 ---------- */
  let justDragged = 0;
  const nextItem = (el, sel) => { let n = el.nextElementSibling; while (n && (!n.matches(sel) || n.classList.contains('edragging'))) n = n.nextElementSibling; return n; };
  const flip = (els, mutate) => {
    const r0 = new Map(els.map(x => [x, x.getBoundingClientRect()])); mutate();
    els.forEach(x => { const a = r0.get(x), b = x.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top; if (Math.abs(dx) + Math.abs(dy) < 1) return; x.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }); });
  };
  const dragItems = (e, item, { box, sel, axis = 'x', key = el => el.dataset.id, scroller = null, page = false, ghostHTML = null, onDrop }) => {
    const sx = e.clientX, sy = e.clientY; let on = false, ghost = null, ph = null, px = sx, py = sy, raf = 0, dx = 0, dy = 0;
    const id = key(item), next0 = nextItem(item, sel), before0 = next0 ? key(next0) : null;
    const sibs = () => [...box.children].filter(x => x.matches(sel) && x !== item);
    const place = () => {
      const others = sibs(); let before = null;
      for (const o of others) { const r = o.getBoundingClientRect(); if (axis === 'x' ? px < r.left + r.width / 2 : py < r.top + r.height / 2) { before = o; break; } }
      if (nextItem(ph, sel) === before) return;
      flip(others, () => { if (before) before.before(ph); else if (others.length) others[others.length - 1].after(ph); });
    };
    const start = () => {
      on = true; document.body.classList.add('edrag'); const r = item.getBoundingClientRect(); dx = sx - r.left; dy = sy - r.top;
      ghost = document.createElement('div'); ghost.className = 'eghost' + (ghostHTML ? ' pill' : '');
      if (ghostHTML) ghost.innerHTML = ghostHTML; else { const c = item.cloneNode(true); c.classList.remove('esel'); ghost.appendChild(c); Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px' }); }
      (item.closest('.ei') || document.body).appendChild(ghost);
      ph = document.createElement('div'); ph.className = 'eph' + (axis === 'y' && ghostHTML ? ' line' : ''); if (!(axis === 'y' && ghostHTML)) { ph.style.width = r.width + 'px'; ph.style.height = r.height + 'px'; }
      item.after(ph); item.classList.add('edragging');
      loop();
    };
    const pos = () => { if (ghost) { ghost.style.left = (ghostHTML ? px + 14 : px - dx) + 'px'; ghost.style.top = (ghostHTML ? py - 18 : py - dy) + 'px'; } };
    const loop = () => {   // 가장자리에 가까울수록 빠르게 자동 스크롤
      raf = requestAnimationFrame(loop); let moved = false;
      if (scroller) { const r = scroller.getBoundingClientRect(), E = 90; const p = axis === 'x' ? px : py, lo = axis === 'x' ? r.left : r.top, hi = axis === 'x' ? r.right : r.bottom; let v = 0; if (p > hi - E) v = Math.min(1, (p - (hi - E)) / E); else if (p < lo + E) v = -Math.min(1, ((lo + E) - p) / E); if (v) { if (axis === 'x') scroller.scrollLeft += v * 22; else scroller.scrollTop += v * 18; moved = true; } }
      if (page) { const top = 140, E = 90; let v = 0; if (py > innerHeight - E) v = Math.min(1, (py - (innerHeight - E)) / E); else if (py < top) v = -Math.min(1, (top - py) / E); if (v) { scrollBy(0, v * 20); moved = true; } }
      if (moved) place();
    };
    const move = ev => { px = ev.clientX; py = ev.clientY; if (!on) { if (Math.hypot(px - sx, py - sy) < 6) return; start(); } pos(); place(); };
    const end = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); cancelAnimationFrame(raf);
      if (!on) return; justDragged = Date.now();
      const nx = nextItem(ph, sel), before = nx ? key(nx) : null;
      ghost.remove(); ph.remove(); item.classList.remove('edragging'); document.body.classList.remove('edrag');
      if (ev.type === 'pointerup' && before !== before0 && before !== id) onDrop(id, before);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  };
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('[contenteditable="true"], .ex, .eadd, .eopen, input, textarea, select, .emodal, [data-rm], [data-hide]')) return;
    const t = e.target;
    const hd = t.closest('.rows .row .ehandle');
    if (hd) { const row = hd.closest('.row'); e.preventDefault(); return dragItems(e, row, { box: row.parentElement, sel: '.row:not([data-row="rep"])', axis: 'y', key: el => el.dataset.row, page: true, ghostHTML: esc($('h2', row).textContent), onDrop: (k, b) => moveRow(k, b) }); }
    const ch = t.closest('.estrip .ech');
    if (ch) return dragItems(e, ch, { box: ch.parentElement, sel: '.ech', scroller: ch.parentElement, onDrop: (id, b) => change(() => moveId(keyIds('feat'), id, b)) });
    const c = t.closest('.rows .sc > .card');
    if (c) { const k = c.closest('.row').dataset.row; return dragItems(e, c, { box: c.parentElement, sel: '.card', scroller: c.parentElement, onDrop: (id, b) => change(() => moveId(keyIds(k), id, b)) }); }
    const pli = t.closest('.ei .pli[data-k^="rows."]');
    if (pli) return dragItems(e, pli, { box: pli.parentElement, sel: '.pli[data-k^="rows."]', axis: 'y', key: el => el.dataset.k, scroller: $('.ei .bd'), onDrop: (k, b) => moveRow(k, b) });
    const pit = t.closest('.ei .pit');
    if (pit && mode && mode.t === 'list') { const k = mode.k; return dragItems(e, pit, { box: pit.parentElement, sel: '.pit', axis: 'y', scroller: $('.ei .bd'), onDrop: (id, b) => change(() => moveId(keyIds(k), id, b)) }); }
  });
  const moveRow = (k, b) => change(S => { const a = S.H.rows, o = a[ix(k)], bo = b ? a[ix(b)] : null; a.splice(a.indexOf(o), 1); a.splice(bo ? a.indexOf(bo) : a.length, 0, o); });
  document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('.feat, .rows, .ei')) e.preventDefault(); });

  /* ---------- 글자 바로 고치기(두 번 누르기) ---------- */
  const nbh = s => esc(s).split(' ').map(x => `<span class="nb">${x}</span>`).join(' ');
  const syncText = id => {
    const w = W(id); if (!w) return; const q = cs(id);
    $$(`.rows .card[data-id="${q}"]`).forEach(c => { const t = $('.t', c), s = $('.s', c); if (t && !t.isContentEditable) t.textContent = w.title; if (s) s.textContent = w.type || w.subtitle || ''; });
    $$(`.feat .fx[data-id="${q}"]`).forEach(fx => {
      const h = $('h2', fx); if (h && !h.isContentEditable) h.innerHTML = nbh(w.title);
      const v = (w.copy || {}).one || ''; let one = $('.one', fx); if (!one && v && h) { h.insertAdjacentHTML('afterend', '<p class="one"></p>'); one = $('.one', fx); } if (one && !one.isContentEditable) { one.textContent = v; one.hidden = !v; }
      const k = $('.k', fx); if (k) k.textContent = (w.type || '') + (w.year ? ' · ' + w.year : '');
    });
    $$(`.estrip .ech[data-id="${q}"] span`).forEach(x => { x.textContent = w.title.split(' — ')[0]; });
    if (mode && mode.t === 'work' && mode.id === id) { $('.eh b', EI).textContent = w.title; $('.eh small', EI).textContent = w.type || ''; }
    $$(`.ei .pit[data-id="${q}"] .tx b`).forEach(x => { x.textContent = w.title; });
  };
  const inlineTarget = el => {
    const fx = el.closest('.fx'), card = el.closest('.card'), row = el.closest('.row');
    if (card) { const id = card.dataset.id; return { get: () => W(id).title, set: v => { W(id).title = v; }, id }; }
    if (fx && el.matches('h2')) { const id = fx.dataset.id; return { get: () => W(id).title, set: v => { W(id).title = v; }, id }; }
    if (fx && el.matches('.one')) { const id = fx.dataset.id; return { get: () => (W(id).copy || {}).one || '', set: v => { (W(id).copy = W(id).copy || {}).one = v; }, id, allowEmpty: true }; }
    if (row) { const k = row.dataset.row; return { get: () => listTitle(k), set: v => setTitle(k, v), k }; }
  };
  const inlineEdit = el => {
    const g = inlineTarget(el); if (!g) return; const before = g.get();
    el.textContent = before; el.contentEditable = 'true'; el.spellcheck = false; el.classList.add('eediting'); el.focus();
    const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    let done = false;
    const fin = ok => {
      if (done) return; done = true; el.removeAttribute('contenteditable'); el.classList.remove('eediting'); el.removeEventListener('keydown', key); el.removeEventListener('blur', blur);
      const v = el.textContent.replace(/\s+/g, ' ').trim();
      if (ok && v !== before && (v || g.allowEmpty)) change(() => g.set(v), { render: false });
      if (g.id) syncText(g.id); else el.textContent = g.get();
      refreshPanel(true);
    };
    const key = e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); fin(true); } if (e.key === 'Escape') { e.preventDefault(); fin(false); } };
    const blur = () => fin(true);
    el.addEventListener('keydown', key); el.addEventListener('blur', blur);
  };
  document.addEventListener('dblclick', e => {
    const t = e.target.closest('.rows .card .t, .feat .fx h2, .feat .fx .one, .rows .row .hd h2');
    if (!t || t.isContentEditable) return; e.preventDefault(); e.stopPropagation(); inlineEdit(t);
  }, true);

  /* ---------- 화면 클릭: 링크로 나가지 않고 선택 ---------- */
  const stop = e => { e.preventDefault(); e.stopPropagation(); };
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('.eb, .ei, .emodal, .etoast')) return;
    if (Date.now() - justDragged < 120) return stop(e);
    if (t.closest('[contenteditable="true"]')) return stop(e);
    const x = t.closest('.ex');
    if (x) {
      stop(e); const ch = x.closest('.ech'); if (ch) { change(() => { const a = keyIds('feat'), i = a.indexOf(ch.dataset.id); if (i >= 0) a.splice(i, 1); }); return toast('피처드에서 뺐어요'); }
      const c = x.closest('.card'), k = c.closest('.row').dataset.row; change(() => { const a = keyIds(k), i = a.indexOf(c.dataset.id); if (i >= 0) a.splice(i, 1); }); return toast(`'${listTitle(k)}'에서 뺐어요`);
    }
    const add = t.closest('.eadd'); if (add) { stop(e); return pickFor(add.dataset.k); }
    const op = t.closest('.eopen'); if (op) { stop(e); return openList(op.dataset.k); }
    if (t.closest('.estrip .lb')) { stop(e); return openList('feat'); }
    const c = t.closest('.rows .card, .estrip .ech');
    if (c) { stop(e); if (c.classList.contains('ech')) { const k = $$('.feat .fs').findIndex(f => f.dataset.id === c.dataset.id); if (k >= 0 && k !== PF.Feat.i) PF.Feat.go(k); } return select(c.dataset.id); }
    const h2 = t.closest('.rows .row .hd h2'); if (h2) { stop(e); return openList(h2.closest('.row').dataset.row); }
    if (t.closest('.feat .fv, .feat .fx, .feat [data-open], .feat [data-info]') && !t.closest('.fctl')) { stop(e); const id = featId(); return id && select(id); }
    const a = t.closest('a[href]'); if (a) { stop(e); window.open(a.href, '_blank', 'noopener'); }
  }, true);

  /* ---------- 화면에 편집 손잡이 붙이기(이벤트는 위에서 한 번만 연결) ---------- */
  const chip = id => { const w = W(id); return w ? `<div class="ech" data-id="${esc(id)}"><img src="${esc(PF.url(wideSrc(w)))}" alt=""><span>${esc(w.title.split(' — ')[0])}</span><button class="ex" aria-label="피처드에서 빼기" title="빼기">${IC.x}</button></div>` : ''; };
  const chipOn = () => { const id = featId(); $$('.estrip .ech').forEach(c => c.classList.toggle('on', c.dataset.id === id)); };
  const decorate = () => {
    const F = $('.feat');
    if (F && !$('.estrip', F)) { const ids = (PF.S.H.billboard || []).filter(id => { const w = W(id); return w && PF.feVideo(w) && !isTool(w); }); F.insertAdjacentHTML('beforeend', `<div class="estrip"><button class="lb" title="피처드 편집">피처드</button><div class="chips">${ids.map(chip).join('')}</div><button class="eadd sm" data-k="feat" title="피처드에 작품 추가" aria-label="피처드에 작품 추가">${IC.plus}</button></div>`); }
    $$('.rows .row').forEach(row => {
      const k = row.dataset.row, hd = $('.hd', row), sc = $('.sc', row); if (!hd || $('.eopen', hd)) return;
      if (k !== 'rep') hd.insertAdjacentHTML('afterbegin', `<button class="ehandle" title="끌어서 줄 순서 바꾸기" aria-label="끌어서 줄 순서 바꾸기">${IC.grip}</button>`);
      $('h2', hd).insertAdjacentHTML('afterend', `<button class="eopen" data-k="${k}">재생목록 편집</button>`);
      $$('.card', sc).forEach(c => $('.art', c).insertAdjacentHTML('beforeend', `<button class="ex" title="이 재생목록에서 빼기" aria-label="이 재생목록에서 빼기">${IC.x}</button>`));
      sc.insertAdjacentHTML('beforeend', `<button class="eadd" data-k="${k}" title="작품 추가" aria-label="작품 추가">${IC.plus}</button>`);
    });
    chipOn(); markSel();
  };
  const F0 = $('.feat'); if (F0) F0.addEventListener('pf:slide', chipOn);

  /* ---------- 오른쪽 패널: 작품 · 재생목록 전체 · 재생목록 하나 ---------- */
  const EI = document.createElement('aside'); EI.className = 'ei'; EI.setAttribute('aria-label', '편집 패널'); document.body.appendChild(EI);
  let mode = null, MT = null;
  const markSel = () => {
    $$('.esel').forEach(x => x.classList.remove('esel'));
    if (!mode) return;
    if (mode.t === 'work') $$(`.rows .card[data-id="${cs(mode.id)}"], .estrip .ech[data-id="${cs(mode.id)}"]`).forEach(x => x.classList.add('esel'));
    if (mode.t === 'list') { if (mode.k === 'feat') { const s = $('.estrip'); if (s) s.classList.add('esel'); } else { const r = $(`.rows .row[data-row="${mode.k}"]`); if (r) r.classList.add('esel'); } }
  };
  const openPanel = () => { if (!document.body.classList.contains('ei-on')) { document.body.classList.add('ei-on'); dispatchEvent(new Event('resize')); } };
  const killMT = () => { if (MT) { MT.kill(); MT = null; } };
  const closePanel = () => { killMT(); mode = null; EI.innerHTML = ''; delete EI.dataset.v; document.body.classList.remove('ei-on'); markSel(); dispatchEvent(new Event('resize')); };
  const refreshPanel = force => {
    if (!mode) return;
    if (mode.t === 'work') { if (!W(mode.id)) return closePanel(); workParts(force); }
    else if (mode.t === 'lists') drawLists();
    else if (!validKey(mode.k)) openLists(); else drawList(mode.k);
    markSel();
  };
  const head = (title, sub = '', back = false) => `<header class="eh">${back ? `<button class="ib" data-back aria-label="재생목록 전체" title="재생목록 전체">${IC.back}</button>` : ''}<div class="tt">${title}${sub ? `<small>${sub}</small>` : ''}</div><button class="ib x" aria-label="패널 닫기" title="닫기 (Esc)">${IC.x}</button></header>`;

  // 작품
  const FIELDS = [['title', '제목'], ['one', '한 줄 설명', 'ta'], ['type', '종류'], ['tools', '툴', 'arr'], ['channels', '매체', 'arr'], ['formats', '규격', 'arr'], ['dur', '길이'], ['period', '시기'], ['contrib', '기여도']];
  const getF = (w, k) => k === 'one' ? ((w.copy || {}).one || '') : Array.isArray(w[k]) ? w[k].join(' · ') : String(w[k] ?? '');
  const setF = (w, k, v, arr) => { if (k === 'one') { (w.copy = w.copy || {}).one = v; return; } if (arr) w[k] = v.split(/[·,]/).map(x => x.trim()).filter(Boolean); else if (!v && k !== 'title') delete w[k]; else w[k] = v; };
  const select = (id, from = null) => {
    if (!W(id)) return; if (mode && mode.t === 'work' && mode.id === id) { openPanel(); return; }
    killMT(); mode = { t: 'work', id, from }; EI.dataset.v = 'work'; const w = W(id), vs = PF.vidsOf(w);
    EI.innerHTML = head(`<b>${esc(w.title)}</b>`, esc(w.type || ' '), !!from) + `<div class="bd">
${vs.length ? `<section class="sec md"><div class="vbox"><video muted playsinline preload="auto"></video></div>
<div class="vc"><button class="ib pp" aria-label="재생">${IC.play}</button><span class="tm">0.0 / 0.0초</span><span class="sp"></span>${vs.length > 1 ? `<select class="vs" aria-label="영상 버전">${vs.map((v, i) => `<option value="${i}">${esc((v.label || `영상 ${i + 1}`).split(' — ')[0])} · ${v.w}×${v.h}</option>`).join('')}</select>` : ''}</div>
<div class="tl"><div class="strip"></div><i class="dim l"></i><i class="dim r"></i><div class="rng"><i class="h a"></i><i class="h b"></i></div><div class="flag"><b>호버</b></div><i class="ph"></i><div class="tip" hidden><i class="fr"></i><span></span></div></div>
<div class="leg"><span class="lf"><i></i>피처드 구간 <b class="vf"></b></span><span class="lh"><i></i>호버 시작 <b class="vh"></b></span></div>
<div class="acts"><span>현재 장면을</span><button class="btn2" data-cap="w">카드 썸네일로</button><button class="btn2" data-cap="p">포스터로</button></div></section>` : ''}
<section class="sec pl"><h4>재생목록</h4><div class="ml"></div></section>
<section class="sec th"><h4>썸네일</h4><div class="tg"></div></section>
<section class="sec nf"><h4>정보</h4>${FIELDS.map(([k, l, t]) => `<label class="f"><span>${l}</span>${t === 'ta' ? `<textarea data-f="${k}" rows="2"></textarea>` : `<input type="text" data-f="${k}"${t === 'arr' ? ' data-arr="1" placeholder="· 로 구분"' : ''}>`}</label>`).join('')}</section>
<section class="sec gx"><h4>노출</h4><div class="seg" role="group" aria-label="노출">${[[1, '대표'], [2, '일반'], [3, '숨김']].map(([g, l]) => `<button data-g="${g}">${l}</button>`).join('')}</div><button class="btn2 pv">상영관에서 보기</button></section></div>`;
    $$('[data-f]', EI).forEach(inp => {
      const k = inp.dataset.f, arr = inp.dataset.arr === '1'; let pre = null;
      inp.addEventListener('focus', () => { pre = snap(); });
      inp.addEventListener('input', () => { const v = inp.value.replace(/\s+/g, ' ').trim(); if (k === 'title' && !v) return; setF(W(id), k, v, arr); PF.setData(cur()); syncText(id); });
      inp.addEventListener('blur', () => { if (k === 'title' && !inp.value.trim()) inp.value = W(id).title; if (pre && snap() !== pre) { pushUndo(pre); queueSave(); } pre = null; });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (inp.tagName === 'INPUT' || !e.shiftKey)) { e.preventDefault(); inp.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (pre) { PF.setData(JSON.parse(pre)); syncText(id); inp.value = getF(W(id), k); pre = null; } inp.blur(); }
      });
    });
    openPanel(); workParts(true); markSel();
    if (vs.length) MT = timeline(id, $('.md', EI));
  };
  const workParts = force => {
    const id = mode.id, w = W(id);
    $('.eh b', EI).textContent = w.title; $('.eh small', EI).textContent = w.type || ' ';
    const noV = !PF.feVideo(w);
    $('.ml', EI).innerHTML = lists().map(({ k }) => { const off = k === 'feat' && noV; return `<label class="ck${off ? ' off' : ''}${isHidden(k) ? ' hid' : ''}"><input type="checkbox" data-k="${k}"${inList(k, id) ? ' checked' : ''}${off ? ' disabled' : ''}><span>${esc(listTitle(k))}</span>${off ? '<small>영상 없음</small>' : isHidden(k) ? '<small>숨김</small>' : ''}</label>`; }).join('') + `<button class="lnk" data-newlist>${IC.plus}새 재생목록</button>`;
    $('.tg', EI).innerHTML = `<figure class="tw"><div class="cv">${PF.cardHTML(w, 'wide')}</div><figcaption><span>카드</span><label class="lnk">이미지 올리기<input type="file" accept="image/*" data-up="w" hidden></label></figcaption></figure><figure class="tp"><div class="pv"><img src="${esc(PF.url(PF.posterOf(w)))}" alt=""></div><figcaption><span>포스터</span><label class="lnk">올리기<input type="file" accept="image/*" data-up="p" hidden></label></figcaption></figure>`;
    $$('[data-f]', EI).forEach(inp => { if (force || document.activeElement !== inp) inp.value = getF(w, inp.dataset.f); });
    const g = w.grade ?? 3; $$('[data-g]', EI).forEach(b => b.setAttribute('aria-pressed', +b.dataset.g === Math.min(3, g)));
    if (MT) MT.sync();
  };

  // 영상 타임라인: 필름스트립 + 피처드 구간(손잡이·통째로 끌기) + 호버 시작 깃발 + 재생 위치
  const timeline = (id, root) => {
    const vs = PF.vidsOf(W(id)), fe = PF.feVideo(W(id)), MIN = 3;
    const V = $('video', root), tl = $('.tl', root), strip = $('.strip', tl), rng = $('.rng', tl), dl = $('.dim.l', tl), dr = $('.dim.r', tl), flag = $('.flag', tl), ph = $('.ph', tl), tip = $('.tip', tl), tipF = $('.fr', tip), tipT = $('span', tip), tm = $('.tm', root), pp = $('.pp', root);
    let vi = Math.max(0, vs.indexOf(fe)), dur = 0, a = 0, b = 0, hs = 0, drag = null, want = null, loopSeg = false, raf = 0, alive = true;
    const film = () => { const f = (((PF.S.X[id] || {}).film) || [])[vi]; return f && f.from === vs[vi].hd ? f : null; };
    const isFe = () => vs[vi] === fe, isHv = () => vi === 0;
    const read = () => { const w = W(id); if (!w) return; [a, b] = PF.segOf(w); hs = +((w.media || {}).start) || 0; };
    const P = t => (dur ? Math.max(0, Math.min(100, t / dur * 100)) : 0);
    const paint = () => {
      rng.hidden = dl.hidden = dr.hidden = !isFe(); flag.hidden = !isHv();
      rng.style.left = P(a) + '%'; rng.style.width = (P(b) - P(a)) + '%'; dl.style.width = P(a) + '%'; dr.style.left = P(b) + '%'; flag.style.left = P(hs) + '%';
      $('.vf', root).textContent = `${a.toFixed(1)}–${b.toFixed(1)}초`; $('.vh', root).textContent = `${hs.toFixed(1)}초`;
      $('.lf', root).hidden = !isFe(); $('.lh', root).hidden = !isHv();
    };
    const drawStrip = () => {
      const f = film(); if (!f || !tl.clientWidth) { strip.innerHTML = ''; return; }
      const H = tl.clientHeight, Wd = tl.clientWidth, k = Math.max(1, Math.round(Wd / (f.fw * H / f.fh))), cw = Wd / k, src = esc(PF.url(f.src));
      let h = ''; for (let j = 0; j < k; j++) { const n = Math.min(f.n - 1, Math.floor((j + .5) * f.n / k)); h += `<i style="background-image:url('${src}');background-size:${f.n * cw}px ${H}px;background-position:${-n * cw}px 0"></i>`; }
      strip.innerHTML = h;
    };
    const showTip = t => {
      const f = film(); tip.hidden = false; tipT.textContent = t.toFixed(1) + '초';
      if (f) { const th = 96, tw = Math.round(f.fw * th / f.fh), n = Math.min(f.n - 1, Math.floor(t / dur * f.n)); Object.assign(tipF.style, { width: tw + 'px', height: th + 'px', backgroundImage: `url('${PF.url(f.src)}')`, backgroundSize: `${f.n * tw}px ${th}px`, backgroundPosition: `${-n * tw}px 0` }); tipF.hidden = false; } else tipF.hidden = true;
      const half = tip.offsetWidth / 2, x = P(t) / 100 * tl.clientWidth; tip.style.left = Math.max(half, Math.min(tl.clientWidth - half, x)) + 'px';
    };
    const seek = t => { want = t; if (V.readyState >= 1 && !V.seeking) V.currentTime = t; };   // 이전 이동이 끝나야 다음 이동(끄는 동안 멈춤 방지)
    V.addEventListener('seeked', () => { if (want != null && Math.abs(V.currentTime - want) > .06) V.currentTime = want; else want = null; });
    V.addEventListener('play', () => { pp.innerHTML = IC.pause; pp.setAttribute('aria-label', '일시정지'); });
    V.addEventListener('pause', () => { pp.innerHTML = IC.play; pp.setAttribute('aria-label', '재생'); });
    pp.addEventListener('click', () => { if (V.paused) { if (isFe() && (V.currentTime < a || V.currentTime >= b - .05)) { seek(a); loopSeg = true; } V.play().catch(() => { }); } else { V.pause(); loopSeg = false; } });
    V.addEventListener('click', () => pp.click());
    const load = k => {
      vi = k; const v = vs[vi]; dur = +v.dur || 0; read(); paint(); drawStrip();
      V.src = PF.url(v.sd || v.hd);
      V.addEventListener('loadedmetadata', () => { if (!dur) { dur = V.duration; paint(); drawStrip(); } seek(isFe() ? a : isHv() ? hs : 0); }, { once: true });
    };
    const sel = $('.vs', root); if (sel) { sel.value = vi; sel.addEventListener('change', () => load(+sel.value)); }
    const tAt = x => { const r = tl.getBoundingClientRect(); return Math.max(0, Math.min(dur, (x - r.left) / r.width * dur)); };
    tl.addEventListener('pointerdown', e => {
      if (!dur || e.button !== 0) return; e.preventDefault();
      const m = e.target.closest('.h.a') ? 'a' : e.target.closest('.h.b') ? 'b' : e.target.closest('.flag') ? 'hs' : e.target.closest('.rng') ? 'mv' : 'seek';
      tl.setPointerCapture(e.pointerId); V.pause(); loopSeg = false; drag = m; tl.dataset.drag = m;
      const t0 = tAt(e.clientX), a0 = a, b0 = b, mn = Math.min(MIN, dur);
      const mv = ev => {
        const t = tAt(ev.clientX); let s = t;
        if (m === 'a') { a = Math.max(0, Math.min(t, b - mn)); s = a; }
        else if (m === 'b') { b = Math.min(dur, Math.max(t, a + mn)); s = b; }
        else if (m === 'mv') { const d = Math.max(-a0, Math.min(dur - b0, t - t0)); a = a0 + d; b = b0 + d; s = a; }
        else if (m === 'hs') { hs = Math.max(0, Math.min(t, dur - .2)); s = hs; }
        paint(); showTip(s); seek(s);
      };
      const up = () => {
        tl.removeEventListener('pointermove', mv); tl.removeEventListener('pointerup', up); tl.removeEventListener('pointercancel', up); drag = null; delete tl.dataset.drag; tip.hidden = true;
        if (m === 'a' || m === 'b' || m === 'mv') { a = r2(a); b = r2(b); commitSeg(id, a, b); seek(a); loopSeg = true; V.play().catch(() => { }); }
        else if (m === 'hs') { hs = r2(hs); change(() => { media(W(id)).start = hs; }, { render: false }); seek(hs); V.play().catch(() => { }); }
      };
      tl.addEventListener('pointermove', mv); tl.addEventListener('pointerup', up); tl.addEventListener('pointercancel', up);
      if (m === 'seek') mv(e); else showTip(m === 'b' ? b : m === 'hs' ? hs : a);
    });
    tl.addEventListener('pointermove', e => { if (!drag && dur) showTip(tAt(e.clientX)); });
    tl.addEventListener('pointerleave', () => { if (!drag) tip.hidden = true; });
    root.addEventListener('click', async e => {
      const c = e.target.closest('[data-cap]'); if (!c || c.disabled) return; const t = V.currentTime, old = c.textContent; c.disabled = true; c.textContent = '캡처 중…';
      try { const fr = await grab(PF.url(vs[vi].hd), t); await makeImg(id, c.dataset.cap, fr, fr.videoWidth, fr.videoHeight); fr.removeAttribute('src'); fr.load(); toast(c.dataset.cap === 'w' ? '카드 썸네일을 바꿨어요' : '포스터를 바꿨어요'); }
      catch (err) { console.warn(err); toast('장면을 가져오지 못했어요', false); }
      finally { c.disabled = false; c.textContent = old; }
    });
    const tick = () => { if (!alive) return; raf = requestAnimationFrame(tick); if (!dur) return; const t = V.currentTime; ph.style.left = P(t) + '%'; tm.textContent = `${t.toFixed(1)} / ${dur.toFixed(1)}초`; if (loopSeg && isFe() && !V.paused && t >= b - .03) V.currentTime = a; };
    load(vi); requestAnimationFrame(drawStrip); tick();
    return { sync: () => { if (!drag) { read(); paint(); } }, layout: drawStrip, kill: () => { alive = false; cancelAnimationFrame(raf); try { V.pause(); V.removeAttribute('src'); V.load(); } catch (e) { } } };
  };
  addEventListener('resize', () => MT && MT.layout());
  const commitSeg = (id, a, b) => {
    change(() => { media(W(id)).billboard = [a, b]; }, { render: false });
    const f = $(`.feat .fs[data-id="${cs(id)}"]`); if (f) { f.dataset.a = a; f.dataset.b = b; if (f.classList.contains('on') && PF.Feat.video) PF.Feat.video.currentTime = a; }
  };

  // 썸네일 만들기: 카드(16:9, 비율이 다르면 블러 채움) · 포스터(원본 비율)
  const grab = (src, t) => new Promise((res, rej) => {
    const x = document.createElement('video'); x.muted = true; x.playsInline = true; x.preload = 'auto'; const to = setTimeout(() => rej(new Error('timeout')), 20000);
    const ready = () => { clearTimeout(to); requestAnimationFrame(() => res(x)); };
    x.addEventListener('loadedmetadata', () => { x.currentTime = Math.min(t, Math.max(0, x.duration - .05)); }, { once: true });
    x.addEventListener('seeked', () => { if (x.readyState >= 2) ready(); else x.addEventListener('loadeddata', ready, { once: true }); }, { once: true });
    x.addEventListener('error', () => { clearTimeout(to); rej(new Error('load')); }, { once: true });
    x.src = src;
  });
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const blurOK = (() => { try { const g = canvas(1, 1).getContext('2d'); g.filter = 'blur(2px)'; return g.filter === 'blur(2px)'; } catch (e) { return false; } })();
  const compose16 = (src, sw, sh) => {
    const Wd = 1280, Hd = 720, c = canvas(Wd, Hd), g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    if (Math.abs(sw / sh - 16 / 9) < .03) { g.drawImage(src, 0, 0, Wd, Hd); return c; }
    const cv = Math.max(Wd / sw, Hd / sh) * 1.15, cw = sw * cv, ch = sh * cv;
    if (blurOK) { g.filter = 'blur(56px) brightness(.8) saturate(1.3)'; g.drawImage(src, (Wd - cw) / 2, (Hd - ch) / 2, cw, ch); g.filter = 'none'; }
    else { const t = canvas(48, 27), tg = t.getContext('2d'), s2 = Math.max(48 / sw, 27 / sh); tg.drawImage(src, (48 - sw * s2) / 2, (27 - sh * s2) / 2, sw * s2, sh * s2); g.drawImage(t, -24, -14, Wd + 48, Hd + 28); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 0, Wd, Hd); }
    const s = Math.min(Wd / sw, Hd / sh), dw = sw * s, dh = sh * s; g.drawImage(src, (Wd - dw) / 2, (Hd - dh) / 2, dw, dh); return c;
  };
  const native = (src, sw, sh) => { const s = Math.min(1, 1600 / Math.max(sw, sh)), c = canvas(Math.round(sw * s), Math.round(sh * s)); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c; };
  const makeImg = (id, kind, src, sw, sh) => new Promise(res => {
    const c = kind === 'w' ? compose16(src, sw, sh) : native(src, sw, sh);
    c.toBlob(b => {
      if (!b) return res(false);
      const p = `assets/poster/e/${id}${kind === 'w' ? '_w' : ''}_${Date.now().toString(36)}.jpg`;
      pend[p] = b; PF.S.blob[p] = URL.createObjectURL(b); IDB.put(p, b).catch(() => { });
      change(() => { const m = media(W(id)); if (kind === 'w') m.poster_w = p; else m.poster = p; }); res(true);
    }, 'image/jpeg', .88);
  });

  // 재생목록 전체
  const openLists = () => { killMT(); mode = { t: 'lists' }; drawLists(); openPanel(); markSel(); };
  const thumbs = ids => ids.filter(shown).slice(0, 3).map(id => `<img src="${esc(PF.url(wideSrc(W(id))))}" alt="">`).join('');
  const drawLists = () => {
    const bd0 = $('.bd', EI), top = bd0 && mode.t === 'lists' && EI.dataset.v === 'lists' ? bd0.scrollTop : 0; EI.dataset.v = 'lists';
    EI.innerHTML = head('<b>재생목록</b>') + `<div class="bd"><div class="sec tight"><button class="btn2 pri wide" data-newlist>${IC.plus}새 재생목록</button></div><div class="pls">${lists().map(({ k }) => {
      const ids = viewIds(k), n = ids.filter(shown).length, hid = isHidden(k), auto = k.startsWith('rows.') && !rowObj(k).ids, fixed = !k.startsWith('rows.');
      return `<div class="pli${hid ? ' hid' : ''}" data-k="${k}">${fixed ? '<span class="pin"></span>' : `<span class="gr" title="끌어서 순서 바꾸기">${IC.grip}</span>`}<div class="mos">${thumbs(ids)}</div><div class="tx"><b>${esc(listTitle(k))}</b><small>${n}개${auto ? ' · 자동' : ''}${hid ? ' · 숨김' : ''}</small></div>${k === 'feat' ? '' : `<button class="ib eye" data-hide="${k}" aria-label="${hid ? '홈에 보이기' : '홈에서 숨기기'}" title="${hid ? '홈에 보이기' : '홈에서 숨기기'}">${hid ? IC.eyeOff : IC.eye}</button>`}<span class="go">›</span></div>`;
    }).join('')}</div></div>`;
    $('.bd', EI).scrollTop = top;
  };
  // 재생목록 하나(유튜브 재생목록 편집처럼: 이름 · 작품 추가 · 끌어서 순서 · 빼기 · 숨김 · 삭제)
  const openList = k => { if (!validKey(k)) return; killMT(); mode = { t: 'list', k }; drawList(k); openPanel(); markSel(); };
  const drawList = k => {
    const bd0 = $('.bd', EI), top = bd0 && EI.dataset.v === 'list:' + k ? bd0.scrollTop : 0; EI.dataset.v = 'list:' + k;
    const ids = viewIds(k), auto = k.startsWith('rows.') && !rowObj(k).ids, hid = isHidden(k), ae = document.activeElement, focused = !!(ae && ae.classList && ae.classList.contains('ttl') && EI.contains(ae));
    const v = focused ? ae.value : listTitle(k);
    EI.innerHTML = head(`<input class="ttl" value="${esc(v)}" aria-label="재생목록 이름"${k === 'feat' ? ' readonly' : ''}>`, `${ids.filter(shown).length}개${auto ? ' · 자동 분류' : ''}${hid ? ' · 홈에서 숨김' : ''}`, true) + `<div class="bd">
<div class="sec tight row2"><button class="btn2 pri" data-pick>${IC.plus}작품 추가</button><span class="sp"></span>${k !== 'feat' ? `<button class="btn2" data-hide="${k}">${hid ? IC.eyeOff + '숨김 해제' : IC.eye + '홈에서 숨기기'}</button>` : ''}${k.startsWith('rows.') ? '<button class="btn2 dng" data-del>삭제</button>' : ''}</div>
<div class="pits">${ids.map((id, i) => { const w = W(id); if (!w || isTool(w)) return ''; const off = !shown(id); return `<div class="pit${off ? ' off' : ''}" data-id="${esc(id)}"><span class="gr">${IC.grip}</span><span class="n">${i + 1}</span><span class="im"><img src="${esc(PF.url(wideSrc(w)))}" alt="" loading="lazy"></span><div class="tx"><b>${esc(w.title)}</b><small>${esc(w.type || '')}${off ? ' · 숨김' : ''}</small></div><button class="ib" data-rm="${esc(id)}" aria-label="빼기" title="빼기">${IC.x}</button></div>`; }).join('') || '<p class="emp">비어 있어요</p>'}</div></div>`;
    $('.bd', EI).scrollTop = top;
    const t = $('.ttl', EI); if (k === 'feat') return; let pre = null;
    if (focused) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
    t.addEventListener('focus', () => { pre = snap(); });
    t.addEventListener('input', () => { const v2 = t.value.replace(/\s+/g, ' ').trim(); if (!v2) return; setTitle(k, v2); PF.setData(cur()); const h = $(`.rows .row[data-row="${k}"] .hd h2`); if (h) h.textContent = v2; });
    t.addEventListener('blur', () => { if (!t.value.trim()) t.value = listTitle(k); if (pre && snap() !== pre) { pushUndo(pre); queueSave(); } pre = null; });
    t.addEventListener('keydown', e => { if (e.key === 'Enter') t.blur(); if (e.key === 'Escape') { e.stopPropagation(); if (pre) { PF.setData(JSON.parse(pre)); t.value = listTitle(k); const h = $(`.rows .row[data-row="${k}"] .hd h2`); if (h) h.textContent = t.value; pre = null; } t.blur(); } });
  };
  const newList = () => { let k = ''; change(S => { (S.H.rows = S.H.rows || []).push({ title: '새 재생목록', ids: [] }); k = `rows.${S.H.rows.length - 1}`; }); openList(k); setTimeout(() => { const t = $('.ttl', EI); if (t) { t.focus(); t.select(); } }, 40); };
  const toggleHidden = k => change(S => { if (k === 'rep') { if (S.H.repHidden) delete S.H.repHidden; else S.H.repHidden = true; } else { const r = rowObj(k); if (r.hidden) delete r.hidden; else r.hidden = true; } });

  // 여러 작품 고르기(체크한 순서대로 번호)
  const multiPick = ({ title, ids, ok, onDone }) => {
    const pool = PF.S.all.filter(w => !isTool(w) && PF.posterOf(w)); const chosen = ids.filter(id => pool.some(w => w.id === id)); const first = chosen.slice(); let kind = '';
    const kinds = Object.keys(KINDS).filter(k => k !== 'tools' && pool.some(w => (w.kinds || []).includes(k)));
    const m = modal(`<div class="mph"><h3>${esc(title)}</h3><input type="search" placeholder="제목·종류 검색" aria-label="검색"></div><div class="kf">${['', ...kinds].map(k => `<button data-kf="${k}" aria-pressed="${!k}">${k ? KINDS[k] : '전체'}</button>`).join('')}</div><div class="mpg"></div><div class="mpf"><span class="cnt"></span><span class="sp"></span><button class="btn2" data-x>취소</button><button class="btn2 pri" data-ok>완료</button></div>`, 'wide mp');
    const q = $('input', m), grid = $('.mpg', m);
    const marks = () => { $$('.mpi', grid).forEach(b => { const i = chosen.indexOf(b.dataset.id); b.classList.toggle('on', i >= 0); $('.ck', b).textContent = i >= 0 ? i + 1 : ''; }); $('.cnt', m).textContent = `${chosen.length}개 선택`; };
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      grid.innerHTML = pool.filter(w => (!kind || (w.kinds || []).includes(kind)) && (!s || `${w.title} ${w.type || ''}`.toLowerCase().includes(s))).map(w => { const why = ok ? ok(w) : null; return `<button class="mpi" data-id="${esc(w.id)}"${why ? ' disabled' : ''}><span class="im"><img src="${esc(PF.url(wideSrc(w)))}" alt="" loading="lazy"><i class="ck"></i></span><b>${esc(w.title)}</b><small>${why ? esc(why) : esc(w.type || '')}${(w.grade ?? 3) > 2 ? ' · 숨김' : ''}</small></button>`; }).join('') || '<p class="emp">없어요</p>';
      marks();
    };
    grid.addEventListener('click', e => { const b = e.target.closest('.mpi'); if (!b || b.disabled) return; const i = chosen.indexOf(b.dataset.id); i >= 0 ? chosen.splice(i, 1) : chosen.push(b.dataset.id); marks(); });
    $('.kf', m).addEventListener('click', e => { const b = e.target.closest('[data-kf]'); if (!b) return; kind = b.dataset.kf; $$('[data-kf]', m).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); });
    q.addEventListener('input', draw); q.addEventListener('keydown', e => { if (e.key === 'Enter') $('[data-ok]', m).click(); });
    $('[data-ok]', m).onclick = () => { m.close(); if (!same(chosen, first)) onDone(chosen.slice()); };
    draw(); setTimeout(() => q.focus(), 30);
  };
  const pickFor = k => {
    if (!validKey(k)) return; const before = viewIds(k).slice();
    multiPick({ title: `${listTitle(k)} — 작품 고르기`, ids: before, ok: k === 'feat' ? (w => PF.feVideo(w) ? null : '영상 없음') : null,
      onDone: ids => { change(() => { const a = keyIds(k); a.splice(0, a.length, ...ids); unhide(ids.filter(id => !before.includes(id))); }); if (!mode || mode.t !== 'work') openList(k); } });
  };

  // 패널 안 클릭·체크
  EI.addEventListener('click', e => {
    if (Date.now() - justDragged < 120) return; const t = e.target;
    if (t.closest('.x')) return closePanel();
    if (t.closest('[data-back]')) return (mode.t === 'work' && mode.from && validKey(mode.from)) ? openList(mode.from) : openLists();
    if (t.closest('[data-newlist]')) return newList();
    const hb = t.closest('[data-hide]'); if (hb) { e.stopPropagation(); const k = hb.dataset.hide; toggleHidden(k); return toast(isHidden(k) ? `'${listTitle(k)}' 홈에서 숨김` : `'${listTitle(k)}' 홈에 보임`); }
    if (t.closest('[data-pick]')) return pickFor(mode.k);
    if (t.closest('[data-del]')) { const k = mode.k, name = listTitle(k); change(S => { S.H.rows.splice(ix(k), 1); }); openLists(); return toast(`'${name}' 재생목록을 삭제했어요`); }
    const rm = t.closest('[data-rm]'); if (rm && mode.t === 'list') { const k = mode.k; change(() => { const a = keyIds(k), i = a.indexOf(rm.dataset.rm); if (i >= 0) a.splice(i, 1); }); return toast(`'${listTitle(k)}'에서 뺐어요`); }
    const pli = t.closest('.pli'); if (pli) return openList(pli.dataset.k);
    const pit = t.closest('.pit'); if (pit) return select(pit.dataset.id, mode.k);
    const g = t.closest('[data-g]'); if (g && mode.t === 'work') return change(() => { W(mode.id).grade = +g.dataset.g; });
    if (t.closest('.pv') && mode.t === 'work' && PF.Theater) return PF.Theater.open(mode.id, { queue: [mode.id], autoplay: true });
  });
  EI.addEventListener('change', e => {
    const c = e.target.closest('input[type=checkbox][data-k]');
    if (c && mode && mode.t === 'work') { const k = c.dataset.k, id = mode.id, on = c.checked; change(() => { const a = keyIds(k), i = a.indexOf(id); if (on && i < 0) { a.push(id); unhide([id]); } if (!on && i >= 0) a.splice(i, 1); }); return; }
    const up = e.target.closest('input[type=file][data-up]');
    if (up && mode && mode.t === 'work') { const f = up.files[0], id = mode.id; if (!f) return; const im = new Image(); im.onload = () => makeImg(id, up.dataset.up, im, im.naturalWidth, im.naturalHeight).then(() => URL.revokeObjectURL(im.src)); im.src = URL.createObjectURL(f); }
  });
  $('.pl', bar).addEventListener('click', () => (mode && mode.t === 'lists') ? closePanel() : openLists());
  addEventListener('keydown', e => {
    const ae = document.activeElement, typing = ae && (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z' && !typing && !$('.emodal')) { e.preventDefault(); (e.shiftKey ? rB : uB).click(); return; }
    if (e.key === 'Escape' && !typing && !$('.emodal') && !$('.theater.on') && mode) closePanel();
  });

  /* ---------- 시작: 보관된 이미지·초안 복원 → 최신 원본(연결 시) 위에 다시 얹기 ---------- */
  (async () => {
    cnB.hidden = !!token; status('busy', '불러오는 중…');
    try { for (const k of await IDB.keys()) { const b = await IDB.get(k); if (b) { pend[k] = b; PF.S.blob[k] = URL.createObjectURL(b); } } } catch (e) { }
    let draft = null; try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) { }
    if (token) await loadLatest();
    if (draft && draft.base && draft.cur) { const d = diff(draft.base, draft.cur); if (!empty(d)) PF.setData(merge(cur(), d)); }
    rerender(); persist(); if (token && nChanged()) queueSave(); else idle();
  })();
})();
