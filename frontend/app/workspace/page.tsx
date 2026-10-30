import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAssignedStudies, getCurrentUser } from "./auth";
import LogoutButton from "./logout-button";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookieHeader);
  if (!user) redirect("/login");
  const studies = await getAssignedStudies(cookieHeader);

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
        <p className="note">建档、评估与导出尚未开放。</p>
      </section>
      <LogoutButton />
    </main>
  );
}
