# KBO Stats — AI 에이전트 컨텍스트 문서

> **최종 업데이트**: 2026-05-26
> **프로젝트명**: KBO Stats (한국 프로야구 기록실)
> **성격**: 개인 Toy 프로젝트 (학습 + 포트폴리오)

---

## 1. 프로젝트 개요

KBReport·Statiz 대비 직관적이고 현대적인 UI/UX를 갖춘 KBO 야구 기록 조회 웹사이트.
KBO 공식 사이트(koreabaseball.com)에서 실시간 크롤링하여 데이터를 제공함.

- **배포 URL**: https://kbo-stats-two.vercel.app/
- **GitHub**: https://github.com/everymode/kbo-stats
- **로컬 작업 경로**: `C:\Users\user\kbo-stats`
- **시즌**: 2026 KBO 리그 기준

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | React 19 + TypeScript + Vite 7 |
| **스타일링** | Tailwind CSS 4 + shadcn/ui + tw-animate-css |
| **라우팅** | Wouter (클라이언트 라우팅) |
| **차트** | Recharts (레이더 차트, 라인 차트) |
| **아이콘** | Lucide React |
| **서버** | Node.js + Express (server/index.ts) |
| **크롤링** | Axios + Cheerio (ASP.NET PostBack 방식) |
| **배포** | Vercel (Serverless Functions) |
| **패키지매니저** | pnpm |
| **DB (레거시)** | Drizzle ORM + MySQL (현재 미사용, 스키마만 존재) |

### 주요 의존성

- framer-motion (애니메이션)
- recharts (차트)
- cmdk (커맨드 팔레트)
- sonner (토스트)
- Inter 폰트 (Google Fonts)

---

## 3. 프로젝트 구조

```
kbo-stats/
├── api/
│   └── kbo.ts              ← Vercel Serverless Function (배포용 크롤링 API)
├── server/
│   ├── index.ts             ← Express 서버 (로컬 개발용)
│   └── kbo.ts               ← Node.js 크롤링 모듈
├── client/
│   ├── index.html
│   ├── public/
│   │   ├── logos/            ← 10개 구단 SVG 로고
│   │   └── sidebar/          ← 사이드바 로고 이미지
│   └── src/
│       ├── App.tsx            ← 라우트 정의 + ThemeProvider
│       ├── main.tsx           ← React 진입점
│       ├── index.css          ← 글로벌 CSS 테마 (다크/라이트)
│       ├── pages/
│       │   ├── Home.tsx       ← 대시보드 (팀 순위, 오늘의 리더)
│       │   ├── Leaderboard.tsx← 타자/투수 리더보드
│       │   ├── Teams.tsx      ← 10개 구단 카드형 목록
│       │   ├── Players.tsx    ← 선수 검색/목록 (타자/투수 탭)
│       │   ├── PlayerDetail.tsx← 선수 상세 (스탯 카드, 레이더 차트)
│       │   ├── Archive.tsx    ← 시즌 아카이브
│       │   ├── Glossary.tsx   ← 야구 용어 사전
│       │   └── NotFound.tsx   ← 404 페이지
│       ├── components/
│       │   ├── Layout.tsx     ← 글로벌 레이아웃 (사이드바 + 검색바 + 테마 토글)
│       │   ├── TeamBadge.tsx  ← 팀 배지 컴포넌트
│       │   └── ui/            ← shadcn/ui 컴포넌트들
│       ├── contexts/
│       │   └── ThemeContext.tsx← 다크/라이트 모드 컨텍스트
│       ├── hooks/
│       │   ├── useNavigate.ts
│       │   └── usePersistFn.ts
│       └── lib/
│           ├── kboApi.ts      ← API 클라이언트 (타입 정의 + fetch 함수)
│           ├── kboApi.test.ts ← 유틸리티 테스트
│           └── utils.ts       ← cn() 등 유틸리티
├── drizzle/
│   └── schema.ts             ← DB 스키마 (레거시, 현재 미사용)
├── shared/
│   └── const.ts               ← 공유 상수
├── vite.config.ts
├── todo.md                    ← 작업 진행 체크리스트
└── vercel.json                ← Vercel 배포 설정
```

