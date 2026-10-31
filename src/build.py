# -*- coding: utf-8 -*-
"""HANSY portfolio — static build. data/*.json → /home/claude/pf/*.html"""
import json, html, pathlib, shutil, datetime, re
import os
REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(os.environ.get('PF_SRC', REPO / 'src')); DATA = pathlib.Path(os.environ.get('PF_DATA', REPO / 'data')); OUT = pathlib.Path(os.environ.get('PF_OUT', REPO))
W = json.load(open(DATA/'works.json')); R = json.load(open(DATA/'resume.json'))
H = json.load(open(DATA/'home.json')) if (DATA/'home.json').exists() else {}
W = [w for w in W if w.get('grade', 3) <= 2]
W.sort(key=lambda w: (w.get('grade', 2), w.get('sort', 99)))
BY = {w['id']: w for w in W}
def e(s): return html.escape(str(s if s is not None else ''))
def nb(s): return ' '.join(f'<span class="nb">{e(x)}</span>' for x in str(s).split(' '))
GROUPS = {'performance': '퍼포먼스 소재', 'tools': '도구 · 자동화', 'ai': 'AI 생성', 'research': '기획 · 리서치', 'personal': '개인 작업'}
KINDS = {'3d': '3D 영상', 'ai': 'AI 영상', 'motion': '모션 영상', 'owned': '온드 콘텐츠', 'image': '이미지 소재', 'personal': '개인 작업', 'tools': '도구 · 자동화'}
SITE = 'https://hansy-daangn.github.io/pf/'
EMAIL = R.get('email', '')
def poster(w): m = w.get('media') or {}; return m.get('poster') or m.get('shot') or ''
def small(p):
    if p and p.startswith('assets/shots/') and p.endswith('.jpg'):
        s = p[:-4] + '_s.jpg'
        if (OUT/s).exists(): return s
    return p
def has_media(w): return bool(poster(w))
from PIL import Image
_DIM = {}
def pdim(path):
    if not path or path.startswith('http'): return None
    if path not in _DIM:
        _DIM[path] = None
        for base in (REPO, OUT):
            try: _DIM[path] = Image.open(base/path).size; break
            except Exception: pass
    return _DIM[path]
def orient(w):
    d = pdim(poster(w)); return 'tall' if d and d[1] / d[0] > 1.2 else 'wide'
for _w in W:
    _d = pdim(poster(_w)); _m = _w.setdefault('media', {}); _m['pw'], _m['ph'] = (_d or (0, 0))
def is_video(p): return bool(p) and str(p).lower().endswith(('.mp4', '.webm', '.mov'))

ICONS = '''<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
<symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-pause" viewBox="0 0 24 24"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-prev" viewBox="0 0 24 24"><path d="M6 5v14M18 6l-9 6 9 6z"/></symbol>
<symbol id="i-next" viewBox="0 0 24 24"><path d="M18 5v14M6 6l9 6-9 6z"/></symbol>
<symbol id="i-vol" viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/></symbol>
<symbol id="i-mute" viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM16 9.5l5 5M21 9.5l-5 5"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-expand" viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></symbol>
<symbol id="i-pip" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><rect x="11.5" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none"/></symbol>
<symbol id="i-chev-l" viewBox="0 0 24 24"><path d="M14.5 6l-6 6 6 6"/></symbol>
<symbol id="i-chev-r" viewBox="0 0 24 24"><path d="M9.5 6l6 6-6 6"/></symbol>
</svg>'''
def ico(n, cls=''): return f'<svg class="ic {cls}" aria-hidden="true"><use href="#i-{n}"></use></svg>'

