import { describe, expect, it } from "vitest";
import {
  normalizePitchZones,
  parsePitcherPlatoonRows,
} from "@shared/pitcherInsight";

describe("normalizePitchZones", () => {
  it("returns all 13 zones when the source is missing", () => {
    expect(normalizePitchZones(undefined)).toEqual(
      Array.from({ length: 13 }, (_, index) => ({
        zone: index + 1,
        pitchRate: null,
      }))
    );
  });

  it("normalizes sparse and unordered source rows by zone number", () => {
    const zones = normalizePitchZones([
      { zone: 13, pit_rt: "12.8" },
      { zone: 2, pit_rt: "5.6" },
      { zone: 1, pit_rt: 6.5 },
      { zone: 20, pit_rt: "99.9" },
    ]);

    expect(zones).toHaveLength(13);
    expect(zones[0]).toEqual({ zone: 1, pitchRate: 6.5 });
    expect(zones[1]).toEqual({ zone: 2, pitchRate: 5.6 });
    expect(zones[2]).toEqual({ zone: 3, pitchRate: null });
    expect(zones[12]).toEqual({ zone: 13, pitchRate: 12.8 });
  });

  it("preserves a real zero while rejecting invalid values", () => {
    const zones = normalizePitchZones([
      { zone: 4, pit_rt: "0.0" },
      { zone: 5, pit_rt: "unknown" },
    ]);

    expect(zones[3].pitchRate).toBe(0);
    expect(zones[4].pitchRate).toBeNull();
  });
});

describe("parsePitcherPlatoonRows", () => {
  it("extracts left and right batting averages regardless of row order", () => {
    const splits = parsePitcherPlatoonRows([
      ["우타자", "62", "9", "1", "5", "7", "1", "56", "1", "0", "0.255"],
      ["기타", "0", "0.000"],
      ["좌타자", "34", "6", "1", "1", "6", "2", "22", "0", "0", "0.279"],
    ]);

    expect(splits).toEqual([
      { side: "left", label: "좌타자", avg: "0.279" },
      { side: "right", label: "우타자", avg: "0.255" },
    ]);
  });

  it("keeps unavailable split values empty", () => {
    expect(parsePitcherPlatoonRows([["좌타자", "0", "-"]])).toEqual([
      { side: "left", label: "좌타자", avg: null },
      { side: "right", label: "우타자", avg: null },
    ]);
  });
});
