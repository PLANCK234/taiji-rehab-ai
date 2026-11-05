"use client";

import { useRef, useState } from "react";
import { postIntake } from "../../workspace/intake";
import type { PatientPublication } from "../../workspace/patient-publication";

export default function PublicationControls({
  participantId, initialHistory, canPublish, consentGranted,
}: {
  participantId: string;
  initialHistory: PatientPublication[] | null;
  canPublish: boolean;
  consentGranted: boolean;
}) {
  const [history, setHistory] = useState(initialHistory);
  const [acknowledged, setAcknowledged] = useState(false);
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
      },
      key.current,
      document.cookie,
    );
    setPending(false);
    if (result.value) {
      key.current = "";
      setHistory((previous) => [...(previous ?? []), result.value!]);
      setAcknowledged(false);
    } else {
      setError(result.status === 409
        ? "版本已变化，请刷新页面后重试。"
        : "操作未完成，请检查权限、模拟同意与患者绑定。");
    }
  }

  return <section aria-labelledby="publication-heading">
    <h2 id="publication-heading">患者端合成发布流程</h2>
    <p className="note">仅发布固定的流程测试卡片，不包含训练动作、剂量或临床指导；视频素材尚未审核。</p>
    {history === null ? <p>发布历史暂不可用。</p> : <>
      <p>当前状态：{latest?.state === "published" ? "合成卡片已发布" : "没有有效发布"} · 版本 {latest?.version ?? 0}</p>
      {history.length > 0 ? <ul>{history.map((row) => (
        <li key={row.version}>版本 {row.version} · {row.state === "published" ? "发布" : "撤回"} · 合成流程测试</li>
      ))}</ul> : <p>尚无发布历史。</p>}
    </>}
    {canPublish && history !== null ? <>
      <label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> 我确认这只是合成流程测试，不是患者训练指导</label>
      <div className="button-row">
        <button type="button" disabled={pending || !acknowledged || !consentGranted} onClick={() => submit("publish")}>发布测试卡片</button>
        <button type="button" disabled={pending || !acknowledged || latest?.state !== "published"} onClick={() => submit("withdraw")}>撤回测试卡片</button>
      </div>
      {!consentGranted ? <p className="note">发布需要当前模拟同意；撤回仍可操作。</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </> : null}
  </section>;
}
