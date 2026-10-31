# 영상 플랫폼 UI/UX 차용 브리프 — 디자이너 영상 포트폴리오용 (2026-11-01)

> 결론 한 줄: **"Apple TV 앱의 라이트 캔버스 + Netflix의 행·모달·플레이어 규약 + YouTube의 단축키·미니플레이어"** 세 축을 합치되, 호버 확대·자동 회전·카운트다운 강제 같은 OTT의 유도 장치는 전부 뺀다.
> 표기: `[n]` = F절 URL 번호. **※추정** = 공개 문서에 수치가 없어 관측·업계 관행으로 잡은 권장값. 수치 없는 항목은 그대로 두지 않고 권장값을 적었다.

| 의문 | 절 |
|---|---|
| 무엇을 가져오나 (12개) | A |
| 각 화면의 정확한 수치는 | B (B1 히어로 · B2 행 · B3 상세 · B4 플레이어 · B5 내비 · B6 타이포) |
| 라이트 모드에서 영화 느낌은 어떻게 | C |
| 무엇을 절대 하지 않나 | D |
| 접근성·성능 체크 | E |
| 출처 | F |

---

## A. 차용 패턴 TOP 12

| # | 어디서 | 무엇을 | 스펙 수치 | 왜 |
|---|---|---|---|---|
| 1 | Netflix · Disney+ 홈 [8][9][12] | **포스터 우선 빌보드** — 정지 포스터를 먼저 그리고 무음 영상을 뒤에 깐다 | 16:9, 데스크톱 높이 `clamp(56vh, 56.25vw, 82vh)` · 포스터 즉시 → 영상 **3초 후** 페이드인(400ms) · 루프 **10~15초** · 영상 종료 시 포스터로 400ms 페이드 **※추정** | Disney+도 2025 개편에서 배너를 자동재생 트레일러로 교체하며 "타일·내비는 전경에 유지" [8]. 포스터 선행은 LCP를 지키는 유일한 방법 [1] |
| 2 | Netflix 빌보드 | **CTA 쌍 「재생 / 상세」** | 높이 44~48px · 1차: 채움(흰 or 잉크) · 2차: 반투명(`bg 20% + backdrop-blur 12px`) · 간격 12px · 아이콘+라벨 · 둘 다 같은 radius(8px) **※추정** | 한 화면에 행동이 둘뿐이면 결정 비용이 0에 가깝다. 포폴은 "재생 = 작업 보기", "상세 = 역할·성과" |
| 3 | Apple TV 앱 (macOS/iOS 라이트) [6][7] | **라이트 캔버스 + 다크 프레임** — 흰 배경, 영상은 항상 검은 16:9 프레임 안 | 배경 `#FFFFFF/#FAFAFA` · 프레임 `#0A0A0B` 레터박스 · radius **10~12px** · 그림자 `0 8px 24px rgba(0,0,0,.12)` + `inset 0 0 0 1px rgba(0,0,0,.06)` · 히어로 뒤 아트 블러 `blur(40px) saturate(1.4) opacity .35` **※추정(원칙은 C절)** | 화면 전체가 어둡지 않아도 "영상 안이 어둡다"는 대비만으로 극장감이 난다. 포폴 기본값은 라이트(사용자 규칙) |
| 4 | Apple 아트워크 사양 [5][6] | **16:9 기본 + 2:3 보조 카드 비율 체계** | 16:9 커버 최소 **1920×1080**(권장 3840×2160) · 2:3 포스터 **2000×3000** · 키프레임 타일 **텍스트 금지** · 로고 4320×1300 투명 PNG 중앙 최대 [5] · iOS 26에서 Apple TV 앱이 2:3 세로 아트로 전환 [6] | 영상 작업은 16:9가 정보량이 가장 크고, 세로 소재(9:16)는 16:9 컨테이너 안에 2:3 느낌으로 배치하면 행 높이가 깨지지 않는다 |
| 5 | Netflix · Apple TV 행 | **스냅 스크롤 선반** | 카드 수 **6 / 5 / 4 / 3 / 2** (≥1400 / 1100 / 800 / 500 / 그 미만 px) · gap **16px**(Netflix는 4~8px로 더 촘촘) · 다음 카드 **10% 피크** · `scroll-snap-type: x mandatory; scroll-snap-align: start` [17] · 화살표 폭 48px, 데스크톱 hover 시만 표시 · 행 제목 **20~24px/600** + hover 시 "모두 보기 ›" 노출 **※추정** | 스크롤 스냅은 JS 없이 모바일 스와이프·데스크톱 화살표를 모두 만족 [17]. 카드 수가 고정 단계면 썸네일 크기가 예측 가능 |
| 6 | Netflix 호버 카드(개선판) [13] | **지연 호버 프리뷰 — 확대 없이 제자리 재생** | hover **350~400ms** 후 무음 프리뷰 시작 · `scale ≤ 1.03` · 정보는 카드 아래로 슬라이드(높이 변화 없음) · `@media (pointer: fine)`에서만 · 포커스(키보드)도 동일 트리거 **※추정** | Netflix의 1.5배 확대는 "Remove Netflix's Zoom on Hover" 스크립트가 존재할 만큼 싫어하는 사람이 많다 [13]. 지연을 두면 스쳐 지나갈 때 영상이 켜지지 않는다 |
| 7 | Netflix Top 10 [10] | **넘버드 행 — 진짜 순위일 때만** | 숫자 높이 = 카드 높이 **90%**, 카드 폭의 **35~40%**를 숫자가 점유 · 윤곽선(outline 2px) 숫자 · **5개** 이하 **※추정** | Netflix는 2020-02부터 매일 갱신되는 Top 10 행을 도입 [10]. 포폴에선 CTR·완주율 등 실제 수치 순위가 있는 "대표작 5"에만 쓴다(구조=정보) |
| 8 | Netflix 상세 모달 ↔ Apple TV 상세 페이지 | **카드→모달 상세**(페이지보다 가볍다) | `<dialog>` 폭 `min(880px, 92vw)` · 백드롭 `rgba(0,0,0,.6)` + `blur(8px)` · 상단 16:9 무음 헤더 + 소리 토글 · 칩: 연도·역할·규격·채널·성과 · "에피소드" 자리에 **규격 변형 목록** · "비슷한 작업" 3열 6개 · ESC/X/바깥 클릭 닫기 · `history.pushState('?w=id')` **※추정** | 모달은 탐색 맥락(행 위치)을 유지하고 URL만 바꿔 공유 가능. Apple TV식 풀 페이지는 "뒤로가기" 비용이 있어 20~30작품 포폴엔 과하다 |
| 9 | YouTube · Netflix 플레이어 [14][15][16] | **극장 플레이어 규약** | 컨트롤 자동 숨김 **3초**(커서 포함) · 스크러버 **3px → hover 6px** · 제목 좌상단, 상단 그라데이션 120px · 단축키: `Space/K` 재생, `←→` 5초, `J/L` 10초, `F` 전체, `M` 음소거, `Esc` 나가기, `Shift+N` 다음, `↑↓` 볼륨 5%, `0~9` 구간 점프 · 모바일: 중앙 더블탭 좌우 10초 **※숨김 시간은 추정, 키 배열은 [14][15][16] 공통** | 사용자가 이미 아는 키를 그대로 써야 설명 캡션이 필요 없다(사용자 규칙: 안내 캡션 금지) |
| 10 | Netflix 포스트플레이(2012~) [11][18][19] | **다음 작업 카드 — 카운트다운 없이** | 마지막 **8초**에 우하단 카드 **280×158px**(썸네일+제목+「다음 ▶」) · 자동 넘김은 **없음**(사용자가 첫 작업을 끝까지 본 뒤 "연속 재생" 켰을 때만 8초 카운트) · 버튼 애니메이션 가속 금지 **※추정** | Netflix의 자동 다음화는 deceptive.design 명단에 올라 있고 [18], 가속하는 버튼이 "불안을 만들어 클릭하게 한다"는 비판이 있다 [19]. 포폴은 이어보기를 **제안**만 한다 |
| 11 | YouTube 미니플레이어 + Document PiP API [3][4] | **미니플레이어 / PiP / 복귀** | 1단계 CSS 미니: `position: fixed; width: 320px`(16:9 → 180px) 우하단 inset 20px, radius 12px, 그림자 · 2단계 Document PiP: Chrome/Edge **116+**, `requestWindow({width, height})`는 **사용자 제스처 필수**, 닫힘은 `pagehide`로 감지해 플레이어를 원위치에 append [3] · Safari는 미지원 → `video.requestPictureInPicture()` 네이티브 · 복귀: 원래 카드로 `scrollIntoView` + 같은 `currentTime` 재개 | 스크롤하며 다른 작업을 훑는 동안 재생이 끊기지 않으면 체류가 길어진다. 1단계만으로 모든 브라우저 커버, 2단계는 점진적 향상 |
| 12 | Apple TV 사이드바(tvOS 17.2) · Apple Music 웹 사이드바 · Spotify 라이브러리 [7][20][21] | **반투명 축소 상단바 + 라이브러리 좌측 필터 레일** | 상단바 높이 **64 → 56px**(스크롤 80px 후) · `backdrop-filter: blur(20px)` + 배경 80% 알파 · 탭 **≤5** · 검색 없음 · 우측 끝 = Netflix 프로필 자리에 **「이력·연락」** · 라이브러리: ≥1024px 좌측 레일 **240px**(연도·역할·채널·규격), 모바일은 상단 고정 칩 행 **※추정** | Apple TV는 상단 탭을 사이드바로 옮기며 채널별 전용 페이지를 줬고 [7], Apple Music 웹은 사이드바를 사용자 맞춤 가능하게 둔다 [20]. 필터는 "전수 아카이브"(소재 377건) 페이지에만 필요 |

