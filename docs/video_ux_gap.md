# 영상 플랫폼 '보는 경험' 수치 스펙 × 현재 구현 갭 — 포트폴리오(/home/claude/pf) 2차 조사 (2026-11-01)

> 결론 한 줄: **현재 구현은 행·호버·플레이어 규약의 80%를 이미 플랫폼 수준으로 갖췄다. 남은 갭은 ①상영관 진입 전환이 없음(display 토글) ②퍼포먼스 행이 1:1 카드라 영상 플랫폼 문법(16:9 기본)과 어긋남 ③「다음 작품」카드가 15~30초짜리 광고 소재의 절반을 가림 ④카드 텍스트 12.3px가 모든 플랫폼 최소치(13px) 미만 — 이 4개가 P0.**
>
> 표기: `[Sn]` = F절 출처 번호. **공식** = 플랫폼 1차 문서(HIG·개발자 문서·공식 블로그·지원 문서). **실측·재현** = 프런트엔드 재현 글·실측 토큰 추출(비공식, 값 편차 있음). **※추정** = 텍스트 출처 없음, 관행·계산으로 잡은 값. 이전 브리프(video_ux_brief.md) TOP12와 겹치는 항목은 재조사하지 않고 수치만 보강했다.

| 의문 | 절 |
|---|---|
| 플랫폼은 실제로 몇 ms·몇 px인가 | A (A1 빌보드 · A2 행 · A3 호버 · A4 플레이어 · A5 전환 · A6 타이포·컬러 · A7 모바일) |
| 지금 구현과 뭐가 다른가, 뭘 먼저 고치나 | B |
| 사용자에게 물어볼 갈림길 | C |
| 바로 넣을 코드 | D |
| 출처 | F |

---

## A. 플랫폼별 핵심 스펙 표

### A1. 홈 빌보드 / 히어로

| 항목 | Netflix | Apple TV(앱·web) | Disney+ | Prime Video | 국내(쿠팡플레이·티빙·웨이브·왓챠) | YouTube |
|---|---|---|---|---|---|---|
| 자동재생 지연 | 페이지 로드 시 즉시(웹) [S38] · 호버 프리뷰는 "2초 이내" [S25] | **포스터 5초 홀드 후 트레일러** (WWDC19 공식) [S9] · Top Shelf 배너는 "preset timer"로 자동 순환 [S5] | 히어로 캐러셀 안에서 영상 재생(2025 개편) [S56] · 프로필 설정 「Background Video」로 끔 [S57] | 거실 기기에서 히어로 로테이터 자동재생 [S58] | 자료 없음 | 썸네일 호버 시 3초 루프 즉시 [S43] |
| 무음·소리 토글 | 무음 시작, 사용자가 음소거 토글 [S24] · 모바일 앱은 탭해야 재생 [S38] | "소리를 강제하지 않는다 — 명시적 사용자 액션에서만 오디오" [S9] | 자료 없음 | 자료 없음 | 자료 없음 | 무음(추정) |
| 포스터→영상 전환 | 크로스페이드 600ms(재현 토큰) [S32] · 1s 크로스 디졸브(재현) [S30] | 포스터 5s → 트레일러 [S9] | — | — | — | — |
| 루프 길이 | 모바일 프리뷰 30초 [S38][S39] · 12초마다 회전(재현, 미확인) [S30] | TV 프리뷰 영상 "2~5분" 권장(HLS) [S9] | — | — | — | 3초 [S43] |
| 높이 | 데스크톱 ≈56vh · 모바일 ≈40vh(재현) [S32] | 16:9 풀블리드, 스크림 하단 240px(재현) [S31] | — | — | — | — |
| 그라데이션 | 하단 `rgba(20,20,20,0)→1`, 좌측 `rgba(0,0,0,.6)→투명`(재현) [S32] · 오버레이 `rgba(0,0,0,.64)`(재현) [S33] | `inset 0 -240px 200px -100px #000`(재현) [S31] | — | — | — | — |
| 로고·타이틀 배치 | SVG 타이틀 아트 + 3줄 시놉시스(재현) [S30] · 타이틀 56~64px/700~900 [S30][S32] | 타이틀 SVG 360~440px 폭, 5% 인셋(재현) [S31] · 캐러셀: 제목 좌상단, Play/More Info 좌하단 [S9] | — | — | — | — |
| 인디케이터·장수 | — | Top Shelf 배너 **3~8장**, 8장 초과 시 탐색 어려움 [S5] · 캐러셀 **5~10개** [S9] | — | — | — | — |
| 포커스 전 대기 | — | 오버레이·인터랙티브 요소는 **최소 0.5초 지연** [S4] | — | — | — | — |

### A2. 행(레일)

| 항목 | Netflix(web) | Apple tvOS HIG(공식, 1920pt 기준) | Android TV(공식, 960dp 기준) | Apple TV web(재현) | 티빙(실측) |
|---|---|---|---|---|---|
| 카드 비율 | 16:9 또는 2:3 [S32] · 2:3 포스터(재현) [S30] | 16:9 표준 행 [S9] · Top Shelf 2:3 / 1:1 / 16:9 [S5] | **16:9가 가장 흔함, 1:1은 출연진·팀 로고, 2:3은 강조용** [S16] | 16:9 랜드스케이프, 2:3 포트레이트 [S31] | — |
| 열 수 × 카드 폭 | <500: 2~3 · 500~950: 3~4 · 950~1400: 5~6 · >1400: 6+ (재현) [S32] · 재현 클론 `basis-1/3`→`1/6` [S29] | 2열 860 · 3열 560 · 4열 410 · 5열 320 · **6열 260pt** [S1] | 1열 844 · 2열 412 · 3열 268 · 4열 196 · 5열 124dp [S15][S16] | `clamp(220px,28vw,300px)` [S27] | — |
| 카드 간격 | 4~8px [S32] · 6px [S27] | 가로 **40pt**, 세로 최소 100pt [S1] | 20dp [S15][S16] | 6px [S27] | — |
| 좌우 여백 | `0 4vw` [S32] | 상하 60pt · 좌우 80pt(안전영역) [S1] | 5% ≈ 58dp 좌우 · 28dp 상하 [S15] | `clamp(16px,5vw,48px)` [S27] | — |
| peek | 다음 카드 일부 노출(수치 없음) [S18] | "화면 밖으로 부분 노출되는 콘텐츠는 좌우 대칭 폭으로" [S1] | 20dp 간격 기반 peeking [S16] | 마스크 `#000 4%~96%` [S27] | — |
| 화살표 | — | — | — | 폭 40px, `opacity-0`→행 hover 시 1, 모바일 숨김 [S27] | — |
| 스크롤 단위 | — | — | — | **0.9 × 행 폭** [S27] | — |
| 행 제목 | 20px/700 [S32] · 18px/500 [S30] | — | — | 17px/600(row-title) · 22px/600(section) [S31] | 22px/700 [S34] |
| 행 간격 | ≈3vw [S32] · 36px [S30] | — | — | 48px, 섹션 96~160px [S31] | — |
| 랭킹·배지 | Top 10 리본 `#E50914` 9~12px/700 대문자 [S30][S32] · 2025 TV: 포커스 시 "Emmy Award Winner", "#1 in TV Shows" 콜아웃 [S41] | — | — | 배지 radius 4px, 11px/600 [S31] | — |
| TV 기본 글자 | — | 본문 **29pt**(최소 23pt) [S6] | — | — | — |

