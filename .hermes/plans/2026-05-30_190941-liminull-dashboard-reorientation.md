# Liminull Dashboard Reorientation Plan

Created: 2026-05-30 19:09 local
Repo: `/Users/tyler/hermes-dashboard`
Branch inspected: `main`
Latest commit inspected at plan creation: `6fdbd50 Add no-website lead scraper filter`

## Progress Notes

- Sprint 1 and 2 core work has since shipped: advanced lead scraper filters, richer result cards, lead intelligence packets, and the Pipeline Command Center are present on `/leads`.
- Client Delivery OS bridge has shipped: closed-won leads can be converted into client workspaces through `/api/client-workspaces` and displayed on `/businesses`.
- Current Supabase notes are situated in `docs/supabase/`:
  - `client_workspaces.sql` for first-class client delivery workspace storage.
  - `lead_search_runs.sql` for durable lead scraper run history.
- Current module/data-path map lives at `docs/dashboard-map.md`.

## Goal

Re-center the Liminull dashboard as Tyler's internal operating system for sales, lead generation, client delivery, and Hermes-powered workflow control.

The target product should answer one question every time Tyler opens it:

> What should Liminull do next to find revenue, close leads, deliver client work, or safely operate automations?

## Current State Summary

### What is working

- App is deployed and production-ready enough to build.
- `npm test` passes: 43 tests across 9 files.
- `npm run build` passes on Next.js 16.2.6 / Turbopack.
- Authentication exists with signed session cookies and Supabase Auth support.
- Lead scraper exists at `src/app/leads/page.tsx` with Google Places enrichment.
- Lead scraper API exists at `src/app/api/lead-scraper/route.ts`.
- Lead pipeline API exists at `src/app/api/lead-pipeline/route.ts`.
- Pipeline supports Supabase-backed storage via `src/lib/leadPipelineSupabase.ts`, with local JSON fallback.
- Recent no-website filter is implemented end-to-end:
  - UI switch
  - normalized request input
  - Place Details enrichment
  - server-side filtering
  - test coverage
- Hermes API proxy exists at `src/app/api/hermes/[...path]/route.ts`.
- Core app shell/navigation exists in `src/components/AppShell.tsx`.
- Client workspace/onboarding/settings pages exist.

### What is noisy or incomplete

- `npm run lint` currently fails with 90 errors / 9 warnings.
  - 63 `@typescript-eslint/no-explicit-any`
  - 27 `react-hooks/set-state-in-effect`
  - 5 `react-hooks/exhaustive-deps`
  - 3 `@typescript-eslint/no-unused-vars`
  - 1 `@next/next/no-img-element`
- Build passes but warns about NFT tracing from `next.config.ts` through `src/app/api/lead-pipeline/route.ts`.
- Many dashboard pages/components still feel like high-concept operational telemetry, not direct Liminull revenue/delivery workflow.
- Several components are Hermes API dependent and may show empty/error states if the upstream Hermes backend is unavailable.
- The lead pipeline in `src/app/leads/page.tsx` is functional but not yet a true command center:
  - no priority queue
  - no saved scraper runs
  - no follow-up reminders
  - no lead intelligence packet
  - limited filtering/sorting
  - no bulk actions
- `src/components/PipelineBoard.tsx` appears to target older Hermes lead endpoints (`/api/hermes/api/lead/...`) and uses `any`; it may not match the newer local/Supabase lead pipeline API.
- Client notes in `src/app/businesses/page.tsx` are localStorage-only, useful for demos but not durable team workflow.
- `src/app/onboarding/page.tsx` is rich but long and still typed loosely in places.
- The project has a leftover `src/app/page.tsx.backup-before-kanban` file that should be reviewed and likely removed after confirming it is obsolete.

## Product Direction

Shift the dashboard from a generic “AI operations” display into a Liminull revenue and client delivery cockpit.

Recommended north-star modules:

1. Lead Scraper v2
   - Find businesses by niche/location.
   - Filter by no website, phone present, review count/rating, likely weak website, and booking friction.
   - Save scraper runs.
   - Turn each result into a pipeline lead.

2. Lead Intelligence Packets
   - For each lead, generate:
     - why this business is a fit
     - likely pain points
     - suggested Liminull offer
     - outreach hook
     - discovery questions
     - simple website audit summary
   - Human-approved output only; no silent outreach.

3. Pipeline Command Center
   - Show today’s highest-priority leads.
   - Highlight stale leads and next actions.
   - Support owner/stage filters.
   - Improve duplicate handling visibility.
   - Make follow-up status obvious.

