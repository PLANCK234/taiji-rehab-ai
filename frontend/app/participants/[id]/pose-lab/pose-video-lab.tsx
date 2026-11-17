"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  JOINT_DEFINITIONS,
  POSE_CONNECTIONS,
  absoluteAngleDifference,
  createPoseFrame,
  jointAngleSegments,
  nearestPoseFrame,
  poseAnalysisCsv,
  poseAnalysisJson,
  poseAnnotationTemplateCsv,
  poseComparisonSummaryJson,
  poseManualAnnotationsCsv,
  summarizeManualAngleComparisons,
  summarizePose,
  trajectoryPoint,
  type JointName,
  type ManualPoseAnnotation,
  type PoseFrame,
  type PosePoint,
  type PoseSummary,
} from "./pose-analysis";

const SAMPLE_HZ = 10;
const MAX_VIDEO_SECONDS = 120;
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const JOINT_LABELS: Record<JointName, string> = {
  left_shoulder: "左肩", right_shoulder: "右肩", left_elbow: "左肘", right_elbow: "右肘",
  left_hip: "左髋", right_hip: "右髋", left_knee: "左膝", right_knee: "右膝",
  left_ankle: "左踝", right_ankle: "右踝",
};
const TRAJECTORIES = [
  ["pelvis", "骨盆中心", "#e66b4c"], ["left_wrist", "左腕", "#2771b2"],
  ["right_wrist", "右腕", "#6e4fb3"], ["left_ankle", "左踝", "#2b8a66"],
  ["right_ankle", "右踝", "#c58a20"],
] as const;
const LANDMARK_QUALITY_LABELS = [
  ["left_shoulder", "左肩"], ["right_shoulder", "右肩"], ["left_wrist", "左腕"], ["right_wrist", "右腕"],
  ["left_hip", "左髋"], ["right_hip", "右髋"], ["left_knee", "左膝"], ["right_knee", "右膝"],
  ["left_ankle", "左踝"], ["right_ankle", "右踝"],
] as const;

type PoseLandmarkerLike = {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): {
    landmarks?: PosePoint[][];
    worldLandmarks?: PosePoint[][];
  };
  close(): void;
};

function waitForEvent(target: HTMLMediaElement, event: "loadedmetadata" | "seeked") {
  return new Promise<void>((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("无法读取所选视频。")); };
    const cleanup = () => {
      target.removeEventListener(event, done);
      target.removeEventListener("error", failed);
    };
    target.addEventListener(event, done, { once: true });
    target.addEventListener("error", failed, { once: true });
  });
}

function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatAngle(value: number | null) {
  return value === null ? "未知" : `${value.toFixed(1)}°`;
}

function drawSkeleton(canvas: HTMLCanvasElement, video: HTMLVideoElement, frame: PoseFrame | undefined) {
  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, width, height);
  if (!frame?.detected) return;
  context.lineWidth = Math.max(3, width / 320);
  context.lineCap = "round";
  context.strokeStyle = "#7bf0b5";
  for (const [from, to] of POSE_CONNECTIONS) {
    const a = frame.landmarks[from];
    const b = frame.landmarks[to];
    if ((a.visibility ?? 1) < 0.5 || (b.visibility ?? 1) < 0.5) continue;
    context.beginPath();
    context.moveTo(a.x * width, a.y * height);
    context.lineTo(b.x * width, b.y * height);
    context.stroke();
  }
  context.fillStyle = "#fff4a8";
  for (const point of frame.landmarks) {
    if ((point.visibility ?? 1) < 0.5) continue;
    context.beginPath();
    context.arc(point.x * width, point.y * height, Math.max(3, width / 260), 0, Math.PI * 2);
    context.fill();
  }
}

function TrajectoryChart({ frames }: { frames: PoseFrame[] }) {
  return <div className="trajectory-chart" aria-label="归一化二维运动轨迹">
    <svg viewBox="0 0 600 360" role="img" aria-label="骨盆、手腕和脚踝的二维运动轨迹">
      <rect width="600" height="360" fill="#f2f7f1" />
      {TRAJECTORIES.map(([target, label, color]) => {
        const points = frames.map((frame) => trajectoryPoint(frame, target))
          .filter((point): point is { x: number; y: number } => point !== null)
          .map((point) => `${(point.x * 600).toFixed(1)},${(point.y * 360).toFixed(1)}`).join(" ");
        return points ? <polyline key={target} points={points} fill="none" stroke={color} strokeWidth="3">
          <title>{label}</title>
        </polyline> : null;
      })}
    </svg>
    <div className="trajectory-legend">{TRAJECTORIES.map(([target, label, color]) =>
      <span key={target}><i style={{ background: color }} />{label}</span>)}</div>
  </div>;
}

