/**
 * 2027 FA 예상 선수 데이터
 * 2026 시즌 종료 후 FA 자격 취득 예상 선수 목록
 *
 * 계약 규모: 최근 FA 비교 사례(엄상백·최원태·박해민·양의지·박동원 등) 기반 리서치 추정
 * ※ 최종 명단·등급·계약은 2026시즌 성적·부상·시장 상황에 따라 크게 달라질 수 있습니다.
 */

import type { FAGrade } from "@/lib/faCalc";

export interface FAPlayer {
  name: string;
  team: string;
  position: string;
  age: number;              // 2027 기준 (해당년도 − 출생년도)
  serviceYears: number;
  type: "hitter" | "pitcher";
  role?: "starter" | "reliever" | "closer";
  faType: string;
  expectedGrade: FAGrade;
  gradeNote?: string;
  previousSalary: number;   // 직전 연봉 (억)
  recentStats: {
    games?: number;
    avg?: string; hr?: number; rbi?: number; hits?: number;
    ops?: string; obp?: string; slg?: string; sb?: number;
    era?: string; wins?: number; losses?: number;
    saves?: number; holds?: number;
    ip?: string; whip?: string; so?: number; k9?: string;
  };
  awards: number;
  expectedContract: {
    years: string;         // "6년", "3+1년" 등
    totalAmount: number;   // 계약금+연봉+옵션 합산 최대총액 (억)
    rangeMin: number;      // 현실적 범위 최소 (억)
    rangeMax: number;      // 현실적 범위 최대 (억)
    rationale: string;     // 판단 근거 (비교 사례)
  };
}

