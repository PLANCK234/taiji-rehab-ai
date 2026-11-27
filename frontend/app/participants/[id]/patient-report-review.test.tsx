// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import PatientReportReview from "./patient-report-review";
import { postIntake } from "../../../lib/intake";
import type { PatientReview } from "../../../lib/patient-reviews";

vi.mock("../../../lib/intake", () => ({ postIntake: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const review = {
  id: "review-1", report_revision_id: "revision-1", review_no: 1,
  result: "unable" as const, note: "SYN-无法判定", recorded_by: "staff-1", recorded_at: "2026-11-23T01:00:00Z",
};

it("preserves failed input and idempotency key, then appends successful review", async () => {
  vi.mocked(postIntake).mockResolvedValueOnce({ status: 503, value: null })
    .mockResolvedValueOnce({ status: 201, value: review });
  function ReviewForm() {
    const [reviews, setReviews] = useState<PatientReview[]>([]);
    return <PatientReportReview participantId="p1" revisionId="revision-1" reviews={reviews}
      onSaved={(saved) => setReviews([saved])} />;
  }
  render(<ReviewForm />);
  fireEvent.change(screen.getByLabelText("复核结果"), { target: { value: "unable" } });
  fireEvent.change(screen.getByLabelText(/复核备注/), { target: { value: "SYN-无法判定" } });
  fireEvent.click(screen.getByRole("button", { name: "保存复核" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText(/复核备注/) as HTMLTextAreaElement).value).toBe("SYN-无法判定");
  fireEvent.click(screen.getByRole("button", { name: "保存复核" }));
  await screen.findByText("复核已保存，原始反馈未改变。");
  const calls = vi.mocked(postIntake).mock.calls;
  expect(calls[0][2]).toBe(calls[1][2]);
  expect(screen.getByText("本版复核：无法判定")).toBeTruthy();
  expect(screen.getByText(/复核人员编号：staff-1/)).toBeTruthy();
});

it("does not carry old-revision reviews forward or allow writes when unavailable/read-only", () => {
  const { rerender } = render(<PatientReportReview participantId="p1" revisionId="revision-2" reviews={[review]} />);
  expect(screen.getByText("本版反馈待复核")).toBeTruthy();
  expect(screen.queryByText(/SYN-无法判定/)).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  rerender(<PatientReportReview participantId="p1" revisionId="revision-1" reviews={null} onSaved={vi.fn()} />);
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.getByText(/复核记录暂不可用/)).toBeTruthy();
});

it("retains the draft on stale-source conflict and sends exact revision", async () => {
  vi.mocked(postIntake).mockResolvedValue({ status: 409, value: null });
  render(<PatientReportReview participantId="p1" revisionId="revision-1" reviews={[review]} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("复核结果"), { target: { value: "reviewed" } });
  fireEvent.change(screen.getByLabelText(/复核备注/), { target: { value: "SYN-核对记录" } });
  fireEvent.click(screen.getByRole("button", { name: "保存复核" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("版本已变化"));
  expect(vi.mocked(postIntake).mock.calls[0][1]).toMatchObject({ report_revision_id: "revision-1", expected_review_no: 1 });
  expect((screen.getByLabelText(/复核备注/) as HTMLTextAreaElement).value).toBe("SYN-核对记录");
});
