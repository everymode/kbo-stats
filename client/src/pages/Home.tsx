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

// ─── 최근 10경기 색상 블록 (오른쪽이 최신) ────────────────
function RecentTenBlocks({ recentTen, streak }: { recentTen: string; streak: string }) {
  if (!recentTen) return null;
  const wMatch = recentTen.match(/(\d+)승/);
  const dMatch = recentTen.match(/(\d+)무/);
  const lMatch = recentTen.match(/(\d+)패/);
  let w = parseInt(wMatch?.[1] ?? "0");
  let d = parseInt(dMatch?.[1] ?? "0");
  let l = parseInt(lMatch?.[1] ?? "0");

  // streak로 최근 연속 기록 파악 (오른쪽 배치)
  const sMatch = streak?.match(/(\d+)(승|패|무)/);
  const sCount = parseInt(sMatch?.[1] ?? "0");
  const sType = sMatch?.[2] ?? "";

  // 연속 기록분을 총합에서 빼기
  if (sType === "승") w = Math.max(0, w - sCount);
  else if (sType === "패") l = Math.max(0, l - sCount);
  else if (sType === "무") d = Math.max(0, d - sCount);

  // 비연속 구간: 패→무→승 (오래된 것부터)
  const blocks: ("w" | "d" | "l")[] = [];
  for (let i = 0; i < l; i++) blocks.push("l");
  for (let i = 0; i < d; i++) blocks.push("d");
  for (let i = 0; i < w; i++) blocks.push("w");

  // 연속 기록을 오른쪽 끝에 추가 (가장 최신)
  const streakChar: "w" | "d" | "l" = sType === "승" ? "w" : sType === "무" ? "d" : "l";
  for (let i = 0; i < sCount; i++) blocks.push(streakChar);

  return (
    <div className="flex gap-[3px]">
      {blocks.map((b, i) => (
        <div
          key={i}
          className={`w-[18px] h-[18px] rounded text-[9px] font-bold flex items-center justify-center text-white ${
            b === "w" ? "bg-green-600" : b === "d" ? "bg-gray-400" : "bg-red-500"
          }`}
        >
          {b === "w" ? "W" : b === "d" ? "D" : "L"}
        </div>
      ))}
    </div>
  );
}

// ─── 리더 카드 ────────────────────────────────────────────
function LeaderCard({
  label,
  playerName,
  teamName,
  value,
  unit,
  image,
}: {
  label: string;
  playerName: string;
  teamName: string;
  value: string;
  unit: string;
  image: string;
}) {
  return (
    <div className="relative bg-card border border-border rounded-2xl overflow-hidden min-h-[120px]">
      {/* 이미지 - 카드 우측에 크게 */}
      <div className="absolute right-0 top-0 bottom-0 w-[45%] pointer-events-none flex items-center justify-center opacity-40">
        <img src={image} alt="" className="w-full h-full object-contain p-2" />
      </div>
      {/* 텍스트 영역 */}
      <div className="relative z-10 p-5">
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
                            <RecentTenBlocks recentTen={team.recentTen} streak={team.streak} />
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
                  image="/leaderboard/AVG.png"
                />
              )}
              {topHR && (
                <LeaderCard
                  label="홈런 1위"
                  playerName={topHR.playerName}
                  teamName={topHR.teamName}
                  value={String(topHR.hr)}
                  unit="HR"
                  image="/leaderboard/Homerun.png"
                />
              )}
              {topERA && (
                <LeaderCard
                  label="평균자책점 1위"
                  playerName={topERA.playerName}
                  teamName={topERA.teamName}
                  value={topERA.era}
                  unit="ERA"
                  image="/leaderboard/ERA.png"
                />
              )}
              {topSO && (
                <LeaderCard
                  label="탈삼진 1위"
                  playerName={topSO.playerName}
                  teamName={topSO.teamName}
                  value={String(topSO.so)}
                  unit="K"
                  image="/leaderboard/StrikeOut.png"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
