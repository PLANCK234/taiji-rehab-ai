"use client";

import { useState } from "react";

export default function SyntheticPosePreview() {
  const [frame, setFrame] = useState<0 | 1 | 2>(0);

  return <section aria-labelledby="pose-preview-heading">
    <h2 id="pose-preview-heading">合成画面预览</h2>
    <p className="note">线条人物由页面绘制，不对应任何受试者或标准动作。</p>
    <div className="pose-demo-actions">
      <button type="button" onClick={() => setFrame((current) => current === 1 ? 2 : 1)}>
        生成合成示意画面
      </button>
      <button type="button" disabled={frame === 0} onClick={() => setFrame(0)}>
        清除预览
      </button>
    </div>
    {frame === 0 ? <p role="status">尚无预览画面。</p> : <div className="pose-demo-frame">
      <svg viewBox="0 0 480 300" role="img" aria-label={`第 ${frame} 幅合成线条人物示意图`}>
        <rect width="480" height="300" rx="12" fill="#eef5f1" />
        <path d="M36 255H444" stroke="#9ab9a8" strokeWidth="3" />
        <circle cx="240" cy="71" r="24" fill="#d5e8db" stroke="#286c53" strokeWidth="5" />
        <path d="M240 96V185M240 114L156 142M240 114L324 142M240 185L184 251M240 185L296 251"
          fill="none" stroke="#286c53" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"
          transform={frame === 2 ? "rotate(8 240 160)" : undefined} />
        <text x="24" y="36" fill="#155b43" fontSize="16" fontWeight="bold">SYNTHETIC · 合成示意</text>
      </svg>
      <p role="status">第 {frame} 幅合成示意画面已生成；仅在当前页面内显示。</p>
    </div>}
  </section>;
}
