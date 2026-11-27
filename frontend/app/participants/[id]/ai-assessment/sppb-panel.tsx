"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { errorText } from "../../../../lib/api";
import type { PoseDetail } from "../../../../lib/pose";
import { dateText, parseTimingSeconds, readTiming, timeText, timingDecisions, timingReasons,
  timingReviewBody, writeTiming } from "../../../../lib/sppb";
import type { TimingDecision, TimingDetail, TimingMeasurement, TimingPage, TimingReview } from "../../../../lib/sppb";

type Run = (operation: () => Promise<void>) => Promise<void>;
type Retry = { signature: string; key: string } | null;
function stableKey(retry: { current: Retry }, body: object) {
  const signature = JSON.stringify(body);
  if (retry.current?.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
  return retry.current.key;
}
function writeError(status: number) {
  return status === 409 ? "记录版本已变化，请刷新坐站记录后重新核对。"
    : status === 422 ? "请核对起止时刻和录像范围；未知候选需修正或要求重测。"
    : status === 503 ? "提交结果暂无法确认，请保持内容重试，或刷新坐站记录核对。" : errorText(status);
}

function TimingCreate({ participantId, source, disabled, run, onCreated }: {
  participantId: string; source: PoseDetail; disabled: boolean; run: Run;
  onCreated: (row: TimingMeasurement) => Promise<void>;
}) {
  const [manual, setManual] = useState(false), [start, setStart] = useState("");
  const retry = useRef<Retry>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const body = { source_analysis_id: source.id,
        manual_start_ms: manual ? parseTimingSeconds(start, source.result.duration_seconds) : null };
      const response = await writeTiming<TimingMeasurement>(`/participants/${participantId}/sppb-measurements`,
        body, stableKey(retry, body));
      if (!response.value) throw new Error(writeError(response.status));
      await onCreated(response.value);
      retry.current = null;
    });
  }
  return <form onSubmit={submit} aria-label="生成坐站测量">
    <p>已选骨架：{dateText(source.created_at)} · 录像 {timeText(source.result.duration_seconds)}</p>
    <fieldset disabled={disabled}>
      <label className="check"><input type="checkbox" checked={manual} onChange={e => setManual(e.target.checked)} />指定人工起点</label>
      {manual && <div className="field"><label htmlFor="sppb-manual-start">人工起点（秒）</label>
        <input id="sppb-manual-start" type="number" step="0.001" min="0" max={source.result.duration_seconds}
          value={start} onChange={e => setStart(e.target.value)} required /></div>}
      <button type="submit">生成坐站候选测量</button>
    </fieldset>
  </form>;
}

function TimingReviewForm({ detail, duration, disabled, run, onSaved }: {
  detail: TimingDetail; duration: number | null; disabled: boolean; run: Run; onSaved: () => Promise<void>;
}) {
  const latest = detail.reviews.at(-1);
  const [decision, setDecision] = useState<TimingDecision>(latest?.decision ?? (detail.result.status === "candidate" ? "accepted_timing" : "needs_retake"));
  const [reason, setReason] = useState("");
  const [start, setStart] = useState(() => {
    const value = latest?.decision === "modified_timing" ? latest.start_ms : detail.result.start_ms;
    return value == null ? "" : String(value / 1000);
  });
  const [end, setEnd] = useState(() => {
    const value = latest?.decision === "modified_timing" ? latest.fifth_stand_ms : detail.result.fifth_stand_ms;
    return value == null ? "" : String(value / 1000);
  });
  const retry = useRef<Retry>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      if (duration === null) throw new Error("来源录像读取失败，请刷新坐站记录后重试。");
      const body = timingReviewBody(detail, decision, reason, start, end, duration);
      const response = await writeTiming<TimingReview>(`/sppb-measurements/${detail.id}/reviews`, body, stableKey(retry, body));
      if (!response.value) throw new Error(writeError(response.status));
      try { await onSaved(); }
      catch { throw new Error("复核已保存，最新历史暂不可用，请刷新坐站记录。"); }
    });
  }
  return <form onSubmit={submit} aria-label="坐站人工计时复核">
    <fieldset disabled={disabled || duration === null}>
      <div className="field"><label htmlFor="sppb-decision">坐站复核结论</label>
        <select id="sppb-decision" value={decision} onChange={e => setDecision(e.target.value as TimingDecision)}>
          {Object.entries(timingDecisions).map(([value, label]) => <option key={value} value={value}
            disabled={value === "accepted_timing" && detail.result.status !== "candidate"}>{label}</option>)}
        </select></div>
      {decision === "modified_timing" && <div className="grid-2">
        <div className="field"><label htmlFor="sppb-start">修正起点（秒）</label>
          <input id="sppb-start" type="number" step="0.001" min="0" max={duration ?? undefined}
            value={start} required onChange={e => setStart(e.target.value)} /></div>
        <div className="field"><label htmlFor="sppb-end">第五次站起时刻（秒）</label>
          <input id="sppb-end" type="number" step="0.001" min="0" max={duration ?? undefined}
            value={end} required onChange={e => setEnd(e.target.value)} /></div>
      </div>}
      <div className="field"><label htmlFor="sppb-reason">坐站复核说明</label>
        <textarea id="sppb-reason" value={reason} maxLength={1000} required onChange={e => setReason(e.target.value)} /></div>
      <button type="submit">保存坐站人工复核</button>
    </fieldset>
  </form>;
}

