export type CodedParticipant = { id: string; study_id: string; study_code: string };
export type ConsentRecord = {
  id: string;
  participant_id: string;
  document_version: string;
  purpose_code: string;
  decision: "granted" | "refused" | "withdrawn";
  photo_scope: boolean;
  change_reason: string | null;
  recorded_by: string;
  recorded_at: string;
};
export type ConsentHistory = {
  state: "not_recorded" | ConsentRecord["decision"];
  records: ConsentRecord[];
};
export type ScreeningRecord = {
  id: string;
  participant_id: string;
  item_code: string;
  answer: "yes" | "no" | "unknown";
  change_reason: string | null;
  recorded_by: string;
  recorded_at: string;
};
export type ScreeningHistory = {
  review_state: "not_assessed" | "needs_review";
  records: ScreeningRecord[];
};

async function readScoped<T>(
  path: string,
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000",
): Promise<T | null> {
  try {
    const response = await fetcher(`${baseUrl}/api/v1${path}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export function getAssignedParticipants(cookieHeader: string, fetcher?: typeof fetch) {
  return readScoped<CodedParticipant[]>("/participants", cookieHeader, fetcher);
}

export function getParticipant(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readScoped<CodedParticipant>(`/participants/${encodeURIComponent(id)}`, cookieHeader, fetcher);
}

export function getConsentHistory(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readScoped<ConsentHistory>(
    `/participants/${encodeURIComponent(id)}/consents`, cookieHeader, fetcher,
  );
}

export function getScreeningHistory(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readScoped<ScreeningHistory>(
    `/participants/${encodeURIComponent(id)}/screenings`, cookieHeader, fetcher,
  );
}

export function csrfFromCookies(cookieHeader: string): string | null {
  for (const name of ["__Host-taiji_csrf", "taiji_csrf"]) {
    const entry = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    if (entry) return decodeURIComponent(entry.slice(name.length + 1));
  }
  return null;
}

export async function postIntake<T>(
  path: string,
  body: object,
  key: string,
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
): Promise<{ status: number; value: T | null }> {
  const csrf = csrfFromCookies(cookieHeader);
  if (!csrf) return { status: 403, value: null };
  try {
    const response = await fetcher(`/api/v1${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf,
        "Idempotency-Key": key,
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, value: response.ok ? ((await response.json()) as T) : null };
  } catch {
    return { status: 503, value: null };
  }
}

export function intakeError(status: number): string {
  if (status === 403) return "没有此操作权限，或会话已失效。";
  if (status === 409) return "编号或提交记录冲突，请核对后重试。";
  if (status === 422) return "输入无效；更正已有记录时需填写原因。";
  return "服务暂不可用，请稍后重试。";
}
