import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import * as cheerio from "cheerio";

// ─── KBO 크롤링 코드 ──────────────────────────────────────
const BASE_URL = "https://www.koreabaseball.com";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Referer: "https://www.koreabaseball.com/",
};

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  KIA: { primary: "#EA0029", secondary: "#000000" }, 삼성: { primary: "#074CA1", secondary: "#FFFFFF" },
  LG: { primary: "#C30037", secondary: "#000000" }, 두산: { primary: "#131230", secondary: "#ED1C24" },
  KT: { primary: "#333333", secondary: "#ED1C24" }, SSG: { primary: "#CE0E2D", secondary: "#FFC600" },
  NC: { primary: "#315288", secondary: "#C5985E" }, 롯데: { primary: "#041E42", secondary: "#D00F31" },
  한화: { primary: "#FF6600", secondary: "#000000" }, 키움: { primary: "#820024", secondary: "#000000" },
};
const TEAM_FULL: Record<string, string> = {
  KIA: "KIA 타이거즈", 삼성: "삼성 라이온즈", LG: "LG 트윈스", 두산: "두산 베어스", KT: "KT 위즈",
  SSG: "SSG 랜더스", NC: "NC 다이노스", 롯데: "롯데 자이언츠", 한화: "한화 이글스", 키움: "키움 히어로즈",
};

function ti(name: string) {
  for (const [k, c] of Object.entries(TEAM_COLORS)) if (name.includes(k)) return { short: k, full: TEAM_FULL[k] ?? name, colors: c };
  return { short: name, full: name, colors: { primary: "#666", secondary: "#FFF" } };
}

const cache = new Map<string, { data: unknown; ts: number }>();
function gc(k: string) { const e = cache.get(k); return e && Date.now() - e.ts < 300000 ? e.data : null; }
function sc(k: string, d: unknown) { cache.set(k, { data: d, ts: Date.now() }); }

// 동일 키의 동시 요청이 중복 크롤링하지 않도록 진행 중인 Promise를 공유한다.
const inflight = new Map<string, Promise<unknown>>();
function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const ex = inflight.get(key); if (ex) return ex as Promise<T>;
  const p = (async () => { try { return await fn(); } finally { inflight.delete(key); } })();
  inflight.set(key, p);
  return p;
}

function pI(s: string) {
  if (!s) return 0; const p = s.trim().split(" ");
  if (p.length === 1) return parseFloat(p[0]) || 0;
  const w = parseInt(p[0]) || 0; return w + (p[1] === "1/3" ? 1/3 : p[1] === "2/3" ? 2/3 : 0);
}

async function fH(url: string, params?: Record<string, string>) {
  const r = await axios.get(url, { headers: HEADERS, params, timeout: 15000, responseType: "text" });
  return cheerio.load(r.data);
}

// 폼 필드 추출 헬퍼
function extractForm($: cheerio.CheerioAPI) {
  const fd: Record<string, string> = {};
  $('input[type="hidden"]').each((_: number, el: any) => {
    const n = $(el).attr('name'); if (n) fd[n] = ($(el).val() as string) || '';
  });
  $('select').each((_: number, el: any) => {
    const n = $(el).attr('name'); if (n) fd[n] = ($(el).find('option[selected]').val() as string) || '';
  });
  return fd;
}

// 시즌 변경이 필요한 경우 PostBack으로 가져오기
async function fHSeason(url: string, season: string) {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const currentYear = new Date().getFullYear().toString();
  const r1 = await axios.get(url, { headers: { ...HEADERS, 'User-Agent': UA }, params: { leagueId: '1' }, timeout: 15000, responseType: "text" });
  const $1 = cheerio.load(r1.data);
  if (season === currentYear) return $1;

  // 시즌 변경 PostBack
  const cookies = (r1.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]).join('; ');
  const fd = extractForm($1);
  fd['ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason'] = season;
  fd['__EVENTTARGET'] = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason';
  fd['__EVENTARGUMENT'] = '';
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(fd)) form.append(k, v);
  const r2 = await axios.post(url + '?leagueId=1', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, 'Referer': url, 'Cookie': cookies },
    timeout: 15000, responseType: 'text', validateStatus: (s: number) => s < 400,
  });
  return cheerio.load(r2.data);
}

