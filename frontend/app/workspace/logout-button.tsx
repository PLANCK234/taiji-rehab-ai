"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function csrfCookie(): string | null {
  const entry = document.cookie.split("; ").find((item) => item.startsWith("taiji_csrf=") || item.startsWith("__Host-taiji_csrf="));
  return entry ? decodeURIComponent(entry.split("=", 2)[1]) : null;
}

export default function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function logout() {
    const csrf = csrfCookie();
    if (!csrf) {
      setError("会话验证失败，请刷新页面。");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": csrf },
      });
      if (!response.ok) throw new Error("logout failed");
      router.replace("/login");
    } catch {
      setError("退出失败，请稍后重试。");
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={logout} disabled={pending}>退出登录</button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
