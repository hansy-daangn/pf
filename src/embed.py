"""배포 직전(GitHub Actions)에 실행: 페이지에 박힌 데이터(#pf-data)·디자인 속성·모바일 viewport를 최신 data/*.json으로 갈아 끼움.
편집기(/edit, /design)는 data/*.json만 커밋하므로, 이 단계가 없으면 페이지가 옛 데이터로 먼저 그려졌다가 다시 그려짐(깜빡임).
표준 라이브러리만 사용. 실패해도 배포는 계속(원래 파일 유지)."""
import json, pathlib, re, sys

R = pathlib.Path(__file__).resolve().parent.parent
try:
    W = json.load(open(R / 'data/works.json', encoding='utf-8'))
    H = json.load(open(R / 'data/home.json', encoding='utf-8'))
    D = json.load(open(R / 'data/design.json', encoding='utf-8'))
    X = json.load(open(R / 'data/derived.json', encoding='utf-8'))
except Exception as e:
    print('embed: 데이터 읽기 실패, 건너뜀', e); sys.exit(0)

M = D.get('modules', {}); P = D.get('pick', {})
rng = lambda k: (M.get(k) or {}).get('type') == 'range'
ATTR = ''.join(f' data-{k}="{v}"' for k, v in P.items() if k in M and not rng(k)) + ' style="' + ''.join(f"--{k}:{v}{M[k].get('unit', '')};" for k, v in P.items() if k in M and rng(k)) + '"'
XP = {k: {kk: vv for kk, vv in v.items() if kk != 'film'} for k, v in X.items()}
def blob(edit): return json.dumps({'works': W, 'home': H, 'design': D, 'derived': X if edit else XP}, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
def vp(edit):   # 공개 페이지 = 데스크톱 화면 축소(폭 mvw), 편집 화면만 폰 폭
    return 'width=device-width,initial-scale=1,viewport-fit=cover' if edit else f"width={P.get('mvw', 1200)}"

n = 0
for f in [*R.glob('*.html'), R / 'edit/index.html']:
    try:
        s = f.read_text(encoding='utf-8')
        if 'id="pf-data"' not in s: continue
        edit = f.parent.name == 'edit'
        s2 = re.sub(r'(<script type="application/json" id="pf-data">).*?(</script>)', lambda m: m.group(1) + blob(edit) + m.group(2), s, count=1, flags=re.S)
        s2 = re.sub(r'<body(?: data-[a-z0-9]+="[^"]*")*(?: style="[^"]*")?', lambda m: '<body' + ATTR, s2, count=1)
        s2 = re.sub(r'<meta name="viewport" content="[^"]*">', f'<meta name="viewport" content="{vp(edit)}">', s2, count=1)
        if s2 != s: f.write_text(s2, encoding='utf-8'); n += 1
    except Exception as e:
        print('embed: 건너뜀', f.name, e)
print(f'embed: {n}개 페이지 갱신')
