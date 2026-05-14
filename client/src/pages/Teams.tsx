import { useState, useEffect } from "react";
import { Link } from "wouter";
import { kboApi, TeamRank, TEAM_FULL_NAMES } from "@/lib/kboApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

function WinRateBar({ winRate, color }: { winRate: string; color: string }) {
  const pct = parseFloat(winRate) * 100 || 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-stat text-xs text-muted-foreground w-8 text-right">{winRate}</span>
    </div>
  );
}

function StreakBadge({ streak }: { streak: string }) {
  if (!streak) return null;
  const isWin = streak.includes("승");
  const isDraw = streak.includes("무");
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
        isWin ? "bg-green-500/15 text-green-400" :
        isDraw ? "bg-yellow-500/15 text-yellow-400" :
        "bg-red-500/15 text-red-400"
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
        className="card-glow bg-card border border-border rounded-xl p-5 cursor-pointer animate-fade-in-up"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* 상단: 순위 + 팀명 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-display text-xl font-bold"
              style={{
                backgroundColor: team.colors.primary + "22",
                color: team.colors.primary,
                border: `1px solid ${team.colors.primary}44`,
              }}
            >
              {team.rank}
            </div>
            <div>
              <div className="font-bold text-sm">{team.teamFull}</div>
              <div className="text-xs text-muted-foreground">{team.games}경기</div>
            </div>
          </div>
          <StreakBadge streak={team.streak} />
        </div>

        {/* 성적 */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center">
            <div className="font-display text-2xl text-foreground leading-none">{team.wins}</div>
            <div className="text-xs text-muted-foreground mt-0.5">승</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-foreground leading-none">{team.losses}</div>
            <div className="text-xs text-muted-foreground mt-0.5">패</div>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl text-foreground leading-none">{team.draws}</div>
            <div className="text-xs text-muted-foreground mt-0.5">무</div>
          </div>
        </div>

        {/* 승률 바 */}
        <WinRateBar winRate={team.winRate} color={team.colors.primary} />

        {/* 하단 정보 */}
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span>최근 10경기: </span>
            <span className="text-foreground font-medium">{team.recentTen || "-"}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            GB: <span className="text-foreground">{team.gameBehind || "-"}</span>
          </div>
        </div>

        {/* 홈/원정 */}
        <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
          <span>홈 {team.home || "-"}</span>
          <span>원정 {team.away || "-"}</span>
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
    <div className="p-4 lg:p-6">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={20} className="text-primary" />
        <h1 className="font-display text-3xl lg:text-4xl tracking-wider leading-none">팀 순위</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">2026 KBO 리그 — 10개 구단 실시간 순위</p>

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
