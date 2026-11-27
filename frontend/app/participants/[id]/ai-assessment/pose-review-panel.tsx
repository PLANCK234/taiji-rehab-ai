"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { demoError, writeDemo } from "../../../../lib/demo";
import { correctionDrafts, correctionPayload } from "../../../../lib/pose-corrections";
import type { CorrectionDraft } from "../../../../lib/pose-corrections";
import { jointNames, reviewDecisionNames, reviewMetricNames } from "../../../../lib/pose";
import type { PoseDetail, PoseJoint, PoseReview, ReviewDecision, ReviewMetric } from "../../../../lib/pose";

const degrees = (value: number | null | undefined) => value == null ? "未知" : `${value}°`;

export default function PoseReviewPanel({ report, canReview, busy, onBusy, onStatus, onReload }: {
  report: PoseDetail; canReview: boolean; busy: boolean; onBusy: (busy: boolean) => void;
  onStatus: (message: string) => void; onReload: () => Promise<void>;
}) {
  const latest = report.reviews.at(-1);
  const [decision, setDecision] = useState<ReviewDecision>(latest?.decision ?? "accepted_observations");
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<CorrectionDraft[]>(() => correctionDrafts(latest?.corrections ?? []));
  const pending = useRef(false), retry = useRef<{ signature: string; key: string } | null>(null);

  function change(index: number, patch: Partial<CorrectionDraft>) {
    setRows(prior => prior.map((row, at) => at === index ? { ...row, ...patch } : row));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    let saved = false;
    try {
      const body = {
        expected_revision: latest?.revision_no ?? 0, decision, reason: reason.trim(),
        corrections: decision === "modified_observations" ? correctionPayload(rows) : [],
      };
      if (!body.reason) throw new Error("请填写复核说明。");
      const signature = JSON.stringify(body);
      if (retry.current?.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
      pending.current = true; onBusy(true);
      const response = await writeDemo<PoseReview>(`/pose-analyses/${report.id}/reviews`, body,
        document.cookie, retry.current.key);
      if (!response.value) {
        if (response.status === 409) throw new Error("复核记录已更新，请先刷新复核记录。");
        if (response.status === 422) throw new Error("请核对复核项目、数值和理由；不可评估的AI结果不能直接确认。");
        throw new Error(demoError(response.status));
      }
      saved = true;
      await onReload();
      onStatus("人工复核已追加保存，AI原始结果保留。");
    } catch (error) {
      onStatus(saved ? "复核已保存，历史读取暂不可用；请刷新复核记录。" : String(error));
    } finally { pending.current = false; onBusy(false); }
  }

  async function refresh() {
    onBusy(true);
    try { await onReload(); } catch { onStatus("复核记录读取失败，请稍后重试。"); }
    finally { onBusy(false); }
  }

  return <div className="pose-review-panel" role="region" aria-labelledby="pose-review-heading">
    <h3 id="pose-review-heading">工作人员复核</h3>
    {report.human_confirmation ? <>
      <h4>当前人工确认结果 · 版本{report.human_confirmation.revision_no}</h4>
      <p>以下为本次复核结果，AI报告与曲线保留原值。</p>
      <ul>{Object.entries(report.human_confirmation.metrics).flatMap(([joint, values]) =>
        (Object.keys(reviewMetricNames) as ReviewMetric[]).map(metric => <li key={`${joint}:${metric}`}>
          {jointNames[joint]} · {reviewMetricNames[metric]}：AI {degrees(report.result.metrics[joint][metric])} → 人工复核 {degrees(values[metric])}
        </li>))}</ul>
    </> : <p>当前没有已确认的观察结果。</p>}
    <h4>复核历史</h4>
    {report.reviews.length ? <ul>{report.reviews.map(review => <li key={review.id}>
      <p>版本{review.revision_no} · {reviewDecisionNames[review.decision]} · {review.reason}</p>
      <p className="note">{new Date(review.recorded_at).toLocaleString("zh-CN")} · 操作者 {review.recorded_by}</p>
      {review.corrections.length > 0 && <ul>{review.corrections.map(row => <li key={`${row.joint}:${row.metric}`}>
        {jointNames[row.joint]} · {reviewMetricNames[row.metric]}：AI {degrees(report.result.metrics[row.joint][row.metric])} → 人工 {degrees(row.value)} · {row.reason}
      </li>)}</ul>}
    </li>)}</ul> : <p>尚未人工复核。</p>}
    <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => void refresh()}>刷新复核记录</button>
    {canReview && <form onSubmit={event => void save(event)}>
      <label>复核结论<select value={decision} disabled={busy} onChange={e => setDecision(e.target.value as ReviewDecision)}>
        <option value="accepted_observations">确认观察指标（不代表临床处方）</option>
        <option value="modified_observations">修正后确认观察指标</option>
        <option value="needs_retake">要求重新采集</option><option value="rejected">拒绝本次结果</option>
      </select></label>
      {decision === "modified_observations" && <fieldset disabled={busy}>
        <legend>逐项指标修正</legend>
        <p>未列出的指标沿用AI原值。无法判断时明确标为未知，并说明理由。</p>
        {rows.map((row, index) => <fieldset key={index}>
          <legend>修正{index + 1}</legend>
          <label>关节<select aria-label={`修正${index + 1}关节`} value={row.joint} onChange={e => change(index, { joint: e.target.value as PoseJoint })}>
            {Object.entries(jointNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <label>指标<select aria-label={`修正${index + 1}指标`} value={row.metric} onChange={e => change(index, { metric: e.target.value as ReviewMetric })}>
            {Object.entries(reviewMetricNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>
          <p>AI原值：{degrees(report.result.metrics[row.joint][row.metric])}</p>
          <label>观测状态<select aria-label={`修正${index + 1}观测状态`} value={row.validity} onChange={e => change(index, { validity: e.target.value as "valid" | "missing" })}>
            <option value="valid">有观测值</option><option value="missing">无法判断，保留未知</option>
          </select></label>
          {row.validity === "valid" && <label>人工值（度）<input aria-label={`修正${index + 1}人工值（度）`} type="number" min={0} max={180} step="any" required value={row.value} onChange={e => change(index, { value: e.target.value })} /></label>}
          <label>修正理由<textarea aria-label={`修正${index + 1}理由`} required maxLength={500} value={row.reason} onChange={e => change(index, { reason: e.target.value })} /></label>
          <button type="button" onClick={() => setRows(prior => prior.filter((_, at) => at !== index))}>移除修正{index + 1}</button>
        </fieldset>)}
        <button type="button" disabled={rows.length >= 12} onClick={() => setRows(prior => [...prior, {
          joint: "left_elbow", metric: "median_deg", validity: "valid", value: "", reason: "",
        }])}>添加指标修正</button>
      </fieldset>}
      {decision === "accepted_observations" && latest?.corrections.length ? <p>本次确认将使用AI原值；如需保留人工修正，请选择“修正后确认观察指标”。</p> : null}
      <label>复核说明<textarea maxLength={1000} required value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label>
      <button type="submit" disabled={busy || !reason.trim()}>保存人工复核</button>
    </form>}
  </div>;
}
