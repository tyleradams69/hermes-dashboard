-- Durable lead scraper run history for the Liminull dashboard.
-- Apply in the Liminull dashboard Supabase project when recent scraper runs should survive browser/device changes.

create table if not exists public.lead_search_runs (
  id text primary key,
  business text not null,
  location text not null,
  distance_miles integer not null default 15,
  niche text not null,
  only_without_website boolean not null default false,
  has_phone_only boolean not null default false,
  min_rating numeric not null default 0,
  min_reviews integer not null default 0,
  weak_website_candidate boolean not null default false,
  result_count integer not null default 0,
  top_lead_company text,
  warnings text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists lead_search_runs_created_at_idx
  on public.lead_search_runs (created_at desc);

create index if not exists lead_search_runs_business_location_idx
  on public.lead_search_runs (business, location);

alter table public.lead_search_runs enable row level security;

-- Server-side Next.js routes use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
-- Add user-scoped policies later if lead search history becomes directly client-readable.
