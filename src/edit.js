/* HANSY portfolio — 편집 모드 (/edit/)
   사이트 화면 그대로: 끌어서 순서 바꾸기 · 글자 바로 고치기 · 피처드 구간 트리머 · 썸네일 장면 고르기
   바뀌면 화면에 즉시 반영 → 1.5초 뒤 자동 저장(GitHub에 한 번의 커밋) → 약 1분 뒤 실제 사이트 반영
   실행 취소 Ctrl+Z · 다시 실행 Ctrl+Shift+Z */
(() => {
  'use strict';
  const PF = window.PF; if (!PF) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { esc, ico, KINDS } = PF;
  const GH = { owner: 'hansy-daangn', repo: 'pf', branch: 'main', api: 'https://api.github.com' };
  const TK = 'pf.gh', DRAFT = 'pf.draft';
  const clone = o => JSON.parse(JSON.stringify(o));
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  let token = localStorage.getItem(TK) || '';
  let base = { works: clone(PF.S.all), home: clone(PF.S.H) };   // 마지막으로 저장된 상태
  const files = {};          // 새 이미지: 경로 → base64
  const blobs = {};          // 새 이미지: 경로 → 화면용 objectURL
  const undo = [], redo = [];
  let saveT = null, saving = false, again = false;

  /* ---------- 편집 바 ---------- */
  const bar = document.createElement('div'); bar.className = 'eb';
  bar.innerHTML = `<b class="dot"></b><span class="lbl">편집 중</span><button class="u" title="실행 취소 (Ctrl+Z)">${ico('prev', 'sm')}되돌리기</button><button class="r" title="다시 실행 (Ctrl+Shift+Z)">다시${ico('next', 'sm')}</button><span class="st"></span><button class="cn" hidden>저장 연결</button><a href="design/" class="lk">디자인</a><a href="index.html" class="lk">사이트 보기 ↗</a>`;
  document.body.appendChild(bar);
  const stEl = $('.st', bar), cnB = $('.cn', bar);
  const status = (t, cls = '') => { stEl.textContent = t; bar.dataset.s = cls; };
  const refreshConn = () => { cnB.hidden = !!token; if (!token) status('저장하려면 GitHub 연결 필요', 'warn'); };

  /* ---------- 상태 변경: 기록 → 화면 → 저장 예약 ---------- */
  const snap = () => JSON.stringify({ works: PF.S.all, home: PF.S.H });
  const restore = s => { const o = JSON.parse(s); PF.setData({ works: o.works, home: o.home }); rerender(); queueSave(); };
  const change = (fn, { render = true } = {}) => {
    undo.push(snap()); if (undo.length > 100) undo.shift(); redo.length = 0;
    fn(PF.S); PF.setData({ works: PF.S.all, home: PF.S.H });
    if (render) rerender(); queueSave();
  };
  $('.u', bar).addEventListener('click', () => { if (!undo.length) return; redo.push(snap()); restore(undo.pop()); });
  $('.r', bar).addEventListener('click', () => { if (!redo.length) return; undo.push(snap()); restore(redo.pop()); });
  addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z' || document.activeElement.isContentEditable || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    e.preventDefault(); (e.shiftKey ? $('.r', bar) : $('.u', bar)).click();
  });
  const W = id => PF.S.all.find(w => w.id === id);
  const rerender = () => { const y = scrollY; PF.renderHome(); decorate(); scrollTo(0, y); };

  /* ---------- 저장: 바뀐 칸만 최신 원본 위에 얹어 커밋 ---------- */
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
  const merge = (remote, d) => {
    const works = clone(remote.works), home = clone(remote.home);
    Object.entries(d.works).forEach(([id, ch]) => {
      if (ch.__new) { if (!works.find(w => w.id === id)) works.push(ch.__new); return; }
      const w = works.find(x => x.id === id); if (!w) return;
      Object.entries(ch).forEach(([k, v]) => { if (k.startsWith('media.')) { w.media = w.media || {}; const m = k.slice(6); if (v === undefined) delete w.media[m]; else w.media[m] = v; } else if (v === undefined) delete w[k]; else w[k] = v; });
    });
    Object.entries(d.home).forEach(([k, v]) => { if (v === undefined) delete home[k]; else home[k] = v; });
    return { works, home };
  };
  const api = async (path, opt = {}) => {
    const r = await fetch(GH.api + path, { ...opt, headers: { Authorization: `Bearer ${token}`, Accept: opt.raw ? 'application/vnd.github.raw' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? { 'Content-Type': 'application/json' } : {}) } });
    if (!r.ok) { const t = await r.text(); const err = new Error(`${r.status} ${t.slice(0, 160)}`); err.status = r.status; throw err; }
    return opt.raw ? r.text() : r.json();
  };
  const R = `/repos/${GH.owner}/${GH.repo}`;
  const remoteState = async sha => {
    const [works, home] = await Promise.all(['works', 'home'].map(f => api(`${R}/contents/data/${f}.json?ref=${sha}`, { raw: true }).then(JSON.parse)));
    return { works, home };
  };
  const b64 = s => btoa(unescape(encodeURIComponent(s)));
  const summary = d => { const n = Object.keys(d.works).map(id => (W(id) || {}).title || id); return `편집: ${[...n.slice(0, 3), ...Object.keys(d.home).map(k => ({ billboard: '피처드 순서', rep: '대표 작업 순서', rows: '줄 순서' })[k] || k)].join(', ')}${n.length > 3 ? ` 외 ${n.length - 3}건` : ''}`; };
  const save = async () => {
    if (saving) { again = true; return; }
    const d = diff(base, { works: PF.S.all, home: PF.S.H }); const imgs = Object.keys(files);
    if (!Object.keys(d.works).length && !Object.keys(d.home).length && !imgs.length) { status('저장됨', 'ok'); localStorage.removeItem(DRAFT); return; }
    if (!token) { refreshConn(); return; }
    saving = true; status('저장 중…', 'busy');
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const ref = await api(`${R}/git/ref/heads/${GH.branch}`); const head = ref.object.sha;
        const commit = await api(`${R}/git/commits/${head}`);
        const remote = await remoteState(head); const merged = merge(remote, d);
        const tree = [];
        const put = async (path, content, enc) => { const b = await api(`${R}/git/blobs`, { method: 'POST', body: JSON.stringify({ content, encoding: enc }) }); tree.push({ path, mode: '100644', type: 'blob', sha: b.sha }); };
        await put('data/works.json', JSON.stringify(merged.works, null, 1) + '\n', 'utf-8');
        await put('data/home.json', JSON.stringify(merged.home, null, 1) + '\n', 'utf-8');
        for (const p of imgs) await put(p, files[p], 'base64');
        const t = await api(`${R}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
        const c = await api(`${R}/git/commits`, { method: 'POST', body: JSON.stringify({ message: summary(d), tree: t.sha, parents: [head] }) });
        try { await api(`${R}/git/refs/heads/${GH.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha, force: false }) }); }
        catch (e) { if (e.status === 422 && attempt < 2) continue; throw e; }
        imgs.forEach(p => delete files[p]);
        const remoteChanged = !same(merged, merge(clone({ works: PF.S.all, home: PF.S.H }), { works: {}, home: {} }));
        base = clone(merged); if (remoteChanged) { PF.setData({ works: clone(merged.works), home: clone(merged.home) }); rerender(); }
        localStorage.removeItem(DRAFT);
        status('저장됨 · 사이트 반영까지 약 1분', 'ok'); break;
      }
    } catch (e) {
      status(e.status === 401 || e.status === 403 ? '연결이 만료됐어요 — 다시 연결' : '저장 실패 — 다시 시도', 'err');
      if (e.status === 401 || e.status === 403) { token = ''; localStorage.removeItem(TK); refreshConn(); }
      console.warn(e);
    } finally { saving = false; if (again) { again = false; queueSave(); } }
  };
  const queueSave = () => {
    try { localStorage.setItem(DRAFT, JSON.stringify({ base, cur: { works: PF.S.all, home: PF.S.H } })); } catch (e) { }
    status(token ? '저장 대기…' : '저장하려면 GitHub 연결 필요', token ? 'busy' : 'warn'); clearTimeout(saveT); saveT = setTimeout(save, 1500);
  };

  /* ---------- GitHub 연결(처음 한 번) ---------- */
  const modal = (html, cls = '') => { const m = document.createElement('div'); m.className = `emodal ${cls}`; m.innerHTML = `<div class="box" role="dialog">${html}</div>`; document.body.appendChild(m); m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); }); return m; };
  const connect = () => {
    const m = modal(`<h3>저장 연결 (처음 한 번)</h3><ol>
<li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub 토큰 만들기 ↗</a> 열기</li>
<li>Token name <b>pf-edit</b> · Expiration <b>1년</b></li>
<li>Repository access → <b>Only select repositories</b> → <b>hansy-daangn/pf</b></li>
<li>Permissions → Repository permissions → <b>Contents</b> → <b>Read and write</b></li>
<li>Generate token → 복사해서 아래에 붙여넣기</li></ol>
<input type="password" placeholder="github_pat_…" autocomplete="off"><p class="msg"></p><div class="row"><button class="btn" data-go>연결</button><button class="btn ghost" data-x>닫기</button></div>`);
    $('[data-go]', m).addEventListener('click', async () => {
      const v = $('input', m).value.trim(); if (!v) return; token = v; $('.msg', m).textContent = '확인 중…';
      try { const r = await api(R); if (!r.permissions || !r.permissions.push) throw new Error('권한 부족'); localStorage.setItem(TK, token); m.remove(); refreshConn(); await loadLatest(); queueSave(); }
      catch (e) { token = ''; $('.msg', m).textContent = '연결 실패 — 저장소·Contents 권한을 확인해 주세요'; }
    });
  };
  cnB.addEventListener('click', connect);

  /* ---------- 끌어서 순서 바꾸기 ---------- */
  const sortable = (box, itemSel, { axis = 'x', handle = null, onEnd }) => {
    box.addEventListener('pointerdown', e => {
      const item = e.target.closest(itemSel); if (!item || !box.contains(item) || e.button !== 0) return;
      if (handle && !e.target.closest(handle)) return; if (e.target.closest('[contenteditable="true"], .etools, input, select')) return;
      const sx = e.clientX, sy = e.clientY; let drag = false, ghost = null, ph = null; const items = () => $$(itemSel, box).filter(x => x.parentElement === item.parentElement);
      const from = items().indexOf(item);
      const move = ev => {
        if (!drag) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; drag = true; const r = item.getBoundingClientRect();
          ghost = item.cloneNode(true); ghost.classList.add('eghost'); Object.assign(ghost.style, { width: r.width + 'px', height: r.height + 'px', left: r.left + 'px', top: r.top + 'px' }); document.body.appendChild(ghost);
          ph = document.createElement('div'); ph.className = 'eph'; ph.style.width = r.width + 'px'; ph.style.height = r.height + 'px'; item.after(ph); item.classList.add('edragging'); item.style.display = 'none'; ghost.dataset.dx = sx - r.left; ghost.dataset.dy = sy - r.top; }
        ghost.style.left = (ev.clientX - ghost.dataset.dx) + 'px'; ghost.style.top = (ev.clientY - ghost.dataset.dy) + 'px';
        const others = items().filter(x => x !== item); let before = null;
        for (const o of others) { const r = o.getBoundingClientRect(); if (axis === 'x' ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2) { before = o; break; } }
        before ? before.before(ph) : (others.length ? others[others.length - 1].after(ph) : null);
        const sc = item.closest('.sc'); if (sc && axis === 'x') { const r = sc.getBoundingClientRect(); if (ev.clientX > r.right - 60) sc.scrollLeft += 12; if (ev.clientX < r.left + 60) sc.scrollLeft -= 12; }
      };
      const up = () => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up);
        if (!drag) return; const list = [...ph.parentElement.children].filter(x => x === ph || (x.matches(itemSel) && x !== item));
        const to = list.indexOf(ph); ghost.remove(); ph.remove(); item.style.display = ''; item.classList.remove('edragging');
        const block = ev => { ev.stopPropagation(); ev.preventDefault(); }; addEventListener('click', block, { capture: true, once: true }); setTimeout(() => removeEventListener('click', block, { capture: true }), 50);
        if (to !== from && to >= 0) onEnd(from, to);
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });
  };
  const moveIn = (arr, from, to) => { const [x] = arr.splice(from, 1); arr.splice(to, 0, x); return arr; };

  /* ---------- 글자 바로 고치기 ---------- */
  const inline = (el, get, set) => {
    if (!el || el.dataset.ei) return; el.dataset.ei = '1'; el.contentEditable = 'true'; el.spellcheck = false; el.classList.add('eedit');
    el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } if (e.key === 'Escape') { el.textContent = get(); el.blur(); } e.stopPropagation(); });
    el.addEventListener('blur', () => { const v = el.textContent.replace(/\s+/g, ' ').trim(); if (v && v !== get()) change(() => set(v), { render: false }); });
  };

  /* ---------- 줄 위 도구: 카드 빼기·더하기·썸네일 ---------- */
  const rowArr = key => { const H = PF.S.H; if (key === 'rep') return H.rep || (H.rep = []); const i = +key.split('.')[1]; const r = H.rows[i]; if (!r.ids) r.ids = PF.DATA.filter(w => (w.kinds || []).includes(r.kind)).map(w => w.id); return r.ids; };
  const picker = (title, onPick, exclude = []) => {
    const m = modal(`<h3>${esc(title)}</h3><input type="search" placeholder="검색"><div class="plist"></div>`, 'wide');
    const draw = () => { const q = $('input', m).value.trim().toLowerCase(); $('.plist', m).innerHTML = PF.S.all.filter(w => !exclude.includes(w.id) && (!q || (w.title + w.type).toLowerCase().includes(q))).map(w => `<button data-id="${esc(w.id)}"><img src="${esc(PF.url(PF.posterOf(w)))}" alt=""><b>${esc(w.title)}</b>${(w.grade ?? 3) > 2 ? '<small>숨김</small>' : ''}</button>`).join(''); };
    draw(); $('input', m).addEventListener('input', draw); $('input', m).focus();
    $('.plist', m).addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (!b) return; m.remove(); onPick(b.dataset.id); });
  };
  const decorateRows = () => {
    const rowsBox = $('.rows'); if (!rowsBox) return;
    $$('.row', rowsBox).forEach(row => {
      const key = row.dataset.row, sc = $('.sc', row), hd = $('.hd', row);
      if (key !== 'rep') { const hh = document.createElement('button'); hh.className = 'ehandle'; hh.title = '끌어서 줄 순서 바꾸기'; hh.textContent = '⠿'; hd.prepend(hh); inline($('h2', hd), () => $('h2', hd).textContent, v => { PF.S.H.rows[+key.split('.')[1]].title = v; }); }
      $$('.card', sc).forEach(c => {
        const id = c.dataset.id; const tools = document.createElement('div'); tools.className = 'etools';
        tools.innerHTML = `<button data-t="thumb" title="썸네일 고르기">썸네일</button><button data-t="x" title="이 줄에서 빼기">✕</button>`;
        $('.art', c).appendChild(tools);
        tools.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const t = e.target.closest('button'); if (!t) return;
          if (t.dataset.t === 'x') change(S => { const a = rowArr(key); const k = a.indexOf(id); if (k >= 0) a.splice(k, 1); });
          if (t.dataset.t === 'thumb') thumbPicker(id); });
        inline($('.t', c), () => W(id).title, v => { W(id).title = v; });
      });
      const add = document.createElement('button'); add.className = 'eadd'; add.innerHTML = '+'; add.title = '작품 더하기'; sc.appendChild(add);
      add.addEventListener('click', () => picker('이 줄에 더할 작품', id => change(S => { const w = W(id); if ((w.grade ?? 3) > 2) w.grade = 2; rowArr(key).push(id); }), rowArr(key).slice()));
      sortable(sc, '.card', { axis: 'x', onEnd: (f, t) => change(() => moveIn(rowArr(key), f, t)) });
    });
    const keys = () => $$('.row:not([data-row="rep"])', rowsBox).map(r => +r.dataset.row.split('.')[1]);
    sortable(rowsBox, '.row:not([data-row="rep"])', { axis: 'y', handle: '.ehandle', onEnd: (f, t) => { const k = keys(); change(S => moveIn(S.H.rows, k[f], k[t])); } });
  };

  /* ---------- 피처드: 순서 칩 · 구간 트리머 · 제목 ---------- */
  const decorateFeat = () => {
    const F = $('.feat'); if (!F) return; const box = $('.fbox', F); if (!box) return;
    const ids = (PF.S.H.billboard || []).slice();
    const strip = document.createElement('div'); strip.className = 'estrip';
    strip.innerHTML = `<span class="lb">피처드</span><div class="chips">${ids.map(id => { const w = W(id); return w ? `<div class="ech" data-id="${esc(id)}"><img src="${esc(PF.url(PF.posterOf(w)))}" alt=""><span>${esc(w.title.split(' — ')[0])}</span><button title="빼기">✕</button></div>` : ''; }).join('')}<button class="eadd sm" title="피처드에 더하기">+</button></div>`;
    F.appendChild(strip);
    $$('.ech', strip).forEach(ch => { $('button', ch).addEventListener('click', e => { e.stopPropagation(); change(S => { S.H.billboard = S.H.billboard.filter(x => x !== ch.dataset.id); }); }); ch.addEventListener('click', () => { const k = $$('.fs', F).findIndex(f => f.dataset.id === ch.dataset.id); if (k >= 0) PF.Feat.go(k); }); });
    $('.eadd', strip).addEventListener('click', () => picker('피처드에 더할 작품(영상 있는 것)', id => change(S => { (S.H.billboard = S.H.billboard || []).push(id); const w = W(id); if ((w.grade ?? 3) > 2) w.grade = 1; }), ids));
    sortable($('.chips', strip), '.ech', { axis: 'x', onEnd: (f, t) => change(S => moveIn(S.H.billboard, f, t)) });
    // 트리머
    const tr = document.createElement('div'); tr.className = 'etrim'; tr.innerHTML = `<div class="track"><div class="sel"><i class="h a"></i><i class="h b"></i></div><i class="ph"></i></div><div class="lab"><span class="ta"></span><span class="tt">피처드 구간 — 손잡이를 끌어 조절</span><span class="tb"></span></div>`;
    strip.before(tr);
    const place = () => { const fv = $('.fv', F), fr = F.getBoundingClientRect(), r = fv.getBoundingClientRect(); tr.style.width = r.width + 'px'; tr.style.marginLeft = (r.left - fr.left) + 'px'; };
    place(); addEventListener('resize', place);
    const track = $('.track', tr), sel = $('.sel', tr), phd = $('.ph', tr);
    let cur = null, a = 0, b = 8, dur = 8;
    const show = () => { sel.style.left = (a / dur * 100) + '%'; sel.style.width = ((b - a) / dur * 100) + '%'; $('.ta', tr).textContent = a.toFixed(1) + '초'; $('.tb', tr).textContent = b.toFixed(1) + '초'; };
    const sync = () => { const f = $$('.fs', F)[PF.Feat.i]; if (!f) return; cur = W(f.dataset.id); const v = PF.feVideo(cur); dur = (v && v.dur) || 8; [a, b] = PF.segOf(cur); show(); };
    F.addEventListener('pf:slide', sync); sync();
    const raf = () => { const v = PF.Feat.video; if (v && v.duration) phd.style.left = (v.currentTime / dur * 100) + '%'; requestAnimationFrame(raf); }; raf();
    $$('.h', tr).forEach(h => h.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); PF.Feat.hold('edit'); const which = h.classList.contains('a') ? 'a' : 'b'; const r = track.getBoundingClientRect();
      const mv = ev => { const t = Math.max(0, Math.min(dur, (ev.clientX - r.left) / r.width * dur)); if (which === 'a') a = Math.min(t, b - 1); else b = Math.max(t, a + 1); a = +a.toFixed(2); b = +b.toFixed(2); show(); const v = PF.Feat.video; if (v) v.currentTime = which === 'a' ? a : b; };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const f = $$('.fs', F)[PF.Feat.i]; f.dataset.a = a; f.dataset.b = b; const id = cur.id; change(() => { W(id).media.billboard = [a, b]; }, { render: false }); const v = PF.Feat.video; if (v) { v.currentTime = a; } PF.Feat.release('edit'); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    }));
    $$('.fx', F).forEach(fx => { const id = fx.dataset.id; inline($('h2', fx), () => W(id).title, v => { W(id).title = v; }); inline($('.one', fx), () => (W(id).copy || {}).one || '', v => { (W(id).copy = W(id).copy || {}).one = v; }); inline($('.k', fx), () => W(id).type || '', v => { W(id).type = v.replace(/ · \d{4}$/, ''); }); });
  };

  /* ---------- 썸네일 장면 고르기 ---------- */
  const thumbPicker = id => {
    const w = W(id), vs = PF.vidsOf(w);
    const m = modal(`<h3>썸네일 — ${esc(w.title)}</h3>${vs.length ? `<div class="tp"><div class="pv"><video muted playsinline preload="auto" crossorigin="anonymous"></video></div>
<div class="film"></div><input type="range" class="sl" min="0" max="1000" value="0"><div class="row"><select>${vs.map((v, i) => `<option value="${i}">${esc((v.label || '영상').split(' — ')[0])} (${v.w}×${v.h})</option>`).join('')}</select><span class="tm">0.0초</span><button class="btn ghost sm" data-s="-0.04">−1프레임</button><button class="btn ghost sm" data-s="0.04">+1프레임</button><span class="sp"></span><label class="btn ghost sm up">이미지 올리기<input type="file" accept="image/*" hidden></label><button class="btn" data-ok>이 장면으로</button></div></div>` : `<p>영상이 없는 작품 — 이미지를 올려 주세요</p><label class="btn up">이미지 올리기<input type="file" accept="image/*" hidden></label>`}`, 'wide');
    const setImg = (blob, wv, hv) => {
      const r = new FileReader(); r.onload = () => {
        const isWide = wv && hv && Math.abs(wv / hv - 16 / 9) < .04; const path = `assets/poster/e/${id}${isWide ? '_w' : ''}_${Date.now().toString(36)}.jpg`;
        files[path] = r.result.split(',')[1]; blobs[path] = URL.createObjectURL(blob);
        change(() => { const x = W(id); x.media = x.media || {}; if (isWide) x.media.poster_w = path; else x.media.poster = path; });
        m.remove();
      }; r.readAsDataURL(blob);
    };
    const toJpeg = (src, wv, hv) => { const c = document.createElement('canvas'); c.width = wv; c.height = hv; c.getContext('2d').drawImage(src, 0, 0, wv, hv); c.toBlob(b => setImg(b, wv, hv), 'image/jpeg', .9); };
    const up = $('input[type=file]', m); up && up.addEventListener('change', () => { const f = up.files[0]; if (!f) return; const im = new Image(); im.onload = () => toJpeg(im, im.naturalWidth, im.naturalHeight); im.src = URL.createObjectURL(f); });
    if (!vs.length) return;
    const V = $('video', m), film = $('.film', m), sl = $('.sl', m), sel = $('select', m); let v = vs[0];
    const loadV = i => { v = vs[+i]; V.src = PF.url(v.hd); film.innerHTML = ''; V.addEventListener('loadedmetadata', strip, { once: true }); };
    const strip = async () => {
      const n = 10, d = V.duration; const tmp = document.createElement('video'); tmp.muted = true; tmp.preload = 'auto'; tmp.src = V.src;
      await new Promise(r => tmp.addEventListener('loadeddata', r, { once: true }));
      for (let k = 0; k < n; k++) {
        const t = d * (k + .5) / n; await new Promise(r => { tmp.addEventListener('seeked', r, { once: true }); tmp.currentTime = t; });
        const c = document.createElement('canvas'); c.height = 72; c.width = Math.round(72 * tmp.videoWidth / tmp.videoHeight); c.getContext('2d').drawImage(tmp, 0, 0, c.width, c.height);
        const b = document.createElement('button'); b.appendChild(c); b.addEventListener('click', () => { V.currentTime = t; }); film.appendChild(b);
      }
      tmp.removeAttribute('src'); tmp.load();
    };
    sel.addEventListener('change', () => loadV(sel.value)); loadV(0);
    V.addEventListener('timeupdate', () => { if (V.duration) { sl.value = Math.round(V.currentTime / V.duration * 1000); $('.tm', m).textContent = V.currentTime.toFixed(2) + '초'; } });
    V.addEventListener('seeked', () => { if (V.duration) { sl.value = Math.round(V.currentTime / V.duration * 1000); $('.tm', m).textContent = V.currentTime.toFixed(2) + '초'; } });
    sl.addEventListener('input', () => { if (V.duration) V.currentTime = sl.value / 1000 * V.duration; });
    $$('[data-s]', m).forEach(b => b.addEventListener('click', () => { V.pause(); V.currentTime = Math.max(0, V.currentTime + +b.dataset.s); }));
    V.addEventListener('click', () => V.paused ? V.play() : V.pause());
    $('[data-ok]', m).addEventListener('click', () => { if (!V.videoWidth) return; V.pause(); toJpeg(V, V.videoWidth, V.videoHeight); });
  };

  /* ---------- 상영관: 정보 바로 고치기 + 장면 버튼 ---------- */
  const T = $('.theater');
  const SPEC = { '종류': 'type', '툴': 'tools', '매체': 'channels', '길이': 'dur', '규격': 'formats', '시기': 'period', '기여도': 'contrib' };
  const decorateTheater = () => {
    const id = T.dataset.cur; const w = W(id); if (!w) return;
    inline($('.meta h1', T), () => w.title, v => { W(id).title = v; });
    const lead = $('.panel .lead', T); if (lead) inline(lead, () => (w.copy || {}).one || '', v => { (W(id).copy = W(id).copy || {}).one = v; });
    $$('.panel .spec span', T).forEach(s => { const k = SPEC[s.textContent]; const b = s.nextElementSibling; if (!k || !b) return; const arr = Array.isArray(w[k]); inline(b, () => arr ? (W(id)[k] || []).join(' · ') : (W(id)[k] || ''), v => { W(id)[k] = arr ? v.split('·').map(x => x.trim()).filter(Boolean) : v; }); });
    let tb = $('.etb', T); if (!tb) { tb = document.createElement('div'); tb.className = 'etb'; $('.ctl', T).after(tb); }
    const g = w.grade ?? 3; const inF = (PF.S.H.billboard || []).includes(id), inR = (PF.S.H.rep || []).includes(id);
    tb.innerHTML = `<button data-a="hover">호버 시작 = 지금</button><button data-a="thumb">썸네일 고르기</button><button data-a="feat">${inF ? '피처드에서 빼기' : '피처드에 넣기'}</button><button data-a="rep">${inR ? '대표 작업에서 빼기' : '대표 작업에 넣기'}</button><span class="sp"></span><span>노출</span><button data-g="1" aria-pressed="${g === 1}">대표</button><button data-g="2" aria-pressed="${g === 2}">일반</button><button data-g="3" aria-pressed="${g >= 3}">숨김</button><span class="msg"></span>`;
    tb.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const V = $('.vw video', T);
      if (b.dataset.a === 'hover') { if (!V) return; const t = +V.currentTime.toFixed(2); change(() => { W(id).media.start = t; }, { render: false }); $('.msg', tb).textContent = `호버 시작 ${t}초`; }
      if (b.dataset.a === 'thumb') thumbPicker(id);
      if (b.dataset.a === 'feat') change(S => { S.H.billboard = inF ? S.H.billboard.filter(x => x !== id) : [...(S.H.billboard || []), id]; });
      if (b.dataset.a === 'rep') change(S => { S.H.rep = inR ? S.H.rep.filter(x => x !== id) : [...(S.H.rep || []), id]; });
      if (b.dataset.g) change(() => { W(id).grade = +b.dataset.g; });
      decorateTheater();
    };
  };
  new MutationObserver(() => { if (T.classList.contains('on')) setTimeout(decorateTheater, 50); }).observe(T, { attributes: true, attributeFilter: ['data-cur', 'class'] });

  document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('.feat, .rows')) e.preventDefault(); });
  /* ---------- 화면에 편집 손잡이 붙이기 ---------- */
  const swapBlobs = () => $$('img').forEach(im => { const s = im.getAttribute('src') || ''; const k = Object.keys(blobs).find(p => s.endsWith(p)); if (k) im.src = blobs[k]; });
  const decorate = () => { decorateFeat(); decorateRows(); swapBlobs(); };

  /* ---------- 시작: 최신 원본을 GitHub에서 읽고, 저장 안 된 초안이 있으면 이어서 ---------- */
  const loadLatest = async () => {
    if (!token) return;
    try { const ref = await api(`${R}/git/ref/heads/${GH.branch}`); const remote = await remoteState(ref.object.sha); base = clone(remote); PF.setData({ works: clone(remote.works), home: clone(remote.home) }); }
    catch (e) { if (e.status === 401 || e.status === 403) { token = ''; localStorage.removeItem(TK); } }
  };
  (async () => {
    refreshConn(); status(token ? '최신 내용 불러오는 중…' : '저장하려면 GitHub 연결 필요', token ? 'busy' : 'warn');
    await loadLatest();
    try { const d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); if (d && d.cur && !same(d.cur, { works: PF.S.all, home: PF.S.H })) { const dd = diff(d.base, d.cur); const m = merge({ works: PF.S.all, home: PF.S.H }, dd); PF.setData({ works: m.works, home: m.home }); queueSave(); } else if (token) status('저장됨', 'ok'); } catch (e) { }
    rerender();
  })();
})();