def head(title, desc, canon, og=None):
    return f'''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light only">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><link rel="canonical" href="{SITE}{canon}">
<meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{SITE}{og or 'assets/poster/td_review2605_h.jpg'}"><meta property="og:type" content="website">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="css/site.css"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%230e0e10%22/%3E%3Crect x=%228%22 y=%2213%22 width=%2216%22 height=%226%22 fill=%22%23cc1433%22/%3E%3C/svg%3E"></head>'''
def nav(cur):
    tabs = [('index.html', '홈'), ('works.html', '작업'), ('tools.html', '도구 · 자동화'), ('resume.html', '이력서')]
    t = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if h == cur else ""}>{n}</a>' for h, n in tabs)
    return f'<header class="nav"><div class="wrap in"><a class="lg" href="index.html">Hansy<small>Kim Hangyeol</small></a><nav class="tabs" aria-label="주요 메뉴">{t}</nav><div class="cta"><a class="btn acc" href="index.html?reel" data-reel>{ico("play","sm")}<span>쇼릴</span></a></div></div></header>'
def foot():
    return f'''<footer><div class="wrap in"><span>© {datetime.date.today().year} 김한결 Hansy</span><span><a href="mailto:{e(EMAIL)}">{e(EMAIL)}</a> · <a href="https://github.com/hansy-daangn" target="_blank" rel="noopener">GitHub ↗</a></span></div></footer>'''
def tail():
    return f'{ICONS}<script type="application/json" id="works-data">{json.dumps(W, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")}</script><script src="js/site.js" defer></script></body></html>'

def card(w, cls=None):
    cls = cls or orient(w)
    m = w.get('media') or {}
    p = small((m.get('poster16') if cls == 'wide' and m.get('poster16') else poster(w))); ui = ' ui' if w['group'] in ('tools', 'research') else ''
    hgt = {'sq': 600, 'wide': 338, 'tall': 1067}.get(cls, 338)
    d = pdim(p) or pdim(poster(w)); ar = (d[0] / d[1]) if d else (16 / 9)
    if cls == 'mix': ar = max(0.5, min(ar, 2.0))
    img = f'<img src="{e(p)}" alt="" loading="lazy" width="600" height="{hgt}">' if p else f'<span class="pt">{e(w.get("year",""))}</span>'
    live = ' ↗' if (w.get('links') or {}).get('live') else ''
    return f'<a class="card {cls}{ui}" style="--ar:{ar:.4f}" href="?w={e(w["id"])}" data-id="{e(w["id"])}"><div class="art{"" if p else " ph"}" data-info="{e((w.get("copy") or {}).get("one",""))}">{img}<span class="pl" aria-hidden="true">{ico("play","sm")}</span></div><div class="t">{e(w["title"])}</div><div class="s">{e(w.get("type") or w.get("subtitle",""))}{live}</div></a>'
def row(title, items, cls=None, more='works.html'):
    items = [w for w in items if has_media(w)]
    if not items: return ''
    cls = cls or 'mix'
    return f'''<section class="row{' mix' if cls == 'mix' else ''}" data-queue><div class="wrap hd"><h2>{e(title)}</h2>{f'<a href="{more}">전체 보기 ›</a>' if more else ''}</div>
<div class="wrap"><div class="trk"><div class="ar l"><button aria-label="왼쪽으로">{ico("chev-l")}</button></div><div class="sc">{''.join(card(w, cls) for w in items)}</div><div class="ar r"><button aria-label="오른쪽으로">{ico("chev-r")}</button></div></div></div></section>'''

WHO = '김한결 — 모션·3D로 광고 영상을 만들고, 성과를 읽는 도구까지 직접 만드는 디자이너'
def by_kind(k):
    return [w for w in W if k in (w.get('kinds') or [])]
