import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { kboApi, Hitter, Pitcher, getTeamColor, PlayerRecord, HitterSeason, PitcherSeason } from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User } from "lucide-react";
import { Link } from "wouter";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";

// ─── 스탯 카드 ────────────────────────────────────────────
function StatCard({ label, value, highlight = false, saber = false, desc }: {
  label: string; value: string | number; highlight?: boolean; saber?: boolean; desc?: string;
}) {
  return (
    <div
      className={`stat-card text-center ${highlight ? "border-primary/40" : saber ? "border-note/30" : ""}`}
      title={desc}
    >
      <div className={`mb-1 font-stat text-2xl font-black leading-none lg:text-3xl ${highlight ? "text-primary" : saber ? "text-note" : "text-foreground"}`}>
        {value ?? "-"}
      </div>
      <div className={`text-xs font-bold uppercase tracking-wide ${saber ? "text-note/80" : "text-muted-foreground"}`}>{label}</div>
      {desc && <div className="mt-0.5 hidden text-xs text-muted-foreground lg:block">{desc}</div>}
    </div>
  );
}

// ─── 타자 레이더 데이터 ──────────────────────────────────
function getHitterRadarData(h: Hitter) {
  const avg = parseFloat(h.avg || "0");
  const ops = parseFloat(h.ops || "0");
  const hrRate = h.hr && h.ab ? (h.hr / h.ab) * 100 : 0;
  const bbPct = parseFloat(h.bbPct || "0");
  const obp = parseFloat(h.obp || "0");
  const iso = parseFloat(h.iso || "0");
  return [
    { subject: "컨택",   value: Math.min(100, avg * 250) },
    { subject: "파워",   value: Math.min(100, hrRate * 1200) },
    { subject: "선구안", value: Math.min(100, bbPct * 5) },
    { subject: "출루",   value: Math.min(100, obp * 250) },
    { subject: "장타력", value: Math.min(100, iso * 350) },
  ];
}

// ─── 투수 레이더 데이터 ──────────────────────────────────
function getPitcherRadarData(p: Pitcher) {
  const era = parseFloat(p.era || "9.99");
  const whip = parseFloat(p.whip || "2.00");
  const ip = parseFloat(p.ip || "0");
  const fip = parseFloat(p.fip || "9.99");
  const k9 = parseFloat(p.k9 || "0");
  return [
    { subject: "구위",      value: Math.min(100, Math.max(0, (5 - era) * 20)) },
    { subject: "제구",      value: Math.min(100, Math.max(0, (2 - whip) * 70)) },
    { subject: "탈삼진",    value: Math.min(100, k9 * 10) },
    { subject: "이닝소화",  value: Math.min(100, ip * 0.6) },
    { subject: "FIP",       value: Math.min(100, Math.max(0, (5 - fip) * 20)) },
  ];
}

