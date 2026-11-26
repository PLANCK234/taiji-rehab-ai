import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../workspace/auth";
import { getConsentHistory, getParticipant } from "../../../workspace/intake";
import { getPoseHistory } from "../../../workspace/pose";
import PoseClient from "./pose-client";

export const dynamic = "force-dynamic";

export default async function AiAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookie);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookie);
  if (!participant) notFound();
  const [history, consent] = await Promise.all([
    getPoseHistory(id, cookie), getConsentHistory(id, cookie),
  ]);
  return <main>
    <Link href={`/participants/${id}`}>← 返回编号对象</Link>
    <div className="eyebrow">AI POSE · DEMO ONLY</div>
    <h1>AI 视频动作评估</h1><p>编号：{participant.study_code}</p>
    <p>人体关键点识别 → 关节角度与活动幅度 → 工作人员复核。模型在本机运行，原视频不上传。</p>
    {consent?.state !== "granted" && <p>请先返回编号对象，追加有效的模拟同意记录后再进行采集。</p>}
    <PoseClient participantId={id} initialHistory={history}
      canWrite={consent?.state === "granted" && (user.role === "clinician" || user.role === "research_assistant")}
      canReview={user.role === "clinician" || user.role === "clinical_approver"} />
  </main>;
}
