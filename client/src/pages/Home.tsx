import { Fragment, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Flag, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getPlayerDetailPath,
  Hitter,
  kboApi,
  Pitcher,
  TeamRank,
} from "@/lib/kboApi";

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

function formatUpdatedAt(updatedAt: string) {
  return new Date(updatedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ResultChip({ result }: { result: Result }) {
  const tone =
    result === "W"
      ? "bg-success text-white"
      : result === "D"
        ? "bg-draw text-white"
        : "bg-destructive text-white";

  return (
    <span
      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-[2px] font-stat text-[10px] font-black ${tone}`}
    >
      {result}
    </span>
  );
}

function RecentTenBlocks({
  recentGames,
  loading,
}: {
  recentGames: Result[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        className="flex justify-end gap-[3px]"
        aria-label="최근 10경기 불러오는 중"
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-[18px] w-[18px] rounded-[2px] bg-muted"
          />
        ))}
      </div>
    );
  }

  if (!recentGames || recentGames.length === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
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
      className={`${className} inline-flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground`}
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
    <section className="overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgb(17_24_39/0.08)]">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h2 className="flex items-center gap-2 font-serif text-xl font-black leading-tight text-foreground">
            <Flag size={17} className="text-primary" />
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
        className="group relative min-h-[132px] overflow-hidden rounded-[6px] border border-border bg-popover p-4 shadow-[0_1px_2px_rgb(17_24_39/0.08)] transition-colors hover:border-border-strong"
        style={{ borderTop: `3px solid ${leader.color || "var(--primary)"}` }}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] bg-foreground font-stat text-sm font-black text-background">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-muted-foreground">
              {leader.label}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-stat text-[34px] font-black leading-none text-foreground">
                {leader.value}
              </span>
              <span className="text-sm font-bold text-primary">
                {leader.unit}
              </span>
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-foreground">
              {leader.playerName}
            </p>
            <p className="text-xs text-muted-foreground">{leader.teamName}</p>
          </div>
          {leader.photoUrl ? (
            <img
              src={leader.photoUrl}
              alt={leader.playerName}
              className="h-20 w-16 shrink-0 rounded-[4px] border border-border object-cover object-top grayscale-[15%]"
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
  recentGamesLoading,
}: {
  teams: TeamRank[];
  loading: boolean;
  recentGamesLoading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-10 w-full rounded-[4px] bg-muted"
          />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-muted-foreground">
        팀 순위 기록을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border lg:hidden">
        {teams.map((team, index) => (
          <Fragment key={team.teamName}>
            <Link
              href={`/teams/${encodeURIComponent(team.teamShort)}`}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
            >
              <span className="text-center font-stat text-base font-black text-foreground">
                {team.rank}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-8 w-[3px] shrink-0 rounded-full"
                  style={{ backgroundColor: team.colors.primary }}
                />
                <TeamLogo teamName={team.teamName} className="h-7 w-7" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">
                    {team.teamFull}
                  </span>
                  <span className="mt-0.5 block font-stat text-[11px] font-semibold text-muted-foreground">
                    {team.wins}승 {team.losses}패 {team.draws}무
                  </span>
                </span>
              </span>
              <span className="text-right">
                <span className="block font-stat text-sm font-black text-primary">
                  {team.winRate}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  승률
                </span>
              </span>
            </Link>
            {index === 4 && (
              <div className="bg-card px-4 py-1.5">
                <div className="flex items-center gap-3 text-[11px] font-bold text-success">
                  <span className="h-px flex-1 border-t border-dashed border-success" />
                  포스트시즌 커트라인
                  <span className="h-px flex-1 border-t border-dashed border-success" />
                </div>
              </div>
            )}
          </Fragment>
        ))}
        <p className="px-4 py-2.5 text-[11px] text-muted-foreground">
          승률이 같은 경우 승수, 상대 전적, 득실차, 추첨 순으로 순위를
          결정합니다.
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[760px] w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
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
                <tr className="border-b border-border transition-colors hover:bg-accent">
                  <td className="px-4 py-3 text-center font-stat text-base font-black text-foreground">
                    {team.rank}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/teams/${encodeURIComponent(team.teamShort)}`}
                      className="flex items-center gap-3 font-bold text-foreground hover:text-primary"
                    >
                      <span
                        className="h-7 w-[3px] rounded-full"
                        style={{ backgroundColor: team.colors.primary }}
                      />
                      <TeamLogo teamName={team.teamName} />
                      <span>{team.teamFull}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-semibold text-foreground">
                    {team.games}
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-semibold text-foreground">
                    {team.wins}
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-semibold text-foreground">
                    {team.losses}
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-semibold text-foreground">
                    {team.draws}
                  </td>
                  <td className="px-3 py-3 text-right font-stat font-black text-foreground">
                    {team.winRate}
                  </td>
                  <td className="px-3 py-3 text-right font-stat text-muted-foreground">
                    {team.gameBehind === "0" ? "-" : team.gameBehind}
                  </td>
                  <td className="px-3 py-3">
                    <RecentTenBlocks
                      recentGames={team.recentGames}
                      loading={recentGamesLoading}
                    />
                  </td>
                </tr>
                {index === 4 && (
                  <tr>
                    <td colSpan={9} className="bg-card px-4 py-1.5">
                      <div className="flex items-center gap-3 text-[11px] font-bold text-success">
                        <span className="h-px flex-1 border-t border-dashed border-success" />
                        포스트시즌 커트라인
                        <span className="h-px flex-1 border-t border-dashed border-success" />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
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
          <Skeleton key={index} className="h-9 w-full rounded-[4px] bg-muted" />
        ))}
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-muted-foreground">
        타율 순위 기록을 불러오지 못했습니다.
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border lg:hidden">
        {leaders.slice(0, 5).map((player, index) => (
          <Link
            key={`${player.playerName}-${index}`}
            href={getPlayerDetailPath(player)}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
          >
            <span className="text-center font-stat font-black text-foreground">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-foreground">
                {player.playerName}
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <TeamLogo teamName={player.teamName} className="h-4 w-4" />
                {player.teamShort || player.teamName}
                <span className="text-border">/</span>
                {player.games}G
              </span>
            </span>
            <span className="text-right">
              <span className="block font-stat text-base font-black text-primary">
                {player.avg}
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                AVG
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong bg-muted text-[11px] uppercase tracking-wide text-muted-foreground">
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
                className="border-b border-border transition-colors hover:bg-accent"
              >
                <td className="px-4 py-2.5 text-center font-stat font-black text-foreground">
                  {index + 1}
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={getPlayerDetailPath(player)}
                    className="font-bold text-foreground hover:text-primary"
                  >
                    {player.playerName}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <TeamLogo teamName={player.teamName} className="h-5 w-5" />
                    {player.teamShort || player.teamName}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-stat font-black text-primary">
                  {player.avg}
                </td>
                <td className="px-3 py-2.5 text-right font-stat text-foreground">
                  {player.games}
                </td>
                <td className="px-3 py-2.5 text-right font-stat text-foreground">
                  {player.hr}
                </td>
                <td className="px-4 py-2.5 text-right font-stat text-foreground">
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
  const [standingsLoading, setStandingsLoading] = useState(true);
  const [recentGamesLoading, setRecentGamesLoading] = useState(true);
  const [leadersLoading, setLeadersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStandings() {
      try {
        const standings = await kboApi.getHomeStandings("2026");

        if (cancelled) return;
        setTeamRank(standings.teamRank);
        setLastUpdated(formatUpdatedAt(standings.updatedAt));
        setStandingsLoading(false);

        try {
          const recent = await kboApi.getHomeRecentGames("2026");
          if (cancelled) return;
          setTeamRank(current =>
            current.map(team => ({
              ...team,
              recentGames: recent.recentGames[team.teamShort] ?? [],
            }))
          );
        } catch {
          // 팀 순위는 유지하고 최근 경기 칩만 빈 상태로 둔다.
        } finally {
          if (!cancelled) setRecentGamesLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("팀 순위 기록을 불러오지 못했습니다.");
          setTeamRank([]);
          setRecentGamesLoading(false);
        }
      } finally {
        if (!cancelled) setStandingsLoading(false);
      }
    }

    async function loadLeaders() {
      try {
        const summary = await kboApi.getHomeLeaders("2026");
        if (cancelled) return;

        setAvgLeaders(summary.avgLeaders);
        setLeaderSummaries(
          [
            summary.leaders.avg && {
              label: "타율 1위",
              value: summary.leaders.avg.avg,
              unit: "AVG",
              playerName: summary.leaders.avg.playerName,
              teamName: summary.leaders.avg.teamName,
              href: getPlayerDetailPath(summary.leaders.avg),
              photoUrl: summary.leaders.avg.photoUrl,
              color: summary.leaders.avg.colors?.primary,
            },
            summary.leaders.hr && {
              label: "홈런 1위",
              value: String(summary.leaders.hr.hr),
              unit: "HR",
              playerName: summary.leaders.hr.playerName,
              teamName: summary.leaders.hr.teamName,
              href: getPlayerDetailPath(summary.leaders.hr),
              photoUrl: summary.leaders.hr.photoUrl,
              color: summary.leaders.hr.colors?.primary,
            },
            summary.leaders.era && {
              label: "평균자책점 1위",
              value: summary.leaders.era.era,
              unit: "ERA",
              playerName: summary.leaders.era.playerName,
              teamName: summary.leaders.era.teamName,
              href: getPlayerDetailPath(summary.leaders.era),
              photoUrl: summary.leaders.era.photoUrl,
              color: summary.leaders.era.colors?.primary,
            },
            summary.leaders.so && {
              label: "탈삼진 1위",
              value: String(summary.leaders.so.so),
              unit: "K",
              playerName: summary.leaders.so.playerName,
              teamName: summary.leaders.so.teamName,
              href: getPlayerDetailPath(summary.leaders.so),
              photoUrl: summary.leaders.so.photoUrl,
              color: summary.leaders.so.colors?.primary,
            },
          ].filter(Boolean) as LeaderSummary[]
        );
        setLastUpdated(formatUpdatedAt(summary.updatedAt));
      } catch {
        if (!cancelled) {
          setError(current => current ?? "리더 기록을 불러오지 못했습니다.");
          setAvgLeaders([]);
          setLeaderSummaries([]);
        }
      } finally {
        if (!cancelled) setLeadersLoading(false);
      }
    }

    setError(null);
    loadStandings();
    loadLeaders();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-6 border-b border-border-strong pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                <BookOpen size={14} />
                KBO Records Ledger
              </p>
              <h1 className="font-serif text-4xl font-black leading-tight text-foreground sm:text-5xl">
                오늘의 KBO 기록실
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{formatToday()}</span>
                <span className="hidden h-3 w-px bg-border sm:inline-block" />
                <span>2026 정규시즌</span>
                {lastUpdated && (
                  <>
                    <span className="hidden h-3 w-px bg-border sm:inline-block" />
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
                className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-primary bg-primary px-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Search size={15} />
                선수 기록 찾기
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-border bg-popover px-3 text-sm font-bold text-primary transition-colors hover:border-border-strong"
              >
                전체 기록 보기
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-[4px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
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
                  className="hidden items-center gap-1 text-xs font-bold text-primary hover:underline sm:inline-flex"
                >
                  상세 순위 보기
                  <ArrowRight size={13} />
                </Link>
              }
            >
              <TeamStandingsTable
                teams={teamRank}
                loading={standingsLoading}
                recentGamesLoading={recentGamesLoading}
              />
            </LedgerPanel>

            <LedgerPanel
              title="2026 타자 AVG TOP 5"
              eyebrow="Qualified batting leaders"
              action={
                <Link
                  href="/leaderboard"
                  className="hidden items-center gap-1 text-xs font-bold text-primary hover:underline sm:inline-flex"
                >
                  전체 타자 순위
                  <ArrowRight size={13} />
                </Link>
              }
            >
              <AvgLeadersTable leaders={avgLeaders} loading={leadersLoading} />
            </LedgerPanel>
          </div>

          <aside className="space-y-5">
            <section>
              <div className="mb-3 flex items-center justify-between border-b border-foreground pb-2">
                <h2 className="font-serif text-xl font-black text-foreground">
                  주요 리더
                </h2>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Top records
                </span>
              </div>

              {leadersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-[132px] w-full rounded-[6px] bg-muted"
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
          </aside>
        </div>
      </div>
    </div>
  );
}