// ASP.NET PostBack 페이지네이션 (쿠키 기반 세션 유지, 시즌 변경 지원)
async function fHPages(url: string, params: Record<string, string>, maxPages: number, season?: string) {
  const fullUrl = url + '?' + new URLSearchParams(params).toString();
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const currentYear = new Date().getFullYear().toString();

  // 1단계: GET page 1 + 쿠키/폼 추출
  const r1 = await axios.get(fullUrl, { headers: { ...HEADERS, 'User-Agent': UA }, timeout: 15000, responseType: "text" });
  let $cur = cheerio.load(r1.data);
  const cookies = (r1.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]).join('; ');

  // 1.5단계: 과거 시즌이면 시즌 변경 PostBack 후 새 page 1 획득
  if (season && season !== currentYear) {
    const fd = extractForm($cur);
    fd['ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason'] = season;
    fd['__EVENTTARGET'] = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason';
    fd['__EVENTARGUMENT'] = '';
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(fd)) form.append(k, v);
    const rS = await axios.post(fullUrl, form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, 'Referer': fullUrl, 'Cookie': cookies },
      timeout: 15000, responseType: 'text', validateStatus: (s: number) => s < 400,
    });
    $cur = cheerio.load(rS.data);
  }

  const results: cheerio.CheerioAPI[] = [$cur];
  if (maxPages <= 1) return results;

  // KBO pager는 한 그룹에 5개 페이지 번호(btnNo{p})만 노출하고,
  // 다음 그룹(6,11,16...)으로는 '다음' 버튼(btnNext)으로 이동해야 한다.
  const PFX = 'ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$';
  const firstKey = ($: cheerio.CheerioAPI) => { const r = pR($); return r[0]?.join('|') ?? ''; };
  const seenFirst = new Set<string>([firstKey($cur)]);

  // 2단계: pager를 따라 순차 페이지 이동
  let $page = $cur;
  for (let p = 2; p <= maxPages; p++) {
    const target = (p % 5 === 1) ? `${PFX}btnNext` : `${PFX}btnNo${p}`;
    const fd = extractForm($page);
    fd['__EVENTTARGET'] = target;
    fd['__EVENTARGUMENT'] = '';
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(fd)) form.append(k, v);

    try {
      const rN = await axios.post(fullUrl, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, 'Referer': fullUrl, 'Cookie': cookies },
        timeout: 15000, responseType: "text", validateStatus: (s: number) => s < 400,
      });
      const $N = cheerio.load(rN.data);
      const rows = pR($N);
      if (rows.length === 0) break; // 더 이상 데이터 없음
      const fk = firstKey($N);
      if (seenFirst.has(fk)) break; // 같은 페이지 반복 = 끝 도달
      seenFirst.add(fk);
      results.push($N);
      $page = $N;
    } catch { break; }
  }
  return results;
}

function pR($: cheerio.CheerioAPI) {
  const rows: string[][] = [];
  $("table tr").each((_i, row) => {
    const cols: string[] = []; $(row).find("td").each((_, td) => cols.push($(td).text().trim()));
    if (cols.length > 0) rows.push(cols);
  });
  return rows;
}

function pIds($: cheerio.CheerioAPI): Map<string, string> {
  const ids = new Map<string, string>();
  $("table tr td a").each((_: number, a: any) => {
    const href = $(a).attr("href") || "";
    const m = href.match(/playerId=(\d+)/);
    if (m) ids.set($(a).text().trim(), m[1]);
  });
  return ids;
}

const PHOTO_CDN = "https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/middle";

