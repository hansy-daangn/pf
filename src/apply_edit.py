#!/usr/bin/env python3
"""편집기(edit.html)의 「변경 내용 복사」 결과를 반영 — python3 src/apply_edit.py <붙여넣은 텍스트 파일>

  works.<id>.<필드>  → data/works.json  (점 표기: copy.one · media.billboard · media.start …, null = 삭제)
  works.<id>.thumb   → {video: 번호, t: 초} 그 영상의 1080p에서 프레임 추출
                       16:9 영상이면 assets/poster/<id>_w.jpg(16:9 카드용, media.poster_w)
                       그 외 비율이면 assets/poster/<id>.jpg(media.poster)
  home.<billboard|rep|rows> → data/home.json
반영 후 빌드까지 실행.
"""
import json, re, sys, pathlib, subprocess
REPO = pathlib.Path(__file__).resolve().parent.parent

def patch_from(text):
    m = re.search(r'```pf-edit\s*(\{.*?\})\s*```', text, re.S) or re.search(r'(\{"(?:works|home)".*\})', text, re.S)
    if not m: sys.exit('pf-edit 블록을 찾지 못함')
    return json.loads(m.group(1))

def setp(o, key, v):
    ks = key.split('.')
    for k in ks[:-1]: o = o.setdefault(k, {})
    if v is None: o.pop(ks[-1], None)
    else: o[ks[-1]] = v

def main():
    P = patch_from(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8') if len(sys.argv) > 1 else sys.stdin.read())
    wf, hf = REPO / 'data/works.json', REPO / 'data/home.json'
    W = json.loads(wf.read_text(encoding='utf-8')); H = json.loads(hf.read_text(encoding='utf-8')); BY = {w['id']: w for w in W}
    log = []
    for wid, ch in (P.get('works') or {}).items():
        w = BY.get(wid)
        if not w: log.append(f'{wid}: 없음'); continue
        for k, v in ch.items():
            if k == 'thumb':
                vs = (w.get('media') or {}).get('videos') or []; vd = vs[int(v['video'])]; t = float(v['t'])
                wide = abs(vd['w'] / vd['h'] - 16 / 9) < .04
                rel = f"assets/poster/{wid}{'_w' if wide else ''}.jpg"
                r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t}', '-i', str(REPO / vd['hd']), '-frames:v', '1', '-q:v', '2', str(REPO / rel)], capture_output=True, text=True)
                if r.returncode: log.append(f'{wid}: 썸네일 실패 {r.stderr[-200:]}'); continue
                w['media']['poster_w' if wide else 'poster'] = rel; log.append(f'{wid}: 썸네일 {vd.get("label")} {t}초 → {rel}')
            else:
                setp(w, k, v); log.append(f'{wid}: {k} = {v}')
    for k, v in (P.get('home') or {}).items():
        H[k] = v; log.append(f'home.{k} 변경')
    wf.write_text(json.dumps(W, ensure_ascii=False, indent=1), encoding='utf-8'); hf.write_text(json.dumps(H, ensure_ascii=False, indent=1), encoding='utf-8')
    print('\n'.join(log))
    subprocess.run([sys.executable, str(REPO / 'src/build.py')], check=True)

if __name__ == '__main__':
    main()
