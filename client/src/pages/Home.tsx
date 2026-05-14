import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { kboApi, TeamRank, Hitter, Pitcher } from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, TrendingUp, Trophy, Zap, Target, RefreshCw } from "lucide-react";

// ─── 숫자 카운트업 훅 ──────────────────────────────────────
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);
  return value;
}

// ─── 팀 순위 카드 ─────────────────────────────────────────
function TeamRankCard({ team, index }: { team: TeamRank; index: number }) {
  const wins = useCountUp(team.wins, 600 + index * 80);
  const losses = useCountUp(team.losses, 600 + index * 80);

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* 순위 */}
      <div
        className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          backgroundColor: index < 3 ? team.colors.primary + "33" : "transparent",
          color: index < 3 ? team.colors.primary : "var(--muted-foreground)",
          border: index < 3 ? `1px solid ${team.colors.primary}44` : "1px solid transparent",
        }}
      >
        {team.rank}
      </div>

      {/* 팀명 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: team.colors.primary }}
          />
          <span className="text-sm font-semibold truncate">{team.teamName}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 font-stat">
          {team.recentTen || ""}
        </div>
      </div>

      {/* 성적 */}
      <div className="text-right shrink-0">
        <div className="font-stat text-sm font-semibold">
          <span className="text-foreground">{wins}</span>
          <span className="text-muted-foreground mx-0.5">-</span>
          <span className="text-foreground">{losses}</span>
          {team.draws > 0 && <span className="text-muted-foreground">-{team.draws}</span>}
        </div>
        <div className="text-xs text-muted-foreground font-stat">{team.winRate}</div>
      </div>
    </div>
  );
}