---

## B. 섹션별 스펙 표

### B1. 히어로 / 빌보드

| 항목 | 관측(플랫폼) | 포폴 권장값 |
|---|---|---|
| 비율·높이 | Netflix/Disney+ 16:9 풀블리드, 모바일은 세로 크롭 [8] | 데스크톱 16:9 `clamp(56vh, 56.25vw, 82vh)` · 모바일 4:5 크롭(안전영역 중앙 60%) |
| 자동재생 | 무음 트레일러, Netflix는 2020-02부터 끄기 옵션 제공 [12] · Disney+는 끄기 여부 미공개 [8] | 포스터 즉시 → **3초 후** 무음 영상 400ms 페이드인 · 10~15초 루프 · 설정 토글 「미리보기 자동재생」 제공 **※추정** |
| 그라데이션 | 다크: 하단 검정 0→100%, 좌측 55% 폭 | 다크: `linear-gradient(to top, bg 0%, transparent 45%)` + 좌측 `to right, bg 0%, transparent 60%` · **라이트: 검정 대신 배경색(흰)으로 같은 공식** + 텍스트 뒤 로컬 스크림 `rgba(0,0,0,.35) blur(24px)` |
| 타이틀 블록 | Apple 사양: 아트 안 텍스트는 제목만, 로고는 중앙 최대 [5] | 디스플레이 = 본문의 **3~5배**(Minh Pham 토큰 `--display: 3rem~9rem` vs `--step-0: 1rem~1.25rem` [2]) · 최대 폭 **44ch / 640px** · 제목 → 한 줄 설명(본문 1.125배) → CTA |
| CTA 쌍 | Netflix 「재생 / 상세 정보」 | 위 A-2 |
| 회전 | OTT는 자동 회전·여러 장 | **자동 회전 없음**(캐러셀 자동 전환은 UX 해악 [22]) · 수동 전환만: 하단 세그먼트 인디케이터(4px 높이, 활성 24px) · hover/포커스 시 전환 정지 |
| 라이트/다크 | Apple TV 앱은 시스템 외관을 따르고 아트가 어둠을 담당 | 라이트 고정(`prefers-color-scheme` 자동 다크 금지 — 사용자 규칙) · 영상 프레임은 항상 다크 |

