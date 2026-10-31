"use client";

import { useState } from "react";

export default function SyntheticPoseDemo() {
  const [visible, setVisible] = useState(false);

  return <section aria-labelledby="pose-demo-heading">
    <h2 id="pose-demo-heading">合成姿态预览演示</h2>
    <p>姿态识别算法尚未接入</p>
    <p className="note">仅显示程序绘制的虚构示意图；不调用摄像头，不选择或上传照片，也不保存图像。</p>
    <button type="button" aria-expanded={visible} aria-controls="synthetic-pose-preview" onClick={() => setVisible(!visible)}>
      {visible ? "收起合成预览" : "查看合成预览"}
    </button>
    {visible ? <div id="synthetic-pose-preview" className="pose-preview" role="img" aria-label="程序绘制的虚构站姿示意，并非研究对象照片或识别结果">
      <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false">
        <rect x="0" y="0" width="240" height="240" rx="12" fill="#edf5f0" />
        <circle cx="120" cy="48" r="18" fill="#39795e" />
        <path d="M120 67 L120 142 M120 89 L76 115 M120 89 L164 115 M120 142 L88 207 M120 142 L152 207" fill="none" stroke="#39795e" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <text x="120" y="229" textAnchor="middle" fill="#285c46" fontSize="12">SYNTHETIC DEMO</text>
      </svg>
      <p>合成示意 · 无姿态分析结果</p>
    </div> : null}
  </section>;
}
