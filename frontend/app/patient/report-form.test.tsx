// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import PatientReportForm from "./report-form";
import type { PatientReport } from "../workspace/patient-reports";

afterEach(cleanup);

const first: PatientReport = {
  id: "revision-1", report_id: "report-1", participant_id: "synthetic-participant",
  revision_no: 1, observed_at: "2026-11-05T02:00:00Z",
  activity_state: "unknown", actual_minutes: null,
  discomfort_state: "unknown", discomfort_note: null,
  change_reason: null, recorded_by: "synthetic-patient",
  recorded_at: "2026-11-05T02:05:00Z",
};

it("shows full current and previous synthetic facts in revision order", () => {
  const second: PatientReport = {
    ...first, id: "revision-2", revision_no: 2,
    observed_at: "2026-11-05T03:00:00Z", activity_state: "performed",
    actual_minutes: 12, discomfort_state: "reported",
    discomfort_note: "合成不适描述", change_reason: "SYN-补录",
    recorded_at: "2026-11-05T03:05:00Z",
  };
  const third: PatientReport = {
    ...second, id: "revision-3", revision_no: 3,
    observed_at: "2026-11-05T04:00:00Z", actual_minutes: 0,
    discomfort_state: "none", discomfort_note: null,
    change_reason: "SYN-再次更正", recorded_at: "2026-11-05T04:05:00Z",
  };
  render(<PatientReportForm initialReports={[first, third, second]} />);

  const current = screen.getByText("当前版本 3").closest("p")?.textContent ?? "";
  expect(current).toContain("12:00");
  expect(current).toContain("0 分钟");
  expect(current).toContain("自报没有不适");
  expect(current).toContain("SYN-再次更正");
  expect(current).toContain("保存时间");

  const history = screen.getByText("查看旧版本").closest("details");
  const revisions = [...(history?.querySelectorAll("li") ?? [])].map((row) => row.textContent ?? "");
  expect(revisions).toHaveLength(2);
  expect(revisions[0]).toContain("旧版本 2");
  expect(revisions[0]).toContain("11:00");
  expect(revisions[0]).toContain("12 分钟");
  expect(revisions[0]).toContain("合成不适描述");
  expect(revisions[0]).toContain("SYN-补录");
  expect(revisions[1]).toContain("旧版本 1");
  expect(revisions[1]).toContain("10:00");
  expect(revisions[1]).toContain("时长未知");
  expect(revisions[1]).toContain("不适情况不清楚");
});
