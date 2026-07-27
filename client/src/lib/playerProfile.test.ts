import { describe, expect, it } from "vitest";
import {
  parseKboDraftInfo,
  parseKboJoinInfo,
  parseKboSalary,
} from "@shared/playerProfile";

describe("KBO 프로입단 정보 파싱", () => {
  it("신인 드래프트 라운드와 전체 순번을 표시한다", () => {
    expect(parseKboDraftInfo("24 한화 4라운드 31순위")).toMatchObject({
      year: 2024,
      team: "한화",
      method: "draft",
      phase: null,
      round: 4,
      overallPick: 31,
      display: "2024년 4라운드 · 전체 31번 · 한화",
    });
  });

  it("구 드래프트의 2차 지명 표기를 보존한다", () => {
    expect(parseKboDraftInfo("18 넥센 2차 3라운드 28순위")).toMatchObject({
      year: 2018,
      phase: "2차",
      round: 3,
      overallPick: 28,
      display: "2018년 2차 3라운드 · 전체 28번 · 넥센",
    });
  });

  it.each([
    ["22 KIA 1차", "first-pick", "2022년 1차 지명 · KIA"],
    ["09 LG 육성선수", "developmental", "2009년 육성선수 · LG"],
    ["24 삼성 자유선발", "free-signing", "2024년 자유선발 · 삼성"],
  ])("%s 유형을 구분한다", (raw, method, display) => {
    expect(parseKboDraftInfo(raw)).toMatchObject({ method, display });
  });

  it("지명 정보가 없으면 입단년도와 팀을 대체 정보로 사용한다", () => {
    expect(parseKboJoinInfo("24삼성")).toMatchObject({
      year: 2024,
      team: "삼성",
      display: "2024년 · 삼성",
    });
  });
});

describe("KBO 연봉 정보 파싱", () => {
  it.each([
    ["9600만원", "9,600만 원", 96_000_000],
    ["12000만원", "1억 2,000만 원", 120_000_000],
    ["40000만원", "4억 원", 400_000_000],
    ["210000만원", "21억 원", 2_100_000_000],
  ])("%s을 원화 단위로 읽기 쉽게 표시한다", (raw, display, amount) => {
    expect(parseKboSalary(raw)).toMatchObject({
      amount,
      currency: "KRW",
      display,
    });
  });

  it.each([
    ["1300000달러", "130만 달러", 1_300_000],
    ["1100000달러", "110만 달러", 1_100_000],
    ["15000달러", "1만 5,000달러", 15_000],
  ])("%s을 만 달러 단위로 표시한다", (raw, display, amount) => {
    expect(parseKboSalary(raw)).toMatchObject({
      amount,
      currency: "USD",
      display,
    });
  });
});
