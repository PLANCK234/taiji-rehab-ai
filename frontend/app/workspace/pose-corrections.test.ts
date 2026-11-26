import { expect, it } from "vitest";
import { correctionDrafts, correctionPayload } from "./pose-corrections";
import type { CorrectionDraft } from "./pose-corrections";

const draft = (changes: Partial<CorrectionDraft> = {}): CorrectionDraft => ({
  joint: "left_elbow", metric: "median_deg", validity: "valid", value: "0", reason: "人工核对", ...changes,
});

it("keeps observed zero distinct from explicitly unknown", () => {
  expect(correctionPayload([draft()])[0].value).toBe(0);
  expect(correctionPayload([draft({ validity: "missing" })])[0].value).toBeNull();
  expect(correctionDrafts(correctionPayload([draft()]))[0].value).toBe("0");
});

it("does not coerce an empty value into zero or silently merge duplicate fields", () => {
  expect(() => correctionPayload([draft({ value: "" })])).toThrow(/观测值/);
  expect(() => correctionPayload([draft(), draft({ value: "45" })])).toThrow(/只能修正一次/);
  expect(() => correctionPayload([])).toThrow(/至少一项/);
  expect(() => correctionPayload([draft({ reason: " " })])).toThrow(/理由/);
});

it("rejects non-finite and out-of-domain geometric values", () => {
  for (const value of ["-1", "181", "NaN", "Infinity"]) {
    expect(() => correctionPayload([draft({ value })])).toThrow(/0到180/);
  }
});
