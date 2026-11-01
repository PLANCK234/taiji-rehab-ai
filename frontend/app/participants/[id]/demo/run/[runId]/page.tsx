import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../../../workspace/auth";
import { getDemoActions, getDemoRun } from "../../../../../workspace/demo";
import { getTrainingFeedback } from "../../../../../workspace/training";
import RunClient from "./run-client";

export const dynamic = "force-dynamic";

export default async function DemoRunPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  const cookies = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookies);
  if (!user) redirect("/login");
  const run = await getDemoRun(runId, cookies);
  if (!run || run.participant_id !== id) notFound();
  const [actions, feedback] = await Promise.all([
    getDemoActions(cookies),
    run.training_session_id ? getTrainingFeedback(run.training_session_id, cookies) : Promise.resolve([]),
  ]);
  return <main className="wide-page">
    <Link href={`/participants/${id}/demo`}>← 返回演示方案</Link>
    <div className="eyebrow">DEMO ONLY · 持久化训练流程</div>
    <h1>本次训练</h1>
    <RunClient run={run} actions={actions ?? []} feedbackCount={feedback?.length ?? 0} canWrite={user.role === "clinician" || user.role === "research_assistant"} />
  </main>;
}
