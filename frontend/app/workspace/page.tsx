import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAssignedStudies, getCurrentUser } from "./auth";
import { getAssignedParticipants } from "./intake";
import CreateParticipantForm from "./create-participant-form";
import LogoutButton from "./logout-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const studies = await getAssignedStudies(cookieHeader);
  const participants = await getAssignedParticipants(cookieHeader);
  const canWrite = user.role === "clinician" || user.role === "research_assistant";

  return (
    <main>
      <div className="eyebrow">合成数据工作台</div>
      <h1>研究工作台</h1>
      <p>当前账号：{user.email}（{user.role}）</p>
      <section aria-labelledby="studies-heading">
        <h2 id="studies-heading">已分配研究</h2>
        {studies === null ? <p>研究分配暂不可用。</p> : studies.length ? (
          <ul>{studies.map((study) => <li key={study.id}>{study.code}</li>)}</ul>
        ) : <p>暂无研究分配。</p>}
        {canWrite && studies?.length ? <CreateParticipantForm studies={studies} /> : null}
      </section>
      <section aria-labelledby="participants-heading">
        <h2 id="participants-heading">已分配编号对象</h2>
        {participants === null ? <p>对象列表暂不可用或当前角色无权查看。</p> : participants.length ? (
          <ul>{participants.map((participant) => (
            <li key={participant.id}><Link href={`/participants/${participant.id}`}>{participant.study_code}</Link></li>
          ))}</ul>
        ) : <p>暂无已分配对象。</p>}
        <p className="note">仅限合成数据；评估、照片与导出尚未开放。</p>
      </section>
      <LogoutButton />
    </main>
  );
}