### B2. 행 / 선반

| 항목 | 관측 | 포폴 권장값 |
|---|---|---|
| 카드 비율 | Apple 16:9 커버·2:3 포스터·키프레임 타일 [5] · Apple TV 앱 2025 2:3 전환 [6] · Apple "My TV" 채널 아이콘은 정사각 [7] | 영상 행 16:9 · 세로 소재 행 9:16(행 높이 = 16:9 카드 높이 ×1.6, 카드 폭 좁게) · 도구·앱 1:1 |
| 카드 폭 단계 | Netflix 웹 6/5/4/3/2 **※관측** | 동일 단계 + 좌우 패딩 `clamp(16px, 4vw, 60px)` |
| 간격 | Netflix 4~8px, Apple 16~24px **※관측** | **16px**(라이트 모드는 간격이 곧 경계) |
| 행 제목 | 20~24px, 좌측 패딩 정렬 | `--step-1`(24~36px) 600 · 우측 "모두 보기 ›" 13px은 hover/포커스 시 opacity 0→1 |
| 스크롤 어포던스 | hover 시 좌우 화살표, 끝단 그라데이션 | 화살표 48×전체높이, 배경 `bg 90%`, `pointer: fine`에서만 · 모바일 네이티브 스크롤 + 10% 피크 · `scroll-snap` [17] · `scrollbar-width: none` |
| 호버 프리뷰 | Netflix: 지연 후 1.5배 확대 카드 + 프리뷰 **※관측** | 350~400ms 지연 → 제자리 무음 재생 · `scale 1.02~1.03` · 포스터→영상 200ms 크로스페이드 · 동시 재생 1개 |
| 넘버드 행 | Netflix Top 10, 2020-02, 매일 갱신 [10] | 장점: 편집적 위계·타이포 임팩트. 단점: 순위 근거 없으면 장식 → 실제 수치 순위 5개에만 |

