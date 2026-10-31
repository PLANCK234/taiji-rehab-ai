import { createServer } from "node:http";

const participantId = "11111111-1111-4111-8111-111111111111";
const sessionCookie = "taiji_session=synthetic-browser-only";

const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://127.0.0.1:8765").pathname;
  let status = 200;
  let payload;

  if (path === "/health") {
    payload = { status: "ok" };
  } else if (!request.headers.cookie?.split(";").some((part) => part.trim() === sessionCookie)) {
    status = 401;
    payload = { detail: "unauthorized" };
  } else if (path === "/api/v1/auth/me") {
    payload = {
      id: "22222222-2222-4222-8222-222222222222",
      email: "synthetic-clinician@example.org",
      role: "clinician",
    };
  } else if (path === `/api/v1/participants/${participantId}`) {
    payload = {
      id: participantId,
      study_id: "33333333-3333-4333-8333-333333333333",
      study_code: "SYN-001",
    };
  } else if (path === `/api/v1/participants/${participantId}/consents`) {
    payload = { state: "granted", records: [{ photo_scope: true }] };
  } else if (path.startsWith("/api/v1/participants/")) {
    status = 403;
    payload = { detail: "forbidden" };
  } else {
    status = 404;
    payload = { detail: "not found" };
  }

  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
});

server.listen(8765, "127.0.0.1");
