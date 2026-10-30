import { describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "./auth";

describe("workspace session guard", () => {
  it("does not request user data without a cookie", async () => {
    const fetcher = vi.fn();
    expect(await getCurrentUser("", fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects an expired or invalid session", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    expect(await getCurrentUser("taiji_session=invalid", fetcher, "http://api")).toBeNull();
  });
});
