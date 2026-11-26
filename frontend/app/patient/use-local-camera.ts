"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraState = "idle" | "requesting" | "ready" | "closed" | "error" | "interrupted";

export function cameraError(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "未获得摄像头权限。请检查地址栏的网站权限和系统摄像头权限，允许后点击重试。";
  if (name === "NotFoundError") return "没有找到摄像头。请检查摄像头是否已连接，然后重试。";
  if (name === "NotReadableError") return "摄像头无法打开，可能正被其他程序占用。请关闭其他使用摄像头的程序后重试。";
  if (name === "OverconstrainedError") return "当前摄像头无法使用所请求的画面设置，请换一个设备或浏览器后重试。";
  return "摄像头暂时无法打开，请检查设备和浏览器后重试。";
}

export function useLocalCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const busy = useRef(false);
  const [state, setState] = useState<CameraState>("idle");
  const [message, setMessage] = useState("");

  const release = useCallback(() => {
    generation.current++;
    busy.current = false;
    const stream = streamRef.current;
    streamRef.current = null;
    for (const track of stream?.getTracks() ?? []) { track.onended = null; track.stop(); }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    release();
    if (mounted.current) { setState("closed"); setMessage(""); }
  }, [release]);

  useEffect(() => {
    mounted.current = true;
    function hide() { if (document.hidden) stop(); }
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      window.removeEventListener("pagehide", stop);
      document.removeEventListener("visibilitychange", hide);
      release();
    };
  }, [release, stop]);

  async function start() {
    if (busy.current || streamRef.current) return;
    if (window.isSecureContext === false || !navigator.mediaDevices?.getUserMedia) {
      setState("error"); setMessage("此页面无法访问摄像头。请使用支持摄像头的浏览器，并从本机 localhost 或 HTTPS 地址打开。"); return;
    }
    busy.current = true;
    const ticket = ++generation.current;
    setState("requesting"); setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (!mounted.current || generation.current !== ticket) {
        stream.getTracks().forEach((track) => track.stop()); return;
      }
      streamRef.current = stream;
      for (const track of stream.getVideoTracks()) track.onended = () => {
        release();
        if (mounted.current) { setState("interrupted"); setMessage("摄像头连接已中断，请检查设备后重新打开。"); }
      };
      if (!videoRef.current) { release(); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (mounted.current && generation.current === ticket) { busy.current = false; setState("ready"); }
    } catch (error) {
      if (mounted.current && generation.current === ticket) {
        release(); setState("error"); setMessage(cameraError(error));
      }
    }
  }

  return { videoRef, streamRef, state, message, start, stop };
}
