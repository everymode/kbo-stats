import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { kboApi, Hitter, Pitcher, getTeamColor } from "@/lib/kboApi";
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

// ─── 스탯 카드 ────────────────────────────────────────────
function StatCard({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`stat-card text-center ${highlight ? "border-primary/30" : ""}`}>
      <div
        className={`font-display text-3xl leading-none mb-1 ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value ?? "-"}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

// ─── 타자 레이더 데이터 계산 ─────────────────────────────
function getHitterRadarData(h: Hitter) {
  const avg = parseFloat(h.avg || "0");
  const ops = parseFloat(h.ops || "0");
  const sbRate = h.sb && h.pa ? (h.sb / h.pa) * 100 : 0;
  const hrRate = h.hr && h.ab ? (h.hr / h.ab) * 100 : 0;
  const bbRate = h.bb && h.pa ? (h.bb / h.pa) * 100 : 0;

  return [
    { subject: "컨택", value: Math.min(100, avg * 250), fullMark: 100 },
    { subject: "파워", value: Math.min(100, hrRate * 1200), fullMark: 100 },
    { subject: "선구안", value: Math.min(100, bbRate * 500), fullMark: 100 },
    { subject: "주루", value: Math.min(100, sbRate * 800), fullMark: 100 },
    { subject: "출루", value: Math.min(100, parseFloat(h.obp || "0") * 250), fullMark: 100 },
  ];
}

// ─── 투수 레이더 데이터 계산 ─────────────────────────────
function getPitcherRadarData(p: Pitcher) {
  const era = parseFloat(p.era || "9.99");
  const whip = parseFloat(p.whip || "2.00");
  const ip = parseFloat(p.ip || "0");
  const soRate = p.so && ip > 0 ? (p.so / ip) * 9 : 0;
  const hrRate = p.hr && ip > 0 ? (p.hr / ip) * 9 : 0;

  return [
    { subject: "구위", value: Math.min(100, Math.max(0, (5 - era) * 20)), fullMark: 100 },
    { subject: "제구", value: Math.min(100, Math.max(0, (2 - whip) * 70)), fullMark: 100 },
    { subject: "탈삼진", value: Math.min(100, soRate * 10), fullMark: 100 },
    { subject: "이닝", value: Math.min(100, ip * 0.6), fullMark: 100 },
    { subject: "피홈런억제", value: Math.min(100, Math.max(0, (2 - hrRate) * 60)), fullMark: 100 },
  ];
}

export default function PlayerDetail() {
  const params = useParams<{ name: string }>();
  const playerName = decodeURIComponent(params.name || "");
  const [hitter, setHitter] = useState<Hitter | null>(null);
  const [pitcher, setPitcher] = useState<Pitcher | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerName) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await kboApi.searchPlayers(playerName);
        for (const p of res.data) {
          if (p.playerName === playerName) {
            if ((p as any).type === "pitcher") {
              setPitcher(p as Pitcher);
            } else {
              setHitter(p as Hitter);
            }
            break;
          }
        }
        // 못 찾으면 첫번째 결과 사용
        if (res.data.length > 0 && !hitter && !pitcher) {
          const first = res.data[0];
          if ((first as any).type === "pitcher") setPitcher(first as Pitcher);
          else setHitter(first as Hitter);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [playerName]);

  const player = hitter || pitcher;
  const isHitter = !!hitter;
  const teamColor = player ? getTeamColor(player.teamName) : { primary: "#666", secondary: "#fff" };
  const radarData = hitter ? getHitterRadarData(hitter) : pitcher ? getPitcherRadarData(pitcher) : [];

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-4 lg:p-6">
        <Link href="/players" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft size={16} /> 선수 목록으로
        </Link>
        <div className="text-center py-20 text-muted-foreground">
          <User size={48} className="mx-auto mb-4 opacity-30" />
          <p>선수 정보를 찾을 수 없습니다: {playerName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* 뒤로가기 */}
      <Link href="/players" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft size={14} /> 선수 목록
      </Link>

      {/* 프로필 헤더 */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 lg:p-8"
        style={{
          background: `linear-gradient(135deg, ${teamColor.primary}22 0%, transparent 60%)`,
          border: `1px solid ${teamColor.primary}33`,
        }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 80% 50%, ${teamColor.primary} 0%, transparent 60%)`,
          }}
        />
        <div className="relative flex items-center gap-5">
          {/* 아바타 */}
          <div
            className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center text-3xl font-display shrink-0"
            style={{
              backgroundColor: teamColor.primary + "33",
              color: teamColor.primary,
              border: `2px solid ${teamColor.primary}55`,
            }}
          >
            {player.playerName.charAt(0)}
          </div>

          <div>
            <h1 className="font-display text-3xl lg:text-4xl tracking-wider leading-none mb-1">
              {player.playerName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <TeamBadge teamName={player.teamName} showFull />
              <span className="text-xs text-muted-foreground">
                {isHitter ? "타자" : "투수"} · 2026시즌
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 핵심 스탯 카드 */}
      <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
        {isHitter && hitter ? (
          <>
            <StatCard label="AVG" value={hitter.avg} highlight />
            <StatCard label="HR" value={hitter.hr ?? "-"} />
            <StatCard label="RBI" value={hitter.rbi ?? "-"} />
            <StatCard label="OPS" value={hitter.ops ?? "-"} />
            <StatCard label="안타" value={hitter.hits ?? "-"} />
          </>
        ) : pitcher ? (
          <>
            <StatCard label="ERA" value={pitcher.era} highlight />
            <StatCard label="승" value={pitcher.wins ?? "-"} />
            <StatCard label="패" value={pitcher.losses ?? "-"} />
            <StatCard label="탈삼진" value={pitcher.so ?? "-"} />
            <StatCard label="WHIP" value={pitcher.whip ?? "-"} />
          </>
        ) : null}
      </div>

      {/* 레이더 차트 + 상세 기록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 레이더 차트 */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">능력치 레이더</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="oklch(1 0 0 / 8%)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "oklch(0.55 0.012 255)", fontSize: 11 }}
                />
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
                    background: "oklch(0.16 0.014 255)",
                    border: "1px solid oklch(1 0 0 / 10%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [`${val.toFixed(0)}점`, ""]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 상세 기록 테이블 */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-sm mb-4">2026 시즌 상세 기록</h3>
          <div className="space-y-2">
            {isHitter && hitter ? (
              [
                ["경기", hitter.games],
                ["타석", hitter.pa],
                ["타수", hitter.ab],
                ["득점", hitter.runs],
                ["안타", hitter.hits],
                ["2루타", hitter.doubles],
                ["3루타", hitter.triples],
                ["홈런", hitter.hr],
                ["타점", hitter.rbi],
                ["도루", hitter.sb],
                ["볼넷", hitter.bb],
                ["삼진", hitter.so],
                ["출루율", hitter.obp],
                ["장타율", hitter.slg],
                ["OPS", hitter.ops],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-stat text-sm font-medium">{value ?? "-"}</span>
                </div>
              ))
            ) : pitcher ? (
              [
                ["경기", pitcher.games],
                ["승", pitcher.wins],
                ["패", pitcher.losses],
                ["세이브", pitcher.saves],
                ["홀드", pitcher.holds],
                ["이닝", pitcher.ip],
                ["피안타", pitcher.hits],
                ["피홈런", pitcher.hr],
                ["볼넷", pitcher.bb],
                ["사구", pitcher.hbp],
                ["탈삼진", pitcher.so],
                ["실점", pitcher.runs],
                ["자책점", pitcher.er],
                ["WHIP", pitcher.whip],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="font-stat text-sm font-medium">{value ?? "-"}</span>
                </div>
              ))
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
