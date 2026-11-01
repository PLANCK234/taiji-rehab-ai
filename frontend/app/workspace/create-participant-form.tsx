"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssignedStudy } from "./auth";
import { CodedParticipant, intakeError, postIntake } from "./intake";
import { writeAssessment, type AssessmentDetail, type AssessmentRevision } from "./assessments";
import Link from "next/link";

export default function CreateParticipantForm({ studies, canConfirm = false }: { studies: AssignedStudy[]; canConfirm?: boolean }) {
  const router = useRouter();
  const key = useRef("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [partialId, setPartialId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const scoreText = String(form.get("sppb_total") ?? "").trim();
    const fullDemo = form.get("demo_flow") === "on";
    if (fullDemo && (form.get("synthetic_consent") !== "on" || scoreText === "" || !form.get("measured_on"))) {
      setError("完整演示流程需要明确勾选模拟同意、填写 SPPB 总分和测量日期。");
      setPending(false);
      return;
    }
    key.current ||= crypto.randomUUID();
    const result = await postIntake<CodedParticipant>(
      "/participants",
      { study_id: form.get("study_id"), study_code: form.get("study_code") },
      key.current,
      document.cookie,
    );
    if (result.value) {
      key.current = "";
      const id = result.value.id;
      if (!fullDemo) {
        setPending(false);
        router.push(`/participants/${id}`);
        router.refresh();
        return;
      }
      setPartialId(id);
      const profile = await postIntake(
        `/participants/${id}/demo-profile`,
        {
          age: form.get("age") === "" ? null : Number(form.get("age")),
          sex: form.get("sex") || null,
          needs_assistance: form.get("needs_assistance") === "unknown" ? null : form.get("needs_assistance") === "yes",
          note: String(form.get("note") ?? "").trim() || null,
        }, crypto.randomUUID(), document.cookie,
      );
      if (!profile.value) { setPending(false); setError(`档案已创建，展示资料未保存（${intakeError(profile.status)}）。`); return; }
      const consent = await postIntake(
        `/participants/${id}/consents`,
        { document_version: "SYN-DEMO-V2", purpose_code: "SYN-DEMO-V2", decision: "granted", photo_scope: false },
        crypto.randomUUID(), document.cookie,
      );
      if (!consent.value) { setPending(false); setError(`档案已创建，模拟同意未保存（${intakeError(consent.status)}）。`); return; }
      const assessment = await writeAssessment<AssessmentDetail>(
        "/assessments", { participant_id: id, visit_kind: "baseline" },
        crypto.randomUUID(), document.cookie,
      );
      if (!assessment.value) { setPending(false); setError("档案和模拟同意已保存，评估草稿创建失败；请从对象页继续。"); return; }
      const measured = await writeAssessment<AssessmentRevision>(
        `/assessments/${assessment.value.id}/measurements`,
        { expected_revision: 1, validity: "valid", raw_value: Number(scoreText),
          missing_reason: null, performed_at: new Date(`${form.get("measured_on")}T12:00:00`).toISOString(),
          change_reason: null },
        crypto.randomUUID(), document.cookie, "PUT",
      );
      if (!measured.value) {
        setPending(false); setError("档案与评估草稿已保存，总分写入失败；请从对象页继续。"); return;
      }
      if (!canConfirm) { setPending(false); router.push(`/assessments/${assessment.value.id}`); return; }
      const confirmed = await writeAssessment<AssessmentRevision>(
        `/assessments/${assessment.value.id}/confirm`,
        { expected_revision: measured.value.revision_no }, crypto.randomUUID(), document.cookie,
      );
      if (!confirmed.value) { setPending(false); setError("总分草稿已保存，确认失败；请在评估页继续。"); return; }
      setPending(false);
      router.push(`/participants/${id}/demo`);
      router.refresh();
    } else {
      setPending(false);
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
      <label><input type="checkbox" name="demo_flow" /> 创建后直接完成 Demo 基础评估</label>
      <label htmlFor="demo-age">演示年龄（可选）</label>
      <input id="demo-age" name="age" type="number" min="0" max="120" />
      <label htmlFor="demo-sex">演示性别（可选）</label>
      <select id="demo-sex" name="sex" defaultValue=""><option value="">未记录</option><option value="female">女</option><option value="male">男</option><option value="other">其他</option><option value="unknown">未知</option></select>
      <label htmlFor="demo-score">人工 SPPB 总分（0–12；留空为未评估）</label>
      <input id="demo-score" name="sppb_total" type="number" min="0" max="12" step="1" />
      <label htmlFor="demo-date">测量日期</label>
      <input id="demo-date" name="measured_on" type="date" />
      <label htmlFor="demo-assistance">演示辅助信息</label>
      <select id="demo-assistance" name="needs_assistance" defaultValue="unknown"><option value="unknown">未知</option><option value="no">不需要</option><option value="yes">需要</option></select>
      <label htmlFor="demo-note">演示备注（可选）</label>
      <input id="demo-note" name="note" maxLength={500} />
      <label><input type="checkbox" name="synthetic_consent" /> 明确记录模拟同意（仅合成数据）</label>
      <p className="note">仅填写合成编号，不录入姓名、电话或真实研究对象信息。</p>
      <button type="submit" disabled={pending || !studies.length}>{pending ? "保存中…" : "创建编号对象"}</button>
      {error && <p role="alert">{error}</p>}
      {partialId && error && <Link href={`/participants/${partialId}`}>打开已创建的编号对象继续</Link>}
    </form>
  );
}