def home():
    bb_ids = H.get('billboard') or [w['id'] for w in sorted([w for w in W if w.get('featured')], key=lambda w: w.get('feat_order', 99))]
    feat = [BY[i] for i in bb_ids if i in BY and has_media(BY[i])][:8]
    slides = []
    for i, w in enumerate(feat):
        m = w.get('media') or {}; bb = m.get('billboard') or {}
        p = bb.get('poster') or m.get('poster16') or poster(w); pv = bb.get('src') if is_video(bb.get('src')) else None
        if bb: portrait = (bb.get('w') or 16) / (bb.get('h') or 9) < 1.3
        else: d = pdim(p); portrait = bool(d) and d[0] / d[1] < 1.3
        loop = bb.get('loop') or [0, 8]
        src_attr = f'src="{e(p)}" fetchpriority="high"' if i == 0 else f'data-src="{e(p)}" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" loading="lazy"'
        blur = (f'<div class="blur" style="background-image:url({e(p)})"></div>' if i == 0 else f'<div class="blur" data-bg="{e(p)}"></div>') if portrait else ''
        art = f'<div class="art{" portrait" if portrait else ""}">{blur}<img {src_attr} alt="" width="1920" height="1080">' + (f'<video muted loop playsinline preload="none" data-src="{e(pv)}" data-loop="{loop[0]},{loop[1]}" poster="{e(p)}" aria-hidden="true"></video>' if pv else '') + '</div>'
        c = w.get('copy') or {}
        slides.append(f'''<div class="slide{" on" if i==0 else ""}" data-id="{e(w["id"])}" aria-hidden="{"false" if i==0 else "true"}"{"" if i==0 else " inert"}>{art}<div class="veil"></div>
<div class="tx"><div class="wrap in"><div>{f'<p class="who">{e(WHO)}</p>' if i==0 else ''}<div class="k">{e(w.get("type") or "")} · {e(w.get("year",""))}</div><h1>{nb(w["title"])}</h1><p class="one">{e(c.get("one",""))}</p>
<div class="bt"><button class="btn" data-open="{e(w["id"])}">{ico("play","sm")} 재생</button><button class="btn ghost" data-open="{e(w["id"])}">상세</button></div></div>
<div class="dots" role="tablist" aria-label="피처드 전환">{''.join(f'<button data-i="{j}" class="{"on" if j==i else ""}" aria-label="{j+1}번째 작품"></button>' for j in range(len(feat)))}<button class="pp" aria-label="미리보기 일시정지">{ico("pause","sm")}</button><button class="snd" aria-label="소리 켜기" hidden>{ico("mute","sm")}</button></div></div></div></div>''')
    rep = [BY[i] for i in (H.get('rep') or []) if i in BY]
    rows = [row('대표 작업', rep)] if rep else []
    for r in H.get('rows') or []:
        items = [BY[i] for i in r.get('ids', []) if i in BY] if r.get('ids') else by_kind(r.get('kind', ''))
        rows.append(row(r.get('title') or KINDS.get(r.get('kind'), ''), items, None, r.get('more', 'works.html')))
    body = f'''<body class="home" data-base="./">{nav('index.html')}<main>
<section class="bb" aria-label="피처드 작업"><div class="frame">{''.join(slides)}</div></section>
{''.join(rows)}
</main>{foot()}{tail()}'''
    return head('Hansy — 김한결 · 모션 · 3D · AI · 도구', WHO, '', poster(feat[0]) if feat else None) + body

def works():
    items = W
    kc = {k: len(by_kind(k)) for k in KINDS}
    rail = '<aside class="rail" aria-label="분류"><button data-f="kind" aria-pressed="true">전체 <small>' + str(len(items)) + '</small></button>' + ''.join(f'<button data-f="kind" data-v="{k}">{KINDS[k]} <small>{kc[k]}</small></button>' for k in KINDS if kc[k]) + '</aside>'
    grid = ''.join(card(w) for w in items if has_media(w))
    body = f'''<body data-base="./">{nav('works.html')}<main><div class="wrap sec"><h1 class="pg-h">작업</h1>
<div class="lib">{rail}<div data-queue><div class="tb"><span class="cnt">{sum(1 for w in items if has_media(w))}건</span></div>
<div class="grid">{grid}</div></div></div></div></main>{foot()}{tail()}'''
    return head('작업 — Hansy', '김한결의 전체 작업: 3D · AI · 모션 영상, 온드 콘텐츠, 도구, 개인 작업.', 'works.html') + body

