/**
 * KBO 크롤링 모듈 (Node.js / TypeScript)
 * KBO 공식 사이트에서 실시간 데이터를 크롤링합니다.
 */

import axios from "axios";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.koreabaseball.com";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Referer: "https://www.koreabaseball.com/",
};

// ─── 팀 컬러 & 이름 매핑 ────────────────────────────────────
export const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
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

function getTeamInfo(teamName: string) {
  for (const [key, colors] of Object.entries(TEAM_COLORS)) {
    if (teamName.includes(key)) {
      return { short: key, full: TEAM_FULL_NAMES[key] ?? teamName, colors };
    }
  }
  return { short: teamName, full: teamName, colors: { primary: "#666666", secondary: "#FFFFFF" } };
}

// ─── 메모리 캐시 (5분) ─────────────────────────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCached(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── 이닝 파싱 ("39 1/3" → 39.333) ──────────────────────
function parseInnings(ipStr: string): number {
  if (!ipStr) return 0;
  const parts = ipStr.trim().split(" ");
  if (parts.length === 1) return parseFloat(parts[0]) || 0;
  const whole = parseInt(parts[0]) || 0;
  const frac = parts[1];
  if (frac === "1/3") return whole + 1/3;
  if (frac === "2/3") return whole + 2/3;
  return whole;
}

async function fetchHtml(url: string, params?: Record<string, string>): Promise<cheerio.CheerioAPI> {
  const res = await axios.get(url, {
    headers: HEADERS,
    params,
    timeout: 15000,
    responseType: "text",
  });
  return cheerio.load(res.data);
}

function parseRows($: cheerio.CheerioAPI): string[][] {
  const rows: string[][] = [];
  $("table tr").each((i, row) => {
    const cols: string[] = [];
    $(row).find("td").each((_, td) => {
      cols.push($(td).text().trim());
    });
    if (cols.length > 0) rows.push(cols);
  });
  return rows;
}

// ─── 최근 경기 결과 (일정 ajax 기반, 순서 보존) ─────────────
export type GameResult = "W" | "D" | "L";

interface ScheduleGame {
  date: string;
  away: string;
  home: string;
  awayResult: GameResult;
  homeResult: GameResult;
}

// "06.02(화)" → "20260602"
export function parseScheduleDate(dayText: string, season: string): string {
  const m = dayText.match(/(\d{1,2})\.(\d{1,2})/);
  if (!m) return "";
  return `${season}${m[1].padStart(2, "0")}${m[2].padStart(2, "0")}`;
}

function classToResult(cls?: string): GameResult | null {
  if (cls === "win") return "W";
  if (cls === "lose") return "L";
  if (cls === "same") return "D";
  return null;
}

// "<span>한화</span><em><span class='lose'>3</span><span>vs</span><span class='win'>5</span></em><span>두산</span>"
export function parsePlayCell(html: string): Omit<ScheduleGame, "date"> | null {
  const $ = cheerio.load(`<div id="r">${html}</div>`);
  const root = $("#r");
  const topSpans = root.children("span");
  if (topSpans.length < 2) return null;
  const away = topSpans.first().text().trim();
  const home = topSpans.last().text().trim();
  const scoreSpans = root.find("em > span").filter((_, el) => !!$(el).attr("class"));
  if (scoreSpans.length < 2) return null; // 미완료(예정/취소)
  const awayResult = classToResult($(scoreSpans[0]).attr("class"));
  const homeResult = classToResult($(scoreSpans[1]).attr("class"));
  if (!awayResult || !homeResult) return null;
  return { away, home, awayResult, homeResult };
}

