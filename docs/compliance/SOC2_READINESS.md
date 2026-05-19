# Hermes Dashboard SOC 2 Readiness

Status: readiness baseline, not an attestation.
Owner: Liminull AI.
Scope: hermes-dashboard Next.js operator UI, login route, browser-delivered assets, dashboard-to-API access pattern.

## Important note
SOC 2 compliance requires audited organization controls and evidence. This repository can support SOC 2 readiness, but it cannot make Liminull AI SOC 2 compliant by itself.

## Controls implemented in this repository

### Security
- Dashboard login no longer stores a literal `true` auth cookie. It requires `HERMES_DASHBOARD_SESSION_TOKEN` and the proxy validates that exact server-side token.
- Dashboard session cookie is `httpOnly`, `sameSite=strict`, production `secure`, path-scoped, and expires after 8 hours.
- Login attempts are rate-limited in memory to 5 attempts per 15 minutes per forwarded client IP.
- Password comparisons use constant-time comparison.
- The dashboard API proxy at `/api/hermes/*` injects `HERMES_API_TOKEN` server-side before forwarding requests to `HERMES_API_URL`, so browser bundles do not need a public API token.
- Security headers are configured in `next.config.ts`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Secrets are excluded from git and documented in `.env.example`.

### Availability
- The app keeps standard Next build/start scripts and now includes `npm run security:audit` for vulnerability checks.
- `npm run security:audit` currently reports 0 vulnerabilities.

### Confidentiality / privacy
- The dashboard must not expose server API tokens through `NEXT_PUBLIC_*` environment variables in production.
- Browser components call the server-side dashboard proxy at `/api/hermes/*`, which forwards to `HERMES_API_URL` while keeping `HERMES_API_TOKEN` server-side.

## Required environment variables
See `.env.example`.

Production minimum:
- `NODE_ENV=production`
- `HERMES_DASHBOARD_SESSION_TOKEN` generated with `openssl rand -hex 32`
- `TYLER_DASHBOARD_PASSWORD` / `JACK_DASHBOARD_PASSWORD` stored only in the deployment secret manager
- `HERMES_API_URL` set to the production API URL
- `HERMES_API_TOKEN` set to the production Hermes API token

Do not configure `NEXT_PUBLIC_HERMES_API_TOKEN` in production. Anything prefixed with `NEXT_PUBLIC_` is browser-exposed.

## Evidence to retain for an auditor
- Git history for authentication/session/header changes.
- `npm run security:audit` results for each release.
- `npm test` results covering login, protected-route, and server-side API proxy security behavior.
- Deployment secret configuration screenshots/export.
- Access review evidence for hosting, GitHub, and API credentials.
- Change approval records for production deploys.
- Screenshots of security headers from production responses.

## Company-level SOC 2 evidence
Company-level SOC 2 controls and evidence requirements are tracked in the hermes-ai source-of-truth checklist:

`/Users/tyler/hermes-ai/docs/compliance/COMPANY_SOC2_CONTROLS_CHECKLIST.md`

This repository also contains a pointer at `docs/compliance/COMPANY_SOC2_CONTROLS_CHECKLIST.md`.

## Known gaps / next work
1. Move login rate limiting from in-memory storage to Redis/Upstash or hosting-native WAF for multi-instance deployments.
2. Add role-based dashboard sessions if multiple operators need distinct audit trails.
3. Execute the company-level evidence collection plan in `/Users/tyler/hermes-ai/docs/compliance/COMPANY_SOC2_CONTROLS_CHECKLIST.md`.

## Automated security tests
- `test/security.test.ts` covers login success/failure, login lockout, secure cookie flags, protected-route redirects, public login API pass-through, authenticated page access, API proxy token injection, upstream response-header sanitization, and mutating request body forwarding.
- Run with `npm test`.

## Vulnerability management notes
- `npm run security:audit` currently reports 0 vulnerabilities.
- Next 16.2.6 currently bundles an older PostCSS copy, so `package.json` uses an npm `overrides.postcss` pin to force a patched PostCSS version.