### A3. 카드 호버 / 포커스

| 항목 | Netflix web | Netflix TV(2024~) | Apple tvOS | Android TV | Apple TV web | YouTube |
|---|---|---|---|---|---|---|
| 지연 | 재현 클론 **650ms** [S29] · 재현 토큰 **0.75s dwell** [S30] · 관측 "2초 이내" [S25] · 시뮬레이션 1.5s [S60] | "an extended period" 후 프리뷰 [S40] | 포커스 즉시(시스템) [S2] | — | — | 즉시(인라인 재생) [S44] |
| 확대 배율 | **1.5×, 이웃 25% 밀림** [S26] · 1.4× 750ms [S30] · 1.32× 300ms [S27] · 1.2× 250ms [S28] | 타일이 확장되고 **다른 타일을 옆으로 밀어냄** [S40] | 포커스 시 확대(수치 비공개), "확대된 아이템이 주변을 침범하지 않게 간격 확보" [S2][S7] · 3rd party 1.05~1.1× / 0.15s [S63] | **기본 1.025 / 1.05 / 1.1×**, 글로우 2~32dp [S17] | **1.03×, 350ms**, 그림자 `0 16px 32px rgba(0,0,0,.7)` [S31] | 확대 + 인라인 재생 [S44] |
| 이징 | `cubic-bezier(.5,0,.5,1)` 750ms [S30] · `cubic-bezier(.2,.8,.2,1)` 300ms [S27] | — | — | — | `cubic-bezier(.32,.72,0,1)` 350ms [S31] | — |
| 프리뷰 재생 시점 | 확장 완료 후 영상 → 무음 [S29] · 미니모달 데이터는 **행 전체를 한 번에 프리페치** [S37] | 확장 후 트레일러·설명이 중앙 [S40] | — | — | — | 호버 즉시 3초 루프 [S43] |
| 정보 노출 순서 | 썸네일 → 매치율·장르 등 추가 정보 [S25] · 미니모달 폭 360px(재현) [S30] | 포커스 시 시놉시스·수상·순위 콜아웃 [S41] | 포스터 타이틀·부제는 **포커스 전엔 숨김** [S7] | — | 프리뷰 팝업 400px(재현) [S31] | — |
| 포커스 그림자 | `0 12px 24px rgba(0,0,0,.8)` [S32] | — | "드롭섀도로 뒤 콘텐츠에서 띄움" [S2] | 글로우 2~32dp [S17] | 위 참조 | — |
| 축소 모션 대응 | reduce 시 확대·자동재생 끔, 테두리/밝기로 대체(재현) [S32] | — | "모션을 선택 사항으로" [S8] | — | 호버=opacity만(재현) [S31] | — |

### A4. 상세 / 플레이어

| 항목 | Netflix | Apple TV | YouTube | 공개 플레이어 기본값 | 국내 |
|---|---|---|---|---|---|
| 컨트롤 유휴 숨김 | 수치 비공개 ※추정 3s | 수치 비공개 · "탭/클릭하거나 기다리면 사라짐" [S12] | 수치 비공개 ※추정 3s | **JW Player 3초** [S48] · **Livepeer 3000ms** [S49] · **video.js 2000ms + 1.5s 페이드** [S50] | — |
| 진행바 | 3px, 트랙 `#404040`/`#5a5a5a`, 채움 `#E50914`, radius 0(재현) [S30][S32] | 3px, 플레이헤드 12px → hover 16px(재현) [S31] | 수치 비공개 ※추정 3→5px | — | — |
| 탐색 단위 | ←→ 10초 · 0~9 = 0~90% · ↑↓ 볼륨 5% [S47] | ←→ **10초**(리모컨) · 뒤로 감기 시 자막 10초 표시 [S12] | ←→ 5초 · J/L 10초 · 0~9 = 0~90% · ↑↓ 5% · `,`/`.` 프레임 · `<`/`>` 배속 · Home/End [S42] | — | 쿠팡플레이 **10초 고정** [S66] · 경기 중계 10초 스킵 제스처 호평 [S64] |
| 단축키 | Space/Enter/K 재생 · F · Esc · M · Shift+←→ 에피소드 · **S 스킵 인트로** · P PiP · T 자막메뉴 [S47][S22] | Space 재생 · ⌘↑↓ 볼륨 · ⌃⌘F 전체화면(Mac 앱) [S11] | 위 + C 자막 · I 미니플레이어 · Shift+N/P · / 검색 [S42] | — | 쿠팡플레이는 ←→ 탐색 미지원(확장으로 1~30초 추가) [S65] |
| 건너뛰기 | Skip Intro: 2017 웹 → TV(2017-08) → 모바일(2018-05), 하루 **1억3,600만 회**, "필요할 때만 나타나고 한 번 클릭" [S22] | — | — | — | — |
| 다음 콘텐츠 카드 | 2012 도입: 크레딧 축소 + **15초 카운트다운**, 영화는 관련작 3편 [S20] · 2020: **15초→5초**로 단축 [S21] · 클론 스펙: 종료 15초 전 등장, **최소 30초 재생 후에만** [S61] | 브라우저: 크레딧 시작 시 우하단 카드+원형 카운트다운, **취소 불가**(불만 스레드) [S13] · Mac 앱 설정 「Play Next Episode」「Play a Recommendation」 [S10] | — | — | 쿠팡플레이 「동영상 자동재생」 토글 [S68] |
| "아직 보고 계신가요" | TV: 3편 + 90분 연속 · 기타 기기: 컨트롤 미사용 3편 연속 [S19] | — | — | — | — |
| PiP | P 키(Chrome/Edge) [S47] | "모바일·컴퓨터에서 PiP 시작" [S12] · PiP 진입 시 시스템이 오디오 믹스 방지 [S4] | I 미니플레이어 [S42] | — | — |
| 로딩 | — | **2초 넘으면** 검은 화면+스피너, 재생 가능해지면 즉시 시작 [S4] | — | 스켈레톤: 정적은 ≈1초 이내, 그 이상이면 애니메이션 [S59] | — |
| 종료 후 | 포스트플레이 카드 [S20] | 「Play a Recommendation」설정에 따름 [S10] | 관련 영상(`rel` 비활성 불가) [S45] | — | — |
| 2025 플레이어 UI | — | iOS 26: 고정 바 → **떠 있는 버튼**(Liquid Glass) [S14] | M3 알약형 컨트롤, 경과/남은 시간 토글, 시어터 모드 [S46] | — | — |

