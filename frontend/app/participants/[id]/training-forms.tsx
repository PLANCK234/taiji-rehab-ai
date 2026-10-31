"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  localTimeToUtc, trainingError, writeTraining,
  type SafetyEvent, type TrainingSession,
} from "../../workspace/training";

export default function TrainingForms({
  participantId, canWrite, consentGranted, sessions,
}: {
  participantId: string;
  canWrite: boolean;
  consentGranted: boolean;
  sessions: TrainingSession[];
}) {
  const router = useRouter();
  const sessionKey = useRef("");
  const eventKey = useRef("");
  const [sessionPending, setSessionPending] = useState(false);
  const [eventPending, setEventPending] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [eventError, setEventError] = useState("");

  async function submitSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const at = localTimeToUtc(String(form.get("session_at") ?? ""));
    if (!at) { setSessionError("请输入有效训练时间。"); return; }
    sessionKey.current ||= crypto.randomUUID();
    setSessionPending(true);
    setSessionError("");
    const result = await writeTraining<TrainingSession>(
      `/participants/${participantId}/training-sessions`,
      {
        session_at: at,
        action_label: String(form.get("action_label") ?? ""),
        actual_minutes: form.get("actual_minutes") === ""
          ? null : Number(form.get("actual_minutes")),
        completion_status: form.get("completion_status"),
        notes: String(form.get("notes") ?? "").trim() || null,
      },
      sessionKey.current, document.cookie,
    );
    setSessionPending(false);
    if (result.value) {
      sessionKey.current = "";
      router.push(`/participants/${participantId}/training/${result.value.id}`);
      router.refresh();
    } else setSessionError(trainingError(result.status));
  }

  async function submitEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const at = localTimeToUtc(String(form.get("event_at") ?? ""));
    if (!at) { setEventError("请输入有效事件时间。"); return; }
    eventKey.current ||= crypto.randomUUID();
    setEventPending(true);
    setEventError("");
    const result = await writeTraining<SafetyEvent>(
      `/participants/${participantId}/safety-events`,
      {
        event_at: at,
        session_id: String(form.get("session_id") ?? "") || null,
        description: String(form.get("description") ?? ""),
      },
      eventKey.current, document.cookie,
    );
    setEventPending(false);
    if (result.value) {
      eventKey.current = "";
      formElement.reset();
      router.refresh();
    } else setEventError(trainingError(result.status));
  }

  if (!canWrite) return null;
  return <>
    {consentGranted ? <form onSubmit={submitSession} onChange={() => { sessionKey.current = ""; }}>
      <h3>记录已发生训练</h3>
      <p className="note">只记录观察结果，不创建训练处方或适配建议。</p>
      <label htmlFor="training-at">训练日期与时间</label>
      <input id="training-at" name="session_at" type="datetime-local" required />
      <label htmlFor="training-action">实际动作</label>
      <input id="training-action" name="action_label" maxLength={120} required />
      <label htmlFor="training-minutes">实际时长（分钟；留空表示未知，0 表示确实为零）</label>
      <input id="training-minutes" name="actual_minutes" type="number" min="0" step="1" />
      <label htmlFor="training-completion">完成情况</label>
      <select id="training-completion" name="completion_status" defaultValue="completed">
        <option value="completed">完成</option>
        <option value="partial">部分完成</option>
        <option value="interrupted">中断</option>
        <option value="not_started">未开始</option>
      </select>
      <label htmlFor="training-notes">备注（可留空）</label>
      <textarea id="training-notes" name="notes" maxLength={1000} />
      <button type="submit" disabled={sessionPending}>
        {sessionPending ? "保存中…" : "保存训练观察"}
      </button>
      {sessionError && <p role="alert">{sessionError}</p>}
    </form> : <p className="note">创建训练观察需当前模拟同意；事件补报入口仍可使用。</p>}

    <form onSubmit={submitEvent} onChange={() => { eventKey.current = ""; }}>
      <h3>报告观察到的风险事件</h3>
      <p className="note">可在反馈未填写时单独记录；本系统不判定严重程度、不发送处置通知，请按机构既有渠道处理。</p>
      <label htmlFor="event-at">事件时间</label>
      <input id="event-at" name="event_at" type="datetime-local" required />
      <label htmlFor="event-session">关联训练（可选）</label>
      <select id="event-session" name="session_id" defaultValue="">
        <option value="">未关联训练</option>
        {sessions.map((row) => <option key={row.id} value={row.id}>
          {new Date(row.session_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} · {row.action_label}
        </option>)}
      </select>
      <label htmlFor="event-description">观察事实</label>
      <textarea id="event-description" name="description" maxLength={2000} required />
      <button type="submit" disabled={eventPending}>
        {eventPending ? "上报中…" : "保存事件记录"}
      </button>
      {eventError && <p role="alert">{eventError}</p>}
    </form>
  </>;
}
