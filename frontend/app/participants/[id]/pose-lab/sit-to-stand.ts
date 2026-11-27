import type { PoseFrame } from "./pose-analysis";

type Side = "left" | "right";
export type SitToStandResult = {
  side: Side | null;
  pairedSamples: number;
  timestampsMs: number[] | null;
};

// Keep parity with coverage-selected-hip-knee-v2 in ml/sit_to_stand.py.
const LOW_POSITION = 0.30;
const HIGH_POSITION = 0.80;
const CONFIRM_SAMPLES = 2;
const MAX_INTERVAL_MS = 150;
const MIN_ANGLE_SPAN = 10;

function csvAngle(value: number | null) {
  return value !== null && value >= 0 && value <= 180 ? Number(value.toFixed(1)) : null;
}

function scale(values: (number | null)[]) {
  const sorted = values.filter((value) => value !== null).sort((a, b) => a - b);
  if (sorted.length < 2 * CONFIRM_SAMPLES) return null;
  const margin = Math.floor((sorted.length - 1) / 10);
  const low = sorted[margin];
  const span = sorted[sorted.length - 1 - margin] - low;
  return span >= MIN_ANGLE_SPAN ? { low, span } : null;
}

export function sitToStandCandidates(frames: PoseFrame[]): SitToStandResult {
  function readSide(side: Side) {
    const rows = frames.map((frame) => ({
      time: Number(frame.timestampMs.toFixed(1)),
      hip: frame.detected ? csvAngle(frame.angles[`${side}_hip`]) : null,
      knee: frame.detected ? csvAngle(frame.angles[`${side}_knee`]) : null,
    }));
    return { rows, pairs: rows.filter(({ hip, knee }) => hip !== null && knee !== null).length };
  }
  const right = readSide("right");
  const left = readSide("left");
  const side = right.pairs >= left.pairs ? "right" : "left";
  const { rows, pairs } = side === "right" ? right : left;
  const result: SitToStandResult = {
    side: pairs ? side : null, pairedSamples: pairs, timestampsMs: null,
  };
  const hipScale = scale(rows.map((row) => row.hip));
  const kneeScale = scale(rows.map((row) => row.knee));
  if (pairs < CONFIRM_SAMPLES || !hipScale || !kneeScale) return result;

  const kneeBoundary = kneeScale.low + HIGH_POSITION * kneeScale.span;
  const timestampsMs: number[] = [];
  let lowRun = 0;
  let highRun = 0;
  let highStart = 0;
  let previous: number | null = null;
  for (const { time, hip, knee } of rows) {
    if (hip === null || (previous !== null && time - previous > MAX_INTERVAL_MS)) {
      lowRun = 0;
      highRun = 0;
    }
    previous = time;
    if (hip === null) continue;
    const position = (hip - hipScale.low) / hipScale.span;
    if (lowRun < CONFIRM_SAMPLES) {
      lowRun = position <= LOW_POSITION ? lowRun + 1 : 0;
      continue;
    }
    if (position < HIGH_POSITION || knee === null || knee < kneeBoundary) {
      highRun = 0;
      continue;
    }
    if (highRun === 0) highStart = time;
    highRun += 1;
    if (highRun === CONFIRM_SAMPLES) {
      timestampsMs.push(highStart);
      lowRun = 0;
      highRun = 0;
    }
  }
  return { ...result, timestampsMs };
}
