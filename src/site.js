/* HANSY portfolio — site.js (vanilla, 외부 의존 없음)
   데이터 한 곳: data/works·home·design·derived.json → 홈(피처드·줄)·작업 그리드를 이 파일이 그림
   순서: 공통 → 데이터 → 디자인 → 그리기 → 확장 카드 → 줄 화살표 → 피처드 → 상영관 → 작업 목록 → 도구 → 시작 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SAVE = !!(navigator.connection && navigator.connection.saveData);
  const HOVER = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const EDIT = document.body.dataset.edit === '1';
  const KINDS = { '3d': '3D 영상', ai: 'AI 영상', motion: '모션 영상', owned: '온드 콘텐츠', image: '이미지 소재', personal: '개인 작업', tools: '도구 · 자동화' };
  const BASE = document.body.dataset.base || './';
  const url = p => (!p ? '' : S.blob[p] ? S.blob[p] : /^(https?:|data:|blob:)/.test(p) ? p : BASE + p);   // S.blob: 편집기에서 아직 올리지 않은 새 이미지
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nb = s => esc(s).split(' ').map(x => `<span class="nb">${x}</span>`).join(' ');
  const ico = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"></use></svg>`;
  const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const hist = { st: () => { try { return history.state; } catch (e) { return null; } }, push: (s, u) => { try { history.pushState(s, '', u); } catch (e) { } }, replace: (s, u) => { try { history.replaceState(s, '', u); } catch (e) { } } };
  const posterOf = w => (w.media && (w.media.poster || w.media.shot)) || '';
  const vidsOf = w => (w.media && w.media.videos) || [];
  const startOf = w => (w.media && +w.media.start) || 0;
  const pr = w => (typeof w.priority === 'number' ? w.priority : 999);
  const byPrio = (a, b) => pr(a) - pr(b) || (a.grade || 2) - (b.grade || 2) || (a.sort || 99) - (b.sort || 99);

  /* ---------- 데이터: 페이지에 들어 있는 것으로 바로 그리고, 최신 파일을 받아 바뀌었으면 다시 그림 ---------- */
  const S = { all: [], H: {}, D: { pick: {}, modules: {} }, X: {}, blob: {} };
  let DATA = [], MDATA = [], BY = {};
  const isTool = w => w.group === 'tools' || w.group === 'research';   // 도구는 도구 탭에서만
  const setData = blob => {
    if (blob.works) S.all = blob.works; if (blob.home) S.H = blob.home; if (blob.design) S.D = blob.design; if (blob.derived) S.X = blob.derived;
    DATA = S.all.filter(w => (w.grade ?? 3) <= 2 && posterOf(w)).sort(byPrio); MDATA = DATA.filter(w => !isTool(w)); BY = Object.fromEntries(S.all.map(w => [w.id, w]));
  };
  try { setData(JSON.parse($('#pf-data').textContent)); } catch (e) { }

  /* ---------- 디자인 모듈: 선택지는 body data-<키>="번호" · 슬라이더는 --<키> 변수 ---------- */
  const applyDesign = pick => {
    const M = S.D.modules || {};
    Object.entries(pick || {}).forEach(([k, v]) => { if (!M[k]) return; if (M[k].type === 'range') document.body.style.setProperty(`--${k}`, v + (M[k].unit || '')); else document.body.dataset[k] = v; });
    const P = { ...(S.D.pick || {}), ...(pick || {}) }, vm = document.querySelector('meta[name="viewport"]');   // 모바일: 데스크톱 화면을 비율 그대로 축소(편집 화면만 폰 폭)
    if (vm && !EDIT) vm.content = `width=${P.mvw || 1200}`;
    Auto.ui(); onSc();   // apswitch 스위치 보이기 · navhide 바뀌면 내비 바로 반영
    dispatchEvent(new Event('resize'));
  };
  let previewing = false;   // /design 미리보기 안에서는 저장된 값 대신 고르는 중인 값을 씀
  addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.pf === 'design') { previewing = true; applyDesign(e.data.pick); } });

  /* ---------- 영상 화질: 1080p(hd) · 720p(sd) ---------- */
  const slowNet = () => { const c = navigator.connection; return !!c && (/(^|-)[23]g$/.test(c.effectiveType || '') || (c.downlink > 0 && c.downlink < 2)); };   // P18: 느린 망이면 720p부터
  const big = () => !SAVE && !slowNet() && (!!document.fullscreenElement || innerWidth >= 900);
  const pickBig = v => (v.sd && !big()) ? v.sd : v.hd;
  const pickSmall = v => v.sd || v.hd;
  const freshVideo = (src, at, { loopTo = null, muted = true } = {}) => {
    const v = document.createElement('video');
    v.muted = muted; v.playsInline = true; v.preload = 'auto'; v.setAttribute('aria-hidden', 'true');
    v.addEventListener('loadedmetadata', () => { if (at > 0 && at < v.duration - .5) v.currentTime = at; }, { once: true });
    v.addEventListener('playing', () => v.classList.add('on'), { once: true });
    if (loopTo !== null) v.addEventListener('ended', () => { v.currentTime = loopTo; v.play().catch(() => { }); });
    if (!muted) { const p0 = v.play.bind(v); v.play = () => p0().catch(e => { if (e && e.name === 'NotAllowedError' && !v.muted) { v.muted = true; v.dispatchEvent(new CustomEvent('pf:automute', { bubbles: true })); return p0(); } throw e; }); }   // 소리 재생이 막히면 무음으로 이어 재생(P40)
    v.src = url(src);
    return v;
  };
  const killVideo = v => { if (!v) return; try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { } v.remove(); };

  /* ---------- 전역: 썸네일 페이드인 · 본문 바로가기 · 덮개 뒤 비활성 · 키보드 이동 · 소리 크기 맞춤 · 소리 상태 · 미리보기 자동 재생 ---------- */
  // P47 썸네일: 칸은 작품 평균색(cardHTML --c), 이미지가 도착하면 .in으로 페이드인 — 캡처 단계라 나중에 그려진 카드도 모두 잡음
  document.addEventListener('load', e => { const t = e.target; if (t.tagName === 'IMG' && t.parentElement && t.parentElement.matches('.card .art')) t.classList.add('in'); }, true);
  // P50 본문 바로가기: main으로 포커스(편집 화면 <base>에서도 같은 페이지 안으로)
  $$('.skip').forEach(a => a.addEventListener('click', e => { const m = $('#main'); if (!m) return; e.preventDefault(); m.tabIndex = -1; m.focus(); m.addEventListener('blur', () => m.removeAttribute('tabindex'), { once: true }); }));
  // P50 덮개(상영관·라이트박스·갤러리·검색 등): 열면 그 덮개 밖 전부 inert(탭 순서·화면 낭독에서 빠짐), 겹쳐 열면 맨 위 것 기준. 사용: PF.modal.open(el) / close(el)
  const Modal = (() => {
    const stack = [], mine = new Set();
    const sync = () => {
      mine.forEach(n => { n.inert = false; }); mine.clear();
      const top = stack[stack.length - 1]; if (!top || !top.isConnected) return;
      for (let n = top; n && n !== document.body && n.parentElement; n = n.parentElement)
        [...n.parentElement.children].forEach(s => { if (s !== n && !s.inert && !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(s.tagName)) { s.inert = true; mine.add(s); } });
    };
    return { open: el => { const i = stack.indexOf(el); if (i >= 0) stack.splice(i, 1); stack.push(el); sync(); }, close: el => { const i = stack.indexOf(el); if (i >= 0) { stack.splice(i, 1); sync(); } }, get top() { return stack[stack.length - 1] || null; } };
  })();
  // P49 키보드 이동(로빙 tabindex): 묶음마다 탭 정지 1개 + 방향키. x = 줄(←→, ↑↓ 위아래 줄의 같은 자리), grid = 2차원, y = 세로 목록(↑↓). Home/End = 처음·끝. 편집 화면은 끔
  const Rove = (() => {
    const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    const items = c => $$(c._rv.sel, c).filter(x => !x.closest('[hidden]') && x.getClientRects().length);
    const tab = (c, cur) => $$(c._rv.sel, c).forEach(x => { x.tabIndex = x === cur ? 0 : -1; });
    const sync = c => { const it = items(c); let cur = c._rv.cur; if (!it.includes(cur)) cur = it.find(x => x.getAttribute('aria-pressed') === 'true') || it[0] || null; c._rv.cur = cur; tab(c, cur); };
    const beh = () => RM ? 'auto' : 'smooth';
    const cx = r => r.left + r.width / 2;
    const reveal = (el, c) => {
      if (c._rv.mode === 'x') {   // 줄: 다 보이게 가로로 — 오른쪽으로 넘치면 그 카드가 마지막으로 다 보이는 첫 카드 위치(스냅 위치와 같음)
        const r = el.getBoundingClientRect(), s = c.getBoundingClientRect(), pad = parseFloat(getComputedStyle(c).scrollPaddingLeft) || 0, vl = s.left + pad, vr = s.right - pad;
        if (r.left < vl - 1) c.scrollBy({ left: r.left - vl, behavior: beh() });
        else if (r.right > vr + 1) { const need = r.right - vr, d = items(c).map(x => x.getBoundingClientRect().left - vl).filter(x => x >= need - 1); c.scrollBy({ left: d.length ? Math.min(...d) : need, behavior: beh() }); }
      }
      const b = (el.closest('.row') || el).getBoundingClientRect(), nav = $('.nav'), top = (nav ? nav.offsetHeight : 0) + 8, bot = innerHeight - 8;
      if (b.top < top) scrollBy({ top: b.top - top, behavior: beh() }); else if (b.bottom > bot) scrollBy({ top: Math.min(b.bottom - bot, b.top - top), behavior: beh() });
    };
    const nearest = (list, x) => list.reduce((a, b) => (!a || Math.abs(cx(b.getBoundingClientRect()) - x) < Math.abs(cx(a.getBoundingClientRect()) - x)) ? b : a, null);
    const vert = (c, el, d) => {   // 위아래 줄: 화면에서 같은 가로 위치에 가장 가까운 카드(그 줄에서 보이는 카드 우선)
      const all = c._rv.group ? $$('[data-rove="x"]', c._rv.group) : [c]; const x = cx(el.getBoundingClientRect());
      for (let k = all.indexOf(c) + d; k >= 0 && k < all.length; k += d) {
        const o = all[k], it = o._rv ? items(o) : []; if (!it.length) continue;
        const s = o.getBoundingClientRect(), seen = it.filter(i => { const r = i.getBoundingClientRect(); return r.left >= s.left - 1 && r.right <= s.right + 1; });
        return nearest(seen.length ? seen : it, x);
      }
      return null;
    };
    const line = (it, el, d) => {   // 그리드: 바로 위·아래 줄에서 같은 열에 가장 가까운 칸
      const r = el.getBoundingClientRect(), mid = r.top + r.height / 2;
      const c = it.map(i => [i, i.getBoundingClientRect()]).filter(([, q]) => d > 0 ? q.top > mid : q.bottom < mid); if (!c.length) return null;
      const t = d > 0 ? Math.min(...c.map(([, q]) => q.top)) : Math.max(...c.map(([, q]) => q.top));
      return nearest(c.filter(([, q]) => Math.abs(q.top - t) < 4).map(([i]) => i), cx(r));
    };
    const key = e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !KEYS.includes(e.key)) return;
      const c = e.currentTarget, o = c._rv; if (!o) return; const el = e.target.closest && e.target.closest(o.sel); if (!el || !c.contains(el)) return;
      const it = items(c), k = it.indexOf(el), h = e.key === 'ArrowLeft' || e.key === 'ArrowRight', dn = e.key === 'ArrowDown' ? 1 : -1; if (k < 0) return;
      let to = null;
      if (e.key === 'Home') to = it[0]; else if (e.key === 'End') to = it[it.length - 1];
      else if (o.mode === 'y') { if (h) return; to = it[k + dn]; }
      else if (h) to = it[k + (e.key === 'ArrowRight' ? 1 : -1)];
      else to = o.mode === 'x' ? vert(c, el, dn) : line(it, el, dn);
      if (!to) { if (h && o.mode === 'x') e.preventDefault(); return; }   // 줄 끝 ←→는 그대로 멈춤 · 맨 위·아래 줄의 ↑↓는 페이지 스크롤
      e.preventDefault(); to.focus({ preventScroll: true }); reveal(to, to.closest('[data-rove]') || c);
    };
    const focusin = e => { const c = e.currentTarget, o = c._rv; const el = o && e.target.closest && e.target.closest(o.sel); if (el && c.contains(el)) { o.cur = el; tab(c, el); } };
    const mount = (c, { sel = '.card[data-id]', mode = 'x', group = null } = {}) => {
      if (!c || EDIT) return;
      if (c._rv && c._rv.mo) c._rv.mo.disconnect();
      c._rv = { sel, mode, group, cur: c._rv && c._rv.cur && c.contains(c._rv.cur) ? c._rv.cur : null }; c.dataset.rove = mode;
      if (!c._rvOn) { c.addEventListener('keydown', key); c.addEventListener('focusin', focusin); c._rvOn = true; }
      const o = c._rv; o.mo = new MutationObserver(() => { cancelAnimationFrame(o.raf); o.raf = requestAnimationFrame(() => sync(c)); });
      o.mo.observe(c, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] }); sync(c);
    };
    return { mount, sync };
  })();
  // P48 작품 간 소리 크기 맞춤: 빌드가 잰 음량(derived lu: [LUFS, dBTP])으로 재생 때 게인을 줌 — 영상 파일은 그대로(재인코딩 없음)
  //  같은 출처 영상은 Web Audio 게인(조용한 작품은 키우고 큰 작품은 줄임, 키울 땐 트루 피크 −1dBTP까지만 → 찌그러짐 없음).
  //  Web Audio를 못 쓰는 경우(첫 사용자 동작 전·다른 출처·옛 iOS)는 줄이기만 element.volume으로. 무음 영상은 손대지 않음
  const Loud = (() => {
    const TARGET = -16, CEIL = -1, MAXB = 12, AC = window.AudioContext || window.webkitAudioContext;
    const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const WA = !!AC && (!IOS || 'audioSession' in navigator);   // 옛 iOS는 Web Audio가 무음 스위치를 따라 소리가 꺼질 수 있어 제외
    let ctx = null, map = null, mapX = null, idleT = null, xo = false;
    const nodes = new Map(), fb = new WeakMap();
    const table = () => {
      if (map && mapX === S.X) return map; map = {}; mapX = S.X;
      const abs = p => { try { return new URL(url(p), document.baseURI).href; } catch (e) { return p; } };
      S.all.forEach(w => { const lu = (S.X[w.id] || {}).lu; if (lu) vidsOf(w).forEach(v => { const m = lu[v.hd]; if (m) [v.hd, v.sd].forEach(p => { if (p) map[abs(p)] = m; }); }); });
      xo = S.all.some(w => vidsOf(w).some(v => [v.hd, v.sd].some(p => p && /^https?:/i.test(p) && !p.startsWith(location.origin))));   // 영상을 다른 출처(R2 등)로 옮기면 Web Audio를 끔(CORS 없이 연결하면 무음) → 줄이기만
      return map;
    };
    const dbOf = el => { const m = table()[el.currentSrc || el.src]; if (!m) return 0; const want = TARGET - m[0]; return want <= 0 ? want : Math.max(0, Math.min(want, CEIL - m[1], MAXB)); };
    const same = el => { try { return new URL(el.currentSrc || el.src).origin === location.origin || !!el.crossOrigin; } catch (e) { return false; } };
    const active = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;
    const idle = () => { clearTimeout(idleT); idleT = setTimeout(() => { if (ctx && ctx.state === 'running' && ![...nodes.keys()].some(v => !v.paused)) ctx.suspend().catch(() => { }); }, 15000); };
    const apply = el => {
      if (!el || el.tagName !== 'VIDEO') return;
      const db = dbOf(el), n = nodes.get(el);
      if (n) { n.g.gain.setTargetAtTime(10 ** (db / 20), ctx.currentTime, .02); if (!el.paused && ctx.state !== 'running') ctx.resume().catch(() => { }); return; }
      if (el.muted || !db) { if (fb.has(el) && el.volume === fb.get(el)) { el.volume = 1; fb.delete(el); } return; }
      if (WA && !xo && same(el) && active()) {
        try { if (!ctx) { ctx = new AC({ latencyHint: 'playback' }); try { navigator.audioSession && (navigator.audioSession.type = 'playback'); } catch (e) { } ctx.addEventListener('statechange', () => { if (ctx.state === 'running') nodes.forEach((x, v) => apply(v)); }); } } catch (e) { ctx = null; }
        if (ctx && ctx.state === 'running') {
          const src = ctx.createMediaElementSource(el), g = ctx.createGain(); g.gain.value = 10 ** (db / 20); src.connect(g).connect(ctx.destination); nodes.set(el, { src, g });
          if (fb.has(el) && el.volume === fb.get(el)) el.volume = 1; fb.delete(el);
          el.addEventListener('emptied', () => { if (!el.isConnected) { try { src.disconnect(); g.disconnect(); } catch (e) { } nodes.delete(el); } });
          return;
        }
        if (ctx) ctx.resume().then(() => apply(el)).catch(() => { });
      }
      if (db < 0 && (!fb.has(el) || el.volume === fb.get(el))) { const v = 10 ** (db / 20); el.volume = v; fb.set(el, el.volume); }   // 키우지 못할 때도 큰 작품은 줄임
    };
    ['play', 'playing', 'volumechange', 'loadedmetadata'].forEach(t => document.addEventListener(t, e => apply(e.target), true));
    ['pause', 'ended'].forEach(t => document.addEventListener(t, e => { if (nodes.has(e.target)) idle(); }, true));
    const wake = () => { if (ctx && ctx.state !== 'running' && $$('video').some(v => !v.paused && !v.muted)) ctx.resume().catch(() => { }); };   // 사파리: 사용자 동작 안에서만 다시 켜짐
    ['pointerdown', 'keydown'].forEach(t => addEventListener(t, wake, true));
    return { apply, dbOf, info: el => ({ db: +dbOf(el).toFixed(2), wa: nodes.has(el), state: ctx ? ctx.state : 'none', vol: el.volume }) };
  })();
  // P40 소리 상태(sound): 1 따로(지금 — 피처드·확장 카드는 늘 무음 시작, 상영관만 세션 기억) · 2 피처드·상영관 공유 · 3 확장 카드까지
  //  값은 하나(sessionStorage pf.muted: '1' 끔 · '0' 켬 · 없음) — 상영관 기본은 소리 켬, 피처드·확장 카드는 '0'일 때만 소리
  const Snd = {
    get: () => { try { return sessionStorage.getItem('pf.muted'); } catch (e) { return null; } },
    set: m => { try { sessionStorage.setItem('pf.muted', m ? '1' : '0'); } catch (e) { } },
    feat: () => dm('sound') < 2 || Snd.get() !== '0',   // 피처드를 무음으로 시작?
    pop: () => dm('sound') < 3 || Snd.get() !== '0',    // 확장 카드를 무음으로?
    theater: () => Snd.get() === '1',
    lock: false,
    featSync: () => {   // 피처드 소리 버튼을 공유 상태에 맞춤(저장은 안 함)
      const snd = $('.feat .snd'); if (dm('sound') < 2 || !snd) return;
      if ((snd.getAttribute('aria-label') === '소리 켜기') !== Snd.feat()) { Snd.lock = true; snd.click(); Snd.lock = false; }
    },
    closed: v => { if (dm('sound') < 2) return; if (v && v.currentSrc) Snd.set(v.muted); Snd.featSync(); },   // 상영관을 닫을 때: 그 소리 상태를 피처드로
  };
  // P39 미리보기 자동 재생(apswitch): 1 없음(지금) · 2 푸터 스위치 · 3 내비 아이콘 — 끄면 피처드는 정지 화면 + 재생 버튼, 확장 카드는 그림만(브라우저에 기억 localStorage pf.auto)
  const Auto = {
    on: () => { if (dm('apswitch') < 2) return true; try { return localStorage.getItem('pf.auto') !== '0'; } catch (e) { return true; } },
    ui: () => {
      const m = dm('apswitch'); $$('.aps').forEach(b => { b.hidden = !((m === 2 && b.classList.contains('f')) || (m === 3 && b.classList.contains('n'))); b.setAttribute('aria-checked', String(Auto.on())); });
      const pp = $('.feat .pp'); if (!Auto.on() && pp && pp.getAttribute('aria-label') !== '재생') pp.click();   // 꺼 둔 방문자에게 스위치가 새로 생기면(디자인 변경) 피처드도 멈춤
    },
    set: on => {
      try { localStorage.setItem('pf.auto', on ? '1' : '0'); } catch (e) { } Auto.ui();
      const pp = $('.feat .pp'); if (pp && (pp.getAttribute('aria-label') === '재생') === on) pp.click();   // 피처드: 끄면 일시정지 상태로, 켜면 다시 재생
    },
  };
  $$('.aps').forEach(b => b.addEventListener('click', () => Auto.set(!Auto.on())));
  const featMount = F => {   // 피처드 붙이기 — 자동 재생을 끈 방문자는 정지 상태(재생 버튼)로 시작 · 소리 공유(sound 2·3)
    const off = !Auto.on(); if (off) Feat.hold('auto');
    Feat.mount(F); const pp = $('.pp', F), snd = $('.snd', F), box = $('.fbox', F);
    if (off) for (let k = 0; k < 2 && pp && pp.getAttribute('aria-label') !== '재생'; k++) pp.click();
    Feat.release('auto');
    if (!snd || !box) return;
    if (!Snd.feat()) { snd.innerHTML = ico('vol', 'sm'); snd.setAttribute('aria-label', '소리 끄기'); }
    snd.addEventListener('click', () => { if (dm('sound') > 1 && !Snd.lock) Snd.set(snd.getAttribute('aria-label') === '소리 켜기'); });
    box.addEventListener('pf:automute', () => { if (snd.getAttribute('aria-label') === '소리 끄기') { Snd.lock = true; snd.click(); Snd.lock = false; } });   // 브라우저가 소리 재생을 막아 무음으로 바뀌면 버튼도(저장값은 유지)
  };

  /* ---------- 그리기: 파생 이미지는 지금 데이터와 같을 때만, 아니면 원본 + CSS 블러 채움 ---------- */
  const sigWide = w => { const m = w.media || {}; return `${m.poster_w || ''}|${posterOf(w)}|${m.poster_w_t ?? ''}`; };
  const feVideo = w => { const vs = vidsOf(w).filter(v => v.w && v.h); return vs.length ? vs.reduce((a, b) => (b.w / b.h > a.w / a.h ? b : a)) : null; };
  const segOf = w => { const v = feVideo(w), m = w.media || {}, dur = (v && v.dur) || 8; let [a, b] = m.billboard || [m.start || 0, (m.start || 0) + 8]; a = Math.max(0, Math.min(+a, dur - 1)); b = Math.min(+b, dur); if (b - a < 3 - 1e-6) b = Math.min(dur, a + 6); return [+a.toFixed(2), +b.toFixed(2)]; };
  const orientOf = w => { const x = S.X[w.id]; if (x && x.pw && x.ph && x.tall && x.tall.from === posterOf(w)) return x.ph / x.pw > 1.2 ? 'tall' : 'wide'; const v = vidsOf(w)[0]; return v && v.h / v.w > 1.2 ? 'tall' : 'wide'; };
  const thumbOf = (w, cls) => {
    const x = S.X[w.id] || {}, m = w.media || {};
    if (cls === 'wide') { if (x.wide && x.wide.from === sigWide(w)) return { src: x.wide.src, srcset: x.wide.srcset, c: x.wide.c }; if (m.poster_w) return { src: m.poster_w }; return { src: posterOf(w), fill: true }; }
    if (x.tall && x.tall.from === posterOf(w)) return { src: x.tall.src, srcset: x.tall.srcset, c: x.tall.c };
    return { src: posterOf(w) };
  };
  const cardHTML = (w, cls = 'wide') => {   // 16:9(세로 줄은 9:16) 칸 — 맞는 썸네일이 없으면 원본 + CSS 블러 채움
    const t = thumbOf(w, cls); const sizes = cls === 'wide' ? '(max-width:760px) 264px, 360px' : '(max-width:760px) 132px, 210px';
    const img = `<img src="${esc(url(t.src))}"${t.srcset ? ` srcset="${esc(t.srcset.split(', ').map(s => url(s.split(' ')[0]) + ' ' + s.split(' ')[1]).join(', '))}" sizes="${sizes}"` : ''} alt="" loading="lazy">`;
    return `<a class="card ${cls}${(w.group === 'tools' || w.group === 'research') ? ' ui' : ''}" href="?w=${esc(w.id)}" data-id="${esc(w.id)}"><div class="art${t.fill ? ' fill' : ''}"${/^#[0-9a-f]{6}$/i.test(t.c || '') ? ` style="--c:${t.c}"` : ''}>${t.fill ? `<img class="bg" src="${esc(url(t.src))}" alt="" loading="lazy">` : ''}${img}</div><div class="t">${esc(w.title)}</div><div class="s">${esc(w.type || w.subtitle || '')}</div></a>`;
  };
  const dm = k => EDIT ? 1 : +(document.body.dataset[k] || 1);   // 디자인 모듈 번호(편집 화면은 늘 1)
  const playable = w => !!(w && (vidsOf(w).length || (w.media && w.media.youtube)));
  const short = w => String(w.title).split(' — ')[0];
  const josa = s => { const c = String(s).trim().slice(-1), h = c.charCodeAt(0) - 0xAC00; return (h >= 0 && h < 11172) ? (h % 28 ? '과' : '와') : /[013678lmnLMN]/.test(c) ? '과' : '와'; };
  const becauseRow = () => {   // because: 방금 상영관에서 본 작품과 같은 분류·툴(세션 동안만)
    let id = null; try { id = sessionStorage.getItem('pf.because'); } catch (e) { }
    const w = id && BY[id]; if (!w || isTool(w)) return null;
    const ks = w.kinds || [], tl = x => (x.tools || []).map(t => String(t).split(' (')[0]), ts = tl(w);
    const items = MDATA.filter(x => x.id !== w.id && (x.kinds || []).some(k => ks.includes(k))).map(x => [x, (x.kinds || []).filter(k => ks.includes(k)).length * 2 + tl(x).filter(t => ts.includes(t)).length])
      .sort((a, b) => b[1] - a[1] || byPrio(a[0], b[0])).slice(0, 12).map(p => p[0]);
    return items.length >= 3 ? { key: 'because', of: w.id, title: `「${short(w)}」${josa(short(w))} 비슷한 작업`, items, cls: items.every(x => orientOf(x) === 'tall') ? 'tall' : 'wide', more: '' } : null;
  };
  const seriesOf = () => {   // series: 근거 있는 묶음만 — ① 한 작품 안에 이름이 서로 다른 영상 3편 이상(회차) ② 제목 「 — 」 앞이 같은 작품 2편 이상
    const isFmt = s => /^(\d+(\.\d+)?\s*[:×x]\s*\d+|배너|가로|세로|정방|영상)/.test(s), out = [];
    MDATA.forEach(w => { const vs = vidsOf(w), hd = vs.map(v => String(v.label || '').split(' — ')[0].trim());
      if (vs.length >= 3 && hd.every(h => h && !isFmt(h)) && new Set(hd).size === vs.length) out.push({ title: short(w), id: w.id, eps: vs.map((v, k) => ({ k, id: w.id, t: hd[k], s: String(v.label).split(' — ').slice(1).join(' — ').replace(/\s*·?\s*\d+초$/, ''), dur: v.dur, v, w })) }); });
    const g = {}; MDATA.forEach(w => { const p = String(w.title).split(' — '); if (p.length > 1 && feVideo(w)) (g[p[0]] = g[p[0]] || []).push(w); });
    Object.entries(g).filter(([, ws]) => ws.length >= 2).sort((a, b) => b[1].length - a[1].length).forEach(([t, ws]) => out.push({ title: t, eps: ws.map(w => { const v = feVideo(w); return { id: w.id, t: String(w.title).split(' — ').slice(1).join(' — '), s: w.type || '', dur: v.dur, v, w }; }) }));
    return out;
  };
  const rowList = () => {
    const H = S.H, rows = [], dd = dm('dedup'), seen = new Set();
    const ok = w => w && posterOf(w) && (w.grade ?? 3) <= 2 && !isTool(w);
    const rep = (H.rep || []).map(id => BY[id]).filter(ok);
    if (rep.length && !H.repHidden) rows.push({ key: 'rep', title: H.repTitle || '대표 작업', items: rep, cls: 'wide', more: 'works.html' });
    if (dd > 1) featItems().concat(rep).forEach(w => seen.add(w.id));   // dedup: 피처드·대표 작업에 이미 나온 작품
    (H.rows || []).forEach((r, i) => {
      if (r.hidden) return;
      let items = r.ids ? r.ids.map(id => BY[id]).filter(ok) : MDATA.filter(w => (w.kinds || []).includes(r.kind));
      if (dd > 1 && !r.ids) { const a = items.filter(w => !seen.has(w.id)); items = dd === 3 ? a : a.concat(items.filter(w => seen.has(w.id))); }   // 자동 분류 줄만(편집기로 고정한 줄은 그대로)
      if (!items.length) return;
      rows.push({ key: `rows.${i}`, title: r.title || KINDS[r.kind] || '', items, cls: items.every(w => orientOf(w) === 'tall') ? 'tall' : 'wide', more: r.more || (r.kind ? `works.html#${r.kind}` : 'works.html') });
    });
    if (EDIT) return rows;
    const top = [], sr = dm('series') > 1 ? seriesOf()[0] : null, bc = dm('because') > 1 ? becauseRow() : null;
    if (dm('hubs') > 1) top.push({ key: 'hubs', type: 'hubs' });   // 피처드 아래: 분류 바로가기 → 방금 본 작품 → 시리즈 → 대표 작업
    if (bc && dm('because') === 3) top.push(bc);
    if (sr && dm('series') === 3) top.push({ key: 'series', type: 'series', sr });
    if (sr && dm('series') === 2) rows.splice(Math.min(2, rows.length), 0, { key: 'series', type: 'series', sr });   // 2~3번째 줄 사이
    if (bc && dm('because') === 2) rows.splice(rows[0] && rows[0].key === 'rep' ? 1 : 0, 0, bc);   // 대표 작업 바로 아래
    return top.concat(rows);
  };
  const hubsHTML = () => {   // hubs: 분류 바로가기(2 타일 · 3 알약). 타일 그림은 피처드·대표 작업과 겹치지 않는 그 분류 첫 작품
    const used = new Set([...(S.H.billboard || []), ...(S.H.rep || [])]);
    const t = ['3d', 'ai', 'motion', 'owned', 'personal'].map(k => { const ws = MDATA.filter(w => (w.kinds || []).includes(k)); if (!ws.length) return '';
      const w = ws.find(x => !used.has(x.id)) || ws[0]; used.add(w.id); const th = thumbOf(w, 'wide');
      return `<a class="hub" href="works.html#${k}"><span class="ha${th.fill ? ' fill' : ''}">${th.fill ? `<img class="bg" src="${esc(url(th.src))}" alt="" loading="lazy">` : ''}<img src="${esc(url(th.src))}" alt="" loading="lazy"></span><b>${esc(KINDS[k])}</b><small class="num">${ws.length}</small></a>`; }).join('');
    return `<section class="row hubs" data-row="hubs" aria-label="분류"><div class="wrap"><nav class="hbx">${t}</nav></div></section>`;
  };
  const seriesHTML = r => {   // series: 왼쪽 큰 16:9(무음, 화면 안일 때만) + 오른쪽 회차 목록 — 회차 누르면 왼쪽 전환, 영상 누르면 상영관
    const s = r.sr, e0 = s.eps[0], p = posterOf(e0.w), tall = s.eps.every(e => e.v && e.v.h / e.v.w > 1.2);
    const li = s.eps.map((e, k) => `<li><button class="se${k ? '' : ' on'}" data-k="${k}"${k ? '' : ' aria-current="true"'}><span class="th${tall ? ' tl' : ''}">${e.k === undefined ? `<img src="${esc(url(thumbOf(e.w, 'wide').src))}" alt="" loading="lazy">` : ''}</span><span class="tx"><b>${esc(e.t)}</b>${e.s ? `<small>${esc(e.s)}</small>` : ''}</span><span class="du num">${e.dur ? fmtT(e.dur) : ''}</span><i class="pg"><i></i></i></button></li>`).join('');
    return `<section class="row series" data-row="series" aria-label="${esc(s.title)}"><div class="wrap"><div class="hd"><h2>${esc(s.title)}</h2></div><div class="sbx"><button class="sv" aria-label="${esc(s.title)} 재생"><span class="blur" style="background-image:url('${esc(url(p))}')"></span><img src="${esc(url(p))}" alt="" loading="lazy"></button><ol class="sl">${li}</ol></div></div></section>`;
  };
  const rowHTML = r => r.type === 'hubs' ? hubsHTML() : r.type === 'series' ? seriesHTML(r) : `<section class="row" data-queue data-row="${r.key}"${r.of ? ` data-of="${esc(r.of)}"` : ''}><div class="wrap"><div class="hd">${dm('more') > 1 && r.more ? `<h2><a href="${esc(moreHref(r))}" data-more>${esc(r.title)}</a></h2>` : `<h2>${esc(r.title)}</h2>`}${dm('playall') > 1 && r.items.filter(playable).length > 1 ? `<button class="pall" aria-label="모두 재생">${ico('play', 'sm')}<span>모두 재생</span></button>` : ''}${r.more ? `<a class="more" href="${esc(moreHref(r))}"${dm('more') > 1 ? ' data-more' : ''}>더보기</a>` : ''}<span class="pgi" aria-hidden="true"></span></div>
<div class="trk"><span class="arr"><button class="ar l" aria-label="이전" disabled>${ico('chev-l')}</button><button class="ar r" aria-label="다음">${ico('chev-r')}</button></span><div class="sc">${r.items.map(w => cardHTML(w, r.cls)).join('')}</div></div></div></section>`;
  const moreHref = r => dm('more') === 3 ? `works.html#row=${encodeURIComponent(r.key)}` : r.more;   // more 3: 작업 탭 + 그 줄만
  const FSEEN = (() => { try { return JSON.parse(localStorage.getItem('pf.featSeen') || '{}') || {}; } catch (e) { return {}; } })();   // 지난 방문 기록(이번 방문 동안은 고정)
  const featItems = () => {   // fstart 2: 지난번 마지막 작품의 다음부터 · 3: 끝까지 본 작품은 뒤로
    let a = (S.H.billboard || []).map(id => BY[id]).filter(w => w && feVideo(w) && !isTool(w) && (w.grade ?? 3) <= 2).slice(0, 8); const m = dm('fstart');
    if (m === 2 && FSEEN.last) { const k = a.findIndex(w => w.id === FSEEN.last); if (k >= 0) a = a.slice(k + 1).concat(a.slice(0, k + 1)); }
    if (m === 3 && (FSEEN.done || []).length) { const d = new Set(FSEEN.done), x = a.filter(w => !d.has(w.id)); if (x.length) a = x.concat(a.filter(w => d.has(w.id))); }
    return a;
  };
  const featHTML = items => {
    if (!items.length) return '';
    const frames = items.map((w, i) => { const v = feVideo(w), [a, b] = segOf(w), x = S.X[w.id] || {}; const p = (x.bb && x.bb.from === `${v.hd}@${a}`) ? x.bb.src : posterOf(w);
      return `<div class="fs${i ? '' : ' on'}" data-id="${esc(w.id)}" data-hd="${esc(v.hd)}" data-sd="${esc(v.sd || v.hd)}" data-a="${a}" data-b="${b}"><div class="blur" style="background-image:url('${esc(url(p))}')"></div><img src="${esc(url(p))}" alt=""${i ? ' loading="lazy"' : ' fetchpriority="high"'}></div>`; }).join('');
    const texts = items.map((w, i) => `<div class="fx${i ? '' : ' on'}"${i ? ' hidden' : ''} id="pf-fx${i}" role="tabpanel" aria-roledescription="slide" aria-label="${i + 1} / ${items.length}" data-id="${esc(w.id)}"><div class="k">${esc(w.type || '')}${w.year ? ' · ' + esc(w.year) : ''}</div><h2>${nb(w.title)}</h2>${w.copy && w.copy.one ? `<p class="one">${esc(w.copy.one)}</p>` : ''}
<div class="bt"><button class="btn" data-open="${esc(w.id)}">${ico('play', 'sm')} 재생</button><button class="btn ghost" data-info="${esc(w.id)}">상세 정보</button></div></div>`).join('');
    const dots = items.map((w, j) => `<button data-i="${j}" class="${j ? '' : 'on'}" role="tab" aria-selected="${!j}" tabindex="${j ? -1 : 0}" aria-controls="pf-fx${j}" aria-label="${esc(w.title.split(' — ')[0])}"><i></i></button>`).join('');
    return `<div class="fbox"><div class="fv">${frames}</div><div class="ft"><div class="fxs">${texts}</div><div class="fctl"><div class="fdots" role="tablist" aria-label="피처드 전환">${dots}</div><button class="pp" aria-label="일시정지">${ico('pause', 'sm')}</button><button class="snd" aria-label="소리 켜기">${ico('mute', 'sm')}</button></div></div></div>`;
  };
  const renderHome = () => {
    const F = $('.feat'), R = $('.rows'); if (!F || !R) return;
    Feat.unmount(); F.innerHTML = featHTML(featItems()); featMount(F);
    R.innerHTML = rowList().map(rowHTML).join(''); mountRows(R);
  };
  const renderRows = () => { const R = $('.rows'); if (!R) return; R.innerHTML = rowList().map(rowHTML).join(''); mountRows(R); };   // 편집기: 줄만 다시 그리기(피처드는 그대로 재생)

  /* ---------- 내비: 맨 위에선 투명, 스크롤하면 유리 배경 ---------- */
  //  navhide 2(P38): 아래로 8px 넘게 내리면 위로 숨고, 4px만 올려도 다시 나옴(맨 위 근처·내비 안 포커스면 늘 보임, 편집 화면은 1)
  const NAV = $('.nav'); let lastY = scrollY, run = 0;
  const onSc = () => {
    if (!NAV) return; const y = scrollY, d = y - lastY, nh = NAV.offsetHeight; lastY = y; NAV.classList.toggle('sc', y > 8);
    if (dm('navhide') < 2 || y <= nh) { run = 0; NAV.classList.remove('hide'); return; }
    run = (d > 0) === (run > 0) ? run + d : d;
    if (run > 8) NAV.classList.add('hide'); else if (run < -4) NAV.classList.remove('hide');
  };
  addEventListener('scroll', onSc, { passive: true }); onSc();

  /* ---------- 확장 카드(호버 → 원비율 영상) ----------
     포인터가 카드 위에서 멈춘(느려진) 뒤 0.5초에 열림 — 스치기만 하면 안 열림. 열려 있거나 막 닫혔으면(0.3초 안) 옆 카드는 0.15초
     기다리는 동안 그 720p 영상을 미리 받아 둠(열리자마자 재생) · popfmt: 규격 모양 아이콘 · popinfo: 한 줄 소개 / 툴·매체 칩 */
  const queueOf = card => { const c = card.closest('[data-queue]'); return c ? $$('.card[data-id]:not([hidden])', c).map(x => x.dataset.id).filter((v, i, a) => a.indexOf(v) === i) : [card.dataset.id]; };
  const Pop = (() => {
    const P = document.createElement('div'); P.className = 'pop'; P.setAttribute('aria-hidden', 'true'); P.inert = true;   // 숨어 있을 땐 읽기·포커스 제외, 보일 때만 풂
    P.innerHTML = `<div class="art"></div><div class="bd"><div class="t"></div><div class="sr"><div class="s"></div><span class="fm"></span></div><div class="x"></div><div class="bt"><button class="btn acc">${ico('play', 'sm')} 재생</button><button class="btn ghost">상세 정보</button></div></div>`;
    document.body.appendChild(P);
    const ART = $('.art', P), BD = $('.bd', P), FM = $('.fm', P), XI = $('.x', P); let cur = null, card = null, hideT = null, clrT = null, moT = null, V = null, pre = null, shut = -1e9, rc = null, vi = 0;
    const clear = () => { clearTimeout(clrT); killVideo(V); V = null; ART.innerHTML = ''; };
    const unwarm = id => { if (pre && (!id || pre.id === id)) { killVideo(pre.v); pre = null; } };
    const prewarm = w => { const v0 = vidsOf(w)[0]; if (RM || SAVE || !Auto.on() || !v0 || (pre && pre.id === w.id) || (cur && cur.id === w.id)) return; unwarm(); pre = { id: w.id, v: freshVideo(pickSmall(v0), startOf(w), { loopTo: startOf(w), muted: Snd.pop() }) }; };
    const warm = () => P.classList.contains('on') || performance.now() - shut < 300;
    const size = (r, aw, ah) => { const tall = ah / aw > 1.2, capH = innerHeight * (tall ? .5 : .46); let pw = Math.min(Math.max(r.width * 1.45, tall ? 0 : 320), innerWidth - 32); if (pw * ah / aw > capH) pw = capH * aw / ah; return Math.max(pw, tall ? 200 : 280); };
    let pg = null;   // 지금 놓인 자리(왼쪽·위·폭·영상 높이) — 규격 바꿀 때 기준
    const place = (r, pw, aw, ah, at) => {   // 카드 가운데 기준 · 화면 안으로 · 글 영역은 실제 높이로 (at: 정해 둔 자리)
      P.style.setProperty('--pw', pw + 'px'); P.style.setProperty('--pa', `${aw}/${ah}`); P.style.setProperty('--pop-r', (ah / aw).toFixed(4));
      const ph = pw * ah / aw + BD.offsetHeight; let left = r.left + r.width / 2 - pw / 2; left = Math.max(16, Math.min(left, innerWidth - pw - 16));
      let top = r.top + r.height / 2 - ph / 2; top = Math.max(64, Math.min(top, innerHeight - ph - 16)); if (at) ({ left, top } = at);
      P.style.left = left + 'px'; P.style.top = top + 'px'; pg = { left, top, pw, h: pw * ah / aw }; return { left, top };
    };
    const info = w => {   // popinfo 2: 한 줄 소개 · 3: 툴·매체 칩 한 줄
      const m = dm('popinfo'), c = w.copy || {}, chips = [...new Set([...(w.tools || []).map(t => String(t).split(' (')[0]), ...(w.channels || [])])];
      XI.innerHTML = m === 2 && c.one ? `<p class="one">${esc(c.one)}</p>` : m === 3 && chips.length ? `<div class="cps">${chips.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : '';
    };
    const fmts = w => {   // popfmt 2·3: 영상 규격(비율이 다른 것만)을 실제 비율 모양 아이콘으로
      const seen = new Set(), vs = vidsOf(w).map((v, k) => [v, k]).filter(([v]) => { const r = v.w && v.h ? (v.w / v.h).toFixed(2) : ''; if (!r || seen.has(r)) return false; seen.add(r); return true; });
      FM.innerHTML = dm('popfmt') > 1 && vs.length > 1 ? vs.map(([v, k]) => { const r = v.w / v.h, W = r >= 1 ? 16 : Math.round(16 * r), H = r >= 1 ? Math.round(16 / r) : 16; return `<button data-k="${k}" aria-pressed="${!k}" aria-label="${esc(String(v.label || '').split(' — ')[0])} 규격" style="--fw:${W}px;--fh:${H}px"><i></i></button>`; }).join('') : '';
    };
    const mark = () => $$('button', FM).forEach(b => b.setAttribute('aria-pressed', +b.dataset.k === vi));
    const play = v => {   // 영상 붙이고 진행 막대
      V = v; ART.appendChild(v); const bar = document.createElement('i'); bar.className = 'pb'; ART.appendChild(bar);
      v.addEventListener('timeupdate', () => { if (v.duration) bar.style.transform = `scaleX(${v.currentTime / v.duration})`; });
      v.play().catch(() => { });
    };
    const show = (c, w) => {
      clearTimeout(hideT); const again = P.classList.contains('on') || performance.now() - shut < 300; clear(); cur = w; card = c; vi = 0;
      const r = rc = ($('.art', c) || c).getBoundingClientRect(); const v0 = vidsOf(w)[0];
      const [aw, ah] = (v0 && v0.w && v0.h) ? [v0.w, v0.h] : c.classList.contains('tall') ? [9, 16] : [16, 9];
      const x = S.X[w.id]; const p = (x && x.hv && v0 && x.hv.from === `${v0.sd || v0.hd}@${startOf(w)}`) ? x.hv.src : posterOf(w);   // 호버 시작 초의 프레임 → 영상이 시작돼도 장면이 안 바뀜
      ART.innerHTML = `<div class="bgb" style="background-image:url('${esc(url(p))}')"></div><img alt="" src="${esc(url(p))}">`;
      $('.t', P).textContent = w.title; $('.s', P).textContent = [w.type, w.dur].filter(Boolean).join(' · '); info(w); fmts(w);
      if (again) P.classList.add('re'), P.classList.remove('on');   // 옆 카드로 바로 옮김: 새 카드 자리에서 다시 커짐(이전 카드 모양이 끌려오지 않게)
      const pw = size(r, aw, ah); P.style.setProperty('--s0', Math.min(1, r.width / pw).toFixed(3));   // 카드 크기 그대로에서 커지기 시작
      const { left, top } = place(r, pw, aw, ah); P.style.transformOrigin = `${r.left + r.width / 2 - left}px ${r.top + r.height / 2 - top}px`;
      if (again) { void P.offsetWidth; P.classList.remove('re'); }
      P.classList.add('on'); P.inert = false; P.removeAttribute('aria-hidden');
      if (RM || SAVE || !Auto.on()) return;   // apswitch: 미리보기 자동 재생을 끄면 그림만
      if (v0) { let v = null; if (pre && pre.id === w.id) { v = pre.v; pre = null; } else { unwarm(); v = freshVideo(pickSmall(v0), startOf(w), { loopTo: startOf(w), muted: Snd.pop() }); } play(v); }
      else if (w.media && w.media.youtube) {
        const f = document.createElement('iframe'); f.className = 'yt'; f.tabIndex = -1; f.allow = 'autoplay';
        f.src = `https://www.youtube-nocookie.com/embed/${w.media.youtube}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&loop=1&playlist=${w.media.youtube}`;
        f.addEventListener('load', () => setTimeout(() => f.classList.add('on'), 700), { once: true }); ART.appendChild(f);
      }
    };
    const hide = (now, why) => { clearTimeout(hideT); hideT = setTimeout(() => {   // 닫히는 동안(페이드)은 장면을 그대로 두고 끝난 뒤 비움 — 검은 틀 깜빡임 없음
      if (!P.classList.contains('on')) return; P.classList.remove('on'); P.inert = true; P.setAttribute('aria-hidden', 'true'); V && V.pause(); cur = null; if (why !== 'scroll') shut = performance.now();
      clearTimeout(clrT); clrT = setTimeout(() => { if (!P.classList.contains('on')) clear(); }, RM ? 0 : 260); }, now ? 0 : 140); };
    const swap = n => {   // popfmt 2: 그 규격 영상으로 바꾸고 틀도 그 비율로 부드럽게 변형
      const vs = cur ? vidsOf(cur) : [], v = vs[n]; if (!v || n === vi || !rc) return; const prev = vs[vi], t = V ? V.currentTime : 0; vi = n; mark();
      // 오른쪽 끝·영상 아래 끝을 고정(아이콘이 포인터 밑에 그대로) — 위가 모자라면 아래로 자람(포인터는 영상 위에 남아 닫히지 않음) · 버튼이 잘리지 않는 최소 폭
      const aw = v.w || 16, ah = v.h || 9, R = pg.left + pg.pw, B = pg.top + pg.h, bh = BD.offsetHeight, pw = Math.max(220, Math.min(size(rc, aw, ah), R - 16)), h = pw * ah / aw;
      let top = Math.max(64, B - h); if (top + h + bh > innerHeight - 16) top = Math.max(64, innerHeight - 16 - bh - h);
      P.classList.add('mo'); place(rc, pw, aw, ah, { left: Math.max(16, R - pw), top }); clearTimeout(moT); moT = setTimeout(() => P.classList.remove('mo'), 480);
      if (RM || SAVE) return; const old = V, ob = $('.pb', ART), nv = freshVideo(pickSmall(v), prev && Math.abs((v.dur || 0) - (prev.dur || 0)) < 1 ? t : 0, { loopTo: 0, muted: Snd.pop() });
      nv.addEventListener('playing', () => { setTimeout(() => { killVideo(old); ob && ob.remove(); }, 220); }, { once: true }); play(nv);
    };
    P.addEventListener('pointerenter', () => clearTimeout(hideT)); P.addEventListener('pointerleave', () => hide());
    const open = (autoplay, n = 0) => { if (!cur) return; const id = cur.id, q = card ? queueOf(card) : [id]; Theater.open(id, { queue: q, autoplay, before: () => hide(true), ...(n ? { vi: n } : {}) }); };
    $('.btn.acc', P).addEventListener('click', () => open(true, vi)); $('.btn.ghost', P).addEventListener('click', () => open(false, vi)); ART.addEventListener('click', () => open(true, vi));
    FM.addEventListener('pointerover', e => { const b = e.target.closest('button'); if (b && dm('popfmt') === 2) swap(+b.dataset.k); });
    FM.addEventListener('click', e => { const b = e.target.closest('button'); if (b) open(true, +b.dataset.k); });
    addEventListener('scroll', () => { if (P.classList.contains('on')) hide(true, 'scroll'); }, { passive: true });
    return { show, hide, prewarm, unwarm, warm, is: id => !!(cur && cur.id === id && P.classList.contains('on')), keep: () => clearTimeout(hideT) };
  })();
  const HI = { v: 0, x: 0, y: 0, t: -1e9, sc: -1e9, cc: -1e9 };   // 포인터 속도(px/ms, 평활) · 마지막 스크롤 시각(가로 줄 포함) · 마지막으로 화면 내용이 바뀐 시각(갤러리·다시 그리기·상영관 닫힘)
  if (HOVER && !EDIT) {
    addEventListener('pointermove', e => { const dt = e.timeStamp - HI.t, d = Math.hypot(e.clientX - HI.x, e.clientY - HI.y); HI.v = dt > 0 && dt < 120 ? HI.v * .4 + d / dt * .6 : 0; HI.x = e.clientX; HI.y = e.clientY; HI.t = e.timeStamp; }, { capture: true, passive: true });
    addEventListener('scroll', () => { HI.sc = performance.now(); }, { capture: true, passive: true });
  }
  const speed = () => performance.now() - HI.t > 80 ? 0 : HI.v;   // 멈추면 이벤트가 없으니 시간으로 0
  let hovT = null, preT = null, hovC = null;
  const arm = (card, w) => {   // 멈춘 뒤 0.5초(옆 카드 전환은 0.15초) · 기다리는 동안 영상 미리 받기 · 스크롤 직후엔 조금 더 기다림
    if (Pop.is(w.id)) return Pop.keep();
    hovC = card; clearTimeout(hovT); clearTimeout(preT); const d = Pop.warm() ? 150 : 500;
    preT = setTimeout(() => Pop.prewarm(w), d > 150 ? 150 : 0);
    hovT = setTimeout(function fire() { if (speed() > .3 || performance.now() - HI.sc < 250) { hovT = setTimeout(fire, 100); return; } Pop.show(card, w); }, d);
  };
  const bindCard = card => {
    const w = BY[card.dataset.id]; if (!w) return;
    card.addEventListener('click', e => { e.preventDefault(); clearTimeout(hovT); clearTimeout(preT); Pop.hide(true); Theater.open(w.id, { queue: queueOf(card) }); });
    if (!HOVER || EDIT) return;
    card.addEventListener('pointerenter', () => { hovC = null; if (HI.t > HI.cc && performance.now() - HI.t < 100) arm(card, w); });   // 포인터는 가만있고 내용이 밑으로 온 것(갤러리 열림·다시 그리기)은 움직일 때까지 안 셈
    card.addEventListener('pointermove', () => { if (!Pop.is(w.id) && (hovC !== card || speed() > .3)) arm(card, w); }, { passive: true });   // 스치는 중이면 처음부터 다시 셈
    card.addEventListener('pointerleave', () => { hovC = null; clearTimeout(hovT); clearTimeout(preT); Pop.unwarm(w.id); Pop.hide(); });
  };
  const rowsAC = new WeakMap();   // 다시 그릴 때 이전 창 크기 리스너 정리
  const mountRows = root => {
    if (rowsAC.get(root)) rowsAC.get(root).abort(); const ac = new AbortController(); rowsAC.set(root, ac);
    const up = root.parentElement && rowsAC.get(root.parentElement.closest('.rows')); if (up) up.signal.addEventListener('abort', () => ac.abort(), { once: true });   // 끼워 넣은 줄도 전체 다시 그릴 때 함께 정리
    watchTheater(); HI.cc = performance.now();   // 새로 그린 카드가 가만있는 포인터 밑에 와도 움직이기 전엔 안 열림
    $$('.card[data-id]', root).forEach(bindCard);
    (root.matches('.row') ? [root] : $$('.row', root)).forEach(row => {
      if (row.classList.contains('series')) return Series.mount(row, ac.signal);
      $$('[data-more]', row).forEach(a => a.addEventListener('click', e => { if (dm('more') === 2) { e.preventDefault(); Gallery.open(row); } }));
      const pa = $('.pall', row); if (pa) pa.addEventListener('click', () => { const c = $('.card', row), q = c ? queueOf(c).filter(id => playable(BY[id])) : []; if (q.length) Theater.open(q[0], { queue: q, autoplay: true }); });
      const sc = $('.sc', row), L = $('.ar.l', row), R = $('.ar.r', row), A = $('.arr', row); if (!sc || !L) return;
      if (!EDIT) { Rove.mount(sc, { group: sc.closest('.rows') || root }); L.tabIndex = R.tabIndex = -1; }   // P49: 줄마다 탭 정지 1개 + 방향키(화살표 버튼은 마우스용)
      const PG = $('.pgi', row); let want = null, wantT = 0;
      const geo = () => {   // 한 페이지 = 완전히 보이는 카드 수 × (카드 폭 + 간격), 마지막 페이지는 끝 정렬 — 화살표·페이지 막대가 같은 기준
        const c = $('.card', sc), max = Math.max(0, sc.scrollWidth - sc.clientWidth); if (!c || max < 4) return { n: 0, max, at: () => 0, of: () => 0 };
        const st = getComputedStyle(sc), gap = parseFloat(st.columnGap) || 0, pad = parseFloat(st.paddingLeft) || 0, u = c.getBoundingClientRect().width + gap;
        const k = Math.max(1, Math.floor((sc.clientWidth - pad * 2 + gap + 1) / u)), n = Math.max(2, Math.ceil($$('.card', sc).length / k)), at = j => Math.min(j * k * u, max);
        return { n, max, at, of: x => { if (x >= max - 4) return n - 1; let b = 0; for (let j = 1; j < n; j++) if (Math.abs(at(j) - x) < Math.abs(at(b) - x)) b = j; return b; } };
      };
      const moving = () => want !== null && performance.now() - wantT < 900;
      const upd = () => {
        const g = geo(), over = g.n > 0, x = sc.scrollLeft; A.hidden = !over; L.disabled = x < 8; R.disabled = x > g.max - 8; sc.classList.toggle('more', over && !R.disabled);
        if (PG) {   // 줄 제목 오른쪽 위 페이지 표시 막대(넷플릭스) — 넘기는 중엔 가는 페이지를 바로 표시
          const k = over ? g.of(moving() ? want : x) : 0;
          if (PG.childElementCount !== g.n) PG.innerHTML = '<i></i>'.repeat(g.n);
          [...PG.children].forEach((e, j) => e.classList.toggle('on', j === k));
        }
      };
      const step = d => { const g = geo(); if (!g.n) return; const j = Math.max(0, Math.min(g.n - 1, g.of(moving() ? want : sc.scrollLeft) + d)); want = g.at(j); wantT = performance.now(); sc.scrollTo({ left: want, behavior: RM ? 'auto' : 'smooth' }); upd(); };
      L.addEventListener('click', () => step(-1)); R.addEventListener('click', () => step(1));
      sc.addEventListener('scroll', upd, { passive: true }); sc.addEventListener('scrollend', () => { want = null; upd(); }); addEventListener('resize', upd, { signal: ac.signal }); upd();
    });
  };

  /* ---------- 「모두 보기」 덮개 갤러리(more 2) — 그 줄 작품만 큰 격자, Esc·바깥 클릭 닫힘, 카드 누르면 상영관(큐 = 그 줄) ---------- */
  const Gallery = (() => {
    let G = null, from = null, ov = '';
    const PP = () => $('.pop');   // 확장 카드는 덮개 안으로 옮겨 둠(뒤 페이지 inert에 같이 묶이지 않게)
    const close = () => { if (!G) return; const g = G; G = null; g.classList.remove('on'); document.documentElement.style.overflow = ov; Pop.hide(true); const p = PP(); if (p && g.contains(p)) document.body.appendChild(p); Modal.close(g); setTimeout(() => g.remove(), RM ? 0 : 400); if (from && from.isConnected) from.focus({ preventScroll: true }); };
    document.addEventListener('keydown', e => {   // 상영관이 위에 떠 있으면 상영관이 먼저
      if (!G || $('.theater.on')) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') { const f = $$('button,a[href]', G).filter(x => x.tabIndex >= 0 && !x.closest('.pop')), a = f[0], z = f[f.length - 1]; if (!G.contains(document.activeElement)) { e.preventDefault(); a.focus(); } else if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    }, true);
    const open = row => {
      const c = $('.card', row); if (!c) return; if (G) close(); const ids = queueOf(c), cls = $('.card.tall', row) ? 'tall' : 'wide', title = ($('.hd h2', row) || {}).textContent || '';
      from = document.activeElement; const g = G = document.createElement('div'); g.className = 'rgal'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-label', title);
      g.innerHTML = `<div class="rgs"><div class="rgh"><h2>${esc(title)}</h2><button class="rgx" aria-label="닫기">${ico('close')}</button></div><div class="rgg ${cls}" data-queue>${ids.map(id => cardHTML(BY[id], cls)).join('')}</div></div>`;
      document.body.appendChild(g); ov = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; mountRows($('.rgg', g));
      if (!EDIT) Rove.mount($('.rgg', g), { mode: 'grid' }); const p = PP(); if (p) g.appendChild(p); Modal.open(g);   // 뒤 페이지 inert · 격자 방향키
      g.addEventListener('click', e => { if (e.target === g) close(); }); $('.rgx', g).addEventListener('click', close);
      $('.rgs', g).addEventListener('scroll', () => Pop.hide(true, 'scroll'), { passive: true });
      requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('on'))); $('.rgx', g).focus({ preventScroll: true });
    };
    return { open, close };
  })();

  /* ---------- 시리즈 블록(series 2·3) — 왼쪽 큰 16:9 무음 재생(화면에 반 이상 보일 때만) · 회차 끝나면 다음 회차 · 영상 누르면 상영관 ---------- */
  const Series = {
    mount(sec, signal) {
      const s = seriesOf()[0], sv = $('.sv', sec), btns = $$('.se', sec); if (!s || !sv) return;
      let k = 0, V = null, see = false, th = false, asked = false;   // asked: 회차를 직접 누름(미리보기 자동 재생을 꺼 둔 사람도 누른 건 재생)
      const run = () => { const ok = see && !document.hidden && !$('.theater.on') && !RM && !SAVE && (asked || Auto.on()); if (!V && ok) { V = mk(k); sv.appendChild(V); } if (V) ok ? V.play().catch(() => { }) : V.pause(); };
      const mk = n => { const e = s.eps[n], v = freshVideo(pickSmall(e.v), e.k === undefined ? startOf(e.w) : 0); const bar = $('.pg i', btns[n]);
        v.addEventListener('timeupdate', () => { if (v.duration && bar) bar.style.transform = `scaleX(${v.currentTime / v.duration})`; }); v.addEventListener('ended', () => go(n + 1)); return v; };
      const go = n => {
        n = (n + s.eps.length) % s.eps.length; if (n === k && V) return; k = n; const e = s.eps[n];
        btns.forEach((b, j) => { b.classList.toggle('on', j === n); j === n ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current'); const x = $('.pg i', b); if (x) x.style.transform = 'scaleX(0)'; });
        if (e.k === undefined) { const p = url(posterOf(e.w)); $('.blur', sv).style.backgroundImage = `url('${p}')`; $('img', sv).src = p; }   // 작품 묶음은 회차마다 포스터도 바뀜
        const old = V; V = null; run(); if (!old) return; if (V) V.addEventListener('playing', () => setTimeout(() => killVideo(old), 300), { once: true }); else killVideo(old);   // 새 회차가 나온 뒤 이전 것 정리(빈 틀 없음)
      };
      btns.forEach((b, n) => b.addEventListener('click', () => { asked = true; go(n); }));
      sv.addEventListener('click', () => { const e = s.eps[k]; e.k === undefined ? Theater.open(e.id, { queue: s.eps.map(x => x.id), autoplay: true }) : Theater.open(e.id, { queue: [e.id], autoplay: true, ...(e.k ? { vi: e.k } : {}) }); });
      const thumbs = () => { if (th) return; th = true; s.eps.forEach((e, n) => { if (e.k === undefined) return; const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.setAttribute('aria-hidden', 'true'); v.src = `${url(pickSmall(e.v))}#t=${Math.min(3, (e.dur || 4) * .25).toFixed(1)}`; $('.th', btns[n]).appendChild(v); }); };   // 회차 장면(그 영상의 한 프레임)
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) thumbs(); see = en.intersectionRatio >= .5; run(); }), { threshold: [0, .5] }); io.observe($('.sbx', sec));
      document.addEventListener('visibilitychange', run, { signal }); document.addEventListener('pf:theater', run, { signal });
      signal.addEventListener('abort', () => { io.disconnect(); killVideo(V); V = null; $$('.th video', sec).forEach(killVideo); }, { once: true });
    }
  };

  /* ---------- 상영관 열림·닫힘 감지(상영관 코드는 건드리지 않음) → pf:theater · 닫으면 because 줄 ---------- */
  let theaterMO = null;
  const watchTheater = () => {
    const T = $('.theater'); if (theaterMO || !T) return; let was = T.classList.contains('on');
    theaterMO = new MutationObserver(() => { const on = T.classList.contains('on'); if (on === was) return; was = on; document.dispatchEvent(new CustomEvent('pf:theater', { detail: { on, id: T.dataset.cur } })); });
    theaterMO.observe(T, { attributes: true, attributeFilter: ['class'] });
  };
  const insertBecause = () => {   // 홈에만 · 같은 작품이면 그대로 · 다른 작품이면 그 자리에서 바꿈 · 스크롤 위치는 브라우저 스크롤 고정이 지킴
    const R = $('.rows'); if (!R || EDIT || dm('because') < 2) return;
    const r = becauseRow(), old = $(':scope > .row[data-row="because"]', R); if (!r) { if (old) old.remove(); return; }
    if (old && old.dataset.of === r.of) return;
    const t = document.createElement('template'); t.innerHTML = rowHTML(r); const sec = t.content.firstElementChild; sec.classList.add('rin');
    if (old) old.replaceWith(sec); else { const rep = $(':scope > .row[data-row="rep"]', R); R.insertBefore(sec, dm('because') === 2 && rep ? rep.nextSibling : $(':scope > .row:not([data-row="hubs"])', R)); }
    mountRows(sec);
  };
  document.addEventListener('pf:theater', e => {
    HI.cc = performance.now(); if (e.detail.on) { clearTimeout(hovT); clearTimeout(preT); Pop.unwarm(); return; }
    const w = BY[e.detail.id]; if (EDIT || !w || isTool(w)) return;
    try { sessionStorage.setItem('pf.because', w.id); } catch (er) { }
    // 닫히면 브라우저가 뒤로가기 스크롤 위치를 (부드럽게, 조금 늦게) 되돌림 — 그게 끝난 뒤에 끼워야 스크롤 고정이 화면을 지킴
    let y = scrollY, n = 0, t0 = performance.now(); const tick = () => { if ($('.theater.on')) return; if (scrollY === y && ++n >= 2 || performance.now() - t0 > 2000) return insertBecause(); if (scrollY !== y) n = 0; y = scrollY; setTimeout(tick, 120); };
    setTimeout(tick, 200);
  });
  /* 디자인 모듈 값이 바뀌면(/design 미리보기) 마크업이 다른 모듈만 다시 그림 */
  if (!EDIT) new MutationObserver(ms => {
    const o = {}; ms.forEach(m => { if (!(m.attributeName in o)) o[m.attributeName] = m.oldValue; });
    const ch = Object.keys(o).filter(a => o[a] !== document.body.getAttribute(a)).map(a => a.slice(5)); if (!ch.length) return;
    if (ch.includes('fstart')) renderHome(); else if (ch.some(k => ['dedup', 'more', 'because', 'hubs', 'series', 'playall'].includes(k))) renderRows();
    if (ch.includes('popfmt') || ch.includes('popinfo')) Pop.hide(true, 'scroll');
  }).observe(document.body, { attributes: true, attributeOldValue: true, attributeFilter: ['data-fstart', 'data-dedup', 'data-more', 'data-because', 'data-hubs', 'data-series', 'data-playall', 'data-popfmt', 'data-popinfo'] });


  /* ---------- 피처드: 항상 재생 — 정해진 구간이 끝나면 다음 작품, 진행 바는 영상 시간 그대로 ----------
     마우스가 위에 있거나 키보드 포커스가 안에 있으면 넘기지 않고 같은 구간 반복 · 화면에 25% 미만이면 멈춤 · 영상 누르면 상영관
     fsnd 2·3: 소리를 켜면 그 작품은 끝까지(3은 다음 작품도 처음부터 끝까지) · fstart: 끝까지 본 기록(pf.featSeen) */
  const Feat = (() => {
    let F = null, frames = [], texts = [], dots = [], i = 0, V = null, user = false, muted = true, raf = 0, fb = null, ac = null, io = null, hov = false, full = false;
    const holds = new Set(); const blocked = () => user || holds.size > 0;
    const seg = f => { const a = +f.dataset.a || 0, b = +f.dataset.b || a + 8; return { a, b: Math.max(b, a + 1) }; };
    const span = v => (full && v && v.duration) ? { a: 0, b: v.duration } : seg(frames[i]);   // 끝까지 모드는 영상 전체가 한 구간(진행 점도 전체 길이)
    const stay = () => { if (hov) return true; const a = document.activeElement; return !!(F && a && F.contains(a) && a.matches(':focus-visible')); };
    const note = (k, id) => { if (EDIT) return; try { const o = JSON.parse(localStorage.getItem('pf.featSeen') || '{}') || {}; if (k === 'last') o.last = id; else { const all = frames.map(f => f.dataset.id); o.done = [...new Set([...(o.done || []).filter(x => all.includes(x) && x !== id), id])]; if (all.every(x => o.done.includes(x))) o.done = [id]; } localStorage.setItem('pf.featSeen', JSON.stringify(o)); } catch (e) { } };
    const fill = p => dots.forEach(d => { const k = +d.dataset.i; d.classList.toggle('on', k === i); const x = $('i', d); if (x) x.style.width = (k === i ? Math.max(0, Math.min(1, p)) * 100 : 0) + '%'; });
    const tick = () => { cancelAnimationFrame(raf); const v = V; if (!v || !frames[i]) return; const s = span(v); fill((v.currentTime - s.a) / (s.b - s.a)); if (v.currentTime >= s.b - .04 || v.ended) { if (EDIT || stay()) { v.currentTime = s.a; v.play().catch(() => { }); } else { note('done', frames[i].dataset.id); go(i + 1); return; } } raf = requestAnimationFrame(tick); };
    const arm = s => { clearTimeout(fb); if (!EDIT && !blocked()) fb = setTimeout(() => stay() ? arm(s) : go(i + 1), (s.b - s.a) * 1000); };   // 데이터 절약: 영상 없이 시간으로만 넘김
    const load = () => {
      if (V) { const old = V; old.pause(); setTimeout(() => killVideo(old), 1000); } V = null; cancelAnimationFrame(raf); clearTimeout(fb); fill(0);
      const f = frames[i]; if (!f) return; const s = seg(f);
      if (SAVE) { arm(s); return; }
      V = freshVideo(f.dataset[big() ? 'hd' : 'sd'], full ? 0 : s.a, { muted }); f.appendChild(V);
      const v = V; v.addEventListener('playing', () => { clearTimeout(fb); tick(); });
      v.addEventListener('error', () => { if (!EDIT) fb = setTimeout(() => go(i + 1), 4000); }, { once: true });
      if (!blocked()) v.play().catch(() => { v.muted = true; v.play().catch(() => { }); });
    };
    const go = n => {
      if (!frames.length) return;
      frames[i].classList.remove('on'); texts[i].classList.remove('on'); texts[i].hidden = true;
      i = (n + frames.length) % frames.length; full = dm('fsnd') === 3 && !muted;
      frames[i].classList.add('on'); texts[i].hidden = false; requestAnimationFrame(() => texts[i] && texts[i].classList.add('on'));
      sel(); note('last', frames[i].dataset.id);
      load(); F && F.dispatchEvent(new CustomEvent('pf:slide', { detail: { i, id: frames[i].dataset.id } }));
    };
    const sel = () => dots.forEach((d, k) => { d.setAttribute('aria-selected', k === i); d.tabIndex = k === i ? 0 : -1; });
    const hold = r => { holds.add(r); cancelAnimationFrame(raf); clearTimeout(fb); V && V.pause(); };
    const release = r => { holds.delete(r); if (blocked() || !frames[i]) return; if (V) V.error ? go(i + 1) : V.play().catch(() => { }); else if (SAVE) arm(seg(frames[i])); };
    const mount = el => {
      F = el; frames = $$('.fs', F); texts = $$('.fx', F); dots = $$('.fctl button[data-i]', F); i = 0; muted = Snd.feat(); full = dm('fsnd') === 3 && !muted; if (!frames.length) return;
      ac = new AbortController(); const sig = { signal: ac.signal };
      const pp = $('.pp', F), snd = $('.snd', F), ids = texts.map(t => t.dataset.id);
      dots.forEach(d => d.addEventListener('click', () => go(+d.dataset.i)));
      $('.fdots', F).addEventListener('keydown', e => {   // 점 막대: ←→ 이전·다음, Home·End 처음·끝(포커스도 따라감)
        const n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: frames.length - 1 }[e.key]; if (n === undefined) return;
        e.preventDefault(); go(n); dots[i] && dots[i].focus();
      });
      pp.addEventListener('click', () => { user = !user; pp.innerHTML = ico(user ? 'play' : 'pause', 'sm'); pp.setAttribute('aria-label', user ? '재생' : '일시정지'); user ? hold('user') : release('user'); });
      snd.addEventListener('click', () => {
        muted = !muted; if (V) V.muted = muted; snd.innerHTML = ico(muted ? 'mute' : 'vol', 'sm'); snd.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기');
        if (!muted && !full && dm('fsnd') > 1) { full = true; const x = dots[i] && $('i', dots[i]); if (x && !RM) { x.style.transition = 'width var(--d-half) var(--ease)'; setTimeout(() => x.style.transition = '', 240); } }   // 진행 점이 전체 길이로 — 튀지 않게 잠깐 부드럽게
      });
      const open = (id, o = {}) => Theater.open(id, { queue: ids, autoplay: true, ...o });   // 피처드에서 상영관으로 가는 길은 이 하나
      $$('[data-open]', F).forEach(b => b.addEventListener('click', () => open(b.dataset.open)));
      $$('[data-info]', F).forEach(b => b.addEventListener('click', () => open(b.dataset.info, { autoplay: false, info: true })));
      if (!EDIT) $('.fv', F).addEventListener('click', () => frames[i] && open(frames[i].dataset.id));   // 영상 자체를 눌러도 재생(편집 화면은 클릭 = 선택)
      F.addEventListener('pointerenter', () => { hov = true; }, sig); F.addEventListener('pointerleave', () => { hov = false; }, sig);
      if ('IntersectionObserver' in window) { io = new IntersectionObserver(es => es.forEach(e => e.intersectionRatio >= .25 ? release('view') : hold('view')), { threshold: [0, .25, .5] }); io.observe($('.fbox', F)); }
      sel(); note('last', frames[0].dataset.id); load();
    };
    const unmount = () => { cancelAnimationFrame(raf); clearTimeout(fb); killVideo(V); V = null; frames = []; texts = []; dots = []; ac && ac.abort(); ac = null; io && io.disconnect(); io = null; holds.delete('view'); };
    document.addEventListener('visibilitychange', () => document.hidden ? hold('tab') : release('tab'));
    return { mount, unmount, hold, release, go, get i() { return i; }, get video() { return V; }, seg };
  })();
  window.__featPause = () => Feat.hold('theater'); window.__featResume = () => Feat.release('theater');

  /* ---------- 이미지 소재 라이트박스 — 상영관 위 덮개: 원비율로 크게 · ←→ 넘김 · Esc·바깥 클릭 닫기 · 포커스 가둠(APG 모달) ---------- */
  const Lightbox = (() => {
    const L = document.createElement('div'); L.className = 'lbx'; L.hidden = true;
    L.setAttribute('role', 'dialog'); L.setAttribute('aria-modal', 'true'); L.setAttribute('aria-label', '이미지 소재');
    L.innerHTML = `<div class="st"><img alt="" draggable="false"></div><div class="c num" aria-live="polite"></div><button class="ib p" aria-label="이전 이미지">${ico('chev-l')}</button><button class="ib n" aria-label="다음 이미지">${ico('chev-r')}</button><button class="ib x" title="닫기 (Esc)" aria-label="닫기">${ico('close')}</button>`;
    const ST = $('.st', L), IM = $('img', L), C = $('.c', L), PB = $('.p', L), NB = $('.n', L), XB = $('.x', L);
    let list = [], i = 0, on = false, from = null, resume = null, seq = 0, hideT = null, px = null, swiped = false;
    const lab = s => String(s || '').split(' — ')[0];
    const show = (n, dir = 0) => {
      i = (n + list.length) % list.length; const im = list[i], tok = ++seq, src = url(im.src);
      C.textContent = `${i + 1} / ${list.length} · ${lab(im.label)}`;
      const pre = new Image(); pre.src = src;
      (pre.decode ? pre.decode() : Promise.resolve()).catch(() => { }).then(() => {   // 다 받은 뒤 바꿔 끼움(빈 틀 깜빡임 없음)
        if (tok !== seq) return;
        IM.style.setProperty('--ar', (im.w / im.h).toFixed(4)); IM.style.setProperty('--nw', im.w); IM.style.setProperty('--dx', dir); IM.style.setProperty('--sc', dir ? 1 : .97);
        IM.src = src; IM.alt = im.label || ''; IM.classList.remove('sw'); void IM.offsetWidth; IM.classList.add('sw');
      });
      if (list.length > 1) [i + 1, i - 1].forEach(k => { new Image().src = url(list[(k + list.length) % list.length].src); });
    };
    const open = (imgs, n = 0, el = null) => {
      if (!imgs || !imgs.length) return; const host = $('.theater.on') || document.body;
      if (L.parentNode !== host) host.appendChild(L);
      clearTimeout(hideT); list = imgs; from = el || document.activeElement; on = true;
      const v = $('.theater.on .vw > video'); resume = v && !v.paused ? v : null; if (resume) resume.pause();   // 보는 동안 뒤 영상은 멈춤
      PB.hidden = NB.hidden = imgs.length < 2; L.hidden = false; Modal.open(L); show(n, 0);   // 덮개 밖 전부 inert(P50 공용)
      requestAnimationFrame(() => L.classList.add('on')); (imgs.length > 1 ? NB : XB).focus({ preventScroll: true });
    };
    const close = () => {
      if (!on) return; on = false; seq++; L.classList.remove('on'); Modal.close(L);
      hideT = setTimeout(() => { L.hidden = true; IM.removeAttribute('src'); }, RM ? 0 : 200);
      if (resume && $('.theater.on')) resume.play().catch(() => { }); resume = null;
      if (from && from.isConnected) from.focus({ preventScroll: true });
    };
    const step = d => { if (list.length > 1) show(i + d, d); };
    PB.addEventListener('click', () => step(-1)); NB.addEventListener('click', () => step(1)); XB.addEventListener('click', close);
    ST.addEventListener('pointerdown', e => { px = e.clientX; swiped = false; });
    ST.addEventListener('pointerup', e => { if (px === null) return; const dx = e.clientX - px; px = null; if (Math.abs(dx) > 48) { swiped = true; step(dx < 0 ? 1 : -1); } });
    L.addEventListener('click', e => { if (swiped) { swiped = false; return; } if (e.target === L || e.target === ST) close(); });   // 그림 바깥 = 닫기
    addEventListener('keydown', e => {   // 상영관 단축키보다 먼저 처리
      if (!on) return; const k = e.key; e.stopPropagation();
      if (k === 'Escape') { e.preventDefault(); close(); }
      else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); step(k === 'ArrowLeft' ? -1 : 1); }
      else if (k === 'Home' || k === 'End') { e.preventDefault(); show(k === 'Home' ? 0 : list.length - 1, 0); }
      else if (k === 'Tab') { e.preventDefault(); const f = [PB, NB, XB].filter(b => !b.hidden), a = f.indexOf(document.activeElement); f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
    }, true);
    return { open, close, get on() { return on; } };
  })();

  /* ---------- 쇼릴 — 대표(grade 1) 영상 작품. 구성(reelcut): 1 전체 · 2 하이라이트(피처드 구간) · 3 시작 때 고르기 ---------- */
  const modN = k => EDIT ? 1 : (+document.body.dataset[k] || 1);   // 디자인 모듈 번호(편집 화면은 늘 1)
  const reelIds = () => MDATA.filter(w => w.grade === 1 && vidsOf(w).length).map(w => w.id);
  let RP = null;
  const reelPopClose = () => { if (!RP) return false; const p = RP; RP = null; p.classList.remove('on'); setTimeout(() => p.remove(), RM ? 0 : 200); return true; };
  const playReel = anchor => {
    const q = reelIds(); if (!q.length) return; const c = modN('reelcut');
    if (c !== 3) return Theater.reel(q, c === 2);
    if (reelPopClose()) return;   // 다시 누르면 닫힘
    const sum = f => q.reduce((s, id) => s + f(BY[id]), 0);
    const hi = sum(w => { const [a, b] = segOf(w); return b - a; }), full = sum(w => (vidsOf(w)[0] || {}).dur || 0);
    const P = RP = document.createElement('div'); P.className = 'rpick'; P.setAttribute('role', 'dialog'); P.setAttribute('aria-label', '쇼릴');
    P.innerHTML = `<button class="btn acc" data-c="2">${ico('play', 'sm')}하이라이트<small class="num">${fmtT(hi)}</small></button><button class="btn ghost" data-c="1">${ico('play', 'sm')}전체<small class="num">${fmtT(full)}</small></button>`;
    document.body.appendChild(P);
    const r = (anchor || NAV || document.body).getBoundingClientRect();
    P.style.top = `${Math.round(r.bottom + 8)}px`; if (r.left + r.width / 2 < innerWidth / 2) P.style.left = `${Math.round(r.left)}px`; else P.style.right = `${Math.round(innerWidth - r.right)}px`;
    $$('button', P).forEach(b => b.addEventListener('click', () => { reelPopClose(); Theater.reel(q, b.dataset.c === '2'); }));
    requestAnimationFrame(() => P.classList.add('on')); $('button', P).focus({ preventScroll: true });
  };
  addEventListener('pointerdown', e => { if (RP && !e.target.closest('.rpick,[data-reel],.cvr')) reelPopClose(); }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape' && reelPopClose()) e.stopPropagation(); }, true);
  addEventListener('scroll', () => { reelPopClose(); }, { passive: true });
  $$('[data-reel]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); playReel(b); }));

  /* ---------- 상영관 ---------- */
  const Theater = (() => {
    const T = document.createElement('div'); T.className = 'theater'; T.setAttribute('role', 'dialog'); T.setAttribute('aria-modal', 'true'); T.setAttribute('aria-label', '작품 재생');
    T.innerHTML = `<div class="bgart"></div><div class="veil"></div>
<div class="top"><span class="crumb"></span><span class="pos num"></span><span class="r"><button class="ib pipb" title="작게 보기 (P)" aria-label="작게 보기">${ico('pip')}</button><button class="ib full" title="전체화면 (F)" aria-label="전체화면">${ico('expand')}</button><button class="ib close" title="닫기 (Esc)" aria-label="닫기">${ico('close')}</button></span></div>
<div class="lay"><div class="stage">
 <div class="vw"><div class="big" aria-hidden="true">${ico('play', 'lg')}</div><div class="next" role="button" tabindex="0"><img alt=""><span><small>다음 작품</small><b></b></span><span class="cd num"></span><button class="ib cancel" aria-label="다음 작품 취소">${ico('close', 'sm')}</button></div></div>
 <div class="meta"><div><h1></h1><div class="s"></div></div></div>
 <div class="ctl"><div class="pg" role="slider" aria-label="재생 위치" tabindex="0"><i></i></div><div class="tm"><span class="cur">0:00</span><span class="dur">0:00</span></div>
 <div class="bt"><span class="tr"><button class="ib prev" title="이전 작품 (Shift+←)" aria-label="이전 작품">${ico('prev')}</button><button class="ib pp" title="재생/일시정지 (Space)" aria-label="재생">${ico('play')}</button><button class="ib nxt" title="다음 작품 (Shift+→)" aria-label="다음 작품">${ico('next')}</button><button class="ib mute" title="음소거 (M)" aria-label="음소거">${ico('vol')}</button></span><span class="chips fmts"></span></div></div>
</div>
<section class="panel" aria-label="작품 정보"><div class="ptl" role="tablist" aria-label="작품 정보" hidden></div><div class="que" hidden></div><div class="vars" hidden></div><div class="desc"></div><div class="gal"></div><div class="ser" hidden></div><div class="sim"></div></section></div>`;
    document.body.appendChild(T);
    const V = document.createElement('video'); V.playsInline = true; V.preload = 'metadata'; V.setAttribute('controlslist', 'nodownload');
    const el = { lay: $('.lay', T), vw: $('.vw', T), next: $('.next', T), h1: $('.meta h1', T), s: $('.meta .s', T), crumb: $('.crumb', T), pos: $('.pos', T), pg: $('.pg', T), pgi: $('.pg i', T), cur: $('.cur', T), durE: $('.dur', T), pp: $('.pp', T), mute: $('.mute', T), fmts: $('.fmts', T), desc: $('.desc', T), gal: $('.gal', T), sim: $('.sim', T), bg: $('.bgart', T), ctl: $('.ctl', T), panel: $('.panel', T) };
    let cur = null, queue = [], idx = 0, idleT = null, cdT = null, lastFocus = null, autoplay = true, frame = null, vi = 0, pushed = false;
    let MUTED = (() => { try { return sessionStorage.getItem('pf.muted') === '1'; } catch (e) { return false; } })();
    const kindOf = w => vidsOf(w).length ? 'video' : (w.media && w.media.youtube) ? 'youtube' : (w.links && w.links.embed) ? 'iframe' : 'image';
    const clearStage = () => { [...el.vw.children].forEach(n => { if (!n.matches('.big,.next,.osd,.endcard')) n.remove(); }); frame = null; V.pause(); };
    const setAspect = (w, h) => { [el.vw, el.vw.parentElement, el.lay].forEach(x => { x.style.setProperty('--va', `${w}/${h}`); x.style.setProperty('--vr', (w / h).toFixed(4)); }); el.lay.toggleAttribute('data-tall', w / h < .95); };   // 제목·진행 바도 영상 폭에 맞춤 · 세로 영상이면 .lay[data-tall](tallfit)
    const chip = s => String(s).split(' — ')[0];
    const loadVideo = (v, keepTime) => {
      const t = keepTime ? (V.readyState ? V.currentTime : wantT) : pendingAt, playing = !V.paused; pendingAt = 0; wantT = t; played = false; stalls = [];   // pendingAt: 이어 보기·지정 시작 초(P02) · wantT: 아직 못 간 시작 초(바로 이어 규격을 바꿔도 유지)
      setAspect(v.w || 16, v.h || 9); V.dataset.hd = url(v.hd); V.src = url(srcFor(v)); V.defaultPlaybackRate = V.playbackRate = rate; V.loop = tmod('ended') === 3;
      if (t) V.addEventListener('loadedmetadata', () => { if (t < V.duration) V.currentTime = t; }, { once: true });
      if (playing || autoplay) V.play().catch(() => { V.muted = true; V.play().catch(() => { }); });
    };
    const render = w => {
      const kind = kindOf(w), vs = vidsOf(w), poster = posterOf(w); vi = 0;
      el.h1.innerHTML = nb(w.title); el.s.textContent = [w.type, w.dur, w.period || w.year].filter(Boolean).join(' · ');
      el.crumb.innerHTML = `<b>${esc((w.kinds || []).map(k => KINDS[k]).filter(Boolean).join(' · ') || '작업')}</b>`;
      el.pos.textContent = queue.length > 1 ? `${String(idx + 1).padStart(2, '0')} / ${String(queue.length).padStart(2, '0')}` : '';
      el.bg.style.backgroundImage = poster ? `url('${url(poster)}')` : 'none';
      clearStage(); el.next.classList.remove('on'); delete el.next.dataset.dismissed; clearInterval(cdT);
      let embs = [];
      if (kind === 'video') { V.poster = poster ? url(poster) : ''; V.muted = MUTED = dm('sound') > 1 ? Snd.theater() : MUTED; V.setAttribute('aria-label', w.title); el.vw.prepend(V); loadVideo(vs[0], false); }
      else if (kind === 'youtube') { setAspect(16, 9); frame = document.createElement('iframe'); frame.allow = 'autoplay; fullscreen; picture-in-picture'; frame.title = w.title; frame.src = `https://www.youtube-nocookie.com/embed/${w.media.youtube}?autoplay=${autoplay ? 1 : 0}&rel=0&playsinline=1`; el.vw.prepend(frame); }
      else if (kind === 'iframe') {
        embs = (w.links.embeds && w.links.embeds.length) ? w.links.embeds : [{ label: '데모', src: w.links.embed }]; setAspect(16, 10);
        frame = document.createElement('iframe'); frame.title = w.title; frame.setAttribute('allow', 'fullscreen; clipboard-write; accelerometer; gyroscope'); frame.src = url(embs[0].src); el.vw.prepend(frame);
      }
      else { const im = new Image(); im.alt = w.title; im.src = url(poster); im.onload = () => setAspect(im.naturalWidth || 16, im.naturalHeight || 9); setAspect(16, 9); el.vw.prepend(im); }
      el.vw.classList.toggle('paused', kind === 'video' && !autoplay);
      el.ctl.hidden = !(kind === 'video' || embs.length > 1);
      $$('.pg,.tm,.tr', el.ctl).forEach(n => n.hidden = kind !== 'video');
      const merged = fmtPick(w, kind, vs, embs);   // 규격 고르기(fmtpick: 1 글자 칩 · 2 모양 썸네일 · 3 패널 맨 위 목록 — 3이면 이미지 소재도 목록에 합침)
      // 정보: 영상 제작자가 보는 항목
      const c = w.copy || {}, L = w.links || {};
      const spec = [['종류', w.type || (w.kinds || []).map(k => KINDS[k]).filter(Boolean).join(' · ')], ['툴', (w.tools || []).join(' · ')], ['매체', (w.channels || []).join(' · ')], ['길이', w.dur], ['규격', (w.formats || []).join(' · ')], ['시기', w.period || w.year], ['기여도', w.contrib || w.role]].filter(x => x[1]);
      el.desc.innerHTML = (c.one ? `<p class="lead">${esc(c.one)}</p>` : '') + (w.highlight ? `<div class="hl">${esc(w.highlight)}</div>` : '') +
        `<div class="spec">${spec.map(x => `<span>${x[0]}</span><b>${esc(x[1])}</b>`).join('')}</div>` +
        (w.group === 'tools' && c.what ? `<ul class="what">${c.what.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '') +
        `<div class="ext">${L.live ? `<a class="btn ghost sm" href="${esc(L.live)}" target="_blank" rel="noopener">라이브 ↗</a>` : ''}${L.github ? `<a class="btn ghost sm" href="${esc(L.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}${L.artifact ? `<a class="btn ghost sm" href="${esc(L.artifact)}" target="_blank" rel="noopener">원본 ↗</a>` : ''}</div>`;
      const imgs = (w.media && w.media.images) || [];
      el.gal.innerHTML = imgs.length && !merged ? `<h3>이미지 소재 <small>${imgs.length}</small></h3><div class="gg">${imgs.map((im, i) => `<button type="button" data-gi="${i}" style="--r:${(im.w / im.h).toFixed(3)}" aria-label="${esc(chip(im.label))} 크게 보기"><img src="${esc(url(im.src))}" alt="" loading="lazy" width="${im.w}" height="${im.h}"><span>${esc(chip(im.label))}</span></button>`).join('')}</div>` : '';
      $$('[data-gi]', el.gal).forEach(b => b.addEventListener('click', () => Lightbox.open(imgs, +b.dataset.gi, b)));   // 새 탭 대신 라이트박스
      const ks = w.kinds || []; const sim = MDATA.filter(x => x.id !== w.id && posterOf(x) && (x.kinds || []).some(k => ks.includes(k))).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)).slice(0, 8);
      el.sim.innerHTML = sim.length ? `<h3>비슷한 작업</h3><div class="sg">${sim.map(x => { const t = thumbOf(x, 'wide'), s = esc(url(t.src)); return `<button data-id="${esc(x.id)}">${t.fill ? `<span class="sgf"><img class="bg" src="${s}" alt="" loading="lazy"><img src="${s}" alt="" loading="lazy"></span>` : `<img src="${s}" alt="" loading="lazy">`}<b>${esc(x.title)}</b></button>`; }).join('')}</div>` : '';   // 16:9 썸네일이 없으면 원비율 + 흐림 채움(자르지 않음)
      $$('.sg button', el.sim).forEach(b => b.addEventListener('click', () => { const q = sim.map(x => x.id); queue = q; jump(q.indexOf(b.dataset.id)); }));
      document.title = `${w.title} — HANSY`;
      panelX(w);
    };

    /* ===== 패널·규격·공유·쇼릴 — P21 탭(ptabs) · P22 규격(fmtpick) · P28 공유(share) · P30·31 쇼릴(reelui·reelcut) · P32 대기열(queue). 모두 1번이면 지금 그대로 ===== */
    const pe = { ptl: $('.ptl', T), que: $('.que', T), vars: $('.vars', T), ser: $('.ser', T), top: $('.top', T), r: $('.top .r', T) };
    const arOf = v => ((v.w || 16) / (v.h || 9)).toFixed(4);
    const SVG = d => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
    const I_LINK = SVG('<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.1 1.1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1"/>'), I_OK = SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), I_INFO = SVG('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>');
    // 규격 모양 썸네일 — 영상마다 같은 초의 장면을 작은 그림으로(규격만 다른 한 세트가 한눈에). 하나씩 차례로, 만든 건 재사용
    const FRM = new Map(); let frmQ = Promise.resolve();
    const frameOf = (src, t) => {
      const k = `${src}@${t}`; if (FRM.has(k)) return FRM.get(k);
      const p = frmQ = frmQ.then(() => new Promise(res => {
        const v = document.createElement('video'); let fin = false, to = 0;
        const done = d => { if (fin) return; fin = true; clearTimeout(to); res(d); killVideo(v); };
        v.muted = true; v.playsInline = true; v.preload = 'metadata';
        v.addEventListener('loadedmetadata', () => { v.currentTime = Math.max(0, Math.min(t, v.duration - .2)); }, { once: true });
        v.addEventListener('seeked', () => { try { const c = document.createElement('canvas'); c.height = 144; c.width = Math.round(144 * v.videoWidth / v.videoHeight); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', .74)); } catch (e) { done(''); } }, { once: true });
        v.addEventListener('error', () => done(''), { once: true }); to = setTimeout(() => done(''), 6000);
        v.src = url(src);
      }));
      FRM.set(k, p); return p;
    };
    const fillThumbs = (ims, vs, w) => {
      if (SAVE) return; const t = +(startOf(w) || segOf(w)[0] + 1).toFixed(2), id = w.id;
      const put = (im, d) => { if (d && im.isConnected) { im.src = d; im.classList.add('on'); } };
      ims.forEach((im, i) => { const v = vs[i]; if (!v) return; const s = v.sd || v.hd;
        if (FRM.has(`${s}@${t}`)) FRM.get(`${s}@${t}`).then(d => put(im, d));
        else setTimeout(() => { if (cur && cur.id === id) frameOf(s, t).then(d => put(im, d)); }, 500); });   // 본 영상이 먼저 받도록 잠깐 뒤에
    };
    let morphT = 0;
    const fmtLabs = list => list.map(chip).map((c, i, a) => a.filter(x => x === c).length > 1 ? `${c} · ${a.slice(0, i + 1).filter(x => x === c).length}` : c);
    const setFmt = (kind, vs, embs, n) => {   // 규격 바꾸기 — 길이가 같으면 보던 위치 그대로
      $$('[data-fi]', T).forEach(x => x.setAttribute('aria-pressed', +x.dataset.fi === n));
      if (kind === 'iframe') { if (frame) frame.src = url(embs[n].src); return; }
      if (n === vi || !vs[n]) return;
      if (modN('fmtpick') === 2 && !RM) { const xs = [el.vw, el.vw.parentElement, el.lay]; xs.forEach(x => { x.classList.add('morph'); getComputedStyle(x).getPropertyValue('--vr'); }); clearTimeout(morphT); morphT = setTimeout(() => xs.forEach(x => x.classList.remove('morph')), 700); }   // 틀이 새 비율로 부드럽게
      const same = Math.abs((vs[n].dur || 0) - (vs[vi].dur || 0)) < 1; vi = n; loadVideo(vs[n], same);
    };
    const fmtPick = (w, kind, vs, embs) => {
      const m = modN('fmtpick'), imgs = (w.media && w.media.images) || [], list = kind === 'video' ? vs.map(v => v.label || '영상') : embs.map(x => x.label), labs = fmtLabs(list);
      const shape = m === 2 && kind === 'video', vars = m === 3 && kind === 'video' && vs.length + imgs.length > 1;
      el.fmts.classList.toggle('shape', shape);
      el.fmts.innerHTML = list.length > 1 && !vars ? list.map((l, i) => shape
        ? `<button class="fmt" aria-pressed="${i === 0}" data-fi="${i}" title="${esc(l)}"><span class="fth" style="--ar:${arOf(vs[i])}"><img alt=""></span><small>${esc(labs[i])}</small></button>`
        : `<button class="chip" aria-pressed="${i === 0}" data-fi="${i}" title="${esc(l)}">${esc(labs[i])}</button>`).join('') : '';
      $$('[data-fi]', el.fmts).forEach(b => b.addEventListener('click', () => setFmt(kind, vs, embs, +b.dataset.fi)));
      if (shape) fillThumbs($$('.fth img', el.fmts), vs, w);
      pe.vars.innerHTML = vars ? `<h3>규격 <small>${vs.length + imgs.length}</small></h3><div class="vl">${vs.map((v, i) => `<button class="vr" data-fi="${i}" aria-pressed="${i === 0}" title="${esc(list[i])}"><span class="fb"><span class="fth" style="--ar:${arOf(v)}"><img alt=""></span></span><b>${esc(labs[i])}</b><small class="num">${v.dur ? fmtT(v.dur) : ''}</small></button>`).join('')}${imgs.map((im, i) => `<button class="vr im" data-gi="${i}" title="${esc(im.label)}"><span class="fb"><span class="fth" style="--ar:${(im.w / im.h).toFixed(4)}"><img class="on" alt="" src="${esc(url(im.src))}" loading="lazy"></span></span><b>${esc(chip(im.label))}</b><small>이미지</small></button>`).join('')}</div>` : '';
      if (vars) {
        $$('[data-fi]', pe.vars).forEach(b => b.addEventListener('click', () => setFmt(kind, vs, embs, +b.dataset.fi)));
        $$('[data-gi]', pe.vars).forEach(b => b.addEventListener('click', () => Lightbox.open(imgs, +b.dataset.gi, b)));
        fillThumbs($$('[data-fi] .fth img', pe.vars), vs, w);
      }
      return vars;
    };
    // 대기열·시리즈 목록(작은 썸네일·제목, 지금 작품 강조)
    const qItems = (ids, curId) => `<ol class="ql">${ids.map((id, n) => { const x = BY[id], t = thumbOf(x, 'wide'); return `<li><button data-n="${n}"${id === curId ? ' aria-current="true"' : ''}><span class="qn num">${String(n + 1).padStart(2, '0')}</span><span class="qth${t.fill ? ' fill' : ''}">${t.fill ? `<img class="bg" src="${esc(url(t.src))}" alt="" loading="lazy">` : ''}<img src="${esc(url(t.src))}" alt="" loading="lazy"></span><span class="qtx"><b>${esc(x.title)}</b><small>${esc([x.type, x.dur].filter(Boolean).join(' · '))}</small></span></button></li>`; }).join('')}</ol>`;
    const bindQ = (box, fn) => $$('[data-n]', box).forEach(b => b.addEventListener('click', () => fn(+b.dataset.n)));
    const centerCur = sc => requestAnimationFrame(() => { const c = sc && $('[aria-current]', sc); if (!c || sc.scrollHeight <= sc.clientHeight + 2) return; sc.scrollTop += c.getBoundingClientRect().top - sc.getBoundingClientRect().top - (sc.clientHeight - c.offsetHeight) / 2; });
    let qOpen = (() => { try { return sessionStorage.getItem('pf.qopen') !== '0'; } catch (e) { return true; } })();
    const QD = document.createElement('div'); QD.className = 'qdd'; QD.hidden = true; QD.setAttribute('role', 'dialog'); QD.setAttribute('aria-label', '대기열'); pe.top.appendChild(QD);
    const qddHide = () => { if (QD.hidden) return false; QD.hidden = true; QD.classList.remove('on'); const b = $('.qbtn', el.pos); if (b) b.setAttribute('aria-expanded', 'false'); return true; };
    const qddShow = () => {
      const b = $('.qbtn', el.pos); if (!b || !cur) return; QD.innerHTML = qItems(queue, cur.id); bindQ(QD, n => { qddHide(); if (queue[n] !== cur.id) jump(n); });
      const r = b.getBoundingClientRect(); QD.style.left = `${Math.round(r.left + r.width / 2)}px`; QD.hidden = false; b.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => QD.classList.add('on')); centerCur($('.ql', QD)); const c = $('[aria-current]', QD); (c || $('button', QD)).focus({ preventScroll: true });
    };
    const queueUI = () => {
      const m = modN('queue'), many = queue.length > 1, pos = el.pos.textContent, tabs = modN('ptabs') >= 2;
      pe.que.innerHTML = m === 2 && many ? (tabs ? '' : `<button class="qh" aria-expanded="${qOpen}"><b>대기열</b><span class="num">${esc(pos)}</span>${ico('chev-r', 'sm')}</button>`) + `<div class="qb"${!tabs && !qOpen ? ' hidden' : ''}>${qItems(queue, cur.id)}</div>` : '';
      if (pe.que.innerHTML) {
        bindQ(pe.que, n => { if (queue[n] !== cur.id) jump(n); });
        const h = $('.qh', pe.que); if (h) h.addEventListener('click', () => { qOpen = !qOpen; h.setAttribute('aria-expanded', qOpen); $('.qb', pe.que).hidden = !qOpen; try { sessionStorage.setItem('pf.qopen', qOpen ? '1' : '0'); } catch (e) { } if (qOpen) centerCur($('.ql', pe.que)); });
        if (!tabs) centerCur($('.ql', pe.que));
      }
      if (m === 3 && many) { el.pos.innerHTML = `<button class="qbtn" aria-haspopup="dialog" aria-expanded="false" title="대기열">${esc(pos)}${ico('chev-r', 'sm')}</button>`; $('.qbtn', el.pos).addEventListener('click', () => { if (!qddHide()) qddShow(); }); }
    };
    const serOf = w => {   // 홈 시리즈 블록(P10)과 같은 묶음: home.json series가 있으면 그것, 없으면 제목 「 — 」 앞이 같은 작품들
      const own = (S.H.series || []).find(x => (x.ids || []).includes(w.id)), g = own ? null : seriesOf().find(x => !x.id && x.eps.some(e => e.id === w.id));
      const ids = (own ? own.ids : g ? g.eps.map(e => e.id) : []).filter(id => BY[id] && posterOf(BY[id]) && !isTool(BY[id]));
      return ids.length > 1 ? { title: (own || g).title || '', ids } : null;
    };
    const seriesUI = w => {
      const s = modN('ptabs') === 3 ? serOf(w) : null;
      pe.ser.innerHTML = s ? `<h3 class="stt">${esc(s.title || '시리즈')} <small>${s.ids.length}</small></h3>${qItems(s.ids, w.id)}` : '';
      if (s) bindQ(pe.ser, n => { if (s.ids[n] !== cur.id) { queue = s.ids.slice(); jump(n); } });
    };
    // 탭(정보 · 규격 · 이미지 소재 · 시리즈 · 대기열 · 비슷한 작업) — 있는 것만, APG 탭(←→·Home·End)
    let ptab = 'info';
    const TABN = { info: '정보', vars: '규격', gal: '이미지 소재', ser: '시리즈', que: '대기열', sim: '비슷한 작업' };
    const panelTabs = () => {
      const SEC = { info: el.desc, vars: pe.vars, gal: el.gal, ser: pe.ser, que: pe.que, sim: el.sim };
      const have = Object.keys(TABN).filter(k => SEC[k].innerHTML.trim()), on = modN('ptabs') >= 2 && have.length > 1;
      el.panel.classList.toggle('tabs', on); pe.ptl.hidden = !on;
      Object.entries(SEC).forEach(([k, s]) => { ['role', 'aria-labelledby', 'tabindex', 'id'].forEach(a => s.removeAttribute(a)); s.hidden = !have.includes(k); });
      if (!on) { pe.ptl.innerHTML = ''; return; }
      if (!have.includes(ptab)) ptab = 'info';
      const cnt = k => ({ gal: $$('.gg > *', el.gal).length, vars: $$('.vr', pe.vars).length, ser: $$('.ql li', pe.ser).length })[k];
      pe.ptl.innerHTML = have.map(k => `<button role="tab" id="pt-${k}" aria-controls="pp-${k}" data-k="${k}">${TABN[k]}${cnt(k) ? ` <small class="num">${cnt(k)}</small>` : ''}</button>`).join('');
      have.forEach(k => { const s = SEC[k]; s.id = `pp-${k}`; s.setAttribute('role', 'tabpanel'); s.setAttribute('aria-labelledby', `pt-${k}`); s.tabIndex = 0; });
      const sel = (k, focus) => {
        ptab = k; $$('[role=tab]', pe.ptl).forEach(b => { const a = b.dataset.k === k; b.setAttribute('aria-selected', a); b.tabIndex = a ? 0 : -1; if (a && focus) b.focus(); });
        have.forEach(x => { SEC[x].hidden = x !== k; }); const s = SEC[k]; s.scrollTop = 0; s.classList.remove('tin'); void s.offsetWidth; s.classList.add('tin');
        if (k === 'que' || k === 'ser') centerCur(s);
      };
      $$('[role=tab]', pe.ptl).forEach(b => b.addEventListener('click', () => sel(b.dataset.k)));
      pe.ptl.onkeydown = e => { const i = have.indexOf(ptab), m = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: have.length - 1 }[e.key]; if (m === undefined) return; e.preventDefault(); e.stopPropagation(); sel(have[(m + have.length) % have.length], true); };
      sel(ptab);
    };
    // 공유 링크 — 공유용 w/<id>.html(메신저 미리보기 카드) · 3이면 「지금 장면부터」(?t=초)
    const SB = document.createElement('button'); SB.className = 'ib shb'; SB.hidden = true; SB.title = '링크 복사'; SB.setAttribute('aria-label', '링크 복사'); SB.innerHTML = I_LINK; pe.r.prepend(SB);
    const SP = document.createElement('div'); SP.className = 'shp'; SP.hidden = true; SP.setAttribute('role', 'dialog'); SP.setAttribute('aria-label', '공유');
    SP.innerHTML = '<label><input type="checkbox"><span class="num"></span></label><button class="btn sm">링크 복사</button>'; pe.top.appendChild(SP);
    const SK = document.createElement('div'); SK.className = 'shok'; SK.setAttribute('role', 'status'); pe.top.appendChild(SK);
    let shAt = 0, shT = 0;
    const shareUrl = t => new URL(`${BASE}w/${encodeURIComponent(cur.id)}.html${t > 0 ? `?t=${t}` : ''}`, location.href).href;
    const copyText = async s => { try { await navigator.clipboard.writeText(s); return true; } catch (e) { const ta = document.createElement('textarea'); ta.value = s; ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'; T.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) { } ta.remove(); return ok; } };
    const atBtn = x => { const r = SB.getBoundingClientRect(); x.style.right = `${Math.round(innerWidth - r.right)}px`; };
    const copied = ok => { SB.innerHTML = ok ? I_OK : I_LINK; SK.textContent = ok ? '링크 복사됨' : '복사하지 못함'; atBtn(SK); SK.classList.add('on'); clearTimeout(shT); shT = setTimeout(() => { SK.classList.remove('on'); SB.innerHTML = I_LINK; }, 1800); };
    const shareHide = () => { if (SP.hidden) return false; SP.hidden = true; SP.classList.remove('on'); SB.setAttribute('aria-expanded', 'false'); return true; };
    SB.addEventListener('click', async () => {
      if (!cur) return; if (shareHide()) return;
      const t = kindOf(cur) === 'video' ? Math.floor(V.currentTime || 0) : 0;
      if (modN('share') !== 3 || t < 1) return copied(await copyText(shareUrl(0)));
      shAt = t; $('span', SP).textContent = `${fmtT(t)}부터 시작`; $('input', SP).checked = false; atBtn(SP);
      SP.hidden = false; SB.setAttribute('aria-expanded', 'true'); requestAnimationFrame(() => SP.classList.add('on')); $('button', SP).focus({ preventScroll: true });
    });
    $('button', SP).addEventListener('click', async () => { const ok = await copyText(shareUrl($('input', SP).checked ? shAt : 0)); shareHide(); copied(ok); SB.focus({ preventScroll: true }); });
    // 쇼릴 — 2·3 스토리식(작품 수만큼 나뉜 진행 막대 · 끝나면 바로 다음 · 왼쪽 ⅓ 누르면 이전/나머지 다음 · 누르고 있으면 멈춤), 3은 정보 패널 숨김(I 키). 하이라이트면 피처드 구간만
    let reel = null, reelArm = null, rRaf = 0, rPre = null, rHoldT = 0, rHeld = false, rWas = false, pendAt = 0;
    const RB = document.createElement('div'); RB.className = 'rbar'; RB.setAttribute('aria-hidden', 'true');
    const RZ = document.createElement('div'); RZ.className = 'rzone'; RZ.innerHTML = '<i data-d="-1"></i><i data-d="1"></i>';
    const IB = document.createElement('button'); IB.className = 'ib rinfo'; IB.hidden = true; IB.title = '정보 (I)'; IB.setAttribute('aria-label', '정보 패널'); IB.innerHTML = I_INFO; pe.r.prepend(IB);
    const reelOn = () => !!reel && (reel.cut || reel.ui >= 2);   // 쇼릴이 넘김을 맡음(1번·전체면 지금처럼 카운트다운)
    const reelStart = (q, cut) => { reelArm = { cut: !!cut, ui: modN('reelui') }; open(q[0], { queue: q, autoplay: true, ...(cut ? { at: segOf(BY[q[0]])[0] } : {}) }); };
    const reelStop = () => { if (!reel) return; reel = null; cancelAnimationFrame(rRaf); RB.remove(); RZ.remove(); IB.hidden = true; T.removeAttribute('data-reel'); delete T.dataset.reelui; T.classList.remove('pinfo', 'rhold'); if (rPre) { killVideo(rPre); rPre = null; } };
    const reelFill = () => {
      if (!reel || !RB.isConnected) return; const d = V.duration || 0, [a, b] = reel.seg || [0, d], e = d ? Math.min(b, d) : b;
      const p = reel.done ? 1 : e > a ? Math.max(0, Math.min(1, ((V.currentTime || 0) - a) / (e - a))) : 0;
      [...RB.children].forEach((s, k) => { s.firstChild.style.transform = `scaleX(${k < idx ? 1 : k > idx ? 0 : p})`; });
    };
    const reelLoop = () => { cancelAnimationFrame(rRaf); if (!reel || V.paused) return; reelFill(); rRaf = requestAnimationFrame(reelLoop); };
    const reelAdv = () => { if (!reelOn() || reel.adv === cur.id) return; reel.adv = cur.id; if (idx + 1 < queue.length) jump(idx + 1); else { reel.done = true; V.pause(); reelFill(); } };
    const reelGo = d => {
      if (!reel) return;
      if (d > 0) { if (idx + 1 < queue.length) { reel.adv = cur.id; jump(idx + 1); } else close(); }
      else if (idx > 0) jump(idx - 1); else { V.currentTime = reel.seg ? reel.seg[0] : 0; V.play().catch(() => { }); }
    };
    const reelPre = () => {   // 하이라이트면 다음 작품 구간 앞부분을 미리 받아 둠(끊김 없이 넘어가게)
      if (rPre || !reel.cut || SAVE) return; const [a, b] = reel.seg; if (V.currentTime < a + (b - a) * .4) return;
      const n = BY[queue[idx + 1]], v = n && vidsOf(n)[0]; if (!v) return; const a2 = segOf(n)[0];
      rPre = document.createElement('video'); rPre.muted = true; rPre.preload = 'auto'; const pv = rPre;
      if (a2 > .05) pv.addEventListener('loadedmetadata', () => { pv.currentTime = a2; }, { once: true }); pv.src = url(pickBig(v));
    };
    const reelRender = w => {
      if (reelArm) { reel = { ...reelArm, key: queue.join('|') }; reelArm = null; } else if (reel && queue.join('|') !== reel.key) reelStop();   // 다른 줄로 옮기면 쇼릴 끝
      if (rPre) { const o = rPre; rPre = null; setTimeout(() => killVideo(o), 4000); }
      if (!reel) return;
      Object.assign(reel, { seg: reel.cut ? segOf(w) : null, sought: false, adv: null, done: false });
      T.toggleAttribute('data-reel', reelOn()); if (reel.ui >= 2) T.dataset.reelui = reel.ui; else delete T.dataset.reelui; IB.hidden = reel.ui !== 3;
      if (reel.ui >= 2 && kindOf(w) === 'video') { RB.innerHTML = queue.map(() => '<i><b></b></i>').join(''); el.vw.before(RB); el.vw.append(RZ); RB.style.width = `${el.vw.offsetWidth}px`; reelFill(); } else { RB.remove(); RZ.remove(); }   // 진행 막대는 영상 바로 위(영상을 가리지 않음)
    };
    V.addEventListener('loadedmetadata', () => {
      if (pendAt > 0) { if (pendAt < V.duration - .5) V.currentTime = pendAt; pendAt = 0; }
      if (reel && reel.seg && !reel.sought) { reel.sought = true; const a = reel.seg[0]; if (a > .05 && Math.abs(V.currentTime - a) > .25) V.currentTime = a; }
      reelFill();
    });
    V.addEventListener('timeupdate', () => { if (!reelOn()) return; reelFill(); const d = V.duration || 0; if (reel.seg ? reel.sought && V.currentTime >= Math.min(reel.seg[1], d || 1e9) - .1 : V.loop && d && V.currentTime >= d - .35) reelAdv(); else if (reel.seg) reelPre(); });
    V.addEventListener('ended', () => { if (reelOn()) reelAdv(); });
    V.addEventListener('play', () => { if (reel && reel.done) { reel.done = false; jump(0); return; } reelLoop(); });
    V.addEventListener('pause', () => cancelAnimationFrame(rRaf));
    if (window.ResizeObserver) new ResizeObserver(() => { if (RB.isConnected) RB.style.width = `${el.vw.offsetWidth}px`; }).observe(el.vw);   // 막대 폭 = 영상 폭
    RZ.addEventListener('contextmenu', e => e.preventDefault());
    RZ.addEventListener('pointerdown', e => { if (!reel || e.button > 0) return; clearTimeout(rHoldT); rHeld = false; rHoldT = setTimeout(() => { rHeld = true; rWas = !V.paused; V.pause(); T.classList.add('rhold'); }, 220); });
    const rRelease = () => { clearTimeout(rHoldT); if (!rHeld) return false; rHeld = false; T.classList.remove('rhold'); if (rWas) V.play().catch(() => { }); return true; };
    RZ.addEventListener('pointerup', e => {
      if (rRelease() || !reel) return; const z = e.target.closest('[data-d]'); if (!z) return;
      if (V.paused) { if (reel.done) jump(0); else V.play().catch(() => { }); return; }   // 멈춘 화면은 누르면 재생
      reelGo(+z.dataset.d);
    });
    RZ.addEventListener('pointerleave', rRelease); RZ.addEventListener('pointercancel', rRelease);
    IB.addEventListener('click', () => T.classList.toggle('pinfo'));
    T.addEventListener('pointerdown', e => { if (!e.target.closest('.shp,.shb')) shareHide(); if (!e.target.closest('.qdd,.qbtn')) qddHide(); });
    addEventListener('keydown', e => {   // 상영관 단축키보다 먼저: 덮개 닫기(Esc) · 스토리식 쇼릴 ←→ = 이전·다음, I = 정보
      if (!T.classList.contains('on') || Lightbox.on) return; const k = e.key, a = document.activeElement;
      if (k === 'Escape' && (shareHide() || qddHide())) { e.stopPropagation(); e.preventDefault(); return; }
      if (!reel || reel.ui < 2 || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || (a && (/^(INPUT|TEXTAREA)$/.test(a.tagName) || a.closest('[role=tablist],.pg')))) return;
      if (k === 'ArrowLeft' || k === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); reelGo(k === 'ArrowLeft' ? -1 : 1); }
      else if ((k === 'i' || k === 'I') && reel.ui === 3) { e.stopPropagation(); T.classList.toggle('pinfo'); }
    }, true);
    new MutationObserver(() => { if (!T.classList.contains('on')) { reelStop(); shareHide(); qddHide(); Lightbox.close(); } }).observe(T, { attributes: true, attributeFilter: ['class'] });
    const panelX = w => {   // render 끝에서: 대기열 · 시리즈 · 탭 · 공유 · 쇼릴 상태
      if (ptab !== 'ser' && ptab !== 'que') ptab = 'info';
      queueUI(); seriesUI(w); panelTabs(); el.panel.scrollTop = 0;
      SB.hidden = modN('share') < 2; shareHide(); qddHide();
      reelRender(w);
    };
    const jump = n => {
      if (n < 0 || n >= queue.length) return; if (MINI) return miniGo(n);
      const dir = queue === qRef ? (Math.sign(n - idx) || 1) : 1, gs = ghosts(); qRef = queue;   // P27 넘김 방향(다른 목록으로 옮기면 앞으로)
      mvOff(false); handoffPre(); idx = n; cur = BY[queue[idx]]; T.dataset.cur = cur.id; autoplay = true; wantMV = tmod('multi') === 3 && mvOK(cur);
      render(cur); after(); tnext(gs, dir); wake(); el.lay.scrollTop = 0; hist.replace(hist.st(), `${location.pathname}?w=${encodeURIComponent(cur.id)}`);
    };
    const open = (id, opt = {}) => {   // 상영관은 페이드로 나타남 · opt.at = 시작 초 · opt.resume = 미니 플레이어에서 그대로 복귀(P29)
      const w = BY[id]; if (!w) return; const resume = !!(opt.resume && MINI && cur === w);
      const cf = resume || opt.at != null ? null : contFrom(w, +opt.vi || 0); opt.before && opt.before(); if (!resume) lastFocus = document.activeElement;   // P02 이어 보기
      window.__featPause && window.__featPause(); if (MINI) miniOff(resume); keys(false);
      if (!resume) {
        mvOff(false); clearPre(); queue = (opt.queue && opt.queue.length ? opt.queue : [id]).filter(x => BY[x]); idx = Math.max(0, queue.indexOf(id)); autoplay = opt.autoplay !== false;
        qRef = queue; origin = EDIT ? null : originOf(); pendingAt = opt.at != null ? Math.max(0, +opt.at || 0) : cf ? cf.t : 0; wantMV = tmod('multi') === 3 && mvOK(w);
      }
      cur = w; T.dataset.cur = w.id; T.classList.add('on'); document.body.style.overflow = 'hidden';
      if (resume) { document.title = `${w.title} — HANSY`; msSet(); }
      else { render(w); if (opt.vi) { const b = $(`[data-fi="${+opt.vi}"]`, T); b && b.click(); } after(); if (cf) holdFrame(cf.c); el.lay.scrollTop = 0; }   // vi: 그 규격·회차로 바로(확장 카드 규격 아이콘·시리즈 블록)
      wake(); ambOn(); T.tabIndex = -1; Modal.open(T); T.focus({ preventScroll: true });   // 뒤 페이지 inert(P50)
      T.scrollTop = 0; if (opt.info) { if (WIDE && tmod('wide') === 2) wideSet(false); setTimeout(toInfo, 350); }
      const u = `${location.pathname}?w=${encodeURIComponent(id)}`;
      if (opt.replace) { pushed = false; hist.replace(null, u); } else if (pushed) hist.replace({ t: 1 }, u); else { pushed = true; scrollKeep(true); hist.push({ t: 1 }, u); }   // P19: 닫을 때 뒤로가기 스크롤 복원이 「제자리」를 덮지 않게
    };
    const scrollKeep = on => { try { history.scrollRestoration = on ? 'manual' : 'auto'; } catch (e) { } };   // 상영관 동안만 manual — 페이지 사이 뒤로가기는 브라우저 복원 그대로
    const close = (fromPop = false) => {
      if (!T.classList.contains('on')) return;
      const mini = tmod('mini') === 2 && !!cur && kindOf(cur) === 'video' && !V.paused && !V.ended && !document.pictureInPictureElement;   // P29 재생 중이면 미니 플레이어로
      if (fsEl()) fullToggle(); keys(false); mvOff(false); clearPre(); ambOff();
      T.classList.remove('on'); Modal.close(T); document.body.style.overflow = ''; clearInterval(cdT); el.next.classList.remove('on');
      if (frame) { frame.remove(); frame = null; }
      if (mini) miniShow(); else V.pause(); if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => { });
      if (!fromPop) { if (pushed) { pushed = false; addEventListener('popstate', () => scrollKeep(false), { once: true }); try { history.back(); } catch (e) { scrollKeep(false); } } else hist.replace(null, location.pathname); } else { pushed = false; scrollKeep(false); }
      document.title = document.body.dataset.title || document.title;
      const back = land() || lastFocus; back && back.focus && back.focus({ preventScroll: true }); Snd.closed(V); window.__featResume && window.__featResume(); msSet();   // P19 마지막으로 본 작품 카드로
    };
    addEventListener('popstate', () => { if (T.classList.contains('on')) close(true); });
    const toggle = () => { if (!cur || kindOf(cur) !== 'video') return; V.paused ? V.play().catch(() => { }) : V.pause(); };
    const toInfo = () => { T.scrollTop = 0; el.lay.scrollTo({ top: Math.max(0, el.panel.offsetTop - 16), behavior: RM ? 'auto' : 'smooth' }); };
    $('.close', T).addEventListener('click', () => close());
    el.pp.addEventListener('click', toggle); el.vw.addEventListener('click', e => { if (e.target === V || e.target.closest('.big')) toggle(); });
    $('.prev', T).addEventListener('click', () => jump(idx - 1)); $('.nxt', T).addEventListener('click', () => jump(idx + 1));
    el.mute.addEventListener('click', () => muteSet(!isMuted()));
    V.addEventListener('volumechange', () => { if (!MV) { MUTED = V.muted; saveMuted(); } muteIcon(); });   // 멀티뷰 중에는 소리 상태를 MUTED가 맡음(칸별 음소거와 섞이지 않게)
    let bufT = null; V.addEventListener('waiting', () => { clearTimeout(bufT); bufT = setTimeout(() => el.vw.classList.add('buffering'), 600); });
    ['playing', 'canplay', 'pause', 'emptied'].forEach(ev => V.addEventListener(ev, () => { clearTimeout(bufT); el.vw.classList.remove('buffering'); }));
    document.addEventListener('fullscreenchange', () => { if (fsEl() && !MV && !DOWN && el.vw.contains(V) && V.dataset.hd && !V.currentSrc.endsWith(V.dataset.hd.replace(/^\.\//, ''))) { const t = V.currentTime, pl = !V.paused; V.src = V.dataset.hd; V.addEventListener('loadedmetadata', () => { V.currentTime = t; if (pl) V.play().catch(() => { }); }, { once: true }); } });
    $('.full', T).addEventListener('click', () => fullToggle());   // P16: 영상 칸만이 아니라 무대 전체(진행 바·버튼 포함)
    const pipB = $('.pipb', T); if (!document.pictureInPictureEnabled) pipB.remove();
    else pipB.addEventListener('click', () => { if (cur && kindOf(cur) === 'video') (document.pictureInPictureElement ? document.exitPictureInPicture() : V.requestPictureInPicture()).catch(() => { }); });
    $('.cancel', el.next).addEventListener('click', e => { e.stopPropagation(); clearInterval(cdT); el.next.classList.remove('on'); el.next.dataset.dismissed = '1'; });
    el.next.addEventListener('click', () => jump(idx + 1)); el.next.addEventListener('keydown', e => { if (e.key === 'Enter') jump(idx + 1); });
    V.addEventListener('loadedmetadata', () => { if (V.videoWidth && V.videoHeight && el.vw.contains(V) && !MV) setAspect(V.videoWidth, V.videoHeight); miniSize(); });
    V.addEventListener('play', () => { el.pp.innerHTML = ico('pause'); el.pp.setAttribute('aria-label', '일시정지'); el.vw.classList.remove('paused'); });
    V.addEventListener('pause', () => { el.pp.innerHTML = ico('play'); el.pp.setAttribute('aria-label', '재생'); el.vw.classList.add('paused'); });
    V.addEventListener('timeupdate', () => {
      const p = V.duration ? V.currentTime / V.duration : 0; el.pgi.style.width = (p * 100) + '%';
      el.cur.textContent = fmtT(V.currentTime); el.durE.textContent = V.duration ? '-' + fmtT(V.duration - V.currentTime) : '0:00'; el.pg.setAttribute('aria-valuenow', Math.round(p * 100)); el.pg.setAttribute('aria-valuetext', `${fmtT(V.currentTime)} / ${fmtT(V.duration)}`);   // 화면 낭독: 「0:12 / 0:20」(P50)
    });
    V.addEventListener('ended', () => onEnded());   // P20 끝났을 때(ended 모듈) — 진행 바 끌기는 아래 재생 코어(P15)
    const wake = () => { T.classList.remove('idle'); clearTimeout(idleT); if (cur && kindOf(cur) === 'video' && !V.paused && el.lay.scrollTop < 40) idleT = setTimeout(() => T.classList.add('idle'), 3000); };
    ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach(ev => T.addEventListener(ev, wake, { passive: true }));
    el.lay.addEventListener('scroll', wake, { passive: true }); V.addEventListener('play', wake); V.addEventListener('pause', wake);
    document.addEventListener('keydown', e => {   // 유튜브·넷플릭스와 같은 키(P16) — 한글 입력 상태에서도 같은 자리 키로 동작
      const a = document.activeElement;
      if (!T.classList.contains('on') || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) return;
      const k = e.key, L = /^[a-z]$/i.test(k) ? k.toLowerCase() : (k.length === 1 && k.charCodeAt(0) > 127 && /^Key[A-Z]$/.test(e.code)) ? e.code.slice(3).toLowerCase() : '';
      if (keysOpen()) { if (k === 'Escape' || k === '?' || k === 'Tab') { e.preventDefault(); if (k !== 'Tab') keys(false); } return; }
      const F = fsEl(); if (k === 'Tab' && F) { const f = $$('button,a[href],[tabindex="0"]', F).filter(x => !x.hidden && x.offsetParent !== null); if (f.length && (e.shiftKey ? a === f[0] || !F.contains(a) : a === f[f.length - 1] || !F.contains(a))) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); } return; }   // 전체 화면 안에서만 돌게
      if (e.ctrlKey || e.metaKey || e.altKey) return;   // 브라우저 단축키(Ctrl+F·⌘L 등)는 그대로
      const vid = !!cur && kindOf(cur) === 'video', inPanel = el.panel.contains(a);
      if (k === 'Escape') { if (F) fullToggle(); else if (performance.now() - fsOut > 300) close(); }
      else if (k === '?') { e.preventDefault(); keys(true); }
      else if (k === ' ' || L === 'k') { e.preventDefault(); if (!e.repeat) toggle(); }
      else if (e.shiftKey && (L === 'n' || L === 'p')) { if (!e.repeat) jump(idx + (L === 'n' ? 1 : -1)); }
      else if (k === 'ArrowLeft') { e.shiftKey ? jump(idx - 1) : seekBy(-5); }
      else if (k === 'ArrowRight') { e.shiftKey ? jump(idx + 1) : seekBy(5); }
      else if (L === 'j') seekBy(-10); else if (L === 'l') seekBy(10);
      else if ((k === 'ArrowUp' || k === 'ArrowDown') && vid && !inPanel) { e.preventDefault(); vol(k === 'ArrowUp' ? .05 : -.05); }
      else if ((k === 'Home' || k === 'End') && vid && !inPanel) { e.preventDefault(); if (V.duration) V.currentTime = k === 'Home' ? 0 : V.duration; }
      else if ((k === ',' || k === '.') && vid) frameStep(k === ',' ? -1 : 1);
      else if ((k === '<' || k === '>') && vid) speed(k === '>' ? 1 : -1);
      else if (/^[0-9]$/.test(k) && V.duration) V.currentTime = V.duration * (+k / 10);
      else if (L === 'm') { if (!e.repeat) muteSet(!isMuted()); } else if (L === 'f') { if (!e.repeat) fullToggle(); } else if (L === 'p' && T.contains(pipB)) { if (!e.repeat) pipB.click(); }
      else if (L === 't' && tmod('wide') === 2 && innerWidth >= 1100) { if (!e.repeat) wideSet(!WIDE); }
    });

    /* ===== 재생 코어(T1) — P02 이어 보기(cont) · P15 장면 미리보기 · P16 단축키·미디어 키·전체 화면 · P18 미리 받기·화질 · P19 제자리 · P20 끝(ended) · P23 멀티뷰(multi) · P24 극장 모드(wide) · P26 앰비언트(liveamb) · P27 넘김 모션(tnext) · P29 미니(mini). B 모듈은 1번이면 지금 그대로 ===== */
    const tmod = k => EDIT ? 1 : (+document.body.dataset[k] || 1);
    const stg = el.vw.parentElement, absU = p => new URL(url(p), location.href).href;
    const svgT = d => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
    const ICT = { re: svgT('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v3.8h3.8"/>'), wide: svgT('<rect x="2.5" y="6.5" width="19" height="11" rx="1.5"/>'), narrow: svgT('<rect x="6" y="6.5" width="12" height="11" rx="1.5"/>'), shrink: svgT('<path d="M20 10h-6V4M4 14h6v6M14 10l6.5-6.5M10 14l-6.5 6.5"/>'), all: svgT('<rect x="2.5" y="6" width="9" height="12" rx="1.5"/><rect x="13.5" y="8" width="8" height="8" rx="1.5"/>') };
    $('.top .r', T).insertAdjacentHTML('afterbegin', '<button class="ib wideb" aria-pressed="false"></button>');
    el.vw.insertAdjacentHTML('beforeend', `<div class="osd" aria-hidden="true"></div><div class="endcard"><button class="btn ghost re">${ICT.re}다시 보기</button><button class="btn nx">다음 작품${ico('next', 'sm')}</button></div>`);
    el.pg.insertAdjacentHTML('beforeend', '<span class="tip" aria-hidden="true"><span class="fr"></span><b class="num"></b></span>');
    $('.bt', el.ctl).insertAdjacentHTML('beforeend', `<span class="rt"><button class="auto" role="switch" aria-checked="true" aria-label="자동 재생"></button><button class="ib fsx" title="전체 화면 나가기 (F)" aria-label="전체 화면 나가기">${ICT.shrink}</button></span>`);

    // P02 이어 보기: 피처드·확장 카드가 이 작품을 재생 중이면 그 위치에서(2 = 둘 다 · 3 = 피처드만) — 열 때 opt.at(초)이 있으면 그 값
    let pendingAt = 0, wantT = 0;
    const sameLen = (a, b) => !!a && !!b && Math.abs((a.dur || 0) - (b.dur || 0)) < 1;
    const playsFile = (p, v) => !!v && [v.hd, v.sd].filter(Boolean).some(f => absU(f) === (p.currentSrc || p.src));
    const grab = (p, max = 960) => { try { const s = Math.min(1, max / p.videoWidth), c = document.createElement('canvas'); c.width = Math.round(p.videoWidth * s); c.height = Math.round(p.videoHeight * s); c.getContext('2d').drawImage(p, 0, 0, c.width, c.height); return c; } catch (e) { return null; } };
    const contFrom = (w, to) => {
      const m = tmod('cont'), vs = vidsOf(w), base = vs[to] || vs[0]; if (m === 1 || kindOf(w) !== 'video' || !base) return null;
      const fv = Feat.video, ps = [fv && fv.parentElement && fv.parentElement.dataset.id === w.id ? fv : null, m === 2 ? $$('.pop.on .art video').pop() : null].filter(Boolean);
      for (const p of ps) {
        const k = vs.findIndex(v => playsFile(p, v));
        if (k < 0 || p.readyState < 2 || p.currentTime < .3 || !sameLen(vs[k], base) || p.currentTime > (base.dur || p.duration || 0) - 1.5) continue;
        return { t: p.currentTime, c: k === to ? grab(p) : null };
      }
      return null;
    };
    const holdFrame = c => {   // 미리보기 마지막 장면을 상영관 영상이 그 위치에서 나올 때까지 덮어 둠(포스터로 돌아가는 깜빡임 없음)
      if (!c || !el.vw.contains(V)) return; c.className = 'contf'; V.after(c); let done = false;
      const off = () => { if (done) return; done = true; V.removeEventListener('seeked', on); V.removeEventListener('playing', on); c.classList.add('off'); setTimeout(() => c.remove(), 320); };
      const on = () => { if (V.currentTime > .1) off(); };
      V.addEventListener('seeked', on); V.addEventListener('playing', on); setTimeout(off, 3000);
    };
    V.addEventListener('loadedmetadata', () => { wantT = 0; });

    // P15 진행 바 장면 미리보기: 빌드의 필름스트립(30장면 한 장, 처음 올릴 때 받음) — 지금 규격 영상과 같은 파일일 때만
    const tip = $('.tip', el.pg), tipF = $('.fr', tip), tipT = $('b', tip); let tipSrc = '', drag = false, dragP = 0, seekQ = null;
    const filmOf = () => { const x = cur && S.X[cur.id], v = cur && vidsOf(cur)[vi], f = x && x.film && x.film[vi]; return f && v && f.from === v.hd && f.n ? f : null; };
    const tipAt = cx => {
      if (!V.duration) return;
      const r = el.pg.getBoundingClientRect(), p = Math.min(1, Math.max(0, (cx - r.left) / r.width)), f = filmOf();
      tipT.textContent = fmtT(p * V.duration); tip.classList.toggle('img', !!f);
      if (f) {
        const ar = f.fw / f.fh; let h = Math.min(120, Math.sqrt(14400 / ar)), w = h * ar; if (w > 160) { w = 160; h = w / ar; }
        const k = Math.min(f.n - 1, Math.round(p * f.n)), s = url(f.src); w = Math.round(w); h = Math.round(h);
        if (tipSrc !== s) { tipSrc = s; tipF.style.backgroundImage = `url('${s}')`; }
        Object.assign(tipF.style, { width: w + 'px', height: h + 'px', backgroundSize: `${w * f.n}px ${h}px`, backgroundPosition: `${-k * w}px 0` });
      }
      const half = (tip.offsetWidth || 48) / 2; tip.style.left = Math.min(r.width - half, Math.max(half, p * r.width)) + 'px'; tip.classList.add('on');
    };
    const scrub = t => { if (V.seeking) seekQ = t; else V.currentTime = t; };   // 끄는 동안은 앞 탐색이 끝나야 다음 탐색(디코더 과부하 없이)
    V.addEventListener('seeked', () => { if (seekQ === null) return; const t = seekQ; seekQ = null; V.currentTime = t; });
    el.pg.addEventListener('pointermove', e => { if (!drag && e.pointerType === 'mouse') tipAt(e.clientX); });
    el.pg.addEventListener('pointerleave', () => { if (!drag) tip.classList.remove('on'); });
    el.pg.addEventListener('pointerdown', e => {
      if (e.button || !V.duration) return; drag = true; el.pg.classList.add('drag'); try { el.pg.setPointerCapture(e.pointerId); } catch (x) { }
      const at = cx => { const r = el.pg.getBoundingClientRect(); dragP = Math.min(1, Math.max(0, (cx - r.left) / r.width)); el.pgi.style.width = dragP * 100 + '%'; tipAt(cx); scrub(dragP * V.duration); };
      const mv = ev => at(ev.clientX), up = ev => {
        drag = false; seekQ = null; el.pg.classList.remove('drag'); if (V.duration) V.currentTime = Math.min(dragP * V.duration, V.duration);
        el.pg.removeEventListener('pointermove', mv); el.pg.removeEventListener('pointerup', up); el.pg.removeEventListener('pointercancel', up);
        if (ev.pointerType !== 'mouse' || !el.pg.matches(':hover')) tip.classList.remove('on');
      };
      el.pg.addEventListener('pointermove', mv); el.pg.addEventListener('pointerup', up); el.pg.addEventListener('pointercancel', up); at(e.clientX);
    });

    // P16 단축키·소리·속도(잠깐 뜨는 표시) · 단축키 표(?)
    const osdE = $('.osd', el.vw); let osdT = 0;
    const say = h => { osdE.innerHTML = h; osdE.classList.add('on'); clearTimeout(osdT); osdT = setTimeout(() => osdE.classList.remove('on'), 900); };
    const isMuted = () => MV ? MUTED : V.muted;
    const saveMuted = () => { try { sessionStorage.setItem('pf.muted', MUTED ? '1' : '0'); } catch (e) { } };
    const muteIcon = () => { const m = isMuted(); el.mute.innerHTML = ico(m ? 'mute' : 'vol'); el.mute.setAttribute('aria-label', m ? '음소거 해제' : '음소거'); };
    const muteSet = m => { if (MV) { MUTED = m; saveMuted(); route(); muteIcon(); } else V.muted = m; };
    let VOL = (() => { try { const v = parseFloat(sessionStorage.getItem('pf.vol')); return v >= 0 && v <= 1 ? v : 1; } catch (e) { return 1; } })(); if (VOL < 1) V.volume = VOL;
    const vol = d => {
      VOL = Math.round(Math.min(1, Math.max(0, VOL + d)) * 20) / 20; V.volume = VOL; if (MV) MV.tiles.forEach(t => { t.el.volume = VOL; });
      if (d > 0 && isMuted()) muteSet(false); try { sessionStorage.setItem('pf.vol', VOL); } catch (e) { }
      say(`${ico(!VOL || isMuted() ? 'mute' : 'vol')}<b class="num">${Math.round(VOL * 100)}%</b>`);
    };
    const RATES = [.25, .5, .75, 1, 1.25, 1.5, 1.75, 2]; let rate = 1;
    const speed = d => { rate = RATES[Math.max(0, Math.min(RATES.length - 1, RATES.indexOf(rate) + d))]; V.defaultPlaybackRate = V.playbackRate = rate; say(`<b class="num">${rate}×</b>`); };
    const seekBy = d => { if (V.duration) V.currentTime = Math.max(0, Math.min(V.duration, V.currentTime + d)); };
    const frameStep = d => { if (!V.duration) return; if (!V.paused) V.pause(); seekBy(d / 30); };
    let KB = null;
    const keysOpen = () => !!KB && !KB.hidden;
    const keys = on => {
      if (!on) { if (keysOpen()) { KB.hidden = true; KB.classList.remove('on'); Modal.close(KB); T.focus({ preventScroll: true }); } return; }
      if (!KB) { KB = document.createElement('div'); KB.className = 'keys'; KB.setAttribute('role', 'dialog'); KB.setAttribute('aria-modal', 'true'); KB.setAttribute('aria-label', '단축키'); KB.tabIndex = -1; KB.addEventListener('click', e => { if (!e.target.closest('.kb')) keys(false); }); }
      const R = [[['Space', 'K'], '재생 · 일시정지'], [['←', '→'], '5초 이동'], [['J', 'L'], '10초 이동'], [['↑', '↓'], '소리 크기'], [['M'], '소리 끄기'], [['0', '9'], '그 위치로'], [['Home', 'End'], '처음 · 끝'], [[',', '.'], '한 프레임'], [['<', '>'], '재생 속도'], [['Shift', 'N'], '다음 작품'], [['Shift', 'P'], '이전 작품'], [['F'], '전체 화면'], T.contains(pipB) && [['P'], '작게 보기'], tmod('wide') === 2 && [['T'], '극장 모드'], [['Esc'], '닫기']].filter(Boolean);
      KB.innerHTML = `<div class="kb"><h2>단축키</h2><dl>${R.map(([ks, t]) => `<div><dt>${t}</dt><dd>${ks.map(k => `<kbd>${k}</kbd>`).join('')}</dd></div>`).join('')}</dl></div>`;
      (fsEl() || T).appendChild(KB); KB.hidden = false; Modal.open(KB); requestAnimationFrame(() => KB.classList.add('on')); KB.focus({ preventScroll: true });   // 덮개: 뒤(상영관) inert(P50 공용)
    };

    // P16 전체 화면 = 무대 전체(진행 바·버튼 유지) · 영상 더블클릭 = 전체 화면
    const fsEl = () => { const f = document.fullscreenElement || document.webkitFullscreenElement; return f && T.contains(f) ? f : null; };
    const fullToggle = () => {
      if (document.fullscreenElement || document.webkitFullscreenElement) { const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document); r && r.catch && r.catch(() => { }); return; }
      if (stg.requestFullscreen) stg.requestFullscreen({ navigationUI: 'hide' }).catch(() => { });
      else if (stg.webkitRequestFullscreen) stg.webkitRequestFullscreen();
      else if (V.webkitEnterFullscreen && el.vw.contains(V)) V.webkitEnterFullscreen();
    };
    let fsOut = 0;
    const onFs = () => { if (!fsEl()) fsOut = performance.now(); if (keysOpen()) keys(false); mvLayout(); wake(); };
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
    el.vw.addEventListener('dblclick', e => { if (!e.target.closest('.next,.endcard,button,.rzone')) fullToggle(); });
    $('.fsx', el.ctl).addEventListener('click', fullToggle);

    // P16 미디어 세션: 키보드·이어폰 미디어 키, OS 미디어 패널(제목·썸네일·이전/다음·10초 이동·위치)
    const MS = 'mediaSession' in navigator ? navigator.mediaSession : null;
    const msAct = (a, f) => { try { MS.setActionHandler(a, f); } catch (e) { } };
    const msLive = () => (T.classList.contains('on') || !!MINI) && !!cur && kindOf(cur) === 'video';
    const msSet = () => {
      if (!MS) return; const L = msLive();
      try { MS.metadata = L ? new MediaMetadata({ title: cur.title, artist: '김한결 Hansy', album: (cur.kinds || []).map(k => KINDS[k]).filter(Boolean).join(' · '), artwork: [{ src: absU(thumbOf(cur, 'wide').src) }, { src: absU(posterOf(cur)) }] }) : null; } catch (e) { }
      msAct('play', L ? () => V.play().catch(() => { }) : null); msAct('pause', L ? () => V.pause() : null);
      msAct('previoustrack', L && idx > 0 ? () => jump(idx - 1) : null); msAct('nexttrack', L && idx < queue.length - 1 ? () => jump(idx + 1) : null);
      msAct('seekbackward', L ? d => seekBy(-((d && d.seekOffset) || 10)) : null); msAct('seekforward', L ? d => seekBy((d && d.seekOffset) || 10) : null);
      msAct('seekto', L ? d => { if (d.fastSeek && V.fastSeek) V.fastSeek(d.seekTime); else V.currentTime = d.seekTime; } : null);
      if (!L) MS.playbackState = 'none';
    };
    const msPos = () => { if (!MS || !msLive()) return; MS.playbackState = V.paused ? 'paused' : 'playing'; if (!MS.setPositionState || !isFinite(V.duration) || !V.duration) return; try { MS.setPositionState({ duration: V.duration, playbackRate: V.playbackRate || 1, position: Math.min(V.currentTime, V.duration) }); } catch (e) { } };
    ['loadedmetadata', 'seeked', 'ratechange', 'play', 'pause'].forEach(ev => V.addEventListener(ev, msPos));

    // P18 끊김 줄이기: 70%쯤 다음 작품 앞부분 미리 받기(데이터 절약이면 안 받음, 느린 망이면 정보만) · 버퍼링이 30초 안에 2번이면 같은 위치에서 720p로
    let nxPre = null, preId = '', played = false, stalls = [], DOWN = false;
    const srcFor = (v, mv = !!(MV || wantMV)) => mv ? pickSmall(v) : (DOWN && v.sd) ? v.sd : pickBig(v);
    const clearPre = () => { killVideo(nxPre); nxPre = null; preId = ''; };
    const prefetch = () => {
      const n = BY[queue[idx + 1]]; if (!n || n.id === preId) return; preId = n.id; killVideo(nxPre); nxPre = null;
      const p = posterOf(n); if (p) { const im = new Image(); im.decoding = 'async'; im.src = url(p); }
      if (kindOf(n) !== 'video' || SAVE) return; const v0 = vidsOf(n)[0];
      nxPre = document.createElement('video'); nxPre.muted = true; nxPre.preload = slowNet() ? 'metadata' : 'auto'; nxPre.src = url(srcFor(v0, tmod('multi') === 3 && vidsOf(n).length > 1));
    };
    const handoffPre = () => { const o = nxPre; nxPre = null; preId = ''; if (!o) return; const k = () => killVideo(o); V.addEventListener('playing', k, { once: true }); setTimeout(k, 8000); };   // 새 영상이 같은 데이터를 다 받아 갈 때까지 잠깐 유지
    $('.nxt', T).addEventListener('pointerenter', prefetch);
    V.addEventListener('playing', () => { played = true; });
    V.addEventListener('waiting', () => {
      if (!played || V.seeking || MV || DOWN || !cur) return; const now = performance.now(); stalls = stalls.filter(t => now - t < 30000); stalls.push(now);
      const v = vidsOf(cur)[vi]; if (stalls.length >= 2 && v && v.sd && absU(v.sd) !== V.src) { DOWN = true; loadVideo(v, true); }
    });

    // P19 닫으면 마지막으로 본 작품 카드로(그 줄이 보이게 + 포커스) — 줄·그리드·확장 카드에서 연 경우만
    let origin = null, lastPress = null, pressT = 0;
    document.addEventListener('pointerdown', e => { lastPress = e.target; pressT = performance.now(); }, true);
    const originOf = () => {
      const f = document.activeElement, a = f && f !== document.body && !T.contains(f) ? f : (performance.now() - pressT < 3000 ? lastPress : null);
      if (!a || !a.closest || a.closest('.feat,.nav,.theater,.mini')) return null;
      const q = a.closest('[data-queue]'); if (q) return q;
      if (a.closest('.pop')) return $$('[data-queue]').find(c => queue.every(id => c.querySelector(`.card[data-id="${CSS.escape(id)}"]`))) || document;
      return a.closest('.card') ? document : null;
    };
    const land = () => {
      if (!origin || !cur) return null;
      const sel = `.card[data-id="${CSS.escape(cur.id)}"]`, ok = c => !c.hidden && c.offsetParent !== null && !c.closest('.theater,.pop');
      const c = (origin !== document && origin.isConnected && $$(sel, origin).find(ok)) || $$(sel).find(ok); if (!c) return null;
      const sc = c.closest('.sc');
      if (sc) { const a = sc.getBoundingClientRect(), b = c.getBoundingClientRect(), pad = parseFloat(getComputedStyle(sc).scrollPaddingLeft) || 0; if (b.left < a.left + pad - 2 || b.right > a.right - pad + 2) { sc.style.scrollBehavior = 'auto'; sc.scrollLeft += b.left - a.left - pad; sc.style.scrollBehavior = ''; } }
      const top = NAV ? NAV.getBoundingClientRect().bottom : 0, b = c.getBoundingClientRect();
      if (b.top < top || b.bottom > innerHeight) { const R = (c.closest('.row') || c).getBoundingClientRect(), H = document.documentElement, sb = H.style.scrollBehavior; H.style.scrollBehavior = 'auto'; scrollTo(scrollX, scrollY + R.top - Math.max(top, (innerHeight - R.height) / 2)); H.style.scrollBehavior = sb; }
      return c;
    };

    // P20 끝났을 때: 1 5초 뒤 다음 · 2 자동 재생 스위치(끄면 다음 작품 카드만) · 3 반복 · 4 다시 보기 · 다음
    const ec = $('.endcard', el.vw), autoB = $('.auto', el.ctl);
    let AUTO = (() => { try { return localStorage.getItem('pf.autonext') !== '0'; } catch (e) { return true; } })();
    const autoUI = () => { autoB.setAttribute('aria-checked', String(AUTO)); autoB.title = AUTO ? '자동 재생 켜짐' : '자동 재생 꺼짐'; autoB.innerHTML = `<i>${ico(AUTO ? 'play' : 'pause', 'sm')}</i>`; };
    const countdown = () => {
      let left = 5; const cd = $('.cd', el.next); cd.textContent = left; cd.style.setProperty('--p', 0); el.next.classList.remove('hold');
      clearInterval(cdT); cdT = setInterval(() => { left--; cd.textContent = left; cd.style.setProperty('--p', (5 - left) * 20); if (left <= 0) { clearInterval(cdT); jump(idx + 1); } }, 1000);
    };
    autoB.addEventListener('click', () => { AUTO = !AUTO; try { localStorage.setItem('pf.autonext', AUTO ? '1' : '0'); } catch (e) { } autoUI(); if (!el.next.classList.contains('on')) return; if (AUTO) countdown(); else { clearInterval(cdT); el.next.classList.add('hold'); } });
    autoUI();
    const endcard = on => { el.vw.classList.toggle('ended', !!on); if (on) $('.nx', ec).hidden = !BY[queue[idx + 1]]; };
    $('.re', ec).addEventListener('click', e => { e.stopPropagation(); endcard(false); V.currentTime = 0; V.play().catch(() => { }); });
    $('.nx', ec).addEventListener('click', e => { e.stopPropagation(); jump(idx + 1); });
    ['play', 'seeking', 'emptied'].forEach(ev => V.addEventListener(ev, () => endcard(false)));
    const onEnded = () => {
      if (reelOn()) return;   // 스토리식 쇼릴은 쇼릴이 넘김
      const m = tmod('ended'), n = BY[queue[idx + 1]];
      if (m === 3) { V.currentTime = 0; V.play().catch(() => { }); return; }
      if (MINI) { if ((m === 1 || (m === 2 && AUTO)) && n && kindOf(n) === 'video') miniGo(idx + 1); return; }
      if (m === 4) { endcard(true); return; }
      if (!n || el.next.dataset.dismissed) { el.vw.classList.add('paused'); return; }
      $('img', el.next).src = url(thumbOf(n, 'wide').src); $('b', el.next).textContent = n.title; el.next.classList.add('on');
      if (m === 2 && !AUTO) { clearInterval(cdT); el.next.classList.add('hold'); return; }
      countdown();
    };

    // P23 규격 멀티뷰: 규격 2개 이상이면 최대 4개를 원비율로 나란히 동시 재생(720p) · 올린 칸 소리 · 누르면 그 규격 단독 · 길이가 같으면 지금 영상(V)에 맞춰 동기화
    let MV = null, wantMV = false;
    const mvOK = w => tmod('multi') > 1 && !SAVE && !!w && kindOf(w) === 'video' && vidsOf(w).length > 1;
    const route = () => { if (!MV) return; MV.tiles.forEach(t => { t.el.muted = MUTED || t.k !== MV.aud; t.tile.classList.toggle('aud', t.k === MV.aud); }); };
    const mvLayout = () => {
      if (!MV) return; const n = MV.tiles.length, g = 8, sum = MV.tiles.reduce((s, t) => s + t.r, 0);
      const W = stg.clientWidth, Hm = parseFloat(getComputedStyle(el.vw).maxHeight) || innerHeight * .7, H = Math.max(60, Math.min(Hm, (W - (n - 1) * g) / sum));
      setAspect(Math.round(H * sum + (n - 1) * g), Math.round(H));
    };
    const mvSync = () => {
      if (!MV) return; if (tmod('multi') < 2) { mvOff(true); return; } const m = V;   // 디자인 미리보기에서 1로 바꾸면 바로 단독으로
      MV.tiles.forEach(t => {
        const f = t.el; if (f === m || f.readyState < 1) return;
        if (m.paused) { if (!f.paused) f.pause(); if (t.same && !f.seeking && Math.abs(f.currentTime - m.currentTime) > .02) f.currentTime = Math.min(m.currentTime, f.duration || 1e9); return; }
        if (f.paused) f.play().catch(() => { });
        if (!t.same) return;
        const d = f.currentTime - m.currentTime;
        if (Math.abs(d) > .3) { if (!f.seeking) f.currentTime = Math.min(m.currentTime + .08, f.duration || 1e9); f.playbackRate = m.playbackRate; }
        else f.playbackRate = Math.abs(d) > .04 ? m.playbackRate * (d > 0 ? .94 : 1.06) : m.playbackRate;
      });
    };
    const reSrc = s => { const t = V.currentTime, pl = !V.paused || autoplay; wantT = t; V.src = s; V.defaultPlaybackRate = V.playbackRate = rate; V.addEventListener('loadedmetadata', () => { if (t < V.duration) V.currentTime = t; }, { once: true }); if (pl) V.play().catch(() => { }); };
    ['play', 'pause', 'seeked', 'ratechange'].forEach(ev => V.addEventListener(ev, () => { if (MV) mvSync(); }));
    const mvStart = () => {
      if (MV || !mvOK(cur) || !el.vw.contains(V)) return;
      const vs = vidsOf(cur), ks = vs.map((v, k) => k).slice(0, 4); if (!ks.includes(vi)) ks[3] = vi; ks.sort((a, b) => a - b);
      const box = document.createElement('div'); box.className = 'mv'; MV = { box, aud: vi, tiles: [], iv: 0 };
      ks.forEach(k => {
        const v = vs[k], tile = document.createElement('div'), r = v.w && v.h ? v.w / v.h : 16 / 9; tile.className = 'tile'; tile.style.setProperty('--r', r.toFixed(4)); tile.title = v.label || '';
        let f = V;
        if (k !== vi) { f = document.createElement('video'); f.muted = true; f.playsInline = true; f.preload = 'auto'; f.volume = VOL; f.setAttribute('aria-hidden', 'true'); f.loop = !sameLen(v, vs[vi]) || V.loop; f.src = url(pickSmall(v)); if (sameLen(v, vs[vi])) f.addEventListener('loadedmetadata', () => { f.currentTime = Math.min(V.currentTime, f.duration - .05); }, { once: true }); }
        tile.appendChild(f); box.appendChild(tile); MV.tiles.push({ k, el: f, tile, r, same: k === vi || sameLen(v, vs[vi]) });
        tile.addEventListener('pointerenter', () => { if (MV) { MV.aud = k; route(); } });
        tile.addEventListener('click', e => { e.stopPropagation(); mvSolo(k); });
      });
      el.vw.prepend(box); el.vw.classList.add('multi'); route(); mvLayout(); muteIcon();
      const v0 = vs[vi]; if (absU(pickSmall(v0)) !== V.src) reSrc(url(pickSmall(v0)));
      if (!V.paused || autoplay) MV.tiles.forEach(t => { if (t.el !== V) t.el.play().catch(() => { }); });
      if (MV.tiles.some(t => !t.same)) V.loop = true;   // 길이가 다른 규격이 섞이면 모두 반복(비교 화면 — 한 칸이 끝났다고 다음 작품으로 넘어가지 않게)
      MV.iv = setInterval(mvSync, 250); $$('[data-fi]', T).forEach(x => x.setAttribute('aria-pressed', 'false')); $$('.mvall', T).forEach(x => x.setAttribute('aria-pressed', 'true'));
    };
    const mvOff = restore => {
      if (!MV) return; const m = MV; MV = null; clearInterval(m.iv);
      m.tiles.forEach(t => { if (t.el !== V) killVideo(t.el); });
      el.vw.prepend(V); m.box.remove(); el.vw.classList.remove('multi'); V.muted = MUTED; V.playbackRate = rate; V.loop = tmod('ended') === 3; muteIcon();
      $$('.mvall', T).forEach(x => x.setAttribute('aria-pressed', 'false'));
      if (restore && cur) { const v = vidsOf(cur)[vi]; if (v) { setAspect(v.w || 16, v.h || 9); const s = (DOWN && v.sd) ? v.sd : pickBig(v); if (absU(s) !== V.src) reSrc(url(s)); $$(`[data-fi="${vi}"]`, T).forEach(x => x.setAttribute('aria-pressed', 'true')); } }
    };
    const mvSolo = k => { const b = $(`[data-fi="${k}"]`, T); if (b) b.click(); else { mvOff(true); } };   // 그 규격 단독 — 규격 버튼과 같은 길(보던 위치 유지)
    T.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-fi]'); if (b && MV) mvOff(+b.dataset.fi === vi); }, true);   // 규격 버튼을 누르면 멀티뷰에서 나옴
    const mvChip = () => {   // 「모두」 — 규격 버튼 묶음(글자 칩·모양 썸네일·패널 목록) 맨 앞에
      $$('.mvall', T).forEach(x => x.remove()); if (!mvOK(cur)) return;
      const first = $('[data-fi]', T); if (!first) return; const n = Math.min(4, vidsOf(cur).length);
      const b = document.createElement('button'); b.className = 'mvall ' + (first.classList.contains('vr') ? 'vr' : first.classList.contains('fmt') ? 'fmt' : 'chip'); b.setAttribute('aria-pressed', 'false'); b.title = '모든 규격 동시 재생';
      b.innerHTML = b.classList.contains('vr') ? `<span class="fb"><span class="fth">${ICT.all}</span></span><b>모두</b><small class="num">${n}</small>` : b.classList.contains('fmt') ? `<span class="fth">${ICT.all}</span><small>모두</small>` : '모두';
      b.addEventListener('click', () => { if (!MV) mvStart(); }); first.before(b);
    };
    new ResizeObserver(() => { if (MV) mvLayout(); }).observe(stg);

    // P24 극장 모드: 상단 버튼 · T 키로 정보 패널 접기/펼치기(세션 동안 기억) — 넓은 화면(1100px~)만
    const wideB = $('.wideb', T); let WIDE = (() => { try { return sessionStorage.getItem('pf.wide') === '1'; } catch (e) { return false; } })();
    const wideSet = on => { WIDE = !!on; T.classList.toggle('wide', WIDE); wideB.setAttribute('aria-pressed', String(WIDE)); wideB.innerHTML = WIDE ? ICT.narrow : ICT.wide; wideB.title = WIDE ? '기본 보기 (T)' : '극장 모드 (T)'; wideB.setAttribute('aria-label', WIDE ? '기본 보기' : '극장 모드'); try { sessionStorage.setItem('pf.wide', WIDE ? '1' : '0'); } catch (e) { } };
    wideB.addEventListener('click', () => wideSet(!WIDE)); wideSet(WIDE);

    // P26 라이브 앰비언트: 재생 중 약 1초마다 장면을 16×10으로 줄여 배경에 깔고 부드럽게 겹쳐 바꿈(일시정지·움직임 줄이기·데이터 절약이면 멈춤)
    const AMB = { cs: null, k: 0, iv: 0 };
    const ambReset = () => { if (AMB.cs) AMB.cs.forEach(c => c.classList.remove('on')); };
    const ambTick = () => {
      if (tmod('liveamb') !== 2 && AMB.cs) { AMB.cs.forEach(c => c.remove()); AMB.cs = null; }   // 디자인 미리보기에서 1로 바꾸면 캔버스 치움
      if (tmod('liveamb') !== 2 || RM || SAVE || document.hidden || !T.classList.contains('on') || V.paused || V.readyState < 2 || !V.videoWidth || !el.vw.contains(V)) return;
      if (!AMB.cs) AMB.cs = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = 16; c.height = 10; c.className = 'amb'; el.bg.appendChild(c); return c; });
      const c = AMB.cs[AMB.k ^= 1], o = AMB.cs[AMB.k ^ 1], vw = V.videoWidth, vh = V.videoHeight, cr = innerWidth / innerHeight; let sw = vw, sh = vh; if (vw / vh > cr) sw = vh * cr; else sh = vw / cr;
      try { c.getContext('2d').drawImage(V, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, c.width, c.height); } catch (e) { return; }
      o.after(c); c.classList.add('on'); c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DUR() * 3, easing: getComputedStyle(T).getPropertyValue('--ease').trim() || 'ease' });   // 약 1.2초(--dur × 3)
    };
    const ambOn = () => { clearInterval(AMB.iv); AMB.iv = setInterval(ambTick, 1000); };
    const ambOff = () => { clearInterval(AMB.iv); AMB.iv = 0; };
    V.addEventListener('playing', () => setTimeout(ambTick, 250));

    // P27 다음·이전 작품 넘김 모션: 2 옆으로 밀림(공유 축) · 3 짧은 크로스페이드 — 지금 장면을 그림으로 떠서 빠지게
    let qRef = null;
    const DUR = () => parseFloat(getComputedStyle(T).getPropertyValue('--dur')) || 0;
    const ghosts = () => {
      if (tmod('tnext') === 1 || RM || !DUR() || !T.classList.contains('on')) return null;
      const host = fsEl() || T, r = el.vw.getBoundingClientRect(); if (r.width < 2) return null;
      const g = document.createElement('div'); g.className = 'tghost'; g.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:2;pointer-events:none`;
      const s = Math.min(1, 960 / r.width), c = document.createElement('canvas'); c.width = Math.round(r.width * s); c.height = Math.round(r.height * s); const x = c.getContext('2d');
      $$(':scope > video, :scope > img, :scope > canvas.contf, .mv video', el.vw).forEach(n => { if (n.tagName === 'VIDEO' && n.readyState < 2) return; const b = n.getBoundingClientRect(); try { x.drawImage(n, (b.left - r.left) * s, (b.top - r.top) * s, b.width * s, b.height * s); } catch (e) { } });
      g.appendChild(c); host.appendChild(g);
      const me = $('.meta', stg), mr = me.getBoundingClientRect(), mg = me.cloneNode(true); mg.classList.add('tghost-m'); mg.removeAttribute('id'); mg.setAttribute('aria-hidden', 'true');
      mg.style.cssText = `position:fixed;left:${mr.left}px;top:${mr.top}px;width:${mr.width}px;height:${mr.height}px;margin:0;z-index:2;pointer-events:none;transition:none`; host.appendChild(mg);
      let bg = null; if (!(AMB.cs && AMB.cs.some(k => k.classList.contains('on')))) { bg = el.bg.cloneNode(false); bg.classList.add('tghost-b'); el.bg.after(bg); }
      return { fg: [g, mg], bg };
    };
    const tnext = (gs, dir) => {
      if (!gs) return; const m = tmod('tnext'), d = DUR(), E = getComputedStyle(T).getPropertyValue('--ease').trim() || 'ease', dx = 64 * dir, me = $('.meta', stg);
      if (m === 2) {   // 공유 축: 나가는 장면은 짧게(--dur × .6) 빠지고, 들어오는 장면은 살짝 늦게(× .15) 밀려 들어옴
        gs.fg.forEach(g => { g.animate([{ transform: 'none' }, { transform: `translateX(${-dx}px)` }], { duration: d * .6, easing: E, fill: 'forwards' }); g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d * .6, fill: 'forwards' }); });   // 움직임은 --ease, 투명도는 고르게(앞에서 한꺼번에 사라지지 않게)
        [el.vw, me].forEach(n => { n.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: d * .85, delay: d * .15, easing: E, fill: 'backwards' }); n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d * .85, delay: d * .15, fill: 'backwards' }); });
      } else {   // 크로스페이드: 직전 장면이 새 작품 위로 겹쳐 사라짐(--dur × 1.5)
        gs.fg.forEach(g => g.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d * 1.5, fill: 'forwards' }));
        me.animate([{ opacity: 0 }, { opacity: 1 }], { duration: d, fill: 'backwards' });
      }
      if (gs.bg) gs.bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: d * 1.5, easing: E, fill: 'forwards' });
      setTimeout(() => [...gs.fg, gs.bg].forEach(n => n && n.remove()), d * 1.5 + 60);
    };

    // P29 미니 플레이어: 재생 중에 닫으면 오른쪽 아래에서 이어 재생 · 끌어서 네 모서리 · 누르면 상영관으로(그대로 이어서) · ✕ 닫기
    let MINI = null, corner = (() => { try { return sessionStorage.getItem('pf.minic') || 'br'; } catch (e) { return 'br'; } })();
    const miniSize = () => { if (!MINI) return; const w = V.videoWidth || 16, h = V.videoHeight || 9, ar = w / h; MINI.box.style.setProperty('--va', `${w}/${h}`); MINI.box.style.setProperty('--mw', Math.round(Math.min(320, Math.sqrt(57600 * ar), 300 * ar)) + 'px'); };
    const miniIcon = () => { if (!MINI) return; const b = $('.mpp', MINI.box); b.innerHTML = ico(V.paused ? 'play' : 'pause'); b.setAttribute('aria-label', V.paused ? '재생' : '일시정지'); };
    const miniShow = () => {
      const from = el.vw.getBoundingClientRect(), b = document.createElement('div'); b.className = 'mini ' + corner; b.setAttribute('role', 'region'); b.setAttribute('aria-label', '미니 플레이어');
      b.innerHTML = `<button class="mexp" aria-label="상영관으로 돌아가기"></button><button class="mpp"></button><button class="mx" aria-label="미니 플레이어 닫기">${ico('close', 'sm')}</button><i class="mpb"></i>`;
      b.prepend(V); document.body.appendChild(b); MINI = { box: b, pb: $('.mpb', b) }; miniSize(); miniIcon(); Feat.hold('mini');
      const to = b.getBoundingClientRect(), d = DUR(); if (d && from.width) b.animate([{ transformOrigin: '0 0', transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width})`, opacity: .6 }, { transformOrigin: '0 0', transform: 'none', opacity: 1 }], { duration: d, easing: getComputedStyle(T).getPropertyValue('--ease').trim() || 'ease' });
      let moved = false;   // 끌었으면 놓을 때의 클릭은 「상영관으로」가 아님
      b.addEventListener('pointerdown', e => {
        if (e.button || e.target.closest('.mpp,.mx')) return; e.preventDefault(); const sx = e.clientX, sy = e.clientY, pid = e.pointerId; let dragging = false; moved = false;
        const mv = ev => { if (ev.pointerId !== pid) return; const dx = ev.clientX - sx, dy = ev.clientY - sy; if (!dragging && Math.hypot(dx, dy) > 6) { dragging = moved = true; b.classList.add('drag'); } if (dragging) b.style.transform = `translate(${dx}px,${dy}px)`; };
        const up = ev => {
          if (ev.pointerId !== pid) return; removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (!dragging) return;
          const r0 = b.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2; corner = (cy < innerHeight / 2 ? 't' : 'b') + (cx < innerWidth / 2 ? 'l' : 'r'); try { sessionStorage.setItem('pf.minic', corner); } catch (x) { }
          b.classList.remove('drag', 'br', 'bl', 'tr', 'tl'); b.classList.add(corner); b.style.transform = ''; const r1 = b.getBoundingClientRect();   // 가까운 모서리로 붙음
          if (DUR()) b.animate([{ transform: `translate(${r0.left - r1.left}px,${r0.top - r1.top}px)` }, { transform: 'none' }], { duration: DUR(), easing: getComputedStyle(T).getPropertyValue('--ease').trim() || 'ease' });
        };
        addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
      });
      $('.mexp', b).addEventListener('click', () => { if (moved) { moved = false; return; } if (cur) open(cur.id, { resume: true }); });
      $('.mpp', b).addEventListener('click', () => { V.paused ? V.play().catch(() => { }) : V.pause(); });
      $('.mx', b).addEventListener('click', () => { miniOff(false); msSet(); });
    };
    const miniOff = keep => { if (!MINI) return; const b = MINI.box; MINI = null; if (!keep) V.pause(); el.vw.prepend(V); b.remove(); Feat.release('mini'); };
    const miniGo = n => {   // 미니에서 다음 작품으로(영상 작품만) — 숨은 상영관도 그 작품으로 맞춰 둠(펼치면 그대로)
      const w = BY[queue[n]]; if (!MINI || !w || kindOf(w) !== 'video') return;
      idx = n; cur = w; T.dataset.cur = w.id; autoplay = true; handoffPre(); render(w); after(); MINI.box.prepend(V); document.title = document.body.dataset.title || document.title;
    };
    ['play', 'pause'].forEach(ev => V.addEventListener(ev, miniIcon));
    V.addEventListener('timeupdate', () => {
      if (drag) el.pgi.style.width = dragP * 100 + '%';
      if (MINI) { if (tmod('mini') !== 2) { miniOff(false); msSet(); return; } MINI.pb.style.transform = `scaleX(${V.duration ? V.currentTime / V.duration : 0})`; }
      if (!preId && V.duration && V.currentTime / V.duration > .7 && !V.loop && tmod('ended') !== 3) prefetch();
    });

    // 작품을 그린 뒤(open·jump·미니 다음) 공통
    const after = () => {
      el.vw.classList.remove('ended'); el.next.classList.remove('hold'); ambReset(); mvChip(); if (wantMV) mvStart(); wantMV = false; msSet(); muteIcon();
      [idx + 1, idx - 1].forEach(n => { const w = BY[queue[n]], p = w && posterOf(w); if (p) { const im = new Image(); im.decoding = 'async'; im.src = url(p); } });   // 앞뒤 작품 포스터를 미리(넘길 때 검은 화면 없이)
    };
    return { open, close, reel: reelStart, seekOnce: t => { pendAt = +t || 0; } };
  })();
  window.Theater = Theater;

  /* ---------- 줄 위치 기억(P19): 뒤로가기(bfcache가 안 될 때)·최신 데이터로 다시 그릴 때도 줄 가로 위치·세로 위치·포커스 카드 유지 ---------- */
  const rowsSnap = () => { const a = document.activeElement, c = a && a.closest && a.closest('.row[data-row] .card[data-id]'); return { y: scrollY, x: Object.fromEntries($$('.row[data-row]').map(r => [r.dataset.row, ($('.sc', r) || {}).scrollLeft || 0])), f: c ? [c.closest('.row').dataset.row, c.dataset.id] : null }; };
  const rowsRestore = (st, y) => {
    if (!st || !st.x) return;
    $$('.row[data-row]').forEach(r => { const sc = $('.sc', r), x = st.x[r.dataset.row]; if (!sc || !x) return; sc.style.scrollBehavior = 'auto'; sc.scrollLeft = x; sc.style.scrollBehavior = ''; });
    if (y && Math.abs(scrollY - st.y) > 2) { const H = document.documentElement, sb = H.style.scrollBehavior; H.style.scrollBehavior = 'auto'; scrollTo(scrollX, st.y); H.style.scrollBehavior = sb; }
    if (st.f) { const c = $(`.row[data-row="${CSS.escape(st.f[0])}"] .card[data-id="${CSS.escape(st.f[1])}"]`); c && c.focus({ preventScroll: true }); }
  };
  const ROWK = 'pf.rows:' + location.pathname;
  addEventListener('pagehide', () => { if (EDIT) return; try { const s = rowsSnap(); s.f = null; sessionStorage.setItem(ROWK, JSON.stringify(s)); } catch (e) { } });

  /* ---------- 이력서: 목차(cvtoc 2 — 지금 읽는 절 진하게) · 프로필 쇼릴(cvreel 2 사진 아래 미니 · 3 사진 자리, 올렸을 때만) ---------- */
  const CV = $('.cv');
  if (CV) {
    const hs = $$('h3[id]', CV), links = $$('.toc a', CV);
    const tocUpd = () => {
      if (!links.length || modN('cvtoc') < 2) return; const y = innerHeight * .3; let k = 0;
      hs.forEach((h, i) => { if (h.getBoundingClientRect().top <= y) k = i; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) k = hs.length - 1;   // 맨 아래면 마지막 절
      links.forEach((a, i) => i === k ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    };
    let tocRaf = 0; addEventListener('scroll', () => { cancelAnimationFrame(tocRaf); tocRaf = requestAnimationFrame(tocUpd); }, { passive: true }); tocUpd();
    new MutationObserver(tocUpd).observe(document.body, { attributes: true, attributeFilter: ['data-cvtoc'] });
    const box = $('.cvr', CV), its = reelIds().map(id => BY[id]).map(w => ({ w, v: vidsOf(w)[0], s: segOf(w) })).filter(x => x.v);
    if (box && its.length) {
      const p0 = esc(url(posterOf(its[0].w)));   // 재생 전·자동 재생 꺼짐이면 첫 작품 그림(원비율 + 흐림 채움)
      box.innerHTML = `<i class="bg" style="background-image:url('${p0}')"></i><img class="still" src="${p0}" alt="" loading="lazy"><span class="pl" aria-hidden="true">${ico('play', 'lg')}</span>`;
      const bg = $('.bg', box), pl = $('.pl', box); let k = -1, cv = null, seen = false, hov = false, live = false;
      const want = () => { const m = modN('cvreel'); return !EDIT && !RM && !SAVE && Auto.on() && !document.hidden && !$('.theater.on') && (m === 2 ? seen : m === 3 && hov); };
      const next = () => {   // 하이라이트 구간을 차례로 — 다음 영상이 나오면 겹쳐 바꿈(빈 화면 없음)
        k = (k + 1) % its.length; const it = its[k], v = freshVideo(pickSmall(it.v), it.s[0]), old = cv; cv = v; box.insertBefore(v, pl);
        v.addEventListener('playing', () => { bg.style.backgroundImage = `url('${url(posterOf(it.w))}')`; if (old) { old.classList.remove('on'); setTimeout(() => killVideo(old), 500); } }, { once: true });
        v.addEventListener('timeupdate', () => { if (v === cv && v.currentTime >= it.s[1] - .15) next(); });
        v.addEventListener('ended', () => { if (v === cv) next(); });
        v.addEventListener('error', () => { if (v === cv) setTimeout(next, 400); }, { once: true });
        if (live) v.play().catch(() => { });
      };
      const sync = () => { const w = want(); box.classList.toggle('live', w); if (w === live) return; live = w; if (w) { if (cv) cv.play().catch(() => { }); else next(); } else if (cv) cv.pause(); };
      new IntersectionObserver(es => { seen = es[0].isIntersecting; sync(); }, { threshold: .25 }).observe(box);
      box.addEventListener('pointerenter', () => { hov = true; sync(); }); box.addEventListener('pointerleave', () => { hov = false; sync(); });
      box.addEventListener('focus', () => { hov = true; sync(); }); box.addEventListener('blur', () => { hov = false; sync(); });
      box.addEventListener('click', e => { e.preventDefault(); playReel(box); });
      document.addEventListener('visibilitychange', sync); document.addEventListener('click', e => { if (e.target.closest('.aps')) setTimeout(sync, 0); });   // 미리보기 자동 재생 스위치(apswitch)
      new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['data-cvreel'] });
      const TH = $('.theater'); if (TH) new MutationObserver(sync).observe(TH, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------- 찾기(P33): 초성 「ㅈㄹ」 · 한영 자판 오타 「tkwkdsla」 · 띄어쓰기 무시 · 0건이면 가장 가까운 결과(안내 문구 없이 결과만)
     작업 탭·어디서나 검색이 같이 씀. 글자를 자모로 풀어 비교 → 한글을 치는 중(조합 중)인 글자도 바로 맞음. 외부 의존 없음 ---------- */
  const Find = (() => {
    const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ', CC = 'ㄳㄵㄶㄺㄻㄼㄽㄾㄿㅀㅄ';
    const JUNG = 'ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅗㅏ ㅗㅐ ㅗㅣ ㅛ ㅜ ㅜㅓ ㅜㅔ ㅜㅣ ㅠ ㅡ ㅡㅣ ㅣ'.split(' '), JONG = ' ㄱ ㄲ ㄱㅅ ㄴ ㄴㅈ ㄴㅎ ㄷ ㄹ ㄹㄱ ㄹㅁ ㄹㅂ ㄹㅅ ㄹㅌ ㄹㅍ ㄹㅎ ㅁ ㅂ ㅂㅅ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ'.split(' ');
    const SPLIT = { 'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ', 'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅐ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ', 'ㅞ': 'ㅜㅔ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ' };
    const KEY = { q: 'ㅂ', w: 'ㅈ', e: 'ㄷ', r: 'ㄱ', t: 'ㅅ', y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', p: 'ㅔ', a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ', h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ', z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ', Q: 'ㅃ', W: 'ㅉ', E: 'ㄸ', R: 'ㄲ', T: 'ㅆ', O: 'ㅒ', P: 'ㅖ' };   // 두벌식
    const syl = ch => { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? c : -1; };
    const dis = s => { let o = ''; for (const ch of s) { const c = syl(ch); o += c < 0 ? (SPLIT[ch] || ch) : CHO[(c / 588) | 0] + JUNG[((c % 588) / 28) | 0] + JONG[c % 28]; } return o; };
    const cho = ch => { const c = syl(ch); return c < 0 ? ch : CHO[(c / 588) | 0]; };
    const norm = s => String(s ?? '').normalize('NFC').toLowerCase().replace(/[\s·・—–\-_'"‘’“”()[\]{}「」『』〈〉《》<>,.!?~:;/|+]/g, '');
    const toolKey = t => String(t).replace(/\s*\(.*$/, '').split(' · ')[0].trim();   // 「After Effects (익스프레션)」 → 「After Effects」
    const FMT = { '16x9': '16:9 가로', '9x16': '9:16 세로', '1x1': '1:1 정사각', banner: '배너' };
    const fmtsOf = w => {   // 규격 묶음: formats 값 + 영상 실제 비율
      const s = new Set(), add = (a, b) => { const r = a / b; if (Math.abs(r - 16 / 9) < .05) s.add('16x9'); else if (Math.abs(r - 9 / 16) < .03) s.add('9x16'); else if (Math.abs(r - 1) < .02) s.add('1x1'); };
      (w.formats || []).forEach(f => { f = String(f).trim(); const m = f.match(/^(\d+(?:\.\d+)?)\s*([:×x])\s*(\d+(?:\.\d+)?)$/); if (/배너/.test(f) || f === '1.91:1' || (m && (m[2] !== ':' || +m[1] > 50))) s.add('banner'); else if (m) add(+m[1], +m[3]); });
      vidsOf(w).forEach(v => v.w && v.h && add(v.w, v.h)); return s;
    };
    const KO = { google: '구글', moloco: '몰로코', meta: '메타 페이스북', localads: '로컬광고', youtube: '유튜브', instagram: '인스타그램 인스타', '앱 내': '앱내' };
    const AL = [[/after effects/i, '애프터이펙트 에프터이펙트 애펙 ae'], [/cinema 4d/i, '시네마4d 시네마포디 c4d'], [/photoshop/i, '포토샵 ps'], [/premiere/i, '프리미어 pr'], [/figma/i, '피그마'], [/blender/i, '블렌더'], [/redshift/i, '레드시프트'], [/illustrator/i, '일러스트레이터'], [/higgsfield/i, '힉스필드'], [/unreal/i, '언리얼'], [/capcut/i, '캡컷'], [/stable diffusion/i, '스테이블디퓨전'], [/claude/i, '클로드'], [/three\.js/i, '쓰리제이에스']];
    const fields = w => [w.title, w.type, w.subtitle, w.year, ...(w.kinds || []).map(k => KINDS[k]), ...(w.tags || []),
      ...(w.tools || []).flatMap(t => [t, ...AL.filter(a => a[0].test(t)).flatMap(a => a[1].split(' '))]),
      ...(w.channels || []).flatMap(c => [c, ...(KO[String(c).toLowerCase()] || '').split(' ')]), ...(w.formats || []), ...[...fmtsOf(w)].flatMap(f => FMT[f].split(' '))];
    const C = new WeakMap();
    const ix = w => { let I = C.get(w); if (!I) { const s = fields(w).map(norm).filter(Boolean).join('\u0001'), c = [...s], h = c.map(cho); I = { j: dis(s), c, h, hs: h.join('') }; C.set(w, I); } return I; };
    const hit = (I, t) => {   // t = 공백·기호 뺀 소문자. ① 자모 포함(조합 중 글자 포함) ② 초성이 섞인 말(「ㅈㄹ」 「짐ㅈ」)
      if (!t) return true; if (I.j.includes(dis(t))) return true;
      const q = [...t].flatMap(ch => CC.includes(ch) ? [...SPLIT[ch]] : [ch]); if (!q.some(ch => CHO.includes(ch))) return false;
      const n = q.length, lj = syl(q[n - 1]) >= 0 ? dis(q[n - 1]) : '';
      for (let i = 0; i + n <= I.c.length; i++) { let k = 0; for (; k < n; k++) { const x = q[k]; if (I.c[i + k] === x || I.h[i + k] === x || (k === n - 1 && lj && dis(I.c[i + k]).startsWith(lj))) continue; break; } if (k === n) return true; }
      return false;
    };
    const conv = w => /^[a-z]+$/i.test(w) ? [...w].map(ch => KEY[ch] || KEY[ch.toLowerCase()]).join('') : '';   // 영문 자판 상태로 친 한글
    const parse = raw => { const ws = String(raw || '').trim().split(/\s+/).filter(w => norm(w)); return { raw: String(raw || ''), whole: norm(raw), words: ws.map(norm), kw: ws.map(conv), kwhole: ws.length && ws.every(conv) ? ws.map(conv).join('') : '' }; };
    const t1 = (I, Q) => hit(I, Q.whole) || (Q.words.length > 1 && Q.words.every(w => hit(I, w)));
    const t2 = (I, Q) => (Q.kwhole && hit(I, Q.kwhole)) || Q.words.every((w, i) => hit(I, w) || (Q.kw[i] && hit(I, Q.kw[i])));
    const sim = (a, b) => {   // 1 − (a를 b의 어느 조각으로 바꾸는 최소 편집 수 ÷ a 길이) — 오타 1~2자는 높게, 우연히 겹친 글자는 낮게(Sellers)
      let p = new Uint16Array(b.length + 1); for (let i = 1; i <= a.length; i++) { const c = new Uint16Array(b.length + 1); c[0] = i; for (let k = 1; k <= b.length; k++) c[k] = Math.min(p[k] + 1, c[k - 1] + 1, p[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1)); p = c; }
      return 1 - Math.min(...p) / a.length; };
    const near = (I, Q) => {   // 오타 섞인 자모 · 영문 자판으로 친 자모 · 초성 · 여러 낱말 중 맞은 비율
      let s = 0; [Q.whole, Q.kwhole].forEach(x => { const a = x ? dis(x) : ''; if (a.length >= 3) s = Math.max(s, sim(a, I.j)); });
      if (Q.whole.length >= 2 && [...Q.whole].every(ch => CHO.includes(ch))) s = Math.max(s, sim(Q.whole, I.hs));
      if (Q.words.length > 1) s = Math.max(s, Q.words.filter(w => hit(I, w)).length / Q.words.length);
      return s;
    };
    const run = (list, raw) => {   // 순서는 list 그대로. ① 그대로·초성 → ② 한영 자판 → ③ 가장 가까운 것(점수 .6 이상, 최고점 근처만)
      const Q = parse(raw); if (!Q.whole) return list;
      let r = list.filter(w => t1(ix(w), Q)); if (r.length) return r;
      if (/[a-z]/i.test(Q.raw)) { r = list.filter(w => t2(ix(w), Q)); if (r.length) return r; }
      const sc = list.map(w => [w, near(ix(w), Q)]), b = Math.max(0, ...sc.map(x => x[1]));
      return b >= .6 ? sc.filter(x => x[1] >= b - .1).map(x => x[0]) : [];
    };
    return { run, norm, dis, toolKey, fmtsOf };
  })();

  /* ---------- 작업 목록(P33·P34·P36): 분류 + 검색 + 조건(규격·툴·매체·만든 도구·줄) — 주소 #<분류>&fmt=9x16&tool=…&ch=…&made=…&row=…&q=…
     (치는 동안은 0.35초 뒤 주소 갱신, 카드 누르기 전엔 바로) · facet 2 = 분류 아래 규격 칩 · 3 = 「필터」 펼침(값 옆 개수, 0건 흐리게) · wfx 2 = 카드가 새 자리로 ---------- */
  const FMTS = [['16x9', '16:9'], ['9x16', '9:16'], ['1x1', '1:1'], ['banner', '배너']], FK = ['fmt', 'tool', 'ch'];
  const nm = w => String((w && w.title) || '').split(' — ')[0];
  let worksAC = null, worksFlush = null, worksPanel = null, worksFirst = true, vtGen = 0;
  const vt = fn => {   // wfx 2: 바꾸는 순간에만 카드에 이름을 붙여 View Transition(미지원·움직임 줄이기·탭 숨김이면 즉시)
    if (RM || !document.startViewTransition || document.hidden) return fn();
    const cards = $$('.lib .grid .card'), g = ++vtGen; Pop.hide(true);
    cards.forEach(c => { c.style.viewTransitionName = 'w-' + c.dataset.id.replace(/[^\w-]/g, '_'); c.style.viewTransitionClass = 'wcard'; });
    const t = document.startViewTransition(fn); t.ready.catch(() => { }); t.finished.finally(() => { if (g === vtGen) cards.forEach(c => { c.style.viewTransitionName = ''; c.style.viewTransitionClass = ''; }); });
  };
  const renderWorks = () => {
    const LIB = $('.lib'); if (!LIB) return;
    if (worksFlush) worksFlush(); if (worksAC) worksAC.abort(); const ac = worksAC = new AbortController(), on = { signal: ac.signal };
    const rail = $('.rail', LIB), grid = $('.grid', LIB), cnt = $('.cnt', LIB), q = $('.q', LIB), tb = $('.tb', LIB), F = dm('facet'), tk = Find.toolKey;
    $$('.act,.fbtn,.fpan', LIB).forEach(x => x.remove());
    const parseH = () => { const o = { kind: '', fmt: [], tool: [], ch: [], made: '', row: '', q: null };
      location.hash.slice(1).split('&').filter(Boolean).forEach(p => { const i = p.indexOf('='); const k = i < 0 ? 'kind' : p.slice(0, i); let v = i < 0 ? p : p.slice(i + 1); try { v = decodeURIComponent(v); } catch (e) { }
        if (k === 'kind') o.kind = KINDS[v] && v !== 'tools' ? v : ''; else if (FK.includes(k)) o[k] = v.split(',').filter(Boolean); else if (k === 'made' || k === 'row' || k === 'q') o[k] = v; });
      return o; };
    const st = { kind: '', fmt: new Set(), tool: new Set(), ch: new Set(), made: '', row: '', q: '' };
    const load = h => { st.kind = h.kind; FK.forEach(k => { st[k] = new Set(h[k]); }); st.made = BY[h.made] ? h.made : ''; st.row = h.row; };
    const h0 = parseH(); load(h0); st.q = q.value || h0.q || ''; if (q.value !== st.q) q.value = st.q;
    const hashOf = () => { const p = []; if (st.kind) p.push(st.kind); FK.forEach(k => { if (st[k].size) p.push(`${k}=${[...st[k]].map(encodeURIComponent).join(',')}`); }); ['made', 'row'].forEach(k => { if (st[k]) p.push(`${k}=${encodeURIComponent(st[k])}`); }); if (st.q.trim()) p.push(`q=${encodeURIComponent(st.q.trim())}`); return p.length ? '#' + p.join('&') : ''; };
    let wT = 0; const write = () => { clearTimeout(wT); worksFlush = null; const h = hashOf(); if (h !== location.hash) hist.replace(hist.st(), location.pathname + location.search + h); };
    const writeLater = () => { clearTimeout(wT); worksFlush = write; wT = setTimeout(write, 350); };
    const has = (w, k) => k === 'fmt' ? [...Find.fmtsOf(w)].some(v => st.fmt.has(v)) : k === 'tool' ? (w.tools || []).some(t => st.tool.has(tk(t))) : (w.channels || []).some(c => st.ch.has(c));
    const rowOf = () => st.row ? rowList().find(x => x.key === st.row && x.items) : null;
    const pass = (w, ex, RS) => (ex === 'kind' || !st.kind || (w.kinds || []).includes(st.kind)) && FK.every(k => k === ex || !st[k].size || has(w, k)) && (!st.made || (w.made_with || []).includes(st.made)) && (!RS || RS.has(w.id));
    const vals = k => { const m = new Map(); MDATA.forEach(w => (k === 'fmt' ? [...Find.fmtsOf(w)] : k === 'tool' ? [...new Set((w.tools || []).map(tk))] : [...new Set(w.channels || [])]).forEach(v => m.set(v, (m.get(v) || 0) + 1)));
      return k === 'fmt' ? FMTS.map(f => f[0]).filter(v => m.has(v)) : [...m.keys()].filter(v => k !== 'tool' || m.get(v) > 1 || st.tool.has(v)).sort((a, b) => m.get(b) - m.get(a) || a.localeCompare(b)); };   // 툴은 2개 이상 작품에 쓴 것만(+ 고른 것)
    const label = (k, v) => k === 'fmt' ? ((FMTS.find(f => f[0] === v) || [])[1] || v) : v;
    const count = k => MDATA.filter(w => (w.kinds || []).includes(k)).length;
    rail.innerHTML = `<button data-v="">전체 <small>${MDATA.length}</small></button>` + Object.keys(KINDS).filter(count).map(k => `<button data-v="${k}">${KINDS[k]} <small>${count(k)}</small></button>`).join('') +
      (F === 2 ? `<div class="fz" role="group" aria-label="규격">${vals('fmt').map(v => `<button class="chip" data-k="fmt" data-v="${v}" aria-pressed="false">${label('fmt', v)}</button>`).join('')}</div>` : '');
    grid.innerHTML = MDATA.map(w => cardHTML(w, 'wide')).join(''); mountRows(grid); Rove.mount(grid, { mode: 'grid' });   // P49: 그리드 2차원 방향키
    const act = document.createElement('span'); act.className = 'act chips'; q.after(act);
    let fbtn = null, fpan = null;
    if (F === 3) {
      fbtn = document.createElement('button'); fbtn.type = 'button'; fbtn.className = 'btn ghost sm fbtn'; fbtn.setAttribute('aria-controls', 'pf-fpan'); q.after(fbtn);
      fpan = document.createElement('div'); fpan.className = 'fpan'; fpan.id = 'pf-fpan'; fpan.inert = true;
      fpan.innerHTML = `<div class="in">${[['fmt', '규격'], ['tool', '툴'], ['ch', '매체']].map(([k, n]) => `<div class="fg" role="group" aria-label="${n}"><span>${n}</span><div class="chips">${vals(k).map(v => `<button class="chip" type="button" data-k="${k}" data-v="${esc(v)}" aria-pressed="false">${esc(label(k, v))}<small></small></button>`).join('')}</div></div>`).join('')}</div>`;
      tb.after(fpan);
    }
    const paint = (RS, row) => {   // 눌린 모양 · (3) 개수 · 화면 다른 곳에 안 보이는 조건은 지울 수 있는 칩으로
      $$('button:not(.chip)', rail).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === st.kind));
      $$('.chip[data-k]', LIB).forEach(c => c.setAttribute('aria-pressed', st[c.dataset.k].has(c.dataset.v)));
      if (F === 3) {
        const rk = Find.run(MDATA.filter(w => pass(w, 'kind', RS)), st.q);
        $$('button:not(.chip)', rail).forEach(b => { const s = $('small', b), n = b.dataset.v ? rk.filter(w => (w.kinds || []).includes(b.dataset.v)).length : rk.length; if (s) s.textContent = n; b.classList.toggle('z', !n && b.dataset.v !== st.kind); });
        FK.forEach(k => { const r = Find.run(MDATA.filter(w => pass(w, k, RS)), st.q);
          $$(`.chip[data-k="${k}"]`, fpan).forEach(c => { const v = c.dataset.v, n = r.filter(w => k === 'fmt' ? Find.fmtsOf(w).has(v) : k === 'tool' ? (w.tools || []).some(t => tk(t) === v) : (w.channels || []).includes(v)).length; $('small', c).textContent = n; c.classList.toggle('z', !n && !st[k].has(v)); }); });
        const n = FK.reduce((a, k) => a + st[k].size, 0); fbtn.innerHTML = `필터${n ? ` <small>${n}</small>` : ''}`;
      }
      const box = F === 2 ? rail : F === 3 && worksPanel ? fpan : null, xs = [];   // 지금 화면에 칩으로 보이는 값은 빼고
      FK.forEach(k => st[k].forEach(v => { if (!(box && $(`.chip[data-k="${k}"][data-v="${CSS.escape(v)}"]`, box))) xs.push([k, v, label(k, v)]); }));
      if (st.made) xs.push(['made', st.made, nm(BY[st.made])]);
      if (row) xs.push(['row', st.row, row.title]);
      act.innerHTML = xs.map(([k, v, l]) => `<button class="chip x" type="button" data-x="${k}" data-v="${esc(v)}" aria-label="${esc(l)} 조건 지우기">${esc(l)}${ico('close', 'sm')}</button>`).join('');
    };
    const draw = anim => {
      const row = rowOf(), RS = row ? new Set(row.items.map(w => w.id)) : null; if (!row) st.row = '';
      const ok = new Set(Find.run(MDATA.filter(w => pass(w, '', RS)), st.q).map(w => w.id));
      const apply = () => { $$('.card', grid).forEach(c => { c.hidden = !ok.has(c.dataset.id); }); cnt.textContent = `${ok.size}건`; paint(RS, row); };
      if (anim && dm('wfx') === 2) vt(apply); else apply();
    };
    const setPanel = o => { if (!fpan) return; worksPanel = o; fpan.classList.toggle('on', o); fpan.inert = !o; fbtn.setAttribute('aria-expanded', o); draw(false); };
    const toggle = (k, v) => { if (st[k].has(v)) st[k].delete(v); else st[k].add(v); draw(true); write(); };
    rail.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.k) toggle(b.dataset.k, b.dataset.v); else { st.kind = b.dataset.v; draw(true); write(); } }, on);
    if (fpan) { fpan.addEventListener('click', e => { const c = e.target.closest('.chip[data-k]'); if (c) toggle(c.dataset.k, c.dataset.v); }, on); fbtn.addEventListener('click', () => setPanel(!worksPanel), on); }
    act.addEventListener('click', e => { const c = e.target.closest('[data-x]'); if (!c) return; const k = c.dataset.x; if (FK.includes(k)) st[k].delete(c.dataset.v); else st[k] = ''; draw(true); write(); q.focus({ preventScroll: true }); }, on);
    let dT = 0;
    q.addEventListener('input', () => { st.q = q.value; clearTimeout(dT); if (dm('wfx') === 2) dT = setTimeout(() => draw(true), 120); else draw(false); writeLater(); }, on);   // 한글 조합 중에도 그대로 거름(자모 비교)
    q.addEventListener('keydown', e => { if (e.isComposing || e.keyCode === 229 || e.key !== 'ArrowDown') return; const c = $('.card:not([hidden])', grid); if (c) { e.preventDefault(); c.focus(); } }, on);
    grid.addEventListener('click', () => { if (worksFlush) worksFlush(); }, { capture: true, signal: ac.signal });   // 상영관 주소를 쌓기 전에 검색 주소부터 확정 → 닫으면 그 검색 그대로
    addEventListener('hashchange', () => { load(parseH()); st.q = parseH().q || ''; q.value = st.q; draw(true); }, on);
    if (F === 3) { worksPanel = worksPanel ?? FK.some(k => st[k].size); fpan.classList.toggle('on', worksPanel); fpan.inert = !worksPanel; fbtn.setAttribute('aria-expanded', worksPanel); }
    draw(false);
    if (worksFirst && h0.q !== null && !EDIT) { q.focus({ preventScroll: true }); q.select(); }   // works.html#q= (어디서나 검색 3 「/」)
    worksFirst = false;
  };
  if ($('.lib')) new MutationObserver(() => renderWorks()).observe(document.body, { attributes: true, attributeFilter: ['data-facet'] });

  /* ---------- 어디서나 검색(P35, gsearch): 2 = 내비 돋보기·「/」 → 덮개(치는 즉시 결과 · ↓·Enter로 결과 · 방향키 2차원 · 아무 글자나 치면 다시 검색칸 · Esc 닫기 · 뒤로 가기도 닫힘)
     3 = 「/」 → 작업 탭 검색칸. 결과에 도구는 섞지 않음 — 도구 탭 안에서만 도구도 찾고, 누르면 그 도구로(탭 밖으로 안 나감). 편집 화면은 끔 ---------- */
  const Search = (() => {
    let O = null, inp = null, res = null, open = false, last = null, built = null, pool = [];
    const editable = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    const vis = () => $$('.card:not([hidden])', res);
    const tab = el => vis().forEach(c => { c.tabIndex = c === el ? 0 : -1; });
    const fill = () => {   // 카드는 한 번만 만들고 숨김만 바꿈(치는 동안 썸네일이 다시 뜨지 않게)
      const tl = !!$('.tl'), list = (tl ? DATA.filter(w => w.group === 'tools' && $(`.ti[data-id="${CSS.escape(w.id)}"]`)) : []).concat(MDATA);
      if (built === DATA && pool.length === list.length) return; built = DATA; pool = list;
      res.innerHTML = list.map(w => cardHTML(w, 'wide')).join('');
      $$('.card', res).forEach(c => { const w = BY[c.dataset.id]; c.addEventListener('click', e => { e.preventDefault(); if (isTool(w)) { hide(() => Tools && Tools.pick(w.id, true)); return; } Theater.open(w.id, { queue: vis().map(x => x.dataset.id).filter(id => !isTool(BY[id])) }); const T = $('.theater.on'); if (T && !T.contains(document.activeElement)) T.focus({ preventScroll: true }); }); });   // 덮개가 inert로 만든 상영관에 포커스가 못 들어간 경우 보정
    };
    const draw = () => { const v = inp.value, ok = new Set((v.trim() ? Find.run(pool, v) : MDATA.slice(0, 8)).map(w => w.id)); $$('.card', res).forEach(c => { c.hidden = !ok.has(c.dataset.id); }); tab(vis()[0]); O.scrollTop = 0; };
    const build = () => {
      O = document.createElement('div'); O.className = 'gs'; O.setAttribute('role', 'dialog'); O.setAttribute('aria-modal', 'true'); O.setAttribute('aria-label', '검색');
      O.innerHTML = `<div class="gs-bar"><div class="wrap in"><svg class="ic gi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg><input class="gs-q" type="search" placeholder="검색" aria-label="작품 검색" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"><button class="gs-x" type="button" aria-label="닫기">${ico('close')}</button></div></div><div class="gs-body"><div class="wrap"><div class="grid gs-r" data-queue></div></div></div>`;
      document.body.appendChild(O); inp = $('.gs-q', O); res = $('.gs-r', O);
      inp.addEventListener('input', draw); $('.gs-x', O).addEventListener('click', () => hide());
      O.addEventListener('keydown', e => {
        if (e.isComposing || e.keyCode === 229) return;   // 한글 조합 중 Enter·Esc·방향키는 입력기 몫
        const k = e.key, L = vis();
        if (k === 'Escape') { e.preventDefault(); hide(); return; }
        if (e.target === inp) { if ((k === 'ArrowDown' || k === 'Enter') && L[0]) { e.preventDefault(); tab(L[0]); L[0].focus(); } return; }
        const c = e.target.closest && e.target.closest('.card'), i = L.indexOf(c); if (i < 0) return;
        if ((k.length === 1 || k === 'Backspace') && !e.ctrlKey && !e.metaKey && !e.altKey && k !== ' ') { inp.focus(); return; }   // 결과에서 바로 이어 치기
        const cols = Math.max(1, L.filter(x => x.offsetTop === L[0].offsetTop).length), row = Math.floor(i / cols), rows = Math.ceil(L.length / cols);
        let n = null;
        if (k === 'ArrowRight') n = Math.min(L.length - 1, i + 1); else if (k === 'ArrowLeft') n = i - 1;
        else if (k === 'ArrowDown') n = row < rows - 1 ? Math.min(L.length - 1, i + cols) : i; else if (k === 'ArrowUp') n = i - cols;
        else if (k === 'Home') n = 0; else if (k === 'End') n = L.length - 1; else return;
        e.preventDefault(); if (n < 0) { inp.focus(); return; } tab(L[n]); L[n].focus();
      });
      O.addEventListener('focusin', e => { const c = e.target.closest && e.target.closest('.card'); if (c) tab(c); });
    };
    const show = () => {
      if (open || EDIT) return; if (!O) build(); fill(); open = true; last = document.activeElement;
      Pop.hide(true); Feat.hold('search'); hist.push({ ...(hist.st() || {}), gs: 1 }, location.href);
      O.classList.add('on'); Modal.open(O); inp.focus({ preventScroll: true }); inp.select(); draw();
    };
    const hide = then => {   // then: 뒤로 가기가 끝난 다음 할 일(도구 고르기 — 주소가 섞이지 않게)
      if (!open) return; open = false; O.classList.remove('on'); Modal.close(O); Feat.release('search');
      const st = hist.st(), fn = typeof then === 'function' ? then : null;
      if (then !== true && st && st.gs) { if (fn) addEventListener('popstate', () => setTimeout(fn), { once: true }); try { history.back(); } catch (e) { } } else if (fn) fn();
      if (!fn && last && last.focus) last.focus({ preventScroll: true });
    };
    addEventListener('popstate', () => { if (!open) return; if (!(hist.st() && hist.st().gs)) hide(true); else if (!O.contains(document.activeElement) && !$('.theater.on')) (vis()[0] || inp).focus({ preventScroll: true }); });   // 상영관을 닫고 돌아오면 포커스는 덮개 안으로
    document.addEventListener('keydown', e => {
      if (open && e.key === 'Escape' && !e.isComposing && !e.defaultPrevented && !O.contains(e.target) && !(e.target.closest && e.target.closest('.theater,[aria-modal="true"]')) && !$('.theater.on')) { e.preventDefault(); hide(); return; }   // 포커스가 덮개 밖에 떨어졌을 때만(상영관 Esc는 상영관 몫)
      if (e.key !== '/' || EDIT || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || open || editable(document.activeElement) || $$('[aria-modal="true"]').some(d => d !== O && getComputedStyle(d).visibility !== 'hidden' && d.getClientRects().length)) return;
      const m = dm('gsearch'); if (m < 2) return; e.preventDefault();
      if (m === 2) { show(); return; }
      const qi = $('.lib .q'); if (!qi) { location.href = 'works.html#q='; return; }
      scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }); qi.focus({ preventScroll: true }); qi.select();
    }, true);   // 캡처: 상영관 Esc 처리보다 먼저 「상영관이 열려 있었는지」를 봄
    $$('[data-gs]').forEach(b => b.addEventListener('click', () => { if (dm('gsearch') === 2) show(); }));
    return { show, hide };
  })();

  /* ---------- 정보 값이 곧 링크(P34-3, facet 3): 상영관 「툴」·「매체」 값 · 이력서 「기술」 값 → 작업 탭이 그 조건으로(작업 탭 안이면 상영관을 닫고 바로) ---------- */
  (() => {
    const on = () => dm('facet') === 3;
    const V = () => { const t = new Map(), c = new Set(); MDATA.forEach(w => { (w.tools || []).forEach(x => t.set(Find.norm(Find.toolKey(x)), Find.toolKey(x))); (w.channels || []).forEach(x => c.add(x)); }); return { t, c }; };
    const toolOf = (s, v) => { const n = Find.norm(Find.toolKey(s)); if (v.t.has(n)) return v.t.get(n); if (n.length >= 4) for (const [k, x] of v.t) if (k.length >= 4 && (n.startsWith(k) || k.startsWith(n))) return x; return ''; };
    const a = (k, v, txt) => `<a class="fl" href="works.html#${k}=${encodeURIComponent(v)}">${esc(txt)}</a>`;
    const theater = () => {
      const T = $('.theater'), d = T && $('.desc', T), w = T && BY[T.dataset.cur]; if (!d || !w || !on()) return; const v = V();
      $$('.spec span', d).forEach(sp => { const k = sp.textContent.trim(), b = sp.nextElementSibling, arr = k === '툴' ? (w.tools || []) : k === '매체' ? (w.channels || []) : null;
        if (!arr || !b || b.querySelector('a') || b.textContent !== arr.join(' · ')) return;
        b.innerHTML = arr.map(x => { const y = k === '툴' ? toolOf(x, v) : v.c.has(x) ? x : ''; return y ? a(k === '툴' ? 'tool' : 'ch', y, x) : esc(x); }).join(' · '); });
    };
    const split = s => { const o = []; let d = 0, c = ''; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === '(') d++; else if (ch === ')') d = Math.max(0, d - 1); if (!d && s.startsWith(' · ', i)) { o.push(c, ' · '); c = ''; i += 2; } else c += ch; } o.push(c); return o.filter(x => x !== ''); };
    const cv = () => $$('.cv table.skills td:not(.d)').forEach(td => {
      if (td.dataset.o === undefined) td.dataset.o = td.innerHTML; else td.innerHTML = td.dataset.o; if (!on()) return; const v = V();
      [...td.childNodes].forEach(n => { if (n.nodeType === 1) { const y = toolOf(n.textContent, v); if (y) n.innerHTML = a('tool', y, n.textContent); }
        else if (n.nodeType === 3) { const f = document.createDocumentFragment(); split(n.textContent).forEach(p => { const y = p !== ' · ' && p.trim() ? toolOf(p.trim(), v) : ''; if (y) { const t = document.createElement('template'); t.innerHTML = a('tool', y, p); f.append(t.content); } else f.append(p); }); n.replaceWith(f); } });
    });
    const D = $('.theater .desc'); if (D) new MutationObserver(theater).observe(D, { childList: true });
    new MutationObserver(() => { if ($('.cv')) cv(); theater(); }).observe(document.body, { attributes: true, attributeFilter: ['data-facet'] });
    if ($('.cv') && on()) cv();
    document.addEventListener('click', e => {
      const l = e.target.closest && e.target.closest('a.fl'); if (!l || !$('.lib') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return; e.preventDefault();
      const h = '#' + l.getAttribute('href').split('#')[1], go = () => { hist.replace(hist.st(), location.pathname + h); dispatchEvent(new HashChangeEvent('hashchange')); scrollTo({ top: 0 }); };
      if ($('.theater.on')) { if (hist.st() && hist.st().t) addEventListener('popstate', () => setTimeout(go), { once: true }); else setTimeout(go); Theater.close(); } else go();
    });
  })();

  /* ---------- 도구 런처(P41~P44): 목록에 0.2초 올리면(키보드는 포커스) 그 체험판을 미리 받음 · 새 체험판은 뒤에서 받아 다 되면 위로 페이드인(흰 화면 없음),
     1초 넘으면 가운데 작은 스피너만 · ↑↓ 이동(P49 Rove) · tfacade 2 = 화면 이미지 + 「체험하기」 · tbig 2 = 체험판만 전체 화면, 3 = 집중 모드 · tmade 2·3 = 이 도구로 만든 작업 ---------- */
  const Tools = (() => {
    const TL = $('.tl'); if (!TL) return null;
    const stage = $('.tstage', TL), chips = $('.tbar .chips', TL), openA = $('.tbar .open', TL), bigB = $('.tbar .big', TL);
    const embsOf = w => { const L = (w && w.links) || {}; return (L.embeds && L.embeds.length) ? L.embeds : (L.embed ? [{ label: '데모', src: L.embed }] : []); };
    const srcOf = w => { const x = embsOf(w)[0]; return x ? url(x.src) : ''; };
    const shotOf = w => (w && w.media && (w.media.shot || w.media.poster)) || '';
    const abs = s => { try { return new URL(s, location.href).href; } catch (e) { return s; } };
    const got = new Set(); const prefetch = s => { if (!s || SAVE || got.has(abs(s))) return; got.add(abs(s)); const l = document.createElement('link'); l.rel = 'prefetch'; l.href = s; document.head.appendChild(l); };
    let cur = stage.dataset.id, pend = null, spinT = 0;
    const layers = () => [...stage.children].filter(x => x.tagName === 'IFRAME' || x.classList.contains('tfc'));
    const top = () => layers().filter(x => x !== pend).pop() || null;
    const settle = el => {   // 준비된 층을 위로 페이드인 → 아래 층 정리
      if (pend !== el) return; pend = null; clearTimeout(spinT); stage.classList.remove('busy');
      const old = layers().filter(x => x !== el); el.classList.add('in'); setTimeout(() => old.forEach(x => x.remove()), RM ? 0 : 450);
    };
    const put = (el, ready) => {
      if (pend) pend.remove(); pend = el; clearTimeout(spinT); stage.classList.remove('busy'); spinT = setTimeout(() => { if (pend === el) stage.classList.add('busy'); }, 1000);
      ['load', 'error'].forEach(ev => ready.addEventListener(ev, () => settle(el), { once: true })); setTimeout(() => settle(el), 12000); stage.appendChild(el);
    };
    const guard = (f, back) => {   // 체험판이 받자마자 포커스를 가져가면(자동 포커스) 목록·페이지 키보드가 끊김 → 1.5초 안의 것은 원래 자리로 돌려줌
      const chk = () => { if (document.activeElement !== f) return; if (back && back !== document.body && back.isConnected) back.focus({ preventScroll: true }); else f.blur(); };
      [0, 300, 900, 1500].forEach(d => setTimeout(chk, d));
    };
    const frame = (s, title, keep) => {   // keep: 「체험하기」처럼 체험판을 직접 쓰려고 연 경우 — 포커스를 체험판에 둠
      const t = top(); if (!pend && t && t.tagName === 'IFRAME' && abs(t.getAttribute('src') || '') === abs(s)) return;
      const f = document.createElement('iframe'), back = document.activeElement; f.className = 'nx'; f.title = title || ''; f.setAttribute('allow', 'fullscreen; clipboard-write');
      if (!keep) f.addEventListener('load', () => guard(f, back), { once: true }); f.src = s; put(f, f);   // src 먼저(붙인 뒤에 주면 빈 about:blank의 load가 먼저 와서 흰 화면이 보임)
    };
    const go = () => { const w = BY[cur], s = srcOf(w); if (s) frame(s, w.title, true); };
    const bindGo = el => { el.addEventListener('click', go); const b = $('.tgo', el); if (b) ['pointerenter', 'focus'].forEach(ev => b.addEventListener(ev, () => prefetch(srcOf(BY[cur])))); };
    const facade = (w, btn) => {   // 체험판 대신 도구 화면 이미지(btn = 「체험하기」) — 체험판이 없는 도구도 흰 화면 대신 이 이미지
      const t = top(); if (!pend && t && t.classList.contains('tfc') && t.dataset.for === w.id && !!$('.tgo', t) === btn) return;
      const s = url(shotOf(w)), el = document.createElement('div'); el.className = 'tfc'; el.dataset.for = w.id;
      el.innerHTML = `<div class="bg" style="background-image:url('${esc(s)}')"></div>${btn ? `<button class="btn tgo" type="button">${ico('play', 'sm')} 체험하기</button>` : ''}`;
      const im = new Image(); im.alt = ''; el.insertBefore(im, $('.tgo', el)); put(el, im); im.src = s; if (btn) bindGo(el);
    };
    const show = w => { const s = srcOf(w); if (!s) facade(w, false); else if (dm('tfacade') === 2) facade(w, true); else frame(s, w.title); };
    const madeOf = id => MDATA.filter(w => (w.made_with || []).includes(id));
    const made = w => {   // tmade 2: 설명 아래 홈 줄 그대로 · 3: 설명 오른쪽 썸네일 3개 + 「모두」(works.html#made=도구)
      $$('.tmade', TL).forEach(x => x.remove()); const m = dm('tmade'), items = w ? madeOf(w.id) : []; if (m < 2 || !items.length) return;
      const d = $$('.tdesc', TL).find(x => x.dataset.for === w.id); if (!d) return; const box = document.createElement('div');
      if (m === 2) { box.className = 'tmade m2'; box.innerHTML = rowHTML({ key: 'made', title: '이 도구로 만든 작업', items, cls: items.every(x => orientOf(x) === 'tall') ? 'tall' : 'wide', more: '' }); d.after(box); mountRows(box); }
      else { box.className = 'tmade m3'; box.dataset.queue = ''; box.innerHTML = `<div class="hd"><h3>이 도구로 만든 작업</h3><a class="more" href="works.html#made=${encodeURIComponent(w.id)}">모두</a></div><div class="th">${items.slice(0, 3).map(x => cardHTML(x, 'wide')).join('')}</div>`; (d.lastElementChild || d).appendChild(box); $$('.card', box).forEach(bindCard); }
    };
    const pick = (id, push) => {
      const w = BY[id]; if (!w) return; const L = w.links || {}, embs = embsOf(w), s = srcOf(w); cur = id;
      $$('.ti', TL).forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id)); $$('.tdesc', TL).forEach(d => { d.hidden = d.dataset.for !== id; });
      stage.dataset.id = id; openA.href = s || L.live || '#'; openA.hidden = !s && !L.live;
      chips.innerHTML = embs.length > 1 ? embs.map((x, i) => `<button class="chip" data-src="${esc(x.src)}" aria-pressed="${i === 0}">${esc(x.label)}</button>`).join('') : '';
      show(w); made(w); if (push) hist.replace(null, `${location.pathname}#${id}`);
    };
    chips.addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; $$('.chip', chips).forEach(x => x.setAttribute('aria-pressed', x === c)); const s = url(c.dataset.src); frame(s, (BY[cur] || {}).title); openA.href = s; });
    chips.addEventListener('pointerover', e => { const c = e.target.closest('.chip'); if (c) prefetch(url(c.dataset.src)); });
    $$('.ti', TL).forEach(b => { let t = 0; const pf = () => prefetch(srcOf(BY[b.dataset.id]));
      b.addEventListener('pointerenter', () => { clearTimeout(t); t = setTimeout(pf, 200); }); b.addEventListener('pointerleave', () => clearTimeout(t)); b.addEventListener('focus', pf);
      b.addEventListener('click', () => pick(b.dataset.id, true)); });
    const focusMode = on => {   // tbig 3 — 체험판 칸이 제자리에서 커짐(View Transition), 미지원·움직임 줄이기는 즉시
      const run = () => { TL.classList.toggle('focus', on); document.documentElement.classList.toggle('tfocus', on); bigB.textContent = on ? '작게 보기' : '크게 보기'; };
      if (RM || !document.startViewTransition || document.hidden) return run();
      stage.style.viewTransitionName = 'tstage'; const t = document.startViewTransition(run); t.ready.catch(() => { }); t.finished.finally(() => { stage.style.viewTransitionName = ''; });
    };
    if (bigB) bigB.addEventListener('click', () => {
      const m = dm('tbig');
      if (m === 2) { const fs = document.fullscreenElement || document.webkitFullscreenElement; if (fs) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
        if (!stage.querySelector('iframe')) go(); const rq = stage.requestFullscreen || stage.webkitRequestFullscreen; try { const p = rq && rq.call(stage); if (p && p.catch) p.catch(() => { }); } catch (e) { } return; }
      if (m === 3) { focusMode(!TL.classList.contains('focus')); return; }
      Theater.open(stage.dataset.id, { queue: $$('.ti', TL).map(b => b.dataset.id), autoplay: false });
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.defaultPrevented && TL.classList.contains('focus') && !$('.theater.on')) focusMode(false); });
    new MutationObserver(rs => { const ks = rs.map(r => r.attributeName), w = BY[cur]; if (!w) return;   // /design 미리보기에서 번호를 바꿀 때
      if (ks.includes('data-tfacade')) show(w);
      if (ks.includes('data-tmade')) made(w);
      if (ks.includes('data-tbig') && dm('tbig') !== 3 && TL.classList.contains('focus')) { TL.classList.remove('focus'); document.documentElement.classList.remove('tfocus'); bigB.textContent = '크게 보기'; }
    }).observe(document.body, { attributes: true, attributeFilter: ['data-tfacade', 'data-tmade', 'data-tbig'] });
    const sf = $('.tfc', stage); if (sf) { sf.classList.add('in'); bindGo(sf); }
    const f0 = $('iframe', stage); if (f0) { try { if (f0.contentDocument && f0.contentDocument.readyState === 'complete') guard(f0, null); else f0.addEventListener('load', () => guard(f0, null), { once: true }); } catch (e) { } }
    const h = location.hash.slice(1); if (h && BY[h] && $$('.ti', TL).some(b => b.dataset.id === h)) pick(h, false); else { const w = BY[cur]; if (w && !srcOf(w)) show(w); made(w); }
    addEventListener('hashchange', () => { const k = location.hash.slice(1); if (k !== cur && $$('.ti', TL).some(b => b.dataset.id === k)) pick(k, false); });   // 같은 페이지 안 tools.html#도구 링크
    Rove.mount($('.trail', TL), { sel: '.ti', mode: 'y' });   // P49: 도구 목록 ↑↓(누르면 그 도구)
    return { pick };
  })();

  /* ---------- 메일 복사 · 인쇄 ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); try { await navigator.clipboard.writeText(b.dataset.copy); const t = b.textContent; b.textContent = '복사됨 ✓'; setTimeout(() => b.textContent = t, 1600); } catch (err) { location.href = 'mailto:' + b.dataset.copy; } }));
  $$('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));

  /* ---------- 시작: 그리기 → 딥링크 → 최신 데이터 확인(바뀌었으면 다시 그리기) ---------- */
  const renderAll = () => { renderHome(); renderWorks(); };
  window.PF = { S, setData, renderAll, renderHome, renderRows, renderWorks, applyDesign, Feat, cardHTML, segOf, feVideo, sigWide, posterOf, vidsOf, url, esc, ico, KINDS, get BY() { return BY; }, get DATA() { return DATA; }, get MDATA() { return MDATA; }, isTool, Theater: window.Theater, modal: Modal, rove: Rove, auto: Auto.on, snd: Snd, loud: Loud };
  renderAll(); Auto.ui();
  if (!EDIT && ((performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {}).type === 'back_forward') { try { rowsRestore(JSON.parse(sessionStorage.getItem(ROWK) || 'null'), false); } catch (e) { } }   // P19 뒤로 오면 줄 가로 위치 그대로(세로는 브라우저가 복원)
  document.body.dataset.title = document.title;
  const qs = new URLSearchParams(location.search); const q = qs.get('w');
  if (q && BY[q]) Theater.open(q, { replace: true, queue: (isTool(BY[q]) ? DATA : MDATA).map(w => w.id), autoplay: true });
  if (q && BY[q] && +qs.get('t') > 0) Theater.seekOnce(+qs.get('t'));   // 공유 링크 「지금 장면부터」(?t=초)
  if (qs.has('reel')) { const b = $('[data-reel]'); b && b.click(); }
  if (!EDIT) {
    const get = f => fetch(`data/${f}.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
    Promise.all(['works', 'home', 'design', 'derived'].map(get)).then(([works, home, design, derived]) => {
      const fresh = { works, home, design, derived }; const cur = { works: S.all, home: S.H, design: S.D, derived: S.X };
      const changed = Object.keys(fresh).filter(k => fresh[k] && JSON.stringify(fresh[k]) !== JSON.stringify(cur[k]));
      if (!changed.length) return;
      setData(fresh); if (changed.includes('design') && !previewing) applyDesign(S.D.pick);
      if (changed.some(k => k !== 'design') && !document.querySelector('.theater.on')) { const st = rowsSnap(); renderAll(); rowsRestore(st, true); }   // P19 다시 그려도 줄 위치·포커스 그대로
    });
  }
  document.dispatchEvent(new CustomEvent('pf:ready'));
})();
