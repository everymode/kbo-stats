import { useState, useEffect } from "react";
import { kboApi, TeamRank, Hitter, Pitcher } from "@/lib/kboApi";
import TeamBadge from "@/components/TeamBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Trophy, TrendingUp, Zap } from "lucide-react";

const SEASONS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

// 시즌 수상자 데이터 (정적 - 실제 크롤링 확장 가능)
const SEASON_AWARDS: Record<string, { mvp?: string; rookie?: string; champion?: string }> = {
  "2025": { mvp: "김도영 (KIA)", rookie: "이재현 (KIA)", champion: "KIA 타이거즈" },
  "2024": { mvp: "김도영 (KIA)", rookie: "이재현 (KIA)", champion: "KIA 타이거즈" },
  "2023": { mvp: "문동주 (한화)", rookie: "문동주 (한화)", champion: "LG 트윈스" },
  "2022": { mvp: "이정후 (키움)", rookie: "강백호 (KT)", champion: "SSG 랜더스" },
  "2021": { mvp: "이정후 (키움)", rookie: "이의리 (KIA)", champion: "KT 위즈" },
  "2020": { mvp: "멜 로하스 주니어 (KT)", rookie: "소형준 (KT)", champion: "NC 다이노스" },
};

function AwardCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value?: string; color: string }) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "22" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{label}</div>
        <div className="font-semibold text-sm">{value || "미정"}</div>
      </div>
    </div>
  );
}

export default function Archive() {
  const [season, setSeason] = useState("2026");
  const [teamRank, setTeamRank] = useState<TeamRank[]>([]);
  const [topHitters, setTopHitters] = useState<Hitter[]>([]);
  const [topPitchers, setTopPitchers] = useState<Pitcher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rankRes, hitRes, pitRes] = await Promise.all([
          kboApi.getTeamRank(),
          kboApi.getLeaderboard("avg", season, undefined, 5),
          kboApi.getLeaderboard("era", season, undefined, 5),
        ]);
        setTeamRank(rankRes.data);
        setTopHitters(hitRes.data as Hitter[]);
        setTopPitchers(pitRes.data as Pitcher[]);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [season]);

  const awards = SEASON_AWARDS[season];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={20} className="text-primary" />
            <h1 className="font-display text-3xl lg:text-4xl tracking-wider leading-none">시즌 아카이브</h1>
          </div>
          <p className="text-muted-foreground text-sm">역대 KBO 시즌 기록 조회</p>
        </div>
        <Select value={season} onValueChange={setSeason}>
          <SelectTrigger className="w-32 bg-secondary/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEASONS.map((s) => (
              <SelectItem key={s} value={s}>{s}시즌</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 수상자 */}
      {awards && (
        <div>
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">{season}시즌 주요 수상</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AwardCard icon={Trophy} label="MVP" value={awards.mvp} color="#FFD700" />
            <AwardCard icon={TrendingUp} label="신인왕" value={awards.rookie} color="#00C8E0" />
            <AwardCard icon={Trophy} label="한국시리즈 우승" value={awards.champion} color="#FF6600" />
          </div>
        </div>
      )}

      {/* 팀 순위 */}
      <div>
        <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">{season}시즌 팀 순위</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
            </div>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">순위</th>
                  <th className="text-left">팀</th>
                  <th className="text-right">경기</th>
                  <th className="text-right">승</th>
                  <th className="text-right">패</th>
                  <th className="text-right">무</th>
                  <th className="text-right">승률</th>
                  <th className="text-right hidden lg:table-cell">게임차</th>
                </tr>
              </thead>
              <tbody>
                {teamRank.map((team, i) => (
                  <tr key={team.teamName} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <td>
                      <span
                        className="font-bold font-stat"
                        style={{ color: i < 3 ? team.colors.primary : undefined }}
                      >
                        {team.rank}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: team.colors.primary }} />
                        <span className="font-medium">{team.teamFull}</span>
                      </div>
                    </td>
                    <td className="text-right font-stat">{team.games}</td>
                    <td className="text-right font-stat">{team.wins}</td>
                    <td className="text-right font-stat">{team.losses}</td>
                    <td className="text-right font-stat">{team.draws}</td>
                    <td className="text-right font-stat font-semibold text-primary">{team.winRate}</td>
                    <td className="text-right font-stat hidden lg:table-cell">{team.gameBehind || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 타자/투수 하이라이트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-primary" />
            <h3 className="font-semibold text-sm">{season}시즌 타율 TOP 5</h3>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {topHitters.map((h, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground font-stat">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{h.playerName}</span>
                  <TeamBadge teamName={h.teamName} />
                  <span className="font-stat text-sm font-semibold text-primary">{h.avg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-primary" />
            <h3 className="font-semibold text-sm">{season}시즌 ERA TOP 5</h3>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {topPitchers.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted-foreground font-stat">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{p.playerName}</span>
                  <TeamBadge teamName={p.teamName} />
                  <span className="font-stat text-sm font-semibold text-primary">{p.era}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
