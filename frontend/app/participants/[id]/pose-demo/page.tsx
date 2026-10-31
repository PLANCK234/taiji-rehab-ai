import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../workspace/auth";
import { getConsentHistory, getParticipant } from "../../../workspace/intake";
import SyntheticPosePreview from "./synthetic-pose-preview";

export const dynamic = "force-dynamic";

export default async function PoseDemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookieHeader);
  if (!participant) notFound();
  const consent = await getConsentHistory(id, cookieHeader);
  const photoScopeText = consent === null ? "状态暂不可用"
    : consent.state === "granted" && consent.records[0]?.photo_scope
      ? "已记录（仍不授权真实采集）" : "未记录或已撤回";

  return <main>
    <Link href={`/participants/${participant.id}`}>← 返回编号对象</Link>
    <div className="eyebrow">合成数据演示</div>
    <h1>姿态拍照演示壳</h1>
    <p>编号对象：{participant.study_code}</p>
    <p role="status"><strong>姿态识别算法尚未接入</strong></p>
    <p>本页只生成合成示意画面，不调用摄像头、不选择照片文件、不上传或保存图像，也不产生动作评分。</p>
    <p className="note">当前模拟照片范围：{photoScopeText}。真实影像采集仍待伦理、同意和留存规则批准。</p>
    <SyntheticPosePreview />
  </main>;
}
