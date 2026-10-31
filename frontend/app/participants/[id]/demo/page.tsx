import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../workspace/auth";
import { getDemoProfile, getParticipant } from "../../../workspace/intake";
import { getDemoActions, getDemoPlan } from "../../../workspace/demo";
import DemoPlanClient from "./plan-client";

export const dynamic = "force-dynamic";

export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookies = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookies);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookies);
  if (!participant) notFound();
  const [plan, library, profile] = await Promise.all([getDemoPlan(id, cookies), getDemoActions(cookies), getDemoProfile(id, cookies)]);
  if (!plan) return <main><Link href={`/participants/${id}`}>← 返回对象</Link><p role="alert">演示方案暂不可用。</p></main>;
  return <main className="wide-page">
    <header className="page-header">
      <div><Link href="/workspace">← 编号对象列表</Link><div className="eyebrow">DEMO ONLY · {participant.study_code}</div><h1>太极训练演示</h1></div>
      <Link href={`/participants/${id}`}>查看对象档案</Link>
    </header>
    <p className="note">仅供研究人员操作合成演示；分级与动作组合不是临床处方或安全资格判定。</p>
    <DemoPlanClient participantId={id} studyCode={participant.study_code} profile={profile} plan={plan} library={library ?? []} canWrite={user.role === "clinician" || user.role === "research_assistant"} />
  </main>;
}