function AngleTimeChart({ frames, joint, durationMs }: { frames: PoseFrame[]; joint: JointName; durationMs: number }) {
  const segments = jointAngleSegments(frames, joint);
  const left = 52; const right = 580; const top = 20; const bottom = 240;
  const x = (timestampMs: number) => left + Math.min(1, Math.max(0, timestampMs / Math.max(1, durationMs))) * (right - left);
  const y = (angleDeg: number) => top + (180 - Math.min(180, Math.max(0, angleDeg))) / 180 * (bottom - top);
  return <div className="trajectory-chart angle-time-chart">
    <svg viewBox="0 0 600 280" role="img" aria-label={`${JOINT_LABELS[joint]}角度随时间变化；缺失处断开`}>
      <rect width="600" height="280" fill="#f2f7f1" />
      {[0, 90, 180].map((angle) => <g key={angle}>
        <line x1={left} x2={right} y1={y(angle)} y2={y(angle)} stroke="#cbd9cd" strokeWidth="1" />
        <text x="44" y={y(angle) + 5} textAnchor="end">{angle}°</text>
      </g>)}
      <line x1={left} x2={right} y1={bottom} y2={bottom} stroke="#6e8075" strokeWidth="1.5" />
      <text x={left} y="268">0 秒</text>
      <text x={right} y="268" textAnchor="end">{(durationMs / 1000).toFixed(1)} 秒</text>
      {segments.map((segment, index) => segment.length === 1
        ? <circle key={index} cx={x(segment[0].timestampMs)} cy={y(segment[0].angleDeg)} r="3" fill="#286c51" />
        : <polyline key={index} points={segment.map((point) => `${x(point.timestampMs).toFixed(1)},${y(point.angleDeg).toFixed(1)}`).join(" ")}
          fill="none" stroke="#286c51" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />)}
    </svg>
    {!segments.length ? <p>该关节在全部采样时刻均为未知。</p> : null}
  </div>;
}

