/* HANSY portfolio — site.js (vanilla, 외부 의존 없음)
   구성: 공통 → 영상 고르기 → 확장 카드(호버) → 행 화살표 → 피처드 → 상영관 → 작업 목록 → 도구 → 딥링크 */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SAVE = !!(navigator.connection && navigator.connection.saveData);
  const HOVER = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const DATA = (() => { try { return JSON.parse($('#works-data').textContent); } catch (e) { return []; } })();
  const BY = Object.fromEntries(DATA.map(w => [w.id, w]));
  const KINDS = { '3d': '3D 영상', ai: 'AI 영상', motion: '모션 영상', owned: '온드 콘텐츠', image: '이미지 소재', personal: '개인 작업', tools: '도구 · 자동화' };
  const BASE = document.body.dataset.base || './';
  const url = p => (!p ? '' : /^https?:/.test(p) ? p : BASE + p);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nb = s => esc(s).split(' ').map(x => `<span class="nb">${x}</span>`).join(' ');
  const ico = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"></use></svg>`;
  const fmtT = s => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const hist = { st: () => { try { return history.state; } catch (e) { return null; } }, push: (s, u) => { try { history.pushState(s, '', u); } catch (e) { } }, replace: (s, u) => { try { history.replaceState(s, '', u); } catch (e) { } } };
  const posterOf = w => (w.media && (w.media.poster || w.media.shot)) || '';
  const vidsOf = w => (w.media && w.media.videos) || [];
  const startOf = w => (w.media && +w.media.start) || 0;

  /* ---------- 영상 화질 고르기: 1080p(hd) · 720p(sd) 두 개뿐 ---------- */
  const big = () => !SAVE && (!!document.fullscreenElement || innerWidth >= 900);   // 데스크톱은 1080p, 모바일·데이터 절약은 720p
  const pickBig = v => (v.sd && !big()) ? v.sd : v.hd;   // 상영관·피처드
  const pickSmall = v => v.sd || v.hd;                    // 확장 카드(작은 화면)

  /* 새 video 요소 — 재사용하지 않아 이전 영상 장면이 남지 않음 */
  const freshVideo = (src, at, { loopTo = null, muted = true } = {}) => {
    const v = document.createElement('video');
    v.muted = muted; v.playsInline = true; v.preload = 'auto'; v.setAttribute('aria-hidden', 'true');
    v.addEventListener('loadedmetadata', () => { if (at > 0 && at < v.duration - .5) v.currentTime = at; }, { once: true });
    v.addEventListener('playing', () => v.classList.add('on'), { once: true });
    if (loopTo !== null) v.addEventListener('ended', () => { v.currentTime = loopTo; v.play().catch(() => { }); });
    v.src = url(src);
    return v;
  };
  const killVideo = v => { if (!v) return; try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { } v.remove(); };

  /* ---------- 내비 ---------- */
  const NAV = $('.nav'); const onSc = () => NAV && NAV.classList.toggle('sc', scrollY > 8); addEventListener('scroll', onSc, { passive: true }); onSc();

  /* ---------- 확장 카드(호버 0.5초 → 원비율 영상) ---------- */
  const queueOf = card => { const c = card.closest('[data-queue]'); return c ? $$('.card[data-id]', c).map(x => x.dataset.id).filter((v, i, a) => a.indexOf(v) === i) : [card.dataset.id]; };
  const Pop = (() => {
    const P = document.createElement('div'); P.className = 'pop'; P.setAttribute('aria-hidden', 'true');
    P.innerHTML = `<div class="art"></div><div class="bd"><div class="t"></div><div class="s"></div><div class="bt"><button class="btn acc">${ico('play', 'sm')} 재생</button><button class="btn ghost">상세 정보</button></div></div>`;
    document.body.appendChild(P);
    const ART = $('.art', P); let cur = null, card = null, hideT = null, V = null;
    const clear = () => { killVideo(V); V = null; ART.innerHTML = ''; };
    const show = (c, w) => {
      clearTimeout(hideT); clear(); cur = w; card = c;
      const r = ($('.art', c) || c).getBoundingClientRect(); const tall = c.classList.contains('tall');
      const [aw, ah] = tall ? [9, 16] : [16, 9];
      const capH = innerHeight * (tall ? .5 : .46);
      let pw = Math.min(r.width * (tall ? 1.3 : 1.45), innerWidth - 32); if (pw * ah / aw > capH) pw = Math.max(r.width, capH * aw / ah);
      P.style.setProperty('--pw', pw + 'px'); P.style.setProperty('--pa', `${aw}/${ah}`);
      const p = posterOf(w);
      ART.innerHTML = `<div class="bgb" style="background-image:url('${esc(url(p))}')"></div><img alt="" src="${esc(url(p))}">`;
      $('.t', P).textContent = w.title; $('.s', P).textContent = [w.type, w.dur].filter(Boolean).join(' · ');
      const bodyH = 120; let left = r.left + r.width / 2 - pw / 2; left = Math.max(16, Math.min(left, innerWidth - pw - 16));
      const ph = pw * ah / aw + bodyH; let top = r.top + r.height / 2 - ph / 2; top = Math.max(64, Math.min(top, innerHeight - ph - 16));
      P.style.left = left + 'px'; P.style.top = top + 'px'; P.style.transformOrigin = `${r.left + r.width / 2 - left}px ${r.top + r.height / 2 - top}px`;
      P.classList.add('on');
      if (RM || SAVE) return;
      const v0 = vidsOf(w)[0];
      if (v0) { V = freshVideo(pickSmall(v0), startOf(w), { loopTo: startOf(w) }); ART.appendChild(V); V.play().catch(() => { }); }
      else if (w.media && w.media.youtube) {
        const f = document.createElement('iframe'); f.className = 'yt'; f.tabIndex = -1; f.allow = 'autoplay';
        f.src = `https://www.youtube-nocookie.com/embed/${w.media.youtube}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&loop=1&playlist=${w.media.youtube}`;
        f.addEventListener('load', () => setTimeout(() => f.classList.add('on'), 700), { once: true }); ART.appendChild(f);
      }
    };
    const hide = now => { clearTimeout(hideT); hideT = setTimeout(() => { P.classList.remove('on'); clear(); cur = null; }, now ? 0 : 140); };
    P.addEventListener('pointerenter', () => clearTimeout(hideT)); P.addEventListener('pointerleave', () => hide());
    const open = autoplay => { if (!cur) return; const id = cur.id, q = card ? queueOf(card) : [id]; hide(true); Theater.open(id, { queue: q, autoplay }); };
    $('.btn.acc', P).addEventListener('click', () => open(true)); $('.btn.ghost', P).addEventListener('click', () => open(false)); ART.addEventListener('click', () => open(true));
    addEventListener('scroll', () => { if (P.classList.contains('on')) hide(true); }, { passive: true });
    return { show, hide };
  })();
  let hovT = null;
  const bindCard = card => {
    const w = BY[card.dataset.id]; if (!w) return;
    card.addEventListener('click', e => { e.preventDefault(); clearTimeout(hovT); Pop.hide(true); Theater.open(w.id, { queue: queueOf(card) }); });
    if (!HOVER) return;
    card.addEventListener('pointerenter', () => { clearTimeout(hovT); hovT = setTimeout(() => Pop.show(card, w), 500); });
    card.addEventListener('pointerleave', () => { clearTimeout(hovT); Pop.hide(); });
  };
  $$('.card[data-id]').forEach(bindCard);

  /* ---------- 행 화살표: 넘칠 때 항상 표시, 끝이면 비활성 ---------- */
  $$('.row').forEach(row => {
    const sc = $('.sc', row), L = $('.ar.l', row), R = $('.ar.r', row), A = $('.arr', row); if (!sc || !L) return;
    const upd = () => { const over = sc.scrollWidth > sc.clientWidth + 4; A.hidden = !over; L.disabled = sc.scrollLeft < 8; R.disabled = sc.scrollLeft + sc.clientWidth > sc.scrollWidth - 8; };
    const step = d => sc.scrollBy({ left: d * sc.clientWidth * .85, behavior: RM ? 'auto' : 'smooth' });
    L.addEventListener('click', () => step(-1)); R.addEventListener('click', () => step(1));
    sc.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  });

  /* ---------- 피처드: 정해진 구간 재생 → 끝나면 다음 작품 ---------- */
  const FEAT = $('.feat');
  if (FEAT) {
    const frames = $$('.fs', FEAT), texts = $$('.fx', FEAT), dots = $$('.dots button[data-i]', FEAT), pp = $('.pp', FEAT), snd = $('.snd', FEAT);
    let i = 0, V = null, user = RM, muted = true, total = 0, remain = 0, t0 = 0, timer = null, fb = null, running = false;
    const holds = new Set(); const blocked = () => user || holds.size > 0;
    const seg = f => { const a = +f.dataset.a || 0, b = +f.dataset.b || a + 8; return { a, b, ms: Math.max(4, b - a) * 1000 }; };
    const fill = (pct, ms) => { dots.forEach((d, k) => d.classList.toggle('on', k === i)); const f = dots[i] && $('i', dots[i]); if (!f) return; f.style.transition = 'none'; f.style.width = (pct * 100) + '%'; if (ms) { void f.offsetWidth; f.style.transition = `width ${ms}ms linear`; f.style.width = '100%'; } };
    const run = () => { clearTimeout(fb); if (running || blocked() || remain <= 0) return; running = true; t0 = performance.now(); fill(1 - remain / total, remain); timer = setTimeout(() => go(i + 1), remain); };
    const halt = () => { if (!running) return; running = false; clearTimeout(timer); remain = Math.max(0, remain - (performance.now() - t0)); fill(1 - remain / total, 0); };
    const load = () => {
      killVideo(V); V = null; clearTimeout(timer); clearTimeout(fb); running = false;
      const f = frames[i], s = seg(f); total = remain = s.ms;
      dots.forEach(d => { const x = $('i', d); x.style.transition = 'none'; x.style.width = '0'; }); fill(0, 0);
      if (SAVE) { run(); return; }
      V = freshVideo(f.dataset[big() ? 'hd' : 'sd'], s.a, { muted }); f.appendChild(V);
      const v = V; v.addEventListener('timeupdate', () => { if (v.currentTime >= s.b) v.pause(); });
      v.addEventListener('playing', run, { once: true }); fb = setTimeout(run, 3000);
      if (!blocked()) v.play().catch(() => { });
    };
    const go = n => {
      frames[i].classList.remove('on'); texts[i].classList.remove('on'); texts[i].hidden = true;
      i = (n + frames.length) % frames.length;
      frames[i].classList.add('on'); texts[i].hidden = false; requestAnimationFrame(() => texts[i].classList.add('on'));
      load();
    };
    const hold = r => { holds.add(r); halt(); V && V.pause(); };
    const release = r => { holds.delete(r); if (blocked()) return; if (V && V.currentTime < seg(frames[i]).b - .05) V.play().catch(() => { }); run(); };
    dots.forEach(d => d.addEventListener('click', () => go(+d.dataset.i)));
    pp && pp.addEventListener('click', () => {
      user = !user; pp.innerHTML = ico(user ? 'play' : 'pause', 'sm'); pp.setAttribute('aria-label', user ? '재생' : '일시정지');
      if (user) { halt(); V && V.pause(); } else release('user');
    });
    snd && snd.addEventListener('click', () => { muted = !muted; if (V) V.muted = muted; snd.innerHTML = ico(muted ? 'mute' : 'vol', 'sm'); snd.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기'); });
    const ids = texts.map(t => t.dataset.id);
    $$('[data-open]', FEAT).forEach(b => b.addEventListener('click', () => Theater.open(b.dataset.open, { queue: ids, autoplay: true })));
    $$('[data-info]', FEAT).forEach(b => b.addEventListener('click', () => Theater.open(b.dataset.info, { queue: ids, autoplay: false, info: true })));
    window.__featPause = () => hold('theater'); window.__featResume = () => release('theater');
    document.addEventListener('visibilitychange', () => document.hidden ? hold('tab') : release('tab'));
    new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? release('off') : hold('off')), { threshold: .3 }).observe($('.fv', FEAT));
    if (user) { pp.innerHTML = ico('play', 'sm'); pp.setAttribute('aria-label', '재생'); }
    load();
  }

  /* ---------- 쇼릴 ---------- */
  $$('[data-reel]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); const q = DATA.filter(w => w.grade === 1 && vidsOf(w).length).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)).map(w => w.id); if (q.length) Theater.open(q[0], { queue: q, autoplay: true }); }));

  /* ---------- 상영관 ---------- */
  const Theater = (() => {
    const T = document.createElement('div'); T.className = 'theater'; T.setAttribute('role', 'dialog'); T.setAttribute('aria-modal', 'true'); T.setAttribute('aria-label', '작품 재생');
    T.innerHTML = `<div class="bgart"></div><div class="veil"></div>
<div class="top"><span class="crumb"></span><span class="pos num"></span><span class="r"><button class="ib infob" title="정보 (I)" aria-label="정보로 이동">i</button><button class="ib pipb" title="작게 보기 (P)" aria-label="작게 보기">${ico('pip')}</button><button class="ib full" title="전체화면 (F)" aria-label="전체화면">${ico('expand')}</button><button class="ib close" title="닫기 (Esc)" aria-label="닫기">${ico('close')}</button></span></div>
<div class="lay"><div class="stage">
 <div class="vw"><div class="big" aria-hidden="true">${ico('play', 'lg')}</div><div class="next" role="button" tabindex="0"><img alt=""><span><small>다음 작품</small><b></b></span><span class="cd num"></span><button class="ib cancel" aria-label="다음 작품 취소">${ico('close', 'sm')}</button></div></div>
 <div class="meta"><div><h1></h1><div class="s"></div></div></div>
 <div class="ctl"><div class="pg" role="slider" aria-label="재생 위치" tabindex="0"><i></i></div><div class="tm"><span class="cur">0:00</span><span class="dur">0:00</span></div>
 <div class="bt"><span class="tr"><button class="ib prev" title="이전 작품 (Shift+←)" aria-label="이전 작품">${ico('prev')}</button><button class="ib pp" title="재생/일시정지 (Space)" aria-label="재생">${ico('play')}</button><button class="ib nxt" title="다음 작품 (Shift+→)" aria-label="다음 작품">${ico('next')}</button><button class="ib mute" title="음소거 (M)" aria-label="음소거">${ico('vol')}</button></span><span class="chips fmts"></span></div></div>
</div>
<section class="panel" aria-label="작품 정보"><div class="desc"></div><div class="gal"></div><div class="sim"></div></section></div>`;
    document.body.appendChild(T);
    const P = document.createElement('div'); P.className = 'pip'; P.innerHTML = `<div class="bar"><b></b><span><button class="ib exp" aria-label="크게 보기">${ico('expand', 'sm')}</button><button class="ib x" aria-label="닫기">${ico('close', 'sm')}</button></span></div><div class="pg"><i></i></div>`;
    document.body.appendChild(P);
    const V = document.createElement('video'); V.playsInline = true; V.preload = 'metadata'; V.setAttribute('controlslist', 'nodownload');
    const el = { lay: $('.lay', T), vw: $('.vw', T), next: $('.next', T), h1: $('.meta h1', T), s: $('.meta .s', T), crumb: $('.crumb', T), pos: $('.pos', T), pg: $('.pg', T), pgi: $('.pg i', T), cur: $('.cur', T), durE: $('.dur', T), pp: $('.pp', T), mute: $('.mute', T), fmts: $('.fmts', T), desc: $('.desc', T), gal: $('.gal', T), sim: $('.sim', T), bg: $('.bgart', T), ctl: $('.ctl', T), panel: $('.panel', T) };
    let cur = null, queue = [], idx = 0, idleT = null, cdT = null, lastFocus = null, autoplay = true, frame = null, vi = 0;
    let MUTED = (() => { try { return sessionStorage.getItem('pf.muted') === '1'; } catch (e) { return false; } })();
    const kindOf = w => vidsOf(w).length ? 'video' : (w.media && w.media.youtube) ? 'youtube' : (w.links && w.links.embed) ? 'iframe' : 'image';
    const clearStage = () => { [...el.vw.children].forEach(n => { if (!n.classList.contains('big') && !n.classList.contains('next')) n.remove(); }); frame = null; V.pause(); };
    const setAspect = (w, h) => { el.vw.style.setProperty('--va', `${w}/${h}`); el.vw.style.setProperty('--vr', (w / h).toFixed(4)); P.style.setProperty('--va', `${w}/${h}`); };
    const chip = s => String(s).split(' — ')[0];
    const loadVideo = (v, keepTime) => {
      const t = keepTime ? V.currentTime : 0, playing = !V.paused;
      setAspect(v.w || 16, v.h || 9); V.dataset.hd = url(v.hd); V.src = url(pickBig(v));
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
      if (kind === 'video') { V.poster = poster ? url(poster) : ''; V.muted = MUTED; el.vw.prepend(V); loadVideo(vs[0], false); }
      else if (kind === 'youtube') { setAspect(16, 9); frame = document.createElement('iframe'); frame.allow = 'autoplay; fullscreen; picture-in-picture'; frame.title = w.title; frame.src = `https://www.youtube-nocookie.com/embed/${w.media.youtube}?autoplay=${autoplay ? 1 : 0}&rel=0&playsinline=1`; el.vw.prepend(frame); }
      else if (kind === 'iframe') {
        embs = (w.links.embeds && w.links.embeds.length) ? w.links.embeds : [{ label: '데모', src: w.links.embed }]; setAspect(16, 10);
        frame = document.createElement('iframe'); frame.title = w.title; frame.setAttribute('allow', 'fullscreen; clipboard-write; accelerometer; gyroscope'); frame.src = url(embs[0].src); el.vw.prepend(frame);
      }
      else { const im = new Image(); im.alt = w.title; im.src = url(poster); im.onload = () => setAspect(im.naturalWidth || 16, im.naturalHeight || 9); setAspect(16, 9); el.vw.prepend(im); }
      el.vw.classList.toggle('paused', kind === 'video' && !autoplay);
      el.ctl.hidden = !(kind === 'video' || embs.length > 1);
      $$('.pg,.tm,.tr', el.ctl).forEach(n => n.hidden = kind !== 'video');
      const list = kind === 'video' ? vs.map(v => v.label || '영상') : embs.map(x => x.label);
      const seen = {}; const labs = list.map(l => { const c = chip(l); seen[c] = (seen[c] || 0) + 1; return c; }).map((c, i, a) => a.filter(x => x === c).length > 1 ? `${c} · ${a.slice(0, i + 1).filter(x => x === c).length}` : c);
      el.fmts.innerHTML = list.length > 1 ? list.map((l, i) => `<button class="chip" aria-pressed="${i === 0}" data-i="${i}" title="${esc(l)}">${esc(labs[i])}</button>`).join('') : '';
      $$('.chip', el.fmts).forEach(c => c.addEventListener('click', () => {
        $$('.chip', el.fmts).forEach(x => x.setAttribute('aria-pressed', x === c)); const n = +c.dataset.i;
        if (kind === 'iframe') { if (frame) frame.src = url(embs[n].src); return; }
        const same = Math.abs((vs[n].dur || 0) - (vs[vi].dur || 0)) < 1; vi = n; loadVideo(vs[n], same);
      }));
      // 정보: 영상 제작자가 보는 항목
      const c = w.copy || {}, L = w.links || {};
      const spec = [['종류', w.type || (w.kinds || []).map(k => KINDS[k]).filter(Boolean).join(' · ')], ['툴', (w.tools || []).join(' · ')], ['매체', (w.channels || []).join(' · ')], ['길이', w.dur], ['규격', (w.formats || []).join(' · ')], ['시기', w.period || w.year], ['기여도', w.contrib || w.role]].filter(x => x[1]);
      el.desc.innerHTML = `<h2>${nb(w.title)}</h2>` + (c.one ? `<p class="lead">${esc(c.one)}</p>` : '') + (w.highlight ? `<div class="hl">${esc(w.highlight)}</div>` : '') +
        `<div class="spec">${spec.map(x => `<span>${x[0]}</span><b>${esc(x[1])}</b>`).join('')}</div>` +
        (w.group === 'tools' && c.what ? `<ul class="what">${c.what.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '') +
        `<div class="ext">${L.live ? `<a class="btn ghost sm" href="${esc(L.live)}" target="_blank" rel="noopener">라이브 ↗</a>` : ''}${L.github ? `<a class="btn ghost sm" href="${esc(L.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}${L.artifact ? `<a class="btn ghost sm" href="${esc(L.artifact)}" target="_blank" rel="noopener">원본 ↗</a>` : ''}</div>`;
      const imgs = (w.media && w.media.images) || [];
      el.gal.innerHTML = imgs.length ? `<h3>이미지 소재 <small>${imgs.length}</small></h3><div class="gg">${imgs.map(im => `<a href="${esc(url(im.src))}" target="_blank" rel="noopener" style="--r:${(im.w / im.h).toFixed(3)}"><img src="${esc(url(im.src))}" alt="${esc(im.label)}" loading="lazy" width="${im.w}" height="${im.h}"><span>${esc(chip(im.label))}</span></a>`).join('')}</div>` : '';
      const ks = w.kinds || []; const sim = DATA.filter(x => x.id !== w.id && posterOf(x) && (x.kinds || []).some(k => ks.includes(k))).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)).slice(0, 8);
      el.sim.innerHTML = sim.length ? `<h3>비슷한 작업</h3><div class="sg">${sim.map(x => `<button data-id="${esc(x.id)}"><img src="${esc(url((x.media && x.media.poster16) || posterOf(x)))}" alt="" loading="lazy"><b>${esc(x.title)}</b></button>`).join('')}</div>` : '';
      $$('.sg button', el.sim).forEach(b => b.addEventListener('click', () => { const q = sim.map(x => x.id); queue = q; jump(q.indexOf(b.dataset.id)); }));
      document.title = `${w.title} — HANSY`;
    };
    const jump = n => { if (n < 0 || n >= queue.length) return; idx = n; cur = BY[queue[idx]]; T.dataset.cur = cur.id; autoplay = true; render(cur); wake(); el.lay.scrollTop = 0; };
    const open = (id, opt = {}) => {
      const w = BY[id]; if (!w) return; lastFocus = document.activeElement;
      queue = (opt.queue && opt.queue.length ? opt.queue : [id]).filter(x => BY[x]); idx = Math.max(0, queue.indexOf(id)); autoplay = opt.autoplay !== false;
      if (P.classList.contains('on')) hidePip(false);
      cur = w; T.dataset.cur = w.id; T.classList.add('on'); document.body.style.overflow = 'hidden'; render(w); wake(); el.lay.scrollTop = 0; T.tabIndex = -1; T.focus({ preventScroll: true });
      if (opt.info) setTimeout(() => el.panel.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }), 350);
      window.__featPause && window.__featPause();
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
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); window.__featResume && window.__featResume();
    };
    addEventListener('popstate', () => { if (T.classList.contains('on')) close(true, true); });
    const showPip = () => { P.prepend(V); $('.bar b', P).textContent = cur.title; P.classList.add('on'); };
    const hidePip = (stop = true) => { P.classList.remove('on'); if (stop) V.pause(); };
    $('.exp', P).addEventListener('click', () => { P.classList.remove('on'); T.classList.add('on'); document.body.style.overflow = 'hidden'; el.vw.prepend(V); wake(); });
    $('.x', P).addEventListener('click', () => hidePip(true));
    P.addEventListener('click', e => { if (e.target === V) $('.exp', P).click(); });
    const toggle = () => { if (!cur || kindOf(cur) !== 'video') return; V.paused ? V.play().catch(() => { }) : V.pause(); };
    const toInfo = () => el.panel.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
    $('.close', T).addEventListener('click', () => close(true));
    $('.infob', T).addEventListener('click', toInfo);
    el.pp.addEventListener('click', toggle); el.vw.addEventListener('click', e => { if (e.target === V || e.target.closest('.big')) toggle(); });
    $('.prev', T).addEventListener('click', () => jump(idx - 1)); $('.nxt', T).addEventListener('click', () => jump(idx + 1));
    el.mute.addEventListener('click', () => { V.muted = !V.muted; });
    V.addEventListener('volumechange', () => { MUTED = V.muted; try { sessionStorage.setItem('pf.muted', MUTED ? '1' : '0'); } catch (e) { } el.mute.innerHTML = ico(V.muted ? 'mute' : 'vol'); el.mute.setAttribute('aria-label', V.muted ? '음소거 해제' : '음소거'); });
    let bufT = null; V.addEventListener('waiting', () => { clearTimeout(bufT); bufT = setTimeout(() => el.vw.classList.add('buffering'), 600); });
    ['playing', 'canplay', 'pause', 'emptied'].forEach(ev => V.addEventListener(ev, () => { clearTimeout(bufT); el.vw.classList.remove('buffering'); }));
    document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement && V.dataset.hd && !V.currentSrc.endsWith(V.dataset.hd.replace(/^\.\//, ''))) { const t = V.currentTime, pl = !V.paused; V.src = V.dataset.hd; V.addEventListener('loadedmetadata', () => { V.currentTime = t; if (pl) V.play().catch(() => { }); }, { once: true }); } });
    $('.full', T).addEventListener('click', () => { document.fullscreenElement ? document.exitFullscreen() : (el.vw.requestFullscreen && el.vw.requestFullscreen()); });
    $('.pipb', T).addEventListener('click', async () => { if (!cur || kindOf(cur) !== 'video') { close(false); return; } if (document.pictureInPictureEnabled) { try { await V.requestPictureInPicture(); return; } catch (e) { } } close(true); });
    $('.cancel', el.next).addEventListener('click', e => { e.stopPropagation(); clearInterval(cdT); el.next.classList.remove('on'); el.next.dataset.dismissed = '1'; });
    el.next.addEventListener('click', () => jump(idx + 1)); el.next.addEventListener('keydown', e => { if (e.key === 'Enter') jump(idx + 1); });
    V.addEventListener('loadedmetadata', () => { if (V.videoWidth && V.videoHeight && el.vw.contains(V)) setAspect(V.videoWidth, V.videoHeight); });
    V.addEventListener('play', () => { el.pp.innerHTML = ico('pause'); el.pp.setAttribute('aria-label', '일시정지'); el.vw.classList.remove('paused'); });
    V.addEventListener('pause', () => { el.pp.innerHTML = ico('play'); el.pp.setAttribute('aria-label', '재생'); el.vw.classList.add('paused'); });
    V.addEventListener('timeupdate', () => {
      const p = V.duration ? V.currentTime / V.duration : 0; el.pgi.style.width = (p * 100) + '%'; $('.pg i', P).style.width = (p * 100) + '%';
      el.cur.textContent = fmtT(V.currentTime); el.durE.textContent = V.duration ? '-' + fmtT(V.duration - V.currentTime) : '0:00'; el.pg.setAttribute('aria-valuenow', Math.round(p * 100));
    });
    V.addEventListener('ended', () => {
      if (P.classList.contains('on')) { if (idx + 1 < queue.length && kindOf(BY[queue[idx + 1]]) === 'video') { idx++; cur = BY[queue[idx]]; V.src = url(pickBig(vidsOf(cur)[0])); V.play().catch(() => { }); $('.bar b', P).textContent = cur.title; } else hidePip(true); return; }
      const n = BY[queue[idx + 1]]; if (!n || el.next.dataset.dismissed) { el.vw.classList.add('paused'); return; }
      $('img', el.next).src = url((n.media && n.media.poster16) || posterOf(n)); $('b', el.next).textContent = n.title; el.next.classList.add('on');
      let left = 5; const cd = $('.cd', el.next); cd.textContent = left; cd.style.setProperty('--p', 0);
      clearInterval(cdT); cdT = setInterval(() => { left--; cd.textContent = left; cd.style.setProperty('--p', (5 - left) * 20); if (left <= 0) { clearInterval(cdT); jump(idx + 1); } }, 1000);
    });
    const seekAt = x => { const r = el.pg.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (x - r.left) / r.width)); if (V.duration) V.currentTime = p * V.duration; };
    el.pg.addEventListener('pointerdown', e => { seekAt(e.clientX); const mv = ev => seekAt(ev.clientX); const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
    const wake = () => { T.classList.remove('idle'); clearTimeout(idleT); if (cur && kindOf(cur) === 'video' && !V.paused && el.lay.scrollTop < 40) idleT = setTimeout(() => T.classList.add('idle'), 3000); };
    ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach(ev => T.addEventListener(ev, wake, { passive: true }));
    el.lay.addEventListener('scroll', wake, { passive: true }); V.addEventListener('play', wake); V.addEventListener('pause', wake);
    document.addEventListener('keydown', e => {
      if (!T.classList.contains('on') || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      const k = e.key;
      if (k === 'Tab') { const f = $$('button,a[href],[tabindex="0"]', T).filter(x => !x.hidden && x.offsetParent !== null); if (f.length) { const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } } return; }
      if (k === 'Escape') close(true);
      else if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
      else if (k === 'ArrowLeft') { e.shiftKey ? jump(idx - 1) : (V.currentTime -= 5); }
      else if (k === 'ArrowRight') { e.shiftKey ? jump(idx + 1) : (V.currentTime += 5); }
      else if (k === 'j') V.currentTime -= 10; else if (k === 'l') V.currentTime += 10;
      else if (/^[0-9]$/.test(k) && V.duration) V.currentTime = V.duration * (+k / 10);
      else if (k === 'm') V.muted = !V.muted; else if (k === 'f') $('.full', T).click(); else if (k === 'p') $('.pipb', T).click(); else if (k === 'i') toInfo();
    });
    return { open, close };
  })();
  window.Theater = Theater;

  /* ---------- 작업 목록: 종류 + 검색 ---------- */
  const LIB = $('.lib');
  if (LIB) {
    const grid = $('.grid', LIB), cnt = $('.cnt', LIB), q = $('.q', LIB);
    const st = { kind: KINDS[location.hash.slice(1)] ? location.hash.slice(1) : null, q: '' };
    const cards = $$('.card[data-id]', grid);
    const hay = w => [w.title, w.type, w.subtitle, (w.tools || []).join(' '), (w.channels || []).join(' '), (w.kinds || []).map(k => KINDS[k]).join(' ')].join(' ').toLowerCase();
    const draw = () => {
      let n = 0; const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
      cards.forEach(c => { const w = BY[c.dataset.id]; const ok = w && (!st.kind || (w.kinds || []).includes(st.kind)) && words.every(x => hay(w).includes(x)); c.hidden = !ok; if (ok) n++; });
      cnt.textContent = `${n}건`;
      $$('.rail button').forEach(b => b.setAttribute('aria-pressed', (b.dataset.v || null) === st.kind));
    };
    $$('.rail button').forEach(b => b.addEventListener('click', () => { st.kind = b.dataset.v || null; hist.replace(hist.st(), location.pathname + location.search + (st.kind ? '#' + st.kind : '')); draw(); }));
    addEventListener('hashchange', () => { const k = location.hash.slice(1); st.kind = KINDS[k] ? k : null; draw(); });
    q && q.addEventListener('input', () => { st.q = q.value; draw(); });
    draw();
  }

  /* ---------- 도구 런처 ---------- */
  const TL = $('.tl');
  if (TL) {
    const stage = $('.tstage', TL), fr = $('iframe', stage), chips = $('.tbar .chips', TL), openA = $('.tbar .open', TL), bigB = $('.tbar .big', TL);
    bigB && bigB.addEventListener('click', () => Theater.open(stage.dataset.id, { queue: $$('.ti', TL).map(b => b.dataset.id), autoplay: false }));
    const bindChips = () => $$('.chip', chips).forEach(cb => cb.addEventListener('click', () => { $$('.chip', chips).forEach(x => x.setAttribute('aria-pressed', x === cb)); if (fr) fr.src = url(cb.dataset.src); openA.href = url(cb.dataset.src); }));
    const pick = (id, push) => {
      const w = BY[id]; if (!w) return; const L = w.links || {}; const embs = (L.embeds && L.embeds.length) ? L.embeds : (L.embed ? [{ label: '데모', src: L.embed }] : []);
      $$('.ti', TL).forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id)); $$('.tdesc', TL).forEach(d => d.hidden = d.dataset.for !== id);
      stage.dataset.id = id; const src = embs[0] ? url(embs[0].src) : ''; if (fr) fr.src = src || 'about:blank'; openA.href = src || L.live || '#'; openA.hidden = !src && !L.live;
      chips.innerHTML = embs.length > 1 ? embs.map((x, i) => `<button class="chip" data-src="${esc(x.src)}" aria-pressed="${i === 0}">${esc(x.label)}</button>`).join('') : '';
      bindChips(); if (push) hist.replace(null, `${location.pathname}#${id}`);
    };
    $$('.ti', TL).forEach(b => b.addEventListener('click', () => pick(b.dataset.id, true)));
    bindChips(); const h = location.hash.slice(1); if (h && BY[h]) pick(h, false);
  }

  /* ---------- 메일 복사 · 인쇄 ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); try { await navigator.clipboard.writeText(b.dataset.copy); const t = b.textContent; b.textContent = '복사됨 ✓'; setTimeout(() => b.textContent = t, 1600); } catch (err) { location.href = 'mailto:' + b.dataset.copy; } }));
  $$('[data-print]').forEach(b => b.addEventListener('click', () => window.print()));

  /* ---------- 딥링크 ---------- */
  document.body.dataset.title = document.title;
  const qs = new URLSearchParams(location.search); const q = qs.get('w');
  if (q && BY[q]) Theater.open(q, { autoplay: false, replace: true });
  if (qs.has('reel')) { const b = $('[data-reel]'); b && b.click(); }
})();
