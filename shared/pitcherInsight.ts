export interface PitchZone {
  zone: number;
  pitchRate: number | null;
}

export type BatterSide = "left" | "right";

export interface PitcherPlatoonSplit {
  side: BatterSide;
  label: string;
  avg: string | null;
}

export interface PitcherSituation {
  playerId: string;
  splits: PitcherPlatoonSplit[];
  updatedAt: string;
}

const PITCH_ZONE_NUMBERS = Array.from({ length: 13 }, (_, index) => index + 1);

function parsePitchRate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, parsed));
}

export function normalizePitchZones(value: unknown): PitchZone[] {
  const zones = new Map<number, number | null>();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const zone = Number(row.zone);
      if (!Number.isInteger(zone) || zone < 1 || zone > 13) continue;
      zones.set(zone, parsePitchRate(row.pit_rt));
    }
  }

  return PITCH_ZONE_NUMBERS.map(zone => ({
    zone,
    pitchRate: zones.get(zone) ?? null,
  }));
}

function normalizeAverage(value: string | undefined) {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return parsed.toFixed(3);
}

export function parsePitcherPlatoonRows(
  rows: string[][]
): PitcherPlatoonSplit[] {
  const averages = new Map<BatterSide, string | null>();

  for (const row of rows) {
    const label = String(row[0] ?? "").trim();
    const side =
      label === "좌타자" ? "left" : label === "우타자" ? "right" : null;
    if (!side) continue;
    averages.set(side, normalizeAverage(row.at(-1)));
  }

  return [
    {
      side: "left",
      label: "좌타자",
      avg: averages.get("left") ?? null,
    },
    {
      side: "right",
      label: "우타자",
      avg: averages.get("right") ?? null,
    },
  ];
}