---

## 4. 라우트 구조

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/` | Home | 대시보드 (팀 순위 테이블, 오늘의 리더) |
| `/leaderboard` | Leaderboard | 타자/투수 순위 (기본 + 세이버메트릭스) |
| `/teams` | Teams | 10개 구단 카드형 목록 + 순위 |
| `/teams/:team` | Teams | 팀 상세 |
| `/players` | Players | 선수 검색/필터/목록 |
| `/players/:name` | PlayerDetail | 선수 상세 (스탯 카드, 레이더 차트) |
| `/archive` | Archive | 시즌 아카이브 (연도별 순위, 수상자) |
| `/glossary` | Glossary | 야구 용어 사전 (기본 + 세이버메트릭스) |

**참고**: `/archive` 경로는 사이드바 네비게이션에서 주석 처리되어 있음 (숨김 상태).

---

## 5. API 엔드포인트

### Vercel Serverless (`api/kbo.ts`)

| action | 설명 | 주요 파라미터 |
|--------|------|-------------|
| `health` | 헬스체크 | - |
| `team-rank` | 팀 순위 | - |
| `hitters` | 타자 기본 기록 | `season`, `page` |
| `hitters-combined` | 타자 통합 (Basic1+Basic2) | `season`, `page` |
| `hitters-all` | 타자 전체 (~150명) | `season` |
| `hitters-ops` | 타자 OPS 기록 | `season`, `page` |
| `pitchers` | 투수 기록 | `season`, `page` |
| `pitchers-all` | 투수 전체 | `season` |
| `leaderboard` | 통합 리더보드 | `category`, `season`, `team`, `limit` |
| `search` | 선수 검색 | `q`, `season` |

### Express 서버 (`server/index.ts` — 로컬 개발)

```
GET /api/kbo/health
GET /api/kbo/team-rank
GET /api/kbo/hitters?season=2026&page=1
GET /api/kbo/hitters/combined?season=2026&page=1
GET /api/kbo/hitters/ops?season=2026&page=1
GET /api/kbo/pitchers?season=2026&page=1
GET /api/kbo/leaderboard?category=avg&season=2026&team=KIA&limit=30
GET /api/kbo/search?q=박성한&season=2026
```

### 클라이언트 API 클라이언트 (`client/src/lib/kboApi.ts`)

- `VITE_KBO_API_URL` 환경변수 또는 기본값 `/api/kbo` 사용
- 모든 요청은 `?action=` 쿼리 파라미터 방식

---

## 6. 데이터 흐름

```
KBO 공식 사이트 (ASP.NET WebForms)
    ↓ Axios + Cheerio 크롤링
    ↓ ASP.NET PostBack/쿠키 기반 페이지네이션
api/kbo.ts (Vercel) 또는 server/kbo.ts (로컬)
    ↓ 메모리 캐시 (5분 TTL)
    ↓ JSON REST API 응답
client/src/lib/kboApi.ts (fetch)
    ↓ React 컴포넌트 (useEffect + useState)
    ↓ UI 렌더링