### A5. 전환 · 애니메이션

| 항목 | 값 | 출처 |
|---|---|---|
| Netflix 모션 토큰(재현) | fast 150 · card 300 · standard 400 · billboard 600ms / `ease-out (0,0,.2,1)` · `standard (.4,0,.2,1)` · `scroll (.25,.1,.25,1)` | [S32] |
| Netflix 모달 열림(재현) | 300ms ease-out, scale .95→1 + opacity 0→1 / 모달 그림자 `0 32px 64px rgba(0,0,0,.85)` | [S30] |
| Apple TV web(재현) | fast 200 · standard 350 · slow 600ms / **`ease-apple-spring cubic-bezier(.32,.72,0,1)`** / 모달 400ms scale .95→1 / 타일→모달 "expand from source" ≈400ms / 상단바 scrollY>80px 후 350ms | [S31] |
| Material 3 공식 | standard `(.2,0,0,1)` · emphasized-decelerate `(.05,.7,.1,1)` · emphasized-accelerate `(.3,0,.8,.15)` / short 50~200 · medium 250~400 · long 450~600 · extra-long 700~1000ms | [S51] |
| View Transitions UA 기본 | `animation-duration: 0.25s`, 크로스페이드, `view-transition-name` 중복 시 전환 스킵 | [S52][S53] |
| Apple HIG 모션 | "모션은 선택 사항으로", "취소 가능하게", "자주 일어나는 UI 상호작용엔 모션 추가 지양" / tvOS 0.2Hz 진동 회피 | [S8] |
| 축소 모션 | Chrome: reduce ≠ no motion, 더 미묘한 전환 권장 / Netflix·Apple 재현: 호버 확대 → opacity만, 빌보드 자동 루프 → 정지 포스터 | [S53][S30][S31] |
| 안전한 프리로드 | Netflix: 첫 호버에 **행 전체** 미니모달 데이터 프리페치 → 다음 카드는 캐시 히트 | [S37] |

### A6. 타이포 · 컬러

| 항목 | Netflix | Apple TV(web·tvOS) | 티빙(실측) | 기타 |
|---|---|---|---|---|
| 서체 | Netflix Sans(자체) / 폴백 Helvetica Neue [S30][S32] · 한글은 Pretendard·Apple SD Gothic(재현) [S35] | SF Pro Display(≥20px) / SF Pro Text / tvOS는 SF Pro·NY [S31][S6] | **Pretendard 웹폰트 로드 확인** [S34] | 웨이브·왓챠·쿠팡플레이: 공식 확인 불가 ※추정 Pretendard 계열 |
| 본문·카드 크기 | body 14~16 · caption 13 · metadata 14 · 카드 타이틀 24/600(마케팅) [S30][S32] | body-md 17 · body-sm 15 · caption 13 · metadata 15(tnum) [S31] · tvOS 본문 29pt/최소 23pt [S6] | 본문 16.5/400 · 제목 22/700 · 메뉴 13.2~14.3 [S34] | TV 베이스 24px, 5~6단계 스케일 [S18] |
| 디스플레이 | 빌보드 56~64px/700~900, 자간 −0.01~−0.03em [S30][S32] | 80px/700 −0.025em · display 56/40/32/24 [S31] · tvOS Title1 76pt/Medium [S6] | — | — |
| 웨이트 대비 | 400/500/700 세 단계 [S32] | 400/500/600/700 [S31] · tvOS: 본문 Medium 기본, 라이트 웨이트 지양 [S6] | 400/700 [S34] | — |
| 다크 배경 | 캔버스 `#141414`, 카드 `#181818`, 플레이어 `#000` [S32] | web `#000`, 카드 `#1c1c1e` [S31] | `#000`, 목록 `#212121` [S34] | — |
| 강조색 빈도 | **빨강은 CTA·워드마크·배지 전용, 본문 금지**(안티패턴 1) [S35] · 재생 버튼은 **흰색** [S32] | 1차 CTA **흰색**, 브랜드 블루 `#0070e0`는 링크·포커스 링 [S31] | CTA가 **`#dedede`(거의 흰색)**, 빨강 미사용 [S34] | — |
| 라이트 모드 | "라이트는 마케팅에만, 시청 UI는 다크 강제"(재현 가이드) [S35] | **Mac 앱 설정 「Appearance: Light or Dark」 공식 제공** [S10] · 2015 tvOS HIG: "포커스 그림자가 보이게 밝은 배경 선호" [S62] · web은 다크 전용 [S31] | 다크 전용 [S34] | — |
| 라운드 | 타일 4px, 확장카드·모달 6px, 포스터 0px [S32][S35] | 카드 12px, 모달 16px, 버튼 8px [S31] | 4.95px / 알약 [S34] | — |

### A7. 모바일

| 항목 | 값 | 출처 |
|---|---|---|
| 호버 대체 | Netflix 모바일 프리뷰는 **탭해야 재생**(자동 아님), 세로 30초 클립, 스토리식 스와이프 | [S38][S39] |
| 호버 대체(TV/폰 공통 정의) | "resting" = TV는 포커스, 웹은 포인터, **폰은 행에서 가운데 정렬된 타이틀** | [S60](시뮬레이션) |
| 세로 카드 | Apple TV 앱 iOS 26: 가로 아트 → **세로 포스터**로 전환, 한 화면에 더 많이 표시 | [S14] |
| 세로 카드 | Disney+ 2025: "cinematic-style poster artwork" | [S56] |
| 빌보드 | Netflix 모바일 ≈40vh(재현) | [S32] |
| 자동재생 정책 | iOS: `muted` 또는 무음 트랙 + `playsinline`이면 제스처 없이 재생, 화면 밖이면 일시정지, 제스처 없이 음소거 해제 시 정지 | [S55] |
| 자동재생 정책 | Chrome: 무음 자동재생 항상 허용, 소리는 도메인 상호작용 후 · `play()` Promise 거부 처리 · MEI 조건(7초·200×140px) | [S54] |
| 탭 타깃 | Netflix 44px 최소(재현) · Apple 버튼 높이 44px(재현) | [S32][S31] |
| Netflix 2025 모바일 | 세로 클립 피드 테스트(열기·리스트 추가·공유) | [S41] |

---

## B. 현재 구현 대조 — [현재값 → 권장값 · 근거 · 우선순위]

> 현재값은 `/home/claude/pf/src/site.css`, `site.js`, `build.py` 코드에서 읽은 값. 우선순위: **P0** = 보는 경험을 직접 깨뜨림, **P1** = 플랫폼 규약과 눈에 띄게 다름, **P2** = 다듬기.

### B1. 빌보드

