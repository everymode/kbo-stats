import type { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import * as cheerio from "cheerio";
import {
  createQualificationContext,
  filterQualifiedForCategory,
  inningsToDecimal,
  withHitterQualification,
  withPitcherQualification,
} from "../shared/qualification.js";
import { getKboPagerEventTarget } from "../shared/kboPager.js";
import {
  parseKboDraftInfo,
  parseKboJoinInfo,
  parseKboSalary,
  type PlayerProfile,
} from "../shared/playerProfile.js";

// ─── KBO 크롤링 코드 ──────────────────────────────────────
const BASE_URL = "https://www.koreabaseball.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Referer: "https://www.koreabaseball.com/",
};

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  KIA: { primary: "#EA0029", secondary: "#000000" },
  삼성: { primary: "#074CA1", secondary: "#FFFFFF" },
  LG: { primary: "#C30037", secondary: "#000000" },
  두산: { primary: "#131230", secondary: "#ED1C24" },
  KT: { primary: "#333333", secondary: "#ED1C24" },
  SSG: { primary: "#CE0E2D", secondary: "#FFC600" },
  NC: { primary: "#315288", secondary: "#C5985E" },
  롯데: { primary: "#041E42", secondary: "#D00F31" },
  한화: { primary: "#FF6600", secondary: "#000000" },
  키움: { primary: "#820024", secondary: "#000000" },
};
const TEAM_FULL: Record<string, string> = {
  KIA: "KIA 타이거즈",
  삼성: "삼성 라이온즈",
  LG: "LG 트윈스",
  두산: "두산 베어스",
  KT: "KT 위즈",
  SSG: "SSG 랜더스",
  NC: "NC 다이노스",
  롯데: "롯데 자이언츠",
  한화: "한화 이글스",
  키움: "키움 히어로즈",
};

function ti(name: string) {
  for (const [k, c] of Object.entries(TEAM_COLORS))
    if (name.includes(k))
      return { short: k, full: TEAM_FULL[k] ?? name, colors: c };
  return {
    short: name,
    full: name,
    colors: { primary: "#666", secondary: "#FFF" },
  };
}

const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const HOME_CACHE_TTL = 30 * 60 * 1000;
const PROFILE_CACHE_TTL = 24 * 60 * 60 * 1000;

function gc<T = any>(k: string, ttl = CACHE_TTL): T | null {
  const e = cache.get(k);
  return e && Date.now() - e.ts < ttl ? (e.data as T) : null;
}
function sc(k: string, d: unknown) {
  cache.set(k, { data: d, ts: Date.now() });
}

// 동일 키의 동시 요청이 중복 크롤링하지 않도록 진행 중인 Promise를 공유한다.
const inflight = new Map<string, Promise<unknown>>();
function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const ex = inflight.get(key);
  if (ex) return ex as Promise<T>;
  const p = (async () => {
    try {
      return await fn();
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

function logHomeStage(stage: string, startedAt: number, cacheHit = false) {
  console.log(
    JSON.stringify({
      level: "info",
      message: "home data stage",
      stage,
      ms: Date.now() - startedAt,
      cacheHit,
    })
  );
}

function pI(s: string) {
  return inningsToDecimal(s);
}

async function fH(url: string, params?: Record<string, string>) {
  const r = await axios.get(url, {
    headers: HEADERS,
    params,
    timeout: 15000,
    responseType: "text",
  });
  return cheerio.load(r.data);
}

// 폼 필드 추출 헬퍼
function extractForm($: cheerio.CheerioAPI) {
  const fd: Record<string, string> = {};
  $('input[type="hidden"]').each((_: number, el: any) => {
    const n = $(el).attr("name");
    if (n) fd[n] = ($(el).val() as string) || "";
  });
  $("select").each((_: number, el: any) => {
    const n = $(el).attr("name");
    if (n) fd[n] = ($(el).find("option[selected]").val() as string) || "";
  });
  return fd;
}

// 시즌 변경이 필요한 경우 PostBack으로 가져오기
async function fHSeason(url: string, season: string) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const currentYear = new Date().getFullYear().toString();
  const r1 = await axios.get(url, {
    headers: { ...HEADERS, "User-Agent": UA },
    params: { leagueId: "1" },
    timeout: 15000,
    responseType: "text",
  });
  const $1 = cheerio.load(r1.data);
  if (season === currentYear) return $1;

  // 시즌 변경 PostBack
  const cookies = (r1.headers["set-cookie"] || [])
    .map((c: string) => c.split(";")[0])
    .join("; ");
  const fd = extractForm($1);
  fd[
    "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason"
  ] = season;
  fd["__EVENTTARGET"] =
    "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason";
  fd["__EVENTARGUMENT"] = "";
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(fd)) form.append(k, v);
  const r2 = await axios.post(url + "?leagueId=1", form.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Referer: url,
      Cookie: cookies,
    },
    timeout: 15000,
    responseType: "text",
    validateStatus: (s: number) => s < 400,
  });
  return cheerio.load(r2.data);
}

// ASP.NET PostBack 페이지네이션 (쿠키 기반 세션 유지, 시즌 변경 지원)
async function fHPages(
  url: string,
  params: Record<string, string>,
  maxPages: number,
  season?: string
) {
  const fullUrl = url + "?" + new URLSearchParams(params).toString();
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const currentYear = new Date().getFullYear().toString();

  // 1단계: GET page 1 + 쿠키/폼 추출
  const r1 = await axios.get(fullUrl, {
    headers: { ...HEADERS, "User-Agent": UA },
    timeout: 15000,
    responseType: "text",
  });
  let $cur = cheerio.load(r1.data);
  const cookies = (r1.headers["set-cookie"] || [])
    .map((c: string) => c.split(";")[0])
    .join("; ");

  // 1.5단계: 과거 시즌이면 시즌 변경 PostBack 후 새 page 1 획득
  if (season && season !== currentYear) {
    const fd = extractForm($cur);
    fd[
      "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason"
    ] = season;
    fd["__EVENTTARGET"] =
      "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ddlSeason$ddlSeason";
    fd["__EVENTARGUMENT"] = "";
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(fd)) form.append(k, v);
    const rS = await axios.post(fullUrl, form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": UA,
        Referer: fullUrl,
        Cookie: cookies,
      },
      timeout: 15000,
      responseType: "text",
      validateStatus: (s: number) => s < 400,
    });
    $cur = cheerio.load(rS.data);
  }

  const results: cheerio.CheerioAPI[] = [$cur];
  if (maxPages <= 1) return results;

  // KBO pager는 한 그룹에 5개 페이지 번호(btnNo{p})만 노출하고,
  // 다음 그룹(6,11,16...)으로는 '다음' 버튼(btnNext)으로 이동해야 한다.
  const PFX = "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$";
  const firstKey = ($: cheerio.CheerioAPI) => {
    const r = pR($);
    return r[0]?.join("|") ?? "";
  };
  const seenFirst = new Set<string>([firstKey($cur)]);

  // 2단계: pager를 따라 순차 페이지 이동
  let $page = $cur;
  for (let p = 2; p <= maxPages; p++) {
    const target = getKboPagerEventTarget(PFX, p);
    const fd = extractForm($page);
    fd["__EVENTTARGET"] = target;
    fd["__EVENTARGUMENT"] = "";
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(fd)) form.append(k, v);

    try {
      const rN = await axios.post(fullUrl, form.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": UA,
          Referer: fullUrl,
          Cookie: cookies,
        },
        timeout: 15000,
        responseType: "text",
        validateStatus: (s: number) => s < 400,
      });
      const $N = cheerio.load(rN.data);
      const rows = pR($N);
      if (rows.length === 0) break; // 더 이상 데이터 없음
      const fk = firstKey($N);
      if (seenFirst.has(fk)) break; // 같은 페이지 반복 = 끝 도달
      seenFirst.add(fk);
      results.push($N);
      $page = $N;
    } catch {
      break;
    }
  }
  return results;
}