```

- **캐싱**: 메모리 기반 (Map), 5분(300초) TTL
- **선수 사진**: 네이버 KBO CDN (`6ptotvmi5753.edge.naverncp.com`)
- **구단 로고**: 로컬 SVG (`/logos/*.svg`)

---

## 7. 완료된 기능 (todo.md 기준 — 모두 ✅)

### 백엔드
- [x] KBO 크롤링 (팀순위, 타자, 투수, 리더보드, 검색, 시즌아카이브)
- [x] Node.js Express 서버 통합
- [x] Vercel Serverless Function 배포

### 프론트엔드
- [x] 다크/라이트 모드 토글 (기본: 다크)
- [x] 사이드바 네비게이션 + 모바일 반응형
- [x] 전역 검색바 (선수명/팀명, 300ms 디바운스)
- [x] 홈 대시보드 (팀 순위, 오늘의 리더)
- [x] 리더보드 (타자/투수 탭, 세이버메트릭스 카테고리)
- [x] 10개 구단 카드형 목록
- [x] 선수 검색/필터/정렬 테이블
- [x] 선수 상세 (스탯 카드, 레이더 차트)
- [x] 시즌 아카이브 (연도별 순위, 수상자)
- [x] 용어 사전 (기본 + 세이버메트릭스)
- [x] 세이버메트릭스 계산 (BB%, K%, ISO, BABIP, FIP, K/9, BB/9, HR/9)
- [x] 카운트업/차트/스태거 애니메이션

---

## 8. 미구현/보류 사항

- [ ] 오늘 경기 결과/예정 카드 (가로 스크롤) — 기획서에 있으나 현재 홈에 미표시
- [ ] 트렌딩 선수 (최근 성적 급상승) — 기획서에 있으나 미구현
- [ ] 팀 비교 (2개 팀 나란히) — "추후 구현 예정"으로 표시
- [ ] 선수 비교 (최대 3명) — 기획서에 있으나 미구현
- [ ] 시즌 아카이브 — 사이드바에서 주석 처리 (숨김 상태)
- [ ] 연도별 성적 추이 라인 차트 — PlayerDetail 내 구현 여부 미확인
- [ ] 상대 전적 (투수 vs 타자) — 기획서에 있으나 미구현

---

## 9. 개발 명령어

```bash
# 로컬 개발 (프론트엔드)
pnpm dev                    # Vite 개발 서버 (포트 3000)

# 로컬 개발 (백엔드 Express)
# server/index.ts를 별도 실행 (포트 3001)
# vite.config.ts의 proxy가 /api/kbo → localhost:3001 프록시

# 빌드
pnpm build                  # Vite 빌드 + esbuild 서버 번들링

# 프로덕션 실행
pnpm start                  # NODE_ENV=production node dist/index.js

# 타입 체크
pnpm check                  # tsc --noEmit

# 포맷팅
pnpm format                 # prettier --write .
```

---

## 10. 디자인 컨벤션

- **기본 테마**: 다크 모드 (야간 경기장 느낌)
- **사이드바 배경**: `#1a2332` (고정)
- **폰트**: Inter (Google Fonts)
- **CSS 변수**: `client/src/index.css`에 다크/라이트 테마 토큰 정의
- **구단 컬러**: `TEAM_COLORS` 상수로 10개 구단 primary/secondary 매핑
- **카드 스타일**: `bg-card border border-border rounded-2xl`
- **아이콘**: Lucide React 사용
- **토스트**: Sonner 사용 (react-toastify 금지)
- **Link 컴포넌트**: Wouter `<Link>` — 내부에 `<a>` 중첩 금지

---

## 11. 크롤링 기술 참고

- **대상**: `https://www.koreabaseball.com` (ASP.NET WebForms)
- **페이지네이션**: ASP.NET `__EVENTTARGET` PostBack 방식 (쿠키 세션 유지 필요)
- **시즌 변경**: `ddlSeason` 드롭다운 PostBack으로 시즌 전환
- **User-Agent**: Chrome 120 위장
- **타임아웃**: 15초
- **주의**: KBO 사이트 구조 변경 시 파서 깨질 수 있음

---

## 12. 코딩 규칙

- shadcn/ui 컴포넌트는 `@/components/ui/*`에서 임포트
- Tailwind 유틸리티 + 컴포넌트 variants 조합 사용
- `client/src/index.css`의 `@layer base` 규칙 유지 (design tokens 보존)
- setState/navigation은 render phase에서 호출 금지 → `useEffect` 사용
- `<Select.Item>`은 반드시 비어있지 않은 `value` prop 필요
- `.container` 클래스는 auto-center + responsive padding 커스텀 적용됨
- `.flex` 클래스는 `min-width:0`, `min-height:0` 기본 적용됨
