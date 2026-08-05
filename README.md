# 김한결 (HANSY) — 영상 디자이너 포트폴리오

빌드 없는 정적 사이트. `index.html`만 열면 그대로 동작합니다.

- 기본 — https://hansy-daangn.github.io/pf/
- 네이버 제출용 (연락처·이메일 제외) — https://hansy-daangn.github.io/pf/naver.html

```
index.html / naver.html   사이트 전체 (HTML·CSS·JS 인라인)
content.json              모든 텍스트 (편집 모드가 여기에 커밋, 두 페이지 공유)
creatives.json            갤러리 소재 데이터
assets/                   영상 · 포스터 · 도식
docs/                     문서 — 시작은 docs/00-인덱스.md
```

`main`에 푸시하면 GitHub Actions가 Pages로 자동 배포합니다.

`index.html` 구조를 고치면 `naver.html`에도 같은 수정이 필요합니다. 문구만 고치는 경우엔 `content.json` 하나로 양쪽에 반영됩니다.
