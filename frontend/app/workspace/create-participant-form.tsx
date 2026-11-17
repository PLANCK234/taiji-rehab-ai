"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssignedStudy } from "./auth";
import { type CodedParticipant, findAssignedParticipant, intakeError, postIntake } from "./intake";
import { writeAssessment, type AssessmentDetail, type AssessmentRevision } from "./assessments";
import Link from "next/link";

type Recovery = { href: string; kind: "participant" | "assessment" };
type RequiredField = "sppb_total" | "measured_on" | "synthetic_consent";

function missingAssessmentFields(form: FormData): RequiredField[] {
  if (form.get("demo_flow") !== "on") return [];
  const fields: RequiredField[] = [];
  if (!String(form.get("sppb_total") ?? "").trim()) fields.push("sppb_total");
  if (!form.get("measured_on")) fields.push("measured_on");
  if (form.get("synthetic_consent") !== "on") fields.push("synthetic_consent");
  return fields;
}

export default function CreateParticipantForm({ studies, canConfirm = false }: { studies: AssignedStudy[]; canConfirm?: boolean }) {
  const router = useRouter();
  const key = useRef("");
  const formRef = useRef<HTMLFormElement>(null);
  const focusMissingField = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [existingId, setExistingId] = useState<string>();
  const [missing, setMissing] = useState<RequiredField[]>([]);
  const missingScore = missing.includes("sppb_total");
  const missingDate = missing.includes("measured_on");
  const missingConsent = missing.includes("synthetic_consent");

  useEffect(() => {
    if (!focusMissingField.current) return;
    focusMissingField.current = false;
    const first = missing[0];
    if (first) (formRef.current?.elements.namedItem(first) as HTMLInputElement | null)?.focus();
  }, [missing]);

  function recover(href: string, kind: Recovery["kind"], message: string) {
    setRecovery({ href, kind });
    setError(message);
    setPending(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || recovery) return;
    setError("");
    setExistingId(undefined);
    const form = new FormData(event.currentTarget);
    const studyId = String(form.get("study_id") ?? "");
    const studyCode = String(form.get("study_code") ?? "");
    const scoreText = String(form.get("sppb_total") ?? "").trim();
    const fullDemo = form.get("demo_flow") === "on";
    const missingFields = missingAssessmentFields(form);
    if (missingFields.length) {
      focusMissingField.current = true;
      setMissing(missingFields);
      return;
    }
    setPending(true);
    key.current ||= crypto.randomUUID();
    const result = await postIntake<CodedParticipant>(
      "/participants",
      { study_id: studyId, study_code: studyCode },
      key.current,
      document.cookie,
    );
    if (result.value) {
      key.current = "";
      const id = result.value.id;
      const participantPath = `/participants/${id}`;
      if (!fullDemo) {
        setPending(false);
        router.push(participantPath);
        router.refresh();
        return;
      }
      const profile = await postIntake(
        `/participants/${id}/demo-profile`,
        {
          age: form.get("age") === "" ? null : Number(form.get("age")),
          sex: form.get("sex") || null,
          needs_assistance: form.get("needs_assistance") === "unknown" ? null : form.get("needs_assistance") === "yes",
          note: String(form.get("note") ?? "").trim() || null,
        }, crypto.randomUUID(), document.cookie,
      );
      if (!profile.value) {
        recover(participantPath, "participant", "档案已创建。请打开原档案，核对展示资料后继续。");
        return;
      }
      const consent = await postIntake(
        `/participants/${id}/consents`,
        { document_version: "SYN-DEMO-V2", purpose_code: "SYN-DEMO-V2", decision: "granted", photo_scope: false },
        crypto.randomUUID(), document.cookie,
      );
      if (!consent.value) {
        recover(participantPath, "participant", "档案和展示资料已保存。请打开原档案，核对模拟同意后继续。");
        return;
      }
      const assessment = await writeAssessment<AssessmentDetail>(
        "/assessments", { participant_id: id, visit_kind: "baseline" },
        crypto.randomUUID(), document.cookie,
      );
      if (!assessment.value) {
        recover(participantPath, "participant", "档案和模拟同意已保存。请打开原档案，核对是否已有评估草稿。");
        return;
      }
      const assessmentPath = `/assessments/${assessment.value.id}`;
      const measured = await writeAssessment<AssessmentRevision>(
        `/assessments/${assessment.value.id}/measurements`,
        { expected_revision: 1, validity: "valid", raw_value: Number(scoreText),
          missing_reason: null, performed_at: new Date(`${form.get("measured_on")}T12:00:00`).toISOString(),
          change_reason: null },
        crypto.randomUUID(), document.cookie, "PUT",
      );
      if (!measured.value) {
        recover(assessmentPath, "assessment", "评估草稿已创建。请打开原评估，核对总分是否已保存。");
        return;
      }
      if (!canConfirm) { setPending(false); router.push(assessmentPath); return; }
      const confirmed = await writeAssessment<AssessmentRevision>(
        `/assessments/${assessment.value.id}/confirm`,
        { expected_revision: measured.value.revision_no }, crypto.randomUUID(), document.cookie,
      );
      if (!confirmed.value) {
        recover(assessmentPath, "assessment", "总分草稿已保存。请打开原评估，核对当前确认状态后继续。");
        return;
      }
      setPending(false);
      router.push(`/participants/${id}/demo`);
      router.refresh();
    } else {
      const existing = result.status === 409 ? await findAssignedParticipant(studyId, studyCode) : undefined;
      setExistingId(existing?.id);
      setPending(false);
      setError(existing ? "提交发生冲突。当前研究已有同编号档案，可打开核对。" : intakeError(result.status));
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} onChange={(event) => {
      key.current = "";
      if (missing.length) setMissing(missingAssessmentFields(new FormData(event.currentTarget)));
      if (existingId) {
        setExistingId(undefined);
        setError("");
      }
    }}>
      <fieldset className="quick-intake-fields" disabled={pending || recovery !== null}>
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
      <input id="demo-score" name="sppb_total" type="number" min="0" max="12" step="1"
        aria-invalid={missingScore} aria-describedby={missingScore ? "demo-score-error" : undefined} />
      {missingScore && <small className="field-error" id="demo-score-error">请填写人工 SPPB 总分。</small>}
      <label htmlFor="demo-date">测量日期</label>
      <input id="demo-date" name="measured_on" type="date"
        aria-invalid={missingDate} aria-describedby={missingDate ? "demo-date-error" : undefined} />
      {missingDate && <small className="field-error" id="demo-date-error">请选择测量日期。</small>}
      <label htmlFor="demo-assistance">演示辅助信息</label>
      <select id="demo-assistance" name="needs_assistance" defaultValue="unknown"><option value="unknown">未知</option><option value="no">不需要</option><option value="yes">需要</option></select>
      <label htmlFor="demo-note">演示备注（可选）</label>
      <input id="demo-note" name="note" maxLength={500} />
      <label><input type="checkbox" name="synthetic_consent" aria-invalid={missingConsent}
        aria-describedby={missingConsent ? "demo-consent-error" : undefined} /> 明确记录模拟同意（仅合成数据）</label>
      {missingConsent && <small className="field-error" id="demo-consent-error">请勾选模拟同意。</small>}
      <p className="note">仅填写合成编号，不录入姓名、电话或真实研究对象信息。</p>
      <button type="submit" disabled={!studies.length}>{pending ? "保存中…" : "创建编号对象"}</button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {existingId && <Link href={`/participants/${existingId}`}>打开已有档案</Link>}
      {recovery ? <div className="button-row">
        <Link href={recovery.href}>{recovery.kind === "assessment" ? "打开原评估继续" : "打开原档案继续"}</Link>
        <button type="button" className="text-button" onClick={(event) => {
          event.currentTarget.form?.reset();
          setRecovery(null);
          setError("");
          key.current = "";
        }}>开始录入另一对象</button>
      </div> : null}
    </form>
  );
}
