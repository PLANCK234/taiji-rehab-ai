import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "../../components/app-shell";
import { Card, Empty, Notice, PageHeader, Stat } from "../../components/ui";
import { can, getAssignedStudies, getCurrentUser, roleLabel } from "../../lib/auth";
import { getDemoPlan } from "../../lib/demo";
import { getAssignedParticipants } from "../../lib/intake";
import CreateParticipantForm from "./create-participant-form";
import ParticipantList from "./participant-list";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "研究工作台" };

export default async function WorkspacePage() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  if (user.role === "patient") redirect("/patient");
  if (user.role === "admin") redirect("/admin");
  const [studies, participants] = await Promise.all([
    getAssignedStudies(cookieHeader), getAssignedParticipants(cookieHeader),
  ]);
  const plans = Object.fromEntries(await Promise.all((participants ?? []).map(
    async item => [item.id, await getDemoPlan(item.id, cookieHeader)] as const,
  )));
  const graded = Object.values(plans).filter(plan => plan?.grade && plan.grade.functional_grade !== "UNASSESSED").length;
  const active = Object.values(plans).filter(plan => plan?.current_run).length;

  return <AppShell user={user}>
    <PageHeader eyebrow="Workspace" title="研究工作台"
      sub={<><p style={{ margin: 0 }}>当前账号：{user.email}（{roleLabel(user.role)}）</p><p className="note" style={{ margin: 0 }}>从左侧选择编号对象继续工作，或在右侧快速建档。</p></>} />
    {participants !== null && <div className="grid-3" style={{ marginBottom: 18 }}>
      <Stat label="已分配编号对象" value={participants.length} unit="人" />
      <Stat label="已生成 Demo 分级" value={graded} unit="人" />
      <Stat label="训练进行中 / 待反馈" value={active} unit="人" />
    </div>}
    <div className="grid-main">
      <Card title="已分配编号对象" id="participants-heading">
        {participants === null ? <Notice tone="warn">对象列表暂不可用，或当前角色无权查看编号对象。</Notice>
          : participants.length ? <ParticipantList key={user.id} accountId={user.id} participants={participants} plans={plans} studies={studies ?? []} />
            : <Empty title="暂无已分配对象。">{can.write(user.role) ? "在右侧填写合成编号即可创建第一位对象。" : "请联系管理员分配研究对象。"}</Empty>}
      </Card>
      <div className="stack">
        {can.write(user.role) && studies?.length ? <Card title="快速建档" id="create-heading"
          sub="填写 SPPB 总分并勾选模拟同意，一步生成 Demo 分级与训练方案。">
          <CreateParticipantForm studies={studies} canConfirm={can.confirm(user.role)} />
        </Card> : null}
        <Card title="已分配研究" id="studies-heading">
          {studies === null ? <Notice tone="warn">研究分配暂不可用。</Notice> : studies.length ? (
            <ul className="list">{studies.map(study => <li key={study.id}><span className="main"><strong>{study.code}</strong></span></li>)}</ul>
          ) : <Empty title="暂无研究分配。" />}
          <p className="note" style={{ marginTop: 12 }}>仅限合成数据。真实患者数据需另行完成伦理、同意与安全审批。</p>
        </Card>
      </div>
    </div>
  </AppShell>;
}
