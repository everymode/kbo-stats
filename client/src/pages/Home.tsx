import { useState, useEffect } from "react";
import { Link } from "wouter";
import { kboApi, TeamRank, Hitter, Pitcher } from "@/lib/kboApi";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

// ─── 팀 로고 매핑 ───────────────────────────────────────
const TEAM_LOGO_MAP: Record<string, string> = {
  KT: "/logos/KT.svg",
  삼성: "/logos/samsung.svg",
  LG: "/logos/lg.svg",
  SSG: "/logos/ssg.svg",
  KIA: "/logos/KIA.svg",
  한화: "/logos/hanhwa.svg",
  두산: "/logos/Doosan.svg",
  NC: "/logos/nc.svg",
  롯데: "/logos/Lotte.svg",
  키움: "/logos/Kiwoom.svg",
};

function getTeamLogo(teamName: string) {
  for (const [key, path] of Object.entries(TEAM_LOGO_MAP)) {
    if (teamName.includes(key)) return path;
  }
  return "";
}

// ─── 최근 10경기 색상 블록 ────────────────────────────────
function RecentTenBlocks({ recentTen }: { recentTen: string }) {
  if (!recentTen) return null;
  const wMatch = recentTen.match(/(\d+)승/);
  const dMatch = recentTen.match(/(\d+)무/);
  const lMatch = recentTen.match(/(\d+)패/);
  const w = parseInt(wMatch?.[1] ?? "0");
  const d = parseInt(dMatch?.[1] ?? "0");
  const l = parseInt(lMatch?.[1] ?? "0");
  const blocks: ("w" | "d" | "l")[] = [];
  for (let i = 0; i < w; i++) blocks.push("w");
  for (let i = 0; i < d; i++) blocks.push("d");
  for (let i = 0; i < l; i++) blocks.push("l");

  return (
    <div className="flex gap-[3px]">
      {blocks.map((b, i) => (
        <div
          key={i}
          className={`w-[18px] h-[18px] rounded text-[9px] font-bold flex items-center justify-center text-white ${
            b === "w" ? "bg-green-600" : b === "d" ? "bg-gray-400" : "bg-red-500"
          }`}
        >
          {b === "w" ? "승" : b === "d" ? "무" : "패"}
        </div>
      ))}
    </div>
  );
}

// ─── 선수 실루엣 SVG ──────────────────────────────────────
function BatterSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 120" className={className} fill="currentColor" opacity="0.12">
      <ellipse cx="40" cy="25" rx="10" ry="12" />
      <path d="M30 38 C25 42 22 55 24 70 L28 70 L30 55 L35 50 L35 90 L30 115 L35 115 L42 90 L48 115 L53 115 L48 90 L48 50 L53 55 L55 70 L59 70 C61 55 58 42 53 38 Z" />
      <path d="M53 42 L70 20 L72 22 L56 45 Z" />
    </svg>
  );
}

function PitcherSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 120" className={className} fill="currentColor" opacity="0.12">
      <ellipse cx="40" cy="22" rx="9" ry="11" />
      <path d="M32 34 C27 38 25 50 26 62 L30 62 L32 50 L36 46 L36 85 L31 112 L36 112 L42 85 L48 112 L53 112 L48 85 L48 46 L52 50 L54 62 L58 62 C59 50 57 38 52 34 Z" />
      <path d="M28 38 L12 28 L11 31 L26 42 Z" />
      <circle cx="10" cy="27" r="3" />
    </svg>
  );
}

