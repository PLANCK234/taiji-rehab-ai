// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { PatientReport } from "../../workspace/patient-reports";
import StaffPatientReports from "./staff-patient-reports";

afterEach(cleanup);

const first: PatientReport = {
  id: "a-1", report_id: "report-a", participant_id: "synthetic-participant",
  revision_no: 1, observed_at: "2026-11-05T02:00:00Z",
  activity_state: "performed", actual_minutes: 12,
  discomfort_state: "reported", discomfort_note: "合成不适描述",
  change_reason: null, recorded_by: "synthetic-patient",
  recorded_at: "2026-11-05T02:05:00Z",
};

it("groups out-of-order revisions under the latest report and preserves old facts", () => {
  const second: PatientReport = {
    ...first, id: "a-2", revision_no: 2, actual_minutes: 0,
    discomfort_state: "none", discomfort_note: null,
    change_reason: "SYN-更正", recorded_at: "2026-11-05T03:05:00Z",
  };
  const third: PatientReport = {
    ...second, id: "a-3", revision_no: 3, actual_minutes: null,
    activity_state: "unknown", change_reason: "SYN-再更正",
    recorded_at: "2026-11-05T04:05:00Z",
  };
  const other: PatientReport = {
    ...first, id: "b-1", report_id: "report-b", revision_no: 1,
    activity_state: "unknown", actual_minutes: null,
    discomfort_state: "unknown", discomfort_note: null,
    recorded_at: "2026-11-05T05:05:00Z",
  };
  const { container } = render(<StaffPatientReports reports={[first, third, other, second]} />);

  const current = [...container.querySelectorAll("section > ul > li")];
  expect(current).toHaveLength(2);
  expect(current[0].querySelector("p")?.textContent).toContain("当前版本 1");
  expect(current[0].querySelector("p")?.textContent).toContain("训练情况不清楚");
  expect(current[0].querySelector("p")?.textContent).toContain("不适情况不清楚");
  expect(current[1].querySelector("p")?.textContent).toContain("当前版本 3");
  expect(current[1].querySelector("p")?.textContent).toContain("时长未知");
  expect(current[1].querySelector("p")?.textContent).toContain("发生时间（北京时间）");
  expect(current[1].querySelector("p")?.textContent).toContain("保存时间（北京时间）");
  expect(current[1].querySelector("p")?.textContent).toContain("10:00");

  const history = screen.getByText("查看旧版本（2）").closest("details");
  const older = [...(history?.querySelectorAll("li") ?? [])].map((row) => row.textContent ?? "");
  expect(older).toHaveLength(2);
  expect(older[0]).toContain("旧版本 2");
  expect(older[0]).toContain("0 分钟");
  expect(older[0]).toContain("SYN-更正");
  expect(older[1]).toContain("旧版本 1");
  expect(older[1]).toContain("12 分钟");
  expect(older[1]).toContain("合成不适描述");
  expect(current[0].querySelector("details")).toBeNull();
});

it("keeps unavailable and empty histories distinct", () => {
  const unavailable = render(<StaffPatientReports reports={null} />);
  expect(screen.getByText("患者自报记录暂不可用。")).toBeTruthy();
  unavailable.unmount();
  render(<StaffPatientReports reports={[]} />);
  expect(screen.getByText("暂无患者自报；训练与不适状态未知。")).toBeTruthy();
});