async function fetchScheduleMonth(season: string, month: number): Promise<ScheduleGame[]> {
  const body = new URLSearchParams({
    leId: "1",
    srIdList: "0,9,6",
    seasonId: season,
    gameMonth: String(month).padStart(2, "0"),
    teamId: "",
  });
  const res = await axios.post(`${BASE_URL}/ws/Schedule.asmx/GetScheduleList`, body.toString(), {
    headers: {
      ...HEADERS,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${BASE_URL}/Schedule/Schedule.aspx`,
    },
    timeout: 15000,
  });
  const rows = (res.data?.rows ?? []) as Array<{ row: Array<{ Text: string; Class: string | null }> }>;
  const games: ScheduleGame[] = [];
  let curDate = "";
  for (const r of rows) {
    const cells = r.row || [];
    const dayCell = cells.find((c) => c.Class === "day");
    if (dayCell) curDate = parseScheduleDate(dayCell.Text, season);
    const playCell = cells.find((c) => c.Class === "play");
    if (!playCell) continue;
    const parsed = parsePlayCell(playCell.Text);
    if (!parsed) continue;
    games.push({ date: curDate, ...parsed });
  }
  return games;
}

// 각 팀의 최근 완료 10경기 결과 (왼쪽=오래된, 오른쪽=최신)
export async function getRecentGames(season = "2026"): Promise<Record<string, GameResult[]>> {
  const cacheKey = `recent_games_${season}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const seasonNum = parseInt(season);
  const now = new Date();
  const startMonth = now.getFullYear() === seasonNum ? now.getMonth() + 1 : 10;
  const teams = Object.keys(TEAM_FULL_NAMES);

  // 현재 월부터 역순으로 수집 (오래된 월을 앞에 붙여 시간 오름차순 유지)
  const allGames: ScheduleGame[] = [];
  for (let m = startMonth; m >= 3; m--) {
    try {
      const monthGames = await fetchScheduleMonth(season, m);
      allGames.unshift(...monthGames);
    } catch {
      // 해당 월 수집 실패 시 무시
    }
    const counts = new Map<string, number>();
    for (const g of allGames) {
      const a = getTeamInfo(g.away).short;
      const h = getTeamInfo(g.home).short;
      counts.set(a, (counts.get(a) || 0) + 1);
      counts.set(h, (counts.get(h) || 0) + 1);
    }
    if (teams.every((t) => (counts.get(t) || 0) >= 10)) break;
  }

  const result: Record<string, GameResult[]> = {};
  for (const teamShort of teams) {
    const last10 = allGames
      .filter((g) => getTeamInfo(g.away).short === teamShort || getTeamInfo(g.home).short === teamShort)
      .slice(-10);
    result[teamShort] = last10.map((g) =>
      getTeamInfo(g.away).short === teamShort ? g.awayResult : g.homeResult
    );
  }

  setCached(cacheKey, result);
  return result;
}

// ─── 팀 순위 ───────────────────────────────────────────────
export async function getTeamRank() {
  const cacheKey = "team_rank";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const $ = await fetchHtml(`${BASE_URL}/Record/TeamRank/TeamRankDaily.aspx`);
  const rows = parseRows($);

  let recentGames: Record<string, GameResult[]> = {};
  try {
    recentGames = await getRecentGames("2026");
  } catch {
    // 최근 경기 수집 실패 시 빈 값으로 진행
  }

  const data = rows.map((cols) => {
    const teamInfo = getTeamInfo(cols[1] ?? "");
    return {
      rank: parseInt(cols[0]) || 0,
      teamName: cols[1] ?? "",
      teamShort: teamInfo.short,
      teamFull: teamInfo.full,
      colors: teamInfo.colors,
      games: parseInt(cols[2]) || 0,
      wins: parseInt(cols[3]) || 0,
      losses: parseInt(cols[4]) || 0,
      draws: parseInt(cols[5]) || 0,
      winRate: cols[6] ?? "",
      gameBehind: cols[7] ?? "",
      recentTen: cols[8] ?? "",
      streak: cols[9] ?? "",
      recentGames: recentGames[teamInfo.short] ?? [],
      home: cols[10] ?? "",
      away: cols[11] ?? "",
    };
  }).filter(r => r.rank > 0);

  const result = { data, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

// ─── 타자 기본 기록 (Basic1: AVG, HR, RBI, H 등) ───────────
export async function getHitters(season = "2026", page = 1) {
  const cacheKey = `hitters_${season}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const $ = await fetchHtml(`${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`, {
    leagueId: "1", seasonId: season, currentPage: String(page),
  });
  const rows = parseRows($);

  // 컬럼: 순위|선수명|팀명|AVG|G|PA|AB|R|H|2B|3B|HR|TB|RBI|SAC|SF
  const data = rows.map((cols) => {
    const teamInfo = getTeamInfo(cols[2] ?? "");
    return {
      rank: parseInt(cols[0]) || 0,
      playerName: cols[1] ?? "",
      teamName: cols[2] ?? "",
      teamShort: teamInfo.short,
      colors: teamInfo.colors,
      avg: cols[3] ?? "0",
      games: parseInt(cols[4]) || 0,
      pa: parseInt(cols[5]) || 0,
      ab: parseInt(cols[6]) || 0,
      runs: parseInt(cols[7]) || 0,
      hits: parseInt(cols[8]) || 0,
      doubles: parseInt(cols[9]) || 0,
      triples: parseInt(cols[10]) || 0,
      hr: parseInt(cols[11]) || 0,
      tb: parseInt(cols[12]) || 0,
      rbi: parseInt(cols[13]) || 0,
      sac: parseInt(cols[14]) || 0,
      sf: parseInt(cols[15]) || 0,
    };
  }).filter(r => r.rank > 0 && r.playerName);

  const result = { data, season, page, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

// ─── 타자 OPS 기록 (Basic2: OBP, SLG, OPS, BB, SO 등) ──────
export async function getHittersOps(season = "2026", page = 1) {
  const cacheKey = `hitters_ops_${season}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const $ = await fetchHtml(`${BASE_URL}/Record/Player/HitterBasic/Basic2.aspx`, {
    leagueId: "1", seasonId: season, currentPage: String(page),
  });
  const rows = parseRows($);

  // 컬럼: 순위|선수명|팀명|AVG|BB|IBB|HBP|SO|GDP|SLG|OBP|OPS|MH|RISP|PH-BA
  const data = rows.map((cols) => {
    const teamInfo = getTeamInfo(cols[2] ?? "");
    return {
      rank: parseInt(cols[0]) || 0,
      playerName: cols[1] ?? "",
      teamName: cols[2] ?? "",
      teamShort: teamInfo.short,
      colors: teamInfo.colors,
      avg: cols[3] ?? "0",
      bb: parseInt(cols[4]) || 0,
      ibb: parseInt(cols[5]) || 0,
      hbp: parseInt(cols[6]) || 0,
      so: parseInt(cols[7]) || 0,
      gdp: parseInt(cols[8]) || 0,
      slg: cols[9] ?? "0",
      obp: cols[10] ?? "0",
      ops: cols[11] ?? "0",
    };
  }).filter(r => r.rank > 0 && r.playerName);

  const result = { data, season, page, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

// ─── 타자 통합 데이터 (Basic1 + Basic2 병합) ───────────────
export async function getHittersCombined(season = "2026", page = 1) {
  const cacheKey = `hitters_combined_${season}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [basic1, basic2] = await Promise.all([
    getHitters(season, page),
    getHittersOps(season, page),
  ]);

  // playerName 기준으로 병합
  const opsMap = new Map<string, any>();
  for (const p of basic2.data) {
    opsMap.set(p.playerName, p);
  }

  const data = basic1.data.map((p: any) => {
    const ops = opsMap.get(p.playerName) || {};
    // 세이버메트릭스 계산
    const bbPct = p.pa > 0 ? ((ops.bb || 0) / p.pa * 100).toFixed(1) : "0.0";
    const kPct = p.pa > 0 ? ((ops.so || 0) / p.pa * 100).toFixed(1) : "0.0";
    const iso = ops.slg && p.avg
      ? (parseFloat(ops.slg) - parseFloat(p.avg)).toFixed(3)
      : "0.000";
    // BABIP = (H - HR) / (AB - SO - HR + SF)
    const babipDenom = p.ab - (ops.so || 0) - p.hr + p.sf;
    const babip = babipDenom > 0
      ? ((p.hits - p.hr) / babipDenom).toFixed(3)
      : "0.000";

    return {
      ...p,
      bb: ops.bb || 0,
      ibb: ops.ibb || 0,
      hbp: ops.hbp || 0,
      so: ops.so || 0,
      gdp: ops.gdp || 0,
      slg: ops.slg || "0",
      obp: ops.obp || "0",
      ops: ops.ops || "0",
      // 계산된 세이버메트릭스
      bbPct,
      kPct,
      iso,
      babip,
    };
  });

  const result = { data, season, page, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

// ─── 투수 기록 ─────────────────────────────────────────────
export async function getPitchers(season = "2026", page = 1) {
  const cacheKey = `pitchers_${season}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const $ = await fetchHtml(`${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`, {
    leagueId: "1", seasonId: season, currentPage: String(page),
  });
  const rows = parseRows($);

  // 컬럼: 순위|선수명|팀명|ERA|G|W|L|SV|HLD|WPCT|IP|H|HR|BB|HBP|SO|R|ER|WHIP
  const data = rows.map((cols) => {
    const teamInfo = getTeamInfo(cols[2] ?? "");
    const ipStr = cols[10] || "0";
    const ip = parseInnings(ipStr);
    const so = parseInt(cols[15]) || 0;
    const bb = parseInt(cols[13]) || 0;
    const hr = parseInt(cols[12]) || 0;
    const hbp = parseInt(cols[14]) || 0;

    // 세이버메트릭스 계산 (정확한 이닝 파싱 적용)
    const k9 = ip > 0 ? (so / ip * 9).toFixed(2) : "0.00";
    const bb9 = ip > 0 ? (bb / ip * 9).toFixed(2) : "0.00";
    const hr9 = ip > 0 ? (hr / ip * 9).toFixed(2) : "0.00";
    // FIP = (13*HR + 3*(BB+HBP) - 2*SO) / IP + 상수(3.10)
    const fip = ip > 0
      ? ((13 * hr + 3 * (bb + hbp) - 2 * so) / ip + 3.10).toFixed(2)
      : "0.00";

    return {
      rank: parseInt(cols[0]) || 0,
      playerName: cols[1] ?? "",
      teamName: cols[2] ?? "",
      teamShort: teamInfo.short,
      colors: teamInfo.colors,
      era: cols[3] ?? "0.00",
      games: parseInt(cols[4]) || 0,
      wins: parseInt(cols[5]) || 0,
      losses: parseInt(cols[6]) || 0,
      saves: parseInt(cols[7]) || 0,
      holds: parseInt(cols[8]) || 0,
      wpct: cols[9] ?? "0",
      ip: cols[10] ?? "0",
      hits: parseInt(cols[11]) || 0,
      hr,
      bb,
      hbp,
      so,
      runs: parseInt(cols[16]) || 0,
      er: parseInt(cols[17]) || 0,
      whip: cols[18] ?? "0.00",
      // 세이버메트릭스
      k9,
      bb9,
      hr9,
      fip,
    };
  }).filter(r => r.rank > 0 && r.playerName);

  const result = { data, season, page, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

// ─── 통합 리더보드 ─────────────────────────────────────────
export async function getLeaderboard(
  category: string,
  season = "2026",
  team?: string,
  limit = 30
) {
  const pitcherStats = new Set(["era", "wins", "so", "whip", "saves", "holds", "ip", "k9", "bb9", "hr9", "fip"]);
  const basic1Stats = new Set(["hr", "rbi", "hits", "runs", "doubles", "triples", "tb"]);

  let rawData: any[];

  if (pitcherStats.has(category)) {
    const res = await getPitchers(season);
    rawData = res.data;
  } else if (basic1Stats.has(category)) {
    const res = await getHitters(season);
    rawData = res.data;
  } else {
    // avg, ops, obp, slg, bb%, k%, iso, babip → 통합 데이터
    const res = await getHittersCombined(season);
    rawData = res.data;
  }

  if (team) {
    rawData = rawData.filter(
      (p: any) => p.teamName?.includes(team) || p.teamShort?.includes(team)
    );
  }

  const lowerBetter = new Set(["era", "whip", "fip", "bb9", "hr9", "kPct"]);
  rawData = [...rawData].sort((a: any, b: any) => {
    const va = parseFloat(String(a[category] ?? "0")) || 0;
    const vb = parseFloat(String(b[category] ?? "0")) || 0;
    return lowerBetter.has(category) ? va - vb : vb - va;
  });

  const data = rawData.slice(0, limit).map((item: any, i: number) => ({
    ...item,
    leaderboardRank: i + 1,
  }));

  return { data, category, season, updatedAt: new Date().toISOString() };
}

// ─── 선수 검색 ─────────────────────────────────────────────
export async function searchPlayers(q: string, season = "2026") {
  const [hitterRes, pitcherRes] = await Promise.all([
    getHittersCombined(season),
    getPitchers(season),
  ]);

  const results: any[] = [];

  for (const p of hitterRes.data) {
    if ((p as any).playerName?.includes(q) || (p as any).teamName?.includes(q)) {
      results.push({ ...p, type: "hitter" });
    }
  }
  for (const p of pitcherRes.data) {
    if ((p as any).playerName?.includes(q) || (p as any).teamName?.includes(q)) {
      results.push({ ...p, type: "pitcher" });
    }
  }

  return { data: results.slice(0, 20), query: q };
}
