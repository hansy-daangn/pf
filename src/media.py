#!/usr/bin/env python3
"""영상 화질 파이프라인 — 원본(마스터) 1개 → 쓰임새별 4개 사본.

  hd      상영관 본편   긴 변 ≤1920 · H.264 CRF 20 · 최대 8Mbps · AAC 160k   (원본이 이미 가벼운 1080p면 재인코딩 없이 복사)
  sd      모바일·절약   긴 변 ≤1280 · CRF 24 · 최대 3Mbps · AAC 128k
  preview 호버 미리보기 긴 변 960 · 6초 · 무음 · CRF 26
  (bb     빌보드 구간   build.py가 hd에서 home.json 순서·구간대로 자동 절단)

원본 위치: masters/ (깃에 올리지 않음, .gitignore) — 환경변수 PF_MASTERS로 바꿀 수 있음
연결표:   data/media_map.json  {작품ID: {"full": 원본파일명, "variants": {규격라벨: 원본파일명}, "preview_at": 초}}
실행:     python src/media.py            → 바뀐 원본만 다시 만들고 works.json 경로·해상도 갱신
          python src/media.py --force    → 전부 다시
"""
import json, os, sys, subprocess, pathlib, hashlib, re
REPO = pathlib.Path(__file__).resolve().parent.parent
MASTERS = pathlib.Path(os.environ.get('PF_MASTERS', REPO / 'masters'))
DATA = REPO / 'data'
FORCE = '--force' in sys.argv
ONLY = [a for a in sys.argv[1:] if not a.startswith('--')]

def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt,bit_rate:format=duration,bit_rate', '-of', 'json', str(p)], capture_output=True, text=True)
    j = json.loads(r.stdout or '{}'); v = next((s for s in j.get('streams', []) if s.get('codec_type') == 'video'), {}); a = any(s.get('codec_type') == 'audio' for s in j.get('streams', []))
    f = j.get('format', {})
    return dict(w=v.get('width', 0), h=v.get('height', 0), codec=v.get('codec_name'), pix=v.get('pix_fmt'), audio=a, dur=float(f.get('duration') or 0), br=int(f.get('bit_rate') or 0))

def scale(long_side, w, h):
    if max(w, h) <= long_side: return 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
    return f'scale={long_side}:-2' if w >= h else f'scale=-2:{long_side}'

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr[-800:])

def slug(name):
    s = re.sub(r'[^A-Za-z0-9_.-]+', '-', pathlib.Path(name).stem).strip('-')
    return (s[:60] or 'v') + '-' + hashlib.md5(name.encode()).hexdigest()[:6]

def stale(out, src): return FORCE or not out.exists() or out.stat().st_mtime < src.stat().st_mtime

def make_hd(src, out, info):
    if not stale(out, src): return 'skip'
    out.parent.mkdir(parents=True, exist_ok=True)
    cap = int(48 * 8 * 1000 / max(info['dur'], 1)) - 170  # kbps — 파일 48MB 이하(GitHub 50MB 경고선)
    mr = max(2500, min(8000, cap))
    light = info['codec'] == 'h264' and info['pix'] == 'yuv420p' and max(info['w'], info['h']) <= 1920 and 0 < info['br'] <= mr * 1000
    if light:
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', str(out)]); return 'copy'
    a = ['-c:a', 'aac', '-b:a', '160k'] if info['audio'] else ['-an']
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-map', '0:v:0', '-map', '0:a:0?', '-vf', scale(1920, info['w'], info['h']), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-maxrate', f'{mr}k', '-bufsize', f'{mr*2}k', '-pix_fmt', 'yuv420p', '-profile:v', 'high', *a, '-movflags', '+faststart', str(out)])
    return 'enc'

def make_sd(src, out, info):
    if not stale(out, src): return 'skip'
    out.parent.mkdir(parents=True, exist_ok=True)
    a = ['-c:a', 'aac', '-b:a', '128k'] if info['audio'] else ['-an']
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-map', '0:v:0', '-map', '0:a:0?', '-vf', scale(1280, info['w'], info['h']), '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-maxrate', '3M', '-bufsize', '6M', '-pix_fmt', 'yuv420p', *a, '-movflags', '+faststart', str(out)])
    return 'enc'

def make_preview(src, out, info, at):
    if not stale(out, src): return 'skip'
    out.parent.mkdir(parents=True, exist_ok=True)
    ss = max(0.0, min(at, max(0.0, info['dur'] - 6)))
    run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{ss:.2f}', '-t', '6', '-i', str(src), '-an', '-vf', scale(960, info['w'], info['h']), '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)])
    return 'enc'

def main():
    mp = json.load(open(DATA / 'media_map.json'))
    W = json.load(open(DATA / 'works.json')); BY = {w['id']: w for w in W}
    done = {}; log = []
    for wid, spec in mp.items():
        if wid.startswith('_') or (ONLY and wid not in ONLY): continue
        w = BY.get(wid)
        if not w: log.append(f'{wid}: works.json에 없음'); continue
        m = w.setdefault('media', {})
        def tier(name):
            src = MASTERS / name
            if not src.exists(): log.append(f'{wid}: 원본 없음 {name}'); return None
            if name in done: return done[name]
            info = probe(src); sl = slug(name)
            hd = REPO / 'assets' / 'hd' / f'{sl}.mp4'; sd = REPO / 'assets' / 'sd' / f'{sl}.mp4'
            r1 = make_hd(src, hd, info); r2 = make_sd(src, sd, info)
            hi = probe(hd)
            done[name] = dict(src=str(hd.relative_to(REPO)), sd=str(sd.relative_to(REPO)), w=hi['w'], h=hi['h'], dur=round(hi['dur'], 1), master=src)
            log.append(f'{wid}: {name} → hd {hi["w"]}x{hi["h"]} ({r1}, {hd.stat().st_size // 1_000_000}MB) · sd ({r2}, {sd.stat().st_size // 1_000_000}MB)')
            return done[name]
        full = tier(spec['full']) if spec.get('full') else None
        if full:
            m['full'] = full['src']; m['sd'] = full['sd']
            if not w.get('dur') or w.get('dur_auto'): w['dur'] = f"{round(full['dur'])}초"; w['dur_auto'] = True
            pv = REPO / 'assets' / 'video' / f'{wid}.mp4'
            at = spec.get('preview_at', round(full['dur'] * 0.15, 1))
            r3 = make_preview(full['master'], pv, probe(full['master']), at)
            m['preview'] = str(pv.relative_to(REPO)); log.append(f'{wid}: preview ({r3})')
        vmap = spec.get('variants') or {}
        if vmap:
            olds = m.get('variants') or []; byl = {v.get('label'): v for v in olds}; out = []
            for label, name in vmap.items():
                t = tier(name)
                if not t: continue
                v = dict(byl.get(label) or {}); v.update(label=label, src=t['src'], sd=t['sd'], w=t['w'], h=t['h']); out.append(v)
            imgs = [v for v in olds if not str(v.get('src', '')).lower().endswith(('.mp4', '.webm', '.mov'))]
            m['variants'] = out + imgs
    json.dump(W, open(DATA / 'works.json', 'w'), ensure_ascii=False, indent=1)
    print('\n'.join(log))

if __name__ == '__main__':
    main()