export default function PoseVideoLab() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerLike | null>(null);
  const annotationSequenceRef = useRef(1);
  const [authorized, setAuthorized] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [frames, setFrames] = useState<PoseFrame[]>([]);
  const [summary, setSummary] = useState<PoseSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("请选择一段单人、全身尽量可见的视频。");
  const [error, setError] = useState("");
  const [annotations, setAnnotations] = useState<ManualPoseAnnotation[]>([]);
  const [eventLabel, setEventLabel] = useState("");
  const [repeatIndex, setRepeatIndex] = useState("");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [referenceJoint, setReferenceJoint] = useState<JointName | "">("");
  const [manualReferenceAngle, setManualReferenceAngle] = useState("");
  const [annotationNote, setAnnotationNote] = useState("");
  const [annotationError, setAnnotationError] = useState("");
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [angleJoint, setAngleJoint] = useState<JointName>("right_knee");
  const clearResult = useCallback(() => {
    setFrames([]); setSummary(null); setProgress(0);
    if (canvasRef.current) canvasRef.current.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, []);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    landmarkerRef.current?.close();
  }, []);

  const selectVideo = async (file: File | undefined) => {
    setError(""); clearResult(); setVideoReady(false); setAnnotations([]); setCurrentVideoTime(0); setAnnotationError("");
    if (!file) return;
    if (!authorized) { setError("请先确认视频使用范围。未读取该文件。"); return; }
    if (file.size > MAX_VIDEO_BYTES) { setError("视频超过 250 MB，本原型未读取该文件。"); return; }
    if (!file.type.startsWith("video/")) { setError("请选择浏览器可播放的视频文件。"); return; }
    const video = videoRef.current;
    if (!video) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    video.src = objectUrlRef.current;
    try {
      if (video.readyState < 1) await waitForEvent(video, "loadedmetadata");
      if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > MAX_VIDEO_SECONDS) {
        video.removeAttribute("src"); video.load();
        setError(`视频时长需在 0–${MAX_VIDEO_SECONDS} 秒之间。`); return;
      }
      setDurationSeconds(video.duration);
      setVideoReady(true);
      setMessage(`已在浏览器本地载入 ${video.duration.toFixed(1)} 秒视频，尚未分析。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法读取所选视频。");
    }
  };

  const loadLandmarker = async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    const mediaPipe = await import("@mediapipe/tasks-vision");
    const vision = await mediaPipe.FilesetResolver.forVisionTasks("/pose-assets/wasm");
    const options = {
      baseOptions: { modelAssetPath: "/pose-assets/pose_landmarker_full.task", delegate: "GPU" as const },
      runningMode: "VIDEO" as const, numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    };
    try {
      landmarkerRef.current = await mediaPipe.PoseLandmarker.createFromOptions(vision, options) as PoseLandmarkerLike;
    } catch {
      landmarkerRef.current = await mediaPipe.PoseLandmarker.createFromOptions(vision, {
        ...options, baseOptions: { ...options.baseOptions, delegate: "CPU" as const },
      }) as PoseLandmarkerLike;
    }
    return landmarkerRef.current;
  };

  const analyze = async () => {
    const video = videoRef.current;
    if (!video || !videoReady || busy) return;
    setBusy(true); setError(""); clearResult(); setMessage("正在加载本地姿态模型……");
    try {
      video.pause();
      const landmarker = await loadLandmarker();
      const sampleCount = Math.floor(durationSeconds * SAMPLE_HZ) + 1;
      const nextFrames: PoseFrame[] = [];
      for (let index = 0; index < sampleCount; index += 1) {
        const seconds = Math.min(durationSeconds, index / SAMPLE_HZ);
        if (Math.abs(video.currentTime - seconds) > 0.001) {
          const seeked = waitForEvent(video, "seeked");
          video.currentTime = seconds;
          await seeked;
        }
        const timestampMs = seconds * 1000;
        const result = landmarker.detectForVideo(video, timestampMs);
        nextFrames.push(createPoseFrame(timestampMs, result.landmarks?.[0], result.worldLandmarks?.[0]));
        if (index % 5 === 0 || index === sampleCount - 1) {
          setProgress((index + 1) / sampleCount);
          setMessage(`正在分析第 ${index + 1} / ${sampleCount} 帧……`);
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }
      const nextSummary = summarizePose(nextFrames, durationSeconds * 1000, SAMPLE_HZ);
      const mostAvailableJoint = (Object.keys(JOINT_DEFINITIONS) as JointName[])
        .reduce((best, name) => nextSummary.jointAngleCoverage[name] > nextSummary.jointAngleCoverage[best] ? name : best);
      setAngleJoint(mostAvailableJoint);
      setFrames(nextFrames); setSummary(nextSummary);
      video.currentTime = 0; setCurrentVideoTime(0);
      drawSkeleton(canvasRef.current!, video, nextFrames[0]);
      setMessage(`分析完成：${nextSummary.detectedFrames} / ${nextSummary.sampledFrames} 个采样时刻识别到人体。`);
    } catch (caught) {
      setError(caught instanceof Error ? `分析失败：${caught.message}` : "分析失败，请检查浏览器兼容性和视频格式。");
      setMessage("未产生可用结果。");
    } finally { setBusy(false); }
  };

  const syncOverlay = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video) setCurrentVideoTime(video.currentTime);
    if (video && canvas) drawSkeleton(canvas, video, nearestPoseFrame(frames, video.currentTime * 1000));
  };

  const addAnnotation = () => {
    const video = videoRef.current;
    const label = eventLabel.trim();
    if (!video || !videoReady || !label) return;
    const timestampMs = video.currentTime * 1000;
    const frame = nearestPoseFrame(frames, timestampMs);
    const parsedRepeat = repeatIndex === "" ? null : Number(repeatIndex);
    const parsedManualAngle = manualReferenceAngle === "" ? null : Number(manualReferenceAngle);
    if (parsedManualAngle !== null && (!Number.isFinite(parsedManualAngle) || parsedManualAngle < 0 || parsedManualAngle > 180)) {
      setAnnotationError("人工参考角度必须是 0–180 度之间的数值。"); return;
    }
    if (parsedManualAngle !== null && !referenceJoint) {
      setAnnotationError("填写人工参考角度前，请先选择对应关节。"); return;
    }
    const modelReferenceAngle = referenceJoint && frame ? frame.angles[referenceJoint] : null;
    const annotation: ManualPoseAnnotation = {
      id: `manual-${annotationSequenceRef.current++}`,
      timestampMs,
      eventLabel: label,
      repeatIndex: parsedRepeat !== null && Number.isInteger(parsedRepeat) && parsedRepeat > 0 ? parsedRepeat : null,
      phaseLabel: phaseLabel.trim(), referenceJoint: referenceJoint || null,
      manualReferenceAngleDeg: parsedManualAngle,
      modelReferenceAngleDeg: modelReferenceAngle,
      note: annotationNote.trim(),
    };
    setAnnotations((current) => [...current, annotation].sort((left, right) => left.timestampMs - right.timestampMs));
    setEventLabel(""); setRepeatIndex(""); setPhaseLabel(""); setManualReferenceAngle(""); setAnnotationNote("");
    setAnnotationError("");
  };

  const comparisonSummary = summarizeManualAngleComparisons(annotations);

  return <>
    <section aria-labelledby="pose-input-heading">
      <h2 id="pose-input-heading">1. 选择本地视频</h2>
      <p className="note">视频只在当前浏览器标签页中解码和分析，不上传至服务器，也不写入数据库。请勿使用未经授权的可识别影像。</p>
      <label><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} />
        我确认这是合成视频、公开测试素材，或已获明确授权用于本地技术验证</label>
      <label htmlFor="pose-video">视频文件（MP4、WebM 等；最长 120 秒，最大 250 MB）</label>
      <input id="pose-video" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={!authorized || busy}
        onChange={(event) => void selectVideo(event.target.files?.[0])} />
      <div className="pose-video-stage">
        <video ref={videoRef} controls playsInline onTimeUpdate={syncOverlay} onSeeked={syncOverlay} />
        <canvas ref={canvasRef} aria-label="识别到的人体骨架叠加层" />
      </div>
      <div className="button-row">
        <button type="button" disabled={!videoReady || busy} onClick={() => void analyze()}>{busy ? "分析中……" : "开始本地分析"}</button>
        <span role="status">{message}</span>
      </div>
      {busy ? <progress max={1} value={progress} aria-label="分析进度" /> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>

    {videoReady ? <section aria-labelledby="manual-annotation-heading">
      <h2 id="manual-annotation-heading">2. 本地人工时间点标注</h2>
      <p className="note">播放或拖动到目标时刻后添加标记。所有内容只在本标签页内存中；不要填写姓名、诊断或其他可识别信息。</p>
      <div className="annotation-grid">
        <label>事件标签（必填）<input value={eventLabel} onChange={(event) => setEventLabel(event.target.value)} placeholder="自定义，例如：人工标记 A" /></label>
        <label>重复序号（可选）<input type="number" min="1" step="1" value={repeatIndex} onChange={(event) => setRepeatIndex(event.target.value)} /></label>
        <label>阶段标签（可选）<input value={phaseLabel} onChange={(event) => setPhaseLabel(event.target.value)} placeholder="由标注方案自行定义" /></label>
        <label>参考关节（可选）<select value={referenceJoint} onChange={(event) => setReferenceJoint(event.target.value as JointName | "")}>
          <option value="">不选择参考关节</option>
          {(Object.keys(JOINT_DEFINITIONS) as JointName[]).map((name) => <option key={name} value={name}>{JOINT_LABELS[name]}</option>)}
        </select></label>
        <label>人工参考角度（可选，度）<input type="number" min="0" max="180" step="0.1" value={manualReferenceAngle}
          onChange={(event) => setManualReferenceAngle(event.target.value)} placeholder="由人工测量或标注方案提供" /></label>
        <label className="annotation-note">备注（可选，不填身份/临床信息）<textarea value={annotationNote} onChange={(event) => setAnnotationNote(event.target.value)} /></label>
      </div>
      <div className="button-row"><button type="button" disabled={!eventLabel.trim()} onClick={addAnnotation}>标记当前时刻</button>
        <span>当前视频时刻：{currentVideoTime.toFixed(1)} 秒</span></div>
      {annotationError ? <p role="alert">{annotationError}</p> : null}
      {annotations.length ? <div className="trend-table-wrap"><table className="trend-table">
        <caption>本标签页人工标注</caption><thead><tr><th>时刻</th><th>事件</th><th>重复</th><th>阶段</th><th>关节</th><th>人工角度</th><th>模型角度</th><th>绝对差值</th><th>操作</th></tr></thead>
        <tbody>{annotations.map((annotation) => <tr key={annotation.id}><td>{(annotation.timestampMs / 1000).toFixed(1)} 秒</td>
          <td>{annotation.eventLabel}</td><td>{annotation.repeatIndex ?? "—"}</td><td>{annotation.phaseLabel || "—"}</td>
          <td>{annotation.referenceJoint ? JOINT_LABELS[annotation.referenceJoint] : "—"}</td>
          <td>{formatAngle(annotation.manualReferenceAngleDeg)}</td>
          <td>{formatAngle(annotation.modelReferenceAngleDeg)}</td>
          <td>{formatAngle(absoluteAngleDifference(annotation.manualReferenceAngleDeg, annotation.modelReferenceAngleDeg))}</td>
          <td><button type="button" className="text-button" onClick={() => setAnnotations((current) => current.filter((item) => item.id !== annotation.id))}>删除</button></td>
        </tr>)}</tbody>
      </table></div> : <p>尚未添加人工标注。</p>}
      {annotations.length ? <>
        <h3>角度对照摘要（描述性）</h3>
        <p className="note">只汇总当前标签页中人工角与模型角同时存在的标注；缺失不补零，不表示动作质量或临床可用性。</p>
        <dl className="pose-summary-grid">
          <div><dt>标注总数</dt><dd>{comparisonSummary.totalAnnotations}</dd></div>
          <div><dt>可比较角度</dt><dd>{comparisonSummary.overall.count} / {comparisonSummary.totalAnnotations}</dd></div>
          <div><dt>人工角缺失</dt><dd>{comparisonSummary.missingManualAngleAnnotations}</dd></div>
          <div><dt>模型角缺失</dt><dd>{comparisonSummary.missingModelAngleAnnotations}</dd></div>
          <div><dt>平均绝对差值</dt><dd>{formatAngle(comparisonSummary.overall.meanAbsoluteDifferenceDeg)}</dd></div>
          <div><dt>中位绝对差值</dt><dd>{formatAngle(comparisonSummary.overall.medianAbsoluteDifferenceDeg)}</dd></div>
          <div><dt>最大绝对差值</dt><dd>{formatAngle(comparisonSummary.overall.maximumAbsoluteDifferenceDeg)}</dd></div>
        </dl>
        {Object.entries(comparisonSummary.byJoint).length ? <div className="trend-table-wrap"><table className="trend-table">
          <caption>按关节汇总的可比较角度</caption><thead><tr><th>关节</th><th>数量</th><th>平均绝对差值</th><th>中位绝对差值</th><th>最大绝对差值</th></tr></thead>
          <tbody>{Object.entries(comparisonSummary.byJoint).map(([joint, stats]) => <tr key={joint}>
            <th scope="row">{JOINT_LABELS[joint as JointName]}</th><td>{stats.count}</td>
            <td>{formatAngle(stats.meanAbsoluteDifferenceDeg)}</td><td>{formatAngle(stats.medianAbsoluteDifferenceDeg)}</td>
            <td>{formatAngle(stats.maximumAbsoluteDifferenceDeg)}</td></tr>)}</tbody>
        </table></div> : null}
      </> : null}
      <div className="button-row">
        <button type="button" disabled={!annotations.length}
          onClick={() => downloadText("pose-manual-annotations.csv", poseManualAnnotationsCsv(annotations), "text/csv;charset=utf-8")}>导出已标注 CSV</button>
        <button type="button" disabled={!annotations.length}
          onClick={() => downloadText("pose-angle-comparison-summary.json", poseComparisonSummaryJson(annotations), "application/json")}>导出角度对照摘要 JSON</button>
      </div>
    </section> : null}

    {summary ? <section aria-labelledby="pose-results-heading">
      <h2 id="pose-results-heading">3. 技术测量结果</h2>
      <p className="note">角度和轨迹是单摄像头模型估计值，受机位、遮挡、衣着和画面质量影响；不能替代人工计时、量表评估或临床判断。</p>
      <dl className="pose-summary-grid">
        <div><dt>视频时长</dt><dd>{(summary.videoDurationMs / 1000).toFixed(1)} 秒</dd></div>
        <div><dt>采样频率</dt><dd>{summary.sampleHz} Hz</dd></div>
        <div><dt>识别覆盖</dt><dd>{summary.detectedFrames} / {summary.sampledFrames}（{(summary.detectionRate * 100).toFixed(1)}%）</dd></div>
        <div><dt>识别观察时段</dt><dd>{summary.observedDurationMs === null ? "未知" : `${(summary.observedDurationMs / 1000).toFixed(1)} 秒`}</dd></div>
        <div><dt>最长连续漏检</dt><dd>{summary.longestConsecutiveMissedSamples} 个采样时刻</dd></div>
      </dl>
      <div className="trend-table-wrap"><table className="trend-table">
        <caption>关节角度范围（度）</caption>
        <thead><tr><th>关节</th><th>最小</th><th>最大</th><th>活动范围</th></tr></thead>
        <tbody>{(Object.keys(JOINT_DEFINITIONS) as JointName[]).map((name) => {
          const range = summary.jointRanges[name];
          return <tr key={name}><th scope="row">{JOINT_LABELS[name]}</th><td>{range?.minimum.toFixed(1) ?? "未知"}</td>
            <td>{range?.maximum.toFixed(1) ?? "未知"}</td><td>{range?.range.toFixed(1) ?? "未知"}</td></tr>;
        })}</tbody>
      </table></div>
      <h3>关节角度时间曲线</h3>
      <p className="note">默认选择当前角度覆盖率最高的关节。曲线只连接连续已知采样，缺失区间保持断开；不据此自动计次或判断动作阶段。</p>
      <label htmlFor="angle-time-joint">显示关节</label>
      <select id="angle-time-joint" value={angleJoint} onChange={(event) => setAngleJoint(event.target.value as JointName)}>
        {(Object.keys(JOINT_DEFINITIONS) as JointName[]).map((name) => <option key={name} value={name}>
          {JOINT_LABELS[name]}（{(summary.jointAngleCoverage[name] * 100).toFixed(1)}%）
        </option>)}
      </select>
      <AngleTimeChart frames={frames} joint={angleJoint} durationMs={summary.videoDurationMs} />
      <h3>测量可用性（全部采样时刻为分母）</h3>
      <p className="note">以下只报告模型关键点和派生角度的可用比例，不表示视频合格、动作正确或临床可用。</p>
      <div className="trend-table-wrap"><table className="trend-table">
        <caption>关键测量点与关节角覆盖率</caption>
        <thead><tr><th>部位</th><th>关键点可用</th><th>关节角可用</th></tr></thead>
        <tbody>{LANDMARK_QUALITY_LABELS.map(([name, label]) => {
          const jointCoverage = name in JOINT_DEFINITIONS ? summary.jointAngleCoverage[name as JointName] : null;
          return <tr key={name}><th scope="row">{label}</th>
            <td>{(summary.landmarkCoverage[name] * 100).toFixed(1)}%</td>
            <td>{jointCoverage === null ? "—" : `${(jointCoverage * 100).toFixed(1)}%`}</td></tr>;
        })}</tbody>
      </table></div>
      <h3>归一化二维轨迹</h3>
      <TrajectoryChart frames={frames} />
      <p className="note">画面左上角为 (0,0)，右下角为 (1,1)。这是图像坐标轨迹，不代表真实空间距离。</p>
      <div className="button-row">
        <button type="button" onClick={() => downloadText("pose-analysis.json", poseAnalysisJson(frames, summary), "application/json")}>导出 JSON</button>
        <button type="button" onClick={() => downloadText("pose-analysis.csv", poseAnalysisCsv(frames), "text/csv;charset=utf-8")}>导出 CSV</button>
        <button type="button" onClick={() => downloadText("pose-annotation-template.csv", poseAnnotationTemplateCsv(frames), "text/csv;charset=utf-8")}>导出人工标注模板</button>
      </div>
    </section> : null}
  </>;
}
