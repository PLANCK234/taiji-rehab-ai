"use client";

import { useState } from "react";
import { jointNames } from "../../../../lib/pose";
import type { AngleSample, Metric, PoseDetail } from "../../../../lib/pose";

const qualityText = {
  insufficient_data: "连续可见数据不足",
  within_residual_noise: "变化未超过估计残差",
  above_residual_noise: "变化高于估计残差",
};

export default function MotionEvidence({ report, cursor, onCursorChange }: {
  report: PoseDetail; cursor: number; onCursorChange: (index: number) => void;
}) {
  const [joint, setJoint] = useState("left_elbow");
  const series = report.result.series ?? [];
  const posture = report.result.posture;
  const curveNames: Record<string, string> = posture ? { ...jointNames, trunk_lean: "躯干倾斜" } : jointNames;
  const metric: Partial<Metric> = joint === "trunk_lean" && posture
    ? { range_p05_p95_deg: posture.trunk_lean_range_p05_p95_deg, variation_status: posture.trunk_lean_variation_status }
    : report.result.metrics[joint];
  const durationMs = Math.max(series.at(-1)?.timestamp_ms ?? 0, 1);
  const values = series.flatMap(row => [row.angles[joint], row.smoothed_angles?.[joint]])
    .filter((value): value is number => typeof value === "number");
  const min = Math.max(0, Math.floor(values.length ? Math.min(...values) - 2 : 0));
  const max = Math.min(180, Math.ceil(values.length ? Math.max(...values) + 2 : 180));
  const x = (time: number) => 42 + time / durationMs * 536;
  const y = (value: number) => 140 - (value - min) / Math.max(max - min, 1) * 120;
  function path(key: "angles" | "smoothed_angles") {
    let segment = false, previousTime = -Infinity;
    return series.map((row: AngleSample) => {
      const value = row[key]?.[joint];
      if (value === undefined || value === null) { segment = false; return ""; }
      const command = segment && row.timestamp_ms - previousTime <= 1000 ? "L" : "M";
      segment = true; previousTime = row.timestamp_ms;
      return `${command}${x(row.timestamp_ms).toFixed(1)},${y(value).toFixed(1)}`;
    }).join(" ");
  }
  const selectedTime = report.input_data.frames[cursor]?.timestamp_ms ?? 0;
  const noise = joint === "trunk_lean" ? undefined : metric.noise_sigma_deg;
  return <section className="motion-evidence" aria-labelledby="motion-evidence-heading">
    <div className="row between">
      <h3 id="motion-evidence-heading" style={{ margin: 0 }}>角度变化曲线</h3>
      <label className="row" style={{ gap: 8 }}>查看关节曲线<select value={joint} onChange={e => setJoint(e.target.value)} style={{ width: "auto" }}>
        {Object.entries(curveNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
      </select></label>
    </div>
    <div className="metric-tiles">
      <div className="metric-tile"><div className="label">原始幅度 P5–P95</div><div className="value">{metric.range_p05_p95_deg == null ? "未知" : `${metric.range_p05_p95_deg}°`}</div></div>
      <div className="metric-tile"><div className="label">平滑幅度</div><div className="value">{metric.smoothed_range_p05_p95_deg == null ? "未计算" : `${metric.smoothed_range_p05_p95_deg}°`}</div></div>
      <div className="metric-tile"><div className="label">残差噪声估计</div><div className="value">{noise == null ? "数据不足/旧版未计算" : `${noise}°`}</div></div>
    </div>
    <p>{metric.variation_status ? qualityText[metric.variation_status] : "旧版报告保留原值，未重算噪声。"}</p>
    <div className="chart-box">
      <svg viewBox="0 0 600 156" preserveAspectRatio="none" role="img" aria-label={`${curveNames[joint]}原始和平滑角度曲线`} style={{ width: "100%", height: 180, display: "block" }}>
        {[20, 80, 140].map(level => <line key={level} x1={42} x2={578} y1={level} y2={level} stroke="#2a3d36" />)}
        <text x={4} y={24} fill="#7d9a90" fontSize={10}>{max}°</text>
        <text x={4} y={144} fill="#7d9a90" fontSize={10}>{min}°</text>
        <path d={path("angles")} fill="none" stroke="#7f8d88" strokeWidth={1.4} />
        <path d={path("smoothed_angles")} fill="none" stroke="#7fe0bd" strokeWidth={2.2} />
        <line x1={x(selectedTime)} x2={x(selectedTime)} y1={14} y2={140} stroke="#f1c27d" strokeWidth={1.5} />
      </svg>
    </div>
    <div className="legend">
      <span><i style={{ background: "#7f8d88" }} />原始角度</span>
      <span><i style={{ background: "#7fe0bd" }} />平滑角度</span>
      <span><i style={{ background: "#f1c27d" }} />当前证据时刻</span>
      <span>纵轴：{min}°–{max}° · 横轴：0–{(durationMs / 1000).toFixed(1)}秒 · 缺失处断线</span>
    </div>
    <label>角度曲线时间<input type="range" min={0} max={Math.max(report.input_data.frames.length - 1, 0)}
      value={cursor} onChange={e => onCursorChange(Number(e.target.value))} /></label>
    <p className="note">噪声为局部线性残差估计，镜头移动或模型漂移也会影响它；“高于残差”不等于动作达标。</p>
  </section>;
}
