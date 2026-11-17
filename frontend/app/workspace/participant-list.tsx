"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { CodedParticipant } from "./intake";
import type { DemoPlan } from "./demo";

export default function ParticipantList({ participants, plans }: {
  participants: CodedParticipant[]; plans: Record<string, DemoPlan | null>;
}) {
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const query = search.trim().toLowerCase();
  const filtered = participants.filter((item) => item.study_code.toLowerCase().includes(query));
  return <>
    <label htmlFor="participant-search">搜索研究编号</label>
    <input ref={searchInput} id="participant-search" type="search" value={search}
      onChange={(event) => setSearch(event.target.value)} placeholder="输入完整或部分 SYN- 编号" />
    {search ? <button type="button" className="text-button" onClick={() => {
      setSearch("");
      searchInput.current?.focus();
    }}>清除编号搜索</button> : null}
    <p role="status">{query
      ? filtered.length ? `找到 ${filtered.length} 个编号对象。` : "没有匹配的编号对象。"
      : `共 ${participants.length} 个已分配编号对象。`}</p>
    {filtered.length ? <ul className="participant-list">{filtered.map((item) => {
      const grade = plans[item.id]?.grade;
      return <li key={item.id}><span><strong><Link href={`/participants/${item.id}`}>{item.study_code}</Link></strong><small>{grade ? `${grade.functional_grade} 级 · ${grade.rule_version}` : "尚无 Demo 分级"}</small></span>
        <Link href={grade ? `/participants/${item.id}/demo` : `/participants/${item.id}`}>
          {grade ? "打开方案 →" : "打开评估 →"}
        </Link></li>;
    })}</ul> : null}
  </>;
}
