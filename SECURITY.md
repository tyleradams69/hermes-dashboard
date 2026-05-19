# Security Policy

## Reporting vulnerabilities
Report suspected vulnerabilities to the Liminull AI owner/admin channel. Include:
- affected repo and route/component
- reproduction steps
- impact
- suggested fix, if known

Do not post secrets, customer data, or exploit details in public channels.

## Secret handling
- Never commit `.env`, `.env.local`, passwords, session tokens, API tokens, or private keys.
- Generate long random production secrets with `openssl rand -hex 32`.
- Do not use `NEXT_PUBLIC_*` for secrets. Browser-exposed variables are not secret.
- Rotate any secret that was exposed in logs, screenshots, browser bundles, or git history.

## Release security checks
Before production deploy:
1. Run `npm run security:audit`.
2. Run `npm run build`.
3. Confirm protected pages redirect unauthenticated users to `/login`.
4. Confirm production cookies are `HttpOnly`, `Secure`, and `SameSite=Strict`.
5. Confirm no production API token is present in browser JavaScript bundles.

## SOC 2 readiness
See `docs/compliance/SOC2_READINESS.md`.
