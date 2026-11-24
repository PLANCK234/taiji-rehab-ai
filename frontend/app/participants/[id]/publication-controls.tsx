"use client";

import { useRef, useState } from "react";
import { postIntake } from "../../workspace/intake";
import type { PatientPublication, PublicationReadiness, SyntheticCardOption } from "../../workspace/patient-publication";

type Operation = "publish" | "withdraw";
type PublicationAttempt = {
  key: string;
  payload: {
    operation: Operation;
    expected_version: number;
    synthetic_only_acknowledged: true;
    card_code: string | null;
    action_codes?: string[];
    selection_confirmed: boolean;
  };
};

export default function PublicationControls({
  participantId, studyCode, initialHistory, cardOptions, readiness, canPublish,
}: {
  participantId: string;
  studyCode: string;
  initialHistory: PatientPublication[] | null;
  cardOptions: SyntheticCardOption[] | null;
  readiness: PublicationReadiness | null;
  canPublish: boolean;
}) {
  const [history, setHistory] = useState(initialHistory);
  const [acknowledged, setAcknowledged] = useState(false);
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<PublicationAttempt | null>(null);
  const [stale, setStale] = useState(false);
  const sending = useRef(false);
  const latest = history?.at(-1);
  const selectedCard = cardOptions?.find((option) => option.code === selectedCode);
  const controlsLocked = pending || retry !== null || stale;
  const actionChoices = cardOptions?.filter((option) => option.code.startsWith("SYN-24-")) ?? [];
  const chosenActions = actionChoices.filter((option) => selectedActions.includes(option.code));
  const canSelect = chosenActions.length > 0 || (!actionChoices.length && !!selectedCard);
  const olderHistory = history?.slice(0, -1).reverse() ?? [];
  const pageCount = Math.ceil(olderHistory.length / 10);

  function toggleAction(code: string, checked: boolean) {
    setSelectedActions((previous) => checked ? [...previous, code] : previous.filter((id) => id !== code));
    setSelectionConfirmed(false);
  }

  function submit(operation: Operation) {
    if (controlsLocked) return;
    void send({
      key: crypto.randomUUID(),
      payload: {
        operation,
        expected_version: latest?.version ?? 0,
        synthetic_only_acknowledged: true,
        card_code: operation === "publish" && !actionChoices.length ? selectedCode : null,
        ...(operation === "publish" && chosenActions.length
          ? { action_codes: chosenActions.map((item) => item.code) } : {}),
        selection_confirmed: operation === "publish" && selectionConfirmed,
      },
    });
  }

  async function send(attempt: PublicationAttempt) {
    if (sending.current) return;
    sending.current = true;
    setPending(true);
    setError("");
    const result = await postIntake<PatientPublication>(
      `/participants/${participantId}/demo-patient-publications`,
      attempt.payload,
      attempt.key,
      document.cookie,
    );
    sending.current = false;
    setPending(false);
    if (result.value) {
      setRetry(null);
      setHistory((previous) => [...(previous ?? []), result.value!]);
      setHistoryPage(0);
      setAcknowledged(false);
      setSelectionConfirmed(false);
    } else {
      const rejected = [401, 403, 409, 422].includes(result.status);
      setRetry(rejected ? null : attempt);
      setStale(result.status === 401 || result.status === 409 || (rejected && retry !== null));
      switch (result.status) {
        case 409: setError("发布版本已变化，请重新读取发布历史后再操作。"); break;
        case 422: setError("请检查卡片选择和本次操作的确认项。"); break;
        case 401: setError("会话已失效，请重新登录并查看发布历史。"); break;
        case 403: setError("发布条件或权限已变化，请重新检查发布条件。"); break;
        default: setError("暂时无法确认操作结果。请重试本次操作，或重新读取发布历史。");
      }
    }
  }

  return <section aria-labelledby="publication-heading">
    <h2 id="publication-heading" tabIndex={-1}>患者端合成发布流程</h2>
    <p className="note">可选择动作名称进行合成发布演示。卡片内容限于文字流程测试。</p>
    <p className="note">视频待提供和核对。现在发布的测试卡片只包含文字。</p>
    {history === null ? <p>发布历史暂不可用。</p> : <>
      <h3>{pending || retry || stale ? "最后确认的任务状态" : "当前任务"}</h3>
      {latest?.state === "published" ? <>
        <p>合成卡片已发布 · 版本 {latest.version} · {latest.card_title}</p>
        {!!latest.actions?.length && <ul>{latest.actions.map((action) => <li key={action.code}>{action.title}</li>)}</ul>}
        <a href={`?feedbackVersion=${latest.version}#patient-reports-heading`}>核对版本 {latest.version} 的反馈</a>
      </> : <p>当前无有效任务{latest && <> · 版本 {latest.version} · 撤回</>}</p>}
      {olderHistory.length > 0 && <details>
        <summary>发布历史（{olderHistory.length} 条）</summary>
        <ul>{olderHistory.slice(historyPage * 10, (historyPage + 1) * 10).map((row) => (
        <li key={row.version}>
          版本 {row.version} · {row.state === "published" ? "发布" : "撤回"} · {row.card_title} · 合成流程测试
          {!!row.actions?.length && <p>{row.actions.map((action) => action.title).join("、")}</p>}
          {row.state === "published" && <> · <a href={`?feedbackVersion=${row.version}#patient-reports-heading`}>
            核对版本 {row.version} 的反馈
          </a></>}
        </li>
        ))}</ul>
        {pageCount > 1 && <div className="button-row">
          <button type="button" disabled={historyPage === 0} onClick={() => setHistoryPage(historyPage - 1)}>上一页</button>
          <span>第 {historyPage + 1} / {pageCount} 页</span>
          <button type="button" disabled={historyPage + 1 >= pageCount} onClick={() => setHistoryPage(historyPage + 1)}>下一页</button>
        </div>}
      </details>}
    </>}
    {canPublish && history !== null ? <>
      <h3>发布条件</h3>
      {readiness ? <ul>
        <li>当前模拟同意：{readiness.simulated_consent_granted ? "已记录，可用于合成发布" : "未记录或已撤回"}</li>
        <li>合成患者绑定：{readiness.active_patient_binding ? "有效" : "无活跃绑定"}</li>
      </ul> : <p role="status">发布条件暂不可用，不能发布新卡片。</p>}
      {readiness && !readiness.active_patient_binding ? <p className="note">请选择已绑定合成患者的测试对象；当前页面不能建立真实患者绑定。</p> : null}
      <p><a href={`/participants/${participantId}#publication-heading`}>重新检查发布条件</a></p>
      {actionChoices.length > 0 ? <fieldset disabled={controlsLocked}>
        <legend>选择演示动作（可多选）</legend>
        <div className="taiji-action-choices">{actionChoices.map((action) => <label key={action.code}>
          <input type="checkbox" checked={selectedActions.includes(action.code)}
            onChange={(event) => toggleAction(action.code, event.target.checked)} /> {action.title}
        </label>)}</div>
      </fieldset> : <>
        <label htmlFor="synthetic-card-select">选择演示卡片</label>
        <select id="synthetic-card-select" value={selectedCode} onChange={(event) => { setSelectedCode(event.target.value); setSelectionConfirmed(false); }} disabled={controlsLocked || !cardOptions?.length}>
          <option value="">请选择</option>
          {cardOptions?.map((option) => <option key={option.code} value={option.code}>{option.title}</option>)}
        </select>
      </>}
      {canSelect && <div role="region" aria-label="患者端卡片预览">
        <h3>患者端卡片预览</h3>
        <p>接收档案：{studyCode}</p>
        {chosenActions.length ? <ul>{chosenActions.map((action) => <li key={action.code}>{action.title}</li>)}</ul>
          : <p><strong>{selectedCard?.title}</strong></p>}
        <p>{chosenActions[0]?.message ?? selectedCard?.message}</p>
      </div>}
      {cardOptions === null ? <p className="note">卡片选项暂不可用，不能发布新卡片。</p> : null}
      <label><input type="checkbox" checked={selectionConfirmed} onChange={(event) => setSelectionConfirmed(event.target.checked)} disabled={controlsLocked || !canSelect} /> 我确认本次选择仅用于合成演示，不是临床审核</label>
      <label><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={controlsLocked} /> 我确认这只是合成流程测试，不是患者训练指导</label>
      <div className="button-row">
        <button type="button" disabled={controlsLocked || !acknowledged || !selectionConfirmed || !canSelect || !readiness?.can_publish} onClick={() => submit("publish")}>发布所选测试卡片</button>
        <button type="button" disabled={controlsLocked || !acknowledged || latest?.state !== "published"} onClick={() => submit("withdraw")}>撤回测试卡片</button>
      </div>
      {readiness && !readiness.simulated_consent_granted ? <p className="note">发布需要当前模拟同意；撤回仍可操作。记录同意后请重新检查发布条件。</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {(retry || stale) && <div className="button-row">
        {retry && <button type="button" disabled={pending} onClick={() => void send(retry)}>
          {retry.payload.operation === "publish" ? "重试本次发布" : "重试本次撤回"}
        </button>}
        <button type="button" disabled={pending} onClick={() => window.location.reload()}>重新读取发布历史</button>
      </div>}
    </> : null}
  </section>;
}
