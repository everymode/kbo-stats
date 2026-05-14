import { describe, it, expect } from "vitest";
import { getTeamColor, getTeamShort, TEAM_COLORS, TEAM_FULL_NAMES } from "./kboApi";

describe("getTeamColor", () => {
  it("KIA 팀 컬러를 반환한다", () => {
    const color = getTeamColor("KIA");
    expect(color.primary).toBe("#EA0029");
    expect(color.secondary).toBe("#000000");
  });

  it("삼성 팀 컬러를 반환한다", () => {
    const color = getTeamColor("삼성");
    expect(color.primary).toBe("#074CA1");
  });

  it("팀명에 키워드가 포함된 경우도 인식한다", () => {
    const color = getTeamColor("SSG 랜더스");
    expect(color.primary).toBe("#CE0E2D");
  });

  it("알 수 없는 팀은 기본 컬러를 반환한다", () => {
    const color = getTeamColor("알 수 없는 팀");
    expect(color.primary).toBe("#666666");
    expect(color.secondary).toBe("#FFFFFF");
  });
});

describe("getTeamShort", () => {
  it("KIA 단축명을 반환한다", () => {
    expect(getTeamShort("KIA")).toBe("KIA");
  });

  it("LG 트윈스에서 LG를 반환한다", () => {
    expect(getTeamShort("LG 트윈스")).toBe("LG");
  });

  it("알 수 없는 팀은 원래 이름을 반환한다", () => {
    expect(getTeamShort("알 수 없는 팀")).toBe("알 수 없는 팀");
  });
});

describe("TEAM_COLORS", () => {
  it("10개 구단 컬러가 모두 정의되어 있다", () => {
    const expectedTeams = ["KIA", "삼성", "LG", "두산", "KT", "SSG", "NC", "롯데", "한화", "키움"];
    expectedTeams.forEach((team) => {
      expect(TEAM_COLORS[team]).toBeDefined();
      expect(TEAM_COLORS[team].primary).toBeTruthy();
      expect(TEAM_COLORS[team].secondary).toBeTruthy();
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

describe("TEAM_FULL_NAMES", () => {
  it("10개 구단 풀네임이 모두 정의되어 있다", () => {
    expect(Object.keys(TEAM_FULL_NAMES)).toHaveLength(10);
  });

  it("KIA 풀네임이 올바르다", () => {
    expect(TEAM_FULL_NAMES["KIA"]).toBe("KIA 타이거즈");
  });

  it("LG 풀네임이 올바르다", () => {
    expect(TEAM_FULL_NAMES["LG"]).toBe("LG 트윈스");
  });
});