export default function SppbPanel({ participantId, source, initialPage, canWrite, canReview, busy, onBusy, onOpenSource }: {
  participantId: string; source: PoseDetail | null; initialPage: TimingPage | null;
  canWrite: boolean; canReview: boolean; busy: boolean; onBusy: (value: boolean) => void;
  onOpenSource: (id: string) => Promise<void>;
}) {
  const [page, setPage] = useState(initialPage), [detail, setDetail] = useState<TimingDetail | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [message, setMessage] = useState(initialPage === null ? "坐站历史读取失败，请刷新坐站历史。" : "打开已有骨架报告后生成候选测量，再核对起止时刻。");
  const [failed, setFailed] = useState(initialPage === null);
  const pending = useRef(false);
  const path = `/participants/${participantId}/sppb-measurements`;
  async function run(operation: () => Promise<void>) {
    if (pending.current || busy) return;
    pending.current = true; onBusy(true); setFailed(false); setMessage("正在处理坐站记录…");
    try { await operation(); setMessage("坐站记录已读取并保留，下一步可核对来源骨架或追加人工复核。"); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "坐站处理失败，请重试。"); }
    finally { pending.current = false; onBusy(false); }
  }
  async function refreshPage(offset = page?.offset ?? 0) {
    const value = await readTiming<TimingPage>(`${path}?limit=5&offset=${offset}`);
    if (!value) throw new Error("坐站历史读取失败，请检查连接后刷新坐站历史。");
    setPage(value);
  }
  async function open(id: string) {
    const value = await readTiming<TimingDetail>(`/sppb-measurements/${id}`);
    if (!value) throw new Error("坐站详情读取失败，请刷新坐站记录。");
    const pose = source?.id === value.source_analysis_id ? source
      : await readTiming<PoseDetail>(`/pose-analyses/${value.source_analysis_id}`);
    setDetail(value); setDuration(pose?.result.duration_seconds ?? null);
    if (!pose) throw new Error("坐站记录已读取，来源骨架暂不可用，请刷新坐站记录。");
  }
  async function created(row: TimingMeasurement) {
    // Preserve the known committed row even if a subsequent read fails.
    setDetail({ ...row, reviews: [], human_confirmation: null });
    setDuration(source?.result.duration_seconds ?? null);
    try { await Promise.all([open(row.id), refreshPage(0)]); }
    catch { throw new Error("候选测量已保存，历史暂不可用，请刷新坐站历史和坐站记录。"); }
  }
  return <section className="card sppb-panel" aria-labelledby="sppb-heading">
    <div className="card-head"><h2 id="sppb-heading">4. 五次坐站候选测量</h2><span className="badge">计时观察</span></div>
    <p className="note">请使用专门的五次坐站测试录像。先打开上方已保存的骨架，再生成测量并由工作人员核对；太极动作幅度不换算为 SPPB 分。</p>
    {source && canWrite ? <TimingCreate key={source.id} participantId={participantId} source={source}
      disabled={busy} run={run} onCreated={created} /> : <p className="note">{source ? "当前账号可查看和复核已有测量。" : "请先打开一份已保存的骨架报告。"}</p>}
    <p role={failed ? "alert" : "status"} className="status-line" aria-live="polite">{message}</p>
    {detail && <div className="sppb-detail" role="region" aria-label="当前坐站测量">
      <h3>坐站候选与人工计时</h3>
      <p className="note">来源骨架：{detail.source_analysis_id} · {detail.algorithm_version}</p>
      <div className="metric-tiles">
        <div className="metric-tile"><div className="label">AI 候选用时</div><div className="value">{timeText(detail.result.elapsed_seconds)}</div>
          <div className="hint">识别到 {detail.result.candidate_count} 次候选站起</div></div>
        <div className="metric-tile"><div className="label">当前人工确认用时</div><div className="value">{timeText(detail.human_confirmation?.elapsed_seconds)}</div>
          <div className="hint">{detail.human_confirmation ? `人工版本 ${detail.human_confirmation.revision_no}` : "尚无当前有效确认"}</div></div>
      </div>
      <p>AI 起点：{timeText(detail.result.start_ms == null ? null : detail.result.start_ms / 1000)} · 第五次候选：{timeText(detail.result.fifth_stand_ms == null ? null : detail.result.fifth_stand_ms / 1000)}</p>
      <p>有效关键点帧 {(detail.result.quality.usable_frame_ratio * 100).toFixed(0)}% · 单人帧 {(detail.result.quality.single_person_frame_ratio * 100).toFixed(0)}%</p>
      {detail.result.failure_reasons.length > 0 && <ul>{detail.result.failure_reasons.map(reason => <li key={reason}>{timingReasons[reason] ?? "暂无法判定，请核对骨架和取景"}</li>)}</ul>}
      <div className="button-row">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(() => onOpenSource(detail.source_analysis_id))}>打开计时来源骨架</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(() => open(detail.id))}>刷新坐站记录</button>
      </div>
      <h3>计时复核历史</h3>
      {detail.reviews.length === 0 ? <p className="note">尚无人工计时复核。</p> : <ol className="sppb-reviews">{detail.reviews.map(review => <li key={review.id}>
        <strong>计时版本 {review.revision_no} · {timingDecisions[review.decision]}</strong>
        {review.decision === "modified_timing" && <p>人工起点 {timeText(review.start_ms == null ? null : review.start_ms / 1000)} · 第五次站起 {timeText(review.fifth_stand_ms == null ? null : review.fifth_stand_ms / 1000)}</p>}
        <p>{review.reason}</p><small>{dateText(review.recorded_at)} · 复核人 {review.recorded_by}</small>
      </li>)}</ol>}
      {canReview && <TimingReviewForm key={`${detail.id}:${detail.reviews.at(-1)?.revision_no ?? 0}`} detail={detail}
        duration={duration} disabled={busy} run={run} onSaved={() => open(detail.id)} />}
    </div>}
    <div className="button-row"><h3>坐站测量历史</h3><button className="btn-secondary" type="button" disabled={busy} onClick={() => void run(() => refreshPage())}>刷新坐站历史</button></div>
    {page === null ? <p>坐站历史未知，请重新读取。</p> : page.items.length === 0 ? <p className="note">本页暂无坐站测量。</p>
      : <ul className="list">{page.items.map(row => <li key={row.id}><span className="main"><strong>{dateText(row.created_at)}</strong><small>AI候选 {timeText(row.result.elapsed_seconds)}</small></span>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void run(() => open(row.id))}>打开坐站测量</button></li>)}</ul>}
    {page && <div className="button-row" aria-label="坐站历史分页">
      <button type="button" className="btn-secondary" disabled={busy || page.offset === 0} onClick={() => void run(() => refreshPage(Math.max(0, page.offset - page.limit)))}>上一页坐站记录</button>
      <span>共 {page.total} 条 · 当前 {page.items.length ? page.offset + 1 : 0}–{page.offset + page.items.length}</span>
      <button type="button" className="btn-secondary" disabled={busy || page.offset + page.limit >= page.total} onClick={() => void run(() => refreshPage(page.offset + page.limit))}>下一页坐站记录</button>
    </div>}
  </section>;
}
