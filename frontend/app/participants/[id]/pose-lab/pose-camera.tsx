"use client";

import { useEffect, useRef, useState } from "react";
import { createPoseFrame, JOINT_DEFINITIONS, liveFraming, type JointName } from "./pose-analysis";
import { createLandmarker, drawSkeleton } from "./pose-rendering";
import type { LiveSummary } from "./live-pose-summary";
import type { PatientPoseCounts } from "../../../workspace/patient-reports";

const joints = Object.keys(JOINT_DEFINITIONS) as JointName[];
const framingMessages = {
  full: "实时骨架识别中。",
  "one-side": "已识别到人体，部分关键点不可见。侧身或遮挡时，仅显示可见骨架。",
  partial: "已识别到人体，部分关键点不可见。请检查全身是否入镜和光线是否充足。",
  missing: "暂未识别到人体。请让全身入镜，检查光线和人与背景的区分度。",
};

export default function PoseCamera({
  allowSummaryExport = true, nextStepHeadingId, taskVersion, onTaskSummary,
}: {
  allowSummaryExport?: boolean;
  nextStepHeadingId?: string;
  taskVersion?: number;
  onTaskSummary?: (summary: PatientPoseCounts | null) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const close = useRef<((message?: string, finishTask?: boolean) => void) | null>(null);
  const beginAnalysis = useRef<(() => void) | null>(null);
  const togglePause = useRef<(() => void) | null>(null);
  const [consent, setConsent] = useState(false);
  const [rearCamera, setRearCamera] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "opening" | "preview" | "loading" | "analyzing" | "paused"
  >("idle");
  const active = phase !== "idle";
  const isTask = taskVersion !== undefined;
  const taskRunning = isTask && (phase === "analyzing" || phase === "paused");
  const [message, setMessage] = useState("摄像头未开启。");
  const [summary, setSummary] = useState<LiveSummary | null>(null);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => () => close.current?.(), []);

  async function start() {
    const preview = video.current;
    const overlay = canvas.current;
    if (!consent || close.current || !preview || !overlay) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("当前浏览器或访问地址无法使用摄像头。请检查浏览器权限和 HTTPS。");
      return;
    }

    let stopped = false;
    let paused = false;
    let stream: MediaStream | undefined;
    let model: Awaited<ReturnType<typeof createLandmarker>> | undefined;
    let frame = 0;
    let lastTime = -1;
    let lastInference = -Infinity;
    let firstInference: number | null = null;
    const resultSummary: LiveSummary = {
      schema_version: 1, source: "live_camera", angle_source: "model_estimate",
      sample_count: 0, detected_count: 0, framing_check_pass_count: 0,
      observed_ms: null, joint_ranges: {},
    };
    const release = (status?: string, finishTask = false) => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      preview.srcObject = null;
      model?.close();
      drawSkeleton(overlay, preview, undefined);
      close.current = null;
      beginAnalysis.current = null;
      togglePause.current = null;
      if (status) {
        setPortrait(false);
        setPhase("idle");
        setMessage(status);
        if (model) setSummary(resultSummary);
        if (finishTask && resultSummary.sample_count > 0) {
          const { sample_count, detected_count, framing_check_pass_count } = resultSummary;
          onTaskSummary?.({ sample_count, detected_count, framing_check_pass_count });
        }
      }
    };
    const tick = (now: number) => {
      if (stopped || paused || !model) return;
      try {
        if (preview.readyState >= 2 && preview.currentTime !== lastTime && now - lastInference >= 100) {
          lastTime = preview.currentTime;
          lastInference = now;
          const result = model.detectForVideo(preview, now);
          const pose = createPoseFrame(now, result.landmarks?.[0], result.worldLandmarks?.[0]);
          drawSkeleton(overlay, preview, pose);
          const framing = liveFraming(pose);
          firstInference ??= now;
          resultSummary.observed_ms = Math.round(now - firstInference);
          resultSummary.sample_count++;
          if (pose.detected) resultSummary.detected_count++;
          if (framing === "full") resultSummary.framing_check_pass_count++;
          for (const joint of joints) {
            const angle = pose.angles[joint];
            if (angle === null || !Number.isFinite(angle)) continue;
            const range = resultSummary.joint_ranges[joint];
            resultSummary.joint_ranges[joint] = range
              ? { samples: range.samples + 1, min_deg: Math.min(angle, range.min_deg), max_deg: Math.max(angle, range.max_deg) }
              : { samples: 1, min_deg: angle, max_deg: angle };
          }
          setMessage(framingMessages[framing]);
        }
        frame = requestAnimationFrame(tick);
      } catch {
        release("识别已中断，可以重新开启摄像头。");
      }
    };

    close.current = release;
    onTaskSummary?.(null);
    setSummary(null);
    setPhase("opening");
    setMessage("正在请求摄像头权限……");
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: rearCamera ? { exact: "environment" } : "user" },
        audio: false,
      });
      if (stopped) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = acquired;
      for (const track of stream.getVideoTracks()) {
        track.addEventListener("ended", () => {
          if (!stopped) release("摄像头已断开，可以重新开启。");
        }, { once: true });
      }
      preview.srcObject = stream;
      await preview.play();
      if (stopped) return;
      beginAnalysis.current = () => {
        beginAnalysis.current = null;
        setPhase("loading");
        setMessage("正在加载本地模型……");
        void createLandmarker({ live: true }).then((loaded) => {
          if (stopped) {
            loaded.close();
            return;
          }
          model = loaded;
          togglePause.current = () => {
            paused = !paused;
            if (paused) {
              cancelAnimationFrame(frame);
              drawSkeleton(overlay, preview, undefined);
              setPhase("paused");
              setMessage("演示任务已暂停。摄像头仍在预览，识别已暂停。");
            } else {
              setPhase("analyzing");
              setMessage("已继续演示任务，等待视频画面……");
              frame = requestAnimationFrame(tick);
            }
          };
          setPhase("analyzing");
          setMessage("等待视频画面……");
          frame = requestAnimationFrame(tick);
        }).catch(() => {
          if (!stopped) release("无法加载识别模型，可以重新开启摄像头。");
        });
      };
      setPhase("preview");
      setMessage(isTask
        ? "摄像头预览已开启。取景合适后，点击开始演示任务。"
        : "摄像头预览已开启。取景合适后，点击开始识别。");
    } catch (error) {
      if (stopped) return;
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError") {
        release("摄像头权限被拒绝。允许访问后可重试。");
      } else if (rearCamera && ["OverconstrainedError", "NotFoundError"].includes(name)) {
        release("当前设备无法使用后置摄像头。可选择默认摄像头后重试。");
      } else {
        release("无法开启摄像头，请检查设备后重试。");
      }
    }
  }

  return <section aria-labelledby="pose-camera-heading">
    <h2 id="pose-camera-heading">实时摄像头骨架验证</h2>
    {isTask && <p>演示任务版本 {taskVersion}</p>}
    <p>使用已获授权的演示画面。请放稳设备并让全身尽量入镜，可以穿鞋。画面在本机浏览器处理。</p>
    <label><input type="checkbox" checked={consent} disabled={active}
      onChange={(event) => setConsent(event.target.checked)} /> 我确认摄像头画面已获授权用于本地技术验证</label>
    <label>摄像头选择
      <select value={rearCamera ? "rear" : "default"} disabled={!consent || active}
        onChange={(event) => setRearCamera(event.target.value === "rear")}>
        <option value="default">默认摄像头（优先前置）</option>
        <option value="rear">后置摄像头</option>
      </select>
    </label>
    <div className={portrait ? "pose-video-stage pose-camera-portrait" : "pose-video-stage"}>
      <video ref={video} muted playsInline aria-label="摄像头预览"
        onResize={({ currentTarget }) => {
          if (currentTarget.srcObject && currentTarget.videoWidth > 0) {
            setPortrait(currentTarget.videoHeight > currentTarget.videoWidth);
          }
        }} />
      <canvas ref={canvas} aria-label="实时骨架" />
    </div>
    <div className="button-row">
      <button type="button" disabled={!consent || active} onClick={() => void start()}>开启摄像头预览</button>
      <button type="button" disabled={phase !== "preview"} onClick={() => beginAnalysis.current?.()}>
        {isTask ? "开始演示任务" : "开始识别"}
      </button>
      {isTask && <button type="button" disabled={phase !== "analyzing" && phase !== "paused"}
        onClick={() => togglePause.current?.()}>
        {phase === "paused" ? "继续演示任务" : "暂停演示任务"}
      </button>}
      <button type="button" disabled={!active} onClick={() => close.current?.(
        taskRunning ? "演示任务已结束，摄像头已停止。" : "摄像头已停止。", taskRunning,
      )}>{taskRunning ? "结束演示任务" : "停止摄像头"}</button>
    </div>
    <p role="status">{message}</p>
    {summary && <div>
      <h3>本次实时分析摘要</h3>
      {summary.sample_count > 0
        ? <p>识别到人体 {summary.detected_count} / {summary.sample_count} 次采样。取景检查通过 {summary.framing_check_pass_count} 次。</p>
        : <p>本次没有可用采样，识别覆盖率未知。</p>}
      {allowSummaryExport && <button type="button" onClick={() => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "实时姿态分析摘要.json";
        link.click();
        URL.revokeObjectURL(url);
      }}>导出实时分析摘要</button>}
    </div>}
    {nextStepHeadingId && <p>
      <button type="button" onClick={() => {
        close.current?.(taskRunning
          ? "演示任务已结束，摄像头已停止。"
          : "摄像头已停止。", taskRunning);
        document.getElementById(nextStepHeadingId)?.focus();
      }}>
        {taskRunning
          ? "结束演示任务并填写记录"
          : summary ? "继续填写训练与不适记录" : "跳过摄像头并填写记录"}
      </button>
    </p>}
  </section>;
}
