import Link from "next/link";
import type { ReactNode } from "react";
import { roleLabel, type CurrentUser } from "../lib/auth";
import LogoutButton from "./logout-button";
import TaijiMark from "./taiji-mark";

/** Signed-in frame: brand, primary navigation, user identity and a persistent Demo marker. */
export default function AppShell({ user, wide = false, children }: { user: CurrentUser; wide?: boolean; children: ReactNode }) {
  const initial = user.email.slice(0, 1).toUpperCase();
  return <>
    <div className="demo-ribbon"><b>合成数据演示环境</b> · Demo 分级与动作组合不是临床处方</div>
    <header className="shell-header">
      <div className="shell-bar" style={wide ? { maxWidth: 1380 } : undefined}>
        <Link href="/workspace" className="brand"><TaijiMark size={30} /><span>太极康复研究平台<small>TAIJI REHAB RESEARCH</small></span></Link>
        <nav className="shell-nav" aria-label="主导航"><Link href="/workspace">研究工作台</Link></nav>
        <div className="shell-user">
          <span className="user-chip" title={user.email}>
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span className="who"><span>{user.email}</span><small>{roleLabel(user.role)}</small></span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
    <main style={wide ? { maxWidth: 1380 } : undefined}>{children}</main>
  </>;
}
