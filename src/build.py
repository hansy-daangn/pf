# -*- coding: utf-8 -*-
"""HANSY portfolio — static build. data/*.json → /home/claude/pf/*.html"""
import json, html, pathlib, shutil, datetime, re
import os
REPO = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(os.environ.get('PF_SRC', REPO / 'src')); DATA = pathlib.Path(os.environ.get('PF_DATA', REPO / 'data')); OUT = pathlib.Path(os.environ.get('PF_OUT', REPO))
W = json.load(open(DATA/'works.json')); R = json.load(open(DATA/'resume.json'))
W = [w for w in W if w.get('grade', 3) <= 2]
W.sort(key=lambda w: (w.get('grade', 2), w.get('sort', 99)))
BY = {w['id']: w for w in W}
def e(s): return html.escape(str(s if s is not None else ''))
def nb(s): return ' '.join(f'<span class="nb">{e(x)}</span>' for x in str(s).split(' '))
GROUPS = {'performance': '퍼포먼스 소재', 'tools': '도구 · 자동화', 'ai': 'AI 생성', 'research': '기획 · 리서치', 'personal': '개인 작업'}
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
    tabs = [('index.html', '홈'), ('works.html', '작업'), ('tools.html', '도구 · 자동화'), ('resume.html', '이력서'), ('about.html', '소개')]
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
    img = f'<img src="{e(p)}" alt="" loading="lazy" width="600" height="{hgt}">' if p else f'<span class="pt">{e(w.get("year",""))}</span>'
    live = ' ↗' if (w.get('links') or {}).get('live') else ''
    return f'<a class="card {cls}{ui}" href="?w={e(w["id"])}" data-id="{e(w["id"])}"><div class="art{"" if p else " ph"}" data-info="{e((w.get("copy") or {}).get("one",""))}">{img}<span class="pl" aria-hidden="true">{ico("play","sm")}</span></div><div class="t">{e(w["title"])}</div><div class="s">{e(w.get("subtitle",""))}{live}</div></a>'
def row(title, items, cls=None, more='works.html'):
    items = [w for w in items if has_media(w)]
    if not items: return ''
    if cls is None:
        # 규격 통일: 행 안의 다수 방향으로 맞춘다(행은 균일해야 함)
        tall = sum(1 for w in items if orient(w) == 'tall'); cls = 'tall' if tall > len(items) / 2 else 'wide'
    return f'''<section class="row" data-queue><div class="wrap hd"><h2>{e(title)}</h2>{f'<a href="{more}">전체 보기 ›</a>' if more else ''}</div>
<div class="wrap"><div class="trk"><div class="ar l"><button aria-label="왼쪽으로">{ico("chev-l")}</button></div><div class="sc">{''.join(card(w, cls) for w in items)}</div><div class="ar r"><button aria-label="오른쪽으로">{ico("chev-r")}</button></div></div></div></section>'''