// ─── 리더 카드 ────────────────────────────────────────────
function LeaderCard({
  label,
  playerName,
  teamName,
  value,
  unit,
  type,
}: {
  label: string;
  playerName: string;
  teamName: string;
  value: string;
  unit: string;
  type: "batter" | "pitcher";
}) {
  return (
    <div className="relative bg-card border border-border rounded-2xl p-5 overflow-hidden">
      <div className="absolute right-2 top-2 bottom-2 w-20 pointer-events-none text-foreground">
        {type === "batter" ? <BatterSilhouette className="w-full h-full" /> : <PitcherSilhouette className="w-full h-full" />}
      </div>
      <div className="relative z-10">
        <div className="text-xs font-bold text-muted-foreground mb-2">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl text-foreground leading-none">{value}</span>
          <span className="text-sm font-semibold text-muted-foreground">{unit}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-2 font-medium">
          {playerName} · {teamName}
        </div>
      </div>
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

  useEffect(() => {
    (async () => {
      try {
        const [rankRes, avgRes, hrRes, eraRes, soRes] = await Promise.all([
          kboApi.getTeamRank(),
          kboApi.getLeaderboard("avg", "2026", undefined, 1),
          kboApi.getLeaderboard("hr", "2026", undefined, 1),
          kboApi.getLeaderboard("era", "2026", undefined, 1),
          kboApi.getLeaderboard("so", "2026", undefined, 1),
        ]);
        setTeamRank(rankRes.data);
        setHitters([...(avgRes.data as Hitter[]), ...(hrRes.data as Hitter[])]);
        setPitchers([...(eraRes.data as Pitcher[]), ...(soRes.data as Pitcher[])]);
      } catch {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const topAvg = hitters[0] as Hitter | undefined;
  const topHR = hitters[1] as Hitter | undefined;
  const topERA = pitchers[0] as Pitcher | undefined;
  const topSO = pitchers[1] as Pitcher | undefined;

  return (
    <div className="p-4 lg:p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">오늘의 KBO</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {/* 메인 그리드: 팀순위 테이블 + 오늘의 리더 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* ─── 팀 순위 테이블 ─────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-foreground rounded-full" />
              <h2 className="font-bold text-base">2026 시즌 팀 순위</h2>
            </div>
            <Link href="/teams" className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
              전체 보기 <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left py-3 px-4 text-xs font-bold text-muted-foreground w-14">순위</th>
                    <th className="text-left py-3 px-2 text-xs font-bold text-muted-foreground">팀</th>
                    <th className="text-center py-3 px-2 text-xs font-bold text-muted-foreground">최근 10경기</th>
                    <th className="text-center py-3 px-2 text-xs font-bold text-muted-foreground">승-패-무</th>
                    <th className="text-center py-3 px-2 text-xs font-bold text-muted-foreground">승률</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-muted-foreground">게임차</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRank.map((team, i) => (
                    <>
                      <tr
                        key={team.teamName}
                        className="border-b border-border/50 hover:bg-accent/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold text-center text-base">{team.rank}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getTeamLogo(team.teamName)}
                              alt={team.teamName}
                              className="w-8 h-8 object-contain"
                            />
                            <span className="font-semibold">{team.teamFull}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex justify-center">
                            <RecentTenBlocks recentTen={team.recentTen} />
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-stat font-medium">
                          {team.wins}-{team.losses}{team.draws > 0 ? `-${team.draws}` : ""}
                        </td>
                        <td className="py-3 px-2 text-center font-stat font-semibold">{team.winRate}</td>
                        <td className="py-3 px-4 text-center font-stat text-muted-foreground">
                          {team.gameBehind === "0" ? "-" : team.gameBehind}
                        </td>
                      </tr>
                      {/* 포스트시즌 커트라인 (5위 아래) */}
                      {i === 4 && (
                        <tr key="cutline">
                          <td colSpan={6} className="py-0">
                            <div className="flex items-center gap-2 px-4 py-1">
                              <div className="flex-1 border-t-2 border-dashed border-green-500/60" />
                              <span className="text-[0.6rem] text-green-600 dark:text-green-400 font-bold whitespace-nowrap">포스트시즌 커트라인</span>
                              <div className="flex-1 border-t-2 border-dashed border-green-500/60" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-2.5 text-[0.65rem] text-muted-foreground border-t border-border">
                · 승률이 같은 경우 승수 → 상대 전적 → 득실률 → 추첨 순으로 순위를 결정합니다.
              </div>
            </div>
          )}
        </div>

        {/* ─── 오늘의 리더 ────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4 border-b-2 border-foreground pb-2">
            <h2 className="font-bold text-base">오늘의 리더</h2>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {topAvg && (
                <LeaderCard
                  label="타율 1위"
                  playerName={topAvg.playerName}
                  teamName={topAvg.teamName}
                  value={topAvg.avg}
                  unit="AVG"
                  type="batter"
                />
              )}
              {topHR && (
                <LeaderCard
                  label="홈런 1위"
                  playerName={topHR.playerName}
                  teamName={topHR.teamName}
                  value={String(topHR.hr)}
                  unit="HR"
                  type="batter"
                />
              )}
              {topERA && (
                <LeaderCard
                  label="평균자책점 1위"
                  playerName={topERA.playerName}
                  teamName={topERA.teamName}
                  value={topERA.era}
                  unit="ERA"
                  type="pitcher"
                />
              )}
              {topSO && (
                <LeaderCard
                  label="탈삼진 1위"
                  playerName={topSO.playerName}
                  teamName={topSO.teamName}
                  value={String(topSO.so)}
                  unit="K"
                  type="pitcher"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
