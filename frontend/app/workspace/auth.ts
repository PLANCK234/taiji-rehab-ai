export type CurrentUser = { id: string; email: string; role: string };
export type AssignedStudy = { id: string; code: string };

export async function getCurrentUser(
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000",
): Promise<CurrentUser | null> {
  if (!cookieHeader) return null;
  try {
    const response = await fetcher(`${baseUrl}/api/v1/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as CurrentUser;
  } catch {
    return null;
  }
}

export async function getAssignedStudies(
  cookieHeader: string,
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000",
): Promise<AssignedStudy[] | null> {
  try {
    const response = await fetcher(`${baseUrl}/api/v1/studies`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as AssignedStudy[];
  } catch {
    return null;
  }
}
