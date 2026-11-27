import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AppShell from "../../../../components/app-shell";
import { Crumbs, Notice, PageHeader } from "../../../../components/ui";
import { can, getCurrentUser } from "../../../../lib/auth";
import { getDemoActions, getDemoPlan } from "../../../../lib/demo";
import { getDemoProfile, getParticipant } from "../../../../lib/intake";
import DemoPlanClient from "./plan-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "太极训练演示" };

export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookies = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookies);
  if (!user) redirect("/login");
  const participant = await getParticipant(id, cookies);
  if (!participant) notFound();
  const [plan, library, profile] = await Promise.all([getDemoPlan(id, cookies), getDemoActions(cookies), getDemoProfile(id, cookies)]);
  return <AppShell user={user} wide>
    <Crumbs items={[{ href: "/workspace", label: "研究工作台" }, { href: `/participants/${id}`, label: participant.study_code }, { label: "训练方案" }]} />
    <p style={{ marginTop: -6 }}><Link href="/workspace">← 编号对象列表</Link></p>
    <PageHeader eyebrow={`Demo · ${participant.study_code}`} title="太极训练演示"
      sub="按 Demo 分级自动组合动作；所有进度、反馈都保存到数据库，可随时中断后继续。"
      actions={<Link className="btn btn-secondary" href={`/participants/${id}`}>查看对象档案</Link>} />
    {plan ? <DemoPlanClient participantId={id} studyCode={participant.study_code} profile={profile} plan={plan}
      library={library ?? []} canWrite={can.write(user.role)} />
      : <Notice tone="error" role="alert">演示方案暂不可用，请刷新或返回对象页。</Notice>}
  </AppShell>;
}
