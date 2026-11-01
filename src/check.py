#!/usr/bin/env python3
"""배포 전 점검 — python src/check.py
1) 게시 용량(GitHub Pages 한도 1GB 대비)  2) works.json이 가리키는 파일 누락  3) 페이지·상영관 콘솔 오류(데스크톱·모바일)
"""
import json, pathlib, sys, threading, http.server, socketserver, functools
REPO = pathlib.Path(__file__).resolve().parent.parent
skip = {'.git', 'masters', 'node_modules', '.cache'}
size = sum(f.stat().st_size for f in REPO.rglob('*') if f.is_file() and not (set(f.relative_to(REPO).parts) & skip))
print(f'게시 용량 {size / 1e6:.0f}MB / 1000MB ({size / 1e7:.0f}%)')
W = json.load(open(REPO / 'data' / 'works.json'))
miss = []
for w in W:
    if w.get('grade', 3) > 2: continue
    m = w.get('media') or {}
    paths = [m.get(k) for k in ('poster', 'shot', 'demo')] + [v.get(k) for v in m.get('videos') or [] for k in ('hd', 'sd')] + [i.get('src') for i in m.get('images') or []]
    for p in paths:
        if p and '/' in p and not p.startswith('http') and not (REPO / p).exists(): miss.append((w['id'], p))
print('누락 파일', len(miss), miss[:10])
if '--no-browser' in sys.argv: sys.exit(1 if miss else 0)
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 8799), functools.partial(Q, directory=str(REPO))); threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []
with sync_playwright() as p:
    br = p.chromium.launch()
    for vp, mob in [((1440, 900), False), ((390, 844), True)]:
        ctx = br.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=mob, has_touch=mob); pg = ctx.new_page()
        pg.on('pageerror', lambda e, vp=vp: errs.append(f'{vp} {e}'))
        pg.on('console', lambda m, vp=vp: errs.append(f'{vp} console: {m.text}') if m.type == 'error' and 'favicon' not in m.text and '404' not in m.text else None)
        pg.on('response', lambda r, vp=vp: errs.append(f'{vp} {r.status} {r.url}') if r.status >= 400 and '127.0.0.1' in r.url and '/api/' not in r.url else None)
        for page in ['index.html', 'works.html', 'tools.html', 'resume.html', 'works.html?w=td_declutter', 'works.html?w=nayeon-campaign', 'edit.html']:
            pg.goto(f'http://127.0.0.1:8799/{page}', wait_until='domcontentloaded'); pg.wait_for_timeout(1500)
        ctx.close()
    br.close()
srv.shutdown()
print('오류', len(errs)); [print(' ', e) for e in errs[:20]]
sys.exit(1 if (errs or miss) else 0)
