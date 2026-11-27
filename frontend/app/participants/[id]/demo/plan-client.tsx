"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActionIcon from "../../../../components/action-icon";
import { Badge, Empty } from "../../../../components/ui";
import { demoError, gradeNames, runStatusNames, writeDemo, type DemoAction, type DemoPlan, type DemoRun } from "../../../../lib/demo";
import type { DemoProfile } from "../../../../lib/intake";
import DemoVideo from "./demo-video";

const sexLabel = { female: "女", male: "男", other: "其他", unknown: "未知" };

export default function DemoPlanClient({ participantId, studyCode, profile, plan, library, canWrite }: {
  participantId: string; studyCode: string; profile: DemoProfile | null; plan: DemoPlan; library: DemoAction[]; canWrite: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<DemoAction | null>(null);
  const [search, setSearch] = useState(""), [grade, setGrade] = useState(""), [category, setCategory] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const categories = [...new Set(library.map(item => item.category))];
  const query = search.trim();
  const filtered = library.filter(item =>
    (!query || `${item.name} ${item.category} ${item.explanation}`.includes(query)) &&
    (!grade || item.demo_grade === grade) && (!category || item.category === category));
  const g = plan.grade;
  const assistance = profile?.needs_assistance == null ? "未知" : profile.needs_assistance ? "需要" : "不需要";
  const run = plan.current_run;

  async function start() {
    setPending(true); setError("");
    const result = await writeDemo<DemoRun>(`/participants/${participantId}/demo-runs`, {}, document.cookie);
    setPending(false);
    if (result.value) router.push(`/participants/${participantId}/demo/run/${result.value.id}`);
    else setError(demoError(result.status));
  }
  function open(item: DemoAction) { setSelected(item); dialog.current?.showModal(); }

  return <div className="demo-layout">
    <div className="stack">
      <section className="card hero" aria-labelledby="mode-heading">
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <span className="grade-seal" aria-hidden="true">{g && g.functional_grade !== "UNASSESSED" ? g.functional_grade : "—"}</span>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ color: "#f1c27d" }}>当前功能等级 · {g?.rule_version ?? "未评估"}</div>
            <h2 id="mode-heading" style={{ margin: "4px 0", fontFamily: "var(--font-serif)", fontSize: "1.5rem" }}>{g?.demo_training_mode ?? "未生成自主训练演示方案"}</h2>
            <p style={{ margin: 0 }}>功能等级：{g?.functional_grade ?? "UNASSESSED"} · {g ? gradeNames[g.functional_grade] : "未分级"}</p>
          </div>
        </div>
        <p className="note" style={{ marginTop: 14 }}>
          {studyCode} · 年龄 {profile?.age ?? "未记录"} · 性别 {profile?.sex ? sexLabel[profile.sex] : "未记录"} · 辅助 {assistance}
          {g && <><br />依据：人工 SPPB {g.evidence.sppb_total === null ? "未记录/无效" : `${g.evidence.sppb_total} 分`} · 评估版本 {g.assessment_revision_id.slice(0, 8)}</>}
        </p>
        <div className="button-row" style={{ marginTop: 16 }}>
          {run ? <Link className="btn" href={`/participants/${participantId}/demo/run/${run.id}`}>继续本次训练（{runStatusNames[run.status]}）</Link>
            : canWrite && plan.actions.length ? <button type="button" disabled={pending} onClick={start}>{pending ? "启动中…" : "开始训练"}</button> : null}
          {(!g || g.functional_grade === "UNASSESSED") && <Link className="btn btn-secondary" href={`/participants/${participantId}`}>先完成有效评估</Link>}
        </div>
        {g?.functional_grade === "IV" && <p className="note" style={{ marginTop: 12 }}>Ⅳ 级不自动安排自主训练动作，可在右侧动作库人工查看演示内容。</p>}
        {error && <p className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      </section>
      <section className="card" aria-labelledby="today-heading">
        <div className="card-head"><h2 id="today-heading">本次动作组合</h2><Badge tone="jade">{plan.actions.length} 个动作</Badge></div>
        {plan.actions.length ? <ol className="action-list">{plan.actions.map(item =>
          <li key={item.id}><span className="grow">{item.name}<small>{item.category} · {item.explanation}</small></span>
            <button type="button" className="btn-ghost btn-sm" onClick={() => open(item)}>要领</button></li>)}</ol>
          : <Empty title="没有自动生成的动作组合">完成有效评估（Ⅰ–Ⅲ 级）后自动组合。</Empty>}
      </section>
    </div>
    <section className="card" aria-labelledby="library-heading">
      <div className="card-head"><h2 id="library-heading">太极动作库</h2><span className="note">共 {library.length} 个动作 · 演示内容</span></div>
      <div className="filter-row">
        <label>搜索动作<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="名称、分类或要领" /></label>
        <label>演示等级<select value={grade} onChange={event => setGrade(event.target.value)}><option value="">全部</option><option>I</option><option>II</option><option>III</option></select></label>
        <label>分类<select value={category} onChange={event => setCategory(event.target.value)}><option value="">全部</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="action-grid">{filtered.map(item => <button type="button" className="action-card" key={item.id} onClick={() => open(item)}>
        <span className="row between"><ActionIcon category={item.category} /><Badge plain>{gradeNames[item.demo_grade as "I"] ?? item.demo_grade}</Badge></span>
        <strong>{item.name}</strong>
        <span className="desc">{item.explanation}</span>
        <span className="more">{item.category} · 查看要领 →</span>
      </button>)}</div>
      {!filtered.length && <Empty title="没有匹配的动作">试试清除筛选条件。</Empty>}
    </section>
    <dialog ref={dialog} className="action-dialog" onClose={() => setSelected(null)}>
      {selected && <div className="dialog-body">
        <div className="row" style={{ gap: 12 }}><ActionIcon category={selected.category} />
          <div><div className="eyebrow">{selected.category} · {gradeNames[selected.demo_grade as "I"] ?? selected.demo_grade}演示</div><h2 style={{ margin: 0 }}>{selected.name}</h2></div></div>
        <DemoVideo action={selected} />
        <p>{selected.explanation}</p>
        <ol>{selected.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
        <p className="note">演示要领未经临床审核，仅供研究人员演示，不作为自主训练指导。</p>
        <div className="row" style={{ justifyContent: "flex-end" }}><button type="button" onClick={() => dialog.current?.close()}>关闭</button></div>
      </div>}
    </dialog>
  </div>;
}
