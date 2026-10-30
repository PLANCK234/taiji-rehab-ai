"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssignedStudy } from "./auth";
import { CodedParticipant, intakeError, postIntake } from "./intake";

export default function CreateParticipantForm({ studies }: { studies: AssignedStudy[] }) {
  const router = useRouter();
  const key = useRef("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    key.current ||= crypto.randomUUID();
    const result = await postIntake<CodedParticipant>(
      "/participants",
      { study_id: form.get("study_id"), study_code: form.get("study_code") },
      key.current,
      document.cookie,
    );
    setPending(false);
    if (result.value) {
      key.current = "";
      router.push(`/participants/${result.value.id}`);
      router.refresh();
    } else {
      setError(intakeError(result.status));
    }
  }

  return (
    <form onSubmit={submit} onChange={() => { key.current = ""; }}>
      <label htmlFor="study_id">研究</label>
      <select id="study_id" name="study_id" required disabled={!studies.length}>
        {studies.map((study) => <option key={study.id} value={study.id}>{study.code}</option>)}
      </select>
      <label htmlFor="study_code">合成编号</label>
      <input id="study_code" name="study_code" required pattern="SYN-[A-Z0-9_-]{3,60}" placeholder="SYN-DEMO001" maxLength={64} />
      <p className="note">仅填写合成编号，不录入姓名、电话或真实研究对象信息。</p>
      <button type="submit" disabled={pending || !studies.length}>{pending ? "保存中…" : "创建编号对象"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
