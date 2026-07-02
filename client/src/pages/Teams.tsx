import { useState, useEffect } from "react";
import { Link } from "wouter";
import { kboApi, TeamRank } from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

function WinRateBar({ winRate, color }: { winRate: string; color: string }) {
  const pct = parseFloat(winRate) * 100 || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-[2px] bg-secondary">
        <div
          className="h-full rounded-[2px] transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right font-stat text-xs font-black text-foreground">{winRate}</span>
    </div>
  );
}

function StreakBadge({ streak }: { streak: string }) {
  if (!streak) return null;
  const isWin = streak.includes("승");
  const isDraw = streak.includes("무");
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 font-stat text-xs font-black ${
        isWin
          ? "border-success/40 bg-success/10 text-success"
          : isDraw
            ? "border-draw/40 bg-draw/10 text-draw"
            : "border-destructive/40 bg-destructive/10 text-destructive"
      }`}
    >
      {isWin ? <TrendingUp size={10} /> : isDraw ? <Minus size={10} /> : <TrendingDown size={10} />}
      {streak}
    </span>
  );
}

function TeamCard({ team, index }: { team: TeamRank; index: number }) {
  const winPct = parseFloat(team.winRate) * 100 || 0;

  return (
    <Link href={`/teams/${encodeURIComponent(team.teamShort)}`}>
      <article
        className="cursor-pointer overflow-hidden rounded-[6px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(17_24_39/0.08)] transition-colors hover:border-border-strong animate-fade-in-up"
        style={{
          animationDelay: `${index * 60}ms`,
          borderTop: `3px solid ${team.colors.primary}`,
        }}
      >
        {/* 상단: 순위 + 팀명 */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <TeamBadge teamName={team.teamName} size="lg" />
            <div>
              <div className="text-sm font-bold text-foreground">{team.teamFull}</div>
              <div className="mt-0.5 font-stat text-xs text-muted-foreground">{team.games}경기</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge streak={team.streak} />
            <span className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-foreground font-stat text-sm font-black text-background">
              {team.rank}
            </span>
          </div>
        </div>

        {/* 성적 */}
        <div className="mb-4 grid grid-cols-3 divide-x divide-border border-y border-border">
          <div className="py-2.5 text-center">
            <div className="font-stat text-2xl font-black leading-none text-foreground">{team.wins}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">승</div>
          </div>
          <div className="py-2.5 text-center">
            <div className="font-stat text-2xl font-black leading-none text-foreground">{team.losses}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">패</div>
          </div>
          <div className="py-2.5 text-center">
            <div className="font-stat text-2xl font-black leading-none text-foreground">{team.draws}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">무</div>
          </div>
        </div>

        {/* 승률 바 */}
        <WinRateBar winRate={team.winRate} color={team.colors.primary} />

        {/* 하단 정보 */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <div>
            <span>최근 10경기: </span>
            <span className="font-stat font-bold text-foreground">{team.recentTen || "-"}</span>
          </div>
          <div>
            GB: <span className="font-stat font-bold text-foreground">{team.gameBehind || "-"}</span>
          </div>
        </div>

        {/* 홈/원정 */}
        <div className="mt-2 flex gap-4 font-stat text-xs text-muted-foreground">
          <span>홈 {team.home || "-"}</span>
          <span>원정 {team.away || "-"}</span>
        </div>
      </article>
    </Link>
  );
}

export default function Teams() {
  const [teams, setTeams] = useState<TeamRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    kboApi.getTeamRank().then((res) => {
      setTeams(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-border-strong pb-5">
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Trophy size={14} />
            Team standings
          </p>
          <h1 className="font-serif text-4xl font-black leading-tight text-foreground">
            팀 순위
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            2026 KBO 리그 · 10개 구단 순위 · 데이터 출처: KBO 공식 사이트
          </p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full rounded-[6px] bg-secondary" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team, i) => (
              <TeamCard key={team.teamName} team={team} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