| 항목 | 현재 | 권장 | 근거 | 우선순위 |
|---|---|---|---|---|
| 자동재생 지연 | 3000ms (`site.js play()`) | **유지 3000ms** (Apple TV 5s는 거실 진입 맥락; 웹은 3s가 적정 ※추정) | [S9] | — |
| 포스터→영상 페이드 | `--dur×1.5` = 600ms | 유지 | Netflix 재현 600ms [S32] | — |
| 루프 | 기본 0~8s, 끝나면 페이드아웃 → 700ms 포스터 → 재시작 | 유지하되 `data-loop` 상한 15s, 700ms 간격은 `--dur`로 치환(축소 모션 시 0) | YouTube 3s·Netflix 30s 사이 ※추정 | P2 |
| 소리 토글 | 없음(`muted` 고정, 일시정지 버튼만) | **우하단 원형 44px 소리 토글 추가**, 켜면 호버 프리뷰 정지 | Netflix 무음 시작+토글 [S24], Apple "명시적 액션에서만 오디오" [S9], 제스처 후 unmute 허용 [S54][S55] | **P1** |
| 높이 | `clamp(56vh,56.25vw,82vh)`, min 520 · 모바일 4:5 | 유지 | Netflix ≈56vh/40vh [S32] | — |
| 그라데이션 | to top, bg 0%→92%@12%→55%@30%→0@55% | 유지(라이트용 공식) | Netflix 하단 0→100% [S32] | — |
| 타이틀 | 텍스트 h1 `clamp(35px,4.2vw,59px)`/700/−0.03em | 유지 · 로고 아트 없는 포폴 특성상 적정 | Netflix 56~64px [S30][S32] | — |
| 인디케이터 | 4px 높이 세그먼트, 최대 6장, 수동 전환 | 유지 | Apple 3~8장 [S5], 5~10개 [S9] | — |
| 모바일 영상 | 재생 안 함(`MOBILE()` 차단) | 유지 — 포스터만 · 탭 = 상영관 | Netflix 모바일 탭 재생 [S38] | — |
| CTA 색 | 「재생」= `btn.acc`(빨강) + 내비 「쇼릴」도 빨강 → 첫 화면에 빨간 버튼 2개 | **빌보드 「재생」을 ink(검정) 채움으로**, 빨강은 내비 「쇼릴」 1개만 | Netflix 재생 버튼 흰색·빨강은 CTA 1개 [S32][S35], Apple 1차 CTA 흰색 [S31], 티빙 CTA `#dedede` [S34] | **P1** |

### B2. 행

| 항목 | 현재 | 권장 | 근거 | 우선순위 |
|---|---|---|---|---|
| 카드 비율 | `대표 작업`·`퍼포먼스`·`AI 생성` 행 = **1:1 200px** · `개인`·`도구`·`리서치` = 16:9 304px | **16:9 기본**(모든 영상 행) · 세로 소재는 **9:16 전용 행**(폭 172px, 높이 306px) · 1:1은 도구·앱 아이콘성 카드에만 | Android TV "16:9 most common, 1:1은 출연진·로고" [S16], tvOS 16:9 표준 행 [S9], Top Shelf 3비율 [S5] | **P0** |
| 열 수·peek | 고정 px 폭 → 1360px에서 6장 꽉 참, peek 24px(1:1)·40px(16:9)로 **폭마다 들쭉날쭉** | 컨테이너 쿼리로 **6/5/4/3/2열 + peek `--s5`(40px) 고정** | tvOS 6열 260pt [S1], Android 4열 196dp [S15], Netflix 재현 breakpoints [S32][S29], "부분 노출은 대칭 폭" [S1] | **P1** |
| 간격 | 16px | 유지(라이트 모드는 간격이 경계) | Netflix 4~8 [S32], Android 20dp [S16], tvOS 40pt [S1] | — |
| 화살표 | 48px 영역 + 40px 원형, hover·스크롤 가능 시만, `hover:none` 숨김 | 유지 · 스크롤 단위 0.8 → **0.9** | Apple TV web 재현 40px·0.9 [S27] | P2 |
| 행 제목 | 20.8px/700 + "전체 보기 ›" 12.3px 상시 | 유지 · 링크는 **14px**(B6 `--t-sm`) | Netflix 20/700 [S32], Apple 17~22/600 [S31] | P2 |
| 행 간격 | 64px | 유지 | Apple 48 [S31], Netflix ≈3vw [S32] | — |
| 랭킹·배지 | 없음 | 「대표 작업」에만 **성과 배지 1개**(호버 정보 첫 줄) · 숫자 랭킹은 실제 순위 있을 때만 | Netflix 2025 포커스 콜아웃 [S41], 브리프 A-7 | P2 |

### B3. 카드 호버

| 항목 | 현재 | 권장 | 근거 | 우선순위 |
|---|---|---|---|---|
| 지연 | 380ms | **500ms** — 스쳐 지날 때 미발화 + Netflix(650ms~)보다 빠르게 | 재현 650ms [S29]·0.75s [S30]·관측 ≤2s [S25] / YouTube 즉시 [S44] ※절충 추정 | P2 |
| 확대 | A안 1.0 / B안 1.03 | **1.03 고정**(A·B 통합), 350ms `--ease` | Apple TV web 1.03/350ms [S31], Android 1.025~1.1 [S17], Netflix 1.5 확장은 비권장(브리프 D) [S26] | P1 |
| 그림자 | `--shadow-lg` = `0 18px 50px ink 28%` | 유지 | Apple `0 16px 32px .7`(다크) [S31] | — |
| 프리뷰 | 지연 후 제자리 무음, 200ms 크로스페이드, 동시 1개 | 유지 · 200ms → `calc(var(--dur)/2)` | — | P2 |
| 정보 노출 | 제목·부제 상시(카드 아래), B안만 그라데이션 정보 | 제목·부제 상시 유지 + **호버 시 한 줄 성과/역할**을 카드 아래로 슬라이드(높이 변화 없음) | Netflix 썸네일→추가 정보 순 [S25], Apple 포스터 제목은 포커스 시 노출 [S7] | P2 |
| 프리페치 | 없음(`preload=none`, 호버 시 src 지정) | 행 첫 호버 시 같은 행 프리뷰 **메타데이터만** 프리페치 | Netflix 행 단위 프리페치 [S37] | P2 |
| 축소 모션 | `RM`이면 프리뷰 미바인딩 ✓ | 유지 · B안 확대도 `RM`에서 opacity만 | [S32][S53] | — |

### B4. 상영관(상세/플레이어)