### B3. 상세 — 모달 vs 페이지

| 항목 | Netflix 모달 **※관측** | Apple TV 상세 페이지 [7] | 포폴 선택 |
|---|---|---|---|
| 진입 | 카드 → 확대 모달, 배경 어둡게 | 전용 페이지, 블러 아트 배경 | **모달**(가볍고 맥락 유지) + 직접 URL 진입 시 같은 모달을 전체 페이지로 렌더 |
| 크기 | ≈850~900px 폭, 세로 스크롤 | 풀 뷰포트 | `min(880px, 92vw)` · 최대 높이 92vh 내부 스크롤 |
| 헤더 | 16:9 무음 영상 + 로고 + 버튼 | 블러 배경 + 메타 | 16:9 무음 영상, 우하단 소리 토글 · 좌하단 제목+CTA 쌍 |
| 메타 | 칩(연도·시즌·HD·태그) | 메타 한 줄 | 칩 12~13px: 연도 · 역할 · 채널(Meta/Google/Moloco) · 규격 · 성과 1개 |
| 목록 | 에피소드 리스트 | 에피소드 선반 | **규격 변형 목록**(9:16·1:1·16:9·배너) — 썸네일 120px + 규격 라벨 + 길이 |
| 추천 | "비슷한 콘텐츠" 3열 | 관련 선반 | "비슷한 작업" 3열 6개(같은 캠페인·같은 채널 우선) |
| 닫기 | X · ESC · 백드롭 | 뒤로 | X(44px) · ESC · 백드롭 · `history.back()` |

### B4. 플레이어

| 항목 | 관측 | 포폴 권장값 |
|---|---|---|
| 자동 숨김 | YouTube·Netflix 약 3초 **※관측** | **3000ms** 무입력 → 컨트롤·커서 숨김, 200ms 페이드 · 마우스 이동·키 입력에 즉시 복귀 |
| 스크러버 | 얇음 → hover 두꺼움 | 3px → 6px · 버퍼 트랙 흰 30% · 진행 = 액센트 · hover 시 시각 썸네일 160×90 **※추정** |
| 제목 위치 | Netflix: 일시정지 시 좌상단 | 좌상단 상시(상단 그라데이션 120px) + 우상단 「다음 ▶」「닫기 ✕」 |
| 단축키 | 플랫폼 공통 키 [14][15][16] | A-9 표 그대로 · `?`로 단축키 시트 |
| 다음 카드 | Netflix 포스트플레이: 크레딧 축소 + 다음화 카운트다운(2012 웹·PS3 도입) [11] | 마지막 8초 우하단 280×158 · 자동 넘김 기본 OFF |
| 이어보기 | 카드 하단 진행 바 | `localStorage` 진행률 · 카드 하단 3px 바 · 90% 이상 시청은 "완료"로 숨김 |
| PiP | YouTube 웹 미니플레이어: 우하단 16:9 **※관측(크기 미공개)** | A-11 (CSS 320px → Document PiP → Safari 네이티브) |
| 복귀 | — | PiP 닫힘(`pagehide`) → 원래 플레이어 컨테이너에 append + 같은 시점 재개 [3] |

