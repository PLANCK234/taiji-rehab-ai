"use client";

import { useRef, useState } from "react";
import { postIntake } from "../../workspace/intake";
import type { PatientPublication, SyntheticCardOption } from "../../workspace/patient-publication";

export default function PublicationControls({
  participantId, initialHistory, cardOptions, canPublish, consentGranted,
}: {
  participantId: string;
  initialHistory: PatientPublication[] | null;
  cardOptions: SyntheticCardOption[] | null;
  canPublish: boolean;
  consentGranted: boolean;
}) {
  const [history, setHistory] = useState(initialHistory);
  const [acknowledged, setAcknowledged] = useState(false);
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const key = useRef("");
  const latest = history?.at(-1);

  async function submit(operation: "publish" | "withdraw") {
    key.current ||= crypto.randomUUID();
    setPending(true);
    setError("");
    const result = await postIntake<PatientPublication>(
      `/participants/${participantId}/demo-patient-publications`,
      {
        operation,
        expected_version: latest?.version ?? 0,
        synthetic_only_acknowledged: true,
        card_code: operation === "publish" ? selectedCode : null,
        selection_confirmed: operation === "publish" && selectionConfirmed,
      },
      key.current,
      document.cookie,
    );
    setPending(false);
    if (result.value) {
      key.current = "";
      setHistory((previous) => [...(previous ?? []), result.value!]);
      setAcknowledged(false);
      setSelectionConfirmed(false);
    } else {
      setError(result.status === 409
        ? "版本已变化，请刷新页面后重试。"
        : result.status === 422
          ? "请选择演示卡片并确认本次选择。"
          : "操作未完成，请检查权限、模拟同意与患者绑定。");
    }
  }

  return <section aria-labelledby="publication-heading">
    <h2 id="publication-heading">患者端合成发布流程</h2>
    <p className="note">可选择一张固定的合成流程测试卡片；不包含训练动作、剂量或临床指导。视频素材尚未审核，不能播放。</p>
    {history === null ? <p>发布历史暂不可用。</p> : <>
      <p>当前状态：{latest?.state === "published" ? "合成卡片已发布" : "没有有效发布"} · 版本 {latest?.version ?? 0}</p>
      {history.length > 0 ? <ul>{history.map((row) => (
        <li key={row.version}>版本 {row.version} · {row.state === "published" ? "发布" : "撤回"} · {row.card_title} · 合成流程测试</li>
      ))}</ul> : <p>尚无发布历史。</p>}
    </>}
    {canPublish && history !== null ? <>
      <label htmlFor="synthetic-card-select">选择演示卡片</label>
      <select id="synthetic-card-select" value={selectedCode} onChange={(event) => { setSelectedCode(event.target.value); setSelectionConfirmed(false); key.current = ""; }} disabled={!cardOptions?.length}>
        <option value="">请选择</option>
        {cardOptions?.map((option) => <option key={option.code} value={option.code}>{option.title}</option>)}
      </select>
      {cardOptions === null ? <p className="note">卡片选项暂不可用，不能发布新卡片。</p> : null}
      <label><input type="checkbox" checked={selectionConfirmed} onChange={(event) => setSelectionConfirmed(event.target.checked)} disabled={!selectedCode} /> 我确认本次选择仅用于合成演示，不是临床审核</label>
      <label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> 我确认这只是合成流程测试，不是患者训练指导</label>
      <div className="button-row">
        <button type="button" disabled={pending || !acknowledged || !selectionConfirmed || !selectedCode || !consentGranted} onClick={() => submit("publish")}>发布所选测试卡片</button>
        <button type="button" disabled={pending || !acknowledged || latest?.state !== "published"} onClick={() => submit("withdraw")}>撤回测试卡片</button>
      </div>
      {!consentGranted ? <p className="note">发布需要当前模拟同意；撤回仍可操作。</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </> : null}
  </section>;
}
