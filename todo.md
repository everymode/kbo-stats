# KBO Stats 프로젝트 TODO

## 백엔드 (tRPC + 크롤링)
- [x] DB 스키마 정의 (크롤링 캐시 테이블: hitters, pitchers, teams, schedule)
- [x] KBO 크롤링 유틸리티 (Python FastAPI api/main.py)
- [x] tRPC 라우터: kbo.teamRank (팀 순위)
- [x] tRPC 라우터: kbo.hitters (타자 기록)
- [x] tRPC 라우터: kbo.pitchers (투수 기록)
- [x] tRPC 라우터: kbo.schedule (오늘 경기 일정/결과)
- [x] tRPC 라우터: kbo.playerDetail (선수 상세 기록)
- [x] tRPC 라우터: kbo.search (선수/팀 검색)
- [x] tRPC 라우터: kbo.seasonArchive (시즌 아카이브)

## 프론트엔드 레이아웃
- [x] 글로벌 CSS 테마 (다크 야간 경기장 테마, 구단 컬러 변수)
- [x] 폰트 설정 (Bebas Neue + Pretendard + JetBrains Mono)
- [x] 사이드바 네비게이션 레이아웃 컴포넌트
- [x] 상단 검색바 컴포넌트
- [x] 다크/라이트 모드 토글

## 홈 (대시보드)
- [x] 오늘 경기 결과/예정 카드 (가로 스크롤)
- [x] 팀 순위 미니 테이블
- [x] 오늘의 리더 (타율 1위, 홈런 1위, 탈삼진 1위)
- [x] 트렌딩 선수 카드

## 리더보드
- [x] 타자 순위 (AVG, HR, RBI, OPS, WAR)
- [x] 투수 순위 (ERA, W, SO, WHIP, WAR)
- [x] 하이브리드 바 차트 + 순위 UI
- [x] 필터 (시즌, 팀, 포지션, 최소 타석/이닝)
- [x] 탭 전환 (타자/투수/수비/주루)

## 선수 프로필
- [x] 선수 기본 정보 카드 (사진, 포지션, 소속팀)
- [x] 핵심 스탯 카드 (AVG, HR, RBI, OPS, WAR)
- [x] 연도별 성적 추이 라인 차트 (Recharts)
- [x] 능력치 레이더 차트 (컨택/파워/선구안/주루/수비)
- [x] 시즌별 상세 기록 테이블

## 팀 페이지
- [x] 10개 구단 카드형 목록
- [x] 팀 상세 (시즌 성적, 로스터, 최근 경기)
- [ ] 팀 비교 (2개 팀 나란히) — 추후 구현

## 시즌 아카이브
- [x] 연도 드롭다운 선택
- [x] 해당 시즌 팀 순위
- [x] 주요 수상자 (MVP, 신인왕, 골든글러브)

## 기록 용어 사전
- [x] 기본 용어 (AVG, ERA 등)
- [x] 세이버메트릭스 용어 (WAR, wOBA, FIP 등)
- [x] 계산 공식 설명

## 검색
- [x] 전역 검색바 (선수명/팀명)
- [x] 검색 결과 드롭다운

## 기타
- [x] 모바일 반응형 레이아웃
- [x] 숫자 카운트업 애니메이션
- [x] 차트 성장 애니메이션
- [x] 카드 스태거 페이드인 애니메이션
