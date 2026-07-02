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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px]" style={{ backgroundColor: color + "22" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="mb-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-bold text-foreground">{value || "미정"}</div>
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
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <header className="flex items-start justify-between border-b border-border-strong pb-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Calendar size={14} />
            Season archive
          </p>
          <h1 className="font-serif text-4xl font-black leading-tight text-foreground">시즌 아카이브</h1>
          <p className="mt-2 text-sm text-muted-foreground">역대 KBO 시즌 기록 조회</p>
        </div>
        <Select value={season} onValueChange={setSeason}>
          <SelectTrigger className="h-9 w-32 rounded-[4px] border-input bg-popover text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEASONS.map((s) => (
              <SelectItem key={s} value={s}>{s}시즌</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      {/* 수상자 */}
      {awards && (
        <div>
          <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-muted-foreground">{season}시즌 주요 수상</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AwardCard icon={Trophy} label="MVP" value={awards.mvp} color="var(--warning)" />
            <AwardCard icon={TrendingUp} label="신인왕" value={awards.rookie} color="var(--primary)" />
            <AwardCard icon={Trophy} label="한국시리즈 우승" value={awards.champion} color="var(--note)" />
          </div>
        </div>
      )}

      {/* 팀 순위 */}
      <div>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wide text-muted-foreground">{season}시즌 팀 순위</h2>
        <div className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-[4px] bg-secondary" />)}
            </div>
          ) : (
            <table className="data-table w-full">
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
                        <div className="h-6 w-[3px] rounded-full" style={{ backgroundColor: team.colors.primary }} />
                        <span className="font-bold text-foreground">{team.teamFull}</span>
                      </div>
                    </td>
                    <td className="text-right font-stat">{team.games}</td>
                    <td className="text-right font-stat">{team.wins}</td>
                    <td className="text-right font-stat">{team.losses}</td>
                    <td className="text-right font-stat">{team.draws}</td>
                    <td className="text-right font-stat font-black text-primary">{team.winRate}</td>
                    <td className="hidden text-right font-stat lg:table-cell">{team.gameBehind || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 타자/투수 하이라이트 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[6px] border border-border bg-card p-4 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-primary" />
            <h3 className="font-serif text-lg font-black text-foreground">{season}시즌 타율 TOP 5</h3>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-secondary" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {topHitters.map((h, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <span className="w-5 font-stat text-xs font-black text-foreground">{i + 1}</span>
                  <span className="flex-1 text-sm font-bold text-foreground">{h.playerName}</span>
                  <TeamBadge teamName={h.teamName} />
                  <span className="font-stat text-sm font-black text-primary">{h.avg}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[6px] border border-border bg-card p-4 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
          <div className="mb-3 flex items-center gap-2">
            <Zap size={15} className="text-primary" />
            <h3 className="font-serif text-lg font-black text-foreground">{season}시즌 ERA TOP 5</h3>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full bg-secondary" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {topPitchers.map((p, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <span className="w-5 font-stat text-xs font-black text-foreground">{i + 1}</span>
                  <span className="flex-1 text-sm font-bold text-foreground">{p.playerName}</span>
                  <TeamBadge teamName={p.teamName} />
                  <span className="font-stat text-sm font-black text-primary">{p.era}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
