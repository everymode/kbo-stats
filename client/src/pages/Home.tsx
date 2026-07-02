import { Fragment, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Flag, Search, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Hitter, kboApi, Pitcher, TeamRank } from "@/lib/kboApi";

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

type Result = "W" | "D" | "L";

type LeaderSummary = {
  label: string;
  value: string;
  unit: string;
  playerName: string;
  teamName: string;
  href: string;
  photoUrl?: string;
  color?: string;
};

function getTeamLogo(teamName: string) {
  for (const [key, path] of Object.entries(TEAM_LOGO_MAP)) {
    if (teamName.includes(key)) return path;
  }
  return "";
}

function formatToday() {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function ResultChip({ result }: { result: Result }) {
  const tone =
    result === "W"
      ? "bg-[#16824a] text-white"
      : result === "D"
        ? "bg-[#7a808a] text-white"
        : "bg-[#b42318] text-white";

  return (
    <span
      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-[2px] font-stat text-[10px] font-black ${tone}`}
    >
      {result}
    </span>
  );
}

function RecentTenBlocks({ recentGames }: { recentGames: Result[] }) {
  if (!recentGames || recentGames.length === 0) {
    return <span className="text-xs text-[#8a8176]">-</span>;
  }

  return (
    <div className="flex justify-end gap-[3px]">
      {recentGames.map((result, index) => (
        <ResultChip key={`${result}-${index}`} result={result} />
      ))}
    </div>
  );
}

function TeamLogo({
  teamName,
  className = "h-7 w-7",
}: {
  teamName: string;
  className?: string;
}) {
  const logo = getTeamLogo(teamName);

  if (logo) {
    return (
      <img
        src={logo}
        alt={teamName}
        className={`${className} object-contain`}
      />
    );
  }

  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-full bg-[#183b59] text-[10px] font-bold text-white`}
    >
      {teamName.slice(0, 2)}
    </span>
  );
}