function pR($: cheerio.CheerioAPI) {
  const rows: string[][] = [];
  $("table tr").each((_i, row) => {
    const cols: string[] = [];
    $(row)
      .find("td")
      .each((_, td) => {
        cols.push($(td).text().trim());
      });
    if (cols.length > 0) {
      rows.push(cols);
    }
  });
  return rows;
}

function pRowIds($: cheerio.CheerioAPI): string[] {
  const ids: string[] = [];
  $("table tr").each((_: number, row: any) => {
    const cols = $(row).find("td");
    if (cols.length === 0) return;
    const href = cols.find("a[href*='playerId=']").first().attr("href") || "";
    ids.push(href.match(/playerId=(\d+)/)?.[1] || "");
  });
  return ids;
}

const PHOTO_CDN =
  "https://6ptotvmi5753.edge.naverncp.com/KBO_IMAGE/person/middle";

async function fHSortedPage(url: string, season: string, sort: string) {
  const pages = await fHPages(url, { leagueId: "1", sort }, 1, season);
  const page = pages[0];
  if (!page) throw new Error(`KBO sorted page unavailable: ${sort}`);
  return page;
}

function pHomeHitterBasic($: cheerio.CheerioAPI, season: string) {
  const rows = pR($);
  const rowIds = pRowIds($);
  return rows
    .map((c, rowIndex) => {
      const playerId = rowIds[rowIndex] || "";
      const t = ti(c[2] ?? "");
      return {
        rank: parseInt(c[0]) || 0,
        playerName: c[1] ?? "",
        playerId,
        photoUrl: playerId ? `${PHOTO_CDN}/${season}/${playerId}.jpg` : "",
        teamName: c[2] ?? "",
        teamShort: t.short,
        colors: t.colors,
        avg: c[3] ?? "0",
        games: parseInt(c[4]) || 0,
        pa: parseInt(c[5]) || 0,
        ab: parseInt(c[6]) || 0,
        runs: parseInt(c[7]) || 0,
        hits: parseInt(c[8]) || 0,
        doubles: parseInt(c[9]) || 0,
        triples: parseInt(c[10]) || 0,
        hr: parseInt(c[11]) || 0,
        tb: parseInt(c[12]) || 0,
        rbi: parseInt(c[13]) || 0,
        sac: parseInt(c[14]) || 0,
        sf: parseInt(c[15]) || 0,
      };
    })
    .filter(p => p.rank > 0 && p.playerName);
}

function pHomeHitterOps($: cheerio.CheerioAPI) {
  const rows = pR($);
  const rowIds = pRowIds($);
  return rows
    .map((c, rowIndex) => ({
      playerId: rowIds[rowIndex] || "",
      playerName: c[1] ?? "",
      bb: parseInt(c[4]) || 0,
      ibb: parseInt(c[5]) || 0,
      hbp: parseInt(c[6]) || 0,
      so: parseInt(c[7]) || 0,
      gdp: parseInt(c[8]) || 0,
      slg: c[9] ?? "0",
      obp: c[10] ?? "0",
      ops: c[11] ?? "0",
    }))
    .filter(p => p.playerName);
}

function pHomePitchers($: cheerio.CheerioAPI, season: string) {
  const rows = pR($);
  const rowIds = pRowIds($);
  return rows
    .map((c, rowIndex) => {
      const playerId = rowIds[rowIndex] || "";
      const t = ti(c[2] ?? "");
      const ip = pI(c[10] || "0");
      const so = parseInt(c[15]) || 0;
      const bb = parseInt(c[13]) || 0;
      const hr = parseInt(c[12]) || 0;
      const hbp = parseInt(c[14]) || 0;
      return {
        rank: parseInt(c[0]) || 0,
        playerName: c[1] ?? "",
        playerId,
        photoUrl: playerId ? `${PHOTO_CDN}/${season}/${playerId}.jpg` : "",
        teamName: c[2] ?? "",
        teamShort: t.short,
        colors: t.colors,
        era: c[3] ?? "0.00",
        games: parseInt(c[4]) || 0,
        wins: parseInt(c[5]) || 0,
        losses: parseInt(c[6]) || 0,
        saves: parseInt(c[7]) || 0,
        holds: parseInt(c[8]) || 0,
        wpct: c[9] ?? "0",
        ip: c[10] ?? "0",
        hits: parseInt(c[11]) || 0,
        hr,
        bb,
        hbp,
        so,
        runs: parseInt(c[16]) || 0,
        er: parseInt(c[17]) || 0,
        whip: c[18] ?? "0.00",
        k9: ip > 0 ? ((so / ip) * 9).toFixed(2) : "0.00",
        bb9: ip > 0 ? ((bb / ip) * 9).toFixed(2) : "0.00",
        hr9: ip > 0 ? ((hr / ip) * 9).toFixed(2) : "0.00",
        fip:
          ip > 0
            ? ((13 * hr + 3 * (bb + hbp) - 2 * so) / ip + 3.1).toFixed(2)
            : "0.00",
      };
    })
    .filter(p => p.rank > 0 && p.playerName);
}

// ─── 네이버 선수 연도별 통산 기록 (스태티즈 출처 WAR/wRC+/wOBA 포함) ─────
const NAVER_API = "https://api-gw.sports.naver.com";
const NAVER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://m.sports.naver.com/",
  Origin: "https://m.sports.naver.com",
};

const num = (v: unknown) => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};
const teamName = (t: unknown) => {
  const s = String(t ?? "");
  return /^\d+$/.test(s) ? "" : s;
};

interface HitterSeason {
  year: string;
  team: string;
  isCareer: boolean;
  avg: string;
  games: number;
  ab: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  tb: number;
  rbi: number;
  sb: number;
  cs: number;
  bb: number;
  hbp: number;
  so: number;
  gdp: number;
  obp: number;
  slg: number;
  ops: number;
  isop: number;
  babip: number;
  woba: number;
  wrcPlus: number;
  war: number;
}
interface PitcherSeason {
  year: string;
  team: string;
  isCareer: boolean;
  era: number;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  ip: string;
  hits: number;
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  runs: number;
  er: number;
  whip: number;
  k9: number;
  bb9: number;
  war: number;
  wpct: number;
  ops: number;
}

interface SituationSplit {
  label: string;
  avg: string;
  ab: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  hbp: number;
  so: number;
  gdp: number;
}

type PlayerType = "hitter" | "pitcher";

function nI(v: string | undefined) {
  return parseInt(String(v ?? "").replace(/,/g, ""), 10) || 0;
}

function rate(v: number) {
  if (!Number.isFinite(v)) return ".000";
  return v.toFixed(3).replace(/^(-?)0\./, "$1.");
}

function normalizeAvg(v: string | undefined) {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? rate(n) : ".000";
}

function pTableRows($: cheerio.CheerioAPI, tableIndex: number) {
  const rows: string[][] = [];
  $("table")
    .eq(tableIndex)
    .find("tr")
    .each((_i, row) => {
      const cols: string[] = [];
      $(row)
        .find("td")
        .each((_, td) => {
          cols.push($(td).text().trim());
        });
      if (cols.length > 0) rows.push(cols);
    });
  return rows;
}