WHO = '김한결 — 모션·3D로 광고 영상을 만들고, 성과를 읽는 도구까지 직접 만드는 디자이너'
def home():
    feat = sorted([w for w in W if w.get('featured') and has_media(w)], key=lambda w: w.get('feat_order', 99))[:6]
    slides = []
    for i, w in enumerate(feat):
        m = w.get('media') or {}; bb = m.get('billboard') or {}
        p = bb.get('poster') or m.get('poster16') or poster(w); pv = bb.get('src') if is_video(bb.get('src')) else None
        if bb: portrait = (bb.get('w') or 16) / (bb.get('h') or 9) < 1.3
        else: fmts = w.get('formats') or []; portrait = bool(fmts) and fmts[0] in ('9:16', '1:1', '4:5')
        loop = bb.get('loop') or [0, 8]
        src_attr = f'src="{e(p)}" fetchpriority="high"' if i == 0 else f'data-src="{e(p)}" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" loading="lazy"'
        blur = (f'<div class="blur" style="background-image:url({e(p)})"></div>' if i == 0 else f'<div class="blur" data-bg="{e(p)}"></div>') if portrait else ''
        art = f'<div class="art{" portrait" if portrait else ""}">{blur}<img {src_attr} alt="" width="1920" height="1080">' + (f'<video muted loop playsinline preload="none" data-src="{e(pv)}" data-loop="{loop[0]},{loop[1]}" poster="{e(p)}" aria-hidden="true"></video>' if pv else '') + '</div>'
        c = w.get('copy') or {}
        slides.append(f'''<div class="slide{" on" if i==0 else ""}" data-id="{e(w["id"])}" aria-hidden="{"false" if i==0 else "true"}"{"" if i==0 else " inert"}>{art}<div class="veil"></div>
<div class="tx"><div class="wrap in"><div>{f'<p class="who">{e(WHO)}</p>' if i==0 else ''}<div class="k">{e(GROUPS.get(w["group"],""))} · {e(w.get("year",""))}</div><h1>{nb(w["title"])}</h1><p class="one">{e(c.get("one",""))}</p>
<div class="bt"><button class="btn" data-open="{e(w["id"])}">{ico("play","sm")} 재생</button><button class="btn ghost" data-open="{e(w["id"])}">상세</button></div></div>
<div class="dots" role="tablist" aria-label="피처드 전환">{''.join(f'<button data-i="{j}" class="{"on" if j==i else ""}" aria-label="{j+1}번째 작품"></button>' for j in range(len(feat)))}<button class="pp" aria-label="미리보기 일시정지">{ico("pause","sm")}</button><button class="snd" aria-label="소리 켜기" hidden>{ico("mute","sm")}</button></div></div></div></div>''')
    rep_ids = ['td_review2605', 'td_declutter', 'cr_10y', 'top3_subliminal', 'creativereporter', 'previz-studio', 'mg_bizreview', 'karrotfield']
    rep = [BY[i] for i in rep_ids if i in BY]
    perf = [w for w in W if w['group'] == 'performance' and w['id'] not in rep_ids]
    perf_t = [w for w in perf if orient(w) == 'tall']; perf_w = [w for w in perf if orient(w) != 'tall']
    personal = [w for w in W if w['group'] == 'personal' and w['id'] not in rep_ids]
    tools = [w for w in W if w['group'] == 'tools' and w['id'] not in rep_ids]
    ai = [w for w in W if w['group'] == 'ai']
    research = [w for w in W if w['group'] == 'research']
    body = f'''<body class="home" data-base="./">{nav('index.html')}<main>
<section class="bb" aria-label="피처드 작업"><div class="frame">{''.join(slides)}</div></section>
{row('대표 작업', rep, 'wide')}
{row('퍼포먼스 소재 · 세로', perf_t, 'tall')}
{row('퍼포먼스 소재 · 가로', perf_w, 'wide')}
{row('개인 작업', personal, 'wide')}
{row('도구 · 자동화', tools, 'wide', 'tools.html')}
{row('AI 생성', ai, 'wide')}
{row('기획 · 리서치', research, 'wide')}
</main>{foot()}{tail()}'''
    return head('Hansy — 김한결 · 모션 · 3D · AI · 도구', WHO, '', poster(feat[0]) if feat else None) + body

def works():
    items = W
    def cnt(f):
        d = {}
        for w in items:
            vals = w.get(f) if isinstance(w.get(f), list) else [w.get(f)]
            for v in vals or []:
                if v: d[v] = d.get(v, 0) + 1
        return d
    g = cnt('group'); yr = cnt('year')
    ch = {}
    for w in items:
        if w['group'] in ('performance', 'ai'):
            for v in w.get('channels') or []: ch[v] = ch.get(v, 0) + 1
    rail = '<aside class="rail" aria-label="필터"><h4>그룹</h4>' + f'<button data-f="group" aria-pressed="true">전체 <small>{len(items)}</small></button>' + ''.join(f'<button data-f="group" data-v="{k}">{GROUPS[k]} <small>{g[k]}</small></button>' for k in GROUPS if k in g)
    rail += '<h4>매체</h4>' + ''.join(f'<button data-f="channel" data-v="{e(k)}">{e(k)} <small>{v}</small></button>' for k, v in sorted(ch.items(), key=lambda x: -x[1]))
    rail += '<h4>연도</h4>' + ''.join(f'<button data-f="year" data-v="{k}">{k} <small>{v}</small></button>' for k, v in sorted(yr.items(), key=lambda x: -int(x[0]))) + '</aside>'
    grid = ''.join(card(w) for w in items if has_media(w))
    body = f'''<body data-base="./">{nav('works.html')}<main><div class="wrap sec"><h1 class="pg-h">작업</h1>
<div class="lib">{rail}<div data-queue><div class="tb"><span class="cnt">{sum(1 for w in items if has_media(w))}건</span><span style="display:flex;gap:var(--s1)"><span class="seg" data-k="sort"><button data-v="rec" aria-pressed="true">추천순</button><button data-v="new" aria-pressed="false">최신순</button></span><span class="seg" data-k="view"><button data-v="grid" aria-pressed="true">그리드</button><button data-v="list" aria-pressed="false">목록</button></span></span></div>
<div class="grid">{grid}</div><div class="list" hidden></div></div></div></div></main>{foot()}{tail()}'''
    return head('작업 — Hansy', '김한결의 전체 작업: 퍼포먼스 소재, 도구·자동화, AI 생성, 기획·리서치, 개인 작업.', 'works.html') + body