function LedgerPanel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[6px] border border-[#d8d0c2] bg-[#fbf8f0] shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
      <header className="flex items-center justify-between gap-4 border-b border-[#d8d0c2] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#6b665c]">
              {eyebrow}
            </p>
          )}
          <h2 className="flex items-center gap-2 font-serif text-xl font-black leading-tight text-[#111827]">
            <Flag size={17} className="text-[#183b59]" />
            {title}
          </h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function LeaderCard({
  leader,
  index,
}: {
  leader: LeaderSummary;
  index: number;
}) {
  return (
    <Link href={leader.href} className="block">
      <article
        className="group relative min-h-[132px] overflow-hidden rounded-[6px] border border-[#d8d0c2] bg-[#fffdf7] p-4 shadow-[0_1px_2px_rgb(17_24_39/0.08)] transition-colors hover:border-[#9c9385]"
        style={{ borderTop: `3px solid ${leader.color || "#183b59"}` }}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] bg-[#111827] font-stat text-sm font-black text-white">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#6b665c]">{leader.label}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-stat text-[34px] font-black leading-none text-[#111827]">
                {leader.value}
              </span>
              <span className="text-sm font-bold text-[#183b59]">
                {leader.unit}
              </span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-[#111827]">
              {leader.playerName}
            </p>
            <p className="text-xs text-[#6b665c]">{leader.teamName}</p>
          </div>
          {leader.photoUrl ? (
            <img
              src={leader.photoUrl}
              alt={leader.playerName}
              className="h-20 w-16 shrink-0 rounded-[4px] border border-[#d8d0c2] object-cover object-top grayscale-[15%]"
              onError={event => {
                (event.currentTarget as HTMLImageElement).style.display =
                  "none";
              }}
            />
          ) : (
            <TeamLogo
              teamName={leader.teamName}
              className="h-12 w-12 shrink-0 opacity-70"
            />
          )}
        </div>
      </article>
    </Link>
  );
}

function TeamStandingsTable({
  teams,
  loading,
}: {
  teams: TeamRank[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-10 w-full rounded-[4px] bg-[#e7e0d2]"
          />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-[#6b665c]">
        팀 순위 기록을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[#e1d8ca] lg:hidden">
        {teams.map((team, index) => (
          <Fragment key={team.teamName}>
            <Link
              href={`/teams/${encodeURIComponent(team.teamShort)}`}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f3eee4]"
            >
              <span className="text-center font-stat text-base font-black text-[#111827]">
                {team.rank}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-8 w-[3px] shrink-0 rounded-full"
                  style={{ backgroundColor: team.colors.primary }}
                />
                <TeamLogo teamName={team.teamName} className="h-7 w-7" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[#111827]">
                    {team.teamFull}
                  </span>
                  <span className="mt-0.5 block font-stat text-[11px] font-semibold text-[#6b665c]">
                    {team.wins}승 {team.losses}패 {team.draws}무
                  </span>
                </span>
              </span>
              <span className="text-right">
                <span className="block font-stat text-sm font-black text-[#183b59]">
                  {team.winRate}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-[#6b665c]">
                  승률
                </span>
              </span>
            </Link>
            {index === 4 && (
              <div className="bg-[#fbf8f0] px-4 py-1.5">
                <div className="flex items-center gap-3 text-[11px] font-bold text-[#16824a]">
                  <span className="h-px flex-1 border-t border-dashed border-[#16824a]" />
                  포스트시즌 커트라인
                  <span className="h-px flex-1 border-t border-dashed border-[#16824a]" />
                </div>
              </div>
            )}
          </Fragment>
        ))}
        <p className="px-4 py-2.5 text-[11px] text-[#6b665c]">
          승률이 같은 경우 승수, 상대 전적, 득실차, 추첨 순으로 순위를
          결정합니다.
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[760px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#c8bead] bg-[#ede7db] text-[11px] uppercase tracking-wide text-[#6b665c]">
              <th className="w-14 px-4 py-2.5 text-center font-black">순위</th>
              <th className="px-3 py-2.5 text-left font-black">팀</th>
              <th className="px-3 py-2.5 text-right font-black">경기</th>
              <th className="px-3 py-2.5 text-right font-black">승</th>
              <th className="px-3 py-2.5 text-right font-black">패</th>
              <th className="px-3 py-2.5 text-right font-black">무</th>
              <th className="px-3 py-2.5 text-right font-black">승률</th>
              <th className="px-3 py-2.5 text-right font-black">게임차</th>
              <th className="px-3 py-2.5 text-right font-black">최근 10경기</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, index) => (
              <Fragment key={team.teamName}>
                <tr className="border-b border-[#e1d8ca] transition-colors hover:bg-[#f3eee4]">
                  <td className="px-4 py-3 text-center font-stat text-base font-black text-[#111827]">
                    {team.rank}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/teams/${encodeURIComponent(team.teamShort)}`}
                      className="flex items-center gap-3 font-bold text-[#111827] hover:text-[#183b59]"
                    >
                      <span
                        className="h-7 w-[3px] rounded-full"
                        style={{ backgroundColor: team.colors.primary }}
                      />
                      <TeamLogo teamName={team.teamName} />
                      <span>{team.teamFull}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-semibold text-[#111827]">
                    {team.games}
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-semibold text-[#111827]">
                    {team.wins}
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-semibold text-[#111827]">
                    {team.losses}
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-semibold text-[#111827]">
                    {team.draws}
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-black text-[#111827]">
                    {team.winRate}
                  </td>
                  <td className="px-3 py-3 text-right font-stat text-[#6b665c]">
                    {team.gameBehind === "0" ? "-" : team.gameBehind}
                  </td>
                  <td className="px-3 py-3">
                    <RecentTenBlocks recentGames={team.recentGames} />
                  </td>
                </tr>
                {index === 4 && (
                  <tr>
                    <td colSpan={9} className="bg-[#fbf8f0] px-4 py-1.5">
                      <div className="flex items-center gap-3 text-[11px] font-bold text-[#16824a]">
                        <span className="h-px flex-1 border-t border-dashed border-[#16824a]" />
                        포스트시즌 커트라인
                        <span className="h-px flex-1 border-t border-dashed border-[#16824a]" />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[#d8d0c2] px-5 py-2.5 text-[11px] text-[#6b665c]">
          승률이 같은 경우 승수, 상대 전적, 득실차, 추첨 순으로 순위를
          결정합니다.
        </p>
      </div>
    </>
  );
}

function AvgLeadersTable({
  leaders,
  loading,
}: {
  leaders: Hitter[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-9 w-full rounded-[4px] bg-[#e7e0d2]"
          />
        ))}
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-[#6b665c]">
        타율 순위 기록을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-[#e1d8ca] lg:hidden">
        {leaders.slice(0, 5).map((player, index) => (
          <Link
            key={`${player.playerName}-${index}`}
            href={`/players/${encodeURIComponent(player.playerName)}`}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f3eee4]"
          >
            <span className="text-center font-stat font-black text-[#111827]">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-[#111827]">
                {player.playerName}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#6b665c]">
                <TeamLogo teamName={player.teamName} className="h-4 w-4" />
                {player.teamShort || player.teamName}
                <span className="text-[#c8bead]">/</span>
                {player.games}G
              </span>
            </span>
            <span className="text-right">
              <span className="block font-stat text-base font-black text-[#183b59]">
                {player.avg}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-[#6b665c]">
                AVG
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#c8bead] bg-[#ede7db] text-[11px] uppercase tracking-wide text-[#6b665c]">
              <th className="w-14 px-4 py-2.5 text-center font-black">#</th>
              <th className="px-3 py-2.5 text-left font-black">선수</th>
              <th className="px-3 py-2.5 text-left font-black">팀</th>
              <th className="px-3 py-2.5 text-right font-black">AVG</th>
              <th className="px-3 py-2.5 text-right font-black">G</th>
              <th className="px-3 py-2.5 text-right font-black">HR</th>
              <th className="px-4 py-2.5 text-right font-black">OPS</th>
            </tr>
          </thead>
          <tbody>
            {leaders.slice(0, 5).map((player, index) => (
              <tr
                key={`${player.playerName}-${index}`}
                className="border-b border-[#e1d8ca] transition-colors hover:bg-[#f3eee4]"
              >
                <td className="px-4 py-2.5 text-center font-stat font-black text-[#111827]">
                  {index + 1}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/players/${encodeURIComponent(player.playerName)}`}
                    className="font-bold text-[#111827] hover:text-[#183b59]"
                  >
                    {player.playerName}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6b665c]">
                    <TeamLogo teamName={player.teamName} className="h-5 w-5" />
                    {player.teamShort || player.teamName}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-stat font-black text-[#183b59]">
                  {player.avg}
                </td>
                <td className="px-3 py-2.5 text-right font-stat text-[#111827]">
                  {player.games}
                </td>
                <td className="px-3 py-2.5 text-right font-stat text-[#111827]">
                  {player.hr}
                </td>
                <td className="px-4 py-2.5 text-right font-stat text-[#111827]">
                  {player.ops ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Home() {
  const [teamRank, setTeamRank] = useState<TeamRank[]>([]);
  const [avgLeaders, setAvgLeaders] = useState<Hitter[]>([]);
  const [leaderSummaries, setLeaderSummaries] = useState<LeaderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRecords() {
      setLoading(true);
      setError(null);

      try {
        const [rankRes, avgRes, hrRes, eraRes, soRes] = await Promise.all([
          kboApi.getTeamRank(),
          kboApi.getLeaderboard("avg", "2026", undefined, 5),
          kboApi.getLeaderboard("hr", "2026", undefined, 1),
          kboApi.getLeaderboard("era", "2026", undefined, 1),
          kboApi.getLeaderboard("so", "2026", undefined, 1),
        ]);

        if (cancelled) return;

        const avgData = avgRes.data as Hitter[];
        const topAvg = avgData[0];
        const topHR = (hrRes.data as Hitter[])[0];
        const topERA = (eraRes.data as Pitcher[])[0];
        const topSO = (soRes.data as Pitcher[])[0];

        setTeamRank(rankRes.data);
        setAvgLeaders(avgData);
        setLeaderSummaries(
          [
            topAvg && {
              label: "타율 1위",
              value: topAvg.avg,
              unit: "AVG",
              playerName: topAvg.playerName,
              teamName: topAvg.teamName,
              href: `/players/${encodeURIComponent(topAvg.playerName)}`,
              photoUrl: topAvg.photoUrl,
              color: topAvg.colors?.primary,
            },
            topHR && {
              label: "홈런 1위",
              value: String(topHR.hr),
              unit: "HR",
              playerName: topHR.playerName,
              teamName: topHR.teamName,
              href: `/players/${encodeURIComponent(topHR.playerName)}`,
              photoUrl: topHR.photoUrl,
              color: topHR.colors?.primary,
            },
            topERA && {
              label: "평균자책점 1위",
              value: topERA.era,
              unit: "ERA",
              playerName: topERA.playerName,
              teamName: topERA.teamName,
              href: `/players/${encodeURIComponent(topERA.playerName)}`,
              photoUrl: topERA.photoUrl,
              color: topERA.colors?.primary,
            },
            topSO && {
              label: "탈삼진 1위",
              value: String(topSO.so),
              unit: "K",
              playerName: topSO.playerName,
              teamName: topSO.teamName,
              href: `/players/${encodeURIComponent(topSO.playerName)}`,
              photoUrl: topSO.photoUrl,
              color: topSO.colors?.primary,
            },
          ].filter(Boolean) as LeaderSummary[]
        );
        setLastUpdated(
          new Date(rankRes.updatedAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch {
        if (!cancelled) {
          setError("기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setTeamRank([]);
          setAvgLeaders([]);
          setLeaderSummaries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRecords();

    return () => {
      cancelled = true;
    };
  }, []);

  const firstTeam = teamRank[0];

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#f7f3ea] text-[#111827]">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-[#9c9385] pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#6b665c]">
                <BookOpen size={14} />
                KBO Records Ledger
              </p>
              <h1 className="font-serif text-4xl font-black leading-tight text-[#111827] sm:text-5xl">
                오늘의 KBO 기록실
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6b665c]">
                <span>{formatToday()}</span>
                <span className="hidden h-3 w-px bg-[#c8bead] sm:inline-block" />
                <span>2026 정규시즌</span>
                {lastUpdated && (
                  <>
                    <span className="hidden h-3 w-px bg-[#c8bead] sm:inline-block" />
                    <span className="hidden sm:inline">
                      최근 업데이트 {lastUpdated}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/players"
                className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-[#183b59] bg-[#183b59] px-3 text-sm font-bold text-[#fffdf7] transition-colors hover:bg-[#102b42]"
              >
                <Search size={15} />
                선수 기록 찾기
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-[#d8d0c2] bg-[#fffdf7] px-3 text-sm font-bold text-[#183b59] transition-colors hover:border-[#9c9385]"
              >
                전체 기록 보기
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-[4px] border border-[#b42318]/40 bg-[#fff5f2] px-4 py-3 text-sm font-semibold text-[#b42318]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <LedgerPanel
              title="2026 시즌 팀 순위"
              eyebrow="Team standings"
              action={
                <Link
                  href="/teams"
                  className="hidden items-center gap-1 text-xs font-bold text-[#183b59] hover:underline sm:inline-flex"
                >
                  상세 순위 보기
                  <ArrowRight size={13} />
                </Link>
              }
            >
              <TeamStandingsTable teams={teamRank} loading={loading} />
            </LedgerPanel>

            <LedgerPanel
              title="2026 타자 AVG TOP 5"
              eyebrow="Qualified batting leaders"
              action={
                <Link
                  href="/leaderboard"
                  className="hidden items-center gap-1 text-xs font-bold text-[#183b59] hover:underline sm:inline-flex"
                >
                  전체 타자 순위
                  <ArrowRight size={13} />
                </Link>
              }
            >
              <AvgLeadersTable leaders={avgLeaders} loading={loading} />
            </LedgerPanel>
          </div>

          <aside className="space-y-5">
            <section>
              <div className="mb-3 flex items-center justify-between border-b border-[#111827] pb-2">
                <h2 className="font-serif text-xl font-black text-[#111827]">
                  주요 리더
                </h2>
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#6b665c]">
                  Top records
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[132px] w-full rounded-[6px] bg-[#e7e0d2]"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderSummaries.map((leader, index) => (
                    <LeaderCard
                      key={leader.label}
                      leader={leader}
                      index={index}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[6px] border border-[#d8d0c2] bg-[#fbf8f0] p-4 shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={17} className="text-[#183b59]" />
                <h2 className="font-serif text-lg font-black text-[#111827]">
                  기록실 메모
                </h2>
              </div>
              <div className="space-y-3 text-sm leading-6 text-[#4b453c]">
                <p>
                  이 홈 화면은 경기 일정보다 선수 기록과 팀 기록을 빠르게 찾는
                  데 초점을 둡니다.
                </p>
                {firstTeam && (
                  <p>
                    현재 선두는{" "}
                    <strong className="text-[#111827]">
                      {firstTeam.teamFull}
                    </strong>
                    이며 승률은{" "}
                    <strong className="font-stat text-[#111827]">
                      {firstTeam.winRate}
                    </strong>
                    입니다.
                  </p>
                )}
                <p className="border-t border-dashed border-[#c8bead] pt-3 text-xs text-[#6b665c]">
                  데이터 출처: KBO 공식 사이트
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