function pSituationRows($: cheerio.CheerioAPI, tableIndex: number) {
  return pTableRows($, tableIndex)
    .filter(c => c.length >= 11 && c[0])
    .map(
      (c): SituationSplit => ({
        label: c[0] ?? "",
        avg: normalizeAvg(c[1]),
        ab: nI(c[2]),
        hits: nI(c[3]),
        doubles: nI(c[4]),
        triples: nI(c[5]),
        hr: nI(c[6]),
        rbi: nI(c[7]),
        bb: nI(c[8]),
        hbp: nI(c[9]),
        so: nI(c[10]),
        gdp: nI(c[11]),
      })
    );
}

function seasonAvgFromSplits(splits: SituationSplit[]) {
  const ab = splits.reduce((sum, row) => sum + row.ab, 0);
  const hits = splits.reduce((sum, row) => sum + row.hits, 0);
  return ab > 0 ? rate(hits / ab) : ".000";
}

function mapHitterSeason(s: any): HitterSeason {
  return {
    year: String(s.gyear ?? ""),
    team: teamName(s.team),
    isCareer: String(s.gyear) === "통산",
    avg: String(s.hra ?? "0"),
    games: num(s.gamenum),
    ab: num(s.ab),
    runs: num(s.run),
    hits: num(s.hit),
    doubles: num(s.h2),
    triples: num(s.h3),
    hr: num(s.hr),
    tb: num(s.tb),
    rbi: num(s.rbi),
    sb: num(s.sb),
    cs: num(s.cs),
    bb: num(s.bb),
    hbp: num(s.hp),
    so: num(s.kk),
    gdp: num(s.gd),
    obp: num(s.obp),
    slg: num(s.slg),
    ops: num(s.ops),
    isop: num(s.isop),
    babip: num(s.babip),
    woba: num(s.woba),
    wrcPlus: num(s.wrcPlus),
    war: num(s.war),
  };
}
function mapPitcherSeason(s: any): PitcherSeason {
  return {
    year: String(s.gyear ?? ""),
    team: teamName(s.team),
    isCareer: String(s.gyear) === "통산",
    era: num(s.era),
    games: num(s.gamenum),
    wins: num(s.w),
    losses: num(s.l),
    saves: num(s.sv),
    holds: num(s.hold),
    ip: String(s.inn ?? "0"),
    hits: num(s.hit),
    hr: num(s.hr),
    bb: num(s.bb),
    hbp: num(s.hp),
    so: num(s.kk),
    runs: num(s.r),
    er: num(s.er),
    whip: num(s.whip),
    k9: num(s.k9),
    bb9: num(s.bb9),
    war: num(s.war),
    wpct: num(s.wra),
    ops: num(s.ops),
  };
}

async function getNaverPlayerData(playerId: string) {
  const ck = `nplayer_${playerId}`;
  const cached = gc<any>(ck);
  if (cached) return cached;

  return dedup(ck, async () => {
    const response = await axios.get(
      `${NAVER_API}/players/kbo/${playerId}/playerend-record`,
      { headers: NAVER_HEADERS, timeout: 15000 }
    );
    const result = response.data?.result;
    if (!result?.playerId) {
      throw new Error("네이버 선수 기록을 찾을 수 없습니다.");
    }

    let record = result.record;
    if (typeof record === "string") {
      try {
        record = JSON.parse(record);
      } catch {
        record = {};
      }
    }

    const playerType: PlayerType =
      result.playerType === "pitcher" ? "pitcher" : "hitter";
    const data = {
      result,
      record,
      playerType,
      seasonRows: Array.isArray(record?.season) ? record.season : [],
    };
    sc(ck, data);
    return data;
  });
}

async function getPlayerRecord(playerId: string) {
  const ck = `prec_${playerId}`;
  const c = gc(ck);
  if (c) return c;
  const naverData = await getNaverPlayerData(playerId);
  const playerType = naverData.playerType;
  const raw: any[] = naverData.seasonRows;
  // 연도 행만 오름차순(오래된→최근) 정렬, 통산 행은 맨 아래로
  const yearRows = raw.filter(s => String(s.gyear) !== "통산");
  const careerRows = raw.filter(s => String(s.gyear) === "통산");
  yearRows.sort((a, b) => num(a.gyear) - num(b.gyear));
  const ordered = [...yearRows, ...careerRows];
  const seasons =
    playerType === "pitcher"
      ? ordered.map(mapPitcherSeason)
      : ordered.map(mapHitterSeason);
  const result = {
    playerId,
    playerType,
    seasons,
    updatedAt: new Date().toISOString(),
  };
  sc(ck, result);
  return result;
}

function readProfileValue(
  $: cheerio.CheerioAPI,
  idSuffix: string,
  label: string
) {
  const byId = normalizeText(
    $(`.player_basic [id$="_${idSuffix}"], [id$="_${idSuffix}"]`).first().text()
  );
  if (byId) return byId;

  let value = "";
  $(".player_basic li").each((_, element) => {
    if (value) return;
    const text = normalizeText($(element).text());
    if (!text.startsWith(label)) return;
    value = normalizeText(text.slice(label.length).replace(/^[:：]\s*/, ""));
  });
  return value;
}

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPlayerProfile(
  playerId: string,
  playerType: PlayerType
): Promise<PlayerProfile | null> {
  const detailName =
    playerType === "pitcher" ? "PitcherDetail" : "HitterDetail";
  const sourceUrl = `${BASE_URL}/Record/Player/${detailName}/Basic.aspx?playerId=${encodeURIComponent(playerId)}`;
  const $ = await fH(sourceUrl);
  const salaryRaw = readProfileValue($, "lblSalary", "연봉");
  const draftRaw = readProfileValue($, "lblDraft", "지명순위");
  const joinInfoRaw = readProfileValue($, "lblJoinInfo", "입단년도");
  const playerName =
    readProfileValue($, "lblName", "선수명") ||
    normalizeText($(".player_basic h4, .player_basic .name").first().text());

  if (!salaryRaw && !draftRaw && !joinInfoRaw) return null;

  const salary = parseKboSalary(salaryRaw);
  return {
    playerId,
    playerType,
    playerName,
    entry: parseKboDraftInfo(draftRaw) ?? parseKboJoinInfo(joinInfoRaw),
    salary: salary ? { ...salary, year: new Date().getFullYear() } : null,
    sourceUrl,
    updatedAt: new Date().toISOString(),
  };
}

export async function getPlayerProfile(
  playerId: string,
  playerType: PlayerType
) {
  const ck = `profile_${playerType}_${playerId}`;
  const cached = gc<PlayerProfile>(ck, PROFILE_CACHE_TTL);
  if (cached) return cached;

  return dedup(ck, async () => {
    const requested = await fetchPlayerProfile(playerId, playerType);
    const result =
      requested ??
      (await fetchPlayerProfile(
        playerId,
        playerType === "hitter" ? "pitcher" : "hitter"
      ));

    if (!result) {
      throw new Error("KBO 선수 프로필을 찾을 수 없습니다.");
    }

    sc(ck, result);
    return result;
  });
}