| 항목 | 현재 | 권장 | 근거 | 우선순위 |
|---|---|---|---|---|
| 열림·닫힘 | `display:none↔block` — **전환 없음** | **opacity 0→1 + 스테이지 scale .96→1, `--dur`(400ms) `--ease`** · 닫힘은 `--dur/2` | Apple 재현 400ms .95→1 [S31], Netflix 재현 300ms [S30], UA 기본 0.25s [S52] | **P0** |
| 다음 카드 등장 | 남은 **8초**에 등장 → 15초 소재는 7초부터 가려짐 | **`duration ≥ 60s`일 때만 마지막 8초**, 그 외는 `ended` 후 등장 · 폭 280px 유지 | Netflix는 크레딧 시작 시 [S20], 클론 스펙 "30초 미만 재생이면 미표시" [S61] | **P0** |
| 카운트다운 | reel 모드만 8초 | reel 모드 **5초**, 그 외 없음 유지 | Netflix 15→5초 [S21] | P2 |
| 유휴 숨김 | 3000ms, 일시정지 시 유지, 커서 숨김 | 유지 | JW 3s [S48], Livepeer 3000 [S49], video.js 2000 [S50] | — |
| 진행바 | 3px → hover 6px | 유지 · hover 시 **12px 플레이헤드** 추가 | Netflix 3px [S30], Apple 3px·12→16 플레이헤드 [S31] | P2 |
| 단축키 | Space/K · ←→5s · J/L10s · M · F · P · N/Shift+N · Shift+←→ · Esc | 추가: **0~9 구간 점프 · ↑↓ 볼륨 5% · Home/End · `?` 단축키 시트** | YouTube 공식 [S42], Netflix [S47] | **P1** |
| 자막 토글 | 없음 | 소리 있는 풀 영상에 `<track>` 있을 때 **C** | YouTube C [S42] | P2 |
| PiP | 네이티브 `requestPictureInPicture` + CSS 미니 320px | 유지(브리프 A-11) | [S12][S42] | — |
| 종료 후 | 큐 끝이면 paused 오버레이 | 유지 + 「처음부터」「다음」 2버튼 | Apple 설정형 [S10], Netflix 영화는 관련작 3편 [S20] | P2 |
| 로딩 | 없음 | `waiting` 2초 초과 시만 스피너 | Apple 2초 규칙 [S4] | P2 |

### B5. 전환·애니메이션·축소 모션

| 항목 | 현재 | 권장 | 근거 | 우선순위 |
|---|---|---|---|---|
| 토큰 | `--dur 400ms`, `--ease cubic-bezier(.32,.72,0,1)`, `--d-micro 100ms` | 유지 — Apple 재현 토큰과 동일 값 | `ease-apple-spring` [S31], M3 standard 300~400ms [S51] | — |
| 축소 모션 누수 | `--dur:0`은 되지만 **하드코딩 200ms(카드 영상)·700ms(루프 간격)·`scroll-behavior:smooth`** 남음 | 전부 토큰·미디어쿼리로 | Apple "모션은 선택 사항" [S8], Chrome reduce 가이드 [S53] | **P1** |
| 공유 요소 전환 | 없음 | 상영관 열림에 `view-transition-name` 점진 적용(지원 브라우저만) | 0.25s 기본, 이름 중복 금지 [S52][S53] | P2 |
| 스켈레톤 | 없음(배경색 플레이스홀더) | 유지 — 1초 미만 로드는 정적 플레이스홀더가 적정 | [S59] | — |

### B6. 타이포·컬러

| 항목 | 현재 | 권장 | 근거 | 우선순위 |
|---|---|---|---|---|
| 카드 제목·메타 | `--t-micro` **12.3px**/600 (제목·부제·칩·내비 로고 공용) | 카드 제목·행 링크·칩 **14px**(`--t-sm` 파생 토큰), 메타 13px 이상 | Netflix caption 13·metadata 14 [S30][S32], Apple caption 13·metadata 15 [S31], 티빙 메뉴 13.2~14.3 [S34] | **P0** |
| 디스플레이 | hero 35~59px | 유지 | Netflix 56~64 [S32], Apple 80(1920 기준) [S31] | — |
| 웨이트 | 400/500/600/700 | 유지 | Netflix 3단계 [S32] | — |
| 상영관 다크 | `#0b0b0d` / `#f2f0ea` | 유지 | Netflix `#141414`/`#000` [S32], Apple `#000`/`#1c1c1e` [S31] | — |
| 강조색 | nav 쇼릴·빌보드 재생·탭 밑줄·포커스 링·진행바·카운트다운 | **뷰포트당 빨간 채움 버튼 1개** 규칙 | [S35][S31][S34] | P1(B1과 동일) |
| 라이트 고정 | `color-scheme: light only` | 유지 — Apple TV Mac 앱도 Light 옵션 공식 제공 | [S10][S62] | — |
| 라운드 | 카드 8px, 상영관 12px | 유지 | Apple 12/16 [S31], Netflix 4/6 [S32] | — |

### B7. 모바일

| 항목 | 현재 | 권장 | 근거 | 우선순위 |
|---|---|---|---|---|
| 호버 대체 | 프리뷰 없음, 탭 = 상영관 | 유지 · 선택: 행 중앙 카드만 IO `threshold .6`으로 무음 프리뷰 | Netflix 탭 재생 [S38], "폰은 중앙 카드" [S60] | P2 |
| 세로 카드 | 없음(세로 소재 1:1 크롭) | 9:16 전용 행(모바일 폭 132px) | Apple iOS 26 세로 포스터 [S14], Disney 포스터 아트 [S56] | P0(B2와 동일) |
| 빌보드 | 4:5, 영상 없음 | 유지 | Netflix ≈40vh [S32], iOS 자동재생 정책 [S55] | — |
| 탭 타깃 | 버튼 40px(`--s5`) | 44px(`--u×5.5`) | [S31][S32] | P2 |

---

## C. 선택지로 제시할 갈림길 (5개)

| # | 갈림길 | 안 | 대표 플랫폼 | 장점 | 단점 | 추천 |
|---|---|---|---|---|---|---|
| C1 | 카드 호버 | **a. 1.03 확대 + 제자리 무음 프리뷰(500ms)** | Apple TV web [S31], Android TV [S17] | 레이아웃 시프트 0, 라이트 모드에 어울림 | 임팩트 약함 | **a** |
| | | b. 1.4~1.5 확장 카드 + 이웃 밀기 + 정보 패널 | Netflix web/TV [S26][S40] | 정보량 최대 | 줌 제거 스크립트가 있을 만큼 피로 [브리프 13], 이웃 밀림 | |
| | | c. 확대 없이 즉시 3초 루프 | YouTube [S43] | 가장 빠름 | 스쳐도 재생돼 산만 | |
| C2 | 빌보드 영상 | **a. 포스터 3s → 무음 영상 + 소리 토글** | Netflix [S24], Disney+ [S56] | 광고 소재의 사운드를 들려줄 길이 생김 | 토글 UI 1개 추가 | **a** |
| | | b. 포스터 5s 홀드 → 영상, 토글 없음 | Apple TV 캐러셀 [S9] | 가장 절제 | 소리 경로 없음 | |
| | | c. 정지 포스터만 | Disney+ Background Video off [S57] | 가벼움 | '보는 경험' 포기 | |
| C3 | 상영관 진입 | a. 카드에서 확장(View Transition/FLIP ≈400ms) | Apple TV web "expand from source" [S31] | 맥락 유지 최고 | 구현·브라우저 편차 | 2단계 |
| | | **b. 페이드 + 스테이지 scale .96→1, 400ms** | Netflix 모달 [S30] | 토큰만으로 구현, 즉시 적용 | 공유 요소 아님 | **b 지금 → a 점진** |
| | | c. 즉시 표시(현재) | — | — | 끊김 | |
| C4 | 다음 작품 | **a. `ended` 후 카드만(긴 영상은 마지막 8s)** | Netflix "크레딧 시작 시" [S20] | 15~30초 소재를 가리지 않음 | 연속 재생 느낌 약함 | **a** |
| | | b. 항상 마지막 8s(현재) | — | — | 짧은 소재 절반 가림 | |
| | | c. 5초 카운트다운 자동 넘김 | Netflix 2020 [S21], Apple TV+ web [S13] | 쇼릴 몰입 | deceptive 패턴, 취소 불가 불만 [S13] | reel 모드에서만 |
| C5 | 카드 비율 체계 | a. 전부 16:9, 세로 소재는 레터박스 안에 | Android TV 기본 [S16] | 행 높이 단일 | 세로 소재가 작아짐 | |
| | | **b. 16:9 기본 + 9:16 전용 행 + 1:1은 도구만** | Apple Top Shelf 3비율 [S5], iOS 26 세로 포스터 [S14] | 소재 규격이 곧 정보 | 행 높이 2종 | **b** |
| | | c. 1:1 혼합(현재) | — | 규격 차이 흡수 | 영상 플랫폼 문법 아님, 16:9 소재가 크롭됨 | |

