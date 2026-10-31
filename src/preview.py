#!/usr/bin/env python3
"""Claude 안에서 열어 보는 경량 미리보기 번들(단일 HTML + 일부 미디어, ≤ ~55MB).
- 분석·인사이트 항목 제외(EXCLUDE), 유튜브는 포스터로, 큰 영상은 프리뷰 클립으로 대체
- 5개 페이지를 해시 라우팅 1장으로 합침(#home/#works/#tools/#resume/#about)
- Pretendard 가변 폰트를 data URI로 인라인(아티팩트 CSP: 외부 폰트 CSS 불가)
usage: preview.py [out_dir]
"""
import json, os, re, sys, shutil, pathlib, base64, subprocess
REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/pf_preview')
FONT = pathlib.Path('/home/claude/pf_prev_assets/PretendardVariable.woff2')
EXCLUDE = {'owner-ad-psychology', 'witness-relay-plan', 'keyword-template-report'}
FULL_KEEP = {'td_review2605', 'td_declutter', 'td_godaangn', 'sf_bizjul', 'mg_keyword_spring', 'td_pickup', 'ai_closet1'}
VAR_CAP = {'td_declutter': 3.0e6, 'cr_10y': 4.0e6, 'cr_instantbuy': 3.5e6, 'mg_keyword_spring': 2.5e6}  # 영상 variants 허용 작품·상한(그 외는 이미지 variants만)
IMG_MAX = 0.6e6
DEMO_CAP = 3.5e6         # 데모 폴더 상한
MB = 1e6

def size(p): p = REPO / p; return p.stat().st_size if p.exists() else None
def dirsize(p): return sum(f.stat().st_size for f in (REPO / p).rglob('*') if f.is_file())

if OUT.exists(): shutil.rmtree(OUT)
(OUT / 'data').mkdir(parents=True); (OUT / 'site').mkdir(); (OUT / 'bundle').mkdir()
W = json.load(open(REPO / 'data/works.json'))
keep_files = set(); notes = []
for w in W:
    if w['id'] in EXCLUDE: w['grade'] = 3; continue
    if w.get('grade', 3) > 2: continue
    m = w.setdefault('media', {}); L = w.setdefault('links', {})
    for k in ('poster', 'poster16', 'shot', 'preview'):
        if m.get(k) and size(m[k]) is not None: keep_files.add(m[k])
        elif m.get(k): m[k] = None
    bb = m.get('billboard') or {}
    if bb.get('poster') and size(bb['poster']) is not None: keep_files.add(bb['poster'])
    if bb.get('src'):
        if bb['src'].startswith('assets/bb/') and size(bb['src']): keep_files.add(bb['src'])
        else: bb['src'] = None; notes.append(f"{w['id']}: billboard src 제외")
    if m.get('full16'): m['full16'] = None
    if m.get('full'):
        if w['id'] in FULL_KEEP and size(m['full']): keep_files.add(m['full'])
        else: m['full'] = m.get('preview'); notes.append(f"{w['id']}: full→preview")
    vs = []; tot = 0
    for v in m.get('variants') or []:
        s = size(v.get('src') or '')
        if s is None: continue
        cap = VAR_CAP.get(w['id'], 0)
        is_img = not re.search(r'\.(mp4|webm|mov)$', v['src'], re.I)
        if is_img and s > IMG_MAX: continue
        if not is_img and tot + s > cap: continue
        tot += s; vs.append(v); keep_files.add(v['src'])
    if len(vs) != len(m.get('variants') or []): notes.append(f"{w['id']}: variants {len(m.get('variants') or [])}→{len(vs)}")
    m['variants'] = vs
    if m.get('youtube'): m['youtube'] = None; notes.append(f"{w['id']}: youtube→poster")
    embs = L.get('embeds') or ([{'label': '데모', 'src': L['embed']}] if L.get('embed') else [])
    ok = []
    for e_ in embs:
        s = e_.get('src', '')
        if s.startswith('http'): continue
        d = pathlib.Path(s).parent
        if (REPO / s).exists() and dirsize(d) <= DEMO_CAP: ok.append(e_); keep_files.add(('dir', str(d)))
        else: notes.append(f"{w['id']}: demo {s} 제외")
    L['embeds'] = ok; L['embed'] = ok[0]['src'] if ok else None
json.dump(W, open(OUT / 'data/works.json', 'w'), ensure_ascii=False, indent=1)
shutil.copy(REPO / 'data/resume.json', OUT / 'data/resume.json')
keep_files.add('assets/img/profile.jpg')

# 1) 5페이지 빌드
env = dict(os.environ, PF_DATA=str(OUT / 'data'), PF_OUT=str(OUT / 'site'))
print(subprocess.run([sys.executable, str(REPO / 'src/build.py')], env=env, capture_output=True, text=True).stdout.strip())

# 2) 단일 HTML 합성
pages = [('index.html', 'home', '홈'), ('works.html', 'works', '작업'), ('tools.html', 'tools', '도구 · 자동화'), ('resume.html', 'resume', '이력서'), ('about.html', 'about', '소개')]
mains = {}
for f, v, _ in pages:
    h = (OUT / 'site' / f).read_text(encoding='utf-8')
    mains[v] = re.search(r'<main>(.*)</main>', h, re.S).group(1)
    if v == 'home': base = h
