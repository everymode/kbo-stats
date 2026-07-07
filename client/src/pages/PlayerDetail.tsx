import { useState, useEffect, type ReactNode } from "react";
import { useParams } from "wouter";
import {
  kboApi,
  Hitter,
  Pitcher,
  getTeamColor,
  PlayerRecord,
  HitterSeason,
  PitcherSeason,
  HitterSituation,
  SituationSplit,
} from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User } from "lucide-react";
import { Link } from "wouter";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type SeasonDetailRow = {
  label: string;
  value?: string | number | null;
  section?: boolean;
};

// ─── 스탯 카드 ────────────────────────────────────────────
function StatCard({
  label,
  value,
  highlight = false,
  saber = false,
  desc,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  saber?: boolean;
  desc?: string;
}) {
  return (
    <div
      className={`stat-card text-center ${highlight ? "border-primary/40" : saber ? "border-note/30" : ""}`}
      title={desc}
    >
      <div
        className={`mb-1 font-stat text-2xl font-black leading-none lg:text-3xl ${highlight ? "text-primary" : saber ? "text-note" : "text-foreground"}`}
      >
        {value ?? "-"}
      </div>
      <div
        className={`text-xs font-bold uppercase tracking-wide ${saber ? "text-note/80" : "text-muted-foreground"}`}
      >
        {label}
      </div>
      {desc && (
        <div className="mt-0.5 hidden text-xs text-muted-foreground lg:block">
          {desc}
        </div>
      )}
    </div>
  );
}

// ─── 투수 레이더 데이터 ──────────────────────────────────
function getPitcherRadarData(p: Pitcher) {
  const era = parseFloat(p.era || "9.99");
  const whip = parseFloat(p.whip || "2.00");
  const ip = parseFloat(p.ip || "0");
  const fip = parseFloat(p.fip || "9.99");
  const k9 = parseFloat(p.k9 || "0");
  return [
    { subject: "구위", value: Math.min(100, Math.max(0, (5 - era) * 20)) },
    { subject: "제구", value: Math.min(100, Math.max(0, (2 - whip) * 70)) },
    { subject: "탈삼진", value: Math.min(100, k9 * 10) },
    { subject: "이닝소화", value: Math.min(100, ip * 0.6) },
    { subject: "FIP", value: Math.min(100, Math.max(0, (5 - fip) * 20)) },
  ];
}

