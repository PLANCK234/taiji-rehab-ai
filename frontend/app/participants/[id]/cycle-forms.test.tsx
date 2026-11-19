// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { SyntheticCycle } from "../../workspace/cycles";
import type { TrainingTimeline } from "../../workspace/training";
import CycleForms from "./cycle-forms";

afterEach(cleanup);

const cycle: SyntheticCycle = {
  id: "cycle", label: "合成周期", visits: [
    {
      id: "old", visit_id: "visit", revision_no: 1, label: "合成访视",
      attendance: "unknown", assessment_state: "unknown", assessment_id: null,
      training_session_ids: [], change_reason: null, recorded_at: "2026-10-01T00:00:00Z",
    },
    {
      id: "current", visit_id: "visit", revision_no: 2, label: "合成访视",
      attendance: "attended", assessment_state: "not_measured", assessment_id: null,
      training_session_ids: ["zero", "missing-link"], change_reason: "SYN-REVISION",
      recorded_at: "2026-10-02T00:00:00Z",
    },
  ],
};
const timeline: TrainingTimeline = {
  participant_id: "participant", entries: [
    {
      session_id: "zero", session_at: "2026-10-01T01:00:00Z",
      completion_status: "partial", actual_minutes: 0,
      feedback_state: "recorded", rpe: 6,
    },
  ],
};

describe("synthetic cycle linked observations", () => {
  it("uses the latest visit links and distinguishes observed zero from unavailable details", () => {
    render(<CycleForms participantId="participant" initialCycles={[cycle]}
      assessments={[]} sessions={[]} trainingTimeline={timeline} canWrite={false} />);
    const linked = screen.getByRole("list", { name: "合成访视 的关联训练观察" });
    expect(within(linked).getByText(/记录为部分完成 · 实际 0 分钟 · 反馈已记录 · RPE 6/)).toBeTruthy();
    expect(within(linked).getByText(/关联训练详情暂不可用/)).toBeTruthy();
    expect(screen.getByText(/版本 2/)).toBeTruthy();
    expect(screen.queryByText(/完成率/)).toBeNull();
  });
});
