-- Optional dedicated table for Client Delivery OS workspaces.
-- The app can also durably fall back to lead_pipeline.metadata.clientWorkspace when this table is absent.
-- Apply in the Liminull dashboard Supabase project when you want a first-class workspace table.

create table if not exists public.client_workspaces (
  id text primary key,
  source_lead_id text not null unique,
  name text not null,
  owner text not null,
  phase text not null check (phase in ('handoff', 'build', 'review', 'launched')),
  package_fit text not null,
  website text,
  phone text,
  location text not null,
  next_deliverable text not null,
  asset_checklist text[] not null default '{}',
  asset_checklist_completed text[] not null default '{}',
  launch_status text not null default 'not_started' check (launch_status in ('not_started', 'access_needed', 'in_progress', 'ready_to_launch', 'launched')),
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_workspaces
  add column if not exists asset_checklist_completed text[] not null default '{}';

alter table public.client_workspaces
  add column if not exists launch_status text not null default 'not_started'
  check (launch_status in ('not_started', 'access_needed', 'in_progress', 'ready_to_launch', 'launched'));

create index if not exists client_workspaces_updated_at_idx
  on public.client_workspaces (updated_at desc);

create index if not exists client_workspaces_owner_idx
  on public.client_workspaces (owner);

create or replace function public.set_client_workspaces_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_client_workspaces_updated_at on public.client_workspaces;
create trigger set_client_workspaces_updated_at
before update on public.client_workspaces
for each row
execute function public.set_client_workspaces_updated_at();

alter table public.client_workspaces enable row level security;

-- Server-side Next.js routes use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
-- Add user-scoped policies later when these workspaces become directly client-readable.
