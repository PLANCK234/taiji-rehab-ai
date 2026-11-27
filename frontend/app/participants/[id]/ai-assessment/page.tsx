import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AppShell from "../../../../components/app-shell";
import { Crumbs, FlowSteps, Notice, PageHeader } from "../../../../components/ui";
import { can, getCurrentUser } from "../../../../lib/auth";
import { getConsentHistory, getParticipant } from "../../../../lib/intake";
import { getPoseHistory } from "../../../../lib/pose";
import { getTimingPage } from "../../../../lib/sppb";
import PoseClient from "./pose-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI 视频动作评估" };

export default async function AiAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookie);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookie);
  if (!participant) notFound();
  const [history, consent, measurements] = await Promise.all([
    getPoseHistory(id, cookie), getConsentHistory(id, cookie), getTimingPage(id, cookie),
  ]);
  const granted = consent?.state === "granted";
  return <AppShell user={user}>
    <Crumbs items={[{ href: "/workspace", label: "研究工作台" }, { href: `/participants/${id}`, label: participant.study_code }, { label: "AI 动作评估" }]} />
    <p style={{ marginTop: -6 }}><Link href={`/participants/${id}`}>← 返回编号对象</Link></p>
    <PageHeader eyebrow={`AI Pose · ${participant.study_code}`} title="AI 视频动作评估"
      sub="MediaPipe 在浏览器本地识别 33 个关键点，后端计算关节角度、躯干姿态与重心移动，再由工作人员复核。" />
    <section className="card" aria-label="AI 评估流程" style={{ marginBottom: 18 }}>
      <FlowSteps label="AI 评估流程" steps={[
        { label: "选择素材", state: "todo" }, { label: "本机识别骨架", state: "todo" },
        { label: "后端计算指标", state: "todo" }, { label: "人工复核", state: "todo" },
      ]} />
    </section>
    {!granted && <div style={{ marginBottom: 18 }}><Notice tone="warn">请先返回编号对象记录有效的模拟同意，再进行采集。</Notice></div>}
    <div className="stack">
      <PoseClient participantId={id} initialHistory={history}
        initialMeasurements={measurements}
        canWrite={granted && can.write(user.role)} canReview={can.review(user.role)} />
    </div>
  </AppShell>;
}