// ─── 네이버 선수 연도별 통산 기록 (스태티즈 출처 WAR/wRC+/wOBA 포함) ─────
const NAVER_API = "https://api-gw.sports.naver.com";
const NAVER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://m.sports.naver.com/",
  Origin: "https://m.sports.naver.com",
};

const num = (v: unknown) => { const n = parseFloat(String(v)); return Number.isFinite(n) ? n : 0; };
const teamName = (t: unknown) => { const s = String(t ?? ""); return /^\d+$/.test(s) ? "" : s; };

interface HitterSeason {
  year: string; team: string; isCareer: boolean;
  avg: string; games: number; ab: number; runs: number; hits: number; doubles: number; triples: number;
  hr: number; tb: number; rbi: number; sb: number; cs: number; bb: number; hbp: number; so: number; gdp: number;
  obp: number; slg: number; ops: number; isop: number; babip: number; woba: number; wrcPlus: number; war: number;
}
interface PitcherSeason {
  year: string; team: string; isCareer: boolean;
  era: number; games: number; wins: number; losses: number; saves: number; holds: number; ip: string;
  hits: number; hr: number; bb: number; hbp: number; so: number; runs: number; er: number;
  whip: number; k9: number; bb9: number; war: number; wpct: number; ops: number;
}

function mapHitterSeason(s: any): HitterSeason {
  return {
    year: String(s.gyear ?? ""), team: teamName(s.team), isCareer: String(s.gyear) === "통산",
    avg: String(s.hra ?? "0"), games: num(s.gamenum), ab: num(s.ab), runs: num(s.run), hits: num(s.hit),
    doubles: num(s.h2), triples: num(s.h3), hr: num(s.hr), tb: num(s.tb), rbi: num(s.rbi), sb: num(s.sb),
    cs: num(s.cs), bb: num(s.bb), hbp: num(s.hp), so: num(s.kk), gdp: num(s.gd),
    obp: num(s.obp), slg: num(s.slg), ops: num(s.ops), isop: num(s.isop), babip: num(s.babip),
    woba: num(s.woba), wrcPlus: num(s.wrcPlus), war: num(s.war),
  };
}
function mapPitcherSeason(s: any): PitcherSeason {
  return {
    year: String(s.gyear ?? ""), team: teamName(s.team), isCareer: String(s.gyear) === "통산",
    era: num(s.era), games: num(s.gamenum), wins: num(s.w), losses: num(s.l), saves: num(s.sv), holds: num(s.hold),
    ip: String(s.inn ?? "0"), hits: num(s.hit), hr: num(s.hr), bb: num(s.bb), hbp: num(s.hp), so: num(s.kk),
    runs: num(s.r), er: num(s.er), whip: num(s.whip), k9: num(s.k9), bb9: num(s.bb9),
    war: num(s.war), wpct: num(s.wra), ops: num(s.ops),
  };
}

async function getPlayerRecord(playerId: string) {
  const ck = `prec_${playerId}`;
  const c = gc(ck); if (c) return c;
  const res = await axios.get(`${NAVER_API}/players/kbo/${playerId}/playerend-record`, { headers: NAVER_HEADERS, timeout: 15000 });
  const r = res.data?.result ?? {};
  let rec = r.record;
  if (typeof rec === "string") { try { rec = JSON.parse(rec); } catch { rec = {}; } }
  const playerType: "hitter" | "pitcher" = r.playerType === "pitcher" ? "pitcher" : "hitter";
  const raw: any[] = Array.isArray(rec?.season) ? rec.season : [];
  // 연도 행만 오름차순(오래된→최근) 정렬, 통산 행은 맨 아래로
  const yearRows = raw.filter((s) => String(s.gyear) !== "통산");
  const careerRows = raw.filter((s) => String(s.gyear) === "통산");
  yearRows.sort((a, b) => num(a.gyear) - num(b.gyear));
  const ordered = [...yearRows, ...careerRows];
  const seasons = playerType === "pitcher" ? ordered.map(mapPitcherSeason) : ordered.map(mapHitterSeason);
  const result = { playerId, playerType, seasons, updatedAt: new Date().toISOString() };
  sc(ck, result);
  return result;
}

