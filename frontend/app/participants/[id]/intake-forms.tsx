"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsentRecord, ScreeningRecord, intakeError, postIntake } from "../../workspace/intake";

function ConsentForm({ participantId, consentCount }: { participantId: string; consentCount: number }) {
  const router = useRouter();
  const key = useRef("");
  const [decision, setDecision] = useState<"granted" | "refused" | "withdrawn">("granted");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    key.current ||= crypto.randomUUID();
    const result = await postIntake<ConsentRecord>(
      `/participants/${participantId}/consents`,
      {
        document_version: form.get("document_version"),
        purpose_code: form.get("purpose_code"),
        decision,
        photo_scope: decision === "granted" && form.get("photo_scope") === "on",
        change_reason: form.get("change_reason") || null,
      },
      key.current,
      document.cookie,
    );
    setPending(false);
    if (result.value) {
      key.current = "";
      router.refresh();
    } else setError(intakeError(result.status));
  }

  return <section aria-labelledby="record-consent-heading">
    <h2 id="record-consent-heading">添加模拟同意记录</h2>
    <form onSubmit={submit} onChange={() => { key.current = ""; }}>
      <label htmlFor="document_version">合成文书版本</label>
      <input id="document_version" name="document_version" required defaultValue="SYN-FORM-V1" pattern="SYN-[A-Z0-9_-]{3,60}" />
      <label htmlFor="purpose_code">合成用途代码</label>
      <input id="purpose_code" name="purpose_code" required defaultValue="SYN-DEMO-USE" pattern="SYN-[A-Z0-9_-]{3,60}" />
      <label htmlFor="decision">记录状态</label>
      <select id="decision" name="decision" value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}>
        <option value="granted">模拟同意</option>
        <option value="refused">模拟拒绝</option>
        <option value="withdrawn">模拟撤回</option>
      </select>
      <label><input name="photo_scope" type="checkbox" disabled={decision !== "granted"} />记录照片范围（上传仍关闭）</label>
      <label htmlFor="consent_reason">变更原因{consentCount ? "（必填）" : "（可选）"}</label>
      <input id="consent_reason" name="change_reason" required={consentCount > 0} pattern="SYN-[A-Z0-9_-]{3,60}" maxLength={64} placeholder="SYN-CORRECTION" />
      <button disabled={pending} type="submit">{pending ? "保存中…" : "追加同意记录"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
}

function ScreeningForm({ participantId, existingItemCodes }: { participantId: string; existingItemCodes: string[] }) {
  const router = useRouter();
  const key = useRef("");
  const [itemCode, setItemCode] = useState("SYN-ITEM-01");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    key.current ||= crypto.randomUUID();
    const result = await postIntake<ScreeningRecord>(
      `/participants/${participantId}/screenings`,
      { item_code: itemCode, answer: form.get("answer"), change_reason: form.get("change_reason") || null },
      key.current,
      document.cookie,
    );
    setPending(false);
    if (result.value) {
      key.current = "";
      router.refresh();
    } else setError(intakeError(result.status));
  }

  return <section aria-labelledby="record-screen-heading">
    <h2 id="record-screen-heading">添加模拟筛查项</h2>
    <form onSubmit={submit} onChange={() => { key.current = ""; }}>
      <label htmlFor="item_code">合成项目代码</label>
      <input id="item_code" name="item_code" value={itemCode} onChange={(event) => setItemCode(event.target.value)} required pattern="SYN-[A-Z0-9_-]{3,60}" />
      <label htmlFor="answer">记录答案</label>
      <select id="answer" name="answer" defaultValue="unknown">
        <option value="unknown">未知</option>
        <option value="yes">是</option>
        <option value="no">否</option>
      </select>
      <label htmlFor="screen_reason">更正原因{existingItemCodes.includes(itemCode) ? "（必填）" : "（可选）"}</label>
      <input id="screen_reason" name="change_reason" required={existingItemCodes.includes(itemCode)} pattern="SYN-[A-Z0-9_-]{3,60}" maxLength={64} placeholder="SYN-CORRECTION" />
      <button disabled={pending} type="submit">{pending ? "保存中…" : "追加筛查记录"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
}

export default function IntakeForms(props: {
  participantId: string;
  consentCount: number;
  consentGranted: boolean;
  existingItemCodes: string[];
}) {
  return <>
    <ConsentForm participantId={props.participantId} consentCount={props.consentCount} />
    {props.consentGranted ? <ScreeningForm participantId={props.participantId} existingItemCodes={props.existingItemCodes} />
      : <section><h2>模拟筛查录入</h2><p>未记录有效的模拟同意，筛查录入已关闭。</p></section>}
  </>;
}