head = re.search(r'^(.*?)<body', base, re.S).group(1)
head = re.sub(r'<link rel="preconnect"[^>]*>', '', head)
head = re.sub(r'<link rel="stylesheet" href="https://cdn.jsdelivr.net[^"]*">', '', head)
head = re.sub(r'<link rel="canonical"[^>]*>', '', head)
css = (OUT / 'site/css/site.css').read_text(encoding='utf-8')
b64 = base64.b64encode(FONT.read_bytes()).decode()
font_css = f"@font-face{{font-family:'Pretendard Variable';font-weight:45 920;font-style:normal;font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2-variations')}}"
head = head.replace('<link rel="stylesheet" href="css/site.css">', f'<style>{font_css}</style><style>{css}</style><style>.view[hidden]{{display:none!important}}.pv{{position:fixed;left:var(--s2);bottom:var(--s2);z-index:45;font-size:var(--t-micro);color:var(--ink-2);background:var(--bg-glass);backdrop-filter:blur(12px);padding:var(--s05) var(--s1);border-radius:999px;box-shadow:var(--ring);pointer-events:none}}</style>')
head = head.replace('<title>Hansy — 김한결 · 모션 · 3D · AI · 도구</title>', '<title>Hansy 포트폴리오 — 미리보기</title>')
navm = re.search(r'(<header class="nav">.*?</header>)', base, re.S).group(1)
for f, v, _ in pages: navm = navm.replace(f'href="{f}"', f'href="#{v}"')
navm = navm.replace(' aria-current="page"', '').replace('href="index.html?reel"', 'href="#home"')
footm = re.search(r'(<footer>.*?</footer>)', base, re.S).group(1).replace('© ', '미리보기 빌드 · 영상·데모 일부만 포함 · © ')
tail = re.search(r'(<svg xmlns="http://www.w3.org/2000/svg" style="display:none".*)$', base, re.S).group(1)
js = (OUT / 'site/js/site.js').read_text(encoding='utf-8')
tail = tail.replace('<script src="js/site.js" defer></script>', '<script>' + js.replace('</script>', '<\\/script>') + '</script>')
views = ''.join(f'<main class="view" data-view="{v}"{"" if v=="home" else " hidden"}>{mains[v]}</main>' for _, v, _ in pages)
# 내부 링크(works.html, tools.html, resume.html …) → 해시
for f, v, _ in pages: views = views.replace(f'href="{f}"', f'href="#{v}"')
router = '''<script>(function(){var V=[].slice.call(document.querySelectorAll('main.view')),A=[].slice.call(document.querySelectorAll('.nav .tabs a'));
function show(){var h=(location.hash||'#home').slice(1);if(!V.some(function(m){return m.dataset.view===h}))h='home';
V.forEach(function(m){var on=m.dataset.view===h;if(on&&m.hidden){m.hidden=false;m.style.animation='none';void m.offsetWidth;m.style.animation='';}else if(!on)m.hidden=true;});
A.forEach(function(a){if(a.getAttribute('href')==='#'+h)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
document.body.classList.toggle('home',h==='home');window.scrollTo(0,0);if(h==='home'&&window.__bbResume)window.__bbResume();else if(window.__bbPause)window.__bbPause();}
addEventListener('hashchange',show);show();})();</script>'''
html = head + '<body class="home" data-base="./">' + navm + views + footm + '<span class="pv">미리보기</span>' + tail.replace('</body></html>', router + '</body></html>')
(OUT / 'bundle/index.html').write_text(html, encoding='utf-8')

# 3) 파일 복사
for k in sorted(keep_files, key=str):
    if isinstance(k, tuple):
        src = REPO / k[1]; dst = OUT / 'bundle' / k[1]
        if src.exists(): shutil.copytree(src, dst, dirs_exist_ok=True)
    else:
        src = REPO / k; dst = OUT / 'bundle' / k
        if src.exists(): dst.parent.mkdir(parents=True, exist_ok=True); shutil.copy(src, dst)
        s = small = k[:-4] + '_s.jpg'
        if k.startswith('assets/shots/') and (REPO / s).exists(): (OUT / 'bundle' / s).parent.mkdir(parents=True, exist_ok=True); shutil.copy(REPO / s, OUT / 'bundle' / s)
files = [f for f in (OUT / 'bundle').rglob('*') if f.is_file()]
total = sum(f.stat().st_size for f in files)
big = sorted(files, key=lambda f: -f.stat().st_size)[:8]
print(f'bundle: {len(files)} files, {total/MB:.1f} MB; index.html {(OUT/"bundle/index.html").stat().st_size/MB:.1f} MB')
print('largest:', [(str(f.relative_to(OUT/"bundle")), round(f.stat().st_size/MB,1)) for f in big])
print('notes:', len(notes)); print('\n'.join(notes))
json.dump([str(f.relative_to(OUT / 'bundle')) for f in files], open(OUT / 'files.json', 'w'), ensure_ascii=False, indent=0)
