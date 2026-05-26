/**
 * 2027 FA 예상 선수 데이터
 * 2026 시즌 종료 후 FA 자격 취득 예상 선수 목록
 * ※ 예측 데이터이며, 실제와 다를 수 있습니다.
 */

export interface FAPlayer {
  name: string;
  team: string;
  position: string;
  age: number;            // 2027 기준 만 나이
  serviceYears: number;   // 통산 연수
  type: "hitter" | "pitcher";
  role?: "starter" | "reliever" | "closer";
  isReFA: boolean;        // 재FA 여부
  previousSalary: number; // 직전 연봉 (억 단위)
  recentStats: {
    // 공통
    games?: number;
    // 타자
    avg?: string;
    hr?: number;
    rbi?: number;
    hits?: number;
    ops?: string;
    obp?: string;
    slg?: string;
    sb?: number;
    // 투수
    era?: string;
    wins?: number;
    losses?: number;
    saves?: number;
    holds?: number;
    ip?: string;
    whip?: string;
    so?: number;
    k9?: string;
  };
  awards: number; // 올스타/GG/MVP 등 수상 횟수
}

export const FA_PLAYERS_2027: FAPlayer[] = [
  // ═══ 타자 ═══
  {
    name: "구자욱",
    team: "삼성",
    position: "외야수",
    age: 33,
    serviceYears: 12,
    type: "hitter",
    isReFA: false,
    previousSalary: 8.5,
    recentStats: {
      games: 138, avg: ".310", hr: 18, rbi: 82,
      hits: 168, ops: ".878", obp: ".385", slg: ".493", sb: 12,
    },
    awards: 3,
  },
  {
    name: "강백호",
    team: "KT",
    position: "1루수",
    age: 27,
    serviceYears: 9,
    type: "hitter",
    isReFA: false,
    previousSalary: 7.0,
    recentStats: {
      games: 140, avg: ".275", hr: 28, rbi: 92,
      hits: 145, ops: ".865", obp: ".355", slg: ".510", sb: 3,
    },
    awards: 2,
  },
  {
    name: "노시환",
    team: "한화",
    position: "3루수",
    age: 26,
    serviceYears: 9,
    type: "hitter",
    isReFA: false,
    previousSalary: 6.0,
    recentStats: {
      games: 135, avg: ".272", hr: 30, rbi: 95,
      hits: 138, ops: ".870", obp: ".348", slg: ".522", sb: 2,
    },
    awards: 2,
  },
  {
    name: "김혜성",
    team: "키움",
    position: "유격수",
    age: 27,
    serviceYears: 9,
    type: "hitter",
    isReFA: false,
    previousSalary: 6.5,
    recentStats: {
      games: 142, avg: ".318", hr: 5, rbi: 52,
      hits: 182, ops: ".795", obp: ".390", slg: ".405", sb: 42,
    },
    awards: 3,
  },
  {
    name: "한유섬",
    team: "KIA",
    position: "외야수",
    age: 29,
    serviceYears: 9,
    type: "hitter",
    isReFA: false,
    previousSalary: 5.0,
    recentStats: {
      games: 130, avg: ".298", hr: 20, rbi: 78,
      hits: 155, ops: ".855", obp: ".370", slg: ".485", sb: 8,
    },
    awards: 1,
  },
  {
    name: "박건우",
    team: "두산",
    position: "외야수",
    age: 35,
    serviceYears: 13,
    type: "hitter",
    isReFA: true,
    previousSalary: 5.5,
    recentStats: {
      games: 125, avg: ".285", hr: 14, rbi: 65,
      hits: 140, ops: ".790", obp: ".358", slg: ".432", sb: 5,
    },
    awards: 2,
  },
  {
    name: "오지환",
    team: "LG",
    position: "유격수",
    age: 36,
    serviceYears: 15,
    type: "hitter",
    isReFA: true,
    previousSalary: 4.0,
    recentStats: {
      games: 118, avg: ".258", hr: 12, rbi: 52,
      hits: 115, ops: ".720", obp: ".330", slg: ".390", sb: 6,
    },
    awards: 1,
  },
  {
    name: "박민우",
    team: "NC",
    position: "유격수",
    age: 33,
    serviceYears: 11,
    type: "hitter",
    isReFA: false,
    previousSalary: 4.5,
    recentStats: {
      games: 132, avg: ".292", hr: 8, rbi: 48,
      hits: 150, ops: ".765", obp: ".365", slg: ".400", sb: 32,
    },
    awards: 1,
  },
  // ═══ 투수 ═══
  {
    name: "원태인",
    team: "삼성",
    position: "투수",
    age: 27,
    serviceYears: 9,
    type: "pitcher",
    role: "starter",
    isReFA: false,
    previousSalary: 7.0,
    recentStats: {
      games: 30, era: "3.12", wins: 15, losses: 7,
      ip: "185", whip: "1.12", so: 175, k9: "8.51",
      saves: 0, holds: 0,
    },
    awards: 3,
  },
  {
    name: "안우진",
    team: "키움",
    position: "투수",
    age: 27,
    serviceYears: 9,
    type: "pitcher",
    role: "starter",
    isReFA: false,
    previousSalary: 8.0,
    recentStats: {
      games: 30, era: "2.95", wins: 16, losses: 6,
      ip: "190", whip: "1.08", so: 195, k9: "9.24",
      saves: 0, holds: 0,
    },
    awards: 4,
  },
  {
    name: "김광현",
    team: "SSG",
    position: "투수",
    age: 38,
    serviceYears: 18,
    type: "pitcher",
    role: "starter",
    isReFA: true,
    previousSalary: 10.0,
    recentStats: {
      games: 28, era: "3.55", wins: 11, losses: 8,
      ip: "158", whip: "1.22", so: 140, k9: "7.97",
      saves: 0, holds: 0,
    },
    awards: 5,
  },
  {
    name: "고영표",
    team: "KT",
    position: "투수",
    age: 35,
    serviceYears: 13,
    type: "pitcher",
    role: "starter",
    isReFA: true,
    previousSalary: 6.0,
    recentStats: {
      games: 29, era: "3.82", wins: 12, losses: 9,
      ip: "165", whip: "1.28", so: 128, k9: "6.98",
      saves: 0, holds: 0,
    },
    awards: 2,
  },
  {
    name: "박세웅",
    team: "롯데",
    position: "투수",
    age: 28,
    serviceYears: 10,
    type: "pitcher",
    role: "starter",
    isReFA: false,
    previousSalary: 5.5,
    recentStats: {
      games: 30, era: "3.28", wins: 13, losses: 8,
      ip: "178", whip: "1.18", so: 155, k9: "7.84",
      saves: 0, holds: 0,
    },
    awards: 1,
  },
  {
    name: "정우영",
    team: "LG",
    position: "투수",
    age: 27,
    serviceYears: 9,
    type: "pitcher",
    role: "closer",
    isReFA: false,
    previousSalary: 5.0,
    recentStats: {
      games: 62, era: "2.18", wins: 3, losses: 2,
      ip: "66", whip: "0.98", so: 82, k9: "11.18",
      saves: 35, holds: 0,
    },
    awards: 2,
  },
  {
    name: "조상우",
    team: "키움",
    position: "투수",
    age: 30,
    serviceYears: 9,
    type: "pitcher",
    role: "closer",
    isReFA: false,
    previousSalary: 4.0,
    recentStats: {
      games: 58, era: "2.55", wins: 4, losses: 3,
      ip: "60", whip: "1.05", so: 72, k9: "10.80",
      saves: 30, holds: 0,
    },
    awards: 1,
  },
  {
    name: "최원준",
    team: "두산",
    position: "투수",
    age: 29,
    serviceYears: 9,
    type: "pitcher",
    role: "reliever",
    isReFA: false,
    previousSalary: 3.0,
    recentStats: {
      games: 60, era: "3.10", wins: 5, losses: 3,
      ip: "72", whip: "1.12", so: 75, k9: "9.38",
      saves: 2, holds: 24,
    },
    awards: 0,
  },
];
