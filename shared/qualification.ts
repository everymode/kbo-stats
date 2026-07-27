export const FULL_SEASON_TEAM_GAMES = 144;

export const HITTER_RATE_CATEGORIES = new Set([
  "avg",
  "obp",
  "slg",
  "ops",
  "iso",
  "babip",
  "bbPct",
  "kPct",
]);

export const PITCHER_RATE_CATEGORIES = new Set([
  "era",
  "whip",
  "fip",
  "k9",
  "bb9",
  "hr9",
]);

export interface TeamStandingForQualification {
  teamShort?: string;
  teamName?: string;
  games?: number;
}

export interface PlayerForQualification {
  teamShort?: string;
  teamName?: string;
}

export interface QualificationContext {
  gamesByTeam: ReadonlyMap<string, number>;
  fallbackGames: number;
}

export interface HitterQualification {
  qualified: boolean;
  teamGames: number;
  requiredPa: number;
}

export interface PitcherQualification {
  qualified: boolean;
  teamGames: number;
  requiredIp: number;
}

function normalizeGames(value: unknown): number {
  const games = Number(value);
  return Number.isFinite(games) ? Math.max(0, Math.trunc(games)) : 0;
}

export function createQualificationContext(
  standings: TeamStandingForQualification[],
  season: string,
  currentSeason = new Date().getFullYear().toString()
): QualificationContext {
  const gamesByTeam = new Map<string, number>();
  const observedGames: number[] = [];

  for (const team of standings) {
    const games = normalizeGames(team.games);
    if (games <= 0) continue;

    observedGames.push(games);
    for (const key of [team.teamShort, team.teamName]) {
      const normalizedKey = key?.trim();
      if (normalizedKey) gamesByTeam.set(normalizedKey, games);
    }
  }

  const fallbackGames =
    season === currentSeason && observedGames.length > 0
      ? Math.max(...observedGames)
      : FULL_SEASON_TEAM_GAMES;

  return { gamesByTeam, fallbackGames };
}

export function resolveTeamGames(
  player: PlayerForQualification,
  context: QualificationContext
): number {
  const playerTeams = [player.teamShort, player.teamName]
    .map(team => team?.trim())
    .filter((team): team is string => Boolean(team));

  for (const team of playerTeams) {
    const exact = context.gamesByTeam.get(team);
    if (exact !== undefined) return exact;
  }

  for (const [team, games] of Array.from(context.gamesByTeam.entries())) {
    if (
      playerTeams.some(
        playerTeam => playerTeam.includes(team) || team.includes(playerTeam)
      )
    ) {
      return games;
    }
  }

  return context.fallbackGames;
}

export function requiredPlateAppearances(teamGames: number): number {
  return Math.floor(normalizeGames(teamGames) * 3.1);
}

export function inningsToOuts(innings: string | number): number {
  if (typeof innings === "number") {
    return Number.isFinite(innings) ? Math.max(0, Math.round(innings * 3)) : 0;
  }

  const normalized = innings.trim().replace("⅓", " 1/3").replace("⅔", " 2/3");
  if (!normalized) return 0;

  const fraction = normalized.match(/^(\d+)(?:\s+([12])\/3)?$/);
  if (fraction) {
    return Number(fraction[1]) * 3 + Number(fraction[2] ?? 0);
  }

  const decimal = Number(normalized);
  return Number.isFinite(decimal) ? Math.max(0, Math.round(decimal * 3)) : 0;
}

export function inningsToDecimal(innings: string | number): number {
  return inningsToOuts(innings) / 3;
}

export function getHitterQualification<
  T extends PlayerForQualification & { pa?: number },
>(player: T, context: QualificationContext): HitterQualification {
  const teamGames = resolveTeamGames(player, context);
  const requiredPa = requiredPlateAppearances(teamGames);
  return {
    qualified: (player.pa ?? 0) >= requiredPa,
    teamGames,
    requiredPa,
  };
}

export function getPitcherQualification<
  T extends PlayerForQualification & { ip?: string | number },
>(player: T, context: QualificationContext): PitcherQualification {
  const teamGames = resolveTeamGames(player, context);
  return {
    qualified: inningsToOuts(player.ip ?? 0) >= teamGames * 3,
    teamGames,
    requiredIp: teamGames,
  };
}

export function withHitterQualification<
  T extends PlayerForQualification & { pa?: number },
>(player: T, context: QualificationContext): T & HitterQualification {
  return { ...player, ...getHitterQualification(player, context) };
}

export function withPitcherQualification<
  T extends PlayerForQualification & { ip?: string | number },
>(player: T, context: QualificationContext): T & PitcherQualification {
  return { ...player, ...getPitcherQualification(player, context) };
}

export function filterQualifiedForCategory<T extends { qualified?: boolean }>(
  players: T[],
  category: string
): T[] {
  if (
    HITTER_RATE_CATEGORIES.has(category) ||
    PITCHER_RATE_CATEGORIES.has(category)
  ) {
    return players.filter(player => player.qualified === true);
  }
  return players;
}
