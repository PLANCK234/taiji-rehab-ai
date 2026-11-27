"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, localInputValue, localTimeToUtc } from "../../../lib/format";
import { trainingError, writeTraining, type SafetyEvent, type TrainingSession } from "../../../lib/training";

export default function TrainingForms({ participantId, canWrite, consentGranted, sessions }: {
  participantId: string; canWrite: boolean; consentGranted: boolean; sessions: TrainingSession[];
}) {
  const router = useRouter();
  const sessionKey = useRef(""), eventKey = useRef("");
  const [sessionPending, setSessionPending] = useState(false), [eventPending, setEventPending] = useState(false);
  const [sessionError, setSessionError] = useState(""), [eventError, setEventError] = useState("");
  const [now] = useState(() => localInputValue(new Date(), true));

  async function submitSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const at = localTimeToUtc(String(form.get("session_at") ?? ""));
    if (!at) { setSessionError("请输入有效训练时间。"); return; }
    sessionKey.current ||= crypto.randomUUID();
    setSessionPending(true); setSessionError("");
    const result = await writeTraining<TrainingSession>(`/participants/${participantId}/training-sessions`, {
      session_at: at,
      action_label: String(form.get("action_label") ?? ""),
      actual_minutes: form.get("actual_minutes") === "" ? null : Number(form.get("actual_minutes")),
      completion_status: form.get("completion_status"),
      notes: String(form.get("notes") ?? "").trim() || null,
    }, sessionKey.current, document.cookie);
    setSessionPending(false);
    if (result.value) {
      sessionKey.current = "";
      router.push(`/participants/${participantId}/training/${result.value.id}`);
      router.refresh();
    } else setSessionError(trainingError(result.status));
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const at = localTimeToUtc(String(form.get("event_at") ?? ""));
    if (!at) { setEventError("请输入有效事件时间。"); return; }
    eventKey.current ||= crypto.randomUUID();
    setEventPending(true); setEventError("");
    const result = await writeTraining<SafetyEvent>(`/participants/${participantId}/safety-events`, {
      event_at: at, session_id: String(form.get("session_id") ?? "") || null,
      description: String(form.get("description") ?? ""),
    }, eventKey.current, document.cookie);
    setEventPending(false);
    if (result.value) { eventKey.current = ""; element.reset(); router.refresh(); }
    else setEventError(trainingError(result.status));
  }

  if (!canWrite) return null;
  return <div className="grid-2" style={{ marginTop: 18 }}>
    {consentGranted ? <form className="card flat" onSubmit={submitSession} onChange={() => { sessionKey.current = ""; }}>
      <h3>手动记录已发生的训练</h3>
      <div className="field"><label htmlFor="training-at">训练日期与时间</label>
        <input id="training-at" name="session_at" type="datetime-local" required defaultValue={now} /></div>
      <div className="field"><label htmlFor="training-action">实际动作</label>
        <input id="training-action" name="action_label" maxLength={120} required placeholder="例如：坐位云手" /></div>
      <div className="form-grid">
        <div className="field"><label htmlFor="training-minutes">实际时长（分钟）</label>
          <input id="training-minutes" name="actual_minutes" type="number" min="0" step="1" inputMode="numeric" placeholder="留空 = 未记录" /></div>
        <div className="field"><label htmlFor="training-completion">完成情况</label>
          <select id="training-completion" name="completion_status" defaultValue="completed">
            <option value="completed">完成</option><option value="partial">部分完成</option>
            <option value="interrupted">中断</option><option value="not_started">未开始</option>
          </select></div>
      </div>
      <div className="field"><label htmlFor="training-notes">备注（可选）</label>
        <textarea id="training-notes" name="notes" maxLength={1000} /></div>
      <button type="submit" disabled={sessionPending}>{sessionPending ? "保存中…" : "保存训练观察"}</button>
      {sessionError && <p className="form-error" role="alert">{sessionError}</p>}
    </form> : <div className="card flat"><h3>手动记录训练</h3><p className="note">需要当前有效的模拟同意；事件记录仍可随时补报。</p></div>}

    <form className="card flat" onSubmit={submitEvent} onChange={() => { eventKey.current = ""; }}>
      <h3>报告观察到的事件</h3>
      <div className="field"><label htmlFor="event-at">事件时间</label>
        <input id="event-at" name="event_at" type="datetime-local" required defaultValue={now} /></div>
      <div className="field"><label htmlFor="event-session">关联训练（可选）</label>
        <select id="event-session" name="session_id" defaultValue="">
          <option value="">未关联训练</option>
          {sessions.map(row => <option key={row.id} value={row.id}>{formatDateTime(row.session_at)} · {row.action_label}</option>)}
        </select></div>
      <div className="field"><label htmlFor="event-description">观察事实</label>
        <textarea id="event-description" name="description" maxLength={2000} required placeholder="客观描述发生了什么；严重程度与处置请按机构流程" /></div>
      <button type="submit" className="btn-secondary" disabled={eventPending}>{eventPending ? "保存中…" : "保存事件记录"}</button>
      {eventError && <p className="form-error" role="alert">{eventError}</p>}
    </form>
  </div>;
}
