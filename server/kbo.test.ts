import { describe, it, expect } from "vitest";
import { TEAM_COLORS, TEAM_FULL_NAMES } from "./kbo.js";

describe("TEAM_COLORS (서버)", () => {
  it("10개 구단 컬러가 모두 정의되어 있다", () => {
    const expectedTeams = ["KIA", "삼성", "LG", "두산", "KT", "SSG", "NC", "롯데", "한화", "키움"];
    expectedTeams.forEach((team) => {
      expect(TEAM_COLORS[team]).toBeDefined();
      expect(TEAM_COLORS[team].primary).toBeTruthy();
    });
  });

  it("모든 컬러값이 유효한 hex 형식이다", () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    Object.values(TEAM_COLORS).forEach((colors) => {
      expect(colors.primary).toMatch(hexPattern);
      expect(colors.secondary).toMatch(hexPattern);
    });
  });
});

describe("TEAM_FULL_NAMES (서버)", () => {
  it("10개 구단 풀네임이 모두 정의되어 있다", () => {
    expect(Object.keys(TEAM_FULL_NAMES)).toHaveLength(10);
  });

  it("KIA 타이거즈 풀네임이 올바르다", () => {
    expect(TEAM_FULL_NAMES["KIA"]).toBe("KIA 타이거즈");
  });

  it("한화 이글스 풀네임이 올바르다", () => {
    expect(TEAM_FULL_NAMES["한화"]).toBe("한화 이글스");
  });
});