def tools():
    ts = [w for w in W if w['group'] == 'tools']
    blocks = []
    for w in ts:
        c = w.get('copy') or {}; p = poster(w); l = w.get('links') or {}
        dl = ''.join(f'<dt>{k}</dt><dd>{e(v)}</dd>' for k, v in [('문제', c.get('problem')), ('결정', c.get('decision')), ('결과', c.get('result'))] if v)
        links = ''.join(f'<a class="btn ghost sm" href="{e(u)}" target="_blank" rel="noopener">{t} ↗</a>' for t, u in [('라이브', l.get('live')), ('GitHub', l.get('github')), ('원본', l.get('artifact'))] if u)
        label = '라이브로 보기' if l.get('live') else ('데모 보기' if l.get('embed') else '크게 보기')
        fit = ' fit' if ('/lab/' in p or '/fig/' in p) else ''
        shot = f'<div class="shot{fit}" data-id="{e(w["id"])}" role="button" tabindex="0" aria-label="{e(w["title"])} 열기"><img src="{e(p)}" alt="" loading="lazy" width="1280" height="800"><span class="pl">{label}</span></div>' if p else ''
        blocks.append(f'''<article class="tool{'' if p else ' noshot'}" id="{e(w["id"])}">{shot}
<div><div class="k">{e(w.get("subtitle",""))}</div><h2>{e(w["title"])}</h2><p class="one">{e(c.get("one",""))}</p><dl>{dl}</dl><div class="lk">{links}</div></div></article>''')
    body = f'''<body data-base="./">{nav('tools.html')}<main><div class="wrap sec"><h1 class="pg-h">도구 · 자동화</h1><div data-queue>{''.join(blocks)}</div></div></main>{foot()}{tail()}'''
    return head('도구 · 자동화 — Hansy', '김한결이 직접 만든 업무 도구: CreativeReporter, CreativeNamer, KarrotField, 3D 구도실 등.', 'tools.html') + body

def ym(s):
    s = str(s or '').strip()
    s = re.sub(r'(\d{4})-(\d{2})-\d{2}', r'\1.\2', s); s = re.sub(r'(\d{4})-(\d{2})', r'\1.\2', s)
    return s
def resume():
    def tbl(rows): return '<table>' + ''.join(rows) + '</table>'
    edu = [x for x in R.get('education', []) if '고등학교' not in x.get('school', '')]
    edu_t = tbl(f'<tr><td class="d">{e(ym(x["period"]))}</td><td><b>{e(x["school"])}</b><small>{e(x.get("major",""))}</small></td></tr>' for x in edu)
    car = tbl(f'<tr><td class="d">{e(ym(x["period"]))}</td><td><b>{e(x["org"])} · {e(x["title"])}</b><small>{e(x.get("desc",""))}</small></td></tr>' for x in R.get('career', []))
    PRIMARY = {'2D': 2, '3D': 2, 'AI': 1, '개발·데이터': 2}
    def skl(k, v):
        if not isinstance(v, list): return e(v)
        n = PRIMARY.get(k, 0); return ' · '.join((f'<b>{e(x)}</b>' if i < n else e(x)) for i, x in enumerate(v))
    sk = tbl(f'<tr><td class="k">{e(k)}</td><td>{skl(k, v)}</td></tr>' for k, v in (R.get('skills') or {}).items())
    aw = R.get('awards', [])
    uni = [a for a in aw if a.get('date', '') >= '2019-03']; hs = [a for a in aw if a.get('date', '') < '2019-03']
    def awrow(a): return f'<tr><td class="d">{e(ym(a.get("date","")))}</td><td><b>{e(a.get("name",""))}</b> — {e(a.get("prize",""))}<small>{e(a.get("field",""))} · {e(a.get("role",""))} · {e(a.get("host",""))}</small></td></tr>'
    awards = f'<h3>수상 {len(aw)}건 — 대학 이후 {len(uni)}건 · 고교 {len(hs)}건</h3><table>' + ''.join(awrow(a) for a in uni) + '</table>' + (f'<details><summary>고교 시절 {len(hs)}건 펼치기 ›</summary><table>' + ''.join(awrow(a) for a in hs) + '</table></details>' if hs else '')
    papers = ''.join(f'<tr><td class="d">{e(p.get("year",""))}</td><td><b>{e(p.get("title",""))}</b><small>{e(p.get("role",""))} · {e(p.get("venue",""))} · {e(p.get("award",""))}</small><small>{e(p.get("summary",""))}</small></td></tr>' for p in R.get('papers', []))
    summary = ' '.join(R['summary']) if isinstance(R.get('summary'), list) else R.get('summary', '')
    body = f'''<body data-base="./">{nav('resume.html')}<main><div class="wrap sec"><h1 class="pg-h">이력서</h1>
<div class="cv"><div><div class="idc"><img src="assets/img/profile.jpg" alt="김한결" width="104" height="136"><div><div class="nm">{e(R["name"])}</div><div class="jb">{e(R.get("title",""))}</div><div class="em"><a href="mailto:{e(EMAIL)}">{e(EMAIL)}</a></div><div class="base">{e(R.get("base_line","병역 육군 병장 만기전역 · 입사 가능 시기 협의 후 즉시"))}</div></div></div>
<p class="tag">{e(R.get("tagline",""))}</p><p class="ds">{e(summary)}</p>
<div class="bts"><button class="btn sm" data-print>PDF ↓</button><a class="btn ghost sm" href="works.html">작업 보기</a><a class="btn ghost sm" href="https://github.com/hansy-daangn" target="_blank" rel="noopener">GitHub ↗</a><button class="btn ghost sm" data-copy="{e(EMAIL)}">메일 주소 복사</button></div>
<h3>기술</h3>{sk}</div>
<div><div class="two"><div><h3>경력</h3>{car}</div><div><h3>학력</h3>{edu_t}</div></div>
{awards}
{f'<h3>논문</h3><table>{papers}</table>' if papers else ''}
</div></div></div></main>{foot()}{tail()}'''
    return head('이력서 — 김한결 Hansy', '김한결(Hansy) 이력서 — 경력, 학력, 기술, 수상, 논문.', 'resume.html') + body