export async function getPlayerSummary(playerId: string, season = "2026") {
  const ck = `player_summary_${season}_${playerId}`;
  const cached = gc<any>(ck);
  if (cached) return cached;

  return dedup(ck, async () => {
    const naverData = await getNaverPlayerData(playerId);
    const seasonRow = naverData.seasonRows.find(
      (row: any) => String(row.gyear) === season
    );
    if (!seasonRow || num(seasonRow.gamenum) < 1) {
      throw new Error(`${season} 시즌 1군 기록을 찾을 수 없습니다.`);
    }

    const [profile, qualificationContext] = await Promise.all([
      getPlayerProfile(playerId, naverData.playerType),
      getQualificationContext(season),
    ]);
    const currentTeam = teamName(seasonRow.team);
    const teamInfo = ti(currentTeam);
    const base = {
      rank: 0,
      playerName: profile.playerName,
      playerId,
      photoUrl: `${PHOTO_CDN}/${season}/${playerId}.jpg`,
      teamName: currentTeam,
      teamShort: teamInfo.short,
      colors: teamInfo.colors,
    };

    let player: any;
    if (naverData.playerType === "pitcher") {
      const innings = String(seasonRow.inn ?? "0");
      const inningsDecimal = pI(innings);
      const so = num(seasonRow.kk);
      const bb = num(seasonRow.bb);
      const hr = num(seasonRow.hr);
      const hbp = num(seasonRow.hp);
      player = withPitcherQualification(
        {
          ...base,
          era: String(seasonRow.era ?? "0.00"),
          games: num(seasonRow.gamenum),
          wins: num(seasonRow.w),
          losses: num(seasonRow.l),
          saves: num(seasonRow.sv),
          holds: num(seasonRow.hold),
          wpct: String(seasonRow.wra ?? "0"),
          ip: innings,
          hits: num(seasonRow.hit),
          hr,
          bb,
          hbp,
          so,
          runs: num(seasonRow.r),
          er: num(seasonRow.er),
          whip: String(seasonRow.whip ?? "0.00"),
          k9:
            inningsDecimal > 0
              ? ((so / inningsDecimal) * 9).toFixed(2)
              : "0.00",
          bb9:
            inningsDecimal > 0
              ? ((bb / inningsDecimal) * 9).toFixed(2)
              : "0.00",
          hr9:
            inningsDecimal > 0
              ? ((hr / inningsDecimal) * 9).toFixed(2)
              : "0.00",
          fip:
            inningsDecimal > 0
              ? (
                  (13 * hr + 3 * (bb + hbp) - 2 * so) / inningsDecimal +
                  3.1
                ).toFixed(2)
              : "0.00",
        },
        qualificationContext
      );
    } else {
      const ab = num(seasonRow.ab);
      const bb = num(seasonRow.bb);
      const hbp = num(seasonRow.hp);
      const sac = num(seasonRow.sh);
      const sf = num(seasonRow.sf);
      const pa = ab + bb + hbp + sac + sf;
      player = withHitterQualification(
        {
          ...base,
          avg: String(seasonRow.hra ?? "0"),
          games: num(seasonRow.gamenum),
          pa,
          ab,
          runs: num(seasonRow.run),
          hits: num(seasonRow.hit),
          doubles: num(seasonRow.h2),
          triples: num(seasonRow.h3),
          hr: num(seasonRow.hr),
          tb: num(seasonRow.tb),
          rbi: num(seasonRow.rbi),
          sac,
          sf,
          bb,
          ibb: num(seasonRow.ib),
          hbp,
          so: num(seasonRow.kk),
          sb: num(seasonRow.sb),
          cs: num(seasonRow.cs),
          gdp: num(seasonRow.gd),
          slg: String(seasonRow.slg ?? "0"),
          obp: String(seasonRow.obp ?? "0"),
          ops: String(seasonRow.ops ?? "0"),
          bbPct: pa > 0 ? ((bb / pa) * 100).toFixed(1) : "0.0",
          kPct: pa > 0 ? ((num(seasonRow.kk) / pa) * 100).toFixed(1) : "0.0",
          iso: num(seasonRow.isop).toFixed(3),
          babip: num(seasonRow.babip).toFixed(3),
        },
        qualificationContext
      );
    }

    const result = {
      ...player,
      type: naverData.playerType,
      season,
      updatedAt: new Date().toISOString(),
    };
    sc(ck, result);
    return result;
  });
}

async function getHitterSituation(playerId: string) {
  const ck = `hs_${playerId}`;
  const c = gc(ck);
  if (c) return c;
  return dedup(ck, async () => {
    const $ = await fH(
      `${BASE_URL}/Record/Player/HitterDetail/Situation.aspx`,
      {
        playerId,
      }
    );
    const counts = pSituationRows($, 1);
    const vsTypes = pSituationRows($, 4);
    const result = {
      playerId,
      seasonAvg: seasonAvgFromSplits(vsTypes.length ? vsTypes : counts),
      counts,
      vsTypes,
      updatedAt: new Date().toISOString(),
    };
    sc(ck, result);
    return result;
  });
}

// ─── 최근 경기 결과 (일정 ajax 기반, 순서 보존) ─────────────
type GameResult = "W" | "D" | "L";
interface SchedGame {
  date: string;
  away: string;
  home: string;
  awayResult: GameResult;
  homeResult: GameResult;
}