// ─── 최근 경기 결과 (일정 ajax 기반, 순서 보존) ─────────────
type GameResult = "W" | "D" | "L";
interface SchedGame { date: string; away: string; home: string; awayResult: GameResult; homeResult: GameResult; }

function parseSchedDate(t: string, season: string): string {
  const m = t.match(/(\d{1,2})\.(\d{1,2})/);
  return m ? `${season}${m[1].padStart(2, "0")}${m[2].padStart(2, "0")}` : "";
}
function clsToResult(cls?: string): GameResult | null {
  return cls === "win" ? "W" : cls === "lose" ? "L" : cls === "same" ? "D" : null;
}
function parsePlay(html: string): Omit<SchedGame, "date"> | null {
  const $ = cheerio.load(`<div id="r">${html}</div>`);
  const root = $("#r");
  const top = root.children("span");
  if (top.length < 2) return null;
  const away = top.first().text().trim();
  const home = top.last().text().trim();
  const scores = root.find("em > span").filter((_: number, el: any) => !!$(el).attr("class"));
  if (scores.length < 2) return null;
  const aScore = $(scores[0]).text().trim();
  const hScore = $(scores[1]).text().trim();
  const ar = clsToResult($(scores[0]).attr("class"));
  const hr = clsToResult($(scores[1]).attr("class"));
  if (!ar || !hr) return null;
  // 예정/미경기는 '0 vs 0' + class="same"으로 내려와 무승부(D)로 오인됨 → 제외
  if (ar === "D" && hr === "D" && aScore === "0" && hScore === "0") return null;
  return { away, home, awayResult: ar, homeResult: hr };
}
async function fetchSchedMonth(season: string, month: number): Promise<SchedGame[]> {
  const body = new URLSearchParams({ leId: "1", srIdList: "0,9,6", seasonId: season, gameMonth: String(month).padStart(2, "0"), teamId: "" });
  const res = await axios.post(`${BASE_URL}/ws/Schedule.asmx/GetScheduleList`, body.toString(), {
    headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", Referer: `${BASE_URL}/Schedule/Schedule.aspx` },
    timeout: 15000,
  });
  const rows = (res.data?.rows ?? []) as Array<{ row: Array<{ Text: string; Class: string | null }> }>;
  const games: SchedGame[] = [];
  let curDate = "";
  for (const r of rows) {
    const cells = r.row || [];
    const dayCell = cells.find((c) => c.Class === "day");
    if (dayCell) curDate = parseSchedDate(dayCell.Text, season);
    const playCell = cells.find((c) => c.Class === "play");
    if (!playCell) continue;
    const parsed = parsePlay(playCell.Text);
    if (!parsed) continue;
    games.push({ date: curDate, ...parsed });
  }
  return games;
}
async function getRecentGames(season = "2026"): Promise<Record<string, GameResult[]>> {
  const ck = `recent_games_${season}`;
  const cached = gc(ck); if (cached) return cached as Record<string, GameResult[]>;
  const seasonNum = parseInt(season);
  const now = new Date();
  const startMonth = now.getFullYear() === seasonNum ? now.getMonth() + 1 : 10;
  const teams = Object.keys(TEAM_FULL);
  const allGames: SchedGame[] = [];
  for (let m = startMonth; m >= 3; m--) {
    try { allGames.unshift(...(await fetchSchedMonth(season, m))); } catch { /* skip */ }
    const counts = new Map<string, number>();
    for (const g of allGames) {
      const a = ti(g.away).short, h = ti(g.home).short;
      counts.set(a, (counts.get(a) || 0) + 1);
      counts.set(h, (counts.get(h) || 0) + 1);
    }
    if (teams.every((t) => (counts.get(t) || 0) >= 10)) break;
  }
  const result: Record<string, GameResult[]> = {};
  for (const t of teams) {
    const last10 = allGames.filter((g) => ti(g.away).short === t || ti(g.home).short === t).slice(-10);
    result[t] = last10.map((g) => (ti(g.away).short === t ? g.awayResult : g.homeResult));
  }
  sc(ck, result);
  return result;
}

