/**
 * One HTTP layer for every page.
 *
 * - `apiGet` runs on the server (Next.js) and forwards the staff session cookie.
 *   It returns `null` for denied/unavailable reads, which callers must show as
 *   "unavailable" — never as an empty list.
 * - `apiSend` runs in the browser through the same-origin `/api/v1` rewrite and
 *   always carries the CSRF token and an idempotency key so retries are safe.
 */

export type WriteResult<T> = { status: number; value: T | null };
export type HttpMethod = "POST" | "PUT";

export function apiBase(): string {
  return process.env.API_INTERNAL_URL ?? "http://localhost:8000";
}

export function csrfFromCookies(cookieHeader: string): string | null {
  for (const name of ["__Host-taiji_csrf", "taiji_csrf"]) {
    const entry = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`));
    if (entry) return decodeURIComponent(entry.slice(name.length + 1));
  }
  return null;
}

export async function apiGet<T>(
  path: string,
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
  baseUrl = apiBase(),
): Promise<T | null> {
  try {
    const response = await fetcher(`${baseUrl}/api/v1${path}`, {
      headers: { cookie: cookieHeader }, cache: "no-store",
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function apiSend<T>(
  path: string,
  body: object,
  options: { key?: string; cookie?: string; method?: HttpMethod; fetcher?: typeof fetch } = {},
): Promise<WriteResult<T>> {
  const { key = crypto.randomUUID(), method = "POST", fetcher = fetch } = options;
  const csrf = csrfFromCookies(options.cookie ?? document.cookie);
  if (!csrf) return { status: 403, value: null };
  try {
    const response = await fetcher(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf, "Idempotency-Key": key },
      body: JSON.stringify(body),
    });
    return { status: response.status, value: response.ok ? ((await response.json()) as T) : null };
  } catch {
    return { status: 503, value: null };
  }
}

const GENERIC: Record<number, string> = {
  401: "登录已过期，请重新登录。",
  403: "没有此操作权限，或会话已失效，请刷新页面。",
  409: "记录已被更新，请刷新后再试。",
  422: "输入有误，请检查后重试。",
  429: "操作过于频繁，请稍后重试。",
};

/** Human-readable error for a failed write; `specific` refines the generic wording per form. */
export function errorText(status: number, specific: Partial<Record<number, string>> = {}): string {
  return specific[status] ?? GENERIC[status] ?? "服务暂不可用，请稍后重试。";
}
