"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  trainingError, writeTraining, type TrainingFeedback,
} from "../../../../workspace/training";

export default function FeedbackForm({
  sessionId, expectedRevision,
}: {
  sessionId: string;
  expectedRevision: number;
}) {
  const router = useRouter();
  const key = useRef("");
  const [state, setState] = useState<"recorded" | "missing">("recorded");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    key.current ||= crypto.randomUUID();
    setPending(true);
    setError("");
    const optional = (name: string) => String(form.get(name) ?? "").trim() || null;
    const result = await writeTraining<TrainingFeedback>(
      `/training-sessions/${sessionId}/feedback`,
      {
        expected_revision: expectedRevision,
        state,
        missing_reason: state === "missing" ? form.get("missing_reason") : null,
        rpe: state === "recorded" && form.get("rpe") !== "" ? Number(form.get("rpe")) : null,
        difficulty: state === "recorded" ? optional("difficulty") : null,
        support: state === "recorded" ? optional("support") : null,
        fatigue: state === "recorded" ? optional("fatigue") : null,
        discomfort: state === "recorded" ? optional("discomfort") : null,
        notes: state === "recorded" ? optional("notes") : null,
        change_reason: optional("change_reason"),
      },
      key.current, document.cookie, "PUT",
    );
    setPending(false);
    if (result.value) {
      key.current = "";
      router.refresh();
    } else setError(trainingError(result.status));
  }

  return <form onSubmit={submit} onChange={() => { key.current = ""; }}>
    <h3>{expectedRevision ? "追加反馈更正" : "录入反馈"}</h3>
    <label htmlFor="feedback-state">反馈状态</label>
    <select
      id="feedback-state" name="state" value={state}
      onChange={(event) => setState(event.target.value as "recorded" | "missing")}
    >
      <option value="recorded">已记录</option>
      <option value="missing">缺失</option>
    </select>
    {state === "missing" ? <>
      <label htmlFor="feedback-missing">缺失原因</label>
      <select id="feedback-missing" name="missing_reason" required defaultValue="unknown">
        <option value="declined">拒绝反馈</option>
        <option value="interrupted">训练中断</option>
        <option value="technical_failure">技术故障</option>
        <option value="unknown">原因未知</option>
      </select>
    </> : <>
      <p className="note">仅录入实际反馈。留空表示未记录；RPE 使用文档中的 6–20 输入范围。</p>
      <label htmlFor="feedback-rpe">RPE（6–20，可留空）</label>
      <input id="feedback-rpe" name="rpe" type="number" min="6" max="20" step="1" />
      <label htmlFor="feedback-difficulty">动作困难</label>
      <textarea id="feedback-difficulty" name="difficulty" maxLength={500} />
      <label htmlFor="feedback-support">辅助情况</label>
      <textarea id="feedback-support" name="support" maxLength={500} />
      <label htmlFor="feedback-fatigue">疲劳</label>
      <textarea id="feedback-fatigue" name="fatigue" maxLength={500} />
      <label htmlFor="feedback-discomfort">不适</label>
      <textarea id="feedback-discomfort" name="discomfort" maxLength={500} />
      <label htmlFor="feedback-notes">其他观察备注</label>
      <textarea id="feedback-notes" name="notes" maxLength={1000} />
    </>}
    {expectedRevision > 0 ? <>
      <label htmlFor="feedback-reason">更正原因</label>
      <textarea id="feedback-reason" name="change_reason" maxLength={500} required />
    </> : null}
    <button type="submit" disabled={pending}>{pending ? "保存中…" : "保存反馈版本"}</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
