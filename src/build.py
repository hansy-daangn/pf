# -*- coding: utf-8 -*-
"""HANSY portfolio — static build. data/*.json → /home/claude/pf/*.html"""
import json, html, pathlib, shutil, datetime, re, hashlib, subprocess
import os
REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(os.environ.get('PF_SRC', REPO / 'src')); DATA = pathlib.Path(os.environ.get('PF_DATA', REPO / 'data')); OUT = pathlib.Path(os.environ.get('PF_OUT', REPO))
W = json.load(open(DATA/'works.json')); R = json.load(open(DATA/'resume.json'))
H = json.load(open(DATA/'home.json')) if (DATA/'home.json').exists() else {}
D = json.load(open(DATA/'design.json'))
BODY_ATTR = ''.join(f' data-{k}="{v}"' for k, v in D['pick'].items())
W = [w for w in W if w.get('grade', 3) <= 2]
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
from PIL import ImageFilter, ImageEnhance
def make_poster16(w):
    """세로·정방 포스터 → 16:9 카드용 블러 배경 합성(assets/poster16/<id>.jpg). 원본보다 오래되면 재생성."""
    m = w.get('media') or {}; src = poster(w)
    if not src or m.get('poster16'): return m.get('poster16')
    d = pdim(src)
    if not d or d[0] / d[1] >= 1.6: return None  # 이미 가로면 그대로 cover
    out = pathlib.Path('assets/poster16') / f"{w['id']}.jpg"; sp = REPO / src; op = REPO / out
    if op.exists() and op.stat().st_mtime >= sp.stat().st_mtime: return str(out)
    try:
        im = Image.open(sp).convert('RGB'); Wd, Hd = 1280, 720
        bg = im.copy(); r = max(Wd / bg.width, Hd / bg.height); bg = bg.resize((int(bg.width * r) + 1, int(bg.height * r) + 1), Image.LANCZOS)
        bg = bg.crop(((bg.width - Wd) // 2, (bg.height - Hd) // 2, (bg.width - Wd) // 2 + Wd, (bg.height - Hd) // 2 + Hd)).filter(ImageFilter.GaussianBlur(36))
        bg = ImageEnhance.Brightness(bg).enhance(0.72)
        fg = im.copy(); r2 = Hd / fg.height; fg = fg.resize((max(1, int(fg.width * r2)), Hd), Image.LANCZOS)
        bg.paste(fg, ((Wd - fg.width) // 2, 0)); op.parent.mkdir(parents=True, exist_ok=True); bg.save(op, quality=86)
        return str(out)
    except Exception as ex:
        print('poster16 fail', w['id'], ex); return None
def thumbs(path):
    """카드용 WebP 640·1280 (원본보다 오래되면 재생성). 반환: srcset 문자열"""
    if not path or path.startswith('http'): return ''
    sp = REPO / path
    if not sp.exists(): return ''
    out = []
    for wd in (640, 1280):
        tp = pathlib.Path('assets/thumb') / f"{hashlib.md5(path.encode()).hexdigest()[:10]}-{wd}.webp"; op = REPO / tp
        if not op.exists() or op.stat().st_mtime < sp.stat().st_mtime:
            try:
                im = Image.open(sp).convert('RGB')
                if im.width > wd: im = im.resize((wd, max(1, round(im.height * wd / im.width))), Image.LANCZOS)
                op.parent.mkdir(parents=True, exist_ok=True); im.save(op, 'WEBP', quality=80, method=5)
            except Exception as ex:
                print('thumb fail', path, ex); return ''
        out.append(f'{tp} {wd}w')
    return ', '.join(out)
def videos(w): return (w.get('media') or {}).get('videos') or []
def feat_video(w):
    """피처드에 쓸 영상: 가장 가로로 긴 버전(16:9 우선)"""
    vs = [v for v in videos(w) if v.get('w') and v.get('h')]
    return max(vs, key=lambda v: v['w'] / v['h']) if vs else None
def bb_range(w):
    m = w.get('media') or {}; v = feat_video(w); dur = (v or {}).get('dur') or 8
    a, b = (m.get('billboard') or [m.get('start') or 0, (m.get('start') or 0) + 8])[:2]
    a = max(0.0, min(float(a), dur - 1)); b = min(float(b), dur)
    if b - a < 3: b = min(dur, a + 6)
    return round(a, 2), round(b, 2)
def bb_poster(w):
    """피처드 첫 화면 = 재생 구간 시작 프레임(영상이 시작될 때 장면이 튀지 않게). assets/poster/bb/<id>_<시작초>.jpg"""
    v = feat_video(w)
    if not v: return poster(w)
    a, _ = bb_range(w); src = REPO / v['hd']; out = pathlib.Path('assets/poster/bb') / f"{w['id']}_{a:g}.jpg".replace('.', 'p', 1 if '.' in f'{a:g}' else 0); op = REPO / out
    if not op.exists() or op.stat().st_mtime < src.stat().st_mtime:
        op.parent.mkdir(parents=True, exist_ok=True)
        for old in op.parent.glob(f"{w['id']}_*.jpg"): old.unlink()
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a}', '-i', str(src), '-frames:v', '1', '-q:v', '3', str(op)], capture_output=True, text=True)
        if r.returncode or not op.exists(): print('bb poster fail', w['id'], r.stderr[-200:]); return poster(w)
    return str(out)
def prio(w): return (w.get('priority') if isinstance(w.get('priority'), (int, float)) else 999, w.get('grade', 2), w.get('sort', 99))
for _w in W:
    _d = pdim(poster(_w)); _m = _w.setdefault('media', {}); _m['pw'], _m['ph'] = (_d or (0, 0))
    _p16 = make_poster16(_w)
    if _p16: _m['poster16'] = _p16
    _m['srcset'] = thumbs(_m.get('poster16') or poster(_w))
W.sort(key=prio)
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
<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@type": "Person", "name": "김한결", "alternateName": "Hansy", "jobTitle": R.get("title", ""), "email": "mailto:" + EMAIL, "url": SITE, "sameAs": ["https://github.com/hansy-daangn"]}, ensure_ascii=False)}</script>
<link rel="stylesheet" href="css/site.css"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%227%22 fill=%22%230e0e10%22/%3E%3Crect x=%228%22 y=%2213%22 width=%2216%22 height=%226%22 fill=%22%23cc1433%22/%3E%3C/svg%3E"></head>'''
def nav(cur):
    tabs = [('index.html', '홈'), ('works.html', '작업'), ('tools.html', '도구 · 자동화'), ('resume.html', '이력서')]
    t = ''.join(f'<a href="{h}"{" aria-current=\"page\"" if h == cur else ""}>{n}</a>' for h, n in tabs)
    return f'<header class="nav"><div class="wrap in"><a class="lg" href="index.html">Hansy<small>Kim Hangyeol</small></a><nav class="tabs" aria-label="주요 메뉴">{t}</nav><div class="cta"><a class="btn acc" href="index.html?reel" data-reel>{ico("play","sm")}<span>쇼릴</span></a></div></div></header>'
def foot():
    return f'''<footer><div class="wrap in"><span>© {datetime.date.today().year} 김한결 Hansy</span><span><a href="mailto:{e(EMAIL)}">{e(EMAIL)}</a> · <a href="https://github.com/hansy-daangn" target="_blank" rel="noopener">GitHub ↗</a></span></div></footer>'''
def tail():
    dz = json.dumps({'pick': D['pick'], 'modules': {k: {'name': m['name'], 'options': m['options']} for k, m in D['modules'].items()}}, ensure_ascii=False, separators=(',', ':'))
    return f'{ICONS}<script type="application/json" id="design-data">{dz}</script><script type="application/json" id="works-data">{json.dumps(W, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")}</script><script src="js/site.js" defer></script></body></html>'

def card(w, cls='wide'):
    cls = cls or 'wide'
    m = w.get('media') or {}
    p = small((m.get('poster16') if cls == 'wide' and m.get('poster16') else poster(w))); ui = ' ui' if w['group'] in ('tools', 'research') else ''
    hgt = {'wide': 338, 'tall': 1067}.get(cls, 338)
    ss = thumbs(p)
    sizes = '(max-width:760px) 264px, 304px' if cls == 'wide' else '(max-width:760px) 132px, 172px'
    img = (f'<img src="{e(p)}"' + (f' srcset="{e(ss)}" sizes="{sizes}"' if ss else '') + f' alt="" loading="lazy" width="600" height="{hgt}">') if p else f'<span class="pt">{e(w.get("year",""))}</span>'
    live = ' ↗' if (w.get('links') or {}).get('live') else ''
    return f'<a class="card {cls}{ui}" href="?w={e(w["id"])}" data-id="{e(w["id"])}"><div class="art{"" if p else " ph"}">{img}</div><div class="t">{e(w["title"])}</div><div class="s">{e(w.get("type") or w.get("subtitle",""))}{live}</div></a>'
def row(title, items, cls=None, more='works.html'):
    items = [w for w in items if has_media(w)]
    if not items: return ''
    items = sorted(items, key=prio)
    if cls is None:
        # 세로 소재만 모인 행은 9:16, 그 외는 전부 16:9(세로·정방은 블러 배경 합성 썸네일)
        cls = 'tall' if all(orient(w) == 'tall' for w in items) else 'wide'
    return f'''<section class="row" data-queue><div class="wrap"><div class="hd"><h2>{e(title)}</h2>{f'<a class="more" href="{more}">더보기</a>' if more else ''}</div>
<div class="trk"><span class="arr"><button class="ar l" aria-label="이전" disabled>{ico("chev-l")}</button><button class="ar r" aria-label="다음">{ico("chev-r")}</button></span><div class="sc">{''.join(card(w, cls) for w in items)}</div></div></div></section>'''

WHO = '김한결 — 모션·3D로 광고 영상을 만들고, 성과를 읽는 도구까지 직접 만드는 디자이너'
def by_kind(k):
    return [w for w in W if k in (w.get('kinds') or [])]
def home():
    bb_ids = H.get('billboard') or []
    feat = [BY[i] for i in bb_ids if i in BY and feat_video(BY[i])][:8]
    frames, texts = [], []
    for i, w in enumerate(feat):
        v = feat_video(w); a, b = bb_range(w); p = bb_poster(w)
        img = f'<img src="{e(p)}" alt=""' + (' fetchpriority="high"' if i == 0 else ' loading="lazy"') + ' width="1920" height="1080">'
        frames.append(f'<div class="fs{" on" if i == 0 else ""}" data-hd="{e(v["hd"])}" data-sd="{e(v.get("sd") or v["hd"])}" data-a="{a}" data-b="{b}"><div class="blur" style="background-image:url({e(p)})"></div>{img}</div>')
        c = w.get('copy') or {}
        texts.append(f'''<div class="fx{" on" if i == 0 else ""}"{"" if i == 0 else " hidden"} data-id="{e(w["id"])}"><div class="k">{e(w.get("type") or "")}{(" · " + e(w.get("year"))) if w.get("year") else ""}</div><h2>{nb(w["title"])}</h2>{f'<p class="one">{e(c.get("one"))}</p>' if c.get("one") else ''}
<div class="bt"><button class="btn" data-open="{e(w["id"])}">{ico("play","sm")} 재생</button><button class="btn ghost" data-info="{e(w["id"])}">상세 정보</button></div></div>''')
    dots = ''.join(f'<button data-i="{j}" class="{"on" if j == 0 else ""}" aria-label="{j + 1}번째 작품"><i></i></button>' for j in range(len(feat)))
    featured = f'''<section class="feat" aria-label="피처드 작업"><div class="fv">{''.join(frames)}<div class="veil"></div></div>
<div class="ft"><div class="wrap in"><div class="fxs">{''.join(texts)}</div><div class="fctl" role="tablist" aria-label="피처드 전환">{dots}<button class="pp" aria-label="일시정지">{ico("pause","sm")}</button><button class="snd" aria-label="소리 켜기">{ico("mute","sm")}</button></div></div></div></section>''' if feat else ''
    rep = [BY[i] for i in (H.get('rep') or []) if i in BY]
    rows = [row('대표 작업', rep, 'wide')] if rep else []
    for r in H.get('rows') or []:
        items = [BY[i] for i in r.get('ids', []) if i in BY] if r.get('ids') else by_kind(r.get('kind', ''))
        rows.append(row(r.get('title') or KINDS.get(r.get('kind'), ''), items, None, r.get('more') or (f"works.html#{r['kind']}" if r.get('kind') else 'works.html')))
    body = f'''<body class="home" data-base="./">{nav('index.html')}<main>
{featured}
{''.join(rows)}
</main>{foot()}{tail()}'''
    return head('Hansy — 김한결 · 모션 · 3D · AI · 도구', WHO, '', poster(feat[0]) if feat else None) + body

def works():
    items = W
    kc = {k: len(by_kind(k)) for k in KINDS}
    rail = '<aside class="rail" aria-label="분류"><button data-f="kind" aria-pressed="true">전체 <small>' + str(len(items)) + '</small></button>' + ''.join(f'<button data-f="kind" data-v="{k}">{KINDS[k]} <small>{kc[k]}</small></button>' for k in KINDS if kc[k]) + '</aside>'
    grid = ''.join(card(w, 'wide') for w in sorted(items, key=prio) if has_media(w))
    body = f'''<body data-base="./">{nav('works.html')}<main><div class="wrap sec"><h1 class="pg-h">작업</h1>
<div class="lib">{rail}<div data-queue><div class="tb"><input class="q" type="search" placeholder="제목·툴·매체 검색" aria-label="작업 검색"><span class="cnt">{sum(1 for w in items if has_media(w))}건</span></div>
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
        return f'''<div class="tdesc" data-for="{e(w["id"])}"{"" if w is first else " hidden"}><div><h2>{e(w["title"])}</h2><p class="one">{e(c.get("one",""))}</p>{f'<ul class="what">{what}</ul>' if what else ''}</div>
<div><div class="proof">{proof}</div><div class="meta-tbl">{meta}</div><div class="lk">{links}</div></div></div>'''
    rail = ''.join(f'<button class="ti" data-id="{e(w["id"])}" aria-pressed="{"true" if w is first else "false"}"><img src="{e(small(poster(w)))}" alt="" loading="lazy" width="128" height="80"><span><b>{e(w["title"].split(" — ")[0])}</b><small>{e(w.get("type",""))}</small></span></button>' for w in ts)
    embs = (first.get('links') or {}).get('embeds') or []
    chips = ''.join(f'<button class="chip" data-src="{e(x["src"])}" aria-pressed="{"true" if i == 0 else "false"}">{e(x["label"])}</button>' for i, x in enumerate(embs))
    body = f'''<body data-base="./">{nav('tools.html')}<main><div class="wrap sec"><h1 class="pg-h">도구 · 자동화</h1>
<div class="tl" data-queue><aside class="trail" aria-label="도구 목록">{rail}</aside>
<div class="tmain"><div class="tbar"><span class="chips">{chips}</span><span class="r"><button class="btn ghost sm big" type="button">크게 보기</button><a class="btn ghost sm open" href="{e((first.get('links') or {}).get('embed') or '#')}" target="_blank" rel="noopener">새 창 ↗</a></span></div>
<div class="tstage" data-id="{e(first['id'])}"><iframe title="{e(first['title'])}" src="{e((first.get('links') or {}).get('embed') or 'about:blank')}" allow="fullscreen; clipboard-write" loading="eager"></iframe></div>
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

(OUT/'css').mkdir(exist_ok=True); (OUT/'js').mkdir(exist_ok=True)
(OUT/'css/site.css').write_text('\n'.join(f'/* ===== {f.name} ===== */\n' + f.read_text(encoding='utf-8') for f in sorted((SRC/'css').glob('*.css'))), encoding='utf-8'); shutil.copy(SRC/'site.js', OUT/'js/site.js')
for name, fn in [('index.html', home), ('works.html', works), ('tools.html', tools), ('resume.html', resume)]:
    (OUT/name).write_text(fn().replace('<body', '<body' + BODY_ATTR, 1), encoding='utf-8')
if (OUT/'about.html').exists(): (OUT/'about.html').write_text('<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=resume.html"><title>이력서로 이동</title>', encoding='utf-8')
(OUT/'.nojekyll').write_text('')
# 작품별 공유 페이지(카톡·슬랙 미리보기용) — 열면 상영관으로 이동
(OUT/'w').mkdir(exist_ok=True)
for old in (OUT/'w').glob('*.html'): old.unlink()
for w in W:
    if not has_media(w): continue
    c = w.get('copy') or {}; m = w.get('media') or {}; og = m.get('poster16') or poster(w)
    desc = c.get('one') or w.get('type') or ''
    (OUT/'w'/f"{w['id']}.html").write_text(f'''<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>{e(w["title"])} — Hansy</title><meta name="description" content="{e(desc)}"><link rel="canonical" href="{SITE}works.html?w={e(w["id"])}">
<meta property="og:title" content="{e(w["title"])} — 김한결 Hansy"><meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{SITE}{e(og)}"><meta property="og:type" content="video.other"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=../works.html?w={e(w["id"])}"></head><body><a href="../works.html?w={e(w["id"])}">{e(w["title"])}</a><script>location.replace('../works.html?w={e(w["id"])}')</script></body></html>''', encoding='utf-8')
urls = ['', 'works.html', 'tools.html', 'resume.html'] + [f"w/{w['id']}.html" for w in W if has_media(w)]
(OUT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{SITE}{u}</loc></url>' for u in urls) + '</urlset>\n', encoding='utf-8')
(OUT/'robots.txt').write_text(f'User-agent: *\nDisallow: /pf/edit.html\nSitemap: {SITE}sitemap.xml\n', encoding='utf-8')
(OUT/'404.html').write_text(head('페이지를 찾을 수 없음 — Hansy', '김한결 포트폴리오', '404.html').replace('href="css/site.css"', 'href="/pf/css/site.css"') + f'''<body{BODY_ATTR}><main><div class="wrap sec"><h1 class="pg-h">페이지를 찾을 수 없습니다</h1><p><a class="btn" href="/pf/">홈으로</a></p></div></main></body></html>''', encoding='utf-8')
def files(w):
    m = w.get('media') or {}
    yield poster(w)
    for v in m.get('videos') or []: yield v.get('hd'); yield v.get('sd')
    for i in m.get('images') or []: yield i.get('src')
    yield m.get('demo')
missing = [(w['id'], p) for w in W for p in files(w) if p and not str(p).startswith('http') and not (OUT/p).exists()]
print('built', len(W), 'works; media-less:', [w['id'] for w in W if not has_media(w)], '; missing files:', missing[:10])
