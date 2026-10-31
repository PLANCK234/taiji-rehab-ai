import { describe, expect, it, vi } from "vitest";
import {
  getAssessmentTrend, getParticipantAssessments, localTimeToUtc, measurementText, writeAssessment,
  type AssessmentRevision,
} from "./assessments";

const revision: AssessmentRevision = {
  id: "revision", assessment_id: "assessment", revision_no: 2, state: "draft",
  metric_code: "sppb_total", raw_value: 0, unit: "points", validity: "valid",
  missing_reason: null, performed_at: "2026-10-01T01:30:00Z",
  source: "manual_staff_entry", change_reason: null, recorded_by: "staff",
  recorded_at: "2026-10-01T01:40:00Z",
};

describe("manual assessment client", () => {
  it("keeps observed zero distinct from missing and unrecorded", () => {
    expect(measurementText(revision)).toBe("0 分");
    expect(measurementText({ ...revision, validity: "missing", raw_value: null, missing_reason: "declined" })).toBe("缺失（拒测）");
    expect(measurementText({ ...revision, validity: "unrecorded", raw_value: null })).toBe("未录入");
    expect(measurementText({ ...revision, validity: "invalid", raw_value: 13, missing_reason: "technical_failure" })).toContain("无效");
  });

  it("requires CSRF and sends revision writes with an idempotency key", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => revision });
    expect(await writeAssessment("/assessments/one/measurements", {}, "key-000000000001", "", "PUT", fetcher)).toEqual({ status: 403, value: null });
    expect(fetcher).not.toHaveBeenCalled();
    const result = await writeAssessment(
      "/assessments/one/measurements", { expected_revision: 1 }, "key-000000000001",
      "taiji_csrf=token", "PUT", fetcher,
    );
    expect(result.value).toEqual(revision);
    expect(fetcher.mock.calls[0][1].method).toBe("PUT");
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({
      "X-CSRF-Token": "token", "Idempotency-Key": "key-000000000001",
    });
  });

  it("does not present a denied list as an empty assessment history", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    expect(await getParticipantAssessments("id", "taiji_session=token", fetcher)).toBeNull();
  });

  it("keeps denied trend reads distinct from an authorized empty trend", async () => {
    const denied = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    expect(await getAssessmentTrend("id", "taiji_session=token", denied)).toBeNull();
    const empty = { participant_id: "id", entries: [] };
    const allowed = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => empty });
    expect(await getAssessmentTrend("id", "taiji_session=token", allowed)).toEqual(empty);
    expect(allowed.mock.calls[0][0]).toContain("/participants/id/assessment-trend");
    expect(allowed.mock.calls[0][1]).toMatchObject({
      headers: { cookie: "taiji_session=token" }, cache: "no-store",
    });
  });

  it("serializes a valid local time with an explicit UTC offset", () => {
    expect(localTimeToUtc("invalid")).toBeNull();
    expect(localTimeToUtc("2026-10-01T09:30")).toMatch(/Z$/);
  });
});
