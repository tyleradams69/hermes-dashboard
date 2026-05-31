-- Durable internal lead intelligence packets for the Liminull dashboard.
-- Apply in the Liminull dashboard Supabase project when generated lead packets should survive reloads/devices.

create table if not exists public.lead_intelligence_packets (
  id text primary key,
  lead_id text not null unique,
  company text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'used')),
  generated_at timestamptz not null,
  pain_hypothesis text not null,
  recommended_offer text not null,
  outreach_hook text not null,
  discovery_questions text[] not null default '{}',
  website_notes text not null,
  approval_note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_intelligence_packets_updated_at_idx
  on public.lead_intelligence_packets (updated_at desc);

create index if not exists lead_intelligence_packets_status_idx
  on public.lead_intelligence_packets (status);

create or replace function public.set_lead_intelligence_packets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_lead_intelligence_packets_updated_at on public.lead_intelligence_packets;
create trigger set_lead_intelligence_packets_updated_at
before update on public.lead_intelligence_packets
for each row
execute function public.set_lead_intelligence_packets_updated_at();

alter table public.lead_intelligence_packets enable row level security;

-- Server-side Next.js routes use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
-- Add user-scoped policies later if packets become directly client-readable.