### B5. 내비게이션

| 항목 | 관측 | 포폴 권장값 |
|---|---|---|
| 상단바 | Netflix 반투명→스크롤 시 불투명 · Apple TV는 tvOS 17.2에서 상단 탭 → 사이드바 [7] · Disney+는 채널 바를 상단으로 [8] | 64→56px 축소, `blur(20px)`, 하단 1px 헤어라인은 스크롤 후만 |
| 탭 수 | Apple TV 사이드바 상단 고정 3(Apple TV·MLS·iTunes)+채널 [7] | ≤5: 작업 · 소재 아카이브 · 도구 · 실험 · 이력 |
| 검색 | OTT 필수 | **생략**(사용자 요구) → 라이브러리 필터로 대체 |
| 프로필 자리 | Netflix 우측 아바타 | 우측 끝 「이력·연락」 — 아바타 대신 이름 텍스트 버튼 |
| 라이브러리 필터 | Apple Music 웹 사이드바 맞춤 [20] · Spotify 라이브러리 사이드바+필터 칩 [21] | 좌측 레일 240px(≥1024px) · 모바일 상단 고정 칩 · 필터 상태를 URL 쿼리에 |

### B6. 타이포 & 간격

| 항목 | 관측 | 포폴 권장값 |
|---|---|---|
| 서체 | Netflix Sans · Apple SF · 국내 OTT는 Pretendard 계열이 일반적(공식 확인 불가 **※추정**) · 쿠팡플레이는 "넷플릭스 등과 닮은 UI"로 출발 [23] | Pretendard Variable 단일(기존 아이덴티티 유지) |
| 유동 토큰 | Minh Pham(Awwwards SOTD): `--step-0: 1~1.25rem`, `--step-1: 1.5~2.25rem`, `--display: 3~9rem`, `--gutter: 1.25~3rem` [2] | 그대로 차용. 본문 16px 고정 |
| 카드·메타 | 카드 제목 14~15px/500 · 메타 12~13px/400 60% 잉크 | 동일. 숫자는 `tabular-nums` |
| 자간·행간 | 디스플레이 −0.02~−0.03em / 1.05~1.1 · 한글 본문 0~−0.01em / 1.5~1.6 **※추정** | 동일 |
| 모션 | Minh Pham: 리빌 1.1s `expo.out`, 요소 상단이 뷰포트 82% 지점에서 1회 트리거, `transform/opacity`만, DPR 2 제한 [2] | 리빌 640ms quint-out(기존 토큰) · 트리거 82% · 1회만 |

---

## C. 라이트 모드에서 영화적 느낌을 내는 규칙 7

1. **어둠은 프레임 안에만** — 배경은 흰색, 모든 영상·포스터는 `#0A0A0B` 레터박스 컨테이너에 담아 16:9를 유지한다(Apple TV 앱 라이트 모드 방식). 영상 없는 카드도 다크 플레이스홀더.
2. **블러 아트 백드롭** — 히어로·상세 모달 뒤에 현재 작품 프레임을 `blur(40px) saturate(1.4) opacity .35`로 깐다. 흰 배경 위라 채도가 살아 "그 작품의 색"이 번진다.
3. **그라데이션은 배경색으로** — 검정 스크림 대신 `to top, #fff → transparent`. 텍스트가 아트 위에 올라갈 때만 국소 다크 스크림(`rgba(0,0,0,.35)` + `backdrop-blur 24px`).
4. **모서리 10~12px + 2중 그림자** — `0 8px 24px rgba(0,0,0,.12)` + `inset 0 0 0 1px rgba(0,0,0,.06)`. 1px 회색 보더는 쓰지 않는다.
5. **아트는 깨끗하게** — Apple 사양처럼 썸네일에 제목 외 텍스트 금지, 키프레임 타일은 텍스트 0 [5]. 정보는 카드 아래 텍스트가 담당한다.
6. **극장 모드만 다크 전환** — 플레이어 전체화면·모달 열림 시에만 페이지 배경을 `#0A0A0B`로 400ms 디밍. 닫으면 라이트 복귀. 다크는 "상영 중" 신호가 된다.
7. **흰 배경의 리듬은 간격으로** — 행 사이 64~104px, 카드 간 16px. 구분선 대신 공간.

