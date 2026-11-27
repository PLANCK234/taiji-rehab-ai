"use client";

import { useState, type ReactNode } from "react";
import PoseCamera from "../participants/[id]/pose-lab/pose-camera";
import type { PatientPoseCounts, PatientReport } from "../../lib/patient-reports";
import PatientReportForm from "./report-form";
import PatientJourney from "./journey";
import type { LocalTeachingVideo } from "./local-teaching";

export default function PatientTaskFeedback({ initialReports, publicationVersion, cameraEnabled, learning, localVideos = [] }: {
  initialReports: PatientReport[] | null;
  learning: ReactNode;
  localVideos?: LocalTeachingVideo[];
  publicationVersion?: number;
  cameraEnabled: boolean;
}) {
  const [summary, setSummary] = useState<{ version: number | undefined; counts: PatientPoseCounts } | null>(null);
  const poseSummary = summary?.version === publicationVersion ? summary?.counts ?? null : null;
  return <PatientJourney learning={learning} localVideos={localVideos}
    training={cameraEnabled && publicationVersion !== undefined ? (active, showFeedback) => active ? <>
      <p className="note">以下摄像头功能仅用于合成流程演示，不提供训练指导。</p>
      <PoseCamera key={publicationVersion} allowSummaryExport={false} taskVersion={publicationVersion}
        onNextStep={showFeedback} onTaskSummary={(counts) => setSummary(counts ? { version: publicationVersion, counts } : null)} />
    </> : null : undefined}
    feedback={<PatientReportForm initialReports={initialReports} publicationVersion={publicationVersion}
      poseSummary={poseSummary} onPoseSummarySaved={(saved) => {
        setSummary((current) => current?.counts === saved ? null : current);
      }} />} />;
}
