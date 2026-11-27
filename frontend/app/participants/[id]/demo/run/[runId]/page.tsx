import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import AppShell from "../../../../../../components/app-shell";
import { Crumbs, PageHeader } from "../../../../../../components/ui";
import { can, getCurrentUser } from "../../../../../../lib/auth";
import { getDemoActions, getDemoRun } from "../../../../../../lib/demo";
import { getParticipant } from "../../../../../../lib/intake";
import { getTrainingFeedback } from "../../../../../../lib/training";
import RunClient from "./run-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "本次训练" };

export default async function DemoRunPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const cookies = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookies);
  if (!user) redirect("/login");
  const run = await getDemoRun(runId, cookies);
  if (!run || run.participant_id !== id) notFound();
  const [actions, feedback, participant] = await Promise.all([
    getDemoActions(cookies),
    run.training_session_id ? getTrainingFeedback(run.training_session_id, cookies) : Promise.resolve([]),
    getParticipant(id, cookies),
  ]);
  return <AppShell user={user} wide>
    <Crumbs items={[{ href: "/workspace", label: "研究工作台" }, { href: `/participants/${id}`, label: participant?.study_code ?? "编号对象" },
      { href: `/participants/${id}/demo`, label: "训练方案" }, { label: "本次训练" }]} />
    <p style={{ marginTop: -6 }}><Link href={`/participants/${id}/demo`}>← 返回演示方案</Link></p>
    <PageHeader eyebrow="Demo · 训练进行记录" title="本次训练" sub="每一步操作都会立即保存；刷新或换设备后可以继续。" />
    <RunClient run={run} actions={actions ?? []} feedbackCount={feedback?.length ?? 0} canWrite={can.write(user.role)} />
  </AppShell>;
}
