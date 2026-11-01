#!/usr/bin/env python3
"""포트폴리오 편집 서버 — 브라우저 편집기(edit.html)의 저장 요청을 받아 파일에 바로 씁니다.

실행:  python src/edit_server.py        → http://localhost:8800/edit.html
저장:  data/works.json · data/home.json · assets/poster/<id>.jpg (썸네일)
빌드:  편집기의 「빌드」 버튼 = python src/build.py 실행 (끝나면 커밋·푸시만 하면 됨)
"""
import json, base64, pathlib, subprocess, sys, http.server, socketserver, urllib.parse
REPO = pathlib.Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8800

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(REPO), **k)
    def log_message(self, f, *a): pass
    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode(); self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        if self.path.startswith('/api/ping'): return self._json(200, {'ok': True, 'repo': str(REPO)})
        return super().do_GET()
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0); body = json.loads(self.rfile.read(n) or b'{}')
        p = urllib.parse.urlparse(self.path).path
        try:
            if p == '/api/save':
                for name in ('works', 'home'):
                    if name in body:
                        f = REPO / 'data' / f'{name}.json'; bak = REPO / 'data' / f'{name}.backup.json'
                        if f.exists(): bak.write_bytes(f.read_bytes())
                        f.write_text(json.dumps(body[name], ensure_ascii=False, indent=1), encoding='utf-8')
                return self._json(200, {'ok': True})
            if p == '/api/poster':
                wid = body['id']; data = body['data'].split(',', 1)[1]
                if not wid.replace('-', '').replace('_', '').isalnum(): return self._json(400, {'ok': False, 'err': 'bad id'})
                out = REPO / 'assets' / 'poster' / f'{wid}.jpg'; out.parent.mkdir(exist_ok=True)
                out.write_bytes(base64.b64decode(data))
                p16 = REPO / 'assets' / 'poster16' / f'{wid}.jpg'
                if p16.exists(): p16.unlink()
                return self._json(200, {'ok': True, 'path': f'assets/poster/{wid}.jpg'})
            if p == '/api/build':
                r = subprocess.run([sys.executable, str(REPO / 'src' / 'build.py')], capture_output=True, text=True, cwd=str(REPO))
                return self._json(200, {'ok': r.returncode == 0, 'out': (r.stdout + r.stderr)[-2000:]})
            return self._json(404, {'ok': False})
        except Exception as ex:
            return self._json(500, {'ok': False, 'err': str(ex)})

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), H) as srv:
    print(f'편집기: http://localhost:{PORT}/edit.html  (Ctrl+C로 종료)')
    srv.serve_forever()
