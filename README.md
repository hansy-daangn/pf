# 김한결 (HANSY) — 영상 디자이너 포트폴리오

당근(Karrot) 퍼포먼스 마케팅 영상 디자이너 김한결의 포트폴리오 사이트.
**AI · 3D · 모션그래픽 · 숏폼** 네 분야의 큐레이션 작업과 베스트 3을 보여줍니다.

순수 정적 사이트(빌드 도구·의존성 없음)라서, `index.html`만 열면 바로 동작합니다.

```
.
├─ index.html              # 사이트 전체 (HTML/CSS/JS 인라인)
├─ assets/
│  ├─ video/               # 웹 최적화 미리보기 루프 + 히어로 릴 + 본편(featured)
│  └─ poster/              # 각 작업의 포스터 이미지(JPG)
├─ .github/workflows/deploy.yml   # GitHub Pages 자동 배포
└─ .nojekyll
```

전체 미디어 용량 약 25MB로, GitHub Pages에 그대로 올려도 가볍습니다.

---

## 배포 방법 (hansy-daangn/pf)

> 푸시(인증)는 본인 계정으로 직접 하시면 됩니다. 아래 명령만 실행하세요.

**1) 이 폴더에서 git 초기화 후 푸시**

```bash
cd "영상디자이너포트폴리오_202606"      # 이 폴더
git init
git add .
git commit -m "feat: HANSY video designer portfolio"
git branch -M main
git remote add origin https://github.com/hansy-daangn/pf.git
git push -u origin main
```

**2) GitHub Pages 켜기** — 레포 → **Settings → Pages → Build and deployment → Source: `GitHub Actions`**
한 번만 선택하면, 포함된 워크플로(`.github/workflows/deploy.yml`)가 푸시할 때마다 자동 배포합니다.

배포 주소: **https://hansy-daangn.github.io/pf/**

> 대안: Source를 `Deploy from a branch → main / (root)`로 선택해도 됩니다(`.nojekyll` 포함되어 그대로 서빙됩니다).

---

## 직접 채워 넣을 부분 (선택)

- `index.html` 하단 **소셜 링크**(Behance / Instagram / YouTube / Vimeo) `href="#"` → 본인 채널 주소로 교체
- **About 수상 내역** 문구 — 이력서 기준으로 정리해 두었습니다. 정확한 공모전 명칭만 다듬으면 됩니다 (`<!-- 주석 -->` 표시 위치)
- 더 보여주고 싶은 작업이 있으면 `index.html`의 `WORKS` 배열에 항목을 추가하고, 영상/포스터를 `assets/`에 넣으면 됩니다.

---

## 작업 노트

- 원본 영상 178편 → 캠페인 단위로 그룹화 → 4개 분야로 분류 → 큐레이션(17작업, 베스트 3 하이라이트).
- 모든 영상은 자동재생 무음 루프용으로 트랜스코딩(H.264, 화면 안에 들어올 때만 재생 — 성능 최적화).
- 폰트 Pretendard, 컬러는 당근 오렌지(#ff6f0f) 액센트 + 시네마틱 다크 테마.
