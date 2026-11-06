"use client";
import { FormEvent, useEffect, useState } from "react";
import { postIntake } from "../../workspace/intake";

type Snapshot = { metric_code: string; raw_value: string | null; unit: string; validity: string; missing_reason: string | null; performed_at: string | null; side: string; context_note: string | null; expected_revision: number; change_reason: string | null };
type Row = { id: string; observation_id: string; revision_no: number; snapshot: Snapshot; recorded_by: string; recorded_at: string };
const metrics = { gait_4m_seconds: "4 米步行计时", sit_to_stand_5_seconds: "5 次坐站计时", tug_seconds: "TUG 计时", grip_strength_kg: "握力原始读数" };

export default function ManualObservations({ participantId, canWrite }: { participantId: string; canWrite: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const path = `/participants/${participantId}/manual-observations`;
  async function reload() {
    try { const r = await fetch(`/api/v1${path}`, { cache: "no-store" }); setRows(r.ok ? await r.json() : null); }
    catch { setRows(null); }
  }
  useEffect(() => { void fetch(`/api/v1${path}`, { cache: "no-store" }).then(async r => setRows(r.ok ? await r.json() : null)).catch(() => setRows(null)); }, [path]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const f = new FormData(event.currentTarget);
    const metric = String(f.get("metric"));
    const state = String(f.get("validity"));
    const time = String(f.get("time") ?? "");
    const payload = { metric_code: metric, unit: metric === "grip_strength_kg" ? "kg" : "s",
      raw_value: state === "missing" ? null : String(f.get("value") ?? "") || null,
      validity: state, missing_reason: state === "valid" ? null : String(f.get("reason")),
      performed_at: state === "missing" || !time ? null : new Date(time).toISOString(),
      side: metric === "grip_strength_kg" ? String(f.get("side")) : "unknown",
      context_note: String(f.get("context") ?? "") || null,
      expected_revision: editing?.revision_no ?? 0,
      change_reason: editing ? String(f.get("change")) : null };
    const r = await postIntake(path + (editing ? `/${editing.observation_id}` : ""), payload, crypto.randomUUID(), document.cookie);
    setBusy(false);
    if (!r.value) { setError(`保存失败（${r.status}），请检查输入或刷新版本。`); return; }
    setEditing(null); await reload();
  }
  return <section aria-labelledby="raw-heading"><h2 id="raw-heading">人工原始观察</h2>
    <p>仅合成演示；不自动计分。以下记录暂不包含在旧编号化 CSV 中。</p>
    {rows === null ? <p>观察数据暂不可用。</p> : rows.length ? <ul>{rows.map(row => <li key={row.id}>
      {metrics[row.snapshot.metric_code as keyof typeof metrics]} · 版本 {row.revision_no} · {row.snapshot.raw_value ?? "未测"} {row.snapshot.unit} · {({ valid: "有效原值", missing: "缺失", invalid: "无效原值" } as Record<string, string>)[row.snapshot.validity]}
      {` · 录入人：${row.recorded_by} · ${new Date(row.recorded_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`}
      {row.snapshot.change_reason ? ` · ${row.snapshot.change_reason}` : ""}
      {canWrite && !rows.some(other => other.observation_id === row.observation_id && other.revision_no > row.revision_no) ? <button onClick={() => setEditing(row)}>更正此观察</button> : null}
    </li>)}</ul> : <p>暂无原始观察。</p>}
    {canWrite && rows !== null ? <form key={editing?.id ?? "new"} onSubmit={submit}>
      <label>指标<select name="metric" defaultValue={editing?.snapshot.metric_code ?? "gait_4m_seconds"}>{Object.entries(metrics).map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
      <label>记录状态<select name="validity" defaultValue={editing?.snapshot.validity ?? "valid"}><option value="valid">有效原值</option><option value="missing">缺失</option><option value="invalid">无效原值</option></select></label>
      <label>原始数值<input name="value" defaultValue={editing?.snapshot.raw_value ?? ""} maxLength={40} /></label>
      <label>测量时间<input name="time" type="datetime-local" /></label>
      <label>缺失或无效原因<select name="reason"><option value="unknown">未知</option><option value="declined">拒测</option><option value="technical_failure">技术故障</option><option value="unsafe_to_attempt">工作人员记录不宜尝试</option></select></label>
      <label>握力侧别<select name="side" defaultValue={editing?.snapshot.side ?? "unknown"}><option value="unknown">未知</option><option value="left">左</option><option value="right">右</option></select></label>
      <label>设备或辅助说明<input name="context" defaultValue={editing?.snapshot.context_note ?? ""} maxLength={500} /></label>
      {editing ? <label>更正原因<input name="change" required pattern="SYN-[A-Z0-9_-]{3,60}" placeholder="SYN-CORRECTION" /></label> : null}
      <button disabled={busy}>{editing ? "保存观察更正" : "保存原始观察"}</button>
      {editing ? <button type="button" onClick={() => setEditing(null)}>取消更正</button> : null}
      {error ? <p role="alert">{error}</p> : null}
    </form> : null}
  </section>;
}
