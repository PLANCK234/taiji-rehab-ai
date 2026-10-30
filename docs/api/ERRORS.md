# API error conventions

Implemented S1 endpoints return a stable object:
```json
{"error":{"code":"FORBIDDEN","message":"没有访问权限","request_id":"example-request-id","details":{}}}
```
`request_id` may be logged; do not include patient identity in the error or logs.

Current S1 handlers return generic Chinese messages and empty `details` for 401/403/404/409/429/503 and validation 422. This avoids echoing credentials or object identifiers. The 409 code covers duplicate synthetic codes and reused idempotency keys. Remaining domain-specific codes below are future contracts.

| HTTP | Code | Scenario |
|---|---|---|
| 400 | BAD_REQUEST | malformed request |
| 401 | AUTH_REQUIRED | missing/expired session |
| 403 | FORBIDDEN | role or participant scope violation |
| 409 | VERSION_CONFLICT | stale revision or duplicate non-idempotent action |
| 409 | CLINICAL_RULE_UNAPPROVED | attempted real-study use of draft rules |
| 422 | INVALID_INPUT | malformed S1 input |
| 422 | INVALID_MEASUREMENT | future invalid units/range/missingness |
| 422 | CONSENT_REQUIRED | missing applicable authorization |
| 423 | SNAPSHOT_LOCKED | trying to edit immutable snapshot |
| 429 | RATE_LIMITED | repeated auth or export requests |
| 503 | SERVICE_UNAVAILABLE | DB/object storage unavailable |

Safety reporting should permit partial data and accept event intake independently of completed feedback; avoid broad error responses that prevent adverse-event reporting.
