"use client";

import { useEffect, useRef, useState } from "react";
import type { LocalTeachingVideo } from "./local-teaching";
import styles from "./teaching-player.module.css";

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
function durationText(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function TeachingPlayer({ videos, active }: { videos: LocalTeachingVideo[]; active: boolean }) {
  const [selected, setSelected] = useState(videos[0]?.id);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [speed, setSpeed] = useState(1);
  const player = useRef<HTMLVideoElement>(null);
  const playRequest = useRef(0);
  const video = videos.find((row) => row.id === selected) ?? videos[0];
  const index = videos.findIndex((row) => row.id === video?.id);

  useEffect(() => {
    if (player.current) {
      player.current.defaultPlaybackRate = speed;
      player.current.playbackRate = speed;
    }
  }, [speed, video?.id, attempt]);

  useEffect(() => {
    if (!active) { playRequest.current++; player.current?.pause(); }
  }, [active]);
  useEffect(() => {
    function pauseWhenHidden() { if (document.hidden) { playRequest.current++; player.current?.pause(); } }
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  if (!video) return null;
  function chooseVideo(next: number) {
    if (!videos[next]) return;
    playRequest.current++;
    player.current?.pause(); setSelected(videos[next].id); setError("");
  }
  async function replay() {
    const element = player.current;
    if (!element) return;
    const ticket = ++playRequest.current;
    element.currentTime = 0;
    try { await element.play(); if (ticket === playRequest.current && player.current === element) setError(""); }
    catch { if (ticket === playRequest.current && player.current === element) setError("暂时无法播放，请点击播放器重试，或重新登录后再试。"); }
  }

  return <section aria-labelledby="local-teaching-title">
    <div className="eyebrow">团队自录 · 本机试用</div>
    <h2 id="local-teaching-title">太极动作教学视频</h2>
    <p className="note">这些是你们提供的试用素材，尚未经医护确认发布为患者训练计划。可在这里试播；观看不会开始训练或生成完成记录。</p>
    <div className={styles.layout}>
      <div>
        <h3>{video.title}</h3>
        <p className={styles.information} role="status">当前第 {index + 1} 段，共 {videos.length} 段 · 原片时长 {durationText(video.duration_seconds)}</p>
        <video className={styles.video} key={`${video.id}-${attempt}`} ref={player} controls playsInline
          preload="metadata" aria-label={`${video.title}教学视频`} poster={`/api/local-teaching/${video.id}.jpg`}
          src={`/api/local-teaching/${video.id}.mp4`}
          onLoadedMetadata={(event) => { event.currentTarget.defaultPlaybackRate = speed; event.currentTarget.playbackRate = speed; }}
          onRateChange={(event) => { const rate = event.currentTarget.playbackRate; if (Number.isFinite(rate) && rate > 0) setSpeed(rate); }}
          onError={() => setError("视频暂时无法读取，请重试或重新登录。")} />
        <div className={styles.controls}>
          <label>播放速度<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
            {!speeds.includes(speed) ? <option value={speed}>{speed} 倍</option> : null}
            {speeds.map((rate) => <option key={rate} value={rate}>{rate} 倍{rate === 1 ? "（原速）" : ""}</option>)}
          </select></label>
          <button type="button" onClick={replay}>从头重播</button>
        </div>
        <div className={styles.navigation}>
          <button type="button" disabled={index === 0} onClick={() => chooseVideo(index - 1)}>← 上一段</button>
          <button type="button" disabled={index === videos.length - 1} onClick={() => chooseVideo(index + 1)}>下一段 →</button>
        </div>
        <p className="note">使用播放器控制播放、暂停、进度与全屏。切换视频后保持暂停；播放速度仅用于观看，不代表训练节奏。</p>
        {error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => { setError(""); setAttempt(attempt + 1); }}>重新加载视频</button></div> : null}
        <p className="note">切换步骤或离开当前浏览器标签时会暂停。视频仅存于本机，未上传到外部平台。</p>
      </div>
      <nav aria-label="教学视频素材列表">
        <h3>选择动作 <small>共 {videos.length} 段</small></h3>
        <ol className={styles.list}>{videos.map((row, videoIndex) => <li key={row.id}>
          <button type="button" aria-pressed={video.id === row.id} onClick={() => chooseVideo(videoIndex)}><span>{row.title}</span><small>{durationText(row.duration_seconds)}</small></button>
        </li>)}</ol>
        <p className="note">素材排列不代表训练顺序或训练次数。</p>
      </nav>
    </div>
  </section>;
}
