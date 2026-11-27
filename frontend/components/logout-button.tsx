"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { csrfFromCookies } from "../lib/api";

export default function LogoutButton({ beforeLogout, onLogoutSuccess }: {
  /** Return false to cancel (e.g. unsaved patient feedback). */
  beforeLogout?: () => boolean;
  onLogoutSuccess?: () => void;
} = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function done() {
    onLogoutSuccess?.();
    router.replace("/login");
    router.refresh();
  }

  async function logout() {
    if (beforeLogout && !beforeLogout()) return;
    setError("");
    const csrf = csrfFromCookies(document.cookie);
    // Without a CSRF cookie the session is already gone; there is nothing to revoke.
    if (!csrf) { done(); return; }
    setPending(true);
    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST", credentials: "same-origin", headers: { "X-CSRF-Token": csrf },
      });
      if (response.ok || response.status === 401) { done(); return; }
      setError("退出失败，请稍后重试。");
    } catch {
      setError("退出失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return <span className="row" style={{ gap: 6 }}>
    <button type="button" className="btn-secondary btn-sm" onClick={logout} disabled={pending}>
      {pending ? "退出中…" : "退出登录"}
    </button>
    {error && <span role="alert" className="hint" style={{ color: "var(--vermilion)" }}>{error}</span>}
  </span>;
}
