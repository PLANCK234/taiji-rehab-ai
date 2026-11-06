import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../workspace/auth";
import LogoutButton from "../workspace/logout-button";
import StaffConsole from "./staff-console";

export const dynamic = "force-dynamic";

type ScopeItem = { id: string; code: string; study_id?: string };
type Staff = { id: string; email: string; role: string; is_active: boolean; study_ids: string[]; participant_ids: string[] };

async function readAdmin<T>(path: string, cookie: string): Promise<T | null> {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/api/v1/admin/${path}`, {
      headers: { cookie }, cache: "no-store",
    });
    return response.ok ? await response.json() as T : null;
  } catch { return null; }
}

export default async function AdminPage() {
  const cookie = (await headers()).get("cookie") ?? "";
  const user = await getCurrentUser(cookie);
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(user.role === "patient" ? "/patient" : "/workspace");
  const [scope, staff] = await Promise.all([
    readAdmin<{ studies: ScopeItem[]; participants: ScopeItem[] }>("scope", cookie),
    readAdmin<Staff[]>("staff", cookie),
  ]);
  return <main>
    <div className="eyebrow">合成数据管理</div>
    <h1>人员与授权</h1>
    <p>当前账号：{user.email}（管理员）</p>
    <p className="note">仅管理合成演示工作人员与 SYN 编号记录。真实人员、患者与 Research 数据入口未开放。</p>
    {scope && staff ? <StaffConsole initialStaff={staff} scope={scope} /> : <p role="alert">授权数据暂不可用，请稍后刷新。</p>}
    <LogoutButton />
  </main>;
}