---

## D. 즉시 적용 CSS/JS 변경 제안 (토큰 체계 유지)

### D1. 파생 토큰 추가 — `site.css :root,.theater,.pip` 블록

```css
/* 기존 파생 토큰 아래에 추가 — 새 원시값 없음 */
--t-sm:calc((var(--t-body) + var(--t-micro)) / 2);   /* ≈14.15px: 카드 제목·칩·행 링크 */
--d-half:calc(var(--dur) / 2);                        /* 200ms: 크로스페이드·닫힘 */
--peek:var(--s5);                                     /* 40px: 행 끝 다음 카드 노출 폭 */
--tap:calc(var(--u) * 5.5);                           /* 44px: 모바일 탭 타깃 */
```

### D2. 상영관 열림·닫힘 전환 (P0)

```css
/* display 토글 → visibility+opacity. JS의 classList 'on' 그대로 사용 */
.theater{display:block;opacity:0;visibility:hidden;transition:opacity var(--d-half) var(--ease),visibility 0s linear var(--d-half)}
.theater.on{opacity:1;visibility:visible;transition:opacity var(--dur) var(--ease),visibility 0s}
.theater .vw{transform:scale(.96);transition:transform var(--dur) var(--ease)}
.theater.on .vw{transform:none}
.theater .lay{transition:opacity var(--dur) var(--ease),transform var(--dur) var(--ease);transform:translateY(var(--s1))}
.theater.on .lay{transform:none}
```

```js
// site.js open(): 포커스 이동을 전환 뒤로 (visibility 전환 중 focus() 무시 방지)
// 기존: $('.close', T).focus();
setTimeout(() => $('.close', T).focus(), RM ? 0 : 400);
// close(): 'on' 제거 후 비디오 정지는 그대로(페이드 중 마지막 프레임 유지)
```

### D3. 다음 카드 등장 조건 (P0) — `site.js timeupdate`

```js
// 기존: if (V.duration && V.duration - V.currentTime <= 8 && ...)
const LONG = V.duration >= 60;                        // 60초 미만 소재는 ended에서만
if (V.duration && LONG && V.duration - V.currentTime <= 8 && !el.next.classList.contains('on') && !el.next.dataset.dismissed && queue[idx + 1] && T.classList.contains('on')) { /* 기존 본문 */ }
```

```js
// ended 핸들러: reel 카운트다운 8 → 5
let left = 5; /* ... */ cd.style.setProperty('--p', (5 - left) * 20);
```

### D4. 카드 비율 체계 (P0) — `site.css` + `build.py`

```css
.card.wide{--cw:304px;--ca:16/9}                          /* 모든 영상 행 기본 */
.card.tall{--cw:calc(var(--u) * 21.5);--ca:9/16}          /* 172×306 ≈ 16:9 카드 높이 ×1.8 */
.card.sq{--cw:200px;--ca:1/1}                             /* 도구·앱 아이콘성 카드만 */
@media (max-width:760px){.card.wide{--cw:264px}.card.tall{--cw:calc(var(--u) * 16.5)}.card.sq{--cw:152px}}
```

```python
# build.py home(): 행 클래스 교체 + 세로 소재 분리
tall = [w for w in perf if (w.get('formats') or ['16:9'])[0] in ('9:16','4:5')]
perf16 = [w for w in perf if w not in tall]
rows = [row('대표 작업', rep, 'wide'), row('퍼포먼스 소재', perf16, 'wide'),
        row('세로 소재', tall, 'tall'), row('개인 작업', personal, 'wide'),
        row('도구 · 자동화', tools, 'sq', 'tools.html'), row('AI 생성', ai, 'wide'), row('기획 · 리서치', research, 'wide')]
# card(): img height = 338 if cls=='wide' else (1067 if cls=='tall' else 600)
```

### D5. 행 열 수·peek 고정 (P1) — 컨테이너 쿼리

```css
.row .trk{container-type:inline-size}
.row .sc{--n:6}
@container (max-width:1400px){.row .sc{--n:5}}
@container (max-width:1100px){.row .sc{--n:4}}
@container (max-width:800px){.row .sc{--n:3}}
@container (max-width:500px){.row .sc{--n:2}}
/* 카드 폭 = (컨테이너 − 좌우 패딩 − 간격×(n−1) − peek) / n  — 16:9·1:1 공통 */
.row .sc .card{width:calc((100cqw - var(--s5) * 2 - var(--s2) * (var(--n) - 1) - var(--peek)) / var(--n))}
.row .sc .card.tall{width:calc((100cqw - var(--s5) * 2 - var(--s2) * (var(--n) * 1.8 - 1) - var(--peek)) / (var(--n) * 1.8))}
@media (max-width:760px){.row .sc .card{width:calc((100cqw - var(--s2) * 2 - var(--s2) * (var(--n) - 1) - var(--peek)) / var(--n))}}
```

```js
// 화살표 스크롤 단위 0.8 → 0.9
sc.scrollBy({ left: -sc.clientWidth * .9, behavior: RM ? 'auto' : 'smooth' });
```

### D6. 호버 통합 (P1·P2)

```css
/* A·B 변주 통합: 1.03 + 그림자, 정보는 아래로 슬라이드(높이 변화 없음) */
.card .art{transition:box-shadow var(--dur) var(--ease),transform var(--dur) var(--ease)}
.card:hover .art,.card:focus-visible .art{transform:scale(1.03)}
.card .art video{transition:opacity var(--d-half) var(--ease)}
@media (prefers-reduced-motion:reduce){.card:hover .art,.card:focus-visible .art{transform:none}}
```