def tools():
    ts = [w for w in W if w['group'] == 'tools']
    first = next((w for w in ts if (w.get('links') or {}).get('embed')), ts[0])
    def tdesc(w):
        c = w.get('copy') or {}; l = w.get('links') or {}
        what = ''.join(f'<li>{e(x)}</li>' for x in c.get('what') or [])
        proof = ''.join(f'<span class="chip">{e(x)}</span>' for x in c.get('proof') or [])
        links = ''.join(f'<a class="btn ghost sm" href="{e(u)}" target="_blank" rel="noopener">{t} ↗</a>' for t, u in [('라이브', l.get('live')), ('GitHub', l.get('github')), ('원본', l.get('artifact'))] if u)
        meta = ''.join(f'<span>{k}</span><b>{e(v)}</b>' for k, v in [('종류', w.get('type')), ('기술', ' · '.join(w.get('tools') or [])), ('시기', w.get('period') or w.get('year')), ('기여도', w.get('contrib'))] if v)
        return f'''<div class="tdesc" data-for="{e(w["id"])}"{"" if w is first else " hidden"}><div><h2>{e(w["title"])}</h2><p class="one">{e(c.get("one",""))}</p>{f'<ul class="what">{what}</ul>' if what else ''}{f'<p class="try">{e(c["try"])}</p>' if c.get('try') else ''}</div>
<div><div class="proof">{proof}</div><div class="meta-tbl">{meta}</div><div class="lk">{links}</div></div></div>'''
    rail = ''.join(f'<button class="ti" data-id="{e(w["id"])}" aria-pressed="{"true" if w is first else "false"}"><img src="{e(small(poster(w)))}" alt="" loading="lazy" width="128" height="80"><span><b>{e(w["title"].split(" — ")[0])}</b><small>{e(w.get("type",""))}</small></span></button>' for w in ts)
    embs = (first.get('links') or {}).get('embeds') or []
    chips = ''.join(f'<button class="chip" data-src="{e(x["src"])}" aria-pressed="{"true" if i == 0 else "false"}">{e(x["label"])}</button>' for i, x in enumerate(embs))
    body = f'''<body data-base="./">{nav('tools.html')}<main><div class="wrap sec"><h1 class="pg-h">도구 · 자동화</h1>
<div class="tl" data-queue><aside class="trail" aria-label="도구 목록">{rail}</aside>
<div class="tmain"><div class="tbar"><span class="chips">{chips}</span><a class="btn ghost sm open" href="{e((first.get('links') or {}).get('embed') or '#')}" target="_blank" rel="noopener">새 창 ↗</a></div>
<div class="tstage" data-id="{e(first['id'])}"><iframe title="{e(first['title'])}" src="{e((first.get('links') or {}).get('embed') or 'about:blank')}" allow="fullscreen; clipboard-write" loading="eager"></iframe><div class="tmob"><img src="{e(poster(first))}" alt="" width="1280" height="800"></div></div>
{''.join(tdesc(w) for w in ts)}</div></div></div></main>{foot()}{tail()}'''
    return head('도구 · 자동화 — Hansy', '김한결이 직접 만든 업무 도구: CreativeReporter, CreativeNamer, KarrotField, 3D 구도실, HF Unlimited Runner 등 — 바로 써볼 수 있는 체험판.', 'tools.html') + body

def ym(s):
    s = str(s or '').strip()
    s = re.sub(r'(\d{4})-(\d{2})-\d{2}', r'\1.\2', s); s = re.sub(r'(\d{4})-(\d{2})', r'\1.\2', s)
    return s
