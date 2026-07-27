export type PlayerEntryMethod =
  | "draft"
  | "first-pick"
  | "developmental"
  | "free-signing"
  | "other";

export interface KboDraftInfo {
  raw: string;
  year: number | null;
  team: string | null;
  method: PlayerEntryMethod;
  phase: "1차" | "2차" | null;
  round: number | null;
  overallPick: number | null;
  display: string;
}

export interface KboSalaryInfo {
  raw: string;
  amount: number | null;
  currency: "KRW" | "USD" | "OTHER";
  display: string;
}

export interface PlayerProfile {
  playerId: string;
  playerType: "hitter" | "pitcher";
  playerName: string;
  entry: KboDraftInfo | null;
  salary: (KboSalaryInfo & { year: number }) | null;
  sourceUrl: string;
  updatedAt: string;
}

function normalize(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandYear(value: string) {
  const year = Number(value);
  if (!Number.isFinite(year)) return null;
  if (value.length === 4) return year;
  return year >= 80 ? 1900 + year : 2000 + year;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function parseKboDraftInfo(value: string): KboDraftInfo | null {
  const raw = normalize(value);
  if (!raw || raw === "-") return null;

  const roundMatch = raw.match(
    /^(\d{2,4})\s+(\S+)\s+(?:(1차|2차)\s+)?(\d+)라운드\s+(\d+)순위$/
  );
  if (roundMatch) {
    const [, yearValue, team, phaseValue, roundValue, pickValue] = roundMatch;
    const year = expandYear(yearValue);
    const phase = (phaseValue as "1차" | "2차" | undefined) ?? null;
    const round = Number(roundValue);
    const overallPick = Number(pickValue);
    const phaseText = phase ? `${phase} ` : "";

    return {
      raw,
      year,
      team,
      method: "draft",
      phase,
      round,
      overallPick,
      display: `${year ?? yearValue}년 ${phaseText}${round}라운드 · 전체 ${overallPick}번 · ${team}`,
    };
  }

  const methodMatch = raw.match(
    /^(\d{2,4})\s+(\S+)\s+(육성선수|자유선발|1차|2차)$/
  );
  if (methodMatch) {
    const [, yearValue, team, methodValue] = methodMatch;
    const year = expandYear(yearValue);
    const method: PlayerEntryMethod =
      methodValue === "육성선수"
        ? "developmental"
        : methodValue === "자유선발"
          ? "free-signing"
          : "first-pick";
    const methodLabel =
      methodValue === "1차" || methodValue === "2차"
        ? `${methodValue} 지명`
        : methodValue;

    return {
      raw,
      year,
      team,
      method,
      phase:
        methodValue === "1차" || methodValue === "2차" ? methodValue : null,
      round: null,
      overallPick: null,
      display: `${year ?? yearValue}년 ${methodLabel} · ${team}`,
    };
  }

  const yearMatch = raw.match(/^(\d{2,4})\s*(.*)$/);
  const year = yearMatch ? expandYear(yearMatch[1]) : null;
  const detail = yearMatch?.[2]?.trim();

  return {
    raw,
    year,
    team: null,
    method: "other",
    phase: null,
    round: null,
    overallPick: null,
    display: year && detail ? `${year}년 ${detail}` : year ? `${year}년` : raw,
  };
}

export function parseKboJoinInfo(value: string): KboDraftInfo | null {
  const raw = normalize(value);
  if (!raw || raw === "-") return null;

  const match = raw.match(/^(\d{2,4})\s*(.+)$/);
  if (!match) {
    return {
      raw,
      year: null,
      team: null,
      method: "other",
      phase: null,
      round: null,
      overallPick: null,
      display: raw,
    };
  }

  const year = expandYear(match[1]);
  const team = normalize(match[2]);
  return {
    raw,
    year,
    team,
    method: "other",
    phase: null,
    round: null,
    overallPick: null,
    display: `${year ?? match[1]}년 · ${team}`,
  };
}

function formatWon(amount: number) {
  const eok = Math.floor(amount / 100_000_000);
  const remainder = amount % 100_000_000;
  const man = Math.floor(remainder / 10_000);
  const won = remainder % 10_000;
  const parts: string[] = [];

  if (eok) parts.push(`${formatNumber(eok)}억`);
  if (man) parts.push(`${formatNumber(man)}만`);
  if (won) parts.push(formatNumber(won));

  return `${parts.join(" ") || "0"} 원`;
}

function formatDollars(amount: number) {
  if (amount < 10_000) return `${formatNumber(amount)}달러`;

  const man = Math.floor(amount / 10_000);
  const remainder = amount % 10_000;
  return remainder
    ? `${formatNumber(man)}만 ${formatNumber(remainder)}달러`
    : `${formatNumber(man)}만 달러`;
}

export function parseKboSalary(value: string): KboSalaryInfo | null {
  const raw = normalize(value);
  if (!raw || raw === "-") return null;

  const compact = raw.replace(/[\s,]/g, "");
  const wonMatch = compact.match(/^(\d+)만원$/);
  if (wonMatch) {
    const amount = Number(wonMatch[1]) * 10_000;
    return {
      raw,
      amount,
      currency: "KRW",
      display: formatWon(amount),
    };
  }

  const dollarMatch = compact.match(/^(\d+)달러$/);
  if (dollarMatch) {
    const amount = Number(dollarMatch[1]);
    return {
      raw,
      amount,
      currency: "USD",
      display: formatDollars(amount),
    };
  }

  return {
    raw,
    amount: null,
    currency: "OTHER",
    display: raw,
  };
}
