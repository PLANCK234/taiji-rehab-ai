"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { Badge } from "../../components/ui";
import type { AssignedStudy } from "../../lib/auth";
import { gradeNames, runStatusNames, type DemoPlan } from "../../lib/demo";
import type { CodedParticipant } from "../../lib/intake";

const preferenceChanged = "taiji-hidden-participants-changed";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(preferenceChanged, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(preferenceChanged, listener);
  };
}

function readPreference(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

function hiddenIds(value: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(value);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

/** Hiding is a per-account browser preference only; nothing is deleted on the server. */
export default function ParticipantList({ accountId, participants, plans, studies }: {
  accountId: string; participants: CodedParticipant[]; plans: Record<string, DemoPlan | null>; studies: AssignedStudy[];
}) {
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [error, setError] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const viewButton = useRef<HTMLButtonElement>(null);
  const key = `taiji:workspace:hidden-participants:${accountId}`;
  const stored = useSyncExternalStore(subscribe, () => readPreference(key), () => "[]");
  const hidden = hiddenIds(stored);
  const hiddenCount = participants.filter(item => hidden.has(item.id)).length;
  const studyById = new Map(studies.map(study => [study.id, study.code]));
  const query = search.trim().toLowerCase();
  const list = participants.filter(item => hidden.has(item.id) === showHidden);
  const filtered = list.filter(item => item.study_code.toLowerCase().includes(query));

  function changeVisibility(id: string) {
    const next = hiddenIds(readPreference(key));
    if (showHidden) next.delete(id);
    else next.add(id);
    try {
      window.localStorage.setItem(key, JSON.stringify([...next]));
    } catch {
      setError("浏览器暂时无法保存显示偏好。");
      return;
    }
    setError("");
    window.dispatchEvent(new Event(preferenceChanged));
    viewButton.current?.focus();
  }

  return <>
    <div className="row" style={{ marginBottom: 12, flexWrap: "nowrap" }}>
      <label htmlFor="participant-search" className="sr-only">搜索研究编号或演示名称</label>
      <input ref={searchInput} id="participant-search" type="search" value={search}
        onChange={event => setSearch(event.target.value)} placeholder="搜索 SYN- 编号…" />
      {search ? <button type="button" className="btn-ghost btn-sm" onClick={() => { setSearch(""); searchInput.current?.focus(); }}>清除编号搜索</button> : null}
    </div>
    <div className="row between" style={{ marginBottom: 12 }}>
      <p role="status" className="note" style={{ margin: 0 }}>{query
        ? filtered.length ? `找到 ${filtered.length} 个编号对象。` : "没有匹配的编号对象。"
        : showHidden ? `已隐藏 ${hiddenCount} 个编号对象。` : `显示 ${list.length} 个已分配编号对象。`}</p>
      <button ref={viewButton} type="button" className="btn-ghost btn-sm" onClick={() => { setShowHidden(!showHidden); setError(""); }}>
        {showHidden ? "返回显示中的档案" : `查看已隐藏（${hiddenCount}）`}
      </button>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {filtered.length ? <ul className="participant-list">{filtered.map(item => {
      const plan = plans[item.id];
      const grade = plan?.grade;
      const code = grade?.functional_grade;
      const graded = code && code !== "UNASSESSED";
      return <li key={item.id}>
        <span className={`grade-seal${graded ? "" : " muted"}`} aria-hidden="true">{graded ? code : "—"}</span>
        <div className="grow">
          <Link className="code" href={`/participants/${item.id}`}>{item.study_code}</Link>
          <div className="meta">
            <span className="hint">{studyById.get(item.study_id) ?? "所属研究暂不可用"}</span>
            {grade ? <Badge tone={graded ? "jade" : "gray"}>{gradeNames[grade.functional_grade]}</Badge>
              : <Badge tone="amber">待评估</Badge>}
            {plan?.current_run && <Badge tone="blue">训练{runStatusNames[plan.current_run.status]}</Badge>}
          </div>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
          <Link className="btn btn-secondary btn-sm" href={grade ? `/participants/${item.id}/demo` : `/participants/${item.id}`}>
            {grade ? "打开方案 →" : "去评估 →"}
          </Link>
          <button type="button" className="btn-ghost btn-sm" onClick={() => changeVisibility(item.id)}>
            {showHidden ? "恢复显示" : "隐藏"}
          </button>
        </div>
      </li>;
    })}</ul> : null}
  </>;
}
