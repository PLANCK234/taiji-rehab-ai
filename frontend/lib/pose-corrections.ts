import type { PoseCorrection, PoseJoint, ReviewMetric } from "./pose";

export type CorrectionDraft = {
  joint: PoseJoint; metric: ReviewMetric; validity: "valid" | "missing"; value: string; reason: string;
};

export function correctionDrafts(corrections: PoseCorrection[]): CorrectionDraft[] {
  return corrections.map(row => ({ ...row, value: row.value === null ? "" : String(row.value) }));
}

export function correctionPayload(rows: CorrectionDraft[]): PoseCorrection[] {
  if (!rows.length) throw new Error("修正后确认需要至少一项指标修正。");
  const keys = new Set<string>();
  return rows.map(row => {
    const key = `${row.joint}:${row.metric}`;
    if (keys.has(key)) throw new Error("同一关节的同一指标只能修正一次。");
    keys.add(key);
    if (!row.reason.trim()) throw new Error("请填写每项修正的理由。");
    let value: number | null = null;
    if (row.validity === "valid") {
      if (!row.value.trim()) throw new Error("请填写观测值，或明确选择无法判断。");
      value = Number(row.value);
      if (!Number.isFinite(value) || value < 0 || value > 180) throw new Error("角度或幅度应为0到180度。");
    }
    return { ...row, value, reason: row.reason.trim() };
  });
}
