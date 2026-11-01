#!/usr/bin/env python3
"""영상 파일 만들기 — 원본(masters/) 1개 → 2개.

  <id>.mp4     1080p   긴 변 ≤1920 · H.264 CRF 20 · 파일당 48MB 이하   (가벼운 1080p 원본은 그대로 복사)
  <id>.sd.mp4  720p    긴 변 ≤1280 · CRF 24 · 최대 3Mbps               (원본이 720p 이하면 만들지 않음)

  호버 미리보기·빌보드는 별도 파일 없이 이 두 파일을 정해진 초부터 재생한다.

원본 위치: masters/ (깃 제외)
연결표:   data/media_map.json  {작품ID: {"videos": [원본파일명, …]}}  — 순서 = works.json media.videos 순서
실행:     python3 src/media.py [작품ID …] [--force]
"""
import json, os, sys, subprocess, pathlib
REPO = pathlib.Path(__file__).resolve().parent.parent
MASTERS = pathlib.Path(os.environ.get('PF_MASTERS', REPO / 'masters'))
DATA = REPO / 'data'
FORCE = '--force' in sys.argv
ONLY = [a for a in sys.argv[1:] if not a.startswith('--')]
CAP_MB = 48

def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt:format=duration,bit_rate', '-of', 'json', str(p)], capture_output=True, text=True)
    j = json.loads(r.stdout or '{}'); v = next((s for s in j.get('streams', []) if s.get('codec_type') == 'video'), {})
    f = j.get('format', {})
    return dict(w=v.get('width', 0), h=v.get('height', 0), codec=v.get('codec_name'), pix=v.get('pix_fmt'),
                audio=any(s.get('codec_type') == 'audio' for s in j.get('streams', [])), dur=float(f.get('duration') or 0), br=int(f.get('bit_rate') or 0))

def scale(long_side, w, h):
    if max(w, h) <= long_side: return 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
    return f'scale={long_side}:-2' if w >= h else f'scale=-2:{long_side}'

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr[-800:])

def stale(out, src): return FORCE or not out.exists() or out.stat().st_mtime < src.stat().st_mtime

def make(src, out, info, long_side, crf, max_kbps, abr):
    out.parent.mkdir(parents=True, exist_ok=True)
    cap = int(CAP_MB * 8 * 1000 / max(info['dur'], 1)) - abr
    mr = max(1500, min(max_kbps, cap))
    if long_side >= 1920 and info['codec'] == 'h264' and info['pix'] == 'yuv420p' and max(info['w'], info['h']) <= 1920 and 0 < info['br'] <= mr * 1000:
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', '-movflags', '+faststart', str(out)]); return 'copy'
    a = ['-c:a', 'aac', '-b:a', f'{abr}k'] if info['audio'] else ['-an']
    run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-map', '0:v:0', '-map', '0:a:0?', '-vf', scale(long_side, info['w'], info['h']),
         '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf), '-maxrate', f'{mr}k', '-bufsize', f'{mr * 2}k', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
         *a, '-movflags', '+faststart', str(out)])
    return 'enc'

def main():
    mp = json.load(open(DATA / 'media_map.json')); W = json.load(open(DATA / 'works.json')); BY = {w['id']: w for w in W}
    log = []
    for wid, spec in mp.items():
        if wid.startswith('_') or (ONLY and wid not in ONLY): continue
        w = BY.get(wid)
        if not w: log.append(f'{wid}: works.json에 없음'); continue
        vids = (w.setdefault('media', {})).setdefault('videos', [])
        for i, name in enumerate(spec.get('videos') or []):
            if not name: continue
            src = MASTERS / name
            if not src.exists(): log.append(f'{wid}: 원본 없음 {name}'); continue
            while len(vids) <= i: vids.append({'label': '영상'})
            v = vids[i]; stem = wid if i == 0 else f'{wid}-{i + 1}'
            hd = REPO / 'assets' / 'v' / f'{stem}.mp4'; sd = REPO / 'assets' / 'v' / f'{stem}.sd.mp4'
            info = probe(src)
            r1 = make(src, hd, info, 1920, 20, 8000, 160) if stale(hd, src) else 'skip'
            hi = probe(hd); v.update(hd=str(hd.relative_to(REPO)), w=hi['w'], h=hi['h'], dur=round(hi['dur'], 2))
            if min(hi['w'], hi['h']) > 720:
                r2 = make(src, sd, info, 1280, 24, 3000, 128) if stale(sd, src) else 'skip'; v['sd'] = str(sd.relative_to(REPO))
            else:
                r2 = '없음'; v.pop('sd', None); sd.unlink(missing_ok=True)
            log.append(f'{wid}#{i + 1}: {name} → {hi["w"]}x{hi["h"]} ({r1}, {hd.stat().st_size // 1_000_000}MB) · 720p ({r2})')
    json.dump(W, open(DATA / 'works.json', 'w'), ensure_ascii=False, indent=1)
    print('\n'.join(log))

if __name__ == '__main__':
    main()
