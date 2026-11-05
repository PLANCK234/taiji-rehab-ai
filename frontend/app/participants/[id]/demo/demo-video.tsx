import type { DemoAction } from "../../../workspace/demo";

// Add only reviewed, locally hosted Demo videos here when the owner supplies them.
const VIDEO_SOURCES: Readonly<Record<string, string>> = {};

export default function DemoVideo({ action, src = VIDEO_SOURCES[action.id] }: {
  action: Pick<DemoAction, "id" | "name">;
  src?: string;
}) {
  return <div className="demo-video">
    <div className="demo-video-frame">
      {src ? <video controls playsInline preload="metadata" aria-label={`${action.name}演示视频`}>
        <source src={src} type="video/mp4" />
        当前浏览器无法播放此视频。
      </video> : <div className="demo-video-empty" role="status">
        <span className="demo-video-icon" aria-hidden="true">▶</span>
        <strong>动作视频待添加</strong>
        <span>当前可查看文字讲解；视频素材确认后会在这里播放。</span>
      </div>}
    </div>
    <p className="note">仅供合成演示；视频内容需经负责人审核后才能加入，不作为自主训练指导。</p>
  </div>;
}
