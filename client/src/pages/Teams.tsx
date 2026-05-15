import { useState, useEffect } from "react";
import { Link } from "wouter";
import { kboApi, TeamRank, TEAM_FULL_NAMES } from "@/lib/kboApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

function WinRateBar({ winRate, color }: { winRate: string; color: string }) {
  const pct = parseFloat(winRate) * 100 || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-stat text-xs font-semibold text-foreground w-10 text-right">{winRate}</span>
    </div>
  );
}

function StreakBadge({ streak }: { streak: string }) {
  if (!streak) return null;
  const isWin = streak.includes("승");
  const isDraw = streak.includes("무");
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
        isWin ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
        isDraw ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
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
      <div
        className="card-glow border border-border p-6 cursor-pointer animate-fade-in-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* 상단: 순위 + 팀명 */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <TeamBadge teamName={team.teamName} size="lg" />
            <div>
              <div className="font-bold text-sm">{team.teamFull}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{team.games}경기</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StreakBadge streak={team.streak} />
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                team.rank <= 3
                  ? "bg-primary/10 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {team.rank}
            </span>
          </div>
        </div>

        {/* 성적 */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center bg-secondary/50 rounded-xl py-3">
            <div className="font-display text-2xl text-foreground leading-none">{team.wins}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">승</div>
          </div>
          <div className="text-center bg-secondary/50 rounded-xl py-3">
            <div className="font-display text-2xl text-foreground leading-none">{team.losses}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">패</div>
          </div>
          <div className="text-center bg-secondary/50 rounded-xl py-3">
            <div className="font-display text-2xl text-foreground leading-none">{team.draws}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">무</div>
          </div>
        </div>

        {/* 승률 바 */}
        <WinRateBar winRate={team.winRate} color={team.colors.primary} />

        {/* 하단 정보 */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span>최근 10경기: </span>
            <span className="text-foreground font-semibold">{team.recentTen || "-"}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            GB: <span className="text-foreground font-semibold">{team.gameBehind || "-"}</span>
          </div>
        </div>

        {/* 홈/원정 */}
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>🏠 홈 {team.home || "-"}</span>
          <span>✈️ 원정 {team.away || "-"}</span>
        </div>
      </div>
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
    <div className="p-4 lg:p-8">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Trophy size={18} className="text-primary" />
        </div>
        <h1 className="font-display text-3xl lg:text-4xl leading-tight">팀 순위</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-8">2026 KBO 리그 — 10개 구단 실시간 순위</p>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teams.map((team, i) => (
            <TeamCard key={team.teamName} team={team} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
