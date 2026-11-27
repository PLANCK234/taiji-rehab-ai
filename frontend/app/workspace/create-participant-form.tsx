"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { writeAssessment, type AssessmentDetail, type AssessmentRevision } from "../../lib/assessments";
import type { AssignedStudy } from "../../lib/auth";
import { type CodedParticipant, findAssignedParticipant, intakeError, postIntake } from "../../lib/intake";

const CODE_PATTERN = /^SYN-[A-Z0-9_-]{3,60}$/;
type Recovery = { href: string; kind: "participant" | "assessment" };
type RequiredField = "sppb_total" | "measured_on" | "synthetic_consent";
const FIELD_ERROR: Record<RequiredField, string> = {
  sppb_total: "请填写人工 SPPB 总分。", measured_on: "请选择测量日期。", synthetic_consent: "请勾选模拟同意。",
};

function randomCode() {
  const stamp = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `SYN-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function beijingToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
}

/** A score starts the one-step Demo flow, which then also needs a date and explicit consent. */
function missingFields(form: FormData): RequiredField[] {
  if (!String(form.get("sppb_total") ?? "").trim()) return [];
  const fields: RequiredField[] = [];
  if (!form.get("measured_on")) fields.push("measured_on");
  if (form.get("synthetic_consent") !== "on") fields.push("synthetic_consent");
  return fields;
}

/**
 * One form, three outcomes — no mode switch to get wrong:
 *  - code only                    → coded participant
 *  - + simulated consent           → participant + consent record
 *  - + SPPB total (needs consent)  → profile, consent, baseline, confirmation and Demo plan in one step
 * A partial failure keeps what was saved and links to it instead of creating duplicates.
 */
export default function CreateParticipantForm({ studies, canConfirm = false }: { studies: AssignedStudy[]; canConfirm?: boolean }) {
  const router = useRouter();
  const key = useRef("");
  const formRef = useRef<HTMLFormElement>(null);
  const focusMissing = useRef(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<RequiredField[]>([]);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [existingId, setExistingId] = useState("");
  const [today] = useState(beijingToday);

  useEffect(() => {
    if (!focusMissing.current) return;
    focusMissing.current = false;
    if (missing[0]) (formRef.current?.elements.namedItem(missing[0]) as HTMLInputElement | null)?.focus();
  }, [missing]);

  function fail(message: string) { setPending(false); setProgress(""); setError(message); }
  function recover(href: string, kind: Recovery["kind"], message: string) {
    setRecovery({ href, kind }); fail(message);
  }
  const invalid = (field: RequiredField) => missing.includes(field);
  const describedBy = (field: RequiredField, id: string) => invalid(field) ? id : undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || recovery) return;
    setError(""); setExistingId("");
    const form = new FormData(event.currentTarget);
    const studyId = String(form.get("study_id") ?? "");
    const studyCode = code.trim().toUpperCase();
    const scoreText = String(form.get("sppb_total") ?? "").trim();
    const consent = form.get("synthetic_consent") === "on";
    if (!CODE_PATTERN.test(studyCode)) return fail("编号需以 SYN- 开头，后接 3–60 位大写字母、数字、- 或 _。");
    const fields = missingFields(form);
    if (fields.length) { focusMissing.current = true; setMissing(fields); return; }

    setPending(true);
    setProgress("正在创建编号对象…");
    key.current ||= crypto.randomUUID();
    const created = await postIntake<CodedParticipant>("/participants", { study_id: studyId, study_code: studyCode }, key.current, document.cookie);
    if (!created.value) {
      const existing = created.status === 409 ? await findAssignedParticipant(studyId, studyCode) : undefined;
      if (existing) setExistingId(existing.id);
      return fail(existing ? "提交发生冲突。当前研究已有同编号档案，可打开核对。" : intakeError(created.status));
    }
    key.current = "";
    const id = created.value.id;
    const participantPath = `/participants/${id}`;

    const age = String(form.get("age") ?? ""), sex = String(form.get("sex") ?? "");
    const assistance = String(form.get("needs_assistance") ?? "unknown");
    const note = String(form.get("note") ?? "").trim();
    if (scoreText || age || sex || assistance !== "unknown" || note) {
      setProgress("正在保存演示资料…");
      const profile = await postIntake(`${participantPath}/demo-profile`, {
        age: age === "" ? null : Number(age), sex: sex || null,
        needs_assistance: assistance === "unknown" ? null : assistance === "yes", note: note || null,
      }, crypto.randomUUID(), document.cookie);
      if (!profile.value) return recover(participantPath, "participant", "档案已创建。请打开原档案，核对展示资料后继续。");
    }
    if (consent) {
      setProgress("正在记录模拟同意…");
      const saved = await postIntake(`${participantPath}/consents`, {
        document_version: "SYN-DEMO-V2", purpose_code: "SYN-DEMO-V2", decision: "granted", photo_scope: false,
      }, crypto.randomUUID(), document.cookie);
      if (!saved.value) return recover(participantPath, "participant", "档案已保存。请打开原档案，核对模拟同意后继续。");
    }
    if (!scoreText) {
      router.push(participantPath);
      router.refresh();
      return;
    }

    setProgress("正在录入基线 SPPB…");
    const assessment = await writeAssessment<AssessmentDetail>(
      "/assessments", { participant_id: id, visit_kind: "baseline" }, crypto.randomUUID(), document.cookie,
    );
    if (!assessment.value) return recover(participantPath, "participant", "档案和模拟同意已保存。请打开原档案，核对是否已有评估草稿。");
    const assessmentPath = `/assessments/${assessment.value.id}`;
    const measured = await writeAssessment<AssessmentRevision>(`${assessmentPath}/measurements`, {
      expected_revision: 1, validity: "valid", raw_value: Number(scoreText), missing_reason: null,
      // The date is a Beijing calendar day regardless of the browser's time zone.
      performed_at: new Date(`${form.get("measured_on")}T12:00:00+08:00`).toISOString(), change_reason: null,
    }, crypto.randomUUID(), document.cookie, "PUT");
    if (!measured.value) return recover(assessmentPath, "assessment", "评估草稿已创建。请打开原评估，核对总分是否已保存。");
    if (!canConfirm) { router.push(assessmentPath); return; }
    setProgress("正在确认并生成 Demo 分级…");
    const confirmed = await writeAssessment<AssessmentRevision>(`${assessmentPath}/confirm`,
      { expected_revision: measured.value.revision_no }, crypto.randomUUID(), document.cookie);
    if (!confirmed.value) return recover(assessmentPath, "assessment", "总分草稿已保存。请打开原评估，核对当前确认状态后继续。");
    router.push(`${participantPath}/demo`);
    router.refresh();
  }

  function reset() {
    formRef.current?.reset();
    setCode(""); setRecovery(null); setError(""); setMissing([]); key.current = "";
  }

  return <form ref={formRef} onSubmit={submit} onChange={event => {
    key.current = "";
    if (missing.length) setMissing(missingFields(new FormData(event.currentTarget)));
    if (existingId) { setExistingId(""); setError(""); }
  }}>
    <fieldset className="quick-intake-fields" disabled={pending || recovery !== null}>
      <div className="field">
        <label htmlFor="study_id">研究</label>
        <select id="study_id" name="study_id" required>
          {studies.map(study => <option key={study.id} value={study.id}>{study.code}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="study_code">合成编号</label>
        <div className="input-group">
          <input id="study_code" name="study_code" required maxLength={64} placeholder="SYN-DEMO001" autoComplete="off"
            value={code} onChange={event => setCode(event.target.value.toUpperCase())} />
          <button type="button" className="btn-secondary" onClick={() => { setCode(randomCode()); key.current = ""; }}>随机生成</button>
        </div>
        <span className="hint">以 SYN- 开头；不要填写姓名、电话等真实身份信息。</span>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="demo-score">人工 SPPB 总分（0–12；留空为未评估）</label>
          <input id="demo-score" name="sppb_total" type="number" min="0" max="12" step="1" inputMode="numeric" placeholder="例如 8"
            aria-invalid={invalid("sppb_total")} aria-describedby={describedBy("sppb_total", "demo-score-error")} />
          {invalid("sppb_total") && <small className="field-error" id="demo-score-error">{FIELD_ERROR.sppb_total}</small>}
        </div>
        <div className="field">
          <label htmlFor="demo-date">测量日期（北京时间）</label>
          <input id="demo-date" name="measured_on" type="date" defaultValue={today}
            aria-invalid={invalid("measured_on")} aria-describedby={describedBy("measured_on", "demo-date-error")} />
          {invalid("measured_on") && <small className="field-error" id="demo-date-error">{FIELD_ERROR.measured_on}</small>}
        </div>
      </div>
      <label className="check-card"><input type="checkbox" name="synthetic_consent"
        aria-invalid={invalid("synthetic_consent")} aria-describedby={describedBy("synthetic_consent", "demo-consent-error")} />
        <span>明确记录模拟同意（仅合成数据）<br /><span className="hint">评估、训练和 AI 采集都需要当前有效的模拟同意。</span></span></label>
      {invalid("synthetic_consent") && <small className="field-error" id="demo-consent-error">{FIELD_ERROR.synthetic_consent}</small>}
      <details>
        <summary>补充演示资料（可选）</summary>
        <div className="details-body form-grid">
          <div className="field"><label htmlFor="demo-age">演示年龄</label><input id="demo-age" name="age" type="number" min="0" max="120" inputMode="numeric" /></div>
          <div className="field"><label htmlFor="demo-sex">演示性别</label>
            <select id="demo-sex" name="sex" defaultValue=""><option value="">未记录</option><option value="female">女</option><option value="male">男</option><option value="other">其他</option><option value="unknown">未知</option></select></div>
          <div className="field"><label htmlFor="demo-assistance">是否需要辅助</label>
            <select id="demo-assistance" name="needs_assistance" defaultValue="unknown"><option value="unknown">未知</option><option value="no">不需要</option><option value="yes">需要</option></select></div>
          <div className="field"><label htmlFor="demo-note">演示备注</label><input id="demo-note" name="note" maxLength={500} /></div>
        </div>
      </details>
      <button type="submit" disabled={!studies.length}>{pending ? progress || "保存中…" : "创建编号对象"}</button>
    </fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    {existingId && <Link href={`/participants/${existingId}`}>打开已有档案 →</Link>}
    {recovery && <div className="button-row">
      <Link className="btn btn-sm" href={recovery.href}>{recovery.kind === "assessment" ? "打开原评估继续" : "打开原档案继续"}</Link>
      <button type="button" className="btn-secondary btn-sm" onClick={reset}>开始录入另一对象</button>
    </div>}
  </form>;
}
