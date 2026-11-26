"use client";

import { useLocalCamera } from "./use-local-camera";
import styles from "./camera-preview.module.css";

export default function CameraPreview() {
  const { videoRef, state, message, start, stop } = useLocalCamera();
  const opening = state === "requesting";
  const ready = state === "ready";
  const needsRetry = state === "error" || state === "interrupted";

  return <div className={styles.preview}>
    <h3>摄像头预览</h3>
    <p className="note">仅在本机查看画面，不录制、不上传，也不使用麦克风。点击打开后，请在浏览器提示中自行选择是否允许。</p>
    <div className={styles.frame}>
      <video ref={videoRef} muted playsInline aria-label="本机摄像头预览" className={ready ? styles.visible : styles.waiting} />
      {!ready ? <div className={styles.placeholder} aria-hidden="true">
        <span>{opening ? "等待摄像头权限或画面…" : "画面将在这里显示"}</span>
      </div> : null}
    </div>
    <p role="status" className={styles.status}>{ready ? "摄像头已打开 · 仅本机预览" : opening ? "正在请求摄像头。若未出现弹窗，请查看地址栏的权限提示；也可以取消等待。" : state === "closed" ? "摄像头已关闭。若之前的权限提示仍在，可关闭或拒绝它。" : needsRetry ? "摄像头未连接" : "摄像头尚未打开"}</p>
    {message ? <p role="alert">{message}</p> : null}
    <div className="button-row">
      <button type="button" disabled={opening || ready} onClick={start}>{needsRetry ? "重试打开摄像头" : opening ? "正在打开…" : "打开摄像头"}</button>
      <button type="button" className={styles.close} disabled={!opening && !ready} onClick={stop}>{opening ? "取消等待" : "关闭摄像头"}</button>
    </div>
    <p className="note">切换步骤、离开页面或切到其他浏览器标签页时会停止预览，返回后需手动重新打开。</p>
    <p className="note">姿态识别算法尚未接入；当前不会自动判断全身入镜或动作是否正确。</p>
  </div>;
}
