"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
      router.replace("/workspace");
    } catch {
      setError("服务暂不可用，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="form-page">
      <h1>研究人员登录</h1>
      <p>仅限合成数据开发环境。真实研究账号尚未开通。</p>
      <form onSubmit={submit}>
        <label htmlFor="email">邮箱</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">密码</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <button type="submit" disabled={pending}>{pending ? "登录中…" : "登录"}</button>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </main>
  );
}