4. Client Delivery OS
   - Convert closed leads into client workspaces.
   - Track client phase, tasks, assets, launch/deploy notes, and handoff summaries.
   - Borrow the useful Mild2Wild lessons: compact panels, clear admin boundaries, client-safe summaries, and restrained UI.

5. Hermes Assistant as Action Layer
   - Add context-aware actions instead of generic chat:
     - Research this lead
     - Draft outreach
     - Audit website
     - Prepare discovery call
     - Generate proposal outline
     - Create client handoff
   - Require explicit approval before external side effects.

## Recommended Sprints

### Sprint 0 — Stabilize the dashboard foundation

Purpose: make future work less noisy and safer.

Tasks:

1. Fix or intentionally relax repo-wide lint blockers.
   - Keep correctness rules such as hook ordering.
   - Decide whether `no-explicit-any` should be a warning during active dashboard rebuild.
   - Fix low-risk `react-hooks/set-state-in-effect` patterns with `queueMicrotask` or stable callbacks where appropriate.
2. Resolve or document the Turbopack NFT warning.
   - Current warning points through `src/app/api/lead-pipeline/route.ts` and filesystem fallback storage.
   - Keep local JSON fallback if useful, but isolate it enough that Vercel/Turbopack does not trace the whole project.
3. Remove/confirm obsolete backup file:
   - `src/app/page.tsx.backup-before-kanban`
4. Add a short `docs/dashboard-map.md` or project guide reference that records current modules and data paths.

Likely files:

- `eslint.config.mjs`
- `src/app/api/lead-pipeline/route.ts`
- `src/lib/leadPipeline*.ts`
- `src/app/page.tsx.backup-before-kanban`
- `.hermes/` docs or project skill reference

Validation:

- `npm test`
- `npm run build`
- `npm run lint` or a deliberate lint policy update with targeted lint passing

### Sprint 1 — Lead Scraper v2

Purpose: improve the thing that directly creates Liminull opportunities.

Tasks:

1. Add advanced filters to `LeadSearchInput`:
   - `onlyWithoutWebsite`
   - `hasPhoneOnly`
   - `minRating`
   - `minReviews`
   - `weakWebsiteCandidate` placeholder field for future website audit scoring
2. Add niche/search presets:
   - dentists
   - med spas
   - HVAC
   - law firms
   - auto detailers
   - local gyms
   - restaurants/cafes
3. Save recent scraper runs locally or server-side.
   - Start with browser/local state if needed.
   - Prefer Supabase table later if this becomes team-facing.
4. Improve lead result cards:
   - show phone, website/no website, rating/reviews, score, source evidence
   - add action buttons: Import, Research, Outreach Draft, Website Audit
5. Add empty-state guidance when filters remove all results.

Likely files:

- `src/lib/leadScraper.ts`
- `src/app/api/lead-scraper/route.ts`
- `src/app/leads/page.tsx`
- `test/leadScraper.test.ts`
- `test/leadScraperApi.test.ts`

Validation:

- Unit tests for input normalization and filtering.
- API test for advanced filters.
- Browser check on `/leads`.
- `npm test`
- `npm run build`

### Sprint 2 — Pipeline Command Center

Purpose: make the lead pipeline actionable instead of just a list.

Tasks:

1. Add derived lead priority:
   - high score
   - no website
   - has phone
   - recently imported
   - stale next action
2. Add filters:
   - owner
   - stage
   - no website
   - has phone
   - hot score
3. Add “Today’s focus” panel at the top of `/leads`.
4. Add quick-edit affordances for:
   - stage
   - owner
   - next action
   - notes
5. Reconcile or replace `src/components/PipelineBoard.tsx` so it uses the local `/api/lead-pipeline` API and `PipelineLead` types instead of older Hermes lead endpoint assumptions.

Likely files:

- `src/lib/leadPipeline.ts`
- `src/app/api/lead-pipeline/route.ts`
- `src/app/leads/page.tsx`
- `src/components/PipelineBoard.tsx`
- `test/leadPipeline.test.ts`
- `test/leadPipelineApi.test.ts`

Validation:

- Tests for priority derivation.
- Tests for pipeline patching.
- Browser check lead movement/editing.
- `npm test`
- `npm run build`

### Sprint 3 — Lead Intelligence Packets

Purpose: convert raw leads into sales-ready opportunities.

Tasks:

1. Add a `LeadIntelligence` type:
   - lead id / dedupe key
   - pain hypothesis
   - recommended offer
   - outreach hook
   - discovery questions
   - website notes
   - generatedAt
   - status: draft/approved/used
2. Add API route for creating an intelligence packet.
   - Start deterministic/template-based.
   - Later optionally call Hermes/LLM behind an approval step.
3. Add UI drawer or panel on lead cards.
4. Add one-click copy for outreach drafts.
5. Keep all generated content internal until Tyler chooses to use it.

Likely files:

- `src/lib/leadIntelligence.ts` new
- `src/app/api/lead-intelligence/route.ts` new
- `src/app/leads/page.tsx`
- tests under `test/leadIntelligence*.test.ts`

Validation:

- Template generation tests.
- API tests.
- Browser check copy/open flows.

### Sprint 4 — Client Delivery OS

Purpose: connect sales wins to delivery work.

Tasks:

1. Add “Convert to client/workspace” from closed-won leads.
2. Upgrade `/businesses` from Hermes-backend list + local notes into a durable client delivery surface.
3. Add client workspace fields:
   - phase
   - package/offer
   - next deliverable
   - asset links
   - launch/deploy status
   - internal notes
   - client-ready handoff summary
4. Add client-safe handoff generator using reusable templates.

Likely files:

- `src/app/businesses/page.tsx`
- `src/app/onboarding/page.tsx`
- new client delivery lib/API files
- tests for client conversion and handoff generation

Validation:

- Tests for lead -> client conversion.
- Browser check `/businesses` and `/onboarding`.
- `npm test`
- `npm run build`

## Feature Prioritization Matrix

1. Highest ROI / low risk
   - Lead scraper advanced filters
   - Lead result card cleanup
   - Pipeline “today’s focus” panel
   - Lead priority derivation
   - Lint/build warning cleanup

2. High ROI / medium risk
   - Saved scraper runs
   - Lead intelligence packet generation
   - PipelineBoard reconciliation
   - Supabase persistence expansion

3. High value / later
   - Full client delivery OS
   - Proposal generator
   - Automated follow-up reminders
   - Live Hermes assistant actions

4. Defer unless needed
   - More abstract telemetry visuals
   - Fully autonomous outreach
   - Broad UI redesign
   - Complex multi-agent flows inside production dashboard

## Safety / Product Rules

- Do not expose server secrets to client components.
- Keep `GOOGLE_PLACES_API_KEY`, `HERMES_API_TOKEN`, `HERMES_DASHBOARD_SESSION_TOKEN`, and `SUPABASE_SERVICE_ROLE_KEY` server-only.
- No automatic outreach or client-facing action without human approval.
- Prefer deterministic/template workflows before LLM automation.
- Use Supabase as the durable team store where production behavior needs persistence.
- Preserve local JSON fallback only as a development fallback, not as production behavior.
- Keep UI compact and operator-focused; avoid decorative AI panels unless they support a decision/action.

## Suggested Immediate Next Move

Start with Sprint 0 + Sprint 1 in one focused branch:

Branch name:

```bash
git checkout -b dashboard-reorientation-sprint-1
```

Implementation order:

1. Fix lint policy/noise enough that future diffs are trustworthy.
2. Fix or isolate the Turbopack NFT warning.
3. Add Lead Scraper v2 filters and presets.
4. Add richer lead result cards.
5. Add tests.
6. Build and browser-QA `/leads`.
7. Deploy only after Tyler approves the final diff.

## Open Questions for Tyler

1. Should the dashboard stay internal-only for Tyler/JT/Liminull staff, or eventually support client logins?
2. Should saved scraper runs and client notes be durable in Supabase immediately, or is local/browser persistence acceptable for the next sprint?
3. Which niche presets matter first for Liminull’s current outreach?
4. Should lead intelligence use deterministic templates first, or call Hermes/LLM immediately with approval gates?
5. Should we hide/deprioritize the abstract Operations/Brain pages until they map to real Liminull workflows?

## Success Criteria

The reorientation is successful when:

- Tyler can open `/leads` and know what to search, who to contact, and why.
- Imported leads clearly show next action and priority.
- A lead can become an intelligence packet and then a proposal/discovery-call prep.
- Client workspaces can track delivery status after closed-won.
- Tests/build stay green.
- Lint is either clean or intentionally scoped so new changes are not buried under old noise.
- The dashboard feels like Liminull’s operating cockpit, not a generic AI telemetry demo.