def about():
    A = R.get('about') or {}
    paras = A.get('paragraphs') or (R['summary'] if isinstance(R.get('summary'), list) else [R.get('summary', '')])
    steps = A.get('process') or ['브리프·레퍼런스 — 목적과 톤을 정하고 실제 매장·인물·영상에서 구도와 말투를 모읍니다', '구도·보드 — 필요하면 3D 구도실에서 카메라 높이·렌즈·동선을 먼저 잡습니다', '제작 — 모션·3D·AI 생성 중 메시지에 맞는 방법으로 만듭니다', '규격 세트 — 가로·세로·정방과 배너까지 한 비주얼로 변형합니다', '집행·측정 — CreativeReporter로 매체별 성과를 매주 읽습니다', '재사용 — 잘 된 구조를 템플릿으로 굳혀 다음 소재에 씁니다']
    body = f'''<body data-base="./">{nav('about.html')}<main><div class="wrap sec"><h1 class="pg-h">소개</h1>
<div class="about"><div>{''.join(f'<p>{e(p)}</p>' for p in paras)}
<h3>작업 방식</h3><ol>{''.join(f'<li><span>{e(s)}</span></li>' for s in steps)}</ol>
<div class="bts"><button class="btn sm" data-copy="{e(EMAIL)}">메일 주소 복사</button><a class="btn ghost sm" href="https://github.com/hansy-daangn" target="_blank" rel="noopener">GitHub ↗</a><a class="btn ghost sm" href="resume.html">이력서</a></div></div>
<div><img src="assets/img/profile.jpg" alt="김한결" width="700" height="1050"></div></div></div></main>{foot()}{tail()}'''
    return head('소개 — Hansy', '김한결(Hansy) 소개 — 모션·3D·AI 생성·도구를 함께 다루는 마케팅 디자이너.', 'about.html') + body

(OUT/'css').mkdir(exist_ok=True); (OUT/'js').mkdir(exist_ok=True); (OUT/'data').mkdir(exist_ok=True)
shutil.copy(SRC/'site.css', OUT/'css/site.css'); shutil.copy(SRC/'site.js', OUT/'js/site.js')
json.dump(W, open(OUT/'data/works.json', 'w'), ensure_ascii=False, indent=1)
for name, fn in [('index.html', home), ('works.html', works), ('tools.html', tools), ('resume.html', resume), ('about.html', about)]:
    (OUT/name).write_text(fn(), encoding='utf-8')
(OUT/'.nojekyll').write_text('')
missing = [(w['id'], p) for w in W for p in [poster(w), (w.get('media') or {}).get('preview'), (w.get('media') or {}).get('full'), ((w.get('media') or {}).get('billboard') or {}).get('src')] + [v.get('src') for v in (w.get('media') or {}).get('variants', [])] if p and not str(p).startswith('http') and not (OUT/p).exists()]
print('built', len(W), 'works; media-less:', [w['id'] for w in W if not has_media(w)], '; missing files:', missing[:10])
