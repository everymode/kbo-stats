import { describe, expect, it } from "vitest";
import {
  createQualificationContext,
  filterQualifiedForCategory,
  getHitterQualification,
  getPitcherQualification,
  inningsToOuts,
  requiredPlateAppearances,
} from "@shared/qualification";

const standings = [
  { teamShort: "KT", teamName: "KT 위즈", games: 91 },
  { teamShort: "삼성", teamName: "삼성 라이온즈", games: 94 },
  { teamShort: "KIA", teamName: "KIA 타이거즈", games: 96 },
];

describe("규정타석 계산", () => {
  it("팀 경기 수에 3.1을 곱하고 소수점 이하는 버린다", () => {
    expect(requiredPlateAppearances(91)).toBe(282);
    expect(requiredPlateAppearances(94)).toBe(291);
    expect(requiredPlateAppearances(144)).toBe(446);
  });

  it("현재 시즌에는 선수 소속팀 경기 수를 사용한다", () => {
    const context = createQualificationContext(standings, "2026", "2026");

    expect(
      getHitterQualification({ teamShort: "KT", pa: 290 }, context)
    ).toMatchObject({ qualified: true, teamGames: 91, requiredPa: 282 });
    expect(
      getHitterQualification({ teamShort: "삼성", pa: 290 }, context)
    ).toMatchObject({ qualified: false, teamGames: 94, requiredPa: 291 });
  });
});

describe("규정이닝 계산", () => {
  it("부분 이닝을 투구 아웃 수로 정확하게 변환한다", () => {
    expect(inningsToOuts("40 2/3")).toBe(122);
    expect(inningsToOuts("95")).toBe(285);
    expect(inningsToOuts("101⅓")).toBe(304);
  });

  it("팀 경기 수와 같은 이닝부터 규정이닝으로 인정한다", () => {
    const context = createQualificationContext(standings, "2026", "2026");

    expect(
      getPitcherQualification({ teamShort: "KIA", ip: "95 2/3" }, context)
    ).toMatchObject({ qualified: false, teamGames: 96, requiredIp: 96 });
    expect(
      getPitcherQualification({ teamShort: "KIA", ip: "96" }, context)
    ).toMatchObject({ qualified: true, teamGames: 96, requiredIp: 96 });
  });
});

describe("리더보드 규정 필터", () => {
  const players = [
    { playerName: "qualified", qualified: true },
    { playerName: "unqualified", qualified: false },
  ];

  it("비율 기록에는 규정 충족 선수만 남긴다", () => {
    expect(filterQualifiedForCategory(players, "avg")).toHaveLength(1);
    expect(filterQualifiedForCategory(players, "era")).toHaveLength(1);
  });

  it("홈런과 탈삼진 같은 누적 기록에는 규정 필터를 적용하지 않는다", () => {
    expect(filterQualifiedForCategory(players, "hr")).toHaveLength(2);
    expect(filterQualifiedForCategory(players, "so")).toHaveLength(2);
  });
});
