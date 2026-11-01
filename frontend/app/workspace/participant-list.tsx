"use client";

import Link from "next/link";
import { useState } from "react";
import type { CodedParticipant } from "./intake";
import type { DemoPlan } from "./demo";

export default function ParticipantList({ participants, plans }: {
  participants: CodedParticipant[]; plans: Record<string, DemoPlan | null>;
}) {
  const [search, setSearch] = useState("");
  const filtered = participants.filter((item) => item.study_code.toLowerCase().includes(search.toLowerCase()));
  return <>
    <label htmlFor="participant-search">搜索研究编号或演示名称</label>
    <input id="participant-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="输入 SYN- 编号" />
    <ul className="participant-list">{filtered.map((item) => {
      const grade = plans[item.id]?.grade;
      return <li key={item.id}><span><strong><Link href={`/participants/${item.id}`}>{item.study_code}</Link></strong><small>{grade ? `${grade.functional_grade} 级 · ${grade.rule_version}` : "尚无 Demo 分级"}</small></span>
        <Link href={grade ? `/participants/${item.id}/demo` : `/participants/${item.id}`}>
          {grade ? "打开方案 →" : "打开评估 →"}
        </Link></li>;
    })}</ul>
    {!filtered.length && <p>没有匹配的编号对象。</p>}
  </>;
}
