"use client";

import { useEffect, useRef, useState } from "react";
import type { LocalTeachingVideo } from "./local-teaching";
import styles from "./teaching-player.module.css";

export default function TeachingPlayer({ videos, active }: { videos: LocalTeachingVideo[]; active: boolean }) {
  const [selected, setSelected] = useState(videos[0]?.id);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const player = useRef<HTMLVideoElement>(null);
  const video = videos.find((row) => row.id === selected) ?? videos[0];

  useEffect(() => {
    if (!active) player.current?.pause();
  }, [active]);
  useEffect(() => {
    function pauseWhenHidden() { if (document.hidden) player.current?.pause(); }
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  if (!video) return null;
  async function replay() {
    if (!player.current) return;
    player.current.currentTime = 0;
    try { await player.current.play(); setError(""); }
    catch { setError("暂时无法播放，请点击播放器重试，或重新登录后再试。"); }
  }

  return <section aria-labelledby="local-teaching-title">
    <div className="eyebrow">团队自录 · 本机试用</div>
    <h2 id="local-teaching-title">太极动作教学视频</h2>
    <p className="note">这些是你们提供的试用素材，尚未经医护确认发布为患者训练计划。可在这里试播；观看不会开始训练或生成完成记录。</p>
    <div className={styles.layout}>
      <div>
        <h3>{video.title}</h3>
        <video className={styles.video} key={`${video.id}-${attempt}`} ref={player} controls playsInline
          preload="metadata" aria-label={`${video.title}教学视频`} poster={`/api/local-teaching/${video.id}.jpg`}
          src={`/api/local-teaching/${video.id}.mp4`} onError={() => setError("视频暂时无法读取，请重试或重新登录。")} />
        <div className="button-row">
          <button type="button" onClick={replay}>从头重播</button>
          <p className="note">使用播放器控制播放、暂停、进度与全屏。</p>
        </div>
        {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => { setError(""); setAttempt(attempt + 1); }}>重新加载视频</button></div> : null}
        <p className="note">切换步骤或离开当前浏览器标签时会暂停。视频仅存于本机，未上传到外部平台。</p>
      </div>
      <nav aria-label="教学视频素材列表">
        <h3>选择动作 <small>共 {videos.length} 段</small></h3>
        <ol className={styles.list}>{videos.map((row) => <li key={row.id}>
          <button type="button" aria-pressed={video.id === row.id} onClick={() => {
            player.current?.pause(); setSelected(row.id); setError("");
          }}><span>{row.title}</span><small>{Math.floor(row.duration_seconds / 60)}:{String(Math.floor(row.duration_seconds % 60)).padStart(2, "0")}</small></button>
        </li>)}</ol>
        <p className="note">素材排列不代表训练顺序或训练次数。</p>
      </nav>
    </div>
  </section>;
}
