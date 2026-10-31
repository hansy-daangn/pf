#!/usr/bin/env python3
"""render → mask numbers → serialize static copy of a self-hosted demo.

usage: mask_demo.py <slug> <profile>
profiles: report (키워드 리포트: 모든 금액·%·건·k·소수), plan (증인 릴레이: 만/억 금액·%·대형 건/명), all (대시보드: 숫자 전부)
Writes demos/<slug>/index.html in place (backup → /home/claude/pf_work/<slug>.orig.html) and shots.
"""
import sys, re, json, shutil, pathlib, subprocess, time, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path('/home/claude/pf')
WORK = pathlib.Path('/home/claude/pf_work'); WORK.mkdir(exist_ok=True)
slug, profile = sys.argv[1], sys.argv[2]
strip_scripts = profile in ('report', 'all')

PROFILES = {
  # 패턴은 JS RegExp 소스. 토큰 전체를 치환하되 숫자만 █로 바꾸고 단위·부호는 남긴다.
  'report': dict(patterns=[
      r'[+−\-]?\d[\d,]*(?:\.\d+)?\s*(?:~\s*\d[\d,]*(?:\.\d+)?)?\s*(?:억|만|천|원|k|%|건|명)',
      r'\d{1,3}(?:,\d{3})+',               # 5,437 / 14,833 / 1,665
      r'\b0\.\d+\b',                        # 0.62 vs 0.24
      r'\b\d{4,}(?!x|\s*[-~.]\s*\d)\b(?![-\d])',  # 10156 같은 4자리 이상 원시값 (해상도·날짜 제외)
    ], whitelist=['1건']),
  'plan': dict(patterns=[
      r'[+−\-]?\d[\d,]*(?:\.\d+)?\s*(?:~\s*\d[\d,]*(?:\.\d+)?)?\s*(?:억|만)\s*원?',  # 3만~5만 원, 250만 원
      r'\d{1,3}(?:,\d{3})+\s*(?:원|명|건)?',  # 12,549원 · 196,974명 · 13,540건 · 7,082,500
      r'[+−\-]?\d+(?:\.\d+)?\s*(?:~\s*\d+(?:\.\d+)?)?%',                        # 모든 % (화이트리스트 제외)
      r'\d{3,}\s*건',                       # 584건 · 470건
    ], whitelist=['80%', '85%', '100%', '112%', '80% 85%']),
  'all': dict(patterns=[r'\d[\d,]*(?:\.\d+)?'], whitelist=[]),
}
cfg = PROFILES[profile]

