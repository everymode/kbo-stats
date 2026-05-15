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

// ASP.NET PostBack 페이지네이션 (쿠키 기반 세션 유지)
async function fHPages(url: string, params: Record<string, string>, maxPages: number) {
  const fullUrl = url + '?' + new URLSearchParams(params).toString();
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  // 1단계: GET page 1 + 쿠키/폼 추출
  const r1 = await axios.get(fullUrl, { headers: { ...HEADERS, 'User-Agent': UA }, timeout: 15000, responseType: "text" });
  const $1 = cheerio.load(r1.data);
  const results: cheerio.CheerioAPI[] = [$1];
  if (maxPages <= 1) return results;

  const cookies = (r1.headers['set-cookie'] || []).map((c: string) => c.split(';')[0]).join('; ');

  // 2단계: POST로 나머지 페이지 순차 요청
  let curForm = extractForm($1);
  for (let p = 2; p <= maxPages; p++) {
    curForm['__EVENTTARGET'] = `ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo${p}`;
    curForm['__EVENTARGUMENT'] = '';
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(curForm)) form.append(k, v);

    try {
      const rN = await axios.post(fullUrl, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, 'Referer': fullUrl, 'Cookie': cookies },
        timeout: 15000, responseType: "text", validateStatus: (s: number) => s < 400,
      });
      const $N = cheerio.load(rN.data);
      const rows = pR($N);
      if (rows.length === 0) break; // 더 이상 데이터 없음
      results.push($N);
      curForm = extractForm($N);
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

async function getTeamRank() {
  const c = gc("tr"); if (c) return c;
  const $ = await fH(`${BASE_URL}/Record/TeamRank/TeamRankDaily.aspx`);
  const data = pR($).map(c => {
    const t = ti(c[1] ?? "");
    return { rank: parseInt(c[0])||0, teamName: c[1]??"", teamShort: t.short, teamFull: t.full, colors: t.colors,
      games: parseInt(c[2])||0, wins: parseInt(c[3])||0, losses: parseInt(c[4])||0, draws: parseInt(c[5])||0,
      winRate: c[6]??"", gameBehind: c[7]??"", recentTen: c[8]??"", streak: c[9]??"", home: c[10]??"", away: c[11]??"" };
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
  const url = `${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`;
  const pages$ = await fHPages(url, { leagueId: "1", seasonId: season, sort: "Game_Cn" }, 5);
  const seen = new Set<string>(); const data: any[] = [];
  for (const $ of pages$) {
    const rows = pR($);
    for (const c of rows) {
      const name = c[1] ?? "";
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const t = ti(c[2] ?? "");
      data.push({ rank: data.length + 1, playerName: name, teamName: c[2]??"", teamShort: t.short, colors: t.colors,
        avg: c[3]??"0", games: parseInt(c[4])||0, pa: parseInt(c[5])||0, ab: parseInt(c[6])||0,
        runs: parseInt(c[7])||0, hits: parseInt(c[8])||0, doubles: parseInt(c[9])||0, triples: parseInt(c[10])||0,
        hr: parseInt(c[11])||0, tb: parseInt(c[12])||0, rbi: parseInt(c[13])||0, sac: parseInt(c[14])||0, sf: parseInt(c[15])||0 });
    }
  }
  // OPS 데이터 병합
  try {
    const ops$ = await fHPages(`${BASE_URL}/Record/Player/HitterBasic/Basic2.aspx`, { leagueId: "1", seasonId: season, sort: "Game_Cn" }, 5);
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
  const result = { data, season, updatedAt: new Date().toISOString() }; sc(ck, result); return result;
}

async function getPitchersAll(season = "2026") {
  const ck = `pa_${season}`; const c = gc(ck); if (c) return c;
  const url = `${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`;
  const pages$ = await fHPages(url, { leagueId: "1", seasonId: season, sort: "Game_Cn" }, 5);
  const seen = new Set<string>(); const data: any[] = [];
  for (const $ of pages$) {
    const rows = pR($);
    for (const c of rows) {
      const name = c[1] ?? "";
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const t = ti(c[2] ?? "");
      const ip = pI(c[10]||"0"); const so = parseInt(c[15])||0; const bb = parseInt(c[13])||0;
      const hr = parseInt(c[12])||0; const hbp = parseInt(c[14])||0;
      data.push({ rank: data.length + 1, playerName: name, teamName: c[2]??"", teamShort: t.short, colors: t.colors,
        era: c[3]??"0.00", games: parseInt(c[4])||0, wins: parseInt(c[5])||0, losses: parseInt(c[6])||0,
        saves: parseInt(c[7])||0, holds: parseInt(c[8])||0, wpct: c[9]??"0", ip: c[10]??"0",
        hits: parseInt(c[11])||0, hr, bb, hbp, so, runs: parseInt(c[16])||0, er: parseInt(c[17])||0, whip: c[18]??"0.00",
        k9: ip>0?(so/ip*9).toFixed(2):"0.00", bb9: ip>0?(bb/ip*9).toFixed(2):"0.00",
        hr9: ip>0?(hr/ip*9).toFixed(2):"0.00", fip: ip>0?((13*hr+3*(bb+hbp)-2*so)/ip+3.10).toFixed(2):"0.00" });
    }
  }
  const result = { data, season, updatedAt: new Date().toISOString() }; sc(ck, result); return result;
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
  const b1s = new Set(["hr","rbi","hits","runs","doubles","triples","tb"]);
  let rd: any[];
  if (ps.has(cat)) rd = (await getPitchers(season)).data;
  else if (b1s.has(cat)) rd = (await getHitters(season)).data;
  else rd = (await getHittersCombined(season)).data;
  if (team) rd = rd.filter((p: any) => p.teamName?.includes(team)||p.teamShort?.includes(team));
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
      default: return res.status(404).json({ error: "Unknown action", action });
    }
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  }
}
