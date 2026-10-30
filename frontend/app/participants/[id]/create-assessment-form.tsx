"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assessmentError, writeAssessment, type AssessmentDetail,
} from "../../workspace/assessments";

export default function CreateAssessmentForm({ participantId }: { participantId: string }) {
  const router = useRouter();
  const key = useRef("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    key.current ||= crypto.randomUUID();
    const result = await writeAssessment<AssessmentDetail>(
      "/assessments",
      { participant_id: participantId, visit_kind: form.get("visit_kind") },
      key.current,
      document.cookie,
    );
    setPending(false);
    if (result.value) {
      key.current = "";
      router.push(`/assessments/${result.value.id}`);
      router.refresh();
    } else setError(assessmentError(result.status));
  }

  return <form onSubmit={submit} onChange={() => { key.current = ""; }}>
    <label htmlFor="visit_kind">记录类型</label>
    <select id="visit_kind" name="visit_kind" required defaultValue="baseline">
      <option value="baseline">基线</option>
      <option value="revisit">复评</option>
    </select>
    <p className="note">仅创建合成数据草稿；访视时间表尚未获批准，不自动安排访视。</p>
    <button type="submit" disabled={pending}>{pending ? "创建中…" : "创建评估草稿"}</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