async function getTeamRank() {
  const c = gc("tr"); if (c) return c;
  const $ = await fH(`${BASE_URL}/Record/TeamRank/TeamRankDaily.aspx`);
  let recentGames: Record<string, GameResult[]> = {};
  try { recentGames = await getRecentGames("2026"); } catch { /* ignore */ }
  const data = pR($).map(c => {
    const t = ti(c[1] ?? "");
    return { rank: parseInt(c[0])||0, teamName: c[1]??"", teamShort: t.short, teamFull: t.full, colors: t.colors,
      games: parseInt(c[2])||0, wins: parseInt(c[3])||0, losses: parseInt(c[4])||0, draws: parseInt(c[5])||0,
      winRate: c[6]??"", gameBehind: c[7]??"", recentTen: c[8]??"", streak: c[9]??"", recentGames: recentGames[t.short] ?? [], home: c[10]??"", away: c[11]??"" };
  }).filter(r => r.rank > 0);
  const result = { data, updatedAt: new Date().toISOString() }; sc("tr", result); return result;
}

async function getHitters(season = "2026", page = 1) {
  const ck = `h_${season}_${page}`; const c = gc(ck); if (c) return c;
  const $ = await fHSeason(`${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`, season);
  const data = pR($).map(c => {
    const t = ti(c[2] ?? "");
    return { rank: parseInt(c[0])||0, playerName: c[1]??"", teamName: c[2]??"", teamShort: t.short, colors: t.colors,
      avg: c[3]??"0", games: parseInt(c[4])||0, pa: parseInt(c[5])||0, ab: parseInt(c[6])||0,
      runs: parseInt(c[7])||0, hits: parseInt(c[8])||0, doubles: parseInt(c[9])||0, triples: parseInt(c[10])||0,
      hr: parseInt(c[11])||0, tb: parseInt(c[12])||0, rbi: parseInt(c[13])||0, sac: parseInt(c[14])||0, sf: parseInt(c[15])||0 };
  }).filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() }; sc(ck, result); return result;
}

async function getHittersOps(season = "2026", page = 1) {
  const ck = `ho_${season}_${page}`; const c = gc(ck); if (c) return c;
  const $ = await fHSeason(`${BASE_URL}/Record/Player/HitterBasic/Basic2.aspx`, season);
  const data = pR($).map(c => {
    const t = ti(c[2] ?? "");
    return { rank: parseInt(c[0])||0, playerName: c[1]??"", teamName: c[2]??"", teamShort: t.short, colors: t.colors,
      avg: c[3]??"0", bb: parseInt(c[4])||0, ibb: parseInt(c[5])||0, hbp: parseInt(c[6])||0,
      so: parseInt(c[7])||0, gdp: parseInt(c[8])||0, slg: c[9]??"0", obp: c[10]??"0", ops: c[11]??"0" };
  }).filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() }; sc(ck, result); return result;
}

async function getHittersCombined(season = "2026", page = 1) {
  const ck = `hc_${season}_${page}`; const c = gc(ck); if (c) return c;
  const [b1, b2] = await Promise.all([getHitters(season, page), getHittersOps(season, page)]);
  const om = new Map<string, any>(); for (const p of b2.data) om.set(p.playerName, p);
  const data = b1.data.map((p: any) => {
    const o = om.get(p.playerName) || {};
    const bbPct = p.pa > 0 ? ((o.bb||0)/p.pa*100).toFixed(1) : "0.0";
    const kPct = p.pa > 0 ? ((o.so||0)/p.pa*100).toFixed(1) : "0.0";
    const iso = o.slg && p.avg ? (parseFloat(o.slg)-parseFloat(p.avg)).toFixed(3) : "0.000";
    const bd = p.ab-(o.so||0)-p.hr+p.sf;
    const babip = bd > 0 ? ((p.hits-p.hr)/bd).toFixed(3) : "0.000";
    return { ...p, bb: o.bb||0, ibb: o.ibb||0, hbp: o.hbp||0, so: o.so||0, gdp: o.gdp||0,
      slg: o.slg||"0", obp: o.obp||"0", ops: o.ops||"0", bbPct, kPct, iso, babip };
  });
  const result = { data, season, page, updatedAt: new Date().toISOString() }; sc(ck, result); return result;
}

