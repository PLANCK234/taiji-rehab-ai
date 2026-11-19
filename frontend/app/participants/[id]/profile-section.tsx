"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DemoProfileHistory, DemoProfileRevision, intakeError, postIntake } from "../../workspace/intake";

const sexText = { female: "女", male: "男", other: "其他", unknown: "未知" };

function summary(row: DemoProfileRevision) {
  const assistance = row.needs_assistance === null ? "辅助未知" : row.needs_assistance ? "需要辅助" : "不需要辅助";
  return `年龄：${row.age ?? "未记录"} · 性别：${row.sex ? sexText[row.sex] : "未记录"} · ${assistance}`;
}

export default function ProfileSection({ participantId, history, canWrite }: {
  participantId: string;
  history: DemoProfileHistory | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const key = useRef("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const current = history?.records.at(-1);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!history || !canWrite) return;
    setPending(true); setError(""); setSaved(false);
    const form = new FormData(event.currentTarget);
    const values = {
      age: form.get("age") === "" ? null : Number(form.get("age")),
      sex: form.get("sex") || null,
      needs_assistance: form.get("needs_assistance") === "unknown" ? null : form.get("needs_assistance") === "yes",
      note: String(form.get("note") ?? "").trim() || null,
    };
    key.current ||= crypto.randomUUID();
    const creating = history.current_revision === 0;
    const result = await postIntake(
      `/participants/${participantId}/demo-profile${creating ? "" : "/revisions"}`,
      creating ? values : { ...values, expected_revision: history.current_revision,
        change_reason: String(form.get("change_reason") ?? "").trim() },
      key.current, document.cookie,
    );
    setPending(false);
    if (!result.value) { setError(intakeError(result.status)); return; }
    key.current = "";
    setSaved(true);
    router.refresh();
  }

  return <section aria-labelledby="profile-heading">
    <h2 id="profile-heading">合成展示资料</h2>
    <p className="note">仅记录演示用年龄、性别、辅助信息与备注，不填写真实身份；这些资料不参与临床判定。</p>
    {history === null ? <p role="alert">资料暂不可用，状态未知。</p> : <>
      {current ? <><p>当前版本 {history.current_revision} · {summary(current)}</p>
        {current.note ? <p>演示备注：{current.note}</p> : <p>演示备注未记录。</p>}
        <h3>修订历史</h3>
        <ul>{history.records.map((row) => <li key={row.id ?? "legacy"}>
          版本 {row.revision_no} · {summary(row)} · {row.source === "legacy_initial" ? "原有记录（创建人和时间未知）" : row.recorded_at ? new Date(row.recorded_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "时间未知"}
          {row.change_reason ? ` · 更正原因：${row.change_reason}` : ""}
        </li>)}</ul>
      </> : <p>尚未填写合成展示资料。</p>}
      {canWrite ? <form key={history.current_revision} onSubmit={submit} onChange={() => { key.current = ""; }}>
        <h3>{current ? "更正展示资料" : "填写展示资料"}</h3>
        <label htmlFor="profile-age">演示年龄（可留空）</label>
        <input id="profile-age" name="age" type="number" min="0" max="120" defaultValue={current?.age ?? ""} />
        <label htmlFor="profile-sex">演示性别</label>
        <select id="profile-sex" name="sex" defaultValue={current?.sex ?? ""}>
          <option value="">未记录</option><option value="female">女</option><option value="male">男</option><option value="other">其他</option><option value="unknown">未知</option>
        </select>
        <label htmlFor="profile-assistance">演示辅助信息</label>
        <select id="profile-assistance" name="needs_assistance" defaultValue={current?.needs_assistance === null || current?.needs_assistance === undefined ? "unknown" : current.needs_assistance ? "yes" : "no"}>
          <option value="unknown">未知</option><option value="no">不需要</option><option value="yes">需要</option>
        </select>
        <label htmlFor="profile-note">演示备注（可留空）</label>
        <input id="profile-note" name="note" maxLength={500} defaultValue={current?.note ?? ""} />
        {current ? <><label htmlFor="profile-reason">更正原因（以 SYN- 开头）</label>
          <input id="profile-reason" name="change_reason" pattern="SYN-[A-Z0-9_-]{3,60}" maxLength={64} required /></> : null}
        <button type="submit" disabled={pending}>{pending ? "保存中…" : current ? "保存更正" : "保存展示资料"}</button>
        {error ? <p role="alert">{error}</p> : null}
        {saved ? <p role="status">资料已保存。</p> : null}
      </form> : null}
    </>}
  </section>;
}
