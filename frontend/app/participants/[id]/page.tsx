import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../workspace/auth";
import { getConsentHistory, getParticipant, getScreeningHistory } from "../../workspace/intake";
import IntakeForms from "./intake-forms";

export const dynamic = "force-dynamic";

const consentText = {
  not_recorded: "未记录",
  granted: "模拟同意已记录",
  refused: "模拟拒绝已记录",
  withdrawn: "模拟撤回已记录",
};
const answerText = { yes: "是", no: "否", unknown: "未知" };

export default async function ParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookieHeader);
  if (!participant) notFound();
  const [consents, screenings] = await Promise.all([
    getConsentHistory(id, cookieHeader),
    getScreeningHistory(id, cookieHeader),
  ]);
  const canWrite = user.role === "clinician" || user.role === "research_assistant";

  return (
    <main>
      <Link href="/workspace">← 返回工作台</Link>
      <div className="eyebrow">合成数据编号对象</div>
      <h1>{participant.study_code}</h1>
      <p>此页面仅用于开发演示，不代表真实建档或研究入组。</p>
      <section aria-labelledby="consent-heading">
        <h2 id="consent-heading">模拟同意记录</h2>
        {consents ? <>
          <p>当前记录：{consentText[consents.state]}</p>
          <p className="note">照片上传始终关闭；这里的范围选项只记录合成演示状态。</p>
          {consents.records.length ? <ul>{consents.records.map((row) => (
            <li key={row.id}>{consentText[row.decision]} · {row.document_version} · 照片范围：{row.photo_scope ? "已记录" : "未记录"}</li>
          ))}</ul> : <p>暂无记录。</p>}
        </> : <p>同意记录暂不可用。</p>}
      </section>
      <section aria-labelledby="screen-heading">
        <h2 id="screen-heading">模拟三态筛查</h2>
        {screenings ? <>
          <p role="status">{screenings.review_state === "not_assessed" ? "未评估" : "待复核"}</p>
          <p className="note">没有已批准的筛查项目或安全判定规则；任何记录都不产生“安全通过”。</p>
          {screenings.records.length ? <ul>{screenings.records.map((row) => (
            <li key={row.id}>{row.item_code}：{answerText[row.answer]}</li>
          ))}</ul> : <p>暂无筛查项。</p>}
        </> : <p>筛查记录暂不可用；状态未知。</p>}
      </section>
      {canWrite && consents && screenings ? <IntakeForms
        participantId={participant.id}
        consentCount={consents.records.length}
        consentGranted={consents.state === "granted"}
        existingItemCodes={screenings.records.map((row) => row.item_code)}
      /> : null}
    </main>
  );
}
