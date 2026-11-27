"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "../../components/ui";
import { gradeNames, runStatusNames, type DemoPlan } from "../../lib/demo";
import type { CodedParticipant } from "../../lib/intake";

export default function ParticipantList({ participants, plans }: {
  participants: CodedParticipant[]; plans: Record<string, DemoPlan | null>;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filtered = participants.filter(item => item.study_code.toLowerCase().includes(query));
  return <>
    <div className="field" style={{ marginBottom: 14 }}>
      <label htmlFor="participant-search" className="sr-only">搜索研究编号或演示名称</label>
      <input id="participant-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
        placeholder="搜索 SYN- 编号…" />
    </div>
    <ul className="participant-list">{filtered.map(item => {
      const plan = plans[item.id];
      const grade = plan?.grade;
      const code = grade?.functional_grade;
      const graded = code && code !== "UNASSESSED";
      return <li key={item.id}>
        <span className={`grade-seal${graded ? "" : " muted"}`} aria-hidden="true">{graded ? code : "—"}</span>
        <div className="grow">
          <Link className="code" href={`/participants/${item.id}`}>{item.study_code}</Link>
          <div className="meta">
            {grade ? <Badge tone={graded ? "jade" : "gray"}>{gradeNames[grade.functional_grade]}</Badge>
              : <Badge tone="amber">待评估</Badge>}
            {plan?.current_run && <Badge tone="blue">训练{runStatusNames[plan.current_run.status]}</Badge>}
            {grade?.demo_training_mode && <span className="hint">{grade.demo_training_mode}</span>}
          </div>
        </div>
        <Link className="btn btn-secondary btn-sm" href={grade ? `/participants/${item.id}/demo` : `/participants/${item.id}`}>
          {grade ? "打开方案 →" : "去评估 →"}
        </Link>
      </li>;
    })}</ul>
    {!filtered.length && <p className="note" style={{ marginTop: 12 }}>没有匹配“{search}”的编号对象。</p>}
  </>;
}
