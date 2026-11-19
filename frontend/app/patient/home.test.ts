import { describe, expect, it, vi } from "vitest";
import { readPatientHome } from "./home";

describe("readPatientHome", () => {
  it("returns the current patient home", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      study_code: "SYN-001", publication: null,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(readPatientHome("session=value", fetcher)).resolves.toEqual({
      kind: "ready", home: { study_code: "SYN-001", publication: null },
    });
  });

  it("distinguishes an unavailable binding from a service error", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(readPatientHome("session=value", fetcher)).resolves.toEqual({
      kind: "binding_unavailable",
    });
  });

  it("distinguishes an expired session", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    await expect(readPatientHome("session=value", fetcher)).resolves.toEqual({
      kind: "session_expired",
    });
  });

  it("reports server and network failures as unavailable service", async () => {
    const serverFailure = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(readPatientHome("session=value", serverFailure)).resolves.toEqual({
      kind: "service_unavailable",
    });

    const networkFailure = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(readPatientHome("session=value", networkFailure)).resolves.toEqual({
      kind: "service_unavailable",
    });
  });
});
