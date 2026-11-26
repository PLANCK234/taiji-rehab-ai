"use client";

import { useState } from "react";
import PoseCamera from "../participants/[id]/pose-lab/pose-camera";
import type { PatientPoseCounts, PatientReport } from "../workspace/patient-reports";
import PatientReportForm from "./report-form";

export default function PatientTaskFeedback({ initialReports, publicationVersion, cameraEnabled }: {
  initialReports: PatientReport[] | null;
  publicationVersion?: number;
  cameraEnabled: boolean;
}) {
  const [poseSummary, setPoseSummary] = useState<PatientPoseCounts | null>(null);
  return <>
    {cameraEnabled && publicationVersion !== undefined && <>
      <p className="note">以下摄像头功能仅用于合成流程演示，不提供训练指导。</p>
      <PoseCamera allowSummaryExport={false} taskVersion={publicationVersion}
        nextStepHeadingId="patient-report-heading" onTaskSummary={setPoseSummary} />
    </>}
    <PatientReportForm initialReports={initialReports} publicationVersion={publicationVersion}
      poseSummary={poseSummary} onPoseSummarySaved={(saved) => {
        setPoseSummary((current) => current === saved ? null : current);
      }} />
  </>;
}