// ─── 오늘의 리더 카드 ─────────────────────────────────────
function LeaderCard({
  label,
  player,
  value,
  unit,
  icon: Icon,
  delay,
}: {
  label: string;
  player: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
  delay: number;
}) {
  return (
    <div
      className="stat-card animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
          <Icon size={14} className="text-primary" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-display text-3xl text-foreground leading-none mb-1">
        {value}
        {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
      </div>
      <div className="text-sm text-muted-foreground">{player}</div>
    </div>
  );
}

// ─── 메인 홈 페이지 ───────────────────────────────────────
export default function Home() {
  const [teamRank, setTeamRank] = useState<TeamRank[]>([]);
  const [hitters, setHitters] = useState<Hitter[]>([]);
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rankRes, hitterRes, hrRes, pitcherRes, soRes] = await Promise.all([
        kboApi.getTeamRank(),
        kboApi.getLeaderboard("avg", "2026", undefined, 5),
        kboApi.getLeaderboard("hr", "2026", undefined, 5),
        kboApi.getLeaderboard("era", "2026", undefined, 5),
        kboApi.getLeaderboard("so", "2026", undefined, 5),
      ]);
      setTeamRank(rankRes.data);
      setHitters([
        ...(hitterRes.data as Hitter[]),
        ...(hrRes.data as Hitter[]),
      ]);
      setPitchers([
        ...(pitcherRes.data as Pitcher[]),
        ...(soRes.data as Pitcher[]),
      ]);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // hitters[0..4] = avg TOP5, hitters[5..9] = hr TOP5
  const topHitter = hitters[0] as Hitter | undefined;
  const topHR = (hitters.slice(5, 10) as Hitter[]).sort((a, b) => (b.hr || 0) - (a.hr || 0))[0] || hitters[5] as Hitter | undefined;
  // pitchers[0..4] = era TOP5, pitchers[5..9] = so TOP5
  const topPitcher = pitchers[0] as Pitcher | undefined;
  const topSO = (pitchers.slice(5, 10) as Pitcher[]).sort((a, b) => (b.so || 0) - (a.so || 0))[0] || pitchers[5] as Pitcher | undefined;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ─── 헤더 ─────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl text-foreground tracking-wider leading-none">
            오늘의 KBO
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          {lastUpdated ? `${lastUpdated} 업데이트` : "새로고침"}
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ─── 메인 그리드 ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 팀 순위 (2/3 너비) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-primary" />
              <h2 className="font-semibold text-sm">2026 시즌 팀 순위</h2>
            </div>
            <Link href="/teams" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              전체 보기 <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {teamRank.map((team, i) => (
                <TeamRankCard key={team.teamName} team={team} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* 오늘의 리더 (1/3 너비) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-primary" />
            <h2 className="font-semibold text-sm">오늘의 리더</h2>
          </div>

          {loading ? (
            <>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </>
          ) : (
            <>
              {topHitter && (
                <LeaderCard
                  label="타율 1위"
                  player={`${topHitter.playerName} · ${topHitter.teamName}`}
                  value={topHitter.avg}
                  icon={TrendingUp}
                  delay={0}
                />
              )}
              {topHR && (
                <LeaderCard
                  label="홈런 1위"
                  player={`${topHR.playerName} · ${topHR.teamName}`}
                  value={String(topHR.hr)}
                  unit="HR"
                  icon={Target}
                  delay={80}
                />
              )}
              {topPitcher && (
                <LeaderCard
                  label="평균자책점 1위"
                  player={`${topPitcher.playerName} · ${topPitcher.teamName}`}
                  value={topPitcher.era}
                  unit="ERA"
                  icon={Zap}
                  delay={160}
                />
              )}
              {topSO && (
                <LeaderCard
                  label="탈삼진 1위"
                  player={`${topSO.playerName} · ${topSO.teamName}`}
                  value={String(topSO.so)}
                  unit="K"
                  icon={Trophy}
                  delay={240}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── 타자 TOP 5 ────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="font-semibold text-sm">타율 TOP 5</h2>
          </div>
          <Link href="/leaderboard" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            리더보드 <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">순위</th>
                  <th className="text-left">선수</th>
                  <th className="text-left">팀</th>
                  <th className="text-right">타율</th>
                  <th className="text-right">홈런</th>
                  <th className="text-right">타점</th>
                  <th className="text-right">안타</th>
                </tr>
              </thead>
              <tbody>
                {hitters.map((h, i) => (
                  <tr key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <td>
                      <span className="font-stat text-muted-foreground">{i + 1}</span>
                    </td>
                    <td>
                      <Link href={`/players/${encodeURIComponent(h.playerName)}`} className="font-semibold hover:text-primary transition-colors">
                        {h.playerName}
                      </Link>
                    </td>
                    <td><TeamBadge teamName={h.teamName} /></td>
                    <td className="text-right font-stat font-semibold text-primary">{h.avg}</td>
                    <td className="text-right font-stat">{h.hr ?? "-"}</td>
                    <td className="text-right font-stat">{h.rbi ?? "-"}</td>
                    <td className="text-right font-stat">{h.hits ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 투수 TOP 5 ────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h2 className="font-semibold text-sm">평균자책점 TOP 5</h2>
          </div>
          <Link href="/leaderboard?tab=pitcher" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            리더보드 <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">순위</th>
                  <th className="text-left">선수</th>
                  <th className="text-left">팀</th>
                  <th className="text-right">ERA</th>
                  <th className="text-right">승</th>
                  <th className="text-right">패</th>
                  <th className="text-right">탈삼진</th>
                  <th className="text-right">WHIP</th>
                </tr>
              </thead>
              <tbody>
                {pitchers.map((p, i) => (
                  <tr key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <td><span className="font-stat text-muted-foreground">{i + 1}</span></td>
                    <td>
                      <Link href={`/players/${encodeURIComponent(p.playerName)}`} className="font-semibold hover:text-primary transition-colors">
                        {p.playerName}
                      </Link>
                    </td>
                    <td><TeamBadge teamName={p.teamName} /></td>
                    <td className="text-right font-stat font-semibold text-primary">{p.era}</td>
                    <td className="text-right font-stat">{p.wins}</td>
                    <td className="text-right font-stat">{p.losses}</td>
                    <td className="text-right font-stat">{p.so}</td>
                    <td className="text-right font-stat">{p.whip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 히어로 배너 ──────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden h-48 lg:h-64"
        style={{
          backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/89985747/AKLzP3Cbt4L68okniKfJmh/kbo-hero-bg-JGUEncaiXZGR4rqpUP2SWu.webp)`,
          backgroundSize: "cover",
          backgroundPosition: "center 60%",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/60 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-8">
          <div className="font-display text-4xl lg:text-5xl text-foreground tracking-wider leading-none mb-2">
            KBO STATS
          </div>
          <div className="text-muted-foreground text-sm lg:text-base max-w-sm">
            실시간 크롤링 기반의 KBO 야구 기록 조회 플랫폼.<br />
            선수·팀·리더보드를 한눈에 확인하세요.
          </div>
          <div className="flex gap-3 mt-4">
            <Link href="/leaderboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
              리더보드 보기 <ArrowRight size={14} />
            </Link>
            <Link href="/teams" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-foreground rounded-lg text-sm font-semibold hover:bg-white/15 transition-colors backdrop-blur-sm">
              팀 순위
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
