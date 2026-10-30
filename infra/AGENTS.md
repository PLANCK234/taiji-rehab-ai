# Infrastructure agent instructions
- Synthetic data only in development and public demonstrations. No real PHI in logs, CI artifacts or error trackers.
- No real secrets in git. TLS, least privilege, encrypted backups and tested restores required before approved real-data use.
- Restrict DB and object storage to private networks. Keep production migration and deletion behind manual approvals.
- Every deployment has a versioned migration/backup/rollback plan and smoke tests.
- Read `docs/security/SECURITY.md` and `docs/operations/DEPLOYMENT.md`.
