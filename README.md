# HANSY — 김한결 포트폴리오 (v2)

https://hansy-daangn.github.io/pf/

- 정적 사이트: `index.html`(홈) · `works.html`(작업 라이브러리) · `tools.html`(도구·자동화) · `resume.html`(이력서) · `about.html`(소개)
- 공통: `css/site.css`(토큰 7개 체계) · `js/site.js`(상영관 플레이어·PiP·필터) · `data/works.json`(단일 데이터)
- `demos/`: Claude 아티팩트를 자체 호스팅한 라이브 데모(상영관 iframe) · `assets/`: 포스터·영상·스크린샷 · `assets/bb/`: 빌보드용 짧은 루프
- `v1/`: 이전 버전(2026-09) 보존본 — 연락처 등 개인정보 제거
- 빌드 소스는 별도 작업 폴더(`pf_site/src/build.py`)에서 생성. 수정은 `data/works.json` → 재빌드.