export const FA_PLAYERS_2027: FAPlayer[] = [
  // ═══ A등급 ═══
  {
    name: "원태인",
    team: "삼성",
    position: "투수",
    age: 27,
    serviceYears: 9,
    type: "pitcher",
    role: "starter",
    faType: "신규 FA",
    expectedGrade: "A",
    gradeNote: "2026 연봉 10억, 삼성 내·리그 전체 상위권 충족",
    previousSalary: 10.0,
    recentStats: {
      games: 30, era: "3.12", wins: 15, losses: 7,
      ip: "185", whip: "1.12", so: 175, k9: "8.51",
      saves: 0, holds: 0,
    },
    awards: 3,
    expectedContract: {
      years: "6년",
      totalAmount: 180,
      rangeMin: 150,
      rangeMax: 220,
      rationale: "20대 중반 국내 에이스. 엄상백 4년 78억·최원태 4년 70억 대비 최상위. FA 보상금 최대 30억 보도",
    },
  },
  {
    name: "홍창기",
    team: "LG",
    position: "외야수",
    age: 34,
    serviceYears: 12,
    type: "hitter",
    faType: "신규 FA",
    expectedGrade: "A",
    gradeNote: "LG 비FA 선수 중 최고 연봉, 팀 3위권·전체 30위권 가능",
    previousSalary: 7.5,
    recentStats: {
      games: 132, avg: ".298", hr: 12, rbi: 68,
      hits: 152, ops: ".818", obp: ".375", slg: ".443", sb: 8,
    },
    awards: 3,
    expectedContract: {
      years: "5년",
      totalAmount: 110,
      rangeMin: 90,
      rangeMax: 130,
      rationale: "출루형 외야수 최대어. 5년 계약 시 100억대 필요 전망. LG 프랜차이즈 프리미엄",
    },
  },
  {
    name: "최지훈",
    team: "SSG",
    position: "외야수",
    age: 31,
    serviceYears: 10,
    type: "hitter",
    faType: "신규 FA",
    expectedGrade: "A",
    gradeNote: "FA 시장 중견수 최대어로 평가, 연봉 순위에 따라 A/B 경계 가능",
    previousSalary: 6.5,
    recentStats: {
      games: 138, avg: ".305", hr: 18, rbi: 75,
      hits: 162, ops: ".858", obp: ".372", slg: ".486", sb: 10,
    },
    awards: 2,
    expectedContract: {
      years: "5년",
      totalAmount: 90,
      rangeMin: 70,
      rangeMax: 110,
      rationale: "중견수·수비·주루 가치. 박해민 4년 65억 사례 대비 상향. 타격 상승 시 100억대 진입 가능",
    },
  },
  // ═══ A/B 경계 ═══
  {
    name: "구자욱",
    team: "삼성",
    position: "외야수",
    age: 34,
    serviceYears: 13,
    type: "hitter",
    faType: "비FA 다년계약 종료",
    expectedGrade: "B",
    gradeNote: "5년 120억 비FA 다년계약(2022~2026) 종료. A/B 경계, 보수적 B 표기",
    previousSalary: 8.5,
    recentStats: {
      games: 138, avg: ".310", hr: 18, rbi: 82,
      hits: 168, ops: ".878", obp: ".385", slg: ".493", sb: 12,
    },
    awards: 3,
    expectedContract: {
      years: "4년",
      totalAmount: 95,
      rangeMin: 80,
      rangeMax: 120,
      rationale: "기존 비FA 다년 5년 120억 기준점. 삼성 프랜차이즈 프리미엄. 나이·수비 포지션으로 원태인 대비 하향",
    },
  },
  // ═══ B등급 ═══
  {
    name: "박동원",
    team: "LG",
    position: "포수",
    age: 37,
    serviceYears: 15,
    type: "hitter",
    faType: "재FA",
    expectedGrade: "B",
    gradeNote: "2022년 FA 계약 종료. 직전 FA A/B → 재FA B등급 적용",
    previousSalary: 5.0,
    recentStats: {
      games: 112, avg: ".272", hr: 10, rbi: 48,
      hits: 108, ops: ".752", obp: ".345", slg: ".407",
    },
    awards: 2,
    expectedContract: {
      years: "3+1년",
      totalAmount: 60,
      rangeMin: 45,
      rangeMax: 75,
      rationale: "포수 희소성 프리미엄. 직전 FA 4년 65억 기준점. 재FA·나이 리스크 반영",
    },
  },
  {
    name: "정수빈",
    team: "두산",
    position: "외야수",
    age: 37,
    serviceYears: 16,
    type: "hitter",
    faType: "재FA",
    expectedGrade: "B",
    gradeNote: "2020년 FA 후 6년 계약 종료. 직전 FA A/B → 재FA B등급 적용",
    previousSalary: 4.5,
    recentStats: {
      games: 118, avg: ".278", hr: 3, rbi: 35,
      hits: 120, ops: ".720", obp: ".348", slg: ".372", sb: 18,
    },
    awards: 1,
    expectedContract: {
      years: "2+1년",
      totalAmount: 32,
      rangeMin: 25,
      rangeMax: 45,
      rationale: "중견수 수비·경험 가치. 박해민 4년 65억 대비 하향. 나이와 공격 생산성 반영",
    },
  },
  {
    name: "배정대",
    team: "KT",
    position: "외야수",
    age: 30,
    serviceYears: 9,
    type: "hitter",
    faType: "신규 FA",
    expectedGrade: "B",
    previousSalary: 2.6,
    recentStats: {
      games: 128, avg: ".278", hr: 12, rbi: 55,
      hits: 135, ops: ".768", obp: ".338", slg: ".430",
    },
    awards: 0,
    expectedContract: {
      years: "4년",
      totalAmount: 45,
      rangeMin: 35,
      rangeMax: 60,
      rationale: "중견수 수비·주전 경험. 심우준 4년 50억, 박해민 4년 65억 사이 구간",
    },
  },
  {
    name: "김민혁",
    team: "KT",
    position: "외야수",
    age: 31,
    serviceYears: 10,
    type: "hitter",
    faType: "신규 FA",
    expectedGrade: "B",
    gradeNote: "연봉 규모상 A 가능성 낮음, 팀 내 4~10위권 예상",
    previousSalary: 3.2,
    recentStats: {
      games: 125, avg: ".280", hr: 10, rbi: 50,
      hits: 128, ops: ".755", obp: ".335", slg: ".420",
    },
    awards: 0,
    expectedContract: {
      years: "3년",
      totalAmount: 27,
      rangeMin: 18,
      rangeMax: 35,
      rationale: "컨택형 외야수. 주전급 생산성 유지 시 30억대, 코너 외야 경쟁력 애매 시 20억대",
    },
  },
  // ═══ C등급 ═══
  {
    name: "김선빈",
    team: "KIA",
    position: "내야수",
    age: 37,
    serviceYears: 17,
    type: "hitter",
    faType: "다회차 FA (3회차)",
    expectedGrade: "C",
    gradeNote: "2019·2023년 FA 계약 이력. 세 번째 이상 FA는 C등급 적용",
    previousSalary: 3.0,
    recentStats: {
      games: 118, avg: ".285", hr: 1, rbi: 30,
      hits: 125, ops: ".680", obp: ".338", slg: ".342", sb: 8,
    },
    awards: 2,
    expectedContract: {
      years: "2년",
      totalAmount: 18,
      rangeMin: 10,
      rangeMax: 25,
      rationale: "다회차 FA·베테랑 내야수. 보상 부담 낮아 잔류형 단기 계약 가능성",
    },
  },
  {
    name: "김상수",
    team: "KT",
    position: "내야수",
    age: 38,
    serviceYears: 18,
    type: "hitter",
    faType: "다회차 FA",
    expectedGrade: "C",
    gradeNote: "삼성→KT FA 이력이 있는 다회차 FA, C등급 적용",
    previousSalary: 2.5,
    recentStats: {
      games: 108, avg: ".255", hr: 8, rbi: 40,
      hits: 100, ops: ".688", obp: ".315", slg: ".373",
    },
    awards: 1,
    expectedContract: {
      years: "2년",
      totalAmount: 16,
      rangeMin: 8,
      rangeMax: 22,
      rationale: "내야 멀티·베테랑 가치. 성적 유지 시 2년 보장, 하락 시 옵션 비중 확대",
    },
  },
  {
    name: "오태곤",
    team: "SSG",
    position: "내야수",
    age: 34,
    serviceYears: 12,
    type: "hitter",
    faType: "재FA",
    expectedGrade: "C",
    gradeNote: "2022년 FA 계약 종료. 직전 FA C등급 → 재FA도 C 적용",
    previousSalary: 2.5,
    recentStats: {
      games: 120, avg: ".262", hr: 8, rbi: 42,
      hits: 112, ops: ".708", obp: ".322", slg: ".386",
    },
    awards: 0,
    expectedContract: {
      years: "2년",
      totalAmount: 10,
      rangeMin: 6,
      rangeMax: 15,
      rationale: "멀티 포지션·백업/플래툰 가치. 주전 보장보다 활용도 계약",
    },
  },
  {
    name: "김성현",
    team: "SSG",
    position: "내야수",
    age: 38,
    serviceYears: 16,
    type: "hitter",
    faType: "다회차 FA",
    expectedGrade: "C",
    gradeNote: "기존 FA 이력이 있는 베테랑. 다회차·저연봉권 요건상 C",
    previousSalary: 2.0,
    recentStats: {
      games: 105, avg: ".250", hr: 5, rbi: 32,
      hits: 95, ops: ".662", obp: ".308", slg: ".354",
    },
    awards: 1,
    expectedContract: {
      years: "1+1년",
      totalAmount: 7,
      rangeMin: 4,
      rangeMax: 12,
      rationale: "베테랑 내야 백업. 보장액보다 옵션 비중 큰 구조 예상",
    },
  },
  {
    name: "배제성",
    team: "KT",
    position: "투수",
    age: 30,
    serviceYears: 9,
    type: "pitcher",
    role: "reliever",
    faType: "신규 FA",
    expectedGrade: "C",
    gradeNote: "최근 3년 평균 연봉 기준 A/B권으로 보기 어려움",
    previousSalary: 1.8,
    recentStats: {
      games: 55, era: "3.85", wins: 4, losses: 3,
      ip: "62", whip: "1.28", so: 50, k9: "7.26",
      saves: 0, holds: 12,
    },
    awards: 0,
    expectedContract: {
      years: "2년",
      totalAmount: 10,
      rangeMin: 6,
      rangeMax: 18,
      rationale: "선발·롱릴리프 활용 가능. 최근 성적 변동성이 커서 옵션형 계약 적합",
    },
  },
];
