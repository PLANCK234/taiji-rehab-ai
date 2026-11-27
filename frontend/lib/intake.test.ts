import { describe, expect, it, vi } from "vitest";
import { csrfFromCookies, getAssignedParticipants, postIntake } from "./intake";

describe("synthetic intake client", () => {
  it("reads the local or secure CSRF cookie and blocks writes when absent", async () => {
    expect(csrfFromCookies("taiji_csrf=local-token; other=1")).toBe("local-token");
    expect(csrfFromCookies("__Host-taiji_csrf=secure-token")).toBe("secure-token");
    const fetcher = vi.fn();
    expect(await postIntake("/participants", {}, "key-000000000000", "", fetcher)).toEqual({
      status: 403,
      value: null,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends CSRF and idempotency headers on a coded create", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "one" }) });
    const result = await postIntake<{ id: string }>(
      "/participants", { study_code: "SYN-ONE" }, "key-000000000001", "taiji_csrf=token", fetcher,
    );
    expect(result).toEqual({ status: 201, value: { id: "one" } });
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({
      "X-CSRF-Token": "token",
      "Idempotency-Key": "key-000000000001",
    });
  });

  it("does not turn a denied participant list into an empty authorized list", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    expect(await getAssignedParticipants("taiji_session=token", fetcher)).toBeNull();
  });
});