```js
// 지연 380 → 500
hovTimer = setTimeout(() => { /* 기존 */ }, 500);
```

### D7. 단축키 보강 (P1) — `site.js keydown`

```js
else if (/^[0-9]$/.test(k) && V.duration) V.currentTime = V.duration * (+k / 10);
else if (k === 'ArrowUp') { e.preventDefault(); V.volume = Math.min(1, V.volume + .05); V.muted = false; }
else if (k === 'ArrowDown') { e.preventDefault(); V.volume = Math.max(0, V.volume - .05); }
else if (k === 'Home') V.currentTime = 0; else if (k === 'End' && V.duration) V.currentTime = V.duration - .1;
else if (k === '?') $('.help', T).toggleAttribute('hidden');   // 단축키 시트 요소 추가 필요
```

### D8. 축소 모션 누수 제거 (P1)

```css
html{-webkit-text-size-adjust:100%}
@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
.card .art video{transition:opacity var(--d-half) var(--ease)}   /* 200ms 하드코딩 제거 */
```

```js
// 빌보드 루프 간격 700 → 토큰 연동
const GAP = RM ? 0 : 700;
loopT = setTimeout(() => { /* ... */ }, GAP);
```

### D9. 강조색 절제 (P1) — `build.py home()`

```python
# 빌보드 CTA: 빨강 → ink 채움. 빨강 채움은 내비 「쇼릴」 1개만 남는다
<button class="btn" data-open="{e(w["id"])}">{ico("play","sm")} 재생</button>
```

### D10. 빌보드 소리 토글 (P1)

```python
# build.py 슬라이드 dots 옆
<button class="snd" aria-label="소리 켜기" hidden>{ico("mute","sm")}</button>
```

```css
.bb .dots .snd{width:var(--tap);height:var(--tap);border-radius:50%;background:var(--bg-glass);backdrop-filter:blur(12px);display:grid;place-items:center;margin-left:var(--s1)}
```

```js
// play() 성공 시 snd.hidden=false; 클릭 = 사용자 제스처 → unmute 허용
snd.addEventListener('click', () => { const v = $('video', slides[i]); if (!v) return; v.muted = !v.muted; snd.innerHTML = ico(v.muted ? 'mute' : 'vol', 'sm'); snd.setAttribute('aria-label', v.muted ? '소리 켜기' : '소리 끄기'); if (!v.muted) stopHov(); });
// 슬라이드 전환·visibilitychange 시 muted=true로 복귀
```

### D11. 카드 글자 크기 (P0)

```css
.card .t{font-size:var(--t-sm)}
.card .s{font-size:var(--t-micro)}            /* 메타는 12.3 유지 가능, 색 60% */
.row .hd a{font-size:var(--t-sm)}
.chip{font-size:var(--t-sm)}
```

---

## E. 한계

- Netflix·YouTube·국내 OTT는 호버 지연·컨트롤 숨김·진행바 두께를 공식 문서로 내지 않는다. 이 표의 해당 값은 재현 글·실측 토큰(편차 큼: 호버 지연 0.65~2s, 확대 1.2~1.5×)이며, 공개 플레이어 기본값(JW 3s·video.js 2s·Livepeer 3s)으로 범위를 좁혔다.
- 웨이브·왓챠는 텍스트 자료에서 수치를 얻지 못했다(브랜드 서체·배너 수치 미확인). 쿠팡플레이는 10초 고정 탐색과 자동재생 토글만 확인.
- 티빙 수치는 실측 토큰 추출(oh-my-design)로, 호버·모션은 미캡처.
- 서드파티 DESIGN.md 류(webdesignhot·ndroussi·oppadu)는 서로 값이 다르다(Netflix 호버 1.05 / 1.4 / 1.5). 방향성(비율·절제·순서)만 신뢰하고 ms·px는 범위로 썼다.

---

## F. 출처

