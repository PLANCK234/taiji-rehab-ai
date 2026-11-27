export type HealthState = "正常" | "不可用";

export async function getApiHealth(
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000",
): Promise<HealthState> {
  try {
    const response = await fetcher(`${baseUrl}/health`, { cache: "no-store" });
    if (!response.ok) return "不可用";
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && "status" in body && body.status === "ok"
      ? "正常"
      : "不可用";
  } catch {
    return "不可用";
  }
}
