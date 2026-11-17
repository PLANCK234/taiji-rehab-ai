"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import type { AssignedStudy } from "./auth";
import type { CodedParticipant } from "./intake";
import type { DemoPlan } from "./demo";

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

export default function ParticipantList({ accountId, participants, plans, studies }: {
  accountId: string;
  participants: CodedParticipant[];
  plans: Record<string, DemoPlan | null>;
  studies: AssignedStudy[];
}) {
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [error, setError] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const viewButton = useRef<HTMLButtonElement>(null);
  const key = `taiji:workspace:hidden-participants:${accountId}`;
  const stored = useSyncExternalStore(subscribe, () => readPreference(key), () => "[]");
  const hidden = hiddenIds(stored);
  const hiddenCount = participants.filter((item) => hidden.has(item.id)).length;
  const studyById = new Map(studies.map((study) => [study.id, study.code]));
  const query = search.trim().toLowerCase();
  const list = participants.filter((item) => hidden.has(item.id) === showHidden);
  const filtered = list.filter((item) => item.study_code.toLowerCase().includes(query));

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
    <label htmlFor="participant-search">搜索研究编号</label>
    <input ref={searchInput} id="participant-search" type="search" value={search}
      onChange={(event) => setSearch(event.target.value)} placeholder="输入完整或部分 SYN- 编号" />
    {search ? <button type="button" className="text-button" onClick={() => {
      setSearch("");
      searchInput.current?.focus();
    }}>清除编号搜索</button> : null}
    <button ref={viewButton} type="button" className="text-button" onClick={() => {
      setShowHidden(!showHidden);
      setError("");
    }}>{showHidden ? "返回显示中的档案" : `查看已隐藏（${hiddenCount}）`}</button>
    {error && <p role="alert">{error}</p>}
    <p role="status">{query
      ? filtered.length ? `找到 ${filtered.length} 个编号对象。` : "没有匹配的编号对象。"
      : showHidden ? `已隐藏 ${hiddenCount} 个编号对象。`
        : `显示 ${list.length} 个已分配编号对象。`}</p>
    {filtered.length ? <ul className="participant-list">{filtered.map((item) => {
      const grade = plans[item.id]?.grade;
      return <li key={item.id}>
        <span>
          <strong><Link href={`/participants/${item.id}`}>{item.study_code}</Link></strong>
          <small>{studyById.get(item.study_id) ?? "所属研究暂不可用"}</small>
          <small>{grade ? `${grade.functional_grade} 级 · ${grade.rule_version}` : "尚无 Demo 分级"}</small>
        </span>
        <div className="button-row">
          <Link href={grade ? `/participants/${item.id}/demo` : `/participants/${item.id}`}>
            {grade ? "打开方案 →" : "打开评估 →"}
          </Link>
          <button type="button" className="text-button" onClick={() => changeVisibility(item.id)}>
            {showHidden ? "恢复显示" : "隐藏"}
          </button>
        </div>
      </li>;
    })}</ul> : null}
  </>;
}
