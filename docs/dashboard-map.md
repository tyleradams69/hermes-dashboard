# Liminull Dashboard Map

This dashboard is Tyler's internal Liminull AI operating cockpit: find revenue, qualify leads, close opportunities, and bridge won work into delivery.

## Primary surfaces

### `/leads` — lead generation and pipeline command center

Purpose: search local business niches, qualify prospects, import them into the Liminull pipeline, generate internal lead intelligence, and decide today's follow-up work.

Data paths:

- Lead scraper request: `/leads` -> `POST /api/lead-scraper` -> `src/lib/leadScraper.ts`.
- Google Places enrichment: `GOOGLE_PLACES_API_KEY` stays server-only in `/api/lead-scraper`.
- Recent scraper runs: `/leads` -> `/api/lead-search-runs` -> `src/lib/leadSearchRunStore.ts`.
  - Uses `public.lead_search_runs` when the optional Supabase table is installed.
  - Falls back to in-memory API storage when Supabase is not configured.
  - Browser localStorage remains only as a degraded UI cache if the API history cannot load/save.
- Pipeline records: `/leads` -> `/api/lead-pipeline` -> `src/lib/leadPipelineSupabase.ts` / `src/lib/leadPipeline.ts`.
- Lead intelligence packets: `/leads` -> `/api/lead-intelligence` -> `src/lib/leadIntelligence.ts`.
- Closed-won conversion: `/leads` -> `/api/client-workspaces` -> `src/lib/clientWorkspaceStore.ts`.

### `/businesses` — client delivery workspace surface

Purpose: show closed-won pipeline leads after they become internal delivery handoff workspaces, alongside existing Hermes/backend business records.

Data paths:

- Client delivery workspaces: `/businesses` -> `/api/client-workspaces` -> `src/lib/clientWorkspaceStore.ts`.
- Editable delivery fields on `/businesses`: phase, launch status, next deliverable, internal notes, and completed asset checklist items.
- Dedicated table option: `docs/supabase/client_workspaces.sql`.
- Fallback when the dedicated table is absent: `lead_pipeline.metadata.clientWorkspace`.

### `/onboarding` — client workspace/intake workspace

Purpose: richer client onboarding/demo workspace. Keep it connected to delivery needs, but do not let it become the only source of delivery truth.

### Hermes/API-backed operations pages

Purpose: internal action layer and telemetry. These should stay secondary to revenue/delivery workflow unless a page directly helps Tyler decide or execute the next Liminull action.

## Optional Supabase notes

Optional SQL files live in `docs/supabase/`:

- `client_workspaces.sql` for first-class client delivery workspaces.
- `lead_search_runs.sql` for durable lead scraper run history.

Both tables enable RLS and are accessed by server-side Next.js routes using `SUPABASE_SERVICE_ROLE_KEY`. Do not expose service-role credentials to browser/client code. Add direct user-scoped RLS policies later only if these tables become client-readable outside server routes.

## Build rules

- No automatic outreach or client-facing side effects.
- Generated lead intelligence stays internal until copied/approved by Tyler.
- Supabase service-role access stays server-only in API/store files.
- Prefer small deterministic helpers and tested API seams before adding LLM/Hermes automation.
- Preserve compact, operator-focused UI; avoid decorative telemetry unless it supports a concrete decision.
