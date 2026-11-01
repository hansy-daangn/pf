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

  /* ---------- 디자인 모듈: body data-<모듈>="번호" · 슬라이더는 --<키> 변수 ---------- */
  const applyDesign = pick => {
    const M = S.D.modules || {};
    Object.entries(pick || {}).forEach(([k, v]) => { if (!M[k]) return; if (M[k].type === 'range') document.body.style.setProperty(`--${k}`, v + (M[k].unit || '')); else document.body.dataset[k] = v; });
    const P = { ...(S.D.pick || {}), ...(pick || {}) }, vm = document.querySelector('meta[name="viewport"]');   // 모바일: 데스크톱 화면을 비율 그대로 축소
    if (vm && !EDIT) vm.content = (+P.mview === 3 || (+P.mview !== 2 && document.body.classList.contains('home'))) ? 'width=device-width,initial-scale=1,viewport-fit=cover' : `width=${P.mvw || 1200}`;
    dispatchEvent(new Event('resize'));
  };
  let previewing = false;   // /design 미리보기 안에서는 저장된 값 대신 고르는 중인 값을 씀
  addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.pf === 'design') { previewing = true; applyDesign(e.data.pick); } });

  /* ---------- 영상 화질: 1080p(hd) · 720p(sd) ---------- */
  const big = () => !SAVE && (!!document.fullscreenElement || innerWidth >= 900);
  const pickBig = v => (v.sd && !big()) ? v.sd : v.hd;
  const pickSmall = v => v.sd || v.hd;
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

  /* ---------- 그리기: 파생 이미지는 지금 데이터와 같을 때만, 아니면 원본 + CSS 블러 채움 ---------- */
  const sigWide = w => { const m = w.media || {}; return `${m.poster_w || ''}|${posterOf(w)}|${m.poster_w_t ?? ''}`; };
  const feVideo = w => { const vs = vidsOf(w).filter(v => v.w && v.h); return vs.length ? vs.reduce((a, b) => (b.w / b.h > a.w / a.h ? b : a)) : null; };
  const segOf = w => { const v = feVideo(w), m = w.media || {}, dur = (v && v.dur) || 8; let [a, b] = m.billboard || [m.start || 0, (m.start || 0) + 8]; a = Math.max(0, Math.min(+a, dur - 1)); b = Math.min(+b, dur); if (b - a < 3) b = Math.min(dur, a + 6); return [+a.toFixed(2), +b.toFixed(2)]; };
  const orientOf = w => { const x = S.X[w.id]; if (x && x.pw && x.ph && x.tall && x.tall.from === posterOf(w)) return x.ph / x.pw > 1.2 ? 'tall' : 'wide'; const v = vidsOf(w)[0]; return v && v.h / v.w > 1.2 ? 'tall' : 'wide'; };
  const thumbOf = (w, cls) => {
    const x = S.X[w.id] || {}, m = w.media || {};
    if (cls === 'wide') { if (x.wide && x.wide.from === sigWide(w)) return { src: x.wide.src, srcset: x.wide.srcset }; if (m.poster_w) return { src: m.poster_w }; return { src: posterOf(w), fill: true }; }
    if (x.tall && x.tall.from === posterOf(w)) return { src: x.tall.src, srcset: x.tall.srcset };
    return { src: posterOf(w) };
  };
  const cardHTML = (w, cls = 'wide') => {
    const t = thumbOf(w, cls); const sizes = cls === 'wide' ? '(max-width:760px) 264px, 360px' : '(max-width:760px) 132px, 210px';
    const img = `<img src="${esc(url(t.src))}"${t.srcset ? ` srcset="${esc(t.srcset.split(', ').map(s => url(s.split(' ')[0]) + ' ' + s.split(' ')[1]).join(', '))}" sizes="${sizes}"` : ''} alt="" loading="lazy">`;
    return `<a class="card ${cls}${(w.group === 'tools' || w.group === 'research') ? ' ui' : ''}" href="?w=${esc(w.id)}" data-id="${esc(w.id)}"><div class="art${t.fill ? ' fill' : ''}">${t.fill ? `<img class="bg" src="${esc(url(t.src))}" alt="" loading="lazy">` : ''}${img}</div><div class="t">${esc(w.title)}</div><div class="s">${esc(w.type || w.subtitle || '')}</div></a>`;
  };
  const rowList = () => {
    const H = S.H, rows = [];
    const ok = w => w && posterOf(w) && (w.grade ?? 3) <= 2 && !isTool(w);
    const rep = (H.rep || []).map(id => BY[id]).filter(ok);
    if (rep.length && !H.repHidden) rows.push({ key: 'rep', title: H.repTitle || '대표 작업', items: rep, cls: 'wide', more: 'works.html' });
    (H.rows || []).forEach((r, i) => {
      if (r.hidden) return;
      const items = r.ids ? r.ids.map(id => BY[id]).filter(ok) : MDATA.filter(w => (w.kinds || []).includes(r.kind));
      if (!items.length) return;
      rows.push({ key: `rows.${i}`, title: r.title || KINDS[r.kind] || '', items, cls: items.every(w => orientOf(w) === 'tall') ? 'tall' : 'wide', more: r.more || (r.kind ? `works.html#${r.kind}` : 'works.html') });
    });
    return rows;
  };
  const rowHTML = r => `<section class="row" data-queue data-row="${r.key}"><div class="wrap"><div class="hd"><h2>${esc(r.title)}</h2>${r.more ? `<a class="more" href="${esc(r.more)}">더보기</a>` : ''}</div>
<div class="trk"><span class="arr"><button class="ar l" aria-label="이전" disabled>${ico('chev-l')}</button><button class="ar r" aria-label="다음">${ico('chev-r')}</button></span><div class="sc">${r.items.map(w => cardHTML(w, r.cls)).join('')}</div></div></div></section>`;
  const featItems = () => (S.H.billboard || []).map(id => BY[id]).filter(w => w && feVideo(w) && !isTool(w)).slice(0, 8);
  const featHTML = items => {
    if (!items.length) return '';
    const frames = items.map((w, i) => { const v = feVideo(w), [a, b] = segOf(w), x = S.X[w.id] || {}; const p = (x.bb && x.bb.from === `${v.hd}@${a}`) ? x.bb.src : posterOf(w);
      return `<div class="fs${i ? '' : ' on'}" data-id="${esc(w.id)}" data-hd="${esc(v.hd)}" data-sd="${esc(v.sd || v.hd)}" data-a="${a}" data-b="${b}"><div class="blur" style="background-image:url('${esc(url(p))}')"></div><img src="${esc(url(p))}" alt=""${i ? ' loading="lazy"' : ' fetchpriority="high"'}></div>`; }).join('');
    const texts = items.map((w, i) => `<div class="fx${i ? '' : ' on'}"${i ? ' hidden' : ''} data-id="${esc(w.id)}"><div class="k">${esc(w.type || '')}${w.year ? ' · ' + esc(w.year) : ''}</div><h2>${nb(w.title)}</h2>${w.copy && w.copy.one ? `<p class="one">${esc(w.copy.one)}</p>` : ''}
<div class="bt"><button class="btn" data-open="${esc(w.id)}">${ico('play', 'sm')} 재생</button><button class="btn ghost" data-info="${esc(w.id)}">상세 정보</button></div></div>`).join('');
    const dots = items.map((w, j) => `<button data-i="${j}" class="${j ? '' : 'on'}" aria-label="${j + 1}번째 작품"><i></i></button>`).join('');
    return `<div class="fbox"><div class="fv">${frames}<div class="veil"></div></div><div class="ft"><div class="fxs">${texts}</div><div class="fctl" role="tablist" aria-label="피처드 전환">${dots}<button class="pp" aria-label="일시정지">${ico('pause', 'sm')}</button><button class="snd" aria-label="소리 켜기">${ico('mute', 'sm')}</button></div></div></div>`;
  };
  const renderHome = () => {
    const F = $('.feat'), R = $('.rows'); if (!F || !R) return;
    Feat.unmount(); F.innerHTML = featHTML(featItems()); Feat.mount(F);
    R.innerHTML = rowList().map(rowHTML).join(''); mountRows(R);
  };

  /* ---------- 내비: 맨 위에선 투명, 스크롤하면 유리 배경 ---------- */
  const NAV = $('.nav'); const onSc = () => NAV && NAV.classList.toggle('sc', scrollY > 8); addEventListener('scroll', onSc, { passive: true }); onSc();

  /* ---------- 확장 카드(호버 0.5초 → 원비율 영상) ---------- */
  const queueOf = card => { const c = card.closest('[data-queue]'); return c ? $$('.card[data-id]:not([hidden])', c).map(x => x.dataset.id).filter((v, i, a) => a.indexOf(v) === i) : [card.dataset.id]; };
  const Pop = (() => {
    const P = document.createElement('div'); P.className = 'pop'; P.setAttribute('aria-hidden', 'true');
    P.innerHTML = `<div class="art"></div><div class="bd"><div class="t"></div><div class="s"></div><div class="bt"><button class="btn acc">${ico('play', 'sm')} 재생</button><button class="btn ghost">상세 정보</button></div></div>`;
    document.body.appendChild(P);
    const ART = $('.art', P); let cur = null, card = null, hideT = null, V = null;
    const clear = () => { killVideo(V); V = null; ART.innerHTML = ''; };
    const show = (c, w) => {
      clearTimeout(hideT); clear(); cur = w; card = c;
      const r = ($('.art', c) || c).getBoundingClientRect(); const v0 = vidsOf(w)[0];
      const [aw, ah] = (v0 && v0.w && v0.h) ? [v0.w, v0.h] : c.classList.contains('tall') ? [9, 16] : [16, 9]; const tall = ah / aw > 1.2;
      const capH = innerHeight * (tall ? .5 : .46);
      let pw = Math.min(Math.max(r.width * 1.45, tall ? 0 : 320), innerWidth - 32); if (pw * ah / aw > capH) pw = capH * aw / ah; pw = Math.max(pw, tall ? 200 : 280);
      P.style.setProperty('--pw', pw + 'px'); P.style.setProperty('--pa', `${aw}/${ah}`); P.style.setProperty('--s0', Math.min(1, r.width / pw).toFixed(3));   // 카드 크기 그대로에서 커지기 시작
      const x = S.X[w.id]; const p = (x && x.hv && v0 && x.hv.from === `${v0.sd || v0.hd}@${startOf(w)}`) ? x.hv.src : posterOf(w);   // 호버 시작 초의 프레임 → 영상이 시작돼도 장면이 안 바뀜
      ART.innerHTML = `<div class="bgb" style="background-image:url('${esc(url(p))}')"></div><img alt="" src="${esc(url(p))}">`;
      $('.t', P).textContent = w.title; $('.s', P).textContent = [w.type, w.dur].filter(Boolean).join(' · ');
      const bodyH = 120; let left = r.left + r.width / 2 - pw / 2; left = Math.max(16, Math.min(left, innerWidth - pw - 16));
      const ph = pw * ah / aw + bodyH; let top = r.top + r.height / 2 - ph / 2; top = Math.max(64, Math.min(top, innerHeight - ph - 16));
      P.style.left = left + 'px'; P.style.top = top + 'px'; P.style.transformOrigin = `${r.left + r.width / 2 - left}px ${r.top + r.height / 2 - top}px`;
      P.classList.add('on');
      if (RM || SAVE) return;
      if (v0) {
        V = freshVideo(pickSmall(v0), startOf(w), { loopTo: startOf(w) }); ART.appendChild(V);
        const bar = document.createElement('i'); bar.className = 'pb'; ART.appendChild(bar); const v = V;
        v.addEventListener('timeupdate', () => { if (v.duration) bar.style.transform = `scaleX(${v.currentTime / v.duration})`; });
        V.play().catch(() => { });
      }
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
  /* 호버 2·3: 카드 칸 안에서 재생 */
  const Inplace = (() => {
    let V = null, cur = null;
    const hide = c => { if (c && c !== cur) return; if (cur) { cur.classList.remove('playing'); $$('.pb', cur).forEach(x => x.remove()); } killVideo(V); V = null; cur = null; };
    const show = (c, w) => {
      hide(); if (RM || SAVE) return; const v0 = vidsOf(w)[0]; if (!v0) return;
      cur = c; c.classList.add('playing'); const art = $('.art', c);
      V = freshVideo(pickSmall(v0), startOf(w), { loopTo: startOf(w) }); art.appendChild(V);
      const bar = document.createElement('i'); bar.className = 'pb'; art.appendChild(bar); const v = V;
      v.addEventListener('timeupdate', () => { if (v.duration) bar.style.transform = `scaleX(${v.currentTime / v.duration})`; });
      V.play().catch(() => { });
    };
    return { show, hide };
  })();
  let hovT = null;
  const bindCard = card => {
    const w = BY[card.dataset.id]; if (!w) return;
    card.addEventListener('click', e => { e.preventDefault(); clearTimeout(hovT); Pop.hide(true); Theater.open(w.id, { queue: queueOf(card) }); });
    if (!HOVER || EDIT) return;
    const mode = () => document.body.dataset.hover || '1';
    card.addEventListener('pointerenter', () => { clearTimeout(hovT); hovT = setTimeout(() => mode() === '1' ? Pop.show(card, w) : Inplace.show(card, w), mode() === '1' ? 500 : 350); });
    card.addEventListener('pointerleave', () => { clearTimeout(hovT); Pop.hide(); Inplace.hide(card); });
  };
  const mountRows = root => {
    $$('.card[data-id]', root).forEach(bindCard);
    $$('.row', root).forEach(row => {
      const sc = $('.sc', row), L = $('.ar.l', row), R = $('.ar.r', row), A = $('.arr', row); if (!sc || !L) return;
      const upd = () => { const over = sc.scrollWidth > sc.clientWidth + 4; A.hidden = !over; L.disabled = sc.scrollLeft < 8; R.disabled = sc.scrollLeft + sc.clientWidth > sc.scrollWidth - 8; sc.classList.toggle('more', over && !R.disabled); };
      const step = d => sc.scrollBy({ left: d * sc.clientWidth * .85, behavior: RM ? 'auto' : 'smooth' });
      L.addEventListener('click', () => step(-1)); R.addEventListener('click', () => step(1));
      sc.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    });
  };


  /* ---------- 피처드: 항상 재생 — 정해진 구간이 끝나면 다음 작품, 진행 바는 영상 시간 그대로 ---------- */
  const Feat = (() => {
    let F = null, frames = [], texts = [], dots = [], i = 0, V = null, user = false, muted = true, raf = 0, fb = null, offResize = null;
    const holds = new Set(); const blocked = () => user || holds.size > 0;
    const seg = f => { const a = +f.dataset.a || 0, b = +f.dataset.b || a + 8; return { a, b: Math.max(b, a + 1) }; };
    const fill = p => dots.forEach((d, k) => { d.classList.toggle('on', k === i); const x = $('i', d); if (x) x.style.width = (k === i ? Math.max(0, Math.min(1, p)) * 100 : 0) + '%'; });
    const tick = () => { cancelAnimationFrame(raf); const v = V; if (!v || !frames[i]) return; const s = seg(frames[i]); fill((v.currentTime - s.a) / (s.b - s.a)); if (v.currentTime >= s.b - .04 || v.ended) { if (EDIT) { v.currentTime = s.a; v.play().catch(() => { }); } else { go(i + 1); return; } } raf = requestAnimationFrame(tick); };   // 편집 중엔 넘기지 않고 구간 반복
    const load = () => {
      if (V) { const old = V; old.pause(); setTimeout(() => killVideo(old), 1000); } V = null; cancelAnimationFrame(raf); clearTimeout(fb); fill(0);
      const f = frames[i]; if (!f) return; const s = seg(f);
      document.body.style.setProperty('--feat-img', `url('${$('img', f).src}')`);   // 절대 주소(CSS 변수 안의 상대 url은 css/ 기준으로 풀림)
      if (SAVE) { if (!EDIT) fb = setTimeout(() => go(i + 1), (s.b - s.a) * 1000); return; }
      V = freshVideo(f.dataset[big() ? 'hd' : 'sd'], s.a, { muted }); f.appendChild(V);
      const v = V; v.addEventListener('playing', () => { clearTimeout(fb); tick(); });
      v.addEventListener('error', () => { if (!EDIT) fb = setTimeout(() => go(i + 1), 4000); }, { once: true });
      if (!blocked()) v.play().catch(() => { v.muted = true; v.play().catch(() => { }); });
    };
    const go = n => {
      if (!frames.length) return;
      frames[i].classList.remove('on'); texts[i].classList.remove('on'); texts[i].hidden = true;
      i = (n + frames.length) % frames.length;
      frames[i].classList.add('on'); texts[i].hidden = false; requestAnimationFrame(() => texts[i] && texts[i].classList.add('on'));
      load(); F && F.dispatchEvent(new CustomEvent('pf:slide', { detail: { i, id: frames[i].dataset.id } }));
    };
    const hold = r => { holds.add(r); cancelAnimationFrame(raf); V && V.pause(); };
    const release = r => { holds.delete(r); if (!blocked() && V) V.play().catch(() => { }); };
    const mount = el => {
      F = el; frames = $$('.fs', F); texts = $$('.fx', F); dots = $$('.fctl button[data-i]', F); i = 0; if (!frames.length) return;
      const pp = $('.pp', F), snd = $('.snd', F), fv = $('.fv', F);
      dots.forEach(d => d.addEventListener('click', () => go(+d.dataset.i)));
      pp.addEventListener('click', () => { user = !user; pp.innerHTML = ico(user ? 'play' : 'pause', 'sm'); pp.setAttribute('aria-label', user ? '재생' : '일시정지'); user ? hold('user') : release('user'); });
      snd.addEventListener('click', () => { muted = !muted; if (V) V.muted = muted; snd.innerHTML = ico(muted ? 'mute' : 'vol', 'sm'); snd.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기'); });
      const ids = texts.map(t => t.dataset.id);
      $$('[data-open]', F).forEach(b => b.addEventListener('click', () => Theater.open(b.dataset.open, { queue: ids, autoplay: true })));
      $$('[data-info]', F).forEach(b => b.addEventListener('click', () => Theater.open(b.dataset.info, { queue: ids, autoplay: false, info: true })));
      const inset = () => fv.classList.toggle('inset', fv.getBoundingClientRect().width < F.getBoundingClientRect().width - 2);
      addEventListener('resize', inset); offResize = () => removeEventListener('resize', inset); inset();
      load();
    };
    const unmount = () => { cancelAnimationFrame(raf); clearTimeout(fb); killVideo(V); V = null; offResize && offResize(); frames = []; texts = []; dots = []; };
    document.addEventListener('visibilitychange', () => document.hidden ? hold('tab') : release('tab'));
    return { mount, unmount, hold, release, go, get i() { return i; }, get video() { return V; }, seg };
  })();
  window.__featPause = () => Feat.hold('theater'); window.__featResume = () => Feat.release('theater');

  /* ---------- 쇼릴 ---------- */
  $$('[data-reel]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); const q = MDATA.filter(w => w.grade === 1 && vidsOf(w).length).map(w => w.id); if (q.length) Theater.open(q[0], { queue: q, autoplay: true }); }));

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
<section class="panel" aria-label="작품 정보"><div class="desc"></div><div class="gal"></div><div class="sim"></div></section></div>`;
    document.body.appendChild(T);
    const V = document.createElement('video'); V.playsInline = true; V.preload = 'metadata'; V.setAttribute('controlslist', 'nodownload');
    const el = { lay: $('.lay', T), vw: $('.vw', T), next: $('.next', T), h1: $('.meta h1', T), s: $('.meta .s', T), crumb: $('.crumb', T), pos: $('.pos', T), pg: $('.pg', T), pgi: $('.pg i', T), cur: $('.cur', T), durE: $('.dur', T), pp: $('.pp', T), mute: $('.mute', T), fmts: $('.fmts', T), desc: $('.desc', T), gal: $('.gal', T), sim: $('.sim', T), bg: $('.bgart', T), ctl: $('.ctl', T), panel: $('.panel', T) };
    let cur = null, queue = [], idx = 0, idleT = null, cdT = null, lastFocus = null, autoplay = true, frame = null, vi = 0, pushed = false;
    let MUTED = (() => { try { return sessionStorage.getItem('pf.muted') === '1'; } catch (e) { return false; } })();
    const kindOf = w => vidsOf(w).length ? 'video' : (w.media && w.media.youtube) ? 'youtube' : (w.links && w.links.embed) ? 'iframe' : 'image';
    const clearStage = () => { [...el.vw.children].forEach(n => { if (!n.classList.contains('big') && !n.classList.contains('next')) n.remove(); }); frame = null; V.pause(); };
    const setAspect = (w, h) => { [el.vw, el.vw.parentElement].forEach(x => { x.style.setProperty('--va', `${w}/${h}`); x.style.setProperty('--vr', (w / h).toFixed(4)); }); };   // 제목·진행 바도 영상 폭에 맞춤
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
      el.desc.innerHTML = (c.one ? `<p class="lead">${esc(c.one)}</p>` : '') + (w.highlight ? `<div class="hl">${esc(w.highlight)}</div>` : '') +
        `<div class="spec">${spec.map(x => `<span>${x[0]}</span><b>${esc(x[1])}</b>`).join('')}</div>` +
        (w.group === 'tools' && c.what ? `<ul class="what">${c.what.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '') +
        `<div class="ext">${L.live ? `<a class="btn ghost sm" href="${esc(L.live)}" target="_blank" rel="noopener">라이브 ↗</a>` : ''}${L.github ? `<a class="btn ghost sm" href="${esc(L.github)}" target="_blank" rel="noopener">GitHub ↗</a>` : ''}${L.artifact ? `<a class="btn ghost sm" href="${esc(L.artifact)}" target="_blank" rel="noopener">원본 ↗</a>` : ''}</div>`;
      const imgs = (w.media && w.media.images) || [];
      el.gal.innerHTML = imgs.length ? `<h3>이미지 소재 <small>${imgs.length}</small></h3><div class="gg">${imgs.map(im => `<a href="${esc(url(im.src))}" target="_blank" rel="noopener" style="--r:${(im.w / im.h).toFixed(3)}"><img src="${esc(url(im.src))}" alt="${esc(im.label)}" loading="lazy" width="${im.w}" height="${im.h}"><span>${esc(chip(im.label))}</span></a>`).join('')}</div>` : '';
      const ks = w.kinds || []; const sim = MDATA.filter(x => x.id !== w.id && posterOf(x) && (x.kinds || []).some(k => ks.includes(k))).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)).slice(0, 8);
      el.sim.innerHTML = sim.length ? `<h3>비슷한 작업</h3><div class="sg">${sim.map(x => `<button data-id="${esc(x.id)}"><img src="${esc(url(thumbOf(x, 'wide').src))}" alt="" loading="lazy"><b>${esc(x.title)}</b></button>`).join('')}</div>` : '';
      $$('.sg button', el.sim).forEach(b => b.addEventListener('click', () => { const q = sim.map(x => x.id); queue = q; jump(q.indexOf(b.dataset.id)); }));
      document.title = `${w.title} — HANSY`;
    };
    const jump = n => { if (n < 0 || n >= queue.length) return; idx = n; cur = BY[queue[idx]]; T.dataset.cur = cur.id; autoplay = true; render(cur); wake(); el.lay.scrollTop = 0; hist.replace(hist.st(), `${location.pathname}?w=${encodeURIComponent(cur.id)}`); };
    const open = (id, opt = {}) => {
      const w = BY[id]; if (!w) return; lastFocus = document.activeElement;
      queue = (opt.queue && opt.queue.length ? opt.queue : [id]).filter(x => BY[x]); idx = Math.max(0, queue.indexOf(id)); autoplay = opt.autoplay !== false;
      cur = w; T.dataset.cur = w.id; T.classList.add('on'); document.body.style.overflow = 'hidden'; render(w); wake(); el.lay.scrollTop = 0; T.tabIndex = -1; T.focus({ preventScroll: true });
      T.scrollTop = 0; if (opt.info) setTimeout(toInfo, 350);
      window.__featPause && window.__featPause();
      const u = `${location.pathname}?w=${encodeURIComponent(id)}`;
      if (opt.replace) { pushed = false; hist.replace(null, u); } else if (pushed) hist.replace({ t: 1 }, u); else { pushed = true; hist.push({ t: 1 }, u); }
    };
    const close = (fromPop = false) => {
      if (!T.classList.contains('on')) return;
      T.classList.remove('on'); document.body.style.overflow = ''; clearInterval(cdT); el.next.classList.remove('on');
      if (frame) { frame.remove(); frame = null; }
      V.pause(); if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => { });
      if (!fromPop) { if (pushed) { pushed = false; try { history.back(); } catch (e) { } } else hist.replace(null, location.pathname); } else pushed = false;
      document.title = document.body.dataset.title || document.title;
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); window.__featResume && window.__featResume();
    };
    addEventListener('popstate', () => { if (T.classList.contains('on')) close(true); });
    const toggle = () => { if (!cur || kindOf(cur) !== 'video') return; V.paused ? V.play().catch(() => { }) : V.pause(); };
    const toInfo = () => { T.scrollTop = 0; el.lay.scrollTo({ top: Math.max(0, el.panel.offsetTop - 16), behavior: RM ? 'auto' : 'smooth' }); };
    $('.close', T).addEventListener('click', () => close());
    el.pp.addEventListener('click', toggle); el.vw.addEventListener('click', e => { if (e.target === V || e.target.closest('.big')) toggle(); });
    $('.prev', T).addEventListener('click', () => jump(idx - 1)); $('.nxt', T).addEventListener('click', () => jump(idx + 1));
    el.mute.addEventListener('click', () => { V.muted = !V.muted; });
    V.addEventListener('volumechange', () => { MUTED = V.muted; try { sessionStorage.setItem('pf.muted', MUTED ? '1' : '0'); } catch (e) { } el.mute.innerHTML = ico(V.muted ? 'mute' : 'vol'); el.mute.setAttribute('aria-label', V.muted ? '음소거 해제' : '음소거'); });
    let bufT = null; V.addEventListener('waiting', () => { clearTimeout(bufT); bufT = setTimeout(() => el.vw.classList.add('buffering'), 600); });
    ['playing', 'canplay', 'pause', 'emptied'].forEach(ev => V.addEventListener(ev, () => { clearTimeout(bufT); el.vw.classList.remove('buffering'); }));
    document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement && V.dataset.hd && !V.currentSrc.endsWith(V.dataset.hd.replace(/^\.\//, ''))) { const t = V.currentTime, pl = !V.paused; V.src = V.dataset.hd; V.addEventListener('loadedmetadata', () => { V.currentTime = t; if (pl) V.play().catch(() => { }); }, { once: true }); } });
    $('.full', T).addEventListener('click', () => { document.fullscreenElement ? document.exitFullscreen() : (el.vw.requestFullscreen && el.vw.requestFullscreen()); });
    const pipB = $('.pipb', T); if (!document.pictureInPictureEnabled) pipB.remove();
    else pipB.addEventListener('click', () => { if (cur && kindOf(cur) === 'video') (document.pictureInPictureElement ? document.exitPictureInPicture() : V.requestPictureInPicture()).catch(() => { }); });
    $('.cancel', el.next).addEventListener('click', e => { e.stopPropagation(); clearInterval(cdT); el.next.classList.remove('on'); el.next.dataset.dismissed = '1'; });
    el.next.addEventListener('click', () => jump(idx + 1)); el.next.addEventListener('keydown', e => { if (e.key === 'Enter') jump(idx + 1); });
    V.addEventListener('loadedmetadata', () => { if (V.videoWidth && V.videoHeight && el.vw.contains(V)) setAspect(V.videoWidth, V.videoHeight); });
    V.addEventListener('play', () => { el.pp.innerHTML = ico('pause'); el.pp.setAttribute('aria-label', '일시정지'); el.vw.classList.remove('paused'); });
    V.addEventListener('pause', () => { el.pp.innerHTML = ico('play'); el.pp.setAttribute('aria-label', '재생'); el.vw.classList.add('paused'); });
    V.addEventListener('timeupdate', () => {
      const p = V.duration ? V.currentTime / V.duration : 0; el.pgi.style.width = (p * 100) + '%';
      el.cur.textContent = fmtT(V.currentTime); el.durE.textContent = V.duration ? '-' + fmtT(V.duration - V.currentTime) : '0:00'; el.pg.setAttribute('aria-valuenow', Math.round(p * 100));
    });
    V.addEventListener('ended', () => {
      const n = BY[queue[idx + 1]]; if (!n || el.next.dataset.dismissed) { el.vw.classList.add('paused'); return; }
      $('img', el.next).src = url(thumbOf(n, 'wide').src); $('b', el.next).textContent = n.title; el.next.classList.add('on');
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
      if (k === 'Escape') close();
      else if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
      else if (k === 'ArrowLeft') { e.shiftKey ? jump(idx - 1) : (V.currentTime -= 5); }
      else if (k === 'ArrowRight') { e.shiftKey ? jump(idx + 1) : (V.currentTime += 5); }
      else if (k === 'j') V.currentTime -= 10; else if (k === 'l') V.currentTime += 10;
      else if (/^[0-9]$/.test(k) && V.duration) V.currentTime = V.duration * (+k / 10);
      else if (k === 'm') V.muted = !V.muted; else if (k === 'f') $('.full', T).click(); else if (k === 'p' && T.contains(pipB)) pipB.click();
    });
    return { open, close };
  })();
  window.Theater = Theater;

  /* ---------- 작업 목록: 종류 + 검색 ---------- */
  const renderWorks = () => {
    const LIB = $('.lib'); if (!LIB) return;
    const rail = $('.rail', LIB), grid = $('.grid', LIB), cnt = $('.cnt', LIB), q = $('.q', LIB);
    const count = k => MDATA.filter(w => (w.kinds || []).includes(k)).length;
    rail.innerHTML = `<button data-v="">전체 <small>${MDATA.length}</small></button>` + Object.keys(KINDS).filter(count).map(k => `<button data-v="${k}">${KINDS[k]} <small>${count(k)}</small></button>`).join('');
    grid.innerHTML = MDATA.map(w => cardHTML(w, 'wide')).join(''); mountRows(grid);
    const st = { kind: KINDS[location.hash.slice(1)] ? location.hash.slice(1) : '', q: q.value || '' };
    const KO = { google: '구글', moloco: '몰로코', meta: '메타', localads: '로컬광고', youtube: '유튜브', instagram: '인스타그램' };
    const hay = w => [w.title, w.type, w.subtitle, (w.tools || []).join(' '), (w.channels || []).map(c => `${c} ${KO[String(c).toLowerCase()] || ''}`).join(' '), (w.kinds || []).map(k => KINDS[k]).join(' ')].join(' ').toLowerCase();
    const draw = () => {
      let n = 0; const words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
      $$('.card', grid).forEach(c => { const w = BY[c.dataset.id]; const ok = w && (!st.kind || (w.kinds || []).includes(st.kind)) && words.every(x => hay(w).includes(x)); c.hidden = !ok; if (ok) n++; });
      cnt.textContent = `${n}건`; $$('button', rail).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === st.kind));
    };
    $$('button', rail).forEach(b => b.addEventListener('click', () => { st.kind = b.dataset.v; hist.replace(hist.st(), location.pathname + location.search + (st.kind ? '#' + st.kind : '')); draw(); }));
    onhashchange = () => { const k = location.hash.slice(1); st.kind = KINDS[k] ? k : ''; draw(); };
    q.oninput = () => { st.q = q.value; draw(); };
    draw();
  };

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

  /* ---------- 시작: 그리기 → 딥링크 → 최신 데이터 확인(바뀌었으면 다시 그리기) ---------- */
  const renderAll = () => { renderHome(); renderWorks(); ambient(); };
  const ambient = () => { if (document.querySelector('.feat .fs')) return; const w = (S.H.billboard || []).map(id => BY[id]).find(Boolean) || MDATA[0]; if (w) document.body.style.setProperty('--feat-img', `url('${new URL(url(posterOf(w)), document.baseURI).href}')`); };
  window.PF = { S, setData, renderAll, renderHome, renderWorks, applyDesign, Feat, cardHTML, segOf, feVideo, sigWide, posterOf, vidsOf, url, esc, ico, KINDS, get BY() { return BY; }, get DATA() { return DATA; }, get MDATA() { return MDATA; }, isTool, Theater: window.Theater };
  renderAll();
  document.body.dataset.title = document.title;
  const qs = new URLSearchParams(location.search); const q = qs.get('w');
  if (q && BY[q]) Theater.open(q, { replace: true, queue: (isTool(BY[q]) ? DATA : MDATA).map(w => w.id), autoplay: true });
  if (qs.has('reel')) { const b = $('[data-reel]'); b && b.click(); }
  if (!EDIT) {
    const get = f => fetch(`data/${f}.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
    Promise.all(['works', 'home', 'design', 'derived'].map(get)).then(([works, home, design, derived]) => {
      const fresh = { works, home, design, derived }; const cur = { works: S.all, home: S.H, design: S.D, derived: S.X };
      const changed = Object.keys(fresh).filter(k => fresh[k] && JSON.stringify(fresh[k]) !== JSON.stringify(cur[k]));
      if (!changed.length) return;
      setData(fresh); if (changed.includes('design') && !previewing) applyDesign(S.D.pick);
      if (changed.some(k => k !== 'design') && !document.querySelector('.theater.on')) renderAll();
    });
  }
  document.dispatchEvent(new CustomEvent('pf:ready'));
})();
