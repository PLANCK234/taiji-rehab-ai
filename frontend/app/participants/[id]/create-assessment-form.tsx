"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { assessmentError, writeAssessment, type AssessmentDetail } from "../../../lib/assessments";

export default function CreateAssessmentForm({ participantId, hasBaseline = false }: { participantId: string; hasBaseline?: boolean }) {
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
      "/assessments", { participant_id: participantId, visit_kind: form.get("visit_kind") }, key.current, document.cookie,
    );
    setPending(false);
    if (result.value) {
      key.current = "";
      router.push(`/assessments/${result.value.id}`);
      router.refresh();
    } else setError(assessmentError(result.status));
  }

  return <form onSubmit={submit} onChange={() => { key.current = ""; }}>
    <div className="input-group" style={{ alignItems: "end" }}>
      <div className="field" style={{ flex: 1 }}>
        <label htmlFor="visit_kind">记录类型</label>
        <select id="visit_kind" name="visit_kind" required defaultValue={hasBaseline ? "revisit" : "baseline"}>
          <option value="baseline">基线</option>
          <option value="revisit">复评</option>
        </select>
      </div>
      <button type="submit" disabled={pending}>{pending ? "创建中…" : "创建评估草稿"}</button>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
