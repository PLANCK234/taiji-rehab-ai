"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice } from "../../../../../../components/ui";
import { demoError, runStatusNames, writeDemo, type DemoAction, type DemoRun } from "../../../../../../lib/demo";
import { formatDateTime } from "../../../../../../lib/format";
import FeedbackForm from "../../../training/[sessionId]/feedback-form";

function elapsedMinutes(startedAt: string) {
  return Math.min(1440, Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60_000)));
}

export default function RunClient({ run, actions, feedbackCount, canWrite }: {
  run: DemoRun; actions: DemoAction[]; feedbackCount: number; canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmStop, setConfirmStop] = useState(false);
  const [minutes] = useState(() => elapsedMinutes(run.started_at));
  const ordered = run.action_ids.map(id => actions.find(item => item.id === id)).filter((item): item is DemoAction => Boolean(item));
  const current = ordered[run.current_index];
  const live = run.status === "in_progress" || run.status === "paused";
  const percent = run.action_ids.length ? Math.round((run.current_index + 1) / run.action_ids.length * 100) : 0;
  const nameOf = (id: string) => actions.find(item => item.id === id)?.name ?? id;

  async function call(path: string, body: object = {}) {
    setPending(true); setError("");
    const result = await writeDemo<DemoRun>(`/demo-runs/${run.id}/${path}`, body, document.cookie);
    setPending(false);
    if (result.value) router.refresh(); else setError(demoError(result.status));
  }
  const step = (action: "pause" | "resume" | "next" | "previous") => call("step", { action, expected_status: run.status });

  function end(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const completed = form.getAll("completed_action_ids");
    void call("end", {
      actual_minutes: Number(form.get("actual_minutes")),
      completion_status: form.get("completion_status"), notes: String(form.get("notes") ?? "").trim() || null,
      completed_action_ids: completed.length ? completed : null,
    });
  }

  return <div className="demo-layout">
    <div className="stack">
      <section className="card hero run-now">
        <div className="row between">
          <span className="eyebrow" style={{ color: "#f1c27d" }}>{runStatusNames[run.status]} · {run.current_index + 1} / {run.action_ids.length}</span>
          <span className="note">开始于 {formatDateTime(run.started_at)}</span>
        </div>
        <div className="progress" style={{ marginTop: 12 }} aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
        <h2>{current?.name ?? "动作资料暂不可用"}</h2>
        <p style={{ color: "#dbe9e3" }}>{current?.explanation}</p>
        {current && live && <ol className="run-steps">{current.steps.map((text, index) => <li key={index}>{text}</li>)}</ol>}
        {canWrite && live && <div className="button-row" style={{ marginTop: 18 }}>
          <button type="button" className="btn-secondary" disabled={pending || run.current_index === 0 || run.status !== "in_progress"} onClick={() => step("previous")}>上一动作</button>
          {run.status === "in_progress"
            ? <button type="button" disabled={pending} onClick={() => step("pause")}>暂停</button>
            : <button type="button" disabled={pending} onClick={() => step("resume")}>继续</button>}
          <button type="button" className="btn-secondary" disabled={pending || run.current_index >= run.action_ids.length - 1 || run.status !== "in_progress"} onClick={() => step("next")}>下一动作</button>
          <span className="spacer" />
          {confirmStop ? <>
            <button type="button" className="btn-danger" disabled={pending} onClick={() => void call("stop")}>确认中止</button>
            <button type="button" className="btn-secondary" disabled={pending} onClick={() => setConfirmStop(false)}>取消</button>
          </> : <button type="button" className="btn-secondary" disabled={pending} onClick={() => setConfirmStop(true)}>中止训练</button>}
        </div>}
        {confirmStop && live && <p className="note" style={{ marginTop: 10 }}>中止后本次时长与反馈保持“未记录”，之后可在训练记录中补录。</p>}
        {run.status === "completed" && <div style={{ marginTop: 12 }}>
          <p role="status">本次演示训练与反馈已保存。</p>
          <p>实际完成动作：{run.completed_action_ids === null ? "未记录" : run.completed_action_ids.length ? run.completed_action_ids.map(nameOf).join("、") : "明确记录为 0 个"}</p>
          <div className="button-row">
            <Link className="btn" href={`/participants/${run.participant_id}/training/${run.training_session_id}`}>查看训练记录</Link>
            <Link className="btn btn-secondary" href={`/participants/${run.participant_id}/demo`}>再次开始 Demo 训练</Link>
          </div>
        </div>}
        {run.status === "stopped" && <div style={{ marginTop: 12 }}>
          <p role="status">本次演示训练已中止；时长和反馈保持“未记录”，不会推断为 0 或无不适。</p>
          <div className="button-row">
            <Link className="btn" href={`/participants/${run.participant_id}/training/${run.training_session_id}`}>查看/补录训练反馈</Link>
            <Link className="btn btn-secondary" href={`/participants/${run.participant_id}`}>报告事件</Link>
            <Link className="btn btn-secondary" href={`/participants/${run.participant_id}/demo`}>再次开始 Demo 训练</Link>
          </div>
        </div>}
      </section>
      {error && <Notice tone="error" role="alert">{error}</Notice>}
      <section className="card"><div className="card-head"><h2>动作进度</h2></div>
        <ol className="action-list">{ordered.map((item, index) => <li key={item.id} className={index < run.current_index ? "done" : undefined}
          aria-current={index === run.current_index ? "step" : undefined}>
          <span className="grow">{item.name}<small>{index < run.current_index ? "已浏览" : index === run.current_index ? "当前动作" : "待进行"}</small></span>
        </li>)}</ol>
      </section>
    </div>
    <div className="stack">
      {canWrite && live && <section className="card"><div className="card-head"><h2>结束本次训练</h2></div>
        <form onSubmit={end}>
          <div className="field"><label htmlFor="run-minutes">实际训练时长（分钟）</label>
            <input id="run-minutes" name="actual_minutes" type="number" min="0" max="1440" required defaultValue={minutes} inputMode="numeric" />
            <span className="hint">已按开始时间预填，请按实际情况修改。</span></div>
          <fieldset><legend>实际完成的动作（不勾选 = 未记录）</legend>
            {ordered.map(item => <label key={item.id}><input type="checkbox" name="completed_action_ids" value={item.id} /> {item.name}</label>)}
          </fieldset>
          <div className="field"><label htmlFor="run-completion">实际完成情况</label>
            <select id="run-completion" name="completion_status" defaultValue="completed"><option value="completed">完成</option><option value="partial">部分完成</option><option value="interrupted">中断</option></select></div>
          <div className="field"><label htmlFor="run-notes">观察备注（可选）</label><textarea id="run-notes" name="notes" maxLength={1000} /></div>
          <button disabled={pending}>结束并填写反馈</button>
        </form>
      </section>}
      {run.status === "awaiting_feedback" && run.training_session_id && <section className="card">
        <div className="card-head"><h2>训练后反馈</h2></div>
        <p className="note">RPE 等留空表示未记录。若出现不适，请在对象档案单独报告事件。</p>
        {feedbackCount ? <p role="status">反馈已保存，等待完成确认。</p>
          : <FeedbackForm sessionId={run.training_session_id} expectedRevision={0} completeDemoRunId={run.id} />}
        <div className="button-row" style={{ marginTop: 12 }}>
          {feedbackCount > 0 && canWrite && <button type="button" disabled={pending} onClick={() => void call("complete")}>确认完成</button>}
          <Link href={`/participants/${run.participant_id}`}>报告事件 / 返回对象</Link>
        </div>
      </section>}
    </div>
  </div>;
}
