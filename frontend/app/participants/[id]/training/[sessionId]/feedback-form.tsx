"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { writeDemo, type DemoRun } from "../../../../../lib/demo";
import { trainingError, writeTraining, type TrainingFeedback } from "../../../../../lib/training";

/** Borg 6–20 anchors, shown as guidance only. */
const RPE_HINT = "6 毫不费力 · 9 很轻松 · 11 轻松 · 13 有点吃力 · 15 吃力 · 17 很吃力 · 19–20 极度吃力";

export default function FeedbackForm({ sessionId, expectedRevision, completeDemoRunId }: {
  sessionId: string; expectedRevision: number; completeDemoRunId?: string;
}) {
  const router = useRouter();
  const key = useRef("");
  const [state, setState] = useState<"recorded" | "missing">("recorded");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const optional = (name: string) => String(form.get(name) ?? "").trim() || null;
    const recorded = state === "recorded";
    const body = {
      expected_revision: expectedRevision, state,
      missing_reason: recorded ? null : form.get("missing_reason"),
      rpe: recorded && form.get("rpe") !== "" ? Number(form.get("rpe")) : null,
      difficulty: recorded ? optional("difficulty") : null,
      support: recorded ? optional("support") : null,
      fatigue: recorded ? optional("fatigue") : null,
      discomfort: recorded ? optional("discomfort") : null,
      notes: recorded ? optional("notes") : null,
      change_reason: optional("change_reason"),
    };
    if (recorded && [body.rpe, body.difficulty, body.support, body.fatigue, body.discomfort, body.notes].every(value => value === null)) {
      setError("请至少填写一项反馈；若对象未给出反馈，请把“反馈状态”选为“缺失”。");
      return;
    }
    key.current ||= crypto.randomUUID();
    setPending(true); setError("");
    const result = await writeTraining<TrainingFeedback>(`/training-sessions/${sessionId}/feedback`, body, key.current, document.cookie, "PUT");
    setPending(false);
    if (!result.value) { setError(trainingError(result.status)); return; }
    key.current = "";
    if (completeDemoRunId) {
      const completed = await writeDemo<DemoRun>(`/demo-runs/${completeDemoRunId}/complete`, {}, document.cookie);
      if (!completed.value) setError("反馈已保存，完成状态待确认；请刷新后点击“确认完成”。");
    }
    router.refresh();
  }

  return <form onSubmit={submit} onChange={() => { key.current = ""; }}>
    <h3 style={{ margin: 0 }}>{expectedRevision ? "追加反馈更正" : "录入反馈"}</h3>
    <div className="field">
      <label htmlFor="feedback-state">反馈状态</label>
      <select id="feedback-state" name="state" value={state} onChange={event => setState(event.target.value as "recorded" | "missing")}>
        <option value="recorded">已记录</option>
        <option value="missing">缺失</option>
      </select>
    </div>
    {state === "missing" ? <div className="field">
      <label htmlFor="feedback-missing">缺失原因</label>
      <select id="feedback-missing" name="missing_reason" required defaultValue="unknown">
        <option value="declined">拒绝反馈</option><option value="interrupted">训练中断</option>
        <option value="technical_failure">技术故障</option><option value="unknown">原因未知</option>
      </select>
    </div> : <>
      <div className="field">
        <label htmlFor="feedback-rpe">RPE（6–20，可留空）</label>
        <input id="feedback-rpe" name="rpe" type="number" min="6" max="20" step="1" inputMode="numeric" placeholder="主观用力程度" />
        <span className="hint">{RPE_HINT}</span>
      </div>
      <div className="form-grid">
        <div className="field"><label htmlFor="feedback-difficulty">动作困难</label><textarea id="feedback-difficulty" name="difficulty" maxLength={500} /></div>
        <div className="field"><label htmlFor="feedback-support">辅助情况</label><textarea id="feedback-support" name="support" maxLength={500} /></div>
        <div className="field"><label htmlFor="feedback-fatigue">疲劳</label><textarea id="feedback-fatigue" name="fatigue" maxLength={500} /></div>
        <div className="field"><label htmlFor="feedback-discomfort">不适</label><textarea id="feedback-discomfort" name="discomfort" maxLength={500} /></div>
      </div>
      <div className="field"><label htmlFor="feedback-notes">其他观察备注</label><textarea id="feedback-notes" name="notes" maxLength={1000} /></div>
    </>}
    {expectedRevision > 0 ? <div className="field">
      <label htmlFor="feedback-reason">更正原因</label>
      <textarea id="feedback-reason" name="change_reason" maxLength={500} required />
    </div> : null}
    <button type="submit" disabled={pending}>{pending ? "保存中…" : "保存反馈版本"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
