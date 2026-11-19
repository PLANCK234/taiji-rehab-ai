"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function selectDemoAccount(email: string) {
    if (emailInput.current) emailInput.current.value = email;
    if (passwordInput.current) passwordInput.current.value = "";
    setShowPassword(false);
    setError("");
    passwordInput.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (!response.ok) {
        setError(response.status === 429 ? "尝试次数过多，请稍后重试。" : "登录失败，请检查凭据。");
        return;
      }
      const user = await response.json() as { role: string };
      router.replace(user.role === "patient" ? "/patient" : user.role === "admin" ? "/admin" : "/workspace");
    } catch {
      setError("服务暂不可用，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="form-page">
      <div className="eyebrow">TAIJI · RESEARCH DEMO</div>
      <h1>太极康复研究平台</h1>
      <p>工作人员与患者登录 · 仅限合成数据演示</p>
      <section aria-labelledby="demo-account-heading">
        <h2 id="demo-account-heading">选择演示账号</h2>
        <p className="note">选择后只会填入邮箱。密码是本机项目配置中的演示密码，不是电脑开机密码。</p>
        <div className="button-row">
          <button type="button" onClick={() => selectDemoAccount("demo-clinician-a@example.org")}>工作人员演示账号</button>
          <button type="button" onClick={() => selectDemoAccount("demo-patient@example.org")}>患者演示账号</button>
        </div>
      </section>
      <form onSubmit={submit}>
        <label htmlFor="email">邮箱</label>
        <input ref={emailInput} id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">密码</label>
        <input ref={passwordInput} id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
        <button
          type="button"
          className="text-button"
          aria-controls="password"
          aria-pressed={showPassword}
          onClick={() => setShowPassword((current) => !current)}
        >{showPassword ? "隐藏密码" : "显示密码"}</button>
        <button type="submit" disabled={pending}>{pending ? "登录中…" : "登录"}</button>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </main>
  );
}
