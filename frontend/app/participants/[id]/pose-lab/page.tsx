import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth";
import { getParticipant } from "../../../../lib/intake";
import PoseVideoLab from "./pose-video-lab";
import PoseCamera from "./pose-camera";
import LivePoseSummaryReview from "./live-pose-summary-review";

export const dynamic = "force-dynamic";

export default async function PoseLabPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.POSE_PROTOTYPE_ENABLED !== "true") notFound();
  const { id } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookieHeader);
  if (!participant) notFound();

  return <main className="wide-page">
    <Link href={`/participants/${participant.id}`}>← 返回编号对象</Link>
    <div className="eyebrow">LOCAL TECHNICAL PROTOTYPE</div>
    <h1>视频姿态与运动学实验室</h1>
    <p>编号对象：{participant.study_code}</p>
    <p role="status"><strong>仅用于姿态识别可行性验证，不生成临床评分、康复分级或训练处方。</strong></p>
    <PoseVideoLab />
    <PoseCamera />
    <LivePoseSummaryReview />
  </main>;
}
