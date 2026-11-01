"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { demoError, writeDemo, type DemoAction, type DemoPlan, type DemoRun } from "../../../workspace/demo";
import type { DemoProfile } from "../../../workspace/intake";

export default function DemoPlanClient({ participantId, studyCode, profile, plan, library, canWrite }: {
  participantId: string; studyCode: string; profile: DemoProfile | null; plan: DemoPlan; library: DemoAction[]; canWrite: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<DemoAction | null>(null);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [category, setCategory] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const categories = [...new Set(library.map((item) => item.category))];
  const filtered = library.filter((item) =>
    (!search || `${item.name} ${item.explanation}`.includes(search)) &&
    (!grade || item.demo_grade === grade) && (!category || item.category === category));
  const statusLabel = { in_progress: "进行中", paused: "已暂停", awaiting_feedback: "待反馈", completed: "已完成", stopped: "已中止" };
  const sexLabel = { female: "女", male: "男", other: "其他", unknown: "未知" };

  async function start() {
    setPending(true); setError("");
    const result = await writeDemo<DemoRun>(`/participants/${participantId}/demo-runs`, {}, document.cookie);
    setPending(false);
    if (result.value) router.push(`/participants/${participantId}/demo/run/${result.value.id}`);
    else setError(demoError(result.status));
  }
  function open(item: DemoAction) { setSelected(item); dialog.current?.showModal(); }

  return <div className="demo-layout">
    <div>
      <section className="hero-card" aria-labelledby="mode-heading">
        <div className="eyebrow">当前功能等级 · {plan.grade?.rule_version ?? "未评估"}</div>
        <p>研究编号：{studyCode} · 演示年龄：{profile?.age ?? "未记录"} · 演示性别：{profile?.sex ? sexLabel[profile.sex] : "未记录"} · 演示辅助：{profile?.needs_assistance === null || profile?.needs_assistance === undefined ? "未知" : profile.needs_assistance ? "需要" : "不需要"}</p>
        <h2 id="mode-heading">{plan.grade?.demo_training_mode ?? "未生成自主训练演示方案"}</h2>
        <p>功能等级：{plan.grade?.functional_grade ?? "UNASSESSED"} · 标记：{plan.marker}</p>
        <p>本次计划动作：{plan.actions.length} · 预计时长：未设定</p>
        {plan.grade && <p className="note">依据：人工 SPPB {plan.grade.evidence.sppb_total === null ? "未记录/无效" : `${plan.grade.evidence.sppb_total} 分`}；评估版本 {plan.grade.assessment_revision_id.slice(0, 8)}。</p>}
        {plan.current_run ? <Link className="button-link" href={`/participants/${participantId}/demo/run/${plan.current_run.id}`}>继续本次训练</Link>
          : canWrite && plan.actions.length ? <button disabled={pending} onClick={start}>{pending ? "启动中…" : "开始训练"}</button> : null}
        {!plan.grade || plan.grade.functional_grade === "UNASSESSED" ? <Link href={`/participants/${participantId}`}>先完成有效评估</Link> : null}
        {plan.grade?.functional_grade === "IV" ? <p>IV 级不自动安排自主训练动作。可在右侧人工查看 Demo 内容。</p> : null}
        <p>训练进度：{plan.current_run ? statusLabel[plan.current_run.status] : "未开始"} · 已完成动作：{plan.current_run?.completed_action_ids?.length ?? "未记录"} · 反馈：{plan.current_run?.status === "completed" ? "已记录" : "未记录"}</p>
        {error && <p role="alert">{error}</p>}
      </section>
      <section aria-labelledby="today-heading">
        <h2 id="today-heading">本次动作组合</h2>
        {plan.actions.length ? <ol className="action-list">{plan.actions.map((item) =>
          <li key={item.id}><span>{item.name}<small>{item.category} · {item.demo_grade} 级演示</small></span><button type="button" className="text-button" onClick={() => open(item)}>查看详情</button></li>)}</ol>
          : <p>当前没有自动生成的动作组合。</p>}
      </section>
    </div>
    <section aria-labelledby="library-heading">
      <div className="eyebrow">DEMO ONLY</div><h2 id="library-heading">动作库</h2>
      <div className="filter-row">
        <label>搜索动作<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="名称或讲解" /></label>
        <label>演示等级<select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">全部</option><option>I</option><option>II</option><option>III</option></select></label>
        <label>分类<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">全部</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="action-grid">{filtered.map((item) => <button type="button" className="action-card" key={item.id} onClick={() => open(item)}>
        <span className="action-icon" aria-hidden>◯</span><strong>{item.name}</strong><small>{item.category} · {item.demo_grade} 级</small><span>查看讲解 →</span>
      </button>)}</div>
      {!filtered.length && <p>没有匹配的演示动作。</p>}
    </section>
    <dialog ref={dialog} className="action-dialog" onClose={() => setSelected(null)}>
      {selected && <><div className="eyebrow">DEMO ONLY · {selected.demo_grade} 级</div><h2>{selected.name}</h2><p>{selected.explanation}</p><ol>{selected.steps.map((step, index) => <li key={index}>{step}</li>)}</ol><p className="note">示意内容未经临床审核，不用于自主训练指导。</p><button type="button" onClick={() => dialog.current?.close()}>关闭</button></>}
    </dialog>
  </div>;
}