async function getHittersAll(season = "2026") {
  const ck = `ha_${season}`; const c = gc(ck); if (c) return c;
  return dedup(ck, async () => {
  const url = `${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`;
  const pages$ = await fHPages(url, { leagueId: "1", sort: "Game_Cn" }, 15, season);
  const seen = new Set<string>(); const data: any[] = [];
  for (const $ of pages$) {
    const rows = pR($);
    const ids = pIds($);
    for (const c of rows) {
      const name = c[1] ?? "";
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const t = ti(c[2] ?? "");
      const pid = ids.get(name) || "";
      data.push({ rank: data.length + 1, playerName: name, teamName: c[2]??"", teamShort: t.short, colors: t.colors,
        playerId: pid, photoUrl: pid ? `${PHOTO_CDN}/${season}/${pid}.jpg` : "",
        avg: c[3]??"0", games: parseInt(c[4])||0, pa: parseInt(c[5])||0, ab: parseInt(c[6])||0,
        runs: parseInt(c[7])||0, hits: parseInt(c[8])||0, doubles: parseInt(c[9])||0, triples: parseInt(c[10])||0,
        hr: parseInt(c[11])||0, tb: parseInt(c[12])||0, rbi: parseInt(c[13])||0, sac: parseInt(c[14])||0, sf: parseInt(c[15])||0 });
    }
  }
  // OPS 데이터 병합
  try {
    const ops$ = await fHPages(`${BASE_URL}/Record/Player/HitterBasic/Basic2.aspx`, { leagueId: "1", sort: "Game_Cn" }, 15, season);
    const om = new Map<string, any>();
    for (const $ of ops$) { for (const c of pR($)) { const n = c[1]; if (n && !om.has(n)) om.set(n, { bb: parseInt(c[4])||0, ibb: parseInt(c[5])||0, hbp: parseInt(c[6])||0, so: parseInt(c[7])||0, gdp: parseInt(c[8])||0, slg: c[9]??"0", obp: c[10]??"0", ops: c[11]??"0" }); } }
    for (const p of data) {
      const o = om.get(p.playerName) || {};
      p.bb = o.bb||0; p.ibb = o.ibb||0; p.hbp = o.hbp||0; p.so = o.so||0; p.gdp = o.gdp||0;
      p.slg = o.slg||"0"; p.obp = o.obp||"0"; p.ops = o.ops||"0";
      p.bbPct = p.pa > 0 ? ((o.bb||0)/p.pa*100).toFixed(1) : "0.0";
      p.kPct = p.pa > 0 ? ((o.so||0)/p.pa*100).toFixed(1) : "0.0";
      p.iso = o.slg && p.avg ? (parseFloat(o.slg)-parseFloat(p.avg)).toFixed(3) : "0.000";
      const bd = p.ab-(o.so||0)-p.hr+p.sf;
      p.babip = bd > 0 ? ((p.hits-p.hr)/bd).toFixed(3) : "0.000";
    }
  } catch {}
  // 도루 데이터 병합 (Runner/Basic.aspx)
  try {
    const run$ = await fHPages(`${BASE_URL}/Record/Player/Runner/Basic.aspx`, { leagueId: "1", sort: "Game_Cn" }, 15, season);
    const rm = new Map<string, any>();
    for (const $ of run$) { for (const c of pR($)) { const n = c[1]; if (n && !rm.has(n)) rm.set(n, { sb: parseInt(c[5])||0, cs: parseInt(c[6])||0, sba: parseInt(c[4])||0 }); } }
    for (const p of data) { const r = rm.get(p.playerName) || {}; p.sb = r.sb||0; p.cs = r.cs||0; p.sba = r.sba||0; }
  } catch {}
  const result = { data, season, updatedAt: new Date().toISOString() }; sc(ck, result); return result;
  });
}