---

## D. 금지 목록

| 금지 | 근거 |
|---|---|
| 소리 있는 자동재생, 끄기 옵션 없는 미리보기 자동재생 | Netflix는 불만 끝에 2020-02 끄기 옵션 추가 [12] · 브라우저도 무음만 허용 |
| 홈 행 8개 초과 | 행마다 영상 디코딩·이미지 요청이 누적, 20~30작품 포폴은 5~7행이면 충분 |
| 호버 확대(≥1.1배)·카드가 이웃을 밀어내는 확장 | Netflix 줌 제거 스크립트가 존재 [13] · 레이아웃 시프트 유발 |
| 자동 회전 캐러셀, 컨트롤 없는 캐러셀 | 캐러셀 자동 전환은 읽기 전에 넘어가고 클릭률이 낮다 [22] |
| 다음 영상 자동 넘김·가속 카운트다운 | deceptive.design 등재 [18] · "불안을 만들어 누르게 한다" [19] |
| 스크롤 하이재킹(속도 종속 모션, 휠 가로채기) | 이미 design_brief 원칙 8 · 관성 스크롤 라이브러리 금지 |
| 첫 페인트에 WebGL·대형 JS | Minh Pham도 WebGL은 지연 초기화·화면 밖 정지 [2] |
| 썸네일 위 텍스트·배지 남발 | Apple 아트 정책: 제목 외 텍스트 금지 [5] |
| 1440px 고정 폭, 히어로의 이력서 표·개인정보 | 기존 사이트 치명 결함(README_pf_research) |
| 칸 제목 옆 안내 캡션, 상태등 남발 | 사용자 규칙 |

---

## E. 접근성 · 성능 체크

| 체크 | 구현 | 근거 |
|---|---|---|
| `prefers-reduced-motion: reduce` | `video[autoplay]`의 `autoplay` 제거 + `pause()`, 미디어쿼리 변경 감시 · 리빌/패럴랙스 0ms | Chrome 가이드 스크립트 [1] · WCAG 2.3.3 |
| Save-Data / 느린 망 | `navigator.connection.saveData` 또는 `effectiveType ≠ 4g`면 포스터만, 프리뷰 자동재생 OFF | **※관행** |
| LCP = 히어로 포스터 | 히어로 `<video>`·포스터에 `loading="lazy"` **금지**, `loading="eager"`도 쓰지 않고 속성 생략 · 포스터 `fetchpriority="high"` | [1] |
| 폴드 아래 영상 | `<video loading="lazy" preload="none" muted playsinline loop>` + `poster` · 구형 브라우저는 IO 폴백 `rootMargin: 200px 0px` | [1] |
| CLS | 모든 `<video>`·`<img>`에 정수 `width height`(미설정 시 300×150 기본값이 교차 판정을 막음) | [1] |
| 동시 재생 1개 | IntersectionObserver `threshold .6`, 새 카드 진입 시 이전 영상 `pause()`; 호버 프리뷰도 같은 큐 | **※관행** |
| 키보드 | 카드 `focus-visible` 링, 포커스 시 호버와 동일 프리뷰, 모달 포커스 트랩, 플레이어 단축키 A-9 | [14][15][16] |
| 자막·대체 | 소리 있는 풀 영상엔 `<track kind="captions">`, 무음 프리뷰는 `aria-hidden` + 카드 텍스트가 대체 | WCAG 1.2 |
| PiP 제스처 | `requestWindow`는 사용자 제스처 안에서만, 닫힘 `pagehide` 처리, Safari 폴백 | [3] |
| WebGL 쓸 경우 | DPR ≤2, 화면 밖 렌더 루프 정지, 지연 초기화 | [2] |
| 모바일 | 세로 히어로 4:5, 행은 네이티브 스크롤+피크, 호버 프리뷰 없음(탭 = 상세), 플레이어는 가로 전체화면 유도 | — |