function parseSchedDate(t: string, season: string): string {
  const m = t.match(/(\d{1,2})\.(\d{1,2})/);
  return m ? `${season}${m[1].padStart(2, "0")}${m[2].padStart(2, "0")}` : "";
}
function clsToResult(cls?: string): GameResult | null {
  return cls === "win"
    ? "W"
    : cls === "lose"
      ? "L"
      : cls === "same"
        ? "D"
        : null;
}
function parsePlay(html: string): Omit<SchedGame, "date"> | null {
  const $ = cheerio.load(`<div id="r">${html}</div>`);
  const root = $("#r");
  const top = root.children("span");
  if (top.length < 2) return null;
  const away = top.first().text().trim();
  const home = top.last().text().trim();
  const scores = root
    .find("em > span")
    .filter((_: number, el: any) => !!$(el).attr("class"));
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
async function fetchSchedMonth(
  season: string,
  month: number
): Promise<SchedGame[]> {
  const body = new URLSearchParams({
    leId: "1",
    srIdList: "0,9,6",
    seasonId: season,
    gameMonth: String(month).padStart(2, "0"),
    teamId: "",
  });
  const res = await axios.post(
    `${BASE_URL}/ws/Schedule.asmx/GetScheduleList`,
    body.toString(),
    {
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${BASE_URL}/Schedule/Schedule.aspx`,
      },
      timeout: 15000,
    }
  );
  const rows = (res.data?.rows ?? []) as Array<{
    row: Array<{ Text: string; Class: string | null }>;
  }>;
  const games: SchedGame[] = [];
  let curDate = "";
  for (const r of rows) {
    const cells = r.row || [];
    const dayCell = cells.find(c => c.Class === "day");
    if (dayCell) curDate = parseSchedDate(dayCell.Text, season);
    const playCell = cells.find(c => c.Class === "play");
    if (!playCell) continue;
    const parsed = parsePlay(playCell.Text);
    if (!parsed) continue;
    games.push({ date: curDate, ...parsed });
  }
  return games;
}
async function getRecentGames(
  season = "2026"
): Promise<Record<string, GameResult[]>> {
  const ck = `recent_games_${season}`;
  const cached = gc(ck);
  if (cached) return cached as Record<string, GameResult[]>;
  const seasonNum = parseInt(season);
  const now = new Date();
  const startMonth = now.getFullYear() === seasonNum ? now.getMonth() + 1 : 10;
  const teams = Object.keys(TEAM_FULL);
  const allGames: SchedGame[] = [];
  for (let m = startMonth; m >= 3; m--) {
    try {
      allGames.unshift(...(await fetchSchedMonth(season, m)));
    } catch {
      /* skip */
    }
    const counts = new Map<string, number>();
    for (const g of allGames) {
      const a = ti(g.away).short,
        h = ti(g.home).short;
      counts.set(a, (counts.get(a) || 0) + 1);
      counts.set(h, (counts.get(h) || 0) + 1);
    }
    if (teams.every(t => (counts.get(t) || 0) >= 10)) break;
  }
  const result: Record<string, GameResult[]> = {};
  for (const t of teams) {
    const last10 = allGames
      .filter(g => ti(g.away).short === t || ti(g.home).short === t)
      .slice(-10);
    result[t] = last10.map(g =>
      ti(g.away).short === t ? g.awayResult : g.homeResult
    );
  }
  sc(ck, result);
  return result;
}

async function getTeamRank() {
  const c = gc("tr");
  if (c) return c;
  const $ = await fH(`${BASE_URL}/Record/TeamRank/TeamRankDaily.aspx`);
  let recentGames: Record<string, GameResult[]> = {};
  try {
    recentGames = await getRecentGames("2026");
  } catch {
    /* ignore */
  }
  const data = pR($)
    .map(c => {
      const t = ti(c[1] ?? "");
      return {
        rank: parseInt(c[0]) || 0,
        teamName: c[1] ?? "",
        teamShort: t.short,
        teamFull: t.full,
        colors: t.colors,
        games: parseInt(c[2]) || 0,
        wins: parseInt(c[3]) || 0,
        losses: parseInt(c[4]) || 0,
        draws: parseInt(c[5]) || 0,
        winRate: c[6] ?? "",
        gameBehind: c[7] ?? "",
        recentTen: c[8] ?? "",
        streak: c[9] ?? "",
        recentGames: recentGames[t.short] ?? [],
        home: c[10] ?? "",
        away: c[11] ?? "",
      };
    })
    .filter(r => r.rank > 0);
  const result = { data, updatedAt: new Date().toISOString() };
  sc("tr", result);
  return result;
}

export async function getHomeStandings(season = "2026") {
  const startedAt = Date.now();
  const ck = `home_standings_${season}`;
  const cached = gc(ck, HOME_CACHE_TTL);
  if (cached) {
    logHomeStage("standings", startedAt, true);
    return cached;
  }

  return dedup(ck, async () => {
    const $ = await fH(`${BASE_URL}/Record/TeamRank/TeamRankDaily.aspx`);
    const teamRank = pR($)
      .map(c => {
        const t = ti(c[1] ?? "");
        return {
          rank: parseInt(c[0]) || 0,
          teamName: c[1] ?? "",
          teamShort: t.short,
          teamFull: t.full,
          colors: t.colors,
          games: parseInt(c[2]) || 0,
          wins: parseInt(c[3]) || 0,
          losses: parseInt(c[4]) || 0,
          draws: parseInt(c[5]) || 0,
          winRate: c[6] ?? "",
          gameBehind: c[7] ?? "",
          recentTen: c[8] ?? "",
          streak: c[9] ?? "",
          recentGames: [] as GameResult[],
          home: c[10] ?? "",
          away: c[11] ?? "",
        };
      })
      .filter(r => r.rank > 0);
    const result = {
      teamRank,
      season,
      updatedAt: new Date().toISOString(),
    };
    sc(ck, result);
    logHomeStage("standings", startedAt);
    return result;
  });
}

async function getQualificationContext(season: string) {
  const currentSeason = new Date().getFullYear().toString();
  if (season !== currentSeason) {
    return createQualificationContext([], season, currentSeason);
  }

  const standings = await getHomeStandings(season);
  return createQualificationContext(standings.teamRank, season, currentSeason);
}

export async function getHomeRecentGames(season = "2026") {
  const startedAt = Date.now();
  const ck = `home_recent_games_${season}`;
  const cached = gc(ck, HOME_CACHE_TTL);
  if (cached) {
    logHomeStage("recent-games", startedAt, true);
    return cached;
  }

  return dedup(ck, async () => {
    const result = {
      recentGames: await getRecentGames(season),
      season,
      updatedAt: new Date().toISOString(),
    };
    sc(ck, result);
    logHomeStage("recent-games", startedAt);
    return result;
  });
}

async function getHitters(season = "2026", page = 1) {
  const ck = `h_${season}_${page}`;
  const c = gc(ck);
  if (c) return c;
  const $ = await fHSeason(
    `${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`,
    season
  );
  const data = pR($)
    .map(c => {
      const t = ti(c[2] ?? "");
      return {
        rank: parseInt(c[0]) || 0,
        playerName: c[1] ?? "",
        teamName: c[2] ?? "",
        teamShort: t.short,
        colors: t.colors,
        avg: c[3] ?? "0",
        games: parseInt(c[4]) || 0,
        pa: parseInt(c[5]) || 0,
        ab: parseInt(c[6]) || 0,
        runs: parseInt(c[7]) || 0,
        hits: parseInt(c[8]) || 0,
        doubles: parseInt(c[9]) || 0,
        triples: parseInt(c[10]) || 0,
        hr: parseInt(c[11]) || 0,
        tb: parseInt(c[12]) || 0,
        rbi: parseInt(c[13]) || 0,
        sac: parseInt(c[14]) || 0,
        sf: parseInt(c[15]) || 0,
      };
    })
    .filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() };
  sc(ck, result);
  return result;
}

async function getHittersOps(season = "2026", page = 1) {
  const ck = `ho_${season}_${page}`;
  const c = gc(ck);
  if (c) return c;
  const $ = await fHSeason(
    `${BASE_URL}/Record/Player/HitterBasic/Basic2.aspx`,
    season
  );
  const data = pR($)
    .map(c => {
      const t = ti(c[2] ?? "");
      return {
        rank: parseInt(c[0]) || 0,
        playerName: c[1] ?? "",
        teamName: c[2] ?? "",
        teamShort: t.short,
        colors: t.colors,
        avg: c[3] ?? "0",
        bb: parseInt(c[4]) || 0,
        ibb: parseInt(c[5]) || 0,
        hbp: parseInt(c[6]) || 0,
        so: parseInt(c[7]) || 0,
        gdp: parseInt(c[8]) || 0,
        slg: c[9] ?? "0",
        obp: c[10] ?? "0",
        ops: c[11] ?? "0",
      };
    })
    .filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() };
  sc(ck, result);
  return result;
}

async function getHittersCombined(season = "2026", page = 1) {
  const ck = `hc_${season}_${page}`;
  const c = gc(ck);
  if (c) return c;
  const [b1, b2] = await Promise.all([
    getHitters(season, page),
    getHittersOps(season, page),
  ]);
  const om = new Map<string, any>();
  for (const p of b2.data) om.set(p.playerName, p);
  const data = b1.data.map((p: any) => {
    const o = om.get(p.playerName) || {};
    const bbPct = p.pa > 0 ? (((o.bb || 0) / p.pa) * 100).toFixed(1) : "0.0";
    const kPct = p.pa > 0 ? (((o.so || 0) / p.pa) * 100).toFixed(1) : "0.0";
    const iso =
      o.slg && p.avg
        ? (parseFloat(o.slg) - parseFloat(p.avg)).toFixed(3)
        : "0.000";
    const bd = p.ab - (o.so || 0) - p.hr + p.sf;
    const babip = bd > 0 ? ((p.hits - p.hr) / bd).toFixed(3) : "0.000";
    return {
      ...p,
      bb: o.bb || 0,
      ibb: o.ibb || 0,
      hbp: o.hbp || 0,
      so: o.so || 0,
      gdp: o.gdp || 0,
      slg: o.slg || "0",
      obp: o.obp || "0",
      ops: o.ops || "0",
      bbPct,
      kPct,
      iso,
      babip,
    };
  });
  const result = { data, season, page, updatedAt: new Date().toISOString() };
  sc(ck, result);
  return result;
}

async function getHittersAll(season = "2026") {
  const ck = `ha_${season}`;
  const c = gc(ck);
  if (c) return c;
  return dedup(ck, async () => {
    const url = `${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`;
    const [pages$, qualificationContext] = await Promise.all([
      fHPages(url, { leagueId: "1", sort: "Game_Cn" }, 15, season),
      getQualificationContext(season),
    ]);
    const seen = new Set<string>();
    const data: any[] = [];
    for (const $ of pages$) {
      const rows = pR($);
      const rowIds = pRowIds($);
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const c = rows[rowIndex];
        const name = c[1] ?? "";
        const pid = rowIds[rowIndex] || "";
        const playerKey = pid || `${name}|${c[2] ?? ""}|${c[0] ?? ""}`;
        if (!name || seen.has(playerKey)) continue;
        seen.add(playerKey);
        const t = ti(c[2] ?? "");
        data.push({
          rank: data.length + 1,
          playerName: name,
          teamName: c[2] ?? "",
          teamShort: t.short,
          colors: t.colors,
          playerId: pid,
          photoUrl: pid ? `${PHOTO_CDN}/${season}/${pid}.jpg` : "",
          avg: c[3] ?? "0",
          games: parseInt(c[4]) || 0,
          pa: parseInt(c[5]) || 0,
          ab: parseInt(c[6]) || 0,
          runs: parseInt(c[7]) || 0,
          hits: parseInt(c[8]) || 0,
          doubles: parseInt(c[9]) || 0,
          triples: parseInt(c[10]) || 0,
          hr: parseInt(c[11]) || 0,
          tb: parseInt(c[12]) || 0,
          rbi: parseInt(c[13]) || 0,
          sac: parseInt(c[14]) || 0,
          sf: parseInt(c[15]) || 0,
        });
      }
    }
    // OPS 데이터 병합
    try {
      const ops$ = await fHPages(
        `${BASE_URL}/Record/Player/HitterBasic/Basic2.aspx`,
        { leagueId: "1", sort: "Game_Cn" },
        15,
        season
      );
      const om = new Map<string, any>();
      for (const $ of ops$) {
        const rows = pR($);
        const rowIds = pRowIds($);
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const c = rows[rowIndex];
          const n = c[1];
          const pid = rowIds[rowIndex] || "";
          const key = pid || n;
          if (n && key && !om.has(key))
            om.set(key, {
              bb: parseInt(c[4]) || 0,
              ibb: parseInt(c[5]) || 0,
              hbp: parseInt(c[6]) || 0,
              so: parseInt(c[7]) || 0,
              gdp: parseInt(c[8]) || 0,
              slg: c[9] ?? "0",
              obp: c[10] ?? "0",
              ops: c[11] ?? "0",
            });
        }
      }
      for (const p of data) {
        const o =
          (p.playerId && om.get(p.playerId)) || om.get(p.playerName) || {};
        p.bb = o.bb || 0;
        p.ibb = o.ibb || 0;
        p.hbp = o.hbp || 0;
        p.so = o.so || 0;
        p.gdp = o.gdp || 0;
        p.slg = o.slg || "0";
        p.obp = o.obp || "0";
        p.ops = o.ops || "0";
        p.bbPct = p.pa > 0 ? (((o.bb || 0) / p.pa) * 100).toFixed(1) : "0.0";
        p.kPct = p.pa > 0 ? (((o.so || 0) / p.pa) * 100).toFixed(1) : "0.0";
        p.iso =
          o.slg && p.avg
            ? (parseFloat(o.slg) - parseFloat(p.avg)).toFixed(3)
            : "0.000";
        const bd = p.ab - (o.so || 0) - p.hr + p.sf;
        p.babip = bd > 0 ? ((p.hits - p.hr) / bd).toFixed(3) : "0.000";
      }
    } catch {}
    // 도루 데이터 병합 (Runner/Basic.aspx)
    try {
      const run$ = await fHPages(
        `${BASE_URL}/Record/Player/Runner/Basic.aspx`,
        { leagueId: "1", sort: "Game_Cn" },
        15,
        season
      );
      const rm = new Map<string, any>();
      for (const $ of run$) {
        const rows = pR($);
        const rowIds = pRowIds($);
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const c = rows[rowIndex];
          const n = c[1];
          const pid = rowIds[rowIndex] || "";
          const key = pid || n;
          if (n && key && !rm.has(key))
            rm.set(key, {
              sb: parseInt(c[5]) || 0,
              cs: parseInt(c[6]) || 0,
              sba: parseInt(c[4]) || 0,
            });
        }
      }
      for (const p of data) {
        const r =
          (p.playerId && rm.get(p.playerId)) || rm.get(p.playerName) || {};
        p.sb = r.sb || 0;
        p.cs = r.cs || 0;
        p.sba = r.sba || 0;
      }
    } catch {}
    const qualifiedData = data.map(player =>
      withHitterQualification(player, qualificationContext)
    );
    const result = {
      data: qualifiedData,
      season,
      updatedAt: new Date().toISOString(),
    };
    sc(ck, result);
    return result;
  });
}

async function getPitchersAll(season = "2026") {
  const ck = `pa_${season}`;
  const c = gc(ck);
  if (c) return c;
  return dedup(ck, async () => {
    const url = `${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`;
    const [pages$, qualificationContext] = await Promise.all([
      fHPages(url, { leagueId: "1", sort: "Game_Cn" }, 15, season),
      getQualificationContext(season),
    ]);
    const seen = new Set<string>();
    const data: any[] = [];
    for (const $ of pages$) {
      const rows = pR($);
      const rowIds = pRowIds($);
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const c = rows[rowIndex];
        const name = c[1] ?? "";
        const pid = rowIds[rowIndex] || "";
        const playerKey = pid || `${name}|${c[2] ?? ""}|${c[0] ?? ""}`;
        if (!name || seen.has(playerKey)) continue;
        seen.add(playerKey);
        const t = ti(c[2] ?? "");
        const ip = pI(c[10] || "0");
        const so = parseInt(c[15]) || 0;
        const bb = parseInt(c[13]) || 0;
        const hr = parseInt(c[12]) || 0;
        const hbp = parseInt(c[14]) || 0;
        data.push({
          rank: data.length + 1,
          playerName: name,
          teamName: c[2] ?? "",
          teamShort: t.short,
          colors: t.colors,
          playerId: pid,
          photoUrl: pid ? `${PHOTO_CDN}/${season}/${pid}.jpg` : "",
          era: c[3] ?? "0.00",
          games: parseInt(c[4]) || 0,
          wins: parseInt(c[5]) || 0,
          losses: parseInt(c[6]) || 0,
          saves: parseInt(c[7]) || 0,
          holds: parseInt(c[8]) || 0,
          wpct: c[9] ?? "0",
          ip: c[10] ?? "0",
          hits: parseInt(c[11]) || 0,
          hr,
          bb,
          hbp,
          so,
          runs: parseInt(c[16]) || 0,
          er: parseInt(c[17]) || 0,
          whip: c[18] ?? "0.00",
          k9: ip > 0 ? ((so / ip) * 9).toFixed(2) : "0.00",
          bb9: ip > 0 ? ((bb / ip) * 9).toFixed(2) : "0.00",
          hr9: ip > 0 ? ((hr / ip) * 9).toFixed(2) : "0.00",
          fip:
            ip > 0
              ? ((13 * hr + 3 * (bb + hbp) - 2 * so) / ip + 3.1).toFixed(2)
              : "0.00",
        });
      }
    }
    const qualifiedData = data.map(player =>
      withPitcherQualification(player, qualificationContext)
    );
    const result = {
      data: qualifiedData,
      season,
      updatedAt: new Date().toISOString(),
    };
    sc(ck, result);
    return result;
  });
}
async function getPitchers(season = "2026", page = 1) {
  const ck = `p_${season}_${page}`;
  const c = gc(ck);
  if (c) return c;
  const $ = await fHSeason(
    `${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`,
    season
  );
  const data = pR($)
    .map(c => {
      const t = ti(c[2] ?? "");
      const ip = pI(c[10] || "0");
      const so = parseInt(c[15]) || 0;
      const bb = parseInt(c[13]) || 0;
      const hr = parseInt(c[12]) || 0;
      const hbp = parseInt(c[14]) || 0;
      return {
        rank: parseInt(c[0]) || 0,
        playerName: c[1] ?? "",
        teamName: c[2] ?? "",
        teamShort: t.short,
        colors: t.colors,
        era: c[3] ?? "0.00",
        games: parseInt(c[4]) || 0,
        wins: parseInt(c[5]) || 0,
        losses: parseInt(c[6]) || 0,
        saves: parseInt(c[7]) || 0,
        holds: parseInt(c[8]) || 0,
        wpct: c[9] ?? "0",
        ip: c[10] ?? "0",
        hits: parseInt(c[11]) || 0,
        hr,
        bb,
        hbp,
        so,
        runs: parseInt(c[16]) || 0,
        er: parseInt(c[17]) || 0,
        whip: c[18] ?? "0.00",
        k9: ip > 0 ? ((so / ip) * 9).toFixed(2) : "0.00",
        bb9: ip > 0 ? ((bb / ip) * 9).toFixed(2) : "0.00",
        hr9: ip > 0 ? ((hr / ip) * 9).toFixed(2) : "0.00",
        fip:
          ip > 0
            ? ((13 * hr + 3 * (bb + hbp) - 2 * so) / ip + 3.1).toFixed(2)
            : "0.00",
      };
    })
    .filter(r => r.rank > 0 && r.playerName);
  const result = { data, season, page, updatedAt: new Date().toISOString() };
  sc(ck, result);
  return result;
}

async function getLeaderboard(
  cat: string,
  season = "2026",
  team?: string,
  limit = 30
) {
  const ps = new Set([
    "era",
    "wins",
    "so",
    "whip",
    "saves",
    "holds",
    "ip",
    "k9",
    "bb9",
    "hr9",
    "fip",
  ]);
  let rd: any[];
  if (ps.has(cat)) rd = (await getPitchersAll(season)).data;
  else rd = (await getHittersAll(season)).data;
  if (team)
    rd = rd.filter(
      (p: any) => p.teamName?.includes(team) || p.teamShort?.includes(team)
    );

  rd = filterQualifiedForCategory(rd, cat);

  const lb = new Set(["era", "whip", "fip", "bb9", "hr9", "kPct"]);
  rd = [...rd].sort((a: any, b: any) => {
    const va = parseFloat(String(a[cat] ?? "0")) || 0;
    const vb = parseFloat(String(b[cat] ?? "0")) || 0;
    return lb.has(cat) ? va - vb : vb - va;
  });
  return {
    data: rd
      .slice(0, limit)
      .map((i: any, idx: number) => ({ ...i, leaderboardRank: idx + 1 })),
    category: cat,
    season,
    updatedAt: new Date().toISOString(),
  };
}

export async function getHomeSummary(season = "2026") {
  const ck = `home_summary_${season}`;
  const c = gc(ck, HOME_CACHE_TTL);
  if (c) return c;
  return dedup(ck, async () => {
    const [standings, recent, leaders] = await Promise.all([
      getHomeStandings(season),
      getHomeRecentGames(season),
      getHomeLeaders(season),
    ]);
    const result = {
      teamRank: standings.teamRank.map((team: any) => ({
        ...team,
        recentGames: recent.recentGames[team.teamShort] ?? [],
      })),
      avgLeaders: leaders.avgLeaders,
      leaders: leaders.leaders,
      season,
      updatedAt: new Date().toISOString(),
    };
    sc(ck, result);
    return result;
  });
}

export async function getHomeLeaders(season = "2026") {
  const startedAt = Date.now();
  const ck = `home_leaders_${season}`;
  const cached = gc(ck, HOME_CACHE_TTL);
  if (cached) {
    logHomeStage("leaders", startedAt, true);
    return cached;
  }

  return dedup(ck, async () => {
    const [
      avgBasicPage,
      avgOpsPage,
      hrPage,
      eraPage,
      soPage,
      qualificationContext,
    ] = await Promise.all([
      fHSortedPage(
        `${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`,
        season,
        "HRA_RT"
      ),
      fHSortedPage(
        `${BASE_URL}/Record/Player/HitterBasic/Basic2.aspx`,
        season,
        "HRA_RT"
      ),
      fHSortedPage(
        `${BASE_URL}/Record/Player/HitterBasic/Basic1.aspx`,
        season,
        "HR_CN"
      ),
      fHSortedPage(
        `${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`,
        season,
        "ERA_RT"
      ),
      fHSortedPage(
        `${BASE_URL}/Record/Player/PitcherBasic/Basic1.aspx`,
        season,
        "KK_CN"
      ),
      getQualificationContext(season),
    ]);

    const opsByPlayer = new Map<string, any>();
    for (const row of pHomeHitterOps(avgOpsPage)) {
      if (row.playerId) opsByPlayer.set(row.playerId, row);
      opsByPlayer.set(row.playerName, row);
    }

    const avgLeaders = filterQualifiedForCategory(
      pHomeHitterBasic(avgBasicPage, season).map(player =>
        withHitterQualification(player, qualificationContext)
      ),
      "avg"
    )
      .slice(0, 5)
      .map((player, index) => {
        const ops =
          (player.playerId && opsByPlayer.get(player.playerId)) ||
          opsByPlayer.get(player.playerName);
        if (!ops) {
          throw new Error(`OPS data missing for ${player.playerName}`);
        }
        return {
          ...player,
          ...ops,
          avg: player.avg,
          leaderboardRank: index + 1,
        };
      });
    const hrRow = pHomeHitterBasic(hrPage, season)[0];
    const hr = hrRow
      ? withHitterQualification(hrRow, qualificationContext)
      : null;
    const era =
      filterQualifiedForCategory(
        pHomePitchers(eraPage, season).map(player =>
          withPitcherQualification(player, qualificationContext)
        ),
        "era"
      )[0] ?? null;
    const soRow = pHomePitchers(soPage, season)[0];
    const so = soRow
      ? withPitcherQualification(soRow, qualificationContext)
      : null;

    const result = {
      avgLeaders,
      leaders: {
        avg: avgLeaders[0] ?? null,
        hr: hr ? { ...hr, leaderboardRank: 1 } : null,
        era: era ? { ...era, leaderboardRank: 1 } : null,
        so: so ? { ...so, leaderboardRank: 1 } : null,
      },
      season,
      updatedAt: new Date().toISOString(),
    };
    sc(ck, result);
    logHomeStage("leaders", startedAt);
    return result;
  });
}

function setHomeCacheHeaders(res: VercelResponse) {
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400"
  );
}

function setProfileCacheHeaders(res: VercelResponse) {
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"
  );
}

function setPlayerSummaryCacheHeaders(res: VercelResponse) {
  res.setHeader(
    "Cache-Control",
    "public, max-age=0, s-maxage=300, stale-while-revalidate=1800"
  );
}

interface KboPlayerSearchCandidate {
  playerId: string;
  playerName: string;
  teamName: string;
  position: string;
  playerType: PlayerType;
}

async function searchKboPlayerDirectory(query: string) {
  const ck = `player_directory_${query}`;
  const cached = gc<KboPlayerSearchCandidate[]>(ck, HOME_CACHE_TTL);
  if (cached) return cached;

  return dedup(ck, async () => {
    const $ = await fH(`${BASE_URL}/Player/Search.aspx`, {
      searchWord: query,
    });
    const candidates: KboPlayerSearchCandidate[] = [];
    const seen = new Set<string>();

    $(".inquiry table tbody tr, table.tEx tbody tr").each((_, row) => {
      const cells = $(row)
        .find("td")
        .map((__, cell) => $(cell).text().trim())
        .get();
      const href =
        $(row).find("a[href*='playerId=']").first().attr("href") ?? "";
      const playerId = href.match(/playerId=(\d+)/)?.[1] ?? "";
      const playerName = cells[1] ?? "";
      if (!playerId || !playerName || seen.has(playerId)) return;

      seen.add(playerId);
      candidates.push({
        playerId,
        playerName,
        teamName: cells[2] ?? "",
        position: cells[3] ?? "",
        playerType: href.includes("PitcherDetail") ? "pitcher" : "hitter",
      });
    });

    sc(ck, candidates);
    return candidates;
  });
}

export async function searchPlayers(q: string, season = "2026") {
  const query = normalizeText(q);
  if (!query) return { data: [], query: "" };

  const ck = `player_search_${season}_${query}`;
  const cached = gc<any>(ck);
  if (cached) return cached;

  return dedup(ck, async () => {
    if (query.length >= 2) {
      const candidates = await searchKboPlayerDirectory(query);
      const exact = candidates.filter(
        candidate => candidate.playerName === query
      );
      const selected = (exact.length ? exact : candidates).slice(0, 12);
      const summaries = await Promise.all(
        selected.map(candidate =>
          getPlayerSummary(candidate.playerId, season).catch(() => null)
        )
      );
      const directMatches = summaries.filter(
        (player): player is NonNullable<typeof player> =>
          Boolean(
            player &&
              (player.playerName.includes(query) ||
                player.teamName.includes(query))
          )
      );

      if (directMatches.length > 0) {
        const result = { data: directMatches, query };
        sc(ck, result);
        return result;
      }
    }

    const [hitterResponse, pitcherResponse] = await Promise.all([
      getHittersAll(season),
      getPitchersAll(season),
    ]);
    const data: any[] = [];
    for (const player of hitterResponse.data) {
      if (
        player.playerName?.includes(query) ||
        player.teamName?.includes(query)
      ) {
        data.push({ ...player, type: "hitter" });
      }
    }
    for (const player of pitcherResponse.data) {
      if (
        player.playerName?.includes(query) ||
        player.teamName?.includes(query)
      ) {
        data.push({ ...player, type: "pitcher" });
      }
    }

    const result = { data, query };
    sc(ck, result);
    return result;
  });
}

// ─── Vercel Handler ────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = String(req.query.action ?? "health");
  const requestStartedAt = Date.now();

  try {
    switch (action) {
      case "health":
        return res.json({ status: "ok", ts: new Date().toISOString() });
      case "home-summary": {
        setHomeCacheHeaders(res);
        return res.json(
          await getHomeSummary(String(req.query.season ?? "2026"))
        );
      }
      case "home-standings": {
        setHomeCacheHeaders(res);
        return res.json(
          await getHomeStandings(String(req.query.season ?? "2026"))
        );
      }
      case "home-recent-games": {
        setHomeCacheHeaders(res);
        return res.json(
          await getHomeRecentGames(String(req.query.season ?? "2026"))
        );
      }
      case "home-leaders": {
        setHomeCacheHeaders(res);
        return res.json(
          await getHomeLeaders(String(req.query.season ?? "2026"))
        );
      }
      case "team-rank":
        return res.json(await getTeamRank());
      case "hitters":
        return res.json(
          await getHitters(
            String(req.query.season ?? "2026"),
            parseInt(String(req.query.page ?? "1"))
          )
        );
      case "hitters-combined":
        return res.json(
          await getHittersCombined(
            String(req.query.season ?? "2026"),
            parseInt(String(req.query.page ?? "1"))
          )
        );
      case "hitters-all":
        return res.json(
          await getHittersAll(String(req.query.season ?? "2026"))
        );
      case "hitters-ops":
        return res.json(
          await getHittersOps(
            String(req.query.season ?? "2026"),
            parseInt(String(req.query.page ?? "1"))
          )
        );
      case "pitchers":
        return res.json(
          await getPitchers(
            String(req.query.season ?? "2026"),
            parseInt(String(req.query.page ?? "1"))
          )
        );
      case "pitchers-all":
        return res.json(
          await getPitchersAll(String(req.query.season ?? "2026"))
        );
      case "leaderboard":
        return res.json(
          await getLeaderboard(
            String(req.query.category ?? "avg"),
            String(req.query.season ?? "2026"),
            req.query.team ? String(req.query.team) : undefined,
            parseInt(String(req.query.limit ?? "30"))
          )
        );
      case "search": {
        const q = String(req.query.q ?? "");
        if (!q) return res.json({ data: [], query: "" });
        setPlayerSummaryCacheHeaders(res);
        return res.json(
          await searchPlayers(q, String(req.query.season ?? "2026"))
        );
      }
      case "player-summary": {
        const pid = String(req.query.playerId ?? "");
        if (!/^\d+$/.test(pid)) {
          return res.status(400).json({ error: "valid playerId required" });
        }
        setPlayerSummaryCacheHeaders(res);
        return res.json(
          await getPlayerSummary(
            pid,
            String(req.query.season ?? new Date().getFullYear())
          )
        );
      }
      case "player-record": {
        const pid = String(req.query.playerId ?? "");
        if (!pid) return res.status(400).json({ error: "playerId required" });
        return res.json(await getPlayerRecord(pid));
      }
      case "player-profile": {
        const pid = String(req.query.playerId ?? "");
        if (!pid) return res.status(400).json({ error: "playerId required" });
        const playerType: PlayerType =
          String(req.query.playerType) === "pitcher" ? "pitcher" : "hitter";
        setProfileCacheHeaders(res);
        return res.json(await getPlayerProfile(pid, playerType));
      }
      case "hitter-situation": {
        const pid = String(req.query.playerId ?? "");
        if (!pid) return res.status(400).json({ error: "playerId required" });
        return res.json(await getHitterSituation(pid));
      }
      default:
        return res.status(404).json({ error: "Unknown action", action });
    }
  } catch (e: any) {
    return res.status(503).json({ error: e.message });
  } finally {
    if (action.startsWith("home-")) {
      logHomeStage(`request:${action}`, requestStartedAt);
    }
  }
}