MASK_JS = r"""
(cfg) => {
  const WL = new Set(cfg.whitelist || []);
  const pats = cfg.patterns.map(p => new RegExp(p, 'g'));
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const bar = tok => tok.replace(/\d[\d,\.]*\d|\d/g, m => '█'.repeat(m.replace(/[^\d]/g, '').length));
  const findRanges = s => {
    const rs = [];
    for (const re of pats) { re.lastIndex = 0; let m; while ((m = re.exec(s))) { if (!m[0]) { re.lastIndex++; continue; } if (!WL.has(m[0].trim())) rs.push([m.index, m.index + m[0].length]); } }
    rs.sort((a, b) => a[0] - b[0]);
    const out = []; for (const r of rs) { if (out.length && r[0] < out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], r[1]); else out.push(r.slice()); }
    return out;
  };
  let n = 0;
  // 1) text nodes
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode(t) {
    if (!/\d/.test(t.nodeValue)) return NodeFilter.FILTER_REJECT;
    for (let p = t.parentNode; p; p = p.parentNode) if (p.nodeName && SKIP.has(p.nodeName.toUpperCase())) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT; } });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const t of nodes) {
    const s = t.nodeValue; const rs = findRanges(s); if (!rs.length) continue;
    const svg = t.parentNode.namespaceURI === 'http://www.w3.org/2000/svg';
    const frag = document.createDocumentFragment(); let last = 0;
    for (const [a, b] of rs) {
      if (a > last) frag.appendChild(document.createTextNode(s.slice(last, a)));
      let el; if (svg) { el = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); el.setAttribute('fill', '#0e0e10'); }
      else { el = document.createElement('span'); el.className = 'rdm'; el.style.color = '#0e0e10'; el.style.letterSpacing = '0'; }
      el.textContent = bar(s.slice(a, b)); frag.appendChild(el); last = b; n++;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    t.parentNode.replaceChild(frag, t);
  }
  // 2) attributes that surface as text
  for (const el of document.body.querySelectorAll('[title],[aria-label],[alt],[data-tip],[data-tooltip],[placeholder]')) {
    for (const a of ['title', 'aria-label', 'alt', 'data-tip', 'data-tooltip', 'placeholder']) {
      const v = el.getAttribute(a); if (!v || !/\d/.test(v)) continue;
      const rs = findRanges(v); if (!rs.length) continue;
      let out = '', last = 0; for (const [x, y] of rs) { out += v.slice(last, x) + bar(v.slice(x, y)); last = y; } out += v.slice(last);
      el.setAttribute(a, out); n++;
    }
  }
  // 3) <title>
  if (document.title && /\d/.test(document.title)) { const v = document.title; const rs = findRanges(v); if (rs.length) { let out = '', last = 0; for (const [x, y] of rs) { out += v.slice(last, x) + bar(v.slice(x, y)); last = y; } document.title = out + v.slice(last); } }
  if (cfg.strip) { document.querySelectorAll('script').forEach(s => s.remove()); }
  // 마스킹 고지 (소스 하단 주석 + 화면 미표시)
  document.documentElement.appendChild(document.createComment(' 수치는 포트폴리오 공개용으로 자릿수만 남기고 가렸습니다 (█ = 숫자 1자리). '));
  return n;
}
"""

def serve(port):
    h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', port), h)
    th = threading.Thread(target=srv.serve_forever, daemon=True); th.start(); return srv

src = ROOT / 'demos' / slug / 'index.html'
orig = WORK / f'{slug}.orig.html'
if not orig.exists(): shutil.copy(src, orig)
else: shutil.copy(orig, src)  # idempotent: always mask from the original
srv = serve(8767)
try:
  with sync_playwright() as p:
    br = p.chromium.launch(); pg = br.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:8767/demos/{slug}/index.html', wait_until='networkidle'); pg.wait_for_timeout(3500)
    before = pg.evaluate('document.body.innerText.length')
    n = pg.evaluate(MASK_JS, dict(cfg, strip=strip_scripts))
    html = pg.evaluate('"<!DOCTYPE html>\\n" + document.documentElement.outerHTML')
    src.write_text(html, encoding='utf-8')
    # re-open the masked file for shots + sanity
    pg2 = br.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
    errs2 = []; pg2.on('pageerror', lambda e: errs2.append(str(e)))
    pg2.goto(f'http://127.0.0.1:8767/demos/{slug}/index.html?m={int(time.time())}', wait_until='networkidle'); pg2.wait_for_timeout(2500)
    after = pg2.evaluate('document.body.innerText.length')
    shot = ROOT / 'assets' / 'shots' / f'{slug}.jpg'
    pg2.screenshot(path=str(shot), type='jpeg', quality=82, clip={'x': 0, 'y': 0, 'width': 1280, 'height': 720})
    from PIL import Image
    im = Image.open(shot); im.resize((640, 360), Image.LANCZOS).save(shot.with_name(f'{slug}_s.jpg'), quality=80)
    print(json.dumps(dict(slug=slug, profile=profile, masked_tokens=n, text_before=before, text_after=after, bytes=len(html.encode()), errors_orig=errs, errors_masked=errs2), ensure_ascii=False))
    br.close()
finally:
  srv.shutdown()
