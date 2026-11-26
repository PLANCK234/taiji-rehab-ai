import { JOINT_DEFINITIONS, type JointName } from "./pose-analysis";

type JointRange = { samples: number; min_deg: number; max_deg: number };
export type LiveSummary = {
  schema_version: 1;
  source: "live_camera";
  angle_source: "model_estimate";
  sample_count: number;
  detected_count: number;
  framing_check_pass_count: number;
  observed_ms: number | null;
  joint_ranges: Partial<Record<JointName, JointRange>>;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function count(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function angle(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 180;
}

export function isLiveSummary(value: unknown): value is LiveSummary {
  if (!record(value) || Object.keys(value).length !== 8 ||
    value.schema_version !== 1 || value.source !== "live_camera" || value.angle_source !== "model_estimate") return false;
  const { sample_count: total, detected_count: detected, framing_check_pass_count: framed,
    observed_ms: duration, joint_ranges: ranges } = value;
  if (!count(total) || !count(detected) || !count(framed) || framed > detected || detected > total ||
    (total === 0 ? duration !== null : !count(duration)) || !record(ranges)) return false;
  return Object.entries(ranges).every(([joint, range]) =>
    Object.hasOwn(JOINT_DEFINITIONS, joint) && record(range) && Object.keys(range).length === 3 &&
    count(range.samples) && range.samples > 0 && range.samples <= detected &&
    angle(range.min_deg) && angle(range.max_deg) && range.min_deg <= range.max_deg);
}
