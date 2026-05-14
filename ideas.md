# KBO Stats 디자인 아이디어

## 세 가지 디자인 방향

<response>
<text>
## Idea A: "야간 경기장" — Dark Sports Analytics

**Design Movement**: 현대 스포츠 데이터 저널리즘 (The Athletic, ESPN Analytics)

**Core Principles**:
- 어두운 배경 위에 형광 강조색으로 데이터 포인트를 돋보이게 함
- 숫자와 차트가 주인공 — 타이포그래피로 데이터 계층 구조 표현
- 구단 컬러를 배지·바·하이라이트에만 제한적으로 사용해 충돌 방지
- 그리드 기반이지만 비대칭 카드 크기로 정보 위계 표현

**Color Philosophy**: 
- 배경: #0D0F14 (거의 검정에 가까운 네이비)
- 카드: #161B26
- 강조: #00E5FF (사이언) + 구단 컬러 포인트
- 텍스트: #E8EAF0 (주) / #6B7280 (보조)

**Layout Paradigm**: 
- 좌측 고정 사이드바 (아이콘+텍스트) + 우측 콘텐츠 영역
- 홈은 비대칭 Bento Grid (큰 카드 + 작은 카드 조합)

**Signature Elements**:
- 순위 바 차트에 구단 컬러 그라디언트
- 선수 스탯 카드에 미세한 글로우 이펙트
- 구단 로고 배경에 저채도 워터마크

**Interaction Philosophy**: 
- 호버 시 카드가 살짝 위로 뜨며 그림자 깊어짐
- 탭 전환 시 슬라이드 페이드

**Animation**: 
- 숫자 카운트업 애니메이션 (0 → 실제값)
- 차트 바가 아래에서 위로 성장
- 페이지 진입 시 카드 스태거(30ms 간격) 페이드인

**Typography System**: 
- Display: Bebas Neue (헤더, 큰 숫자)
- Body: Pretendard (한글 최적화)
- Mono: JetBrains Mono (기록 수치)
</text>
<probability>0.08</probability>
</response>

<response>
<text>
## Idea B: "신문 스코어보드" — Editorial Sports Newspaper

**Design Movement**: 스포츠 저널리즘 에디토리얼 (Sports Illustrated, 조선일보 스포츠)

**Core Principles**:
- 흰 배경 + 강한 타이포그래피 대비로 신문 느낌
- 데이터 밀도 높지만 여백으로 숨통 확보
- 컬러는 구단 포인트 컬러만 사용, 나머지는 흑백

**Color Philosophy**: 
- 배경: #FAFAF8 (따뜻한 흰색)
- 강조: 각 구단 컬러 (동적)
- 텍스트: #1A1A1A (헤드라인) / #4A4A4A (본문)

**Layout Paradigm**: 
- 상단 수평 네비게이션 + 신문 칼럼 그리드
- 비대칭 2-3 컬럼 레이아웃

**Signature Elements**:
- 굵은 세리프 헤드라인
- 구단 컬러 언더라인 강조
- 스코어보드 스타일 숫자 배치

**Interaction Philosophy**: 
- 클릭 시 즉각적인 반응, 애니메이션 최소화
- 데이터 중심, 인터랙션은 보조적

**Animation**: 
- 최소한의 페이드 전환
- 테이블 행 호버 하이라이트

**Typography System**: 
- Display: Playfair Display (헤드라인)
- Body: Noto Sans KR
- Numbers: Roboto Condensed
</text>
<probability>0.06</probability>
</response>

<response>
<text>
## Idea C: "디지털 스타디움" — Neon Data Dashboard

**Design Movement**: 사이버펑크 스포츠 HUD (MLB The Show, EA Sports)

**Core Principles**:
- 딥 네이비 배경에 네온 그린/오렌지 강조
- 데이터를 게임 HUD처럼 시각화
- 각진 UI 요소 + 글로우 이펙트

**Color Philosophy**: 
- 배경: #050A14
- 강조: #39FF14 (네온 그린) + #FF6B35 (오렌지)
- 카드: #0A1628 with 1px 네온 테두리

**Layout Paradigm**: 
- 전체 화면 활용 대시보드
- 중앙 집중형 히어로 + 사이드 패널

**Signature Elements**:
- 스캔라인 텍스처 오버레이
- 글로우 바 차트
- 픽셀 폰트 숫자

**Interaction Philosophy**: 
- 게임 UI처럼 즉각적이고 화려한 반응
- 클릭 시 펄스 이펙트

**Animation**: 
- 데이터 로딩 시 스캔 애니메이션
- 숫자 플리커 이펙트

**Typography System**: 
- Display: Orbitron (게임 HUD 느낌)
- Body: Share Tech Mono
</text>
<probability>0.05</probability>
</response>

---

## 선택: Idea A — "야간 경기장" Dark Sports Analytics

야구 데이터 사이트의 핵심은 **데이터 가독성**과 **몰입감**이다. 어두운 배경은 장시간 데이터를 볼 때 눈의 피로를 줄이고, 구단 컬러를 포인트로 활용하면 각 팀의 정체성을 자연스럽게 표현할 수 있다. The Athletic, Baseball Savant 같은 현대 스포츠 분석 사이트의 미학을 참고하되, KBO 특유의 구단 컬러 시스템을 적극 활용한다.