def resume():
    def tbl(rows, cls=''): return f'<table class="{cls}">' + ''.join(rows) + '</table>'
    edu = [x for x in R.get('education', []) if '고등학교' not in x.get('school', '')]
    edu_t = tbl(f'<tr><td class="d">{e(ym(x["period"]))}</td><td><b>{e(x["school"])}</b><span class="sm">{e(x.get("major",""))}</span></td></tr>' for x in edu)
    car = tbl(f'<tr><td class="d">{e(ym(x["period"]))}</td><td><b>{e(x["org"])} · {e(x["title"])}</b><span class="sm">{e(x.get("desc",""))}</span></td></tr>' for x in R.get('career', []))
    PRIMARY = {'2D': 2, '3D': 2, 'AI': 1, '개발·데이터': 2}
    def skl(k, v):
        if not isinstance(v, list): return e(v)
        n = PRIMARY.get(k, 0); return ' · '.join((f'<b>{e(x)}</b>' if i < n else e(x)) for i, x in enumerate(v))
    sk = tbl((f'<tr><td class="d">{e(k)}</td><td>{skl(k, v)}</td></tr>' for k, v in (R.get('skills') or {}).items()), 'skills')
    aw = R.get('awards', [])
    uni = [a for a in aw if a.get('date', '') >= '2019-03']; hs = [a for a in aw if a.get('date', '') < '2019-03']
    def awrow(a): return f'<tr><td class="d">{e(ym(a.get("date","")))}</td><td><b>{e(a.get("name",""))}</b> — {e(a.get("prize",""))}<span class="sm">{e(a.get("field",""))} · {e(a.get("role",""))} · {e(a.get("host",""))}</span></td></tr>'
    awards = f'<h3>수상 <small>{len(aw)}건 — 대학 이후 {len(uni)} · 고교 {len(hs)}</small></h3>' + tbl(awrow(a) for a in uni) + (f'<details><summary>고교 시절 {len(hs)}건</summary>' + tbl(awrow(a) for a in hs) + '</details>' if hs else '')
    papers = ''.join(f'<tr><td class="d">{e(p.get("year",""))}</td><td><b>{e(p.get("title",""))}</b><span class="sm">{e(p.get("role",""))} · {e(p.get("venue",""))} · {e(p.get("award",""))}</span><span class="sm">{e(p.get("summary",""))}</span></td></tr>' for p in R.get('papers', []))
    summary = ' '.join(R['summary']) if isinstance(R.get('summary'), list) else R.get('summary', '')
    body = f'''<body data-base="./">{nav('resume.html')}<main><div class="wrap sec cvw"><div class="cv">
<header class="idc"><img src="assets/img/profile.jpg" alt="김한결" width="104" height="136"><div><h1 class="nm">{e(R["name"])}</h1><div class="jb">{e(R.get("title",""))}</div><div class="em"><a href="mailto:{e(EMAIL)}">{e(EMAIL)}</a> · <a href="https://github.com/hansy-daangn" target="_blank" rel="noopener">github.com/hansy-daangn</a></div><div class="base">{e(R.get("base_line","병역 육군 병장 만기전역 · 입사 가능 시기 협의 후 즉시"))}</div></div></header>
<p class="tag">{e(R.get("tagline",""))}</p><p class="ds">{e(summary)}</p>
<h3>경력</h3>{car}
<h3>학력</h3>{edu_t}
<h3>기술</h3>{sk}
{awards}
{f'<h3>논문</h3><table>{papers}</table>' if papers else ''}
</div></div></main>{foot()}{tail()}'''
    return head('이력서 — 김한결 Hansy', '김한결(Hansy) 이력서 — 경력, 학력, 기술, 수상, 논문.', 'resume.html') + body

(OUT/'css').mkdir(exist_ok=True); (OUT/'js').mkdir(exist_ok=True); (OUT/'data').mkdir(exist_ok=True)
shutil.copy(SRC/'site.css', OUT/'css/site.css'); shutil.copy(SRC/'site.js', OUT/'js/site.js')
json.dump(W, open(OUT/'data/works.json', 'w'), ensure_ascii=False, indent=1)
for name, fn in [('index.html', home), ('works.html', works), ('tools.html', tools), ('resume.html', resume)]:
    (OUT/name).write_text(fn(), encoding='utf-8')
if (OUT/'about.html').exists(): (OUT/'about.html').write_text('<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=resume.html"><title>이력서로 이동</title>', encoding='utf-8')
for name, fn in []:
    (OUT/name).write_text(fn(), encoding='utf-8')
(OUT/'.nojekyll').write_text('')
missing = [(w['id'], p) for w in W for p in [poster(w), (w.get('media') or {}).get('preview'), (w.get('media') or {}).get('full'), ((w.get('media') or {}).get('billboard') or {}).get('src')] + [v.get('src') for v in (w.get('media') or {}).get('variants', [])] if p and not str(p).startswith('http') and not (OUT/p).exists()]
print('built', len(W), 'works; media-less:', [w['id'] for w in W if not has_media(w)], '; missing files:', missing[:10])
