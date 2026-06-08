import { describe, it, expect } from "vitest";
import { TEAM_COLORS, TEAM_FULL_NAMES, parsePlayCell, parseScheduleDate } from "./kbo.js";

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

describe("parseScheduleDate", () => {
  it("'06.02(화)'를 'YYYYMMDD'로 변환한다", () => {
    expect(parseScheduleDate("06.02(화)", "2026")).toBe("20260602");
  });

  it("한 자리 월/일도 0으로 패딩한다", () => {
    expect(parseScheduleDate("3.5(수)", "2026")).toBe("20260305");
  });

  it("날짜 형식이 없으면 빈 문자열을 반환한다", () => {
    expect(parseScheduleDate("", "2026")).toBe("");
  });
});

describe("parsePlayCell", () => {
  it("원정 승리(홈 패배) 경기를 파싱한다", () => {
    const html = '<span>한화</span><em><span class="lose">3</span><span>vs</span><span class="win">5</span></em><span>두산</span>';
    expect(parsePlayCell(html)).toEqual({
      away: "한화",
      home: "두산",
      awayResult: "L",
      homeResult: "W",
    });
  });

  it("무승부 경기를 D로 파싱한다", () => {
    const html = '<span>한화</span><em><span class="same">3</span><span>vs</span><span class="same">3</span></em><span>두산</span>';
    const r = parsePlayCell(html);
    expect(r?.awayResult).toBe("D");
    expect(r?.homeResult).toBe("D");
  });

  it("원정 패배(홈 승리)를 파싱한다", () => {
    const html = '<span>LG</span><em><span class="win">10</span><span>vs</span><span class="lose">1</span></em><span>KT</span>';
    expect(parsePlayCell(html)).toEqual({
      away: "LG",
      home: "KT",
      awayResult: "W",
      homeResult: "L",
    });
  });

  it("점수 클래스가 없는 예정 경기는 null을 반환한다", () => {
    const html = '<span>SSG</span><em><span>vs</span></em><span>LG</span>';
    expect(parsePlayCell(html)).toBeNull();
  });
});
