# API error conventions

Use a stable object such as:
```json
{"error":{"code":"CONSENT_REQUIRED","message":"影像采集需要有效授权","request_id":"example-request-id","details":{}}}
```
`request_id` may be logged; do not include patient identity in the error or logs.

| HTTP | Code | Scenario |
|---|---|---|
| 400 | BAD_REQUEST | malformed request |
| 401 | AUTH_REQUIRED | missing/expired session |
| 403 | FORBIDDEN | role or participant scope violation |
| 409 | VERSION_CONFLICT | stale revision or duplicate non-idempotent action |
| 409 | CLINICAL_RULE_UNAPPROVED | attempted real-study use of draft rules |
| 422 | INVALID_MEASUREMENT | invalid units/range/missingness |
| 422 | CONSENT_REQUIRED | missing applicable authorization |
| 423 | SNAPSHOT_LOCKED | trying to edit immutable snapshot |
| 429 | RATE_LIMITED | repeated auth or export requests |
| 503 | SERVICE_UNAVAILABLE | DB/object storage unavailable |

Safety reporting should permit partial data and accept event intake independently of completed feedback; avoid broad error responses that prevent adverse-event reporting.
