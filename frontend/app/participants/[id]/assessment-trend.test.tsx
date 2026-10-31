// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AssessmentRevision, AssessmentTrend } from "../../workspace/assessments";
import AssessmentTrendSection from "./assessment-trend";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    <a href={href}>{children}</a>,
}));

afterEach(cleanup);

const confirmedZero: AssessmentRevision = {
  id: "r3", assessment_id: "baseline", revision_no: 3, state: "confirmed",
  metric_code: "sppb_total", raw_value: 0, unit: "points", validity: "valid",
  missing_reason: null, performed_at: "2026-10-01T01:30:00Z",
  source: "manual_staff_entry", change_reason: null, recorded_by: "staff",
  recorded_at: "2026-10-01T02:00:00Z",
};

describe("synthetic assessment trend", () => {
  it("plots only confirmed valid values and separates a correction draft and missing visit", () => {
    const trend: AssessmentTrend = {
      participant_id: "participant",
      entries: [
        {
          assessment_id: "baseline", visit_kind: "baseline", created_at: "2026-10-01T01:00:00Z",
          current: { ...confirmedZero, id: "r4", revision_no: 4, state: "draft", raw_value: 5 },
          latest_confirmed: confirmedZero,
        },
        {
          assessment_id: "revisit", visit_kind: "revisit", created_at: "2026-10-08T01:00:00Z",
          current: {
            ...confirmedZero, id: "r7", assessment_id: "revisit", state: "confirmed",
            raw_value: null, validity: "missing", missing_reason: "declined", performed_at: null,
          },
          latest_confirmed: {
            ...confirmedZero, id: "r7", assessment_id: "revisit",
            raw_value: null, validity: "missing", missing_reason: "declined", performed_at: null,
          },
        },
        {
          assessment_id: "unconfirmed", visit_kind: "revisit",
          created_at: "2026-10-22T01:00:00Z",
          current: {
            ...confirmedZero, id: "r8", assessment_id: "unconfirmed", revision_no: 1,
            state: "draft", raw_value: null, validity: "unrecorded", performed_at: null,
          },
          latest_confirmed: null,
        },
      ],
    };
    render(<AssessmentTrendSection trend={trend} />);
    expect(screen.getByText(/已确认有效 1 条 · 缺失 1 条/)).toBeTruthy();
    expect(screen.getByText("待确认：5 分")).toBeTruthy();
    expect(screen.getByText("缺失（拒测）")).toBeTruthy();
    expect(screen.getByText("尚无已确认版本")).toBeTruthy();
    const meters = screen.getAllByRole("meter");
    expect(meters).toHaveLength(1);
    expect(meters[0].getAttribute("value")).toBe("0");
    expect(screen.queryByText("Ⅳ级")).toBeNull();
  });

  it("keeps a failed read separate from a participant with no records", () => {
    const view = render(<AssessmentTrendSection trend={null} />);
    expect(screen.getByText("趋势记录暂不可用；请稍后重试。")).toBeTruthy();
    view.rerender(<AssessmentTrendSection trend={{ participant_id: "participant", entries: [] }} />);
    expect(screen.getByText("暂无评估记录。")).toBeTruthy();
    expect(screen.queryByText("趋势记录暂不可用；请稍后重试。")).toBeNull();
  });
});