---

## F. URL 목록

| # | 출처 | 쓰인 곳 |
|---|---|---|
| [1] | https://developer.chrome.com/docs/modern-web-guidance/guides/performance/lazy-load-video-and-audio | E 전반, A-1 |
| [2] | https://www.hontran.dev/blog/minh-pham-portfolio-case-study | B6 토큰·모션, D, E |
| [3] | https://developer.chrome.com/docs/web-platform/document-picture-in-picture | A-11, B4, E |
| [4] | https://www.slashgear.com/youtube-miniplayer-now-on-the-web-02548331 | B4 미니플레이어 |
| [5] | https://tvpartners.apple.com/support/3708-artwork-requirements | A-4, B2, C-5, D |
| [6] | https://bendodson.com/weblog/2025/09/22/portrait-artwork-ios-26-apple-tv-app/ | A-4, B2 |
| [7] | https://appleinsider.com/articles/23/11/01/hands-on-with-the-apple-tv-app-redesign-in-tvos-172 | A-12, B3, B5 |
| [8] | https://heise.de/-10714621 | A-1, B1, B5 (Disney+ 2025 개편) |
| [9] | https://medium.com/disney-streaming/introducing-our-latest-ux-enhancements-for-disney-f7c93a4e38cb | 보조(Disney+ UX) |
| [10] | https://about.netflix.com/news/see-whats-popular-on-netflix | A-7, B2 |
| [11] | https://www.engadget.com/2012/08/15/netflix-post-play-ps3-web/ | A-10, B4 |
| [12] | https://www.tomsguide.com/news/how-to-turn-off-autoplay-on-netflix | B1, D |
| [13] | https://greasyfork.org/scripts/12118/code | A-6, D (호버 줌 제거 스크립트) |
| [14] | https://home.nps.gov/media/video/keyboard-shortcuts.htm | A-9 단축키 |
| [15] | https://help.sbs.com.au/hc/en-au/articles/6898124448271-What-are-the-keyboard-shortcuts-for-the-SBS-On-Demand-website | A-9 단축키 |
| [16] | https://fluidproject.atlassian.net/wiki/spaces/fluid/pages/11629489 | A-9 단축키 요약 |
| [17] | https://web.dev/articles/css-scroll-snap | A-5, B2 |
| [18] | https://deceptive.design/articles/netflix-next-episode | A-10, D |
| [19] | https://desirabilitylab.com/posts/netflix-autoplay | A-10, D |
| [20] | https://support.apple.com/guide/music-web/apdm81dfae8d/web | A-12, B5 |
| [21] | https://community.spotify.com/t5/Your-Library/Desktop-New-Your-Library-sidebar/m-p/5574376 | B5 |
| [22] | https://f7.de/en/blog/stop-the-slide-why-carousels-harm-the-ux | B1, D |
| [23] | https://biz.newdaily.co.kr/site/data/html/2020/12/28/2020122800072.html | B6 (쿠팡플레이 UI) |
| [24] | https://help.vimeo.com/hc/en-us/articles/33744075444625-Get-to-know-the-redesigned-showcase-experience | Vimeo 쇼케이스: Featured content 배너 토글·썸네일/임베드 플레이어 선택(2025-08) — B1·B3 보조 |
| [25] | https://vimeo.com/product/video-profile-customization | Vimeo 프로필 = 클라이언트용 쇼릴 포지셔닝 — A-3 보조 |
| [26] | https://www.awwwards.com/inspiration/showreel-pit-studio · https://www.awwwards.com/inspiration/about-us-showreel-jdsdesign | 쇼릴 포폴 레퍼런스(제목 수준) |

> 한계: Netflix·YouTube·국내 OTT는 공식 수치 문서가 없어 호버 지연·확대 배율·미니플레이어 크기·컨트롤 숨김 시간은 관측·관행 기반 권장값(※)이다. 왓챠·웨이브 서체는 공식 확인 못 함. 수치가 필요한 항목은 구현 후 실측으로 조정.
