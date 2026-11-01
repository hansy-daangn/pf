# HANSY — 김한결 포트폴리오 (v2)

https://hansy-daangn.github.io/pf/

- 정적 사이트: `index.html`(홈) · `works.html`(작업) · `tools.html`(도구·자동화 — 바로 써보는 체험판) · `resume.html`(이력서)
- 공통: `css/site.css`(토큰 7개 체계) · `js/site.js`(상영관 플레이어·PiP·필터) · `data/works.json`(단일 데이터)
- `demos/`: Claude 아티팩트를 자체 호스팅한 라이브 데모(상영관 iframe) · `assets/`: 포스터·영상·스크린샷 · `assets/bb/`: 빌보드용 짧은 루프
- `v1/`: 이전 버전(2026-09) 보존본 — 연락처 등 개인정보 제거
- **편집기**: `python src/edit_server.py` 실행 후 http://localhost:8800/edit.html — 제목·부제·종류·우선 순서·분류·숨김, 영상 스크럽으로 썸네일 지정(일시정지 상태에서 프레임 선택 → 바로 `assets/poster/<id>.jpg` 저장), 홈 구성(home.json) 편집, 「빌드」 버튼. 서버 없이 `edit.html`을 사이트에서 열면 내려받기 모드.
- 홈 구성은 `data/home.json`(상단 슬라이드·대표작·행), 썸네일은 `assets/poster/<id>.jpg` 교체 — 규칙은 `docs/맥락.md` §4a
- 빌드: `python3 src/build.py` (`data/works.json`·`data/resume.json` → HTML, `src/site.css`·`site.js` 복사). 데모 수치 마스킹: `python3 src/mask_demo.py <slug> <profile>`.
- 제작 맥락·토큰·규칙: `docs/맥락.md`
