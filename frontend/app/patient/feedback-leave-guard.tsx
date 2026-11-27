"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import LogoutButton from "../../components/logout-button";
import styles from "./feedback-leave-guard.module.css";

const LeaveContext = createContext<{
  dirty: boolean;
  setDirty: (value: boolean) => void;
  confirmLeave: () => boolean;
} | null>(null);

export function FeedbackLeaveGuard({ children }: { children: ReactNode }) {
  const [dirty, setDirtyState] = useState(false);
  const current = useRef(false);
  const setDirty = useCallback((value: boolean) => {
    current.current = value; setDirtyState(value);
  }, []);
  const confirmLeave = useCallback(() => !current.current || window.confirm("还有未保存的反馈内容。退出登录后这些内容会丢失，确定退出吗？"), []);

  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!current.current) return;
      event.preventDefault(); event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  return <LeaveContext.Provider value={{ dirty, setDirty, confirmLeave }}>{children}</LeaveContext.Provider>;
}

export function useFeedbackLeaveWarning(dirty: boolean) {
  const setDirty = useContext(LeaveContext)?.setDirty;
  useEffect(() => {
    setDirty?.(dirty);
    return () => setDirty?.(false);
  }, [dirty, setDirty]);
}

export function UnsavedFeedbackNotice() {
  const guard = useContext(LeaveContext);
  return guard?.dirty ? <p role="status" className={styles.notice}>有未保存的反馈内容。切换步骤会保留，离开前请先保存。</p> : null;
}

export function PatientLogoutButton() {
  const guard = useContext(LeaveContext);
  return <LogoutButton beforeLogout={guard?.confirmLeave} onLogoutSuccess={() => guard?.setDirty(false)} />;
}
