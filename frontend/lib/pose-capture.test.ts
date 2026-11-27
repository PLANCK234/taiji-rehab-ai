import { describe, expect, it } from "vitest";
import { sampleTimes } from "./pose-capture";

describe("file sampling plan", () => {
  it("includes the beginning without seeking past the end", () => {
    expect(sampleTimes(650)).toEqual([0, 200, 400, 600]);
    expect(sampleTimes(600)).toEqual([0, 200, 400]);
  });
  it("limits long videos to five minutes and refuses an unknown duration", () => {
    const times = sampleTimes(600_000);
    expect(times).toHaveLength(1500);
    expect(times.at(-1)).toBe(299800);
    expect(() => sampleTimes(Infinity)).toThrow();
    expect(() => sampleTimes(0)).toThrow();
  });
});