| # | 출처 | 종류 |
|---|---|---|
| S1 | https://developer.apple.com/design/human-interface-guidelines/layout | 공식(tvOS 안전영역·그리드) |
| S2 | https://developer.apple.com/design/human-interface-guidelines/focus-and-selection | 공식 |
| S3 | https://developer.apple.com/design/human-interface-guidelines/images | 공식(레이어드 이미지·패럴랙스) |
| S4 | https://developer.apple.com/design/human-interface-guidelines/playing-video | 공식(2초 로딩·0.5초 오버레이) |
| S5 | https://developer.apple.com/design/human-interface-guidelines/top-shelf | 공식(3~8장·3비율 규격) |
| S6 | https://developer.apple.com/design/human-interface-guidelines/typography | 공식(tvOS 29pt 등) |
| S7 | https://developer.apple.com/design/human-interface-guidelines/lockups | 공식 |
| S8 | https://developer.apple.com/design/human-interface-guidelines/motion | 공식 |
| S9 | https://developer.apple.com/videos/play/wwdc2019/211/ | 공식(WWDC19 "포스터 5초 홀드", 5~10개, 2~5분) |
| S10 | https://support.apple.com/guide/tvapp-mac/tv4130f48/mac | 공식(Appearance Light/Dark, Play Next Episode) |
| S11 | https://support.apple.com/guide/tvapp-mac/atvc572afcf3/mac | 공식(Mac 앱 단축키) |
| S12 | https://support.apple.com/en-my/guide/tvapp/atvb5e386e66/web | 공식(10초 스킵·컨트롤 숨김·PiP) |
| S13 | https://discussions.apple.com/thread/251586442 | 커뮤니티(Apple TV+ 브라우저 자동 다음화) |
| S14 | https://www.apfelpatient.com/generally/apple-redesigns-its-tv-app-whats-new-in-ios-26 | 기사(iOS 26 세로 포스터·플로팅 컨트롤) |
| S15 | https://developer.android.com/design/ui/tv/guides/styles/layouts | 공식(Android TV 그리드·카드 폭) |
| S16 | https://developer.android.com/design/ui/tv/guides/components/cards | 공식(16:9/1:1/2:3 용도, 20dp) |
| S17 | https://developer.android.com/design/ui/tv/guides/styles/focus-system | 공식(1.025/1.05/1.1×) |
| S18 | https://smashingmagazine.com/2025/09/designing-tv-principles-patterns-practical-guidance/ | 전문지(TV 베이스 24px, peek) |
| S19 | https://help.netflix.com/en/node/114059 | 공식(3편·90분) |
| S20 | https://www.nbcnews.com/tech/tech-news/netflix-enables-tv-marathons-post-play-feature-flna950475 | 기사(2012 포스트플레이 15초) |
| S21 | https://www.journaldugeek.com/2020/01/14/netflix-enchainer-episodes-vite/ | 기사(15→5초) |
| S22 | https://about.netflix.com/en/news/looking-back-on-the-origin-of-skip-intro-five-years-later | 공식(Skip Intro) |
| S23 | https://about.netflix.com/en/news/new-netflix-tv-experience-includes-video-previews-that-speed-your-next-selection | 공식(2016 비디오 프리뷰) |
| S24 | https://ixd.prattsi.org/2020/02/design-critique-netflix-web-version/ | UX 비평(음소거 토글·15초) |
| S25 | https://ixd.prattsi.org/2023/02/design-critique-netflix | UX 비평(호버 2초 이내·정보 순서) |
| S26 | https://css-tricks.com/how-to-re-create-a-nifty-netflix-animation-in-css/ | 재현(1.5×, 이웃 25%) |
| S27 | https://codefronts.com/snippets/tailwind-css-image-carousel/tailwind-netflix-style-row-carousel-hover-expand/ | 재현(1.32×, 300ms, 화살표 40px, 0.9 페이징) |
| S28 | https://raddy.dev/blog/netflix-carousel-using-css/ | 재현(5열, 1.2×, 250ms) |
| S29 | https://deepwiki.com/thecodedealer/netflix-clone/5.1-home-page-and-content-rows | 재현(650ms, 1.5×, 1/3~1/6) |
| S30 | https://www.webdesignhot.com/design.md/netflix/ | 실측 토큰(비공식) |
| S31 | https://www.webdesignhot.com/design.md/apple-tv/ | 실측 토큰(비공식) |
| S32 | https://github.com/ndroussi/design-md-for-ai/blob/main/design-md/netflix/DESIGN.md | 실측 토큰(비공식) |
| S33 | https://oh-my-design.kr/design-systems/netflix | 실측 토큰(비공식) |
| S34 | https://oh-my-design.kr/design-systems/tving | 실측 토큰(티빙 라이브 측정) |
| S35 | https://www.oppadu.com/tools/design-systems-site/brand/netflix.html | 토큰 가이드(비공식, 안티패턴) |
| S36 | https://greasyfork.org/en/scripts/372614-netflix-disable-auto-preview/code | 유저스크립트(DOM 클래스 `bob-card`·`jawBoneContainer`) |
| S37 | https://gist.github.com/sshh12/dda3a89514f850c459380b18b1f7eb7b | 리버스 엔지니어링(행 단위 미니모달 프리페치) |
| S38 | https://www.bgr.com/tech/netflix-iphone-app-update-video-previews/ | 기사(모바일 탭 재생·세로 30초) |
| S39 | https://techcrunch.com/2018/04/19/netflix-launches-30-second-preview-videos-on-mobile | 기사 |
| S40 | https://www.macrumors.com/2024/06/06/netflix-tv-app-redesign | 기사(타일 확장·이웃 밀기) |
| S41 | https://www.goodmorningamerica.com/culture/story/netflix-unveils-new-tv-experience-what-to-know-about-the-fresh-design-121555744 | 기사(2025 콜아웃 배지) |
| S42 | https://support.google.com/youtube/answer/7631406?hl=en | 공식(YouTube 단축키) |
| S43 | https://www.tubefilter.com/?p=98370 | 기사(YouTube 3초 호버 프리뷰) |
| S44 | https://chromeunboxed.com/how-to-disable-youtubes-super-annoying-inline-preview-feature-when-hovering-over-thumbnails/ | 기사(인라인 재생 설정) |
| S45 | https://developers.google.com/youtube/player_parameters | 공식 |
| S46 | https://alternativeto.net/news/2025/7/youtube-expands-redesigned-web-player-with-material-design-3-and-new-controls | 기사(2025 플레이어) |
| S47 | https://streamingvideopause.com/blog/netflix-keyboard-shortcuts/ | 3rd party(Netflix 단축키) |
| S48 | https://jwplayer-support-archive.netlify.com/questions/17181563-hide-controls-faster | 공식 지원(JW 3초) |
| S49 | https://docs.livepeer.org/sdks/react/player/Controls | 공식 문서(3000ms) |
| S50 | https://legacy.videojs.org/blog/hiding-and-showing-video-player-controls/ | 공식 블로그(2000ms) |
| S51 | https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md | 공식(M3 모션 토큰) |
| S52 | https://drafts.csswg.org/css-view-transitions-1/ | 표준(UA 0.25s) |
| S53 | https://developer.chrome.com/docs/web-platform/view-transitions/same-document | 공식 |
| S54 | https://developer.chrome.com/blog/autoplay | 공식(Chrome 자동재생 정책) |
| S55 | https://webkit.org/blog/6784/ | 공식(iOS 비디오 정책) |
| S56 | https://9to5mac.com/2025/10/02/disney-reveals-app-redesign-coming-soon-to-ios-and-tvos/ | 기사 |
| S57 | https://www.bgr.com/entertainment/netflix-movies-list-2019-great-but-disney-plus-fixes-worst-feature/ | 기사(Background Video 설정) |
| S58 | https://www.engadget.com/prime-video-gets-a-much-needed-ui-overhaul-with-a-new-content-bar-and-ai-recommendations-120019397.html | 기사 |
| S59 | https://blog.logrocket.com/ux-design/skeleton-loading-screen-design | 블로그(≈1초 기준) |
| S60 | https://www.datainterview.com/ab-testing-lab/hover-previews | 교육용 시뮬레이션(1.5초 — 실제 Netflix 수치 아님) |
| S61 | https://github.com/neutraltone/settee/issues/69 | 클론 스펙(15초 전·30초 최소) |
| S62 | https://2023.redalemeden.com/blog/2015/tvos-hig-tldr/ | 요약(2015 tvOS HIG: 밝은 배경 선호, 60/90px) |
| S63 | https://github.com/ehmo/platform-design-skills/blob/main/skills/tvos/SKILL.md | 3rd party(1.05~1.1×, 0.15s) |
| S64 | https://brunch.co.kr/@4e2b4f97d7214af/36 | 블로그(국내 OTT 사용성) |
| S65 | https://github.com/nix6839/coupang-play-enhancer | 오픈소스(쿠팡플레이 탐색 확장) |
| S66 | https://htechtree.com/%EC%BF%A0%ED%8C%A1-%ED%94%8C%EB%A0%88%EC%9D%B4-%EA%B1%B4%EB%84%88%EB%9B%B0%EA%B8%B0-%EC%84%A4%EC%A0%95%ED%95%98%EA%B8%B0-5%EC%B4%88-10%EC%B4%88-20%EC%B4%88/ | 블로그(10초 고정) |
| S67 | https://imore.com/music-movies-tv/apple-tv/apple-tv-app-is-getting-a-weird-design-change-that-nobody-asked-for | 기사(Up Next → 피처드) |
| S68 | https://www.cardveryview.com/%EC%BF%A0%ED%8C%A1%ED%94%8C%EB%A0%88%EC%9D%B4-%EC%9E%90%EB%8F%99%EC%9E%AC%EC%83%9D-%EC%97%B0%EC%86%8D%EC%9E%AC%EC%83%9D-%EB%81%84%EA%B8%B0-%EC%84%A4%EC%A0%95/ | 블로그(쿠팡플레이 자동재생 토글) |
