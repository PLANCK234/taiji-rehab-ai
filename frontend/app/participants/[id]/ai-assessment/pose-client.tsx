"use client";

import { useEffect, useRef, useState } from "react";
import { demoError } from "../../../workspace/demo";
import { connections, jointNames, savePose } from "../../../workspace/pose";
import type { Point, PoseDetail, PoseFrame, PoseInput, PoseSummary } from "../../../workspace/pose";
import { fileDurationMs, MAX_CAPTURE_FRAMES, MAX_CAPTURE_MS, sampleTimes, seekFrame } from "../../../workspace/pose-capture";
import MotionEvidence from "./motion-evidence";
import PoseReviewPanel from "./pose-review-panel";

type Reply = { id: number; ready?: boolean; error?: string; landmarks?: Point[]; pose_count?: number };

export default function PoseClient({ participantId, initialHistory, canWrite, canReview }: {
  participantId: string; initialHistory: PoseSummary[] | null; canWrite: boolean; canReview: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null), overlay = useRef<HTMLCanvasElement>(null);
  const worker = useRef<Worker | null>(null), stream = useRef<MediaStream | null>(null);
  const requests = useRef(new Map<number, { resolve: (r: Reply) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>());
  const seq = useRef(0), active = useRef(false), source = useRef<PoseInput["source"]>("synthetic_video");
  const alive = useRef(true);
  const pendingSubmission = useRef<{ input: PoseInput; key: string } | null>(null);
  const [hasPending, setHasPending] = useState(false);
  const blobUrl = useRef<string | null>(null), frames = useRef<PoseFrame[]>([]);
  const manifest = useRef<{ model_version: PoseInput["model_version"]; sha256: string } | null>(null);
  const [status, setStatus] = useState("加载合成样例或选择合成测试视频。"), [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false), [running, setRunning] = useState(false);
  const [support, setSupport] = useState<PoseInput["support"]>("unknown");
  const [history, setHistory] = useState(initialHistory), [report, setReport] = useState<PoseDetail | null>(null);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    alive.current = true;
    const pendingRequests = requests.current;
    return () => {
    alive.current = false;
    active.current = false;
    worker.current?.terminate();
    pendingRequests.forEach(r => { clearTimeout(r.timer); r.reject(new Error("页面已关闭")); });
    pendingRequests.clear();
    stream.current?.getTracks().forEach(t => t.stop());
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, []);

  async function ask(message: object, transfer: Transferable[] = []): Promise<Reply> {
    const id = ++seq.current;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        requests.current.delete(id); reject(new Error("模型处理超时，请重新加载页面。"));
      }, 60_000);
      requests.current.set(id, { resolve, reject, timer });
      worker.current!.postMessage({ ...message, id }, transfer);
    });
  }

  async function ensureModel() {
    // A fresh tracking graph gives every clip its own media-time clock.
    worker.current?.terminate(); worker.current = null;
    setStatus("正在加载本地姿态模型…");
    const response = await fetch("/pose-assets/manifest.json");
    if (!response.ok) throw new Error("本地模型资源缺失，请先运行 pnpm prepare:pose。");
    manifest.current = await response.json();
    worker.current = new Worker("/pose-assets/pose-worker.js");
    worker.current.onmessage = ({ data }: MessageEvent<Reply>) => {
      const pending = requests.current.get(data.id);
      if (!pending) return;
      clearTimeout(pending.timer); requests.current.delete(data.id);
      if (data.error) pending.reject(new Error(data.error)); else pending.resolve(data);
    };
    worker.current.onerror = () => {
      requests.current.forEach(r => { clearTimeout(r.timer); r.reject(new Error("姿态模型加载失败。")); });
      requests.current.clear();
    };
    try { await ask({ type: "init" }); } catch (error) {
      worker.current.terminate(); worker.current = null; throw error;
    }
  }

  function resetSource() {
    const el = video.current!;
    el.pause(); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    el.srcObject = null;
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = null; frames.current = []; setLoaded(false);
    overlay.current?.getContext("2d")?.clearRect(0, 0, overlay.current.width, overlay.current.height);
  }

  async function loadSample() {
    setBusy(true);
    try {
      resetSource(); setStatus("正在制作合成静态视频样例（仅验证识别，不验证运动评分）…");
      const img = new Image(); img.src = "/pose-fixtures/synthetic-elderly.png"; await img.decode();
      const canvas = document.createElement("canvas"); canvas.width = 600; canvas.height = 656;
      const ctx = canvas.getContext("2d")!; ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const media = canvas.captureStream(10);
      try {
        const recorder = new MediaRecorder(media), chunks: Blob[] = [];
        recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        const complete = new Promise<Blob>((resolve, reject) => {
          recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
          recorder.onerror = () => reject(new Error("此浏览器无法制作样例视频。"));
        });
        recorder.start();
        // Repeated identical frames are deliberately labelled as a static model smoke fixture.
        for (let n = 0; n < 30; n++) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        recorder.stop(); const blob = await complete;
        blobUrl.current = URL.createObjectURL(blob); video.current!.src = blobUrl.current;
      } finally { media.getTracks().forEach(t => t.stop()); }
      source.current = "synthetic_video"; setStatus("合成静态样例已加载，点击开始AI识别。此素材不是患者或标准动作。");
    } catch (error) { setStatus(String(error)); } finally { setBusy(false); }
  }

  function loadFile(file: File | undefined) {
    if (!file) return;
    resetSource();
    if (file.size > 100 * 1024 * 1024) { setStatus("测试视频不能超过100 MB。"); return; }
    source.current = "synthetic_video"; blobUrl.current = URL.createObjectURL(file);
    video.current!.src = blobUrl.current; setStatus("视频已加载；按200毫秒间隔分析前5分钟，不按播放速度跳帧。");
  }

  async function loadCamera() {
    setBusy(true);
    try {
      resetSource();
      if (!window.isSecureContext || !navigator.mediaDevices) throw new Error("手机摄像需要HTTPS安全地址或本机localhost。");
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      stream.current = media; video.current!.srcObject = media; await video.current!.play();
      source.current = "synthetic_camera"; setStatus("测试摄像已打开；请仅拍摄合成测试画面。停止后释放摄像头。");
    } catch (error) { setStatus(`无法打开摄像头：${String(error)}`); } finally { setBusy(false); }
  }

  function draw(points: Point[]) {
    const el = video.current!, canvas = overlay.current!, ctx = canvas.getContext("2d")!;
    canvas.width = el.videoWidth; canvas.height = el.videoHeight; ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#b4ffdf"; ctx.fillStyle = "#ffffff"; ctx.lineWidth = 3;
    connections.forEach(([a, b]) => {
      if (!points[a] || !points[b] || points[a].visibility < .5 || points[b].visibility < .5) return;
      ctx.beginPath(); ctx.moveTo(points[a].x * canvas.width, points[a].y * canvas.height);
      ctx.lineTo(points[b].x * canvas.width, points[b].y * canvas.height); ctx.stroke();
    });
    points.forEach(p => { if (p.visibility >= .5) { ctx.beginPath(); ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2); ctx.fill(); } });
  }

  async function openReport(id: string) {
    const response = await fetch(`/api/v1/pose-analyses/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) throw new Error(demoError(response.status));
    setReport(await response.json() as PoseDetail); setCursor(0);
    setStatus("已打开已保存的评估记录。");
  }

  async function submitPending() {
    const pending = pendingSubmission.current;
    if (!pending) return;
    setStatus("正在保存关键点并由后端计算指标…");
    const result = await savePose(participantId, pending.input, pending.key);
    if (!result.value) throw new Error(demoError(result.status));
    const saved = result.value;
    setHistory(prior => [saved, ...(prior ?? []).filter(row => row.id !== saved.id)]);
    // Do not re-submit a committed record merely because the detail read failed.
    pendingSubmission.current = null; setHasPending(false);
    try { await openReport(saved.id); } catch {
      setStatus("记录已保存，报告详情暂不可用；请从已保存的评估重新打开。");
      return;
    }
    setStatus("AI识别与指标已保存，等待工作人员复核。");
  }

  async function retrySave() {
    setBusy(true);
    try { await submitPending(); } catch (error) {
      setStatus(`保存未完成：${String(error)}。可重试保存，或从历史重新打开已保存记录。`);
    } finally { setBusy(false); }
  }

  async function start() {
    setBusy(true); setReport(null); frames.current = [];
    try {
      await ensureModel();
      const el = video.current!;
      const width = el.videoWidth, height = el.videoHeight;
      active.current = true; setRunning(true);
      async function capture(timestamp: number, suffix = "") {
          const bitmap = await createImageBitmap(el);
          const reply = await ask({ type: "frame", bitmap, timestamp: timestamp + 1 }, [bitmap]);
          if (!alive.current) return;
          const points = reply.landmarks ?? [];
          frames.current.push({ timestamp_ms: timestamp, landmarks: points, pose_count: reply.pose_count ?? 0 });
          draw(points);
          setStatus(`${points.length ? "已识别33个关键点" : reply.pose_count === 2 ? "多人画面，本帧不评估" : "未识别到完整人体，本帧缺失"} · ${frames.current.length}帧${suffix}`);
      }
      if (stream.current) {
        await el.play();
        const base = el.currentTime * 1000;
        let firstTime: number | null = null, last = -1, progressedAt = performance.now();
        while (active.current && !el.ended && frames.current.length < MAX_CAPTURE_FRAMES) {
          const mediaTime = el.currentTime * 1000 - base;
          if (mediaTime > MAX_CAPTURE_MS) break;
          if (el.readyState >= 2 && (last < 0 || mediaTime - last >= 100)) {
            firstTime ??= mediaTime;
            await capture(mediaTime - firstTime); last = mediaTime; progressedAt = performance.now();
          }
          if (performance.now() - progressedAt > 10_000) throw new Error("摄像输入已停止更新，请重新打开摄像头。");
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        setLoaded(false);
      } else {
        const times = sampleTimes(await fileDurationMs(el));
        for (const timestamp of times) {
          if (!active.current || !alive.current) break;
          await seekFrame(el, timestamp / 1000);
          await capture(timestamp, ` / ${times.length}帧`);
        }
      }
      if (!alive.current) return;
      el.pause(); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
      active.current = false; setRunning(false);
      if (frames.current.length < 3) throw new Error("有效采样不足3帧，请使用更长的视频重试。");
      const input: PoseInput = {
        source: source.current, model_version: manifest.current!.model_version,
        model_sha256: manifest.current!.sha256, width, height,
        support, frames: frames.current,
      };
      pendingSubmission.current = { input, key: crypto.randomUUID() }; setHasPending(true);
      await submitPending();
    } catch (error) {
      active.current = false; setRunning(false); video.current?.pause();
      stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
      setStatus(`${pendingSubmission.current ? "本次分析待保存，可重试而无需重新采集" : "识别未完成"}：${String(error)}`);
    } finally { setBusy(false); }
  }

  const frame = report?.input_data.frames[cursor];
  return <>
    <section>
      <h2>1. 视频与人体骨架</h2>
      <p className="note">仅使用合成测试素材，不采集真实患者资料。姿态模型测量图像平面表现；低幅度、慢动作和坐位不会因幅度小自动判错。</p>
      <label>任务姿势/辅助方式<select value={support} disabled={busy || hasPending} onChange={e => setSupport(e.target.value as PoseInput["support"])}>
        <option value="unknown">未记录</option><option value="standing">站位</option><option value="seated">坐位</option><option value="supported">扶持/辅助</option>
      </select></label>
      <div className="pose-demo-actions">
        <button type="button" disabled={busy || hasPending || !canWrite} onClick={() => void loadSample()}>加载合成样例</button>
        <label>选择合成测试视频<input type="file" accept="video/*" disabled={busy || hasPending || !canWrite} onChange={e => loadFile(e.target.files?.[0])} /></label>
        <button type="button" disabled={busy || hasPending || !canWrite} onClick={() => void loadCamera()}>打开测试摄像</button>
      </div>
      <div style={{ position: "relative", maxWidth: 600 }}>
        <video ref={video} muted playsInline controls={!busy} style={{ width: "100%", display: "block" }}
          onLoadedData={() => setLoaded(true)} onError={() => { setLoaded(false); setStatus("视频无法解码，请更换浏览器支持的格式。"); }} />
        <canvas ref={overlay} aria-label="实时识别骨架" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      </div>
      <div className="pose-demo-actions">
        <button type="button" disabled={busy || hasPending || !loaded || !canWrite} onClick={() => void start()}>开始AI识别并评估</button>
        <button type="button" disabled={!running} onClick={() => { active.current = false; }}>停止并分析</button>
      </div>
      <p role="status" aria-live="polite">{status}</p>
      {hasPending && <div><p>待保存数据仅在当前页面内，离开页面会丢失。</p>
        <button type="button" disabled={busy} onClick={() => void retrySave()}>重试保存本次分析</button>
        <button type="button" disabled={busy} onClick={() => { pendingSubmission.current = null; setHasPending(false); setStatus("已放弃本次待保存数据。"); }}>放弃待保存数据</button>
      </div>}
    </section>
    {report && <section>
      <h2>2. AI 初评报告</h2>
      <p>{report.result.status === "measured" ? "已取得可评估指标" : "无法评估，请重新取景或交人工评估"} · 采样 {report.result.sampled_frames} 帧 · 单人识别 {report.result.single_pose_frames} 帧 · {report.result.duration_seconds.toFixed(2)} 秒</p>
      <p>算法：{report.algorithm_version} · {report.reviews.length === 0 ? "待人工审核" : report.reviews.at(-1)?.decision === "accepted_observations" ? "观察指标已复核" : report.reviews.at(-1)?.decision === "modified_observations" ? "观察指标已修正复核" : report.reviews.at(-1)?.decision === "needs_retake" ? "复核要求重录" : "复核已拒绝"}</p>
      <table className="pose-metrics"><thead><tr><th>关节</th><th>角度中位数</th><th>活动幅度P5–P95</th><th>可见帧比例</th></tr></thead>
        <tbody>{Object.entries(report.result.metrics).map(([key, m]) => <tr key={key}>
          <th>{jointNames[key]}</th><td>{m.median_deg === null ? "不可评估" : `${m.median_deg}°`}</td>
          <td>{m.range_p05_p95_deg === null ? "不可评估" : `${m.range_p05_p95_deg}°`}</td>
          <td>{(m.coverage * 100).toFixed(0)}%</td>
        </tr>)}</tbody></table>
      <p className="note">幅度为图像平面角度变化，含模型抖动；静止时也可能非零。SPPB分数及康复阶段需结合已确认量表和专家规则，本报告不从动作幅度直接推断。</p>
      <MotionEvidence report={report} cursor={cursor} onCursorChange={setCursor} />
      {frame && <><h3>关键点证据回放</h3><label>证据帧<input type="range" min={0} max={report.input_data.frames.length - 1} value={cursor} onChange={e => setCursor(Number(e.target.value))} /></label>
        <p>时间：{(frame.timestamp_ms / 1000).toFixed(2)} 秒 · {frame.landmarks.length ? "单人关键点" : "缺失/多人，不补成正常"}</p>
        <svg viewBox={`0 0 ${report.input_data.width} ${report.input_data.height}`} aria-label="已保存的骨架证据" role="img" style={{ maxWidth: 400, maxHeight: 400, width: "100%", background: "#17232a" }}>
          {connections.map(([a, b]) => frame.landmarks[a]?.visibility >= .5 && frame.landmarks[b]?.visibility >= .5
            ? <line key={`${a}-${b}`} x1={frame.landmarks[a].x * report.input_data.width} y1={frame.landmarks[a].y * report.input_data.height} x2={frame.landmarks[b].x * report.input_data.width} y2={frame.landmarks[b].y * report.input_data.height} stroke="#b4ffdf" strokeWidth={5} /> : null)}
        </svg></>}
      <PoseReviewPanel key={`${report.id}:${report.reviews.at(-1)?.revision_no ?? 0}`}
        report={report} canReview={canReview} busy={busy} onBusy={setBusy}
        onStatus={setStatus} onReload={() => openReport(report.id)} />
    </section>}
    <section><h2>3. 已保存的评估</h2>
      {history === null ? <p>历史读取失败，请确认后端已完成数据库迁移。</p> : history.length === 0 ? <p>暂无视频评估记录。</p>
        : <ul>{history.map(h => <li key={h.id}><button type="button" disabled={busy} onClick={() => { void openReport(h.id).catch(e => setStatus(String(e))); }}>
          {new Date(h.created_at).toLocaleString("zh-CN")} · {h.result.status === "measured" ? "有测量指标" : "不可评估"}</button></li>)}</ul>}
    </section>
  </>;
}