// ─── 연도별 통산 기록 테이블 ─────────────────────────────
const HITTER_CAREER_COLS: { key: keyof HitterSeason; label: string; dec?: number }[] = [
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

const PITCHER_CAREER_COLS: { key: keyof PitcherSeason; label: string; dec?: number }[] = [
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
const HITTER_CAREER_BLANK = new Set(["isop", "babip", "woba", "wrcPlus", "war"]);
const PITCHER_CAREER_BLANK = new Set(["war", "k9", "bb9", "ops"]);

function fmtCell(row: any, key: string, blankSet: Set<string>, dec?: number): string {
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
    if (Number.isFinite(n) && Math.abs(n) < 1) return v.replace(/^(-?)0\./, "$1.");
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
        <h3 className="font-serif text-lg font-black text-foreground">연도별 통산 기록</h3>
        <span className="text-[0.65rem] text-muted-foreground">데이터 출처: 네이버 스포츠 · 스태티즈</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-xs">
          <thead>
            <tr className="border-b border-border-strong bg-muted text-[11px] uppercase tracking-wide">
              <th className="sticky left-0 z-10 bg-muted px-3 py-2.5 text-left font-black text-muted-foreground">시즌</th>
              {cols.map((c) => (
                <th key={c.key} className="px-2.5 py-2.5 text-center font-black text-muted-foreground">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {record.seasons.map((s) => (
              <tr
                key={s.year + s.team}
                className={`border-b border-border transition-colors hover:bg-accent ${s.isCareer ? "bg-muted font-bold" : ""}`}
              >
                <td className={`sticky left-0 z-10 px-3 py-2 font-stat font-bold ${s.isCareer ? "bg-muted" : "bg-card"}`}>{s.year}</td>
                {cols.map((c) => (
                  <td key={c.key} className="px-2.5 py-2 text-center font-stat tabular-nums">
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
  const params = useParams<{ name: string }>();
  const playerName = decodeURIComponent(params.name || "");
  const [hitter, setHitter] = useState<Hitter | null>(null);
  const [pitcher, setPitcher] = useState<Pitcher | null>(null);
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<PlayerRecord | null>(null);
  const [recordLoading, setRecordLoading] = useState(false);

  useEffect(() => {
    if (!playerName) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await kboApi.searchPlayers(playerName);
        for (const p of res.data) {
          if (p.playerName === playerName) {
            if ((p as any).type === "pitcher") setPitcher(p as Pitcher);
            else setHitter(p as Hitter);
            break;
          }
        }
        if (res.data.length > 0 && !hitter && !pitcher) {
          const first = res.data[0];
          if ((first as any).type === "pitcher") setPitcher(first as Pitcher);
          else setHitter(first as Hitter);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, [playerName]);

  const player = hitter || pitcher;
  const isHitter = !!hitter;
  const playerId = (player as any)?.playerId as string | undefined;

  // 연도별 통산 기록 로드 (네이버 career API, playerId 기반)
  useEffect(() => {
    if (!playerId) { setRecord(null); return; }
    let cancelled = false;
    const loadRecord = async () => {
      setRecordLoading(true);
      try {
        const r = await kboApi.getPlayerRecord(playerId);
        if (!cancelled) setRecord(r);
      } catch { if (!cancelled) setRecord(null); }
      finally { if (!cancelled) setRecordLoading(false); }
    };
    loadRecord();
    return () => { cancelled = true; };
  }, [playerId]);

  const teamColor = player ? getTeamColor(player.teamName) : { primary: "#666", secondary: "#fff" };
  const radarData = hitter ? getHitterRadarData(hitter) : pitcher ? getPitcherRadarData(pitcher) : [];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-7 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48 bg-secondary" />
        <Skeleton className="h-40 w-full rounded-[6px] bg-secondary" />
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-[6px] bg-secondary" />)}
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <Link href="/players" className="mb-6 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft size={16} /> 선수 목록으로
        </Link>
        <div className="py-20 text-center text-muted-foreground">
          <User size={48} className="mx-auto mb-4 opacity-30" />
          <p>선수 정보를 찾을 수 없습니다: {playerName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-7 sm:px-6 lg:px-8">
      <Link href="/players" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
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
                onError={(e) => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  el.parentElement!.classList.add("flex", "items-center", "justify-center");
                  const span = document.createElement("span");
                  span.className = "text-3xl font-serif font-black";
                  span.style.color = teamColor.primary;
                  span.textContent = player.playerName.charAt(0);
                  el.parentElement!.appendChild(span);
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-serif text-3xl font-black" style={{ color: teamColor.primary }}>
                {player.playerName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="mb-1 font-serif text-3xl font-black leading-none text-foreground lg:text-4xl">{player.playerName}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <TeamBadge teamName={player.teamName} showFull />
              <span className="text-xs text-muted-foreground">{isHitter ? "타자" : "투수"} · 2026시즌</span>
            </div>
          </div>
        </div>
      </header>

      {/* 핵심 스탯 카드 */}
      <div>
        <div className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">핵심 스탯</div>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
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
        <div className="mb-2 text-xs font-black uppercase tracking-wide text-note">세이버메트릭스</div>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
          {isHitter && hitter ? (
            <>
              <StatCard label="OBP" value={hitter.obp ?? "-"} saber desc="출루율" />
              <StatCard label="SLG" value={hitter.slg ?? "-"} saber desc="장타율" />
              <StatCard label="ISO" value={hitter.iso ?? "-"} saber desc="순수장타율 (SLG-AVG)" />
              <StatCard label="BABIP" value={hitter.babip ?? "-"} saber desc="인플레이 타구 타율" />
              <StatCard label="BB%" value={hitter.bbPct ? `${hitter.bbPct}%` : "-"} saber desc="볼넷율" />
            </>
          ) : pitcher ? (
            <>
              <StatCard label="FIP" value={pitcher.fip ?? "-"} saber desc="수비무관 평균자책점" />
              <StatCard label="K/9" value={pitcher.k9 ?? "-"} saber desc="9이닝당 탈삼진" />
              <StatCard label="BB/9" value={pitcher.bb9 ?? "-"} saber desc="9이닝당 볼넷" />
              <StatCard label="HR/9" value={pitcher.hr9 ?? "-"} saber desc="9이닝당 피홈런" />
              <StatCard label="SV" value={pitcher.saves ?? "-"} saber={false} desc="세이브" />
            </>
          ) : null}
        </div>
      </div>

      {/* 레이더 차트 + 상세 기록 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 레이더 차트 */}
        <div className="rounded-[6px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
          <h3 className="mb-4 font-serif text-lg font-black text-foreground">능력치 레이더</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Radar
                  name={player.playerName}
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
        </div>

        {/* 상세 기록 테이블 */}
        <div className="rounded-[6px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
          <h3 className="mb-4 font-serif text-lg font-black text-foreground">2026 시즌 상세 기록</h3>
          <div className="max-h-64 space-y-0 overflow-y-auto">
            {isHitter && hitter ? (
              [
                ["경기", hitter.games], ["타석", hitter.pa], ["타수", hitter.ab],
                ["득점", hitter.runs], ["안타", hitter.hits], ["2루타", hitter.doubles],
                ["3루타", hitter.triples], ["홈런", hitter.hr], ["타점", hitter.rbi],
                ["볼넷", hitter.bb], ["삼진", hitter.so], ["희타", hitter.sac],
                ["희비", hitter.sf], ["병살", hitter.gdp],
                ["─ 세이버 ─", ""],
                ["출루율 OBP", hitter.obp], ["장타율 SLG", hitter.slg], ["OPS", hitter.ops],
                ["ISO", hitter.iso], ["BABIP", hitter.babip],
                ["BB%", hitter.bbPct ? `${hitter.bbPct}%` : "-"],
                ["K%", hitter.kPct ? `${hitter.kPct}%` : "-"],
              ].map(([label, value]) => (
                <div key={String(label)} className={`flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 ${String(label).includes("─") ? "opacity-50" : ""}`}>
                  <span className={`text-xs ${String(label).includes("─") ? "text-muted-foreground" : "text-muted-foreground"}`}>{label}</span>
                  <span className="font-stat text-xs font-medium">{value ?? "-"}</span>
                </div>
              ))
            ) : pitcher ? (
              [
                ["경기", pitcher.games], ["승", pitcher.wins], ["패", pitcher.losses],
                ["세이브", pitcher.saves], ["홀드", pitcher.holds], ["이닝", pitcher.ip],
                ["피안타", pitcher.hits], ["피홈런", pitcher.hr], ["볼넷", pitcher.bb],
                ["사구", pitcher.hbp], ["탈삼진", pitcher.so], ["실점", pitcher.runs],
                ["자책점", pitcher.er],
                ["─ 세이버 ─", ""],
                ["WHIP", pitcher.whip], ["FIP", pitcher.fip],
                ["K/9", pitcher.k9], ["BB/9", pitcher.bb9], ["HR/9", pitcher.hr9],
              ].map(([label, value]) => (
                <div key={String(label)} className={`flex items-center justify-between py-1.5 border-b border-border/30 last:border-0 ${String(label).includes("─") ? "opacity-50" : ""}`}>
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-stat text-xs font-medium">{value ?? "-"}</span>
                </div>
              ))
            ) : null}
          </div>
        </div>
      </div>

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
