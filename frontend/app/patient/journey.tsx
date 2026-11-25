"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./journey.module.css";
import TeachingPlayer from "./teaching-player";
import type { LocalTeachingVideo } from "./local-teaching";

const steps = [
  { name: "学习", detail: "了解内容", title: "学习 · 训练计划与视频" },
  { name: "准备", detail: "检查取景", title: "准备 · 摄像头与环境" },
  { name: "训练", detail: "查看训练入口", title: "训练 · 等待功能接入" },
  { name: "反馈", detail: "记录与回顾", title: "反馈 · 训练与不适记录" },
];

export default function PatientJourney({ learning, feedback, localVideos = [] }: {
  learning: ReactNode;
  feedback: ReactNode;
  localVideos?: LocalTeachingVideo[];
}) {
  const [current, setCurrent] = useState(0);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headings.current[current]?.focus();
  }, [current]);

  return <div className={styles.journey}>
    <div className={styles.intro}>
      <h2>四步体验</h2>
      <p>先了解内容，再查看准备和训练入口，最后记录反馈。也可以直接查看已有记录。</p>
      <p className="note">当前仅供合成流程演示。切换步骤不会开始训练，也不表示已完成训练。</p>
    </div>
    <nav aria-label="患者四步流程">
      <ol className={styles.steps}>
        {steps.map((step, index) => <li key={step.name}>
          <button type="button" aria-label={`${index + 1}. ${step.name}`} aria-current={current === index ? "step" : undefined}
            aria-controls={`patient-step-${index}`} onClick={() => setCurrent(index)}>
            <span className={styles.number} aria-hidden="true">{index + 1}</span>
            <span><strong>{step.name}</strong><small>{step.detail}</small></span>
          </button>
        </li>)}
      </ol>
    </nav>
    <p className={styles.position} role="status">第 {current + 1} 步，共 4 步 · 当前查看：{steps[current].name}</p>
    {steps.map((step, index) => <div key={step.name} id={`patient-step-${index}`}
      hidden={current !== index} role="region" aria-labelledby={`patient-step-title-${index}`}>
      <h2 className={styles.heading} id={`patient-step-title-${index}`} tabIndex={-1}
        ref={(element) => { headings.current[index] = element; }}>{step.title}</h2>
      {index === 0 ? <><TeachingPlayer videos={localVideos} active={current === 0} />{learning}</> : index === 1 ? <section>
        <h3>取景准备</h3>
        <ul className={styles.checklist}>
          <li>将手机放稳，留意周围空间与光线。</li>
          <li>取景时让全身进入画面，避免遮挡。</li>
          <li>可以穿鞋，无需为了演示脱鞋。</li>
        </ul>
        <div className={styles.placeholder}>
          <strong>摄像头预览待接入</strong>
          <p>当前不会打开摄像头。后续将在这里显示预览、权限提示和重试入口。</p>
          <button type="button" disabled>摄像头尚未接入</button>
        </div>
      </section> : index === 2 ? <section>
        <h3>训练尚未开始</h3>
        <p>训练任务和操作功能待接入，当前不能开始训练。姿态识别算法尚未接入。</p>
        <div className={styles.placeholder}>
          <strong>训练操作待接入</strong>
          <p>这里将提供开始、暂停、继续和结束入口；目前没有训练计时或完成结果。</p>
          <button type="button" disabled>开始训练（待接入）</button>
        </div>
        <p className="note">如需填写已经发生的合成演示记录，可直接前往反馈。</p>
      </section> : <>
        <p className="note">这里沿用本人事实记录，尚未关联四步训练任务。切换步骤会保留未提交内容；刷新或离开页面不会保留未提交内容。</p>
        {feedback}
      </>}
    </div>)}
    <div className={styles.navigation}>
      <button className={styles.secondary} type="button" disabled={current === 0}
        onClick={() => setCurrent(current - 1)}>上一步</button>
      {current < steps.length - 1 ? <button type="button" onClick={() => setCurrent(current + 1)}>
        查看{steps[current + 1].name} →
      </button> : <button className={styles.secondary} type="button" onClick={() => setCurrent(0)}>返回学习</button>}
    </div>
  </div>;
}
