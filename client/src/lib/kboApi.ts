/**
 * KBO Stats API 클라이언트
 * FastAPI 크롤링 서버와 통신합니다.
 */

const API_BASE = import.meta.env.VITE_KBO_API_URL || "/api/kbo";

async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const base = API_BASE.startsWith('http') ? API_BASE : window.location.origin + API_BASE;
  const url = new URL(`${base}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API 오류: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── 타입 정의 ──────────────────────────────────────────────

export interface TeamColors {
  primary: string;
  secondary: string;
}

export interface TeamRank {
  rank: number;
  teamName: string;
  teamShort: string;
  teamFull: string;
  colors: TeamColors;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: string;
  gameBehind: string;
  recentTen: string;
  streak: string;
  home: string;
  away: string;
}

export interface Hitter {
  rank: number;
  leaderboardRank?: number;
  playerName: string;
  teamName: string;
  teamShort: string;
  colors: TeamColors;
  avg: string;
  games: number;
  pa: number;
  ab: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  tb: number;
  rbi: number;
  sac: number;
  sf: number;
  obp?: string;
  slg?: string;
  ops?: string;
  bb?: number;
  ibb?: number;
  hbp?: number;
  so?: number;
  sb?: number;
  cs?: number;
  gdp?: number;
  // 세이버메트릭스
  bbPct?: string;   // BB%
  kPct?: string;    // K%
  iso?: string;     // 순수장타율
  babip?: string;   // 인플레이 타구 타율
}

export interface Pitcher {
  rank: number;
  leaderboardRank?: number;
  playerName: string;
  teamName: string;
  teamShort: string;
  colors: TeamColors;
  era: string;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  wpct: string;
  ip: string;
  hits: number;
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  runs: number;
  er: number;
  whip: string;
  // 세이버메트릭스
  k9?: string;    // 9이닝당 탈삼진
  bb9?: string;   // 9이닝당 볼넷
  hr9?: string;   // 9이닝당 피홈런
  fip?: string;   // 수비무관 평균자책점
}

export interface Schedule {
  gameDate: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | string;
  awayScore?: number | string;
  stadium?: string;
  status?: string;
  gameTime?: string;
}

export interface ApiResponse<T> {
  data: T[];
  updatedAt: string;
}

export interface LeaderboardResponse<T> {
  data: T[];
  category: string;
  season: string;
  updatedAt: string;
}

// ─── API 함수 ────────────────────────────────────────────────

export const kboApi = {
  /** 팀 순위 */
  getTeamRank: () =>
    fetchApi<{ data: TeamRank[]; updatedAt: string }>("/team-rank"),

  /** 타자 기록 */
  getHitters: (season = "2026", page = 1) =>
    fetchApi<ApiResponse<Hitter>>("/hitters", { season, page: String(page) }),

  /** 타자 기록 (OPS/OBP/SLG 포함) */
  getHittersOps: (season = "2026", page = 1) =>
    fetchApi<ApiResponse<Hitter>>("/hitters/ops", { season, page: String(page) }),

  /** 타자 통합 기록 (HR, RBI, H, OPS, OBP, SLG, BB%, K%, ISO, BABIP 모두 포함) */
  getHittersCombined: (season = "2026", page = 1) =>
    fetchApi<ApiResponse<Hitter>>("/hitters/combined", { season, page: String(page) }),

  /** 투수 기록 */
  getPitchers: (season = "2026", page = 1) =>
    fetchApi<ApiResponse<Pitcher>>("/pitchers", { season, page: String(page) }),

  /** 경기 일정/결과 */
  getSchedule: (gameDate?: string) =>
    fetchApi<ApiResponse<Schedule>>("/schedule", gameDate ? { game_date: gameDate } : {}),

  /** 통합 리더보드 */
  getLeaderboard: (category: string, season = "2026", team?: string, limit = 30) => {
    const params: Record<string, string> = { category, season, limit: String(limit) };
    if (team) params.team = team;
    return fetchApi<LeaderboardResponse<Hitter | Pitcher>>("/leaderboard", params);
  },

  /** 선수 검색 */
  searchPlayers: (q: string, season = "2026") =>
    fetchApi<{ data: (Hitter | Pitcher)[]; query: string }>("/search", { q, season }),

  /** 헬스체크 */
  health: () => fetchApi<{ status: string; timestamp: string }>("/health"),
};

// ─── 팀 컬러 유틸리티 ────────────────────────────────────────

export const TEAM_COLORS: Record<string, TeamColors> = {
  KIA:  { primary: "#EA0029", secondary: "#000000" },
  삼성: { primary: "#074CA1", secondary: "#FFFFFF" },
  LG:   { primary: "#C30037", secondary: "#000000" },
  두산: { primary: "#131230", secondary: "#ED1C24" },
  KT:   { primary: "#333333", secondary: "#ED1C24" },
  SSG:  { primary: "#CE0E2D", secondary: "#FFC600" },
  NC:   { primary: "#315288", secondary: "#C5985E" },
  롯데: { primary: "#041E42", secondary: "#D00F31" },
  한화: { primary: "#FF6600", secondary: "#000000" },
  키움: { primary: "#820024", secondary: "#000000" },
};

export const TEAM_FULL_NAMES: Record<string, string> = {
  KIA:  "KIA 타이거즈",
  삼성: "삼성 라이온즈",
  LG:   "LG 트윈스",
  두산: "두산 베어스",
  KT:   "KT 위즈",
  SSG:  "SSG 랜더스",
  NC:   "NC 다이노스",
  롯데: "롯데 자이언츠",
  한화: "한화 이글스",
  키움: "키움 히어로즈",
};

export function getTeamColor(teamName: string): TeamColors {
  for (const [key, colors] of Object.entries(TEAM_COLORS)) {
    if (teamName.includes(key)) return colors;
  }
  return { primary: "#666666", secondary: "#FFFFFF" };
}

export function getTeamShort(teamName: string): string {
  for (const key of Object.keys(TEAM_COLORS)) {
    if (teamName.includes(key)) return key;
  }
  return teamName;
}