async function getPitchersAll(season = "2026") {
  const ck = `pa_${season}`; const c = gc(ck); if (c) return c;
  return dedup(ck, async () => {
  const url = `${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`;
  const pages$ = await fHPages(url, { leagueId: "1", sort: "Game_Cn" }, 15, season);
  const seen = new Set<string>(); const data: any[] = [];
  for (const $ of pages$) {
    const rows = pR($);
    const ids = pIds($);
    for (const c of rows) {
      const name = c[1] ?? "";
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const t = ti(c[2] ?? "");
      const ip = pI(c[10]||"0"); const so = parseInt(c[15])||0; const bb = parseInt(c[13])||0;
      const hr = parseInt(c[12])||0; const hbp = parseInt(c[14])||0;
      const pid = ids.get(name) || "";
      data.push({ rank: data.length + 1, playerName: name, teamName: c[2]??"", teamShort: t.short, colors: t.colors,
        playerId: pid, photoUrl: pid ? `${PHOTO_CDN}/${season}/${pid}.jpg` : "",
        era: c[3]??"0.00", games: parseInt(c[4])||0, wins: parseInt(c[5])||0, losses: parseInt(c[6])||0,
        saves: parseInt(c[7])||0, holds: parseInt(c[8])||0, wpct: c[9]??"0", ip: c[10]??"0",
        hits: parseInt(c[11])||0, hr, bb, hbp, so, runs: parseInt(c[16])||0, er: parseInt(c[17])||0, whip: c[18]??"0.00",
        k9: ip>0?(so/ip*9).toFixed(2):"0.00", bb9: ip>0?(bb/ip*9).toFixed(2):"0.00",
        hr9: ip>0?(hr/ip*9).toFixed(2):"0.00", fip: ip>0?((13*hr+3*(bb+hbp)-2*so)/ip+3.10).toFixed(2):"0.00" });
    }
  }
  const result = { data, season, updatedAt: new Date().toISOString() }; sc(ck, result); return result;
  });
}
async function getPitchers(season = "2026", page = 1) {
  const ck = `p_${season}_${page}`; const c = gc(ck); if (c) return c;
  const $ = await fHSeason(`${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`, season);
  const data = pR($).map(c => {
    const t = ti(c[2] ?? "");
    const ip = pI(c[10]||"0"); const so = parseInt(c[15])||0; const bb = parseInt(c[13])||0;
    const hr = parseInt(c[12])||0; const hbp = parseInt(c[14])||0;
    return { rank: parseInt(c[0])||0, playerName: c[1]??"", teamName: c[2]??"", teamShort: t.short, colors: t.colors,
      era: c[3]??"0.00", games: parseInt(c[4])||0, wins: parseInt(c[5])||0, losses: parseInt(c[6])||0,
      saves: parseInt(c[7])||0, holds: parseInt(c[8])||0, wpct: c[9]??"0", ip: c[10]??"0",
      hits: parseInt(c[11])||0, hr, bb, hbp, so, runs: parseInt(c[16])||0, er: parseInt(c[17])||0, whip: c[18]??"0.00",
      k9: ip>0?(so/ip*9).toFixed(2):"0.00", bb9: ip>0?(bb/ip*9).toFixed(2):"0.00",
      hr9: ip>0?(hr/ip*9).toFixed(2):"0.00", fip: ip>0?((13*hr+3*(bb+hbp)-2*so)/ip+3.10).toFixed(2):"0.00" };
  }).filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() }; sc(ck, result); return result;
}

