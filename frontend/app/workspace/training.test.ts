import { describe, expect, it, vi } from "vitest";
import {
  getTrainingFeedback, getTrainingSessions, localTimeToUtc, writeTraining,
} from "./training";

describe("training observation client", () => {
  it("keeps denied reads distinct from an empty history", async () => {
    const denied = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, { status: 403 }),
    );
    expect(await getTrainingSessions("participant", "taiji_session=token", denied)).toBeNull();
    expect(await getTrainingFeedback("session", "taiji_session=token", denied)).toBeNull();
    const empty = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }),
    );
    expect(await getTrainingFeedback("session", "taiji_session=token", empty)).toEqual([]);
    expect(empty.mock.calls[0][0]).toContain("/training-sessions/session/feedback");
  });

  it("requires CSRF and sends an idempotent correction to the API", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{"revision_no":2}', {
        status: 200, headers: { "Content-Type": "application/json" },
      }),
    );
    expect(await writeTraining("/training-sessions/a/feedback", {}, "key-1", "", "PUT", fetcher))
      .toEqual({ status: 403, value: null });
    expect(fetcher).not.toHaveBeenCalled();
    const payload = { expected_revision: 1, state: "recorded", rpe: 6 };
    const result = await writeTraining(
      "/training-sessions/a/feedback", payload, "key-1",
      "taiji_csrf=csrf-value; taiji_session=session", "PUT", fetcher,
    );
    expect(result).toEqual({ status: 200, value: { revision_no: 2 } });
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: "PUT",
      headers: {
        "X-CSRF-Token": "csrf-value",
        "Idempotency-Key": "key-1",
      },
      body: JSON.stringify(payload),
    });
  });

  it("validates browser local time before writing", () => {
    expect(localTimeToUtc("not-a-date")).toBeNull();
    expect(localTimeToUtc("2026-10-01T09:30")).toMatch(/^2026-10-01T/);
  });
});
