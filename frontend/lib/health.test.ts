import { describe, expect, it, vi } from "vitest";
import { getApiHealth } from "./health";

describe("API health display state", () => {
  it("accepts only a successful explicit ok response", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });
    expect(await getApiHealth(fetcher, "http://api")).toBe("正常");
    expect(fetcher).toHaveBeenCalledWith("http://api/health", { cache: "no-store" });
  });

  it("reports unavailable on failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await getApiHealth(fetcher, "http://api")).toBe("不可用");
  });
});