async function getLeaderboard(cat: string, season = "2026", team?: string, limit = 30) {
  const ps = new Set(["era","wins","so","whip","saves","holds","ip","k9","bb9","hr9","fip"]);
  let rd: any[];
  if (ps.has(cat)) rd = (await getPitchersAll(season)).data;
  else rd = (await getHittersAll(season)).data;
  if (team) rd = rd.filter((p: any) => p.teamName?.includes(team)||p.teamShort?.includes(team));

  // 규정타석/규정이닝 필터 (비율 스탯에만 적용)
  const hRate = new Set(["avg","obp","slg","ops","iso","babip","bbPct","kPct"]);
  const pRate = new Set(["era","whip","fip","k9","bb9","hr9"]);
  if (hRate.has(cat)) {
    const maxG = Math.max(...rd.map((p: any) => p.games || 0), 1);
    const minPA = Math.floor(maxG * 3.1);
    rd = rd.filter((p: any) => (p.pa || 0) >= minPA);
  } else if (pRate.has(cat)) {
    const cy = new Date().getFullYear().toString();
    let tg = 144;
    if (season === cy) { try { const tr: any = await getTeamRank(); tg = Math.max(...tr.data.map((t: any) => t.games || 0)); } catch {} }
    rd = rd.filter((p: any) => pI(p.ip || "0") >= tg);
  }

  const lb = new Set(["era","whip","fip","bb9","hr9","kPct"]);
  rd = [...rd].sort((a: any,b: any) => { const va = parseFloat(String(a[cat]??"0"))||0; const vb = parseFloat(String(b[cat]??"0"))||0; return lb.has(cat)?va-vb:vb-va; });
  return { data: rd.slice(0,limit).map((i: any,idx: number)=>({...i,leaderboardRank:idx+1})), category: cat, season, updatedAt: new Date().toISOString() };
}

async function searchPlayers(q: string, season = "2026") {
  const [hr,pr] = await Promise.all([getHittersAll(season),getPitchersAll(season)]);
  const r: any[] = [];
  for (const p of hr.data) if ((p as any).playerName?.includes(q)||(p as any).teamName?.includes(q)) r.push({...p,type:"hitter"});
  for (const p of pr.data) if ((p as any).playerName?.includes(q)||(p as any).teamName?.includes(q)) r.push({...p,type:"pitcher"});
  return { data: r.slice(0,20), query: q };
}

// ─── Vercel Handler ────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = String(req.query.action ?? "health");

  try {
    switch (action) {
      case "health": return res.json({ status: "ok", ts: new Date().toISOString() });
      case "team-rank": return res.json(await getTeamRank());
      case "hitters": return res.json(await getHitters(String(req.query.season??"2026"), parseInt(String(req.query.page??"1"))));
      case "hitters-combined": return res.json(await getHittersCombined(String(req.query.season??"2026"), parseInt(String(req.query.page??"1"))));
      case "hitters-all": return res.json(await getHittersAll(String(req.query.season??"2026")));
      case "hitters-ops": return res.json(await getHittersOps(String(req.query.season??"2026"), parseInt(String(req.query.page??"1"))));
      case "pitchers": return res.json(await getPitchers(String(req.query.season??"2026"), parseInt(String(req.query.page??"1"))));
      case "pitchers-all": return res.json(await getPitchersAll(String(req.query.season??"2026")));
      case "leaderboard": return res.json(await getLeaderboard(String(req.query.category??"avg"), String(req.query.season??"2026"), req.query.team?String(req.query.team):undefined, parseInt(String(req.query.limit??"30"))));
      case "search": { const q = String(req.query.q??""); if (!q) return res.json({data:[],query:""}); return res.json(await searchPlayers(q, String(req.query.season??"2026"))); }
      case "player-record": { const pid = String(req.query.playerId??""); if (!pid) return res.status(400).json({error:"playerId required"}); return res.json(await getPlayerRecord(pid)); }
      default: return res.status(404).json({ error: "Unknown action", action });
    }
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }
}
