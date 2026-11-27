"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_ACCOUNTS = [
  { email: "demo-clinician-a@example.org", label: "临床医生 A" },
  { email: "demo-clinician-b@example.org", label: "临床医生 B" },
  { email: "demo-analyst@example.org", label: "数据分析员" },
];

export default function LoginForm({ apiHealthy }: { apiHealthy: boolean }) {
  const router = useRouter();
  const email = useRef<HTMLInputElement>(null), password = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "尝试次数过多，请 15 分钟后再试。"
          : response.status >= 500 ? "后端服务暂不可用，请确认 API 与数据库已启动。"
            : "邮箱或密码不正确。演示密码是本机 .env 中的 DEMO_PASSWORD。");
        return;
      }
      router.replace("/workspace");
      router.refresh();
    } catch {
      setError("无法连接服务，请检查网络或稍后重试。");
    } finally {
      setPending(false);
    }
  }

  function fill(address: string) {
    if (email.current) email.current.value = address;
    password.current?.focus();
  }

  return <div className="auth-card">
    <div>
      <div className="eyebrow">研究人员登录</div>
      <h2>欢迎回来</h2>
      <p className="note">当前为合成数据演示环境，请勿录入真实姓名、电话等身份信息。</p>
    </div>
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="email">邮箱</label>
        <input ref={email} id="email" name="email" type="email" autoComplete="username" required placeholder="name@example.org" />
      </div>
      <div className="field">
        <label htmlFor="password">密码</label>
        <input ref={password} id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className="btn-block" disabled={pending}>{pending ? "登录中…" : "登录"}</button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
    <div className="field">
      <span className="hint">演示账号（点击填入邮箱）</span>
      <div className="demo-accounts">
        {DEMO_ACCOUNTS.map(account => <button key={account.email} type="button" onClick={() => fill(account.email)} title={account.email}>
          {account.label}
        </button>)}
      </div>
    </div>
    <div className={`service-state${apiHealthy ? "" : " down"}`}>
      <i aria-hidden="true" />{apiHealthy ? "后端服务正常" : "后端服务未连接：请先启动 API 与数据库"}
    </div>
  </div>;
}
