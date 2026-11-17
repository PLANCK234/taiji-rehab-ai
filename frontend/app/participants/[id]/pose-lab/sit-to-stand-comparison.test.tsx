// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ManualPoseAnnotation } from "./pose-analysis";
import SitToStandComparison from "./sit-to-stand-comparison";

afterEach(cleanup);

function annotation(id: string, timestampMs: number): ManualPoseAnnotation {
  return {
    id, timestampMs, eventLabel: `=PRIVATE-${id}`, repeatIndex: null, phaseLabel: "",
    note: "PRIVATE", referenceJoint: null, manualReferenceAngleDeg: null, modelReferenceAngleDeg: null,
  };
}

function summaryValue(label: string) {
  return screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;
}

it("pairs one-to-one, reports signed differences and exports both kinds of unmatched rows", () => {
  const onExport = vi.fn();
  render(<SitToStandComparison candidateTimes={[500, 4000, 6000]}
    annotations={[annotation("a", 900), annotation("b", 3800), annotation("c", 8000)]}
    onExport={onExport} />);
  expect(summaryValue("已配对")).toBe("0 对");
  expect(summaryValue("未配对的程序候选")).toBe("3 条");
  expect(summaryValue("未配对的人工标注")).toBe("3 条");
  expect(summaryValue("平均绝对时间差")).toBe("暂无配对");
  fireEvent.change(screen.getByLabelText("候选 1 对应人工标注"), { target: { value: "a" } });
  const second = screen.getByLabelText<HTMLSelectElement>("候选 2 对应人工标注");
  expect(second.querySelector<HTMLOptionElement>('option[value="a"]')?.disabled).toBe(true);
  fireEvent.change(second, { target: { value: "a" } });
  expect(second.value).toBe("");
  fireEvent.change(second, { target: { value: "b" } });
  expect(screen.getByText("程序早 0.40 秒")).toBeTruthy();
  expect(screen.getByText("程序晚 0.20 秒")).toBeTruthy();
  expect(summaryValue("已配对")).toBe("2 对");
  expect(summaryValue("未配对的程序候选")).toBe("1 条");
  expect(summaryValue("未配对的人工标注")).toBe("1 条");
  expect(summaryValue("平均绝对时间差")).toBe("0.30 秒");
  expect(summaryValue("最大绝对时间差")).toBe("0.40 秒");
  fireEvent.click(screen.getByRole("button", { name: "导出坐站对照 CSV" }));
  expect(onExport).toHaveBeenCalledWith([
    "status,candidate_number,candidate_ms,manual_number,manual_ms,delta_ms",
    "paired,1,500.0,1,900.0,-400.0",
    "paired,2,4000.0,2,3800.0,200.0",
    "candidate_unpaired,3,6000.0,,,",
    "manual_unpaired,,,3,8000.0,",
  ].join("\n"));
  fireEvent.change(second, { target: { value: "" } });
  expect(screen.queryByText("程序晚 0.20 秒")).toBeNull();
  expect(summaryValue("已配对")).toBe("1 对");
  expect(summaryValue("平均绝对时间差")).toBe("0.40 秒");
  expect(summaryValue("未配对的人工标注")).toBe("2 条");
  expect(screen.getByRole("list", { name: "未配对的人工标注" }).textContent).toContain("3.80 秒");
});

it("clears deleted markings from results and can export a manual-only row", () => {
  const onExport = vi.fn();
  const view = render(<SitToStandComparison candidateTimes={[900]} annotations={[annotation("a", 900)]}
    onExport={onExport} />);
  fireEvent.change(screen.getByLabelText("候选 1 对应人工标注"), { target: { value: "a" } });
  expect(screen.getByText("同一时刻")).toBeTruthy();
  expect(summaryValue("平均绝对时间差")).toBe("0.00 秒");
  expect(summaryValue("最大绝对时间差")).toBe("0.00 秒");
  view.rerender(<SitToStandComparison candidateTimes={[900]} annotations={[]} onExport={onExport} />);
  expect(screen.queryByText("同一时刻")).toBeNull();
  expect(summaryValue("平均绝对时间差")).toBe("暂无配对");
  expect(summaryValue("未配对的程序候选")).toBe("1 条");
  view.rerender(<SitToStandComparison candidateTimes={[]} annotations={[annotation("b", 900)]}
    onExport={onExport} />);
  fireEvent.click(screen.getByRole("button", { name: "导出坐站对照 CSV" }));
  expect(onExport.mock.calls[0][0].split("\n")[1]).toBe("manual_unpaired,,,1,900.0,");
});
