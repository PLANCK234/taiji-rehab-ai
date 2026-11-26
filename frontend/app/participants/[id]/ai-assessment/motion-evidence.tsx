"use client";

import { useState } from "react";
import { jointNames } from "../../../workspace/pose";
import type { AngleSample, PoseDetail } from "../../../workspace/pose";

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
  const metric = report.result.metrics[joint];
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
  return <section className="motion-evidence" aria-labelledby="motion-evidence-heading">
    <h3 id="motion-evidence-heading">角度变化与噪声证据</h3>
    <label>查看关节曲线<select value={joint} onChange={e => setJoint(e.target.value)}>
      {Object.entries(jointNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
    </select></label>
    <p>原始幅度：{metric.range_p05_p95_deg === null ? "未知" : `${metric.range_p05_p95_deg}°`} · 平滑幅度：{metric.smoothed_range_p05_p95_deg == null ? "未计算" : `${metric.smoothed_range_p05_p95_deg}°`} · 残差噪声估计：{metric.noise_sigma_deg == null ? "数据不足/旧版未计算" : `${metric.noise_sigma_deg}°`}</p>
    <p>{metric.variation_status ? qualityText[metric.variation_status] : "旧版报告保留原值，未重算噪声。"}</p>
    <p>纵轴：{min}°–{max}° · 横轴：0–{(durationMs / 1000).toFixed(1)}秒</p>
    <svg viewBox="0 0 600 156" preserveAspectRatio="none" role="img" aria-label={`${jointNames[joint]}原始和平滑角度曲线`} style={{ width: "100%", height: 180, maxWidth: 800 }}>
      <line x1={42} x2={578} y1={140} y2={140} stroke="#777" />
      <path d={path("angles")} fill="none" stroke="#8f99a8" strokeWidth={1.5} />
      <path d={path("smoothed_angles")} fill="none" stroke="#b4ffdf" strokeWidth={2} />
      <line x1={x(selectedTime)} x2={x(selectedTime)} y1={20} y2={140} stroke="#f8dc91" />
    </svg>
    <p>灰线：原始角度 · 浅绿：平滑角度 · 黄色：当前证据时刻。缺失处断线。</p>
    <label>角度曲线时间<input type="range" min={0} max={report.input_data.frames.length - 1}
      value={cursor} onChange={e => onCursorChange(Number(e.target.value))} /></label>
    <p className="note">噪声是局部线性残差的估计；真实曲线的弯曲、镜头移动或模型漂移也会影响它。“高于残差”不等于确认真实运动或动作达标。</p>
  </section>;
}
