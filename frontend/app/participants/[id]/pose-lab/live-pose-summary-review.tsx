"use client";

import { useRef, useState } from "react";
import { isLiveSummary, type LiveSummary } from "./live-pose-summary";
import type { JointName } from "./pose-analysis";

const jointLabels: Record<JointName, string> = {
  left_shoulder: "左肩", right_shoulder: "右肩", left_elbow: "左肘", right_elbow: "右肘",
  left_hip: "左髋", right_hip: "右髋", left_knee: "左膝", right_knee: "右膝",
  left_ankle: "左踝", right_ankle: "右踝",
};

export default function LivePoseSummaryReview() {
  const request = useRef(0);
  const [summary, setSummary] = useState<LiveSummary | null>(null);
  const [error, setError] = useState("");

  async function open(file: File) {
    const current = ++request.current;
    setSummary(null);
    setError("");
    try {
      if (file.size > 16_384) throw new Error();
      const data: unknown = JSON.parse(await file.text());
      if (!isLiveSummary(data)) throw new Error();
      if (current === request.current) setSummary(data);
    } catch {
      if (current === request.current) setError("无法读取摘要。请选择本系统导出的实时分析 JSON（最多 16 KB）。");
    }
  }

  return <section aria-labelledby="live-summary-review-heading">
    <h2 id="live-summary-review-heading">核对实时分析摘要</h2>
    <p>请核实文件来源和对应任务。摘要在当前浏览器打开，角度为模型估算值。</p>
    <label>打开实时分析 JSON<input type="file" accept=".json,application/json" onChange={(event) => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (file) void open(file);
    }} /></label>
    {error && <p role="alert">{error}</p>}
    {summary && <>
      <h3>已打开实时分析摘要</h3>
      <p>{summary.sample_count ? `检出 ${summary.detected_count} / ${summary.sample_count} 次采样，取景检查通过 ${summary.framing_check_pass_count} 次。` : "没有可用采样，识别覆盖率未知。"}</p>
      <p>首末采样间隔：{summary.observed_ms === null ? "未知" : `${(summary.observed_ms / 1000).toFixed(2)} 秒`}</p>
      <div className="trend-table-wrap"><table className="trend-table">
        <caption>各关节估算角度范围</caption>
        <thead><tr><th scope="col">关节</th><th scope="col">范围</th><th scope="col">有效采样</th></tr></thead>
        <tbody>{(Object.keys(jointLabels) as JointName[]).map((joint) => {
          const range = summary.joint_ranges[joint];
          return <tr key={joint}><th scope="row">{jointLabels[joint]}</th>
            <td>{range ? `${range.min_deg.toFixed(1)}°–${range.max_deg.toFixed(1)}°` : "未知"}</td>
            <td>{range?.samples ?? 0}</td></tr>;
        })}</tbody>
      </table></div>
      <button type="button" onClick={() => setSummary(null)}>关闭摘要</button>
    </>}
  </section>;
}
