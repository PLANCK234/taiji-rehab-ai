"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { demoError, writeDemo, type DemoAction, type DemoRun } from "../../../../../workspace/demo";
import FeedbackForm from "../../../training/[sessionId]/feedback-form";

const statusText = {
  in_progress: "进行中", paused: "已暂停", awaiting_feedback: "待填写反馈", completed: "已完成", stopped: "已中止",
};

export default function RunClient({ run, actions, feedbackCount, canWrite }: {
  run: DemoRun; actions: DemoAction[]; feedbackCount: number; canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ordered = run.action_ids.map((id) => actions.find((item) => item.id === id)).filter((item): item is DemoAction => Boolean(item));
  const current = ordered[run.current_index];
  async function step(action: "pause" | "resume" | "next" | "previous") {
    setPending(true); setError("");
    const result = await writeDemo<DemoRun>(`/demo-runs/${run.id}/step`, { action, expected_status: run.status }, document.cookie);
    setPending(false);
    if (result.value) router.refresh(); else setError(demoError(result.status));
  }
  async function end(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const result = await writeDemo<DemoRun>(`/demo-runs/${run.id}/end`, {
      actual_minutes: Number(form.get("actual_minutes")),
      completion_status: form.get("completion_status"), notes: String(form.get("notes") ?? "").trim() || null,
      completed_action_ids: form.getAll("completed_action_ids").length ? form.getAll("completed_action_ids") : null,
    }, document.cookie);
    setPending(false);
    if (result.value) router.refresh(); else setError(demoError(result.status));
  }
  async function complete() {
    setPending(true); setError("");
    const result = await writeDemo<DemoRun>(`/demo-runs/${run.id}/complete`, {}, document.cookie);
    setPending(false);
    if (result.value) router.refresh(); else setError(demoError(result.status));
  }
  async function stop() {
    setPending(true); setError("");
    const result = await writeDemo<DemoRun>(`/demo-runs/${run.id}/stop`, {}, document.cookie);
    setPending(false);
    if (result.value) router.refresh(); else setError(demoError(result.status));
  }
  return <div className="demo-layout">
    <section className="hero-card">
      <div className="eyebrow">{statusText[run.status]} · {run.current_index + 1} / {run.action_ids.length}</div>
      <h2>{current?.name ?? "动作资料暂不可用"}</h2>
      <p>{current?.explanation}</p>
      <p className="note">开始时间：{new Date(run.started_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</p>
      {canWrite && (run.status === "in_progress" || run.status === "paused") && <div className="button-row">
        {run.status === "in_progress" ? <button type="button" disabled={pending} onClick={() => step("pause")}>暂停</button>
          : <button type="button" disabled={pending} onClick={() => step("resume")}>继续</button>}
        <button type="button" disabled={pending || run.current_index === 0 || run.status !== "in_progress"} onClick={() => step("previous")}>上一动作</button>
        <button type="button" disabled={pending || run.current_index >= run.action_ids.length - 1 || run.status !== "in_progress"} onClick={() => step("next")}>下一动作</button>
        <button type="button" className="text-button" disabled={pending} onClick={stop}>中止训练</button>
      </div>}
      {run.status === "completed" && <><p role="status">本次演示训练与反馈已保存。</p><p>实际完成动作：{run.completed_action_ids === null ? "未记录" : run.completed_action_ids.length ? run.completed_action_ids.map((id) => actions.find((item) => item.id === id)?.name ?? id).join("、") : "明确记录为 0 个"}</p><Link href={`/participants/${run.participant_id}/training/${run.training_session_id}`}>查看训练记录</Link><br /><Link href={`/participants/${run.participant_id}/demo`}>再次开始 Demo 训练</Link></>}
      {run.status === "stopped" && <><p role="status">本次演示训练已中止；时长和反馈未记录，不会推断为零或无不适。</p><Link href={`/participants/${run.participant_id}/training/${run.training_session_id}`}>查看/补录训练反馈</Link><br /><Link href={`/participants/${run.participant_id}`}>报告事件</Link><br /><Link href={`/participants/${run.participant_id}/demo`}>再次开始 Demo 训练</Link></>}
      {error && <p role="alert">{error}</p>}
    </section>
    <div>
      <section><h2>动作进度</h2><ol className="action-list">{ordered.map((item, index) => <li key={item.id} aria-current={index === run.current_index ? "step" : undefined}>{item.name} · {index < run.current_index ? "已浏览" : index === run.current_index ? "当前" : "待浏览"}</li>)}</ol></section>
      {canWrite && (run.status === "in_progress" || run.status === "paused") && <section><h2>结束本次训练</h2>
        <form onSubmit={end}><label htmlFor="run-minutes">实际训练时长（分钟）</label><input id="run-minutes" name="actual_minutes" type="number" min="0" max="1440" required />
          <fieldset><legend>实际完成的动作（留空表示未记录）</legend>{ordered.map((item) => <label key={item.id}><input type="checkbox" name="completed_action_ids" value={item.id} />{item.name}</label>)}</fieldset>
          <label htmlFor="run-completion">实际完成情况</label><select id="run-completion" name="completion_status" defaultValue="completed"><option value="completed">完成</option><option value="partial">部分完成</option><option value="interrupted">中断</option></select>
          <label htmlFor="run-notes">观察备注（可选）</label><textarea id="run-notes" name="notes" maxLength={1000} /><button disabled={pending}>结束并填写反馈</button></form>
      </section>}
      {run.status === "awaiting_feedback" && run.training_session_id && <section><h2>训练后反馈</h2><p className="note">反馈通过原有训练观察接口保存；RPE 留空表示未记录。若出现不适，可在对象档案单独报告事件。</p>
        {feedbackCount ? <p role="status">反馈已保存，等待完成确认。</p> : <FeedbackForm sessionId={run.training_session_id} expectedRevision={0} completeDemoRunId={run.id} />}
        {feedbackCount > 0 && canWrite && <button type="button" disabled={pending} onClick={complete}>确认完成</button>}
        <Link href={`/participants/${run.participant_id}`}>报告事件 / 返回对象</Link>
      </section>}
    </div>
  </div>;
}
