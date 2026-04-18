# Security Policy

This repository handles sensitive configuration (API keys, secrets, tokens).  
**Never commit secrets to version control.**

## Reporting a Vulnerability

If you find a vulnerability, report it privately to the repository owner/maintainer.
Do **not** open a public issue with exploit details.

---

## Secret Leak Incident Response (Fast Checklist)

Use this whenever a credential is exposed in chat, terminal logs, screenshots, commit history, or repository files.

### 1) Contain Immediately

- Revoke/rotate exposed secret in the provider dashboard (Cloudinary, JWT provider, DB provider, etc.).
- Assume the old secret is compromised.
- Update local `.env` with the new value.
- Restart backend services that load env vars at startup.

### 2) Remove Exposure from Repository State

- Ensure all env files are ignored:
  - `.env`
  - `.env.*`
  - `backend/.env`
  - `frontend/.env`
  - `mobile/.env`
- If env files were tracked before, remove them from index while keeping local copies.
- Commit and push the cleanup.

### 3) Verify No Tracked Secrets Remain

Check that:

- Env files are not tracked.
- Tracked files do not contain leaked key fragments or full secret strings.
- CI/CD variables and deployment platform secrets are updated.

### 4) Invalidate Related Sessions/Tokens

When applicable:

- Rotate JWT signing secret (`JWT_SECRET`) and force re-login.
- Rotate encryption key only with a migration plan (data encrypted with old key may become unreadable).
- Revoke long-lived API tokens and webhooks if exposed.

### 5) Document and Prevent Recurrence

- Record what leaked, where, and when.
- Add pre-commit secret scanning.
- Add PR checklist item: “No secrets in diff.”

---

## Project-Specific Secrets to Protect

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- Database credentials (MongoDB URI, etc.)
- Third-party credentials (Twilio, Firebase, SMTP, etc.)

---

## Environment Variable Management

- Keep real values only in local/deployment env stores.
- Keep placeholders in tracked examples (`.env.example`).
- Never paste secrets into issues, PR comments, or chat transcripts.

---

## Recommended Hardening

- Enable branch protection on `main`.
- Require PR review before merge.
- Enable Dependabot/security updates.
- Enable secret scanning in GitHub settings.
- Add a pre-commit scanner (e.g., gitleaks) in local dev and CI.

---

## Cloudinary Rotation Notes

If Cloudinary credentials leak:

1. Rotate API secret in Cloudinary dashboard.
2. Update backend env vars (`CLOUDINARY_*`).
3. Restart backend.
4. Verify upload endpoints return success.
5. Confirm old secret no longer works.

---

## Disclaimer

This file provides operational guidance, not legal/compliance advice.
