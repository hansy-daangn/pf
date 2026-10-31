/* HANSY portfolio — site.js (vanilla, no deps) */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SAVE = !!(navigator.connection && navigator.connection.saveData);
  const HOVER = matchMedia('(hover:hover)').matches;
  const MOBILE = () => matchMedia('(max-width:760px)').matches;
  const DATA = (() => { try { return JSON.parse($('#works-data').textContent); } catch (e) { return []; } })();
  const BY = Object.fromEntries(DATA.map(w => [w.id, w]));
  const GROUPS = { performance: '퍼포먼스 소재', tools: '도구 · 자동화', ai: 'AI 생성', research: '기획 · 리서치', personal: '개인 작업' };
  const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nb = s => esc(s).split(' ').map(x => `<span class="nb">${x}</span>`).join(' ');
  const ico = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"></use></svg>`;
  const BASE = document.body.dataset.base || './';
  const hist = { st: () => { try { return history.state; } catch (e) { return null; } }, push: (s, u) => { try { history.pushState(s, '', u); } catch (e) { } }, replace: (s, u) => { try { history.replaceState(s, '', u); } catch (e) { } } };
  const url = p => (!p ? '' : /^https?:/.test(p) ? p : BASE + p);
  const posterOf = w => (w.media && (w.media.poster || w.media.shot)) || '';
  const hasMedia = w => !!posterOf(w);
  const orientOf = w => (w.media && w.media.pw && w.media.ph && w.media.ph / w.media.pw > 1.2) ? 'tall' : 'wide';
  const aspectOf = w => { const f = (w.formats || [])[0] || '16:9'; const m = /^(\d+):(\d+)$/.exec(f); return m ? [+m[1], +m[2]] : [16, 9]; };

  /* ---------- 시안 스위치 (확정 후 PREF 기본값만 바꾸면 됨) ---------- */
  const PREF = { theme: 'light', bb: 'full', card: 'native', hover: 'play', stage: 'wide', tempo: 'base', pip: 'right' };
  const VARIANTS = [
    ['theme', '테마', [['light', '라이트', '애플 TV 앱(iOS/web) · 현재'], ['home-dark', '홈만 다크', '홈은 상영관처럼, 서브페이지는 라이트'], ['dark', '전체 다크', '넷플릭스 · 왓챠 · 웨이브']]],
    ['bb', '빌보드', [['full', '풀블리드', '넷플릭스 · 프라임 — 화면 전체'], ['card', '카드형', '애플 TV · 쿠팡플레이 — 둥근 카드']]],
    ['card', '카드 비율', [['native', '규격 그대로', '16:9 행 + 9:16 행 분리 — 애플 Top Shelf 3비율 · iOS 26 세로 포스터'], ['wide', '전부 16:9', '넷플릭스 · 안드로이드 TV 기본 — 세로 소재는 위쪽 크롭'], ['sq', '전부 1:1', '애플뮤직 · 유튜브 뮤직']]],
    ['hover', '카드 호버', [['play', '제자리 프리뷰', '유튜브 — 자리에서 무음 재생'], ['expand', '확대 + 한 줄', '애플 TV — 살짝 확대, 정보 한 줄'], ['pop', '확장 카드', '넷플릭스 — 0.5초 뒤 1.5배 팝오버 + 프리뷰']]],
    ['stage', '상영관', [['wide', '시네마', '넷플릭스 · 애플 TV — 영상 최대, 일시정지하면 정보 서랍이 열림(ⓘ·i)'], ['panel', '스테이지 + 패널', '유튜브 — 설명 패널 항상 표시']]],
    ['tempo', '모션 템포', [['base', '400ms', '애플 기본 · 현재'], ['fast', '280ms', '넷플릭스 — 빠릿'], ['slow', '520ms', '애플 TV+ — 여유']]],
  ];
  try { Object.assign(PREF, JSON.parse(localStorage.getItem('pf.dev') || '{}')); } catch (e) { }
  const applyPref = () => { for (const k in PREF) document.body.dataset[k] = PREF[k]; };
  applyPref();
  if (location.search.includes('dev') || window.PF_PANEL) {
    const d = document.createElement('div'); d.className = 'vp';
    const code = () => VARIANTS.map(([k, , os]) => `${k}:${(os.find(o => o[0] === PREF[k]) || os[0])[1]}`).join(' · ');
    d.innerHTML = `<button class="vpb" aria-expanded="false">시안 비교</button><div class="vpp" role="dialog" aria-label="시안 선택">` +
      VARIANTS.map(([k, t, os]) => `<div><h5>${t}</h5>${os.map(([v, l, why]) => `<label class="opt"><input type="radio" name="vp-${k}" value="${v}"${PREF[k] === v ? ' checked' : ''}><span><b>${l}</b><small>${why}</small></span></label>`).join('')}</div>`).join('') +
      `<div class="sum"><code></code><button type="button">조합 복사</button></div></div>`;
    document.body.appendChild(d); if (window.PF_PANEL_OPEN && innerWidth > 900) { d.classList.add('on'); }
    const sum = $('.sum code', d); const upd = () => { sum.textContent = code(); };
    upd();
    $('.vpb', d).setAttribute('aria-expanded', d.classList.contains('on')); $('.vpb', d).addEventListener('click', () => { d.classList.toggle('on'); $('.vpb', d).setAttribute('aria-expanded', d.classList.contains('on')); });
    $$('input', d).forEach(i => i.addEventListener('change', () => { PREF[i.name.slice(3)] = i.value; try { localStorage.setItem('pf.dev', JSON.stringify(PREF)); } catch (e) { } applyPref(); upd(); }));
    $('.sum button', d).addEventListener('click', async e => { try { await navigator.clipboard.writeText(code()); e.target.textContent = '복사됨 ✓'; setTimeout(() => e.target.textContent = '조합 복사', 1400); } catch (err) { } });
  }

  /* ---------- 내비 ---------- */
  const NAV = $('.nav'); const onSc = () => NAV && NAV.classList.toggle('sc', scrollY > 24); addEventListener('scroll', onSc, { passive: true }); onSc();

  /* ---------- 카드 hover 프리뷰 ---------- */
  let hovTimer = null, hovVid = null;
  const stopHov = () => { if (hovVid) { hovVid.pause(); hovVid.classList.remove('on'); hovVid.removeAttribute('src'); hovVid.load(); hovVid = null; } clearTimeout(hovTimer); };
  const queueOf = (card) => { const c = card.closest('[data-queue]'); return c ? $$('.card[data-id],.li[data-id],.shot[data-id]', c).map(x => x.dataset.id).filter((v, i, a) => v && a.indexOf(v) === i) : [card.dataset.id]; };
  const Pop = (() => {
    const P = document.createElement('div'); P.className = 'pop'; P.innerHTML = `<div class="art"><img alt=""><video muted loop playsinline preload="none" aria-hidden="true"></video></div><div class="bd"><div class="t"></div><div class="s"></div><div class="o"></div><div class="bt"><button class="btn acc">${ico('play', 'sm')} 재생</button><button class="btn ghost">상세</button></div></div>`;
    document.body.appendChild(P);
    const V = $('video', P); let cur = null, card = null, hideT = null;
    const show = (c, w) => {
      clearTimeout(hideT); cur = w; card = c; const r = c.getBoundingClientRect(); const scale = 1.5; const pw = Math.min(r.width * scale, innerWidth - 32);
      const tall = orientOf(w) === 'tall'; const [aw, ah] = tall ? [9, 16] : [16, 9]; const pwv = tall ? Math.min(r.width * 1.35, innerWidth - 32) : pw; P.style.setProperty('--pw', pwv + 'px'); P.style.setProperty('--pa', `${aw}/${ah}`);
      const im = $('img', P); im.src = url(posterOf(w)); $('.t', P).textContent = w.title; $('.s', P).textContent = w.subtitle || ''; $('.o', P).textContent = (w.copy && w.copy.one) || '';
      let left = r.left + r.width / 2 - pwv / 2; left = Math.max(16, Math.min(left, innerWidth - pwv - 16));
      const ph = pwv * ah / aw + 132; let top = r.top + r.height / 2 - ph / 2; top = Math.max(72, Math.min(top, innerHeight - ph - 16));
      P.style.left = left + 'px'; P.style.top = top + 'px'; P.style.transformOrigin = `${r.left + r.width / 2 - left}px ${r.top + r.height / 2 - top}px`;
      P.classList.add('on'); V.classList.remove('on'); const src = w.media && w.media.preview; if (src && !RM && !SAVE) { V.src = url(src); V.play().then(() => V.classList.add('on')).catch(() => { }); } else { V.removeAttribute('src'); }
    };
    const hide = (now) => { clearTimeout(hideT); hideT = setTimeout(() => { P.classList.remove('on'); V.pause(); V.classList.remove('on'); cur = null; }, now ? 0 : 160); };
    P.addEventListener('pointerenter', () => clearTimeout(hideT)); P.addEventListener('pointerleave', () => hide());
    $('.btn.acc', P).addEventListener('click', () => { if (cur) { hide(true); Theater.open(cur.id, { queue: card ? queueOf(card) : [cur.id], autoplay: true }); } });
    $('.btn.ghost', P).addEventListener('click', () => { if (cur) { hide(true); Theater.open(cur.id, { queue: card ? queueOf(card) : [cur.id], autoplay: false }); } });
    $('.art', P).addEventListener('click', () => $('.btn.acc', P).click());
    addEventListener('scroll', () => { if (P.classList.contains('on')) hide(true); }, { passive: true });
    return { show, hide };
  })();
  const bindCard = (card) => {
    const w = BY[card.dataset.id]; if (!w) return;
    card.addEventListener('click', e => { e.preventDefault(); Pop.hide(true); Theater.open(w.id, { queue: queueOf(card) }); });
    if (!HOVER || RM || SAVE) return;
    const src = w.media && w.media.preview;
    const start = () => {
      stopHov();
      if (PREF.hover === 'pop') { hovTimer = setTimeout(() => Pop.show(card, w), 500); return; }
      if (!src) return;
      hovTimer = setTimeout(() => { let v = $('video', card); if (!v) { v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.setAttribute('aria-hidden', 'true'); $('.art', card).appendChild(v); } v.src = url(src); v.play().then(() => v.classList.add('on')).catch(() => { }); hovVid = v; }, 500);
    };
    const leave = () => { stopHov(); if (PREF.hover === 'pop') Pop.hide(); };
    card.addEventListener('pointerenter', start); card.addEventListener('focus', start);
    card.addEventListener('pointerleave', leave); card.addEventListener('blur', leave);
  };
  $$('.card[data-id]').forEach(bindCard);

  /* ---------- 행 화살표 ---------- */
  $$('.row .trk').forEach(trk => {
    const sc = $('.sc', trk); if (!sc) return;
    const L = $('.ar.l', trk), R = $('.ar.r', trk);
    const upd = () => { if (!L) return; L.classList.toggle('can', sc.scrollLeft > 8); R.classList.toggle('can', sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 8); };
    sc.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    L && L.addEventListener('click', () => sc.scrollBy({ left: -sc.clientWidth * .9, behavior: RM ? 'auto' : 'smooth' }));
    R && R.addEventListener('click', () => sc.scrollBy({ left: sc.clientWidth * .9, behavior: RM ? 'auto' : 'smooth' }));
  });

  /* ---------- 빌보드 ---------- */
  const BB = $('.bb');
  if (BB) {
    const slides = $$('.slide', BB), dots = $$('.dots button[data-i]', BB), pp = $('.dots .pp', BB); const GAP = RM ? 0 : 700;
    let i = 0, paused = false, loopT = null;
    const loopOf = v => { const l = (v.dataset.loop || '0,8').split(',').map(Number); return { a: l[0] || 0, b: l[1] || 8 }; };
    const play = (s) => {
      const v = $('video', s); if (!v || RM || SAVE || paused || MOBILE()) return;
      if (!v.src) { v.src = v.dataset.src; v.addEventListener('timeupdate', () => { const { a, b } = loopOf(v); if (v.currentTime >= b) { v.classList.remove('on'); v.pause(); clearTimeout(loopT); loopT = setTimeout(() => { v.currentTime = a; if (s.classList.contains('on') && !paused) v.play().then(() => v.classList.add('on')).catch(() => { }); }, GAP); } }); }
      clearTimeout(loopT); loopT = setTimeout(() => { if (s.classList.contains('on') && !paused) { v.currentTime = loopOf(v).a; v.play().then(() => { v.classList.add('on'); const sb = $('.snd', s); if (sb) { sb.hidden = false; } }).catch(() => { }); } }, 3000);
    };
    const setSnd = (s, muted) => { const sb = $('.snd', s); if (!sb) return; sb.innerHTML = ico(muted ? 'mute' : 'vol', 'sm'); sb.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기'); };
    $$('.snd', BB).forEach(sb => sb.addEventListener('click', () => { const s = sb.closest('.slide'); const v = $('video', s); if (!v) return; v.muted = !v.muted; setSnd(s, v.muted); if (!v.muted) stopHov(); }));
    const stop = (s) => { clearTimeout(loopT); const v = $('video', s); if (v) { v.pause(); v.classList.remove('on'); v.muted = true; setSnd(s, true); const sb = $('.snd', s); if (sb) sb.hidden = true; } };
    const hydrate = (s) => { const im = $('img[data-src]', s); if (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); } const bl = $('.blur[data-bg]', s); if (bl) { bl.style.backgroundImage = `url(${bl.dataset.bg})`; bl.removeAttribute('data-bg'); } };
    const go = (n) => { stop(slides[i]); slides[i].classList.remove('on'); slides[i].setAttribute('aria-hidden', 'true'); slides[i].setAttribute('inert', ''); dots[i] && dots[i].classList.remove('on'); i = (n + slides.length) % slides.length; hydrate(slides[i]); slides[i].classList.add('on'); slides[i].setAttribute('aria-hidden', 'false'); slides[i].removeAttribute('inert'); dots[i] && dots[i].classList.add('on'); play(slides[i]); };
    window.__bbPause = () => stop(slides[i]); window.__bbResume = () => play(slides[i]);
    slides.forEach((s, k) => { if (k !== i) setTimeout(() => hydrate(s), 4000 + k * 300); });
    dots.forEach(d => d.addEventListener('click', () => go(+d.dataset.i)));
    pp && pp.addEventListener('click', () => { paused = !paused; pp.innerHTML = ico(paused ? 'play' : 'pause', 'sm'); pp.setAttribute('aria-label', paused ? '미리보기 재생' : '미리보기 일시정지'); const v = $('video', slides[i]); if (paused) { clearTimeout(loopT); v && v.pause(); } else play(slides[i]); });
    document.addEventListener('keydown', e => { if (document.activeElement && BB.contains(document.activeElement)) { if (e.key === 'ArrowRight') go(i + 1); if (e.key === 'ArrowLeft') go(i - 1); } });
    $$('[data-open]', BB).forEach(b => b.addEventListener('click', () => Theater.open(b.dataset.open, { queue: slides.map(s => s.dataset.id), autoplay: true })));
    play(slides[0]);
    document.addEventListener('visibilitychange', () => { const v = $('video', slides[i]); if (!v) return; if (document.hidden) v.pause(); else if (!paused && v.classList.contains('on')) v.play().catch(() => { }); });
  }

  /* ---------- 쇼릴 ---------- */
  $$('[data-reel]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); const q = DATA.filter(w => w.grade === 1 && w.media && (w.media.full || w.media.preview || (w.media.variants || []).length)).sort((a, b) => (a.feat_order ?? 99) - (b.feat_order ?? 99) || (a.sort || 99) - (b.sort || 99)).map(w => w.id); if (q.length) Theater.open(q[0], { queue: q, autoplay: true, reel: true }); }));

  /* ---------- 상영관 ---------- */
  const Theater = (() => {
    const T = document.createElement('div'); T.className = 'theater'; T.setAttribute('role', 'dialog'); T.setAttribute('aria-modal', 'true'); T.setAttribute('aria-label', '작품 재생');
    T.innerHTML = `<div class="bgart"></div><div class="veil"></div>
<div class="top"><span class="crumb"></span><span class="pos num"></span><span class="r"><button class="ib infob" title="정보 (I)" aria-label="정보 패널">i</button><button class="ib pipb" title="작게 보기 (P)" aria-label="작게 보기">${ico('pip')}</button><button class="ib full" title="전체화면 (F)" aria-label="전체화면">${ico('expand')}</button><button class="ib close" title="닫기 (Esc)" aria-label="닫기">${ico('close')}</button></span></div>
<div class="lay"><div class="stage">
 <div class="vw"><div class="big" aria-hidden="true">${ico('play', 'lg')}</div><div class="next" role="button" tabindex="0"><img alt=""><span><small>다음 작품</small><b></b></span><span class="cd num"></span><button class="ib cancel" aria-label="다음 작품 제안 닫기">${ico('close', 'sm')}</button></div></div>
 <div class="meta"><div><h1></h1><div class="s"></div></div><div class="y num"></div></div>
 <div class="ctl"><div class="pg" role="slider" aria-label="재생 위치" tabindex="0"><i></i></div><div class="tm"><span class="cur">0:00</span><span class="dur">0:00</span></div>
 <div class="bt"><span class="tr"><button class="ib prev" title="이전 작품 (Shift+←)" aria-label="이전 작품">${ico('prev')}</button><button class="ib pp" title="재생/일시정지 (Space)" aria-label="재생">${ico('play')}</button><button class="ib nxt" title="다음 작품 (Shift+→)" aria-label="다음 작품">${ico('next')}</button><button class="ib mute" title="음소거 (M)" aria-label="음소거">${ico('vol')}</button></span><span class="chips fmts"></span></div></div>
</div>
<aside class="panel"><div class="seg" role="tablist"><button role="tab" aria-pressed="true" data-t="desc">설명</button><button role="tab" aria-pressed="false" data-t="perf">성과</button><button role="tab" aria-pressed="false" data-t="q">다음</button></div><div class="tab desc"></div><div class="tab perf" hidden></div><div class="tab q" hidden></div></aside></div>`;
    document.body.appendChild(T);
    const P = document.createElement('div'); P.className = 'pip'; P.innerHTML = `<div class="bar"><b></b><span><button class="ib exp" aria-label="크게 보기">${ico('expand', 'sm')}</button><button class="ib x" aria-label="닫기">${ico('close', 'sm')}</button></span></div><div class="pg"><i></i></div>`;
    document.body.appendChild(P);
    const V = document.createElement('video'); V.playsInline = true; V.preload = 'metadata'; V.setAttribute('controlslist', 'nodownload');
    const el = { vw: $('.vw', T), next: $('.next', T), h1: $('.meta h1', T), s: $('.meta .s', T), y: $('.meta .y', T), crumb: $('.crumb', T), pos: $('.pos', T), pg: $('.pg', T), pgi: $('.pg i', T), cur: $('.cur', T), durE: $('.dur', T), pp: $('.pp', T), mute: $('.mute', T), fmts: $('.fmts', T), desc: $('.tab.desc', T), perf: $('.tab.perf', T), q: $('.tab.q', T), bg: $('.bgart', T), ctl: $('.ctl', T), tabs: $$('.seg button', T) };
    let cur = null, queue = [], idx = 0, idleT = null, cdT = null, lastFocus = null, autoplay = true, reel = false, frame = null;
    const sources = w => { const m = w.media || {}; const vs = (m.variants || []).filter(v => v.src && /\.(mp4|webm|mov)(\?|$)/i.test(v.src)).map(v => ({ label: v.label, src: v.src, w: v.w, h: v.h })); if (vs.length) return vs; return (m.full || m.preview) ? [{ label: (w.formats || ['영상'])[0], src: m.full || m.preview, w: aspectOf(w)[0], h: aspectOf(w)[1] }] : []; };
    const kindOf = w => (w.media && w.media.youtube) ? 'youtube' : sources(w).length ? 'video' : (w.links && w.links.embed) ? 'iframe' : 'image';
    const clearStage = () => { [...el.vw.children].forEach(n => { if (!n.classList.contains('big') && !n.classList.contains('next')) n.remove(); }); frame = null; V.pause(); };
    const setAspect = (w, h) => { el.vw.style.setProperty('--va', `${w}/${h}`); el.vw.style.setProperty('--vr', (w / h).toFixed(4)); P.style.setProperty('--va', `${w}/${h}`); };
    const showTab = (name) => { el.tabs.forEach(x => x.setAttribute('aria-pressed', x.dataset.t === name)); $$('.tab', T).forEach(t => t.hidden = !t.classList.contains(name)); };
    const chipLabel = s => String(s).split(' — ')[0];
    const render = (w) => {
      const kind = kindOf(w), srcs = sources(w); const poster = posterOf(w);
      el.h1.innerHTML = nb(w.title); el.s.textContent = w.subtitle || w.role || ''; el.y.textContent = w.year || '';
      el.crumb.innerHTML = `<b>${esc(GROUPS[w.group] || '작업')}</b>`; el.pos.textContent = queue.length > 1 ? `${String(idx + 1).padStart(2, '0')} / ${String(queue.length).padStart(2, '0')}` : '';
      el.bg.style.backgroundImage = poster ? `url(${url(poster)})` : 'none';
      clearStage(); el.next.classList.remove('on'); delete el.next.dataset.dismissed; clearInterval(cdT);
      let embs = [];
      if (kind === 'video') { const s0 = srcs[0]; setAspect(s0.w || 16, s0.h || 9); V.src = url(s0.src); V.poster = poster ? url(poster) : ''; V.muted = false; el.vw.prepend(V); if (autoplay) V.play().catch(() => { V.muted = true; V.play().catch(() => { }); }); }
      else if (kind === 'youtube') { setAspect(16, 9); frame = document.createElement('iframe'); frame.allow = 'autoplay; fullscreen; picture-in-picture'; frame.title = w.title; frame.src = `https://www.youtube-nocookie.com/embed/${w.media.youtube}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`; el.vw.prepend(frame); }
      else if (kind === 'iframe') {
        embs = (w.links.embeds && w.links.embeds.length) ? w.links.embeds : [{ label: '데모', src: w.links.embed }]; setAspect(16, 10);
        if (MOBILE()) { if (poster) { const im = document.createElement('img'); im.alt = w.title; im.src = url(poster); el.vw.prepend(im); } const a = document.createElement('a'); a.className = 'btn open'; a.target = '_blank'; a.rel = 'noopener'; a.href = url(embs[0].src); a.textContent = '새 창에서 열기 ↗'; el.vw.appendChild(a); }
        else { frame = document.createElement('iframe'); frame.title = w.title; frame.setAttribute('allow', 'fullscreen; clipboard-write; accelerometer; gyroscope'); frame.src = url(embs[0].src); el.vw.prepend(frame); }
      }
      else { setAspect(16, 9); if (poster) { const im = document.createElement('img'); im.alt = w.title; im.src = url(poster); el.vw.prepend(im); } else { const d = document.createElement('div'); d.className = 'ph'; d.textContent = w.title; el.vw.prepend(d); } }
      el.vw.classList.toggle('paused', kind === 'video' && V.paused);
      el.ctl.hidden = !(kind === 'video' || embs.length > 1);
      $$('.pg,.tm,.tr', el.ctl).forEach(n => n.hidden = kind !== 'video');
      const lab = (() => { const seen = {}; return srcs.map(s => { const l = chipLabel(s.label); seen[l] = (seen[l] || 0) + 1; return { l, n: seen[l] }; }).map(x => seen[x.l] > 1 ? `${x.l} · ${x.n}` : x.l); })();
      el.fmts.innerHTML = kind === 'video' && srcs.length > 1 ? srcs.map((s, i) => `<button class="chip" aria-pressed="${i === 0}" data-i="${i}" title="${esc(s.label)}">${esc(lab[i])}</button>`).join('')
        : (embs.length > 1 ? embs.map((s, i) => `<button class="chip" aria-pressed="${i === 0}" data-i="${i}">${esc(s.label)}</button>`).join('') : '');
      $$('.chip', el.fmts).forEach(c => c.addEventListener('click', () => { $$('.chip', el.fmts).forEach(x => x.setAttribute('aria-pressed', x === c)); if (kind === 'iframe') { if (frame) frame.src = url(embs[+c.dataset.i].src); } else switchFmt(+c.dataset.i); }));
      // 패널: 설명
      const c = w.copy || {}; const L = w.links || {};
      el.desc.innerHTML = (c.one ? `<p class="lead">${esc(c.one)}</p>` : '') +
        ['problem|문제', 'decision|결정', 'result|결과'].map(k => { const [key, lab] = k.split('|'); return c[key] ? `<div class="blk"><b>${lab}</b><span>${esc(c[key])}</span></div>` : ''; }).join('') +
        `<div class="meta-tbl">${[['역할', w.role], ['도구', (w.tools || []).join(' · ')], ['매체', (w.channels || []).join(' · ')], ['규격', (w.formats || []).join(' · ')], ['시기', w.period || w.year]].filter(x => x[1]).map(x => `<span>${x[0]}</span><b>${esc(x[1])}</b>`).join('')}</div>` +
        `<div class="ext">${L.live ? `<a class="btn ghost sm" href="${esc(L.live)}" target="_blank" rel="noopener">라이브 열기 ↗</a>` : ''}${L.github ? `<a class="btn ghost sm" href="${esc(L.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}${L.artifact ? `<a class="btn ghost sm" href="${esc(L.artifact)}" target="_blank" rel="noopener">원본 ↗</a>` : ''}</div>`;
      // 패널: 성과
      const ms = w.metrics || []; let bars = 0;
      el.perf.innerHTML = ms.map(m => { if (m.visible && m.value != null) return `<div class="m"><span>${esc(m.label)}</span><span class="ok">${esc(m.value)}</span></div>`; bars++; const d = String(m.digits || '4'); const bb = d.split('.').map(n => `<i class="rd" role="img" aria-label="비공개 수치" style="--n:${+n || 1}"></i>`).join('.'); const u = m.unit || ''; const pre = u === '₩' ? '₩ ' : '', post = u && u !== '₩' ? ' ' + u : ''; return `<div class="m"><span>${esc(m.label)}</span><span>${pre}${bb}${post}</span></div>`; }).join('') + (bars ? `<div class="legend">사내 수치라 숫자는 가리고 자릿수만 남겼습니다.</div>` : '');
      el.tabs[1].hidden = !ms.length;
      // 패널: 다음
      const nextList = queue.slice(idx + 1, idx + 7).map(id => BY[id]).filter(Boolean);
      el.q.innerHTML = nextList.length ? `<div class="q nx">${nextList.map((n, i) => `<button data-id="${n.id}"><span class="n">${String(idx + i + 2).padStart(2, '0')}</span><span>${esc(n.title)}<small>${esc(n.subtitle || '')}</small></span><span class="d">${n.year || ''}</span></button>`).join('')}</div>` : '';
      el.tabs[2].hidden = !nextList.length;
      $$('.q.nx button', el.q).forEach(b => b.addEventListener('click', () => jump(queue.indexOf(b.dataset.id))));
      showTab('desc');
      document.title = `${w.title} — HANSY`;
    };
    const switchFmt = (i) => { const s = sources(cur)[i]; if (!s) return; setAspect(s.w || 16, s.h || 9); const wasPlaying = !V.paused; V.src = url(s.src); if (wasPlaying || autoplay) V.play().catch(() => { }); };
    const jump = (n) => { if (n < 0 || n >= queue.length) return; idx = n; cur = BY[queue[idx]]; autoplay = true; delete T.dataset.infoLock; T.classList.toggle('info', PREF.stage === 'wide' && kindOf(cur) !== 'video'); render(cur); wake(); };
    const open = (id, opt = {}) => {
      const w = BY[id]; if (!w) return; lastFocus = document.activeElement;
      queue = (opt.queue && opt.queue.length ? opt.queue : [id]).filter(x => BY[x]); idx = Math.max(0, queue.indexOf(id)); autoplay = opt.autoplay !== false; reel = !!opt.reel;
      if (P.classList.contains('on')) hidePip(false);
      cur = w; T.classList.add('on'); document.body.style.overflow = 'hidden'; delete T.dataset.infoLock; T.classList.toggle('info', PREF.stage === 'wide' && (kindOf(w) !== 'video' || !autoplay)); render(w); wake(); T.tabIndex = -1; T.focus({ preventScroll: true }); window.__bbPause && window.__bbPause();
      const u = `${location.pathname}?w=${encodeURIComponent(id)}`; if (opt.replace || (hist.st() && hist.st().t)) hist.replace({ t: 1 }, u); else hist.push({ t: 1 }, u);
    };
    const close = (toPip = true, fromPop = false) => {
      if (!T.classList.contains('on')) return;
      const playing = cur && kindOf(cur) === 'video' && !V.paused && !V.ended;
      T.classList.remove('on'); document.body.style.overflow = ''; clearInterval(cdT); el.next.classList.remove('on');
      if (frame) { frame.remove(); frame = null; }
      if (playing && toPip) showPip(); else V.pause();
      if (!fromPop) { if (hist.st() && hist.st().t) { try { history.back(); } catch (e) { } } else hist.replace(null, location.pathname); }
      document.title = document.body.dataset.title || document.title;
      lastFocus && lastFocus.focus && lastFocus.focus(); window.__bbResume && window.__bbResume();
    };
    addEventListener('popstate', () => { if (T.classList.contains('on')) close(true, true); });
    const showPip = () => { P.prepend(V); $('.bar b', P).textContent = cur.title; P.classList.add('on'); };
    const hidePip = (stop = true) => { P.classList.remove('on'); if (stop) V.pause(); };
    $('.exp', P).addEventListener('click', () => { P.classList.remove('on'); T.classList.add('on'); document.body.style.overflow = 'hidden'; el.vw.prepend(V); wake(); });
    $('.x', P).addEventListener('click', () => hidePip(true));
    P.addEventListener('click', e => { if (e.target === V) $('.exp', P).click(); });
    const toggle = () => { if (!cur || kindOf(cur) !== 'video') return; V.paused ? V.play().catch(() => { }) : V.pause(); };
    $('.close', T).addEventListener('click', () => close(true));
    const toggleInfo = () => { T.classList.toggle('info'); T.dataset.infoLock = '1'; };
    $('.infob', T).addEventListener('click', toggleInfo);
    el.pp.addEventListener('click', toggle); el.vw.addEventListener('click', e => { if (e.target === V || e.target.closest('.big')) toggle(); });
    $('.prev', T).addEventListener('click', () => jump(idx - 1)); $('.nxt', T).addEventListener('click', () => jump(idx + 1));
    el.mute.addEventListener('click', () => { V.muted = !V.muted; });
    $('.full', T).addEventListener('click', () => { const t = el.vw; document.fullscreenElement ? document.exitFullscreen() : (t.requestFullscreen && t.requestFullscreen()); });
    $('.pipb', T).addEventListener('click', async () => { if (!cur || kindOf(cur) !== 'video') { close(false); return; } if (document.pictureInPictureEnabled && !RM) { try { await V.requestPictureInPicture(); return; } catch (e) { } } close(true); });
    $('.cancel', el.next).addEventListener('click', e => { e.stopPropagation(); clearInterval(cdT); el.next.classList.remove('on'); el.next.dataset.dismissed = '1'; });
    el.next.addEventListener('click', () => jump(idx + 1)); el.next.addEventListener('keydown', e => { if (e.key === 'Enter') jump(idx + 1); });
    el.tabs.forEach(b => b.addEventListener('click', () => showTab(b.dataset.t)));
    V.addEventListener('loadedmetadata', () => { if (V.videoWidth && V.videoHeight && el.vw.contains(V)) setAspect(V.videoWidth, V.videoHeight); });
    V.addEventListener('play', () => { el.pp.innerHTML = ico('pause'); el.pp.setAttribute('aria-label', '일시정지'); el.vw.classList.remove('paused'); if (PREF.stage === 'wide' && !T.dataset.infoLock) T.classList.remove('info'); });
    V.addEventListener('pause', () => { el.pp.innerHTML = ico('play'); el.pp.setAttribute('aria-label', '재생'); el.vw.classList.add('paused'); if (PREF.stage === 'wide' && T.classList.contains('on') && el.vw.contains(V) && !T.dataset.infoLock) T.classList.add('info'); });
    V.addEventListener('volumechange', () => { el.mute.innerHTML = ico(V.muted ? 'mute' : 'vol'); el.mute.setAttribute('aria-label', V.muted ? '음소거 해제' : '음소거'); });
    V.addEventListener('timeupdate', () => {
      const p = V.duration ? V.currentTime / V.duration : 0; el.pgi.style.width = (p * 100) + '%'; $('.pg i', P).style.width = (p * 100) + '%'; el.cur.textContent = fmtT(V.currentTime); el.durE.textContent = V.duration ? '-' + fmtT(V.duration - V.currentTime) : '0:00'; el.pg.setAttribute('aria-valuenow', Math.round(p * 100));
      if (V.duration && V.duration >= 60 && V.duration - V.currentTime <= 8 && !el.next.classList.contains('on') && !el.next.dataset.dismissed && queue[idx + 1] && T.classList.contains('on')) { const n = BY[queue[idx + 1]]; $('img', el.next).src = url(posterOf(n)); $('b', el.next).textContent = n.title; const cd = $('.cd', el.next); cd.innerHTML = ico('play', 'sm'); cd.style.setProperty('--p', 0); el.next.classList.add('on'); }
    });
    V.addEventListener('ended', () => {
      if (P.classList.contains('on')) { if (idx + 1 < queue.length && kindOf(BY[queue[idx + 1]]) === 'video') { idx++; cur = BY[queue[idx]]; V.src = url(sources(cur)[0].src); V.play().catch(() => { }); $('.bar b', P).textContent = cur.title; } else hidePip(true); return; }
      const n = BY[queue[idx + 1]]; if (!n) { el.vw.classList.add('paused'); return; }
      $('img', el.next).src = url(posterOf(n)); $('b', el.next).textContent = n.title; el.next.classList.add('on');
      if (!reel) return;
      let left = 5; const cd = $('.cd', el.next); cd.textContent = left; cd.style.setProperty('--p', 0);
      clearInterval(cdT); cdT = setInterval(() => { left--; cd.textContent = left; cd.style.setProperty('--p', (5 - left) * 20); if (left <= 0) { clearInterval(cdT); jump(idx + 1); } }, 1000);
    });
    const seekAt = (clientX) => { const r = el.pg.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width)); if (V.duration) V.currentTime = p * V.duration; };
    el.pg.addEventListener('pointerdown', e => { seekAt(e.clientX); const mv = ev => seekAt(ev.clientX); const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
    el.pg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { V.currentTime -= 5; e.preventDefault(); } if (e.key === 'ArrowRight') { V.currentTime += 5; e.preventDefault(); } });
    const wake = () => { T.classList.remove('idle'); clearTimeout(idleT); if (cur && kindOf(cur) === 'video' && !V.paused) idleT = setTimeout(() => T.classList.add('idle'), 3000); };
    ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach(ev => T.addEventListener(ev, wake, { passive: true }));
    V.addEventListener('play', wake); V.addEventListener('pause', wake);
    document.addEventListener('keydown', e => {
      if (!T.classList.contains('on')) return; if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      const k = e.key;
      if (k === 'Tab') { const f = $$('button,a[href],[tabindex="0"]', T).filter(x => !x.hidden && x.offsetParent !== null); if (f.length) { const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } return; }
      if (k === 'Escape') close(true);
      else if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
      else if (k === 'ArrowLeft') { e.shiftKey ? jump(idx - 1) : (V.currentTime -= 5); }
      else if (k === 'ArrowRight') { e.shiftKey ? jump(idx + 1) : (V.currentTime += 5); }
      else if (k === 'j') V.currentTime -= 10; else if (k === 'l') V.currentTime += 10;
      else if (/^[0-9]$/.test(k) && V.duration) V.currentTime = V.duration * (+k / 10);
      else if (k === 'ArrowUp') { e.preventDefault(); V.volume = Math.min(1, V.volume + .05); V.muted = false; } else if (k === 'ArrowDown') { e.preventDefault(); V.volume = Math.max(0, V.volume - .05); }
      else if (k === 'Home') V.currentTime = 0; else if (k === 'End' && V.duration) V.currentTime = V.duration - .1;
      else if (k === 'm') V.muted = !V.muted; else if (k === 'f') $('.full', T).click(); else if (k === 'p') $('.pipb', T).click(); else if (k === 'n' || (k === 'N' && e.shiftKey)) jump(idx + 1); else if (k === 'i') toggleInfo();
    });
    return { open, close };
  })();
  window.Theater = Theater;

  /* ---------- 라이브러리 필터 ---------- */
  const LIB = $('.lib');
  if (LIB) {
    const st = { group: null, channel: null, year: null, view: 'grid', sort: 'rec' };
    const grid = $('.grid', LIB), list = $('.list', LIB), cnt = $('.cnt', LIB);
    const items = DATA.filter(w => w.grade <= 2);
    const match = w => (!st.group || w.group === st.group) && (!st.channel || (w.channels || []).includes(st.channel)) && (!st.year || String(w.year) === st.year);
    const sortFn = (a, b) => st.sort === 'new' ? ((b.period || b.year) > (a.period || a.year) ? 1 : -1) : ((a.grade - b.grade) || ((a.sort || 99) - (b.sort || 99)));
    const uiCls = w => (w.group === 'tools' || w.group === 'research') ? ' ui' : '';
    const cardHTML = (w) => { const o = orientOf(w); const p = (o === 'wide' && w.media && w.media.poster16) || posterOf(w); return `<a class="card ${o}${uiCls(w)}" href="?w=${esc(w.id)}" data-id="${esc(w.id)}"><div class="art${p ? '' : ' ph'}" data-info="${esc(w.copy && w.copy.one || '')}">${p ? `<img src="${esc(url(p))}" alt="" loading="lazy" width="600" height="600">` : `<span class="pt">${esc(w.year || '')}</span>`}<span class="pl">${ico('play', 'sm')}</span></div><div class="t">${esc(w.title)}</div><div class="s">${esc(w.subtitle || '')}${(w.links && w.links.live) ? ' ↗' : ''}</div></a>`; };
    const rowHTML = (w, i) => { const p = posterOf(w); return `<button class="li" data-id="${esc(w.id)}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="th">${p ? `<img src="${esc(url(p))}" alt="" loading="lazy" width="128" height="128">` : ''}</span><span class="t">${esc(w.title)}<small>${esc(w.copy && w.copy.one || '')}</small></span><span class="m">${esc(w.role || w.subtitle || '')}</span><span class="c m">${esc((w.channels || []).join(' · '))}</span><span class="y">${w.year || ''}</span></button>`; };
    const U = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u')) || 8;
    const span = () => { if (grid.hidden || !grid.offsetParent) return; grid.classList.remove('ms'); let ok = 0; $$('.card', grid).forEach(c => { c.style.gridRowEnd = ''; const h = c.getBoundingClientRect().height; if (h) { c.style.gridRowEnd = `span ${Math.ceil(h / U)}`; ok++; } }); if (ok) grid.classList.add('ms'); };
    let spanT = null; const respan = () => { clearTimeout(spanT); spanT = setTimeout(span, 60); };
    addEventListener('resize', respan); grid.addEventListener('load', respan, true);
    new MutationObserver(respan).observe(document.body, { attributes: true, attributeFilter: ['data-card'] });
    const draw = () => {
      const all = items.filter(match).sort(sortFn); const rs = st.view === 'grid' ? all.filter(hasMedia) : all;
      cnt.textContent = `${rs.length}건` + (st.view === 'grid' && all.length !== rs.length ? ` · 목록에 ${all.length - rs.length}건 더` : '');
      grid.hidden = st.view !== 'grid'; list.hidden = st.view !== 'list';
      (st.view === 'grid' ? grid : list).innerHTML = rs.map(st.view === 'grid' ? cardHTML : rowHTML).join('');
      $$('.card[data-id]', grid).forEach(bindCard); $$('.li[data-id]', list).forEach(b => b.addEventListener('click', () => Theater.open(b.dataset.id, { queue: rs.map(x => x.id) })));
      span();
      $$('.rail button').forEach(b => b.setAttribute('aria-pressed', st[b.dataset.f] === (b.dataset.v || null) || (!st[b.dataset.f] && !b.dataset.v)));
    };
    $$('.rail button').forEach(b => b.addEventListener('click', () => { st[b.dataset.f] = st[b.dataset.f] === b.dataset.v ? null : (b.dataset.v || null); draw(); }));
    $$('.seg[data-k] button').forEach(b => b.addEventListener('click', () => { const k = b.closest('.seg').dataset.k; st[k] = b.dataset.v; $$('button', b.parentElement).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); }));
    draw();
  }

  /* ---------- 도구 샷 → 상영관 ---------- */
  $$('.tool .shot[data-id]').forEach(s => { const go = () => Theater.open(s.dataset.id, { queue: $$('.tool .shot[data-id]').map(x => x.dataset.id), autoplay: false }); s.addEventListener('click', go); s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });

  /* ---------- 메일 복사 · 인쇄 ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); try { await navigator.clipboard.writeText(b.dataset.copy); const t = b.textContent; b.textContent = '복사됨 ✓'; setTimeout(() => b.textContent = t, 1600); } catch (err) { location.href = 'mailto:' + b.dataset.copy; } }));
  $$('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));

  /* ---------- 딥링크 ---------- */
  document.body.dataset.title = document.title;
  const q = new URLSearchParams(location.search).get('w'); if (q && BY[q]) Theater.open(q, { autoplay: false, replace: true });
  if (new URLSearchParams(location.search).has('reel')) { const b = $('[data-reel]'); b && b.click(); }
})();
