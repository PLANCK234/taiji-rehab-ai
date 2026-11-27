"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { writeAssessment, type AssessmentDetail, type AssessmentRevision } from "../../lib/assessments";
import type { AssignedStudy } from "../../lib/auth";
import { localInputValue } from "../../lib/format";
import { type CodedParticipant, intakeError, postIntake } from "../../lib/intake";

const CODE_PATTERN = /^SYN-[A-Z0-9_-]{3,60}$/;

function randomCode() {
  const stamp = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `SYN-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * One form, three outcomes — no mode switch to get wrong:
 *  - code only                → coded participant
 *  - + simulated consent       → participant + consent record
 *  - + consent + SPPB total    → baseline assessment, confirmation and Demo plan in one step
 */
export default function CreateParticipantForm({ studies, canConfirm = false }: { studies: AssignedStudy[]; canConfirm?: boolean }) {
  const router = useRouter();
  const key = useRef("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [partialId, setPartialId] = useState("");

  function fail(message: string) { setPending(false); setProgress(""); setError(message); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setPartialId("");
    const form = new FormData(event.currentTarget);
    const studyCode = code.trim().toUpperCase();
    const scoreText = String(form.get("sppb_total") ?? "").trim();
    const consent = form.get("synthetic_consent") === "on";
    if (!CODE_PATTERN.test(studyCode)) return fail("编号需以 SYN- 开头，后接 3–60 位大写字母、数字、- 或 _。");
    if (scoreText && !consent) return fail("录入 SPPB 总分前，请先勾选“明确记录模拟同意”。");
    if (scoreText && !form.get("measured_on")) return fail("请填写测量日期。");

    setPending(true);
    setProgress("正在创建编号对象…");
    key.current ||= crypto.randomUUID();
    const created = await postIntake<CodedParticipant>(
      "/participants", { study_id: form.get("study_id"), study_code: studyCode }, key.current, document.cookie,
    );
    if (!created.value) return fail(intakeError(created.status));
    key.current = "";
    const id = created.value.id;
    setPartialId(id);

    const age = String(form.get("age") ?? ""), sex = String(form.get("sex") ?? "");
    const assistance = String(form.get("needs_assistance") ?? "unknown");
    const note = String(form.get("note") ?? "").trim();
    if (age || sex || assistance !== "unknown" || note) {
      setProgress("正在保存演示资料…");
      const profile = await postIntake(`/participants/${id}/demo-profile`, {
        age: age === "" ? null : Number(age), sex: sex || null,
        needs_assistance: assistance === "unknown" ? null : assistance === "yes", note: note || null,
      }, crypto.randomUUID(), document.cookie);
      if (!profile.value) return fail(`对象已创建，但演示资料未保存（${intakeError(profile.status)}）。`);
    }
    if (consent) {
      setProgress("正在记录模拟同意…");
      const saved = await postIntake(`/participants/${id}/consents`, {
        document_version: "SYN-DEMO-V2", purpose_code: "SYN-DEMO-V2", decision: "granted", photo_scope: false,
      }, crypto.randomUUID(), document.cookie);
      if (!saved.value) return fail(`对象已创建，但模拟同意未保存（${intakeError(saved.status)}）。`);
    }
    if (!scoreText) {
      router.push(`/participants/${id}`);
      router.refresh();
      return;
    }

    setProgress("正在录入基线 SPPB…");
    const assessment = await writeAssessment<AssessmentDetail>(
      "/assessments", { participant_id: id, visit_kind: "baseline" }, crypto.randomUUID(), document.cookie,
    );
    if (!assessment.value) return fail("对象与模拟同意已保存，评估草稿创建失败；可在对象页继续。");
    const measured = await writeAssessment<AssessmentRevision>(
      `/assessments/${assessment.value.id}/measurements`,
      { expected_revision: 1, validity: "valid", raw_value: Number(scoreText), missing_reason: null,
        performed_at: new Date(`${form.get("measured_on")}T12:00:00`).toISOString(), change_reason: null },
      crypto.randomUUID(), document.cookie, "PUT",
    );
    if (!measured.value) return fail("评估草稿已创建，总分写入失败；可在评估页继续。");
    if (!canConfirm) {
      router.push(`/assessments/${assessment.value.id}`);
      return;
    }
    setProgress("正在确认并生成 Demo 分级…");
    const confirmed = await writeAssessment<AssessmentRevision>(
      `/assessments/${assessment.value.id}/confirm`, { expected_revision: measured.value.revision_no },
      crypto.randomUUID(), document.cookie,
    );
    if (!confirmed.value) return fail("总分草稿已保存，确认失败；可在评估页继续。");
    router.push(`/participants/${id}/demo`);
    router.refresh();
  }

  return <form onSubmit={submit} onChange={() => { key.current = ""; }}>
    {studies.length > 1 ? <div className="field">
      <label htmlFor="study_id">研究</label>
      <select id="study_id" name="study_id" required>
        {studies.map(study => <option key={study.id} value={study.id}>{study.code}</option>)}
      </select>
    </div> : <input type="hidden" name="study_id" value={studies[0]?.id ?? ""} />}
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
        <input id="demo-score" name="sppb_total" type="number" min="0" max="12" step="1" inputMode="numeric" placeholder="例如 8" />
      </div>
      <div className="field">
        <label htmlFor="demo-date">测量日期</label>
        <input id="demo-date" name="measured_on" type="date" defaultValue={localInputValue()} />
      </div>
    </div>
    <label className="check-card"><input type="checkbox" name="synthetic_consent" />
      <span>明确记录模拟同意（仅合成数据）<br /><span className="hint">评估、训练和 AI 采集都需要当前有效的模拟同意。</span></span></label>
    <details>
      <summary>补充演示资料（可选）</summary>
      <div className="details-body form-grid">
        <div className="field">
          <label htmlFor="demo-age">演示年龄</label>
          <input id="demo-age" name="age" type="number" min="0" max="120" inputMode="numeric" />
        </div>
        <div className="field">
          <label htmlFor="demo-sex">演示性别</label>
          <select id="demo-sex" name="sex" defaultValue=""><option value="">未记录</option><option value="female">女</option><option value="male">男</option><option value="other">其他</option><option value="unknown">未知</option></select>
        </div>
        <div className="field">
          <label htmlFor="demo-assistance">是否需要辅助</label>
          <select id="demo-assistance" name="needs_assistance" defaultValue="unknown"><option value="unknown">未知</option><option value="no">不需要</option><option value="yes">需要</option></select>
        </div>
        <div className="field">
          <label htmlFor="demo-note">演示备注</label>
          <input id="demo-note" name="note" maxLength={500} />
        </div>
      </div>
    </details>
    <button type="submit" disabled={pending || !studies.length}>{pending ? progress || "保存中…" : "创建编号对象"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
    {partialId && error && <Link href={`/participants/${partialId}`}>打开已创建的编号对象继续 →</Link>}
  </form>;
}
