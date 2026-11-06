"use client";

import { FormEvent, useState } from "react";
import { postIntake } from "../workspace/intake";

type ScopeItem = { id: string; code: string; study_id?: string };
type Staff = { id: string; email: string; role: string; is_active: boolean; study_ids: string[]; participant_ids: string[] };
const roles = ["clinician", "clinical_approver", "research_assistant", "analyst"];

export default function StaffConsole({ initialStaff, scope }: {
  initialStaff: Staff[];
  scope: { studies: ScopeItem[]; participants: ScopeItem[] };
}) {
  const [staff, setStaff] = useState(initialStaff);
  const [selected, setSelected] = useState(initialStaff[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const current = staff.find((item) => item.id === selected);

  function update(row: Staff) {
    setStaff((items) => [...items.filter((item) => item.id !== row.id), row].sort((a, b) => a.email.localeCompare(b.email)));
    setSelected(row.id);
  }

  async function submit(path: string, body: object): Promise<Staff | null> {
    setBusy(true);
    setMessage("");
    const result = await postIntake<Staff>(path, body, crypto.randomUUID(), document.cookie);
    setBusy(false);
    if (!result.value) {
      setMessage(result.status === 409 ? "记录已变化，请刷新页面后重试。" : `操作失败（${result.status}），请核对权限与输入。`);
      return null;
    }
    update(result.value);
    setMessage("已保存，授权立即生效。");
    return result.value;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const row = await submit("/admin/staff", {
      email: String(data.get("email") ?? "").trim(),
      role: data.get("role"), password: data.get("password"),
    });
    if (row) form.reset();
  }

  async function changeStaff(operation: "activate" | "deactivate" | "role", role?: string) {
    if (!current) return;
    await submit(`/admin/staff/${current.id}`, {
      operation, expected_role: current.role, expected_active: current.is_active,
      ...(role ? { role } : {}),
    });
  }

  async function assignment(scopeType: "study" | "participant", item: ScopeItem, assigned: boolean) {
    if (!current) return;
    await submit(`/admin/staff/${current.id}/assignments`, {
      scope: scopeType, scope_id: item.id, operation: assigned ? "revoke" : "grant",
      expected_assigned: assigned,
    });
  }

  return <>
    <section>
      <h2>建立合成工作人员</h2>
      <form onSubmit={create}>
        <label htmlFor="staff-email">演示邮箱（demo-…@example.org）</label>
        <input id="staff-email" name="email" type="email" pattern="demo-[a-z0-9._+\-]+@example\.org" required />
        <label htmlFor="staff-role">角色</label>
        <select id="staff-role" name="role">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select>
        <label htmlFor="staff-password">初始密码（至少 12 位）</label>
        <input id="staff-password" name="password" type="password" minLength={12} autoComplete="new-password" required />
        <button type="submit" disabled={busy}>建立账号</button>
      </form>
    </section>
    <section>
      <h2>调整人员授权</h2>
      <label htmlFor="staff-select">工作人员</label>
      <select id="staff-select" value={selected} onChange={(event) => setSelected(event.target.value)}>
        {staff.map((row) => <option key={row.id} value={row.id}>{row.email}</option>)}
      </select>
      {current ? <>
        <p>状态：{current.is_active ? "启用" : "停用"}；角色：{current.role}</p>
        <label htmlFor="role-select">变更角色</label>
        <select id="role-select" value={current.role} disabled={busy} onChange={(event) => void changeStaff("role", event.target.value)}>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <button type="button" disabled={busy} onClick={() => void changeStaff(current.is_active ? "deactivate" : "activate")}>
          {current.is_active ? "停用账号" : "启用账号"}
        </button>
        <h3>研究权限</h3>
        <ul>{scope.studies.map((item) => {
          const assigned = current.study_ids.includes(item.id);
          return <li key={item.id}>{item.code} <button type="button" disabled={busy || (!current.is_active && !assigned)} onClick={() => void assignment("study", item, assigned)}>{assigned ? "撤销" : "授权"}</button></li>;
        })}</ul>
        <h3>编号对象权限</h3>
        <ul>{scope.participants.map((item) => {
          const assigned = current.participant_ids.includes(item.id);
          return <li key={item.id}>{item.code} <button type="button" disabled={busy || (!assigned && (!current.is_active || !current.study_ids.includes(item.study_id ?? "")))} onClick={() => void assignment("participant", item, assigned)}>{assigned ? "撤销" : "授权"}</button></li>;
        })}</ul>
      </> : <p>暂无可管理的工作人员。</p>}
      {message ? <p role="status">{message}</p> : null}
    </section>
  </>;
}
