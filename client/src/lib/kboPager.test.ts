import { describe, expect, it } from "vitest";
import { getKboPagerEventName, getKboPagerEventTarget } from "@shared/kboPager";

describe("KBO record pagination", () => {
  it.each([
    [2, "btnNo2"],
    [5, "btnNo5"],
    [6, "btnNext"],
    [7, "btnNo2"],
    [10, "btnNo5"],
    [11, "btnNext"],
    [12, "btnNo2"],
  ])("selects the visible pager button for page %i", (page, eventName) => {
    expect(getKboPagerEventName(page)).toBe(eventName);
  });

  it("combines the ASP.NET event target prefix", () => {
    expect(getKboPagerEventTarget("pager$", 7)).toBe("pager$btnNo2");
  });

  it.each([0, 1, 2.5])("rejects invalid page %s", page => {
    expect(() => getKboPagerEventName(page)).toThrow();
  });
});
