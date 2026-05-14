/**
 * KBO 크롤링 모듈 — Vercel 서버리스 함수용
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

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
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

const TEAM_FULL_NAMES: Record<string, string> = {
  KIA:  "KIA 타이거즈",  삼성: "삼성 라이온즈",  LG:   "LG 트윈스",
  두산: "두산 베어스",   KT:   "KT 위즈",       SSG:  "SSG 랜더스",
  NC:   "NC 다이노스",  롯데: "롯데 자이언츠",  한화: "한화 이글스",
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

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCached(key: string, data: unknown) { cache.set(key, { data, ts: Date.now() }); }

function parseInnings(ipStr: string): number {
  if (!ipStr) return 0;
  const parts = ipStr.trim().split(" ");
  if (parts.length === 1) return parseFloat(parts[0]) || 0;
  const whole = parseInt(parts[0]) || 0;
  const frac = parts[1];
  if (frac === "1/3") return whole + 1 / 3;
  if (frac === "2/3") return whole + 2 / 3;
  return whole;
}

async function fetchHtml(url: string, params?: Record<string, string>): Promise<cheerio.CheerioAPI> {
  const res = await axios.get(url, { headers: HEADERS, params, timeout: 15000, responseType: "text" });
  return cheerio.load(res.data);
}

function parseRows($: cheerio.CheerioAPI): string[][] {
  const rows: string[][] = [];
  $("table tr").each((_i, row) => {
    const cols: string[] = [];
    $(row).find("td").each((_, td) => { cols.push($(td).text().trim()); });
    if (cols.length > 0) rows.push(cols);
  });
  return rows;
}

export async function getTeamRank() {
  const cacheKey = "team_rank";
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const $ = await fetchHtml(`${BASE_URL}/Record/TeamRank/TeamRankDaily.aspx`);
  const rows = parseRows($);
  const data = rows.map((cols) => {
    const ti = getTeamInfo(cols[1] ?? "");
    return {
      rank: parseInt(cols[0]) || 0, teamName: cols[1] ?? "", teamShort: ti.short, teamFull: ti.full, colors: ti.colors,
      games: parseInt(cols[2]) || 0, wins: parseInt(cols[3]) || 0, losses: parseInt(cols[4]) || 0, draws: parseInt(cols[5]) || 0,
      winRate: cols[6] ?? "", gameBehind: cols[7] ?? "", recentTen: cols[8] ?? "", streak: cols[9] ?? "", home: cols[10] ?? "", away: cols[11] ?? "",
    };
  }).filter(r => r.rank > 0);
  const result = { data, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

export async function getHitters(season = "2026", page = 1) {
  const cacheKey = `hitters_${season}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const $ = await fetchHtml(`${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`, { leagueId: "1", seasonId: season, currentPage: String(page) });
  const rows = parseRows($);
  const data = rows.map((cols) => {
    const ti = getTeamInfo(cols[2] ?? "");
    return {
      rank: parseInt(cols[0]) || 0, playerName: cols[1] ?? "", teamName: cols[2] ?? "", teamShort: ti.short, colors: ti.colors,
      avg: cols[3] ?? "0", games: parseInt(cols[4]) || 0, pa: parseInt(cols[5]) || 0, ab: parseInt(cols[6]) || 0,
      runs: parseInt(cols[7]) || 0, hits: parseInt(cols[8]) || 0, doubles: parseInt(cols[9]) || 0, triples: parseInt(cols[10]) || 0,
      hr: parseInt(cols[11]) || 0, tb: parseInt(cols[12]) || 0, rbi: parseInt(cols[13]) || 0, sac: parseInt(cols[14]) || 0, sf: parseInt(cols[15]) || 0,
    };
  }).filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

export async function getHittersOps(season = "2026", page = 1) {
  const cacheKey = `hitters_ops_${season}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const $ = await fetchHtml(`${BASE_URL}/Record/Player/HitterBasic/Basic2.aspx`, { leagueId: "1", seasonId: season, currentPage: String(page) });
  const rows = parseRows($);
  const data = rows.map((cols) => {
    const ti = getTeamInfo(cols[2] ?? "");
    return {
      rank: parseInt(cols[0]) || 0, playerName: cols[1] ?? "", teamName: cols[2] ?? "", teamShort: ti.short, colors: ti.colors,
      avg: cols[3] ?? "0", bb: parseInt(cols[4]) || 0, ibb: parseInt(cols[5]) || 0, hbp: parseInt(cols[6]) || 0,
      so: parseInt(cols[7]) || 0, gdp: parseInt(cols[8]) || 0, slg: cols[9] ?? "0", obp: cols[10] ?? "0", ops: cols[11] ?? "0",
    };
  }).filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

export async function getHittersCombined(season = "2026", page = 1) {
  const cacheKey = `hitters_combined_${season}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const [basic1, basic2] = await Promise.all([getHitters(season, page), getHittersOps(season, page)]);
  const opsMap = new Map<string, any>();
  for (const p of basic2.data) opsMap.set(p.playerName, p);
  const data = basic1.data.map((p: any) => {
    const ops = opsMap.get(p.playerName) || {};
    const bbPct = p.pa > 0 ? ((ops.bb || 0) / p.pa * 100).toFixed(1) : "0.0";
    const kPct = p.pa > 0 ? ((ops.so || 0) / p.pa * 100).toFixed(1) : "0.0";
    const iso = ops.slg && p.avg ? (parseFloat(ops.slg) - parseFloat(p.avg)).toFixed(3) : "0.000";
    const babipDenom = p.ab - (ops.so || 0) - p.hr + p.sf;
    const babip = babipDenom > 0 ? ((p.hits - p.hr) / babipDenom).toFixed(3) : "0.000";
    return { ...p, bb: ops.bb || 0, ibb: ops.ibb || 0, hbp: ops.hbp || 0, so: ops.so || 0, gdp: ops.gdp || 0, slg: ops.slg || "0", obp: ops.obp || "0", ops: ops.ops || "0", bbPct, kPct, iso, babip };
  });
  const result = { data, season, page, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

export async function getPitchers(season = "2026", page = 1) {
  const cacheKey = `pitchers_${season}_${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const $ = await fetchHtml(`${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`, { leagueId: "1", seasonId: season, currentPage: String(page) });
  const rows = parseRows($);
  const data = rows.map((cols) => {
    const ti = getTeamInfo(cols[2] ?? "");
    const ip = parseInnings(cols[10] || "0");
    const so = parseInt(cols[15]) || 0; const bb = parseInt(cols[13]) || 0;
    const hr = parseInt(cols[12]) || 0; const hbp = parseInt(cols[14]) || 0;
    const k9 = ip > 0 ? (so / ip * 9).toFixed(2) : "0.00";
    const bb9 = ip > 0 ? (bb / ip * 9).toFixed(2) : "0.00";
    const hr9 = ip > 0 ? (hr / ip * 9).toFixed(2) : "0.00";
    const fip = ip > 0 ? ((13 * hr + 3 * (bb + hbp) - 2 * so) / ip + 3.10).toFixed(2) : "0.00";
    return {
      rank: parseInt(cols[0]) || 0, playerName: cols[1] ?? "", teamName: cols[2] ?? "", teamShort: ti.short, colors: ti.colors,
      era: cols[3] ?? "0.00", games: parseInt(cols[4]) || 0, wins: parseInt(cols[5]) || 0, losses: parseInt(cols[6]) || 0,
      saves: parseInt(cols[7]) || 0, holds: parseInt(cols[8]) || 0, wpct: cols[9] ?? "0", ip: cols[10] ?? "0",
      hits: parseInt(cols[11]) || 0, hr, bb, hbp, so, runs: parseInt(cols[16]) || 0, er: parseInt(cols[17]) || 0, whip: cols[18] ?? "0.00",
      k9, bb9, hr9, fip,
    };
  }).filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() };
  setCached(cacheKey, result);
  return result;
}

export async function getLeaderboard(category: string, season = "2026", team?: string, limit = 30) {
  const pitcherStats = new Set(["era", "wins", "so", "whip", "saves", "holds", "ip", "k9", "bb9", "hr9", "fip"]);
  const basic1Stats = new Set(["hr", "rbi", "hits", "runs", "doubles", "triples", "tb"]);
  let rawData: any[];
  if (pitcherStats.has(category)) { rawData = (await getPitchers(season)).data; }
  else if (basic1Stats.has(category)) { rawData = (await getHitters(season)).data; }
  else { rawData = (await getHittersCombined(season)).data; }
  if (team) rawData = rawData.filter((p: any) => p.teamName?.includes(team) || p.teamShort?.includes(team));
  const lowerBetter = new Set(["era", "whip", "fip", "bb9", "hr9", "kPct"]);
  rawData = [...rawData].sort((a: any, b: any) => {
    const va = parseFloat(String(a[category] ?? "0")) || 0;
    const vb = parseFloat(String(b[category] ?? "0")) || 0;
    return lowerBetter.has(category) ? va - vb : vb - va;
  });
  const data = rawData.slice(0, limit).map((item: any, i: number) => ({ ...item, leaderboardRank: i + 1 }));
  return { data, category, season, updatedAt: new Date().toISOString() };
}

export async function searchPlayers(q: string, season = "2026") {
  const [hitterRes, pitcherRes] = await Promise.all([getHittersCombined(season), getPitchers(season)]);
  const results: any[] = [];
  for (const p of hitterRes.data) { if ((p as any).playerName?.includes(q) || (p as any).teamName?.includes(q)) results.push({ ...p, type: "hitter" }); }
  for (const p of pitcherRes.data) { if ((p as any).playerName?.includes(q) || (p as any).teamName?.includes(q)) results.push({ ...p, type: "pitcher" }); }
  return { data: results.slice(0, 20), query: q };
}
