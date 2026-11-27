"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { csrfFromCookies } from "../lib/api";

export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    const csrf = csrfFromCookies(document.cookie);
    setPending(true);
    try {
      if (csrf) {
        await fetch("/api/v1/auth/logout", {
          method: "POST", credentials: "same-origin", headers: { "X-CSRF-Token": csrf },
        });
      }
    } finally {
      // An expired session is already logged out; always land on the login page.
      router.replace("/login");
      router.refresh();
    }
  }

  return <button type="button" className="btn-secondary btn-sm" onClick={logout} disabled={pending}>
    {pending ? "退出中…" : "退出"}
  </button>;
}
