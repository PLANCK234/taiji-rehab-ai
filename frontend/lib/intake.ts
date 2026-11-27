import { apiGet, apiSend, errorText, type WriteResult } from "./api";

export { csrfFromCookies } from "./api";

export type CodedParticipant = { id: string; study_id: string; study_code: string };
export type DemoProfile = {
  participant_id: string;
  age: number | null;
  sex: "female" | "male" | "other" | "unknown" | null;
  needs_assistance: boolean | null;
  note: string | null;
};
export type DemoProfileRevision = DemoProfile & {
  id: string | null;
  revision_no: number;
  change_reason: string | null;
  recorded_by: string | null;
  recorded_at: string | null;
  source: "created" | "corrected" | "legacy_initial";
};
export type DemoProfileHistory = {
  participant_id: string;
  current_revision: number;
  records: DemoProfileRevision[];
};
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

const readScoped = apiGet;

export function getAssignedParticipants(cookieHeader: string, fetcher?: typeof fetch) {
  return readScoped<CodedParticipant[]>("/participants", cookieHeader, fetcher);
}

export async function findAssignedParticipant(studyId: string, studyCode: string) {
  const participants = await readScoped<CodedParticipant[]>("/participants", "", fetch, "");
  return participants?.find((row) => row.study_id === studyId && row.study_code === studyCode);
}

export function getParticipant(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readScoped<CodedParticipant>(`/participants/${encodeURIComponent(id)}`, cookieHeader, fetcher);
}

export function getDemoProfile(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readScoped<DemoProfile>(`/participants/${encodeURIComponent(id)}/demo-profile`, cookieHeader, fetcher);
}

export function getDemoProfileHistory(id: string, cookieHeader: string, fetcher?: typeof fetch) {
  return readScoped<DemoProfileHistory>(`/participants/${encodeURIComponent(id)}/demo-profile/revisions`, cookieHeader, fetcher);
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

export function postIntake<T>(
  path: string, body: object, key: string, cookieHeader: string, fetcher: typeof fetch = fetch, signal?: AbortSignal,
): Promise<WriteResult<T>> {
  return apiSend<T>(path, body, { key, cookie: cookieHeader, fetcher, signal });
}

export function intakeError(status: number): string {
  return errorText(status, {
    409: "编号或提交记录冲突，请核对后重试。",
    422: "输入格式有误：编号需以 SYN- 开头，仅含大写字母、数字、- 或 _。",
  });
}