function parseAvgValue(value?: string) {
  const n = parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

function displayAvg(value?: string) {
  const n = parseAvgValue(value);
  return n.toFixed(3).replace(/^(-?)0\./, "$1.");
}

function splitTone(
  split: SituationSplit | undefined,
  baseline: number,
  threshold: number
) {
  if (!split || split.ab < 20)
    return "border-border bg-card text-muted-foreground";
  const delta = parseAvgValue(split.avg) - baseline;
  if (delta >= 0.1) return "border-success/40 bg-success/20 text-success";
  if (delta >= 0.06) return "border-success/35 bg-success/15 text-success";
  if (delta >= threshold) return "border-success/30 bg-success/10 text-success";
  if (delta <= -0.1)
    return "border-destructive/40 bg-destructive/20 text-destructive";
  if (delta <= -0.06)
    return "border-destructive/35 bg-destructive/15 text-destructive";
  if (delta <= -threshold)
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-border bg-muted/45 text-foreground";
}

function splitMap(rows: SituationSplit[]) {
  return new Map(rows.map(row => [row.label, row]));
}

function CountHeatmap({
  rows,
  seasonAvg,
}: {
  rows: SituationSplit[];
  seasonAvg: string;
}) {
  const byLabel = splitMap(rows);
  const baseline = parseAvgValue(seasonAvg);
  const strikes = [0, 1, 2];
  const balls = [0, 1, 2, 3];

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <h4 className="font-serif text-sm font-black text-foreground">
          볼카운트 히트맵
        </h4>
        <span className="text-xs text-muted-foreground">
          시즌 대비 높음/낮음
        </span>
      </div>
      <div className="grid grid-cols-[32px_repeat(3,minmax(0,1fr))] gap-1.5">
        <div />
        {strikes.map(strike => (
          <div
            key={strike}
            className="text-center font-stat text-xs font-bold text-muted-foreground"
          >
            S{strike}
          </div>
        ))}
        {balls.map(ball => (
          <div key={`b-${ball}`} className="contents">
            <div className="flex items-center justify-center font-stat text-xs font-bold text-muted-foreground">
              B{ball}
            </div>
            {strikes.map(strike => {
              const split = byLabel.get(`${ball}-${strike}`);
              const isSmall = !split || split.ab < 20;
              return (
                <div
                  key={`${ball}-${strike}`}
                  className={`min-h-16 rounded-[4px] border p-2 text-center transition-colors ${splitTone(split, baseline, 0.03)}`}
                  title={
                    split
                      ? `${split.label}, ${split.ab}타수 ${split.hits}안타`
                      : "기록 없음"
                  }
                >
                  <div className="font-stat text-lg font-black leading-none tabular-nums">
                    {split ? displayAvg(split.avg) : "-"}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {split
                      ? isSmall
                        ? `(${split.ab}AB)`
                        : `${split.ab}AB`
                      : "기록 없음"}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function VsTypeCards({
  rows,
  seasonAvg,
}: {
  rows: SituationSplit[];
  seasonAvg: string;
}) {
  const baseline = parseAvgValue(seasonAvg);
  return (
    <div>
      <h4 className="mb-2 font-serif text-sm font-black text-foreground">
        투수유형별 비교
      </h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {rows.map(row => {
          const isSmall = row.ab < 20;
          return (
            <div
              key={row.label}
              className={`rounded-[4px] border p-3 ${splitTone(row, baseline, 0.02)} ${isSmall ? "opacity-75" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-muted-foreground">
                  {row.label}
                </span>
                {isSmall && (
                  <span className="rounded-[2px] border border-border px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    표본 부족
                  </span>
                )}
              </div>
              <div className="font-stat text-2xl font-black leading-none tabular-nums">
                {displayAvg(row.avg)}
              </div>
              <div className="mt-2 font-stat text-xs text-muted-foreground">
                {row.ab}AB / {row.hr}HR / {row.so}SO
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SituationPanel({
  situation,
  loading,
  seasonAvg,
}: {
  situation: HitterSituation | null;
  loading: boolean;
  seasonAvg: string;
}) {
  const baseline = displayAvg(seasonAvg || situation?.seasonAvg);
  const totalAB = situation?.vsTypes.reduce((sum, row) => sum + row.ab, 0) ?? 0;
  const hasEnoughData =
    !!situation &&
    situation.counts.length > 0 &&
    situation.vsTypes.length > 0 &&
    totalAB >= 20;

  return (
    <div className="rounded-[6px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
      <div className="mb-4 flex flex-col items-start gap-1 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="font-serif text-lg font-black text-foreground">
          상황별 기록
        </h3>
        <span className="font-stat text-xs font-bold text-muted-foreground">
          시즌 AVG {baseline} 기준
        </span>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-[6px] bg-secondary" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-[4px] bg-secondary" />
            ))}
          </div>
        </div>
      ) : !hasEnoughData ? (
        <div className="flex min-h-56 items-center justify-center rounded-[4px] border border-dashed border-border-strong bg-muted/35 p-5 text-center">
          <div>
            <div className="font-serif text-base font-black text-foreground">
              상황별 기록이 충분하지 않습니다
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              20타수 미만 표본은 참고용으로만 볼 수 있습니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <CountHeatmap
            rows={situation.counts}
            seasonAvg={seasonAvg || situation.seasonAvg}
          />
          <div className="border-t border-border pt-4">
            <VsTypeCards
              rows={situation.vsTypes}
              seasonAvg={seasonAvg || situation.seasonAvg}
            />
          </div>
          <p className="border-t border-border border-dashed pt-3 text-xs text-muted-foreground">
            20타수 미만 표본은 참고용입니다. 데이터 출처: KBO 공식 사이트
          </p>
        </div>
      )}
    </div>
  );
}

function PlayerDetailAnalysisGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      {children}
    </div>
  );
}

function PitcherRadarFallback({
  playerName,
  teamColor,
  radarData,
}: {
  playerName: string;
  teamColor: { primary: string };
  radarData: ReturnType<typeof getPitcherRadarData>;
}) {
  return (
    <section className="flex h-full flex-col rounded-[6px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
      <h3 className="mb-4 font-serif text-lg font-black text-foreground">
        능력치 레이더
      </h3>
      <div className="h-56 flex-1 min-h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
            <Radar
              name={playerName}
              dataKey="value"
              stroke={teamColor.primary}
              fill={teamColor.primary}
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--popover-foreground)",
              }}
              formatter={(val: number) => [`${val.toFixed(0)}점`, ""]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function PlayerInsightPanel({
  isHitter,
  hitter,
  pitcher,
  situation,
  situationLoading,
  playerName,
  teamColor,
  radarData,
}: {
  isHitter: boolean;
  hitter: Hitter | null;
  pitcher: Pitcher | null;
  situation: HitterSituation | null;
  situationLoading: boolean;
  playerName: string;
  teamColor: { primary: string };
  radarData: ReturnType<typeof getPitcherRadarData>;
}) {
  if (isHitter && hitter) {
    return (
      <SituationPanel
        situation={situation}
        loading={situationLoading}
        seasonAvg={hitter.avg}
      />
    );
  }

  if (pitcher) {
    return (
      <PitcherRadarFallback
        playerName={playerName}
        teamColor={teamColor}
        radarData={radarData}
      />
    );
  }

  return null;
}

function getHitterSeasonDetailRows(hitter: Hitter): SeasonDetailRow[] {
  return [
    { label: "경기", value: hitter.games },
    { label: "타석", value: hitter.pa },
    { label: "타수", value: hitter.ab },
    { label: "득점", value: hitter.runs },
    { label: "안타", value: hitter.hits },
    { label: "2루타", value: hitter.doubles },
    { label: "3루타", value: hitter.triples },
    { label: "홈런", value: hitter.hr },
    { label: "타점", value: hitter.rbi },
    { label: "볼넷", value: hitter.bb },
    { label: "삼진", value: hitter.so },
    { label: "희타", value: hitter.sac },
    { label: "희비", value: hitter.sf },
    { label: "병살", value: hitter.gdp },
    { label: "세이버메트릭스", section: true },
    { label: "출루율 OBP", value: hitter.obp },
    { label: "장타율 SLG", value: hitter.slg },
    { label: "OPS", value: hitter.ops },
    { label: "ISO", value: hitter.iso },
    { label: "BABIP", value: hitter.babip },
    { label: "BB%", value: hitter.bbPct ? `${hitter.bbPct}%` : "-" },
    { label: "K%", value: hitter.kPct ? `${hitter.kPct}%` : "-" },
  ];
}

function getPitcherSeasonDetailRows(pitcher: Pitcher): SeasonDetailRow[] {
  return [
    { label: "경기", value: pitcher.games },
    { label: "승", value: pitcher.wins },
    { label: "패", value: pitcher.losses },
    { label: "세이브", value: pitcher.saves },
    { label: "홀드", value: pitcher.holds },
    { label: "이닝", value: pitcher.ip },
    { label: "피안타", value: pitcher.hits },
    { label: "피홈런", value: pitcher.hr },
    { label: "볼넷", value: pitcher.bb },
    { label: "사구", value: pitcher.hbp },
    { label: "탈삼진", value: pitcher.so },
    { label: "실점", value: pitcher.runs },
    { label: "자책점", value: pitcher.er },
    { label: "세이버메트릭스", section: true },
    { label: "WHIP", value: pitcher.whip },
    { label: "FIP", value: pitcher.fip },
    { label: "K/9", value: pitcher.k9 },
    { label: "BB/9", value: pitcher.bb9 },
    { label: "HR/9", value: pitcher.hr9 },
  ];
}

function SeasonDetailPanel({ rows }: { rows: SeasonDetailRow[] }) {
  return (
    <section className="flex h-full flex-col rounded-[6px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
      <h3 className="mb-4 font-serif text-lg font-black text-foreground">
        2026 시즌 상세 기록
      </h3>
      <div className="flex-1 space-y-0">
        {rows.map(row =>
          row.section ? (
            <div
              key={row.label}
              className="border-b border-border/30 pt-3 pb-1.5 text-xs font-black text-muted-foreground"
            >
              {row.label}
            </div>
          ) : (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-border/30 py-1.5 last:border-0"
            >
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="font-stat text-xs font-medium">
                {row.value ?? "-"}
              </span>
            </div>
          )
        )}
      </div>
    </section>
  );
}

// ─── 연도별 통산 기록 테이블 ─────────────────────────────
const HITTER_CAREER_COLS: {
  key: keyof HitterSeason;
  label: string;
  dec?: number;
}[] = [
  { key: "team", label: "팀" },
  { key: "avg", label: "타율" },
  { key: "games", label: "경기" },
  { key: "ab", label: "타수" },
  { key: "hits", label: "안타" },
  { key: "doubles", label: "2타" },
  { key: "triples", label: "3타" },
  { key: "hr", label: "홈런" },
  { key: "rbi", label: "타점" },
  { key: "runs", label: "득점" },
  { key: "sb", label: "도루" },
  { key: "bb", label: "볼넷" },
  { key: "so", label: "삼진" },
  { key: "obp", label: "출루", dec: 3 },
  { key: "slg", label: "장타", dec: 3 },
  { key: "ops", label: "OPS", dec: 3 },
  { key: "isop", label: "ISOp", dec: 3 },
  { key: "babip", label: "BABIP", dec: 3 },
  { key: "woba", label: "wOBA", dec: 3 },
  { key: "wrcPlus", label: "wRC+", dec: 1 },
  { key: "war", label: "WAR", dec: 2 },
];

const PITCHER_CAREER_COLS: {
  key: keyof PitcherSeason;
  label: string;
  dec?: number;
}[] = [
  { key: "team", label: "팀" },
  { key: "era", label: "ERA", dec: 2 },
  { key: "games", label: "경기" },
  { key: "wins", label: "승" },
  { key: "losses", label: "패" },
  { key: "saves", label: "세이브" },
  { key: "holds", label: "홀드" },
  { key: "ip", label: "이닝" },
  { key: "hits", label: "피안타" },
  { key: "hr", label: "피홈런" },
  { key: "bb", label: "볼넷" },
  { key: "so", label: "삼진" },
  { key: "er", label: "자책" },
  { key: "whip", label: "WHIP", dec: 2 },
  { key: "k9", label: "K/9", dec: 2 },
  { key: "bb9", label: "BB/9", dec: 2 },
  { key: "ops", label: "피OPS", dec: 3 },
  { key: "war", label: "WAR", dec: 2 },
];

// 통산 행에서 집계되지 않는(0으로 오는) 고급 지표는 "-" 표기 (타자/투수 구분)
const HITTER_CAREER_BLANK = new Set([
  "isop",
  "babip",
  "woba",
  "wrcPlus",
  "war",
]);
const PITCHER_CAREER_BLANK = new Set(["war", "k9", "bb9", "ops"]);

function fmtCell(
  row: any,
  key: string,
  blankSet: Set<string>,
  dec?: number
): string {
  const v = row[key];
  if (key === "team") return v || "-";
  if (row.isCareer && blankSet.has(key) && Number(v) === 0) return "-";
  if (typeof v === "number") {
    if (dec != null) {
      const s = v.toFixed(dec);
      // 비율 스탯(0.xxx)은 앞 0 제거 (.287 형태)
      return dec === 3 && Math.abs(v) < 1 ? s.replace(/^(-?)0\./, "$1.") : s;
    }
    return String(v);
  }
  if (typeof v === "string" && dec === 3) {
    const n = parseFloat(v);
    if (Number.isFinite(n) && Math.abs(n) < 1)
      return v.replace(/^(-?)0\./, "$1.");
  }
  return v ?? "-";
}

function CareerTable({ record }: { record: PlayerRecord }) {
  const isHitter = record.playerType === "hitter";
  const cols = isHitter ? HITTER_CAREER_COLS : PITCHER_CAREER_COLS;
  const blankSet = isHitter ? HITTER_CAREER_BLANK : PITCHER_CAREER_BLANK;
  return (
    <section className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h3 className="font-serif text-lg font-black text-foreground">
          연도별 통산 기록
        </h3>
        <span className="text-[0.65rem] text-muted-foreground">
          데이터 출처: 네이버 스포츠 · 스태티즈
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-xs">
          <thead>
            <tr className="border-b border-border-strong bg-muted text-[11px] uppercase tracking-wide">
              <th className="sticky left-0 z-10 bg-muted px-3 py-2.5 text-left font-black text-muted-foreground">
                시즌
              </th>
              {cols.map(c => (
                <th
                  key={c.key}
                  className="px-2.5 py-2.5 text-center font-black text-muted-foreground"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {record.seasons.map(s => (
              <tr
                key={s.year + s.team}
                className={`border-b border-border transition-colors hover:bg-accent ${s.isCareer ? "bg-muted font-bold" : ""}`}
              >
                <td
                  className={`sticky left-0 z-10 px-3 py-2 font-stat font-bold ${s.isCareer ? "bg-muted" : "bg-card"}`}
                >
                  {s.year}
                </td>
                {cols.map(c => (
                  <td
                    key={c.key}
                    className="px-2.5 py-2 text-center font-stat tabular-nums"
                  >
                    {fmtCell(s, c.key as string, blankSet, c.dec)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PlayerDetail() {
  const params = useParams<{ identifier: string }>();
  const playerIdentifier = decodeURIComponent(params.identifier || "");
  const isPlayerId = /^\d+$/.test(playerIdentifier);
  const [hitter, setHitter] = useState<Hitter | null>(null);
  const [pitcher, setPitcher] = useState<Pitcher | null>(null);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<PlayerRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [situation, setSituation] = useState<HitterSituation | null>(null);
  const [situationLoading, setSituationLoading] = useState(false);

  useEffect(() => {
    if (!playerIdentifier) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setHitter(null);
      setPitcher(null);
      try {
        if (isPlayerId) {
          const [hitterRes, pitcherRes] = await Promise.all([
            kboApi.getHittersAll("2026"),
            kboApi.getPitchersAll("2026"),
          ]);
          if (cancelled) return;

          const matchedHitter = hitterRes.data.find(
            p => p.playerId === playerIdentifier
          );
          const matchedPitcher = pitcherRes.data.find(
            p => p.playerId === playerIdentifier
          );

          setHitter(matchedHitter ?? null);
          setPitcher(matchedHitter ? null : (matchedPitcher ?? null));
        } else {
          const res = await kboApi.searchPlayers(playerIdentifier);
          if (cancelled) return;
          const exact =
            res.data.find(p => p.playerName === playerIdentifier) ??
            res.data[0];

          if ((exact as any)?.type === "pitcher") {
            setPitcher(exact as Pitcher);
            setHitter(null);
          } else if (exact) {
            setHitter(exact as Hitter);
            setPitcher(null);
          }
        }
      } catch {
        if (!cancelled) {
          setHitter(null);
          setPitcher(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isPlayerId, playerIdentifier]);

  const player = hitter || pitcher;
  const isHitter = !!hitter;
  const playerId = (player as any)?.playerId as string | undefined;

  // 연도별 통산 기록 로드 (네이버 career API, playerId 기반)
  useEffect(() => {
    if (!playerId) {
      setRecord(null);
      return;
    }
    let cancelled = false;
    const loadRecord = async () => {
      setRecordLoading(true);
      try {
        const r = await kboApi.getPlayerRecord(playerId);
        if (!cancelled) setRecord(r);
      } catch {
        if (!cancelled) setRecord(null);
      } finally {
        if (!cancelled) setRecordLoading(false);
      }
    };
    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const teamColor = player
    ? getTeamColor(player.teamName)
    : { primary: "#666", secondary: "#fff" };
  const radarData = pitcher ? getPitcherRadarData(pitcher) : [];

  // 타자만 상황별 기록을 로드한다. 투수는 기존 레이더 차트를 유지한다.
  useEffect(() => {
    if (!isHitter || !playerId) {
      setSituation(null);
      setSituationLoading(false);
      return;
    }
    let cancelled = false;
    const loadSituation = async () => {
      setSituationLoading(true);
      try {
        const data = await kboApi.getHitterSituation(playerId);
        if (!cancelled) setSituation(data);
      } catch {
        if (!cancelled) setSituation(null);
      } finally {
        if (!cancelled) setSituationLoading(false);
      }
    };
    loadSituation();
    return () => {
      cancelled = true;
    };
  }, [isHitter, playerId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-7 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48 bg-secondary" />
        <Skeleton className="h-40 w-full rounded-[6px] bg-secondary" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[6px] bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <Link
          href="/players"
          className="mb-6 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} /> 선수 목록으로
        </Link>
        <div className="py-20 text-center text-muted-foreground">
          <User size={48} className="mx-auto mb-4 opacity-30" />
          <p>선수 정보를 찾을 수 없습니다: {playerIdentifier}</p>
        </div>
      </div>
    );
  }

  const seasonDetailRows =
    isHitter && hitter
      ? getHitterSeasonDetailRows(hitter)
      : pitcher
        ? getPitcherSeasonDetailRows(pitcher)
        : [];

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-7 sm:px-6 lg:px-8">
        <Link
          href="/players"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} /> 선수 목록
        </Link>

        {/* 프로필 헤더 */}
        <header
          className="overflow-hidden rounded-[6px] border border-border bg-card p-6 shadow-[0_1px_2px_rgb(17_24_39/0.08)] lg:p-7"
          style={{ borderTop: `3px solid ${teamColor.primary}` }}
        >
          <div className="flex items-center gap-5">
            <div
              className="h-16 w-16 shrink-0 overflow-hidden rounded-[4px] border border-border bg-muted lg:h-20 lg:w-20"
              style={{ borderBottom: `3px solid ${teamColor.primary}` }}
            >
              {(player as any).photoUrl ? (
                <img
                  src={(player as any).photoUrl}
                  alt={player.playerName}
                  className="h-full w-full object-cover object-top grayscale-[15%]"
                  onError={e => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    el.parentElement!.classList.add(
                      "flex",
                      "items-center",
                      "justify-center"
                    );
                    const span = document.createElement("span");
                    span.className = "text-3xl font-serif font-black";
                    span.style.color = teamColor.primary;
                    span.textContent = player.playerName.charAt(0);
                    el.parentElement!.appendChild(span);
                  }}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center font-serif text-3xl font-black"
                  style={{ color: teamColor.primary }}
                >
                  {player.playerName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="mb-1 font-serif text-3xl font-black leading-none text-foreground lg:text-4xl">
                {player.playerName}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <TeamBadge teamName={player.teamName} showFull />
                <span className="text-xs text-muted-foreground">
                  {isHitter ? "타자" : "투수"} · 2026시즌
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 핵심 스탯 카드 */}
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
            핵심 스탯
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {isHitter && hitter ? (
              <>
                <StatCard label="AVG" value={hitter.avg} highlight />
                <StatCard label="HR" value={hitter.hr ?? "-"} />
                <StatCard label="RBI" value={hitter.rbi ?? "-"} />
                <StatCard label="H" value={hitter.hits ?? "-"} />
                <StatCard label="OPS" value={hitter.ops ?? "-"} />
              </>
            ) : pitcher ? (
              <>
                <StatCard label="ERA" value={pitcher.era} highlight />
                <StatCard label="W" value={pitcher.wins ?? "-"} />
                <StatCard label="K" value={pitcher.so ?? "-"} />
                <StatCard label="WHIP" value={pitcher.whip ?? "-"} />
                <StatCard label="IP" value={pitcher.ip ?? "-"} />
              </>
            ) : null}
          </div>
        </div>

        {/* 세이버메트릭스 스탯 카드 */}
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-note">
            세이버메트릭스
          </div>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
            {isHitter && hitter ? (
              <>
                <StatCard
                  label="OBP"
                  value={hitter.obp ?? "-"}
                  saber
                  desc="출루율"
                />
                <StatCard
                  label="SLG"
                  value={hitter.slg ?? "-"}
                  saber
                  desc="장타율"
                />
                <StatCard
                  label="ISO"
                  value={hitter.iso ?? "-"}
                  saber
                  desc="순수장타율 (SLG-AVG)"
                />
                <StatCard
                  label="BABIP"
                  value={hitter.babip ?? "-"}
                  saber
                  desc="인플레이 타구 타율"
                />
                <StatCard
                  label="BB%"
                  value={hitter.bbPct ? `${hitter.bbPct}%` : "-"}
                  saber
                  desc="볼넷율"
                />
              </>
            ) : pitcher ? (
              <>
                <StatCard
                  label="FIP"
                  value={pitcher.fip ?? "-"}
                  saber
                  desc="수비무관 평균자책점"
                />
                <StatCard
                  label="K/9"
                  value={pitcher.k9 ?? "-"}
                  saber
                  desc="9이닝당 탈삼진"
                />
                <StatCard
                  label="BB/9"
                  value={pitcher.bb9 ?? "-"}
                  saber
                  desc="9이닝당 볼넷"
                />
                <StatCard
                  label="HR/9"
                  value={pitcher.hr9 ?? "-"}
                  saber
                  desc="9이닝당 피홈런"
                />
                <StatCard
                  label="SV"
                  value={pitcher.saves ?? "-"}
                  saber={false}
                  desc="세이브"
                />
              </>
            ) : null}
          </div>
        </div>

        {/* 상황별 기록 또는 레이더 차트 + 상세 기록 */}
        <PlayerDetailAnalysisGrid>
          <PlayerInsightPanel
            isHitter={isHitter}
            hitter={hitter}
            pitcher={pitcher}
            situation={situation}
            situationLoading={situationLoading}
            playerName={player.playerName}
            teamColor={teamColor}
            radarData={radarData}
          />
          <SeasonDetailPanel rows={seasonDetailRows} />
        </PlayerDetailAnalysisGrid>

        {/* 연도별 통산 기록 */}
        {recordLoading ? (
          <Skeleton className="h-48 w-full rounded-[6px] bg-secondary" />
        ) : record && record.seasons.length > 0 ? (
          <CareerTable record={record} />
        ) : null}
      </div>
    </div>
  );
}
