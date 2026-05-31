"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import AppShell from "@/components/AppShell";
import { buildClientWorkspaceFromPipelineLead } from "@/lib/clientWorkspace";
import {
  buildPipelineBulkActionPatch,
  deriveLeadPriority,
  filterPipelineLeads,
  formatPipelineDailyBriefForCopy,
  formatPipelineAttentionBriefForCopy,
  formatPipelineAttentionReason,
  formatPipelineLeadBriefForCopy,
  formatPipelineOwnerSummaryForCopy,
  getLeadQuickActions,
  selectPipelineAttentionItems,
  selectStaleLeadNudges,
  selectTodayFocusLeads,
  summarizePipelineByOwner,
  type PipelineAttentionItem,
  type PipelineLead,
  type PipelineOwnerSummary,
  type LeadPipelineStage,
} from "@/lib/leadPipeline";
import {
  buildLeadSalesActionBrief,
  formatLeadIntelligencePacketForCopy,
  formatLeadSalesActionBriefForCopy,
  type LeadIntelligencePacket,
  type LeadSalesActionBrief,
} from "@/lib/leadIntelligence";
import type { LeadSearchRun } from "@/lib/leadSearchRunStore";
import type { LeadRecord, LeadSearchInput, LeadSourceLink } from "@/lib/leadScraper";

type LeadScraperResponse = {
  ok: boolean;
  input?: {
    business: string;
    location: string;
    distanceMiles: number;
    niche: string;
    onlyWithoutWebsite?: boolean;
    hasPhoneOnly?: boolean;
    minRating?: number;
    minReviews?: number;
    weakWebsiteCandidate?: boolean;
  };
  setup?: {
    googlePlacesConfigured: boolean;
  };
  queries?: string[];
  sourceLinks?: LeadSourceLink[];
  leads?: LeadRecord[];
  warnings?: string[];
  complianceNote?: string;
  error?: string;
};

type PipelineResponse = {
  ok: boolean;
  leads?: PipelineLead[];
  lead?: PipelineLead;
  existingLead?: PipelineLead;
  reason?: string;
  error?: string;
};

type DashboardAccount = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

type AccountResponse = {
  ok: boolean;
  user?: DashboardAccount;
  error?: string;
};

type PipelineLeadPatch = Partial<Pick<PipelineLead, "stage" | "notes" | "nextAction" | "owner" | "lastTouchedAt" | "nextFollowUpAt" | "salesPrepStatus" | "prepWorkspaceNotes">>;

type LeadIntelligenceResponse = {
  ok: boolean;
  packet?: LeadIntelligencePacket;
  packets?: LeadIntelligencePacket[];
  error?: string;
};

type ClientWorkspaceResponse = {
  ok: boolean;
  workspace?: ReturnType<typeof buildClientWorkspaceFromPipelineLead>;
  error?: string;
};

type LeadSearchRunsResponse = {
  ok: boolean;
  runs?: LeadSearchRun[];
  run?: LeadSearchRun;
  error?: string;
};

const defaultForm = {
  business: "dentists",
  location: "Austin, TX",
  distanceMiles: "25",
  niche: "AI intake automation",
  onlyWithoutWebsite: false,
  hasPhoneOnly: false,
  minRating: "",
  minReviews: "",
  weakWebsiteCandidate: false,
};

type LeadSearchForm = typeof defaultForm;

type LeadSearchPreset = {
  label: string;
  business: string;
  niche: string;
};

type OutreachDraft = {
  company: string;
  text: string;
};

const leadSearchPresets: LeadSearchPreset[] = [
  { label: "Dentists", business: "dentists", niche: "AI intake automation" },
  { label: "Med spas", business: "med spas", niche: "AI booking and follow-up" },
  { label: "HVAC", business: "HVAC companies", niche: "AI missed-call capture" },
  { label: "Law firms", business: "law firms", niche: "AI intake automation" },
  { label: "Auto detailers", business: "auto detailers", niche: "AI booking automation" },
  { label: "Local gyms", business: "local gyms", niche: "AI lead follow-up" },
  { label: "Cafes", business: "restaurants and cafes", niche: "AI phone ordering" },
];

const recentRunsStorageKey = "liminull:lead-scraper:recent-runs";

function formToLeadSearchInput(run: LeadSearchForm): LeadSearchInput {
  return {
    ...run,
    distanceMiles: Number(run.distanceMiles) || 15,
    minRating: Number(run.minRating) || 0,
    minReviews: Number(run.minReviews) || 0,
  };
}

function leadSearchInputToForm(input: LeadSearchInput): LeadSearchForm {
  return {
    business: input.business || "businesses",
    location: input.location || "local",
    distanceMiles: String(input.distanceMiles || 15),
    niche: input.niche || "AI automation",
    onlyWithoutWebsite: Boolean(input.onlyWithoutWebsite),
    hasPhoneOnly: Boolean(input.hasPhoneOnly),
    minRating: input.minRating ? String(input.minRating) : "",
    minReviews: input.minReviews ? String(input.minReviews) : "",
    weakWebsiteCandidate: Boolean(input.weakWebsiteCandidate),
  };
}

function recentRunKey(run: LeadSearchForm) {
  return [
    run.business,
    run.location,
    run.distanceMiles,
    run.niche,
    run.onlyWithoutWebsite ? "no-site" : "all-sites",
    run.hasPhoneOnly ? "phone" : "any-phone",
    run.minRating || "0",
    run.minReviews || "0",
    run.weakWebsiteCandidate ? "weak" : "any-web",
  ]
    .join("::")
    .toLowerCase();
}

const pipelineStages: LeadPipelineStage[] = [
  "new_lead",
  "contacted",
  "interested",
  "pricing_requested",
  "meeting_requested",
  "closed_won",
  "closed_lost",
];

const defaultPipelineFilters = {
  owner: "all",
  stage: "all" as LeadPipelineStage | "all",
  sortBy: "company" as "company" | "priority",
  noWebsiteOnly: false,
  hasPhoneOnly: false,
  hotScoreOnly: false,
};

const pipelineSavedViews = [
  { label: "Today", filters: { stage: "all" as LeadPipelineStage | "all", sortBy: "priority" as const } },
  { label: "Hot no-website", filters: { stage: "all" as LeadPipelineStage | "all", sortBy: "priority" as const, hotScoreOnly: true, noWebsiteOnly: true } },
  { label: "Stale follow-ups", filters: { stage: "all" as LeadPipelineStage | "all", sortBy: "priority" as const } },
  { label: "Prep-ready", filters: { stage: "all" as LeadPipelineStage | "all", sortBy: "priority" as const } },
] as const;

type PipelineFilters = typeof defaultPipelineFilters;

function stageLabel(stage: string) {
  return stage.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPipelineDate(value?: string) {
  return value ? value.slice(0, 10) : "No date";
}

function isWeakWebsiteLead(lead: LeadRecord) {
  if (!lead.website) return true;

  try {
    const host = new URL(lead.website).hostname.toLowerCase();
    return ["business.site", "facebook.com", "instagram.com", "godaddysites.com", "wixsite.com", "weebly.com", "sites.google.com"].some(
      (weakHost) => host === weakHost || host.endsWith(`.${weakHost}`)
    );
  } catch {
    return false;
  }
}

function buildLeadFitSummary(lead: LeadRecord) {
  const signals = [
    lead.phone ? "phone available" : "phone missing",
    lead.website ? (isWeakWebsiteLead(lead) ? "weak website signal" : "website present") : "no website attached",
    lead.rating ? `${lead.rating}★` : "no rating",
    `${lead.reviewCount || 0} reviews`,
  ];

  return signals.join(" · ");
}

function leadMarketLabel(location: string) {
  const cityStateMatch = location.match(/,\s*([^,]+,\s*[A-Z]{2})(?:\s+\d{5})?/);
  return cityStateMatch?.[1] || location;
}

function buildOutreachDraft(lead: LeadRecord) {
  const websiteAngle = lead.website
    ? isWeakWebsiteLead(lead)
      ? "It looks like your current web presence may be limited by a platform/profile page"
      : "It looks like your site and intake flow may still have room to capture more inquiries"
    : "I couldn't find a full website attached to your Google profile";

  return `Hey ${lead.company} team — I came across your business while looking at ${lead.niche} opportunities around ${leadMarketLabel(lead.location)}. ${websiteAngle}. Liminull AI helps local businesses capture more calls, form fills, and follow-ups with simple AI intake/booking workflows. Would it be useful if I sent over a short audit with 2-3 places you may be losing leads?`;
}

function pipelineLeadToLeadRecord(lead: PipelineLead): LeadRecord {
  return {
    id: lead.id,
    company: lead.company,
    source: lead.source,
    location: lead.location,
    niche: lead.niche,
    size: "local",
    aiIntent: lead.aiIntent,
    evidence: lead.evidence,
    score: lead.score,
    phone: lead.phone,
    localPhone: lead.localPhone,
    website: lead.website,
  };
}

type OwnerAggregateSummary = Pick<PipelineOwnerSummary, "openLeads" | "hotLeads" | "staleLeads" | "prepReadyLeads" | "dueSoonLeads">;

type EmployeePipelineSummaryProps = {
  summaries: PipelineOwnerSummary[];
  allSummary: OwnerAggregateSummary;
  selectedOwner: string;
  onSelectOwner: (owner: string) => void;
  onCopySummary: () => void;
};

function EmployeePipelineSummary({ summaries, allSummary, selectedOwner, onSelectOwner, onCopySummary }: EmployeePipelineSummaryProps) {
  if (summaries.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-white">Employee pipeline summary</p>
          <p className="mt-1 text-xs liminull-muted">Admin rollup sorted by employee name. Click a chip to narrow the pipeline owner filter.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopySummary}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-black text-white/60 transition hover:border-cyan-300/25 hover:text-cyan-50"
          >
            Copy employee rollup
          </button>
          <button
            type="button"
            onClick={() => onSelectOwner("all")}
            className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${selectedOwner === "all" ? "border-cyan-300/35 bg-cyan-300/15 text-cyan-50" : "border-white/10 bg-white/[0.03] text-white/60 hover:border-cyan-300/25 hover:text-cyan-50"}`}
          >
            All employees · {allSummary.openLeads} open · {allSummary.hotLeads} hot · {allSummary.staleLeads} stale
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {summaries.map((summary) => (
          <button
            key={summary.owner}
            type="button"
            onClick={() => onSelectOwner(summary.owner)}
            className={`min-w-[180px] rounded-2xl border p-4 text-left transition ${selectedOwner === summary.owner ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/5 bg-white/[0.02] hover:border-cyan-300/20 hover:bg-cyan-300/[0.04]"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-black text-white">{summary.owner}</p>
              <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                {summary.openLeads} open
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-white/55">
              <span className="rounded-xl bg-cyan-300/10 px-2 py-1 text-cyan-100">{summary.hotLeads} hot</span>
              <span className="rounded-xl bg-amber-300/10 px-2 py-1 text-amber-100">{summary.staleLeads} stale</span>
              <span className="rounded-xl bg-emerald-300/10 px-2 py-1 text-emerald-100">{summary.prepReadyLeads} prep</span>
              <span className="rounded-xl bg-white/5 px-2 py-1 text-white/55">{summary.dueSoonLeads} due soon</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type BulkPipelineActionsProps = {
  filteredLeadCount: number;
  selectedLeadCount: number;
  selectedHotLeadCount: number;
  allVisibleSelected: boolean;
  bulkOwner: string;
  loading: boolean;
  onBulkOwnerChange: (owner: string) => void;
  onToggleVisibleSelection: () => void;
  onClearSelection: () => void;
  onReassignSelected: () => void;
  onMarkSelectedWorked: () => void;
  onCloseSelectedLost: () => void;
  onCreatePrepForSelectedHotLeads: () => void;
};

function BulkPipelineActions({
  filteredLeadCount,
  selectedLeadCount,
  selectedHotLeadCount,
  allVisibleSelected,
  bulkOwner,
  loading,
  onBulkOwnerChange,
  onToggleVisibleSelection,
  onClearSelection,
  onReassignSelected,
  onMarkSelectedWorked,
  onCloseSelectedLost,
  onCreatePrepForSelectedHotLeads,
}: BulkPipelineActionsProps) {
  return (
    <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black text-white">Bulk admin actions</p>
          <p className="mt-1 text-xs liminull-muted">
            Select visible pipeline cards, then reassign, mark worked today, close lost, or generate prep for hot leads.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onToggleVisibleSelection}
            disabled={filteredLeadCount === 0 || loading}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allVisibleSelected ? "Clear visible" : "Select visible"}
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={selectedLeadCount === 0 || loading}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/60 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear selection
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Selected</p>
          <p className="mt-1 text-2xl font-black tracking-[-0.06em] text-white">{selectedLeadCount}</p>
          <p className="mt-1 text-xs text-slate-600">{selectedHotLeadCount} hot leads eligible for prep generation</p>
        </div>

        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
          Reassign to employee
          <input
            value={bulkOwner}
            onChange={(event) => onBulkOwnerChange(event.target.value)}
            placeholder="Tyler, Jack, etc."
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
          />
          <button
            type="button"
            onClick={onReassignSelected}
            disabled={loading || selectedLeadCount === 0}
            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-50 transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reassign selected
          </button>
        </label>

        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Pipeline updates</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onMarkSelectedWorked}
              disabled={loading || selectedLeadCount === 0}
              className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-50 transition hover:border-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark worked today
            </button>
            <button
              type="button"
              onClick={onCloseSelectedLost}
              disabled={loading || selectedLeadCount === 0}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/65 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close lost
            </button>
          </div>
        </div>

        <div className="grid content-start gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Sales prep</p>
          <button
            type="button"
            onClick={onCreatePrepForSelectedHotLeads}
            disabled={loading || selectedHotLeadCount === 0}
            className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-bold text-violet-50 transition hover:border-violet-300/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate prep for hot leads
          </button>
          <p className="text-xs leading-5 text-white/40">Creates packets only for selected hot leads without saved prep.</p>
        </div>
      </div>
    </div>
  );
}

type PipelineHealthPanelProps = {
  totalLeads: number;
  openLeads: number;
  closedWonLeads: number;
  hotWithoutPrep: number;
  activeWithoutFollowUp: number;
  staleByEmployee: PipelineOwnerSummary[];
};

function PipelineHealthPanel({ totalLeads, openLeads, closedWonLeads, hotWithoutPrep, activeWithoutFollowUp, staleByEmployee }: PipelineHealthPanelProps) {
  return (
    <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-white">Pipeline health</p>
          <p className="mt-1 text-xs liminull-muted">Admin snapshot of queue size, conversion pressure, prep gaps, and follow-up hygiene.</p>
        </div>
        <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">{openLeads} open / {totalLeads} total</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Closed-won</p>
          <p className="mt-2 text-2xl font-black tracking-[-0.06em] text-white">{closedWonLeads}</p>
          <p className="mt-1 text-xs text-white/40">Ready for delivery conversion or workspace check</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Hot without prep</p>
          <p className="mt-2 text-2xl font-black tracking-[-0.06em] text-white">{hotWithoutPrep}</p>
          <p className="mt-1 text-xs text-white/40">Needs packet before outreach</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">No follow-up date</p>
          <p className="mt-2 text-2xl font-black tracking-[-0.06em] text-white">{activeWithoutFollowUp}</p>
          <p className="mt-1 text-xs text-white/40">Contacted/interested/pricing/meeting leads without a date</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Stale by employee</p>
          <p className="mt-2 text-sm font-black text-white">
            {staleByEmployee.filter((summary) => summary.staleLeads > 0).slice(0, 2).map((summary) => `${summary.owner}: ${summary.staleLeads}`).join(" · ") || "No stale pressure"}
          </p>
          <p className="mt-1 text-xs text-white/40">Sorted by employee name in the rollup below</p>
        </div>
      </div>
    </div>
  );
}

type NeedsAttentionPanelProps = {
  items: PipelineAttentionItem[];
  onCopyQueue: () => void;
  onSelectLead: (id: string) => void;
  onMarkWorked: (lead: PipelineLead) => void;
  onCreatePrep: (lead: PipelineLead) => void;
};

function NeedsAttentionPanel({ items, onCopyQueue, onSelectLead, onMarkWorked, onCreatePrep }: NeedsAttentionPanelProps) {
  return (
    <div className="mt-5 rounded-2xl border border-amber-300/10 bg-amber-300/[0.04] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-white">Needs attention</p>
          <p className="mt-1 text-xs liminull-muted">Admin triage for missing actions, overdue follow-ups, hot leads without prep, and approved prep waiting to be worked.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopyQueue}
            className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-50 transition hover:border-amber-300/40"
          >
            Copy attention queue
          </button>
          <span className="rounded-full bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">{items.length} flagged</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm liminull-muted">No attention items under the current filters.</div>
        ) : items.map((item) => (
          <article key={item.lead.id} className="rounded-2xl border border-white/5 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-white">{item.lead.company}</h3>
                <p className="mt-1 text-xs text-slate-600">{item.lead.owner} · {stageLabel(item.lead.stage)} · follow-up {formatPipelineDate(item.lead.nextFollowUpAt)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${item.severity === "critical" ? "bg-rose-300/10 text-rose-100" : item.severity === "warning" ? "bg-amber-300/10 text-amber-100" : "bg-cyan-300/10 text-cyan-100"}`}>
                {item.severity} · {item.score}
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-amber-50/80">{item.nextBestAction}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.reasons.map((reason) => (
                <span key={`${item.lead.id}-${reason}`} className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                  {formatPipelineAttentionReason(reason)}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => onSelectLead(item.lead.id)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/70">Select lead</button>
              <button type="button" onClick={() => onMarkWorked(item.lead)} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-50">Worked today</button>
              {item.reasons.includes("hot_without_prep") && (
                <button type="button" onClick={() => onCreatePrep(item.lead)} className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-bold text-violet-50">Create prep</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

type AdminPipelineReviewTableProps = {
  leads: PipelineLead[];
  selectedLeadIds: string[];
  onToggleLeadSelection: (id: string) => void;
  onSelectOwner: (owner: string) => void;
};

function AdminPipelineReviewTable({ leads, selectedLeadIds, onToggleLeadSelection, onSelectOwner }: AdminPipelineReviewTableProps) {
  if (leads.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-white">Admin pipeline review</p>
          <p className="mt-1 text-xs liminull-muted">Fast all-employee scan sorted by the active filters before diving into full cards.</p>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-black text-white/55">
          {leads.length} visible
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
            <tr className="border-b border-white/5">
              <th className="py-2 pr-3">Select</th>
              <th className="py-2 pr-3">Lead</th>
              <th className="py-2 pr-3">Employee</th>
              <th className="py-2 pr-3">Stage</th>
              <th className="py-2 pr-3">Next follow-up</th>
              <th className="py-2 pr-3">Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.map((lead) => {
              const priority = deriveLeadPriority(lead);
              return (
                <tr key={lead.id} className="align-top text-white/65">
                  <td className="py-3 pr-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${lead.company} for admin review`}
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={() => onToggleLeadSelection(lead.id)}
                      className="h-4 w-4 accent-cyan-300"
                    />
                  </td>
                  <td className="max-w-[240px] py-3 pr-3">
                    <p className="truncate font-black text-white">{lead.company}</p>
                    <p className="mt-1 truncate text-white/40">{lead.location}</p>
                  </td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => onSelectOwner(lead.owner)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-bold text-white/65 transition hover:border-cyan-300/25 hover:text-cyan-50"
                    >
                      {lead.owner}
                    </button>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-white/5 px-2.5 py-1 font-bold text-white/60">{stageLabel(lead.stage)}</span>
                  </td>
                  <td className="py-3 pr-3 font-bold text-white/55">{formatPipelineDate(lead.nextFollowUpAt)}</td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-cyan-300/10 px-2 py-1 font-black uppercase text-cyan-100">{priority.tier}</span>
                      {lead.salesPrepStatus === "ready" && <span className="rounded-full bg-violet-300/10 px-2 py-1 font-black uppercase text-violet-100">prep</span>}
                      {priority.signals.slice(0, 2).map((signal) => (
                        <span key={`${lead.id}-${signal}`} className="rounded-full bg-white/5 px-2 py-1 font-bold text-white/45">{signal}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [form, setForm] = useState(defaultForm);
  const [employee, setEmployee] = useState("Tyler");
  const [account, setAccount] = useState<DashboardAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [result, setResult] = useState<LeadScraperResponse | null>(null);
  const [pipelineLeads, setPipelineLeads] = useState<PipelineLead[]>([]);
  const [pipelineFilters, setPipelineFilters] = useState<PipelineFilters>(defaultPipelineFilters);
  const [recentRuns, setRecentRuns] = useState<LeadSearchForm[]>([]);
  const [outreachDraft, setOutreachDraft] = useState<OutreachDraft | null>(null);
  const [intelligencePacket, setIntelligencePacket] = useState<LeadIntelligencePacket | null>(null);
  const [salesActionBrief, setSalesActionBrief] = useState<LeadSalesActionBrief | null>(null);
  const [savedIntelligencePackets, setSavedIntelligencePackets] = useState<Record<string, LeadIntelligencePacket>>({});
  const [error, setError] = useState("");
  const [pipelineMessage, setPipelineMessage] = useState("");
  const [selectedPipelineLeadIds, setSelectedPipelineLeadIds] = useState<string[]>([]);
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const discoveryPanelRef = useRef<HTMLFormElement>(null);
  const [discoveryPanelHeight, setDiscoveryPanelHeight] = useState<number | null>(null);
  const discoveryPanelHeightStyle = discoveryPanelHeight
    ? ({ "--lead-discovery-panel-height": `${discoveryPanelHeight}px` } as CSSProperties)
    : undefined;

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const response = await fetch("/api/account", { cache: "no-store" });
        const data = (await response.json()) as AccountResponse;

        if (!response.ok || !data.ok || !data.user) {
          throw new Error(data.error || "Account could not load");
        }

        setAccount(data.user);

        const employeeName = data.user.name?.trim();

        if (employeeName) {
          setEmployee(employeeName);
          setBulkOwner(employeeName);
        }

        if (data.user.role !== "admin" && employeeName) {
          setPipelineFilters((current) => ({ ...current, owner: employeeName }));
        }
      } catch {
        // The authenticated API still enforces pipeline access; leave the page usable if account chrome fails.
      }
    };

    queueMicrotask(() => {
      void loadAccount();
    });
  }, []);

  useEffect(() => {
    const panel = discoveryPanelRef.current;
    if (!panel) return;

    const syncPanelHeight = () => {
      setDiscoveryPanelHeight(Math.ceil(panel.getBoundingClientRect().height));
    };

    syncPanelHeight();

    const resizeObserver = new ResizeObserver(syncPanelHeight);
    resizeObserver.observe(panel);
    window.addEventListener("resize", syncPanelHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncPanelHeight);
    };
  }, []);

  useEffect(() => {
    const loadRecentRuns = async () => {
      try {
        const response = await fetch("/api/lead-search-runs", { cache: "no-store" });
        const data = (await response.json()) as LeadSearchRunsResponse;

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Lead search history could not load");
        }

        const runs = (data.runs || []).map((run) => leadSearchInputToForm(run.input)).slice(0, 5);
        setRecentRuns(runs);
        window.localStorage.setItem(recentRunsStorageKey, JSON.stringify(runs));
      } catch {
        const saved = window.localStorage.getItem(recentRunsStorageKey);
        if (!saved) return;

        try {
          const parsed = JSON.parse(saved) as LeadSearchForm[];
          setRecentRuns(parsed.slice(0, 5));
        } catch {
          window.localStorage.removeItem(recentRunsStorageKey);
        }
      }
    };

    queueMicrotask(() => {
      void loadRecentRuns();
    });
  }, []);

  function cacheRecentRun(nextRun: LeadSearchForm) {
    setRecentRuns((current) => {
      const next = [nextRun, ...current.filter((run) => recentRunKey(run) !== recentRunKey(nextRun))].slice(0, 5);
      window.localStorage.setItem(recentRunsStorageKey, JSON.stringify(next));
      return next;
    });
  }

  async function saveRecentRun(nextRun: LeadSearchForm, data: LeadScraperResponse) {
    cacheRecentRun(nextRun);

    try {
      const response = await fetch("/api/lead-search-runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: formToLeadSearchInput(nextRun),
          resultCount: data.leads?.length || 0,
          topLeadCompany: data.leads?.[0]?.company,
          warnings: data.warnings || [],
        }),
      });
      const saved = (await response.json()) as LeadSearchRunsResponse;

      if (response.ok && saved.ok && saved.run) {
        cacheRecentRun(leadSearchInputToForm(saved.run.input));
      }
    } catch {
      // Local history is already cached; server history is best-effort for degraded local/dev environments.
    }
  }

  function applyPreset(preset: LeadSearchPreset) {
    setForm((current) => ({ ...current, business: preset.business, niche: preset.niche }));
  }

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/lead-scraper", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formToLeadSearchInput(form)),
      });
      const data = (await response.json()) as LeadScraperResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Lead scraper request failed");
      }

      setResult(data);
      await saveRecentRun(form, data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lead scraper request failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const loadLeadIntelligencePackets = useCallback(async () => {
    try {
      const response = await fetch("/api/lead-intelligence", { cache: "no-store" });
      const data = (await response.json()) as LeadIntelligenceResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Lead intelligence packets could not load");
      }

      const packetMap = Object.fromEntries((data.packets || []).map((packet) => [packet.leadId, packet]));
      setSavedIntelligencePackets(packetMap);
    } catch {
      // Saved intelligence is an operator convenience; leave the pipeline usable if this fails.
    }
  }, []);

  const loadPipeline = useCallback(async () => {
    setPipelineLoading(true);
    setPipelineMessage("");

    try {
      const response = await fetch("/api/lead-pipeline", { cache: "no-store" });
      const data = (await response.json()) as PipelineResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Pipeline could not load");
      }

      setPipelineLeads(data.leads || []);
    } catch (caught) {
      setPipelineMessage(caught instanceof Error ? caught.message : "Pipeline could not load");
    } finally {
      setPipelineLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPipeline();
      void loadLeadIntelligencePackets();
    });
  }, [loadPipeline, loadLeadIntelligencePackets]);

  async function importLead(lead: LeadRecord) {
    setPipelineMessage("");

    try {
      const response = await fetch("/api/lead-pipeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lead, owner: employee }),
      });
      const data = (await response.json()) as PipelineResponse;

      if (response.status === 409) {
        if (data.existingLead) {
          setPipelineLeads((current) =>
            current.some((pipelineLead) => pipelineLead.id === data.existingLead!.id)
              ? current
              : [data.existingLead!, ...current]
          );
        }
        setPipelineMessage(
          `${lead.company} is already owned by ${data.existingLead?.owner || "another employee"}; duplicates are blocked globally.`
        );
        return;
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Lead import failed");
      }

      setPipelineLeads((current) => [data.lead!, ...current]);
      setPipelineMessage(`${lead.company} imported into ${employee}'s pipeline.`);
    } catch (caught) {
      setPipelineMessage(caught instanceof Error ? caught.message : "Lead import failed");
    }
  }

  async function updatePipelineLead(id: string, patch: PipelineLeadPatch, options: { quiet?: boolean } = {}) {
    if (!options.quiet) {
      setPipelineMessage("");
    }

    try {
      const response = await fetch("/api/lead-pipeline", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = (await response.json()) as PipelineResponse;

      if (!response.ok || !data.ok || !data.lead) {
        throw new Error(data.error || "Lead update failed");
      }

      setPipelineLeads((current) => current.map((lead) => (lead.id === id ? data.lead! : lead)));
      return data.lead;
    } catch (caught) {
      if (!options.quiet) {
        setPipelineMessage(caught instanceof Error ? caught.message : "Lead update failed");
      }
      return null;
    }
  }

  async function createOutreachDraft(lead: LeadRecord) {
    const text = buildOutreachDraft(lead);
    setOutreachDraft({ company: lead.company, text });
    setPipelineMessage(`Outreach draft prepared for ${lead.company}. Review before using it externally.`);

    try {
      await navigator.clipboard.writeText(text);
      setPipelineMessage(`Outreach draft copied for ${lead.company}. Review before sending.`);
    } catch {
      // Clipboard access can be blocked outside secure browser contexts; the visible draft still gives Tyler the copy.
    }
  }

  async function createIntelligencePacket(lead: LeadRecord) {
    setPipelineMessage("");

    try {
      const response = await fetch("/api/lead-intelligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lead }),
      });
      const data = (await response.json()) as LeadIntelligenceResponse;

      if (!response.ok || !data.ok || !data.packet) {
        throw new Error(data.error || "Lead intelligence failed");
      }

      setIntelligencePacket(data.packet);
      setSavedIntelligencePackets((current) => ({ ...current, [data.packet!.leadId]: data.packet! }));
      setPipelineMessage(`Lead intelligence packet saved for ${lead.company}. Review before using externally.`);
    } catch (caught) {
      setPipelineMessage(caught instanceof Error ? caught.message : "Lead intelligence failed");
    }
  }

  async function updateIntelligenceStatus(packet: LeadIntelligencePacket, status: LeadIntelligencePacket["status"]) {
    try {
      const response = await fetch("/api/lead-intelligence", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: packet.leadId, status }),
      });
      const data = (await response.json()) as LeadIntelligenceResponse;

      if (!response.ok || !data.ok || !data.packet) {
        throw new Error(data.error || "Lead intelligence status update failed");
      }

      setIntelligencePacket(data.packet);
      setSalesActionBrief((current) => current?.company === data.packet!.company ? buildLeadSalesActionBrief(data.packet!) : current);
      setSavedIntelligencePackets((current) => ({ ...current, [data.packet!.leadId]: data.packet! }));
      const matchingLead = pipelineLeads.find((lead) => lead.id === data.packet!.leadId);
      if (matchingLead) {
        void updatePipelineLead(matchingLead.id, {
          salesPrepStatus: status === "used" ? "used" : matchingLead.salesPrepStatus,
          lastTouchedAt: status === "used" ? new Date().toISOString() : matchingLead.lastTouchedAt,
        });
      }
      setPipelineMessage(`${data.packet.company} intelligence marked ${status.replaceAll("_", " ")}.`);
    } catch (caught) {
      setPipelineMessage(caught instanceof Error ? caught.message : "Lead intelligence status update failed");
    }
  }

  async function copyIntelligencePacket(packet: LeadIntelligencePacket) {
    const text = formatLeadIntelligencePacketForCopy(packet);

    try {
      await navigator.clipboard.writeText(text);
      setPipelineMessage(`Lead intelligence packet copied for ${packet.company}. Review before using externally.`);
    } catch {
      setPipelineMessage("Clipboard access was blocked. The packet is still visible for manual copy/review.");
    }
  }

  function prepareSalesActionBrief(packet: LeadIntelligencePacket) {
    const brief = buildLeadSalesActionBrief(packet);
    setSalesActionBrief(brief);
    setIntelligencePacket(packet);
    setPipelineMessage(
      packet.status === "draft"
        ? `${packet.company} sales prep is drafted. Approve the packet before using client-facing copy.`
        : `${packet.company} discovery, audit, and proposal prep is ready.`
    );

    const lead = pipelineLeads.find((item) => item.id === packet.leadId);
    if (lead) {
      void updatePipelineLead(lead.id, {
        salesPrepStatus: packet.status === "used" ? "used" : "ready",
        prepWorkspaceNotes: brief.proposalOutline.join("\n"),
      });
    }
  }

  async function copySalesActionBrief(brief: LeadSalesActionBrief) {
    const text = formatLeadSalesActionBriefForCopy(brief);

    try {
      await navigator.clipboard.writeText(text);
      setPipelineMessage(`Sales action brief copied for ${brief.company}. Verify facts before sending.`);
    } catch {
      setPipelineMessage("Clipboard access was blocked. The sales action brief is still visible for manual copy/review.");
    }
  }

  function followUpDate(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  function markLeadTouched(lead: PipelineLead, nextAction: string, daysUntilFollowUp = 3) {
    void updatePipelineLead(lead.id, {
      nextAction,
      lastTouchedAt: new Date().toISOString(),
      nextFollowUpAt: followUpDate(daysUntilFollowUp),
    });
  }

  function applyLeadQuickAction(lead: PipelineLead, action: ReturnType<typeof getLeadQuickActions>[number]) {
    void updatePipelineLead(lead.id, {
      stage: action.stage,
      nextAction: action.nextAction,
      lastTouchedAt: new Date().toISOString(),
      nextFollowUpAt: action.followUpInDays ? followUpDate(action.followUpInDays) : undefined,
    });
  }

  async function copyPipelineLeadBrief(lead: PipelineLead) {
    const text = formatPipelineLeadBriefForCopy(lead);

    try {
      await navigator.clipboard.writeText(text);
      setPipelineMessage(`Lead brief copied for ${lead.company}.`);
    } catch {
      setPipelineMessage("Clipboard access was blocked. The lead details are still visible for manual copy.");
    }
  }

  async function convertLeadToClientWorkspace(lead: PipelineLead) {
    if (lead.stage !== "closed_won") {
      setPipelineMessage("Move the lead to Closed Won before creating a client workspace.");
      return;
    }

    const savedPacket = savedIntelligencePackets[lead.id];
    const salesBrief = savedPacket ? buildLeadSalesActionBrief(savedPacket) : null;
    const workspace = buildClientWorkspaceFromPipelineLead({
      ...lead,
      niche: salesBrief?.recommendedOffer.name || lead.niche,
      notes: [
        lead.notes,
        savedPacket ? `Approved packet: ${savedPacket.painHypothesis}` : "",
        salesBrief ? `Proposal outline: ${salesBrief.proposalOutline.join(" | ")}` : "",
      ].filter(Boolean).join("\n"),
      nextAction: salesBrief?.nextStep || lead.nextAction,
    });

    try {
      const response = await fetch("/api/client-workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspace }),
      });
      const data = (await response.json()) as ClientWorkspaceResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Client workspace could not be saved");
      }

      setPipelineMessage(`${lead.company} converted into a durable client delivery workspace. Open Clients to continue handoff.`);
    } catch (caught) {
      setPipelineMessage(caught instanceof Error ? caught.message : "Client workspace could not be saved");
    }
  }

  async function copyPipelineDailyBrief() {
    const text = formatPipelineDailyBriefForCopy(filteredPipelineLeads);

    try {
      await navigator.clipboard.writeText(text);
      setPipelineMessage("Pipeline daily brief copied for the current filters.");
    } catch {
      setPipelineMessage("Clipboard access was blocked. Pipeline cards are still visible for manual review.");
    }
  }

  async function copyEmployeePipelineRollup() {
    const text = formatPipelineOwnerSummaryForCopy(pipelineLeads);

    try {
      await navigator.clipboard.writeText(text);
      setPipelineMessage("Employee pipeline rollup copied for admin handoff.");
    } catch {
      setPipelineMessage("Clipboard access was blocked. Employee rollup is still visible for manual review.");
    }
  }

  const leads = result?.leads || [];
  async function copyPipelineAttentionBrief() {
    const text = formatPipelineAttentionBriefForCopy(filteredPipelineLeads);

    try {
      await navigator.clipboard.writeText(text);
      setPipelineMessage("Attention queue copied for admin triage.");
    } catch {
      setPipelineMessage(text);
    }
  }

  function applyPipelineSavedView(filters: Partial<PipelineFilters>) {
    setPipelineFilters((current) => ({ ...current, ...filters }));
  }

  const sourceLinks = result?.sourceLinks || [];
  const queries = result?.queries || [];
  const isAdminAccount = account?.role === "admin";
  const signedInEmployeeName = account?.name?.trim() || employee.trim();
  const effectivePipelineOwner = isAdminAccount
    ? (pipelineFilters.owner === "all" ? undefined : pipelineFilters.owner)
    : signedInEmployeeName || undefined;
  const { stage: pipelineStageFilter, sortBy: pipelineSortBy, noWebsiteOnly, hasPhoneOnly, hotScoreOnly } = pipelineFilters;
  const pipelineOwners = useMemo(
    () => Array.from(new Set(pipelineLeads.map((lead) => lead.owner))).sort((a, b) => a.localeCompare(b)),
    [pipelineLeads]
  );
  const pipelineOwnerOptions = useMemo(
    () => isAdminAccount ? pipelineOwners : pipelineOwners.filter((owner) => owner !== signedInEmployeeName),
    [isAdminAccount, pipelineOwners, signedInEmployeeName]
  );
  const filteredPipelineLeads = filterPipelineLeads(pipelineLeads, {
    owner: effectivePipelineOwner,
    stage: pipelineStageFilter,
    sortBy: pipelineSortBy,
    noWebsiteOnly,
    hasPhoneOnly,
    hotScoreOnly,
  });
  const pipelineNow = useMemo(() => new Date(), []);
  const ownerPipelineSummaries = useMemo(() => summarizePipelineByOwner(pipelineLeads), [pipelineLeads]);
  const allOwnerSummary = useMemo(() => ownerPipelineSummaries.reduce(
    (summary, owner) => ({
      openLeads: summary.openLeads + owner.openLeads,
      hotLeads: summary.hotLeads + owner.hotLeads,
      staleLeads: summary.staleLeads + owner.staleLeads,
      prepReadyLeads: summary.prepReadyLeads + owner.prepReadyLeads,
      dueSoonLeads: summary.dueSoonLeads + owner.dueSoonLeads,
    }),
    { openLeads: 0, hotLeads: 0, staleLeads: 0, prepReadyLeads: 0, dueSoonLeads: 0 }
  ), [ownerPipelineSummaries]);
  const todayFocusLeads = useMemo(() => selectTodayFocusLeads(filteredPipelineLeads, pipelineNow, 3), [filteredPipelineLeads, pipelineNow]);
  const salesPrepQueue = useMemo(() => Object.values(savedIntelligencePackets)
    .filter((packet) => packet.status === "approved")
    .map((packet) => ({ packet, lead: pipelineLeads.find((lead) => lead.id === packet.leadId) }))
    .filter((item): item is { packet: LeadIntelligencePacket; lead: PipelineLead } => Boolean(item.lead) && item.lead?.salesPrepStatus !== "used")
    .sort((a, b) => deriveLeadPriority(b.lead).score - deriveLeadPriority(a.lead).score || Date.parse(b.packet.generatedAt) - Date.parse(a.packet.generatedAt))
    .slice(0, 6), [pipelineLeads, savedIntelligencePackets]);
  const attentionItems = useMemo(() => selectPipelineAttentionItems(filteredPipelineLeads, pipelineNow, 8), [filteredPipelineLeads, pipelineNow]);
  const staleLeadNudges = useMemo(() => selectStaleLeadNudges(filteredPipelineLeads, pipelineNow, 6), [filteredPipelineLeads, pipelineNow]);
  const pipelineHealth = useMemo(() => pipelineLeads.reduce(
    (health, lead) => {
      const isClosed = lead.stage === "closed_won" || lead.stage === "closed_lost";
      if (lead.stage === "closed_won") health.closedWon += 1;
      if (!isClosed) {
        health.open += 1;
        if (deriveLeadPriority(lead).tier === "hot" && lead.salesPrepStatus !== "ready" && lead.salesPrepStatus !== "used") health.hotWithoutPrep += 1;
      }
      if (["contacted", "interested", "pricing_requested", "meeting_requested"].includes(lead.stage) && !lead.nextFollowUpAt) health.activeWithoutFollowUp += 1;
      return health;
    },
    { open: 0, closedWon: 0, hotWithoutPrep: 0, activeWithoutFollowUp: 0 }
  ), [pipelineLeads]);
  const selectedPipelineLeadSet = useMemo(() => new Set(selectedPipelineLeadIds), [selectedPipelineLeadIds]);
  const selectedPipelineLeads = useMemo(() => filteredPipelineLeads.filter((lead) => selectedPipelineLeadSet.has(lead.id)), [filteredPipelineLeads, selectedPipelineLeadSet]);
  const selectedHotPipelineLeads = useMemo(() => selectedPipelineLeads.filter((lead) => deriveLeadPriority(lead).tier === "hot"), [selectedPipelineLeads]);
  const allFilteredPipelineLeadsSelected = filteredPipelineLeads.length > 0 && filteredPipelineLeads.every((lead) => selectedPipelineLeadSet.has(lead.id));

  function togglePipelineLeadSelection(id: string) {
    setSelectedPipelineLeadIds((current) => current.includes(id) ? current.filter((leadId) => leadId !== id) : [...current, id]);
  }

  function selectVisiblePipelineLeads() {
    setSelectedPipelineLeadIds((current) => {
      const visibleIds = filteredPipelineLeads.map((lead) => lead.id);
      if (visibleIds.length === 0) return current;
      return allFilteredPipelineLeadsSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function applyBulkPipelinePatch(label: string, patch: PipelineLeadPatch) {
    if (!isAdminAccount) {
      setPipelineMessage("Bulk admin actions are only available to admin accounts.");
      return;
    }

    if (selectedPipelineLeads.length === 0) {
      setPipelineMessage("Select one or more pipeline leads before running a bulk action.");
      return;
    }

    setBulkActionLoading(true);
    setPipelineMessage("");

    const updatedIds: string[] = [];
    for (const lead of selectedPipelineLeads) {
      const updated = await updatePipelineLead(lead.id, patch, { quiet: true });
      if (updated) updatedIds.push(lead.id);
    }

    setSelectedPipelineLeadIds((current) => current.filter((id) => !updatedIds.includes(id)));
    setPipelineMessage(`${label} applied to ${updatedIds.length} selected lead${updatedIds.length === 1 ? "" : "s"}.`);
    setBulkActionLoading(false);
  }

  async function reassignSelectedPipelineLeads() {
    const patch = buildPipelineBulkActionPatch("reassign", { owner: bulkOwner });
    if (!patch.owner) {
      setPipelineMessage("Enter an employee name before reassigning selected leads.");
      return;
    }

    await applyBulkPipelinePatch(`Reassigned to ${patch.owner}`, patch);
  }

  async function markSelectedPipelineLeadsWorked() {
    await applyBulkPipelinePatch("Worked today", buildPipelineBulkActionPatch("worked_today", { nextFollowUpInDays: 3 }));
  }

  async function closeSelectedPipelineLeadsLost() {
    await applyBulkPipelinePatch("Closed lost", buildPipelineBulkActionPatch("closed_lost"));
  }

  async function createBulkPrepPacketsForSelectedHotLeads() {
    if (!isAdminAccount) {
      setPipelineMessage("Bulk admin actions are only available to admin accounts.");
      return;
    }

    const leadsToPrep = selectedHotPipelineLeads.filter((lead) => !savedIntelligencePackets[lead.id]);
    if (leadsToPrep.length === 0) {
      setPipelineMessage("Select hot leads without saved prep packets before generating bulk prep.");
      return;
    }

    setBulkActionLoading(true);
    setPipelineMessage("");
    const packetMap: Record<string, LeadIntelligencePacket> = {};
    let created = 0;

    for (const lead of leadsToPrep) {
      try {
        const response = await fetch("/api/lead-intelligence", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lead: pipelineLeadToLeadRecord(lead) }),
        });
        const data = (await response.json()) as LeadIntelligenceResponse;

        if (response.ok && data.ok && data.packet) {
          packetMap[data.packet.leadId] = data.packet;
          created += 1;
          await updatePipelineLead(lead.id, {
            salesPrepStatus: "ready",
            prepWorkspaceNotes: "Bulk prep packet generated from admin selection.",
            lastTouchedAt: new Date().toISOString(),
          }, { quiet: true });
        }
      } catch {
        // Keep the bulk run moving; the final count tells admin what succeeded.
      }
    }

    if (created > 0) {
      setSavedIntelligencePackets((current) => ({ ...current, ...packetMap }));
      setIntelligencePacket(Object.values(packetMap).at(-1) || null);
      setSelectedPipelineLeadIds((current) => current.filter((id) => !Object.keys(packetMap).includes(id)));
    }

    setPipelineMessage(`Generated ${created} prep packet${created === 1 ? "" : "s"} for selected hot leads.`);
    setBulkActionLoading(false);
  }

  return (
    <AppShell
      active="leads"
      eyebrow="Employee-only intelligence"
      title="AI Lead Scraper + Pipeline"
      description="Find local companies, enrich phone numbers through Google Places, and import unique leads into employee-owned Liminull pipelines."
      businessId="liminull"
    >
      <div className="lead-dashboard-readable">
      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <div className="liminull-card-soft p-4">
          <p className="liminull-eyebrow">Operator briefing</p>
          <h2 className="mt-2 text-xl font-black tracking-[-0.05em] text-white">Today’s revenue cockpit</h2>
          <p className="mt-2 text-xs leading-5 liminull-muted">
            Work approved packets first, then stale follow-ups, then new high-fit discovery.
          </p>
          <button
            type="button"
            onClick={copyPipelineDailyBrief}
            className="mt-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-50"
          >
            Copy daily brief
          </button>
        </div>
        <div className="liminull-card-soft p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/60">Sales prep ready</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">{salesPrepQueue.length}</p>
          <p className="mt-1 text-xs liminull-muted">Approved packets not marked used</p>
        </div>
        <div className="liminull-card-soft p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100/60">Needs attention</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">{attentionItems.length}</p>
          <p className="mt-1 text-xs liminull-muted">Missing action, prep, or follow-up pressure</p>
        </div>
        <div className="liminull-card-soft p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100/60">Client handoffs</p>
          <p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">{pipelineHealth.closedWon}</p>
          <p className="mt-1 text-xs liminull-muted">Closed-won leads ready for delivery OS</p>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
        <form ref={discoveryPanelRef} onSubmit={runSearch} className="liminull-card-soft self-start p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="liminull-eyebrow">Search inputs</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                Local company discovery
              </h2>
              <p className="mt-2 text-sm liminull-muted">
                Enter any business type, market, radius, and niche. Phone numbers come from Google Place Details when available.
              </p>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
              Staff
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Niche presets</p>
              <div className="flex flex-wrap gap-2">
                {leadSearchPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {recentRuns.length > 0 && (
              <div className="grid gap-2">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Recent runs</p>
                <div className="grid gap-2">
                  {recentRuns.map((run) => (
                    <button
                      key={`${run.business}-${run.location}-${run.niche}`}
                      type="button"
                      onClick={() => setForm(run)}
                      className="rounded-2xl border border-white/5 bg-black/20 px-3 py-2 text-left text-xs text-white/65 transition hover:border-cyan-300/20 hover:bg-cyan-300/10"
                    >
                      <span className="font-black text-white">{run.business}</span>
                      <span className="text-white/40"> in {run.location} · {run.niche}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="grid gap-2 text-sm font-semibold text-white/80">
              Employee importing leads
              <input
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
                placeholder="Tyler, Jack, etc."
                disabled={Boolean(account && !isAdminAccount)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-70"
              />
              {account && !isAdminAccount && (
                <span className="text-xs font-medium text-white/45">Employee accounts import into their own pipeline only.</span>
              )}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-white/80">
              Business / company type
              <input
                value={form.business}
                onChange={(event) => setForm((current) => ({ ...current, business: event.target.value }))}
                placeholder="law firms, restaurants, clinics, HVAC companies..."
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-white/80">
              Location
              <input
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="City, state, region"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                Distance (miles)
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.distanceMiles}
                  onChange={(event) => setForm((current) => ({ ...current, distanceMiles: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-white/80">
                AI niche
                <input
                  value={form.niche}
                  onChange={(event) => setForm((current) => ({ ...current, niche: event.target.value }))}
                  placeholder="AI phones, intake, workflows..."
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
                />
              </label>
            </div>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.03]">
              <span>
                <span className="block font-black text-white">Only scrape businesses without a website</span>
                <span className="mt-1 block text-xs leading-5 liminull-muted">
                  Filters enriched Google profiles so businesses with a website attached are hidden.
                </span>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Only scrape businesses without a website attached to their Google profile"
                checked={form.onlyWithoutWebsite}
                onChange={(event) => setForm((current) => ({ ...current, onlyWithoutWebsite: event.target.checked }))}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full border border-white/10 bg-white/10 transition after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white/80 after:shadow-lg after:shadow-black/30 after:transition peer-checked:border-cyan-300/30 peer-checked:bg-cyan-300/30 peer-checked:after:translate-x-5 peer-checked:after:bg-cyan-100"
              />
            </label>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div>
                <p className="text-sm font-black text-white">Advanced lead filters</p>
                <p className="mt-1 text-xs leading-5 liminull-muted">
                  Filter after Place Details enrichment so phone and website fields are real, not just search-result guesses.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  Min rating
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.minRating}
                    onChange={(event) => setForm((current) => ({ ...current, minRating: event.target.value }))}
                    placeholder="4.2"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
                  />
                </label>

                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  Min reviews
                  <input
                    type="number"
                    min="0"
                    value={form.minReviews}
                    onChange={(event) => setForm((current) => ({ ...current, minReviews: event.target.value }))}
                    placeholder="25"
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
                  />
                </label>
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white/75">
                <span>Require phone number</span>
                <input
                  type="checkbox"
                  checked={form.hasPhoneOnly}
                  onChange={(event) => setForm((current) => ({ ...current, hasPhoneOnly: event.target.checked }))}
                  className="h-4 w-4 accent-cyan-300"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white/75">
                <span>Website looks weak or missing</span>
                <input
                  type="checkbox"
                  checked={form.weakWebsiteCandidate}
                  onChange={(event) => setForm((current) => ({ ...current, weakWebsiteCandidate: event.target.checked }))}
                  className="h-4 w-4 accent-cyan-300"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="liminull-button mt-6 w-full justify-center disabled:opacity-60">
            {loading ? "Searching..." : "Run lead scrape"}
          </button>
        </form>

        <div
          className="grid min-w-0 gap-5 self-start lg:h-[var(--lead-discovery-panel-height)] lg:max-h-[var(--lead-discovery-panel-height)] lg:min-h-0 lg:self-stretch"
          style={discoveryPanelHeightStyle}
        >
          <div className="liminull-card-soft self-start p-5 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:self-stretch lg:overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="liminull-eyebrow">Google Places leads</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                  Ranked prospects
                </h2>
              </div>
              <span className="rounded-full border border-cyan-300/10 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                {leads.length} found
              </span>
            </div>

            {result?.warnings?.map((warning) => (
              <div key={warning} className="mt-4 rounded-2xl border border-amber-200/15 bg-amber-300/10 p-4 text-sm text-amber-50">
                {warning}
              </div>
            ))}

            <div className="mt-5 grid max-h-[620px] gap-3 overflow-y-auto pr-1 lg:h-0 lg:max-h-none lg:min-h-0 lg:flex-1">
              {!result && (
                <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm liminull-muted">
                  Run a search to populate scored Google Places leads and platform discovery links.
                </div>
              )}

              {result && leads.length === 0 && (
                <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm liminull-muted">
                  No Google Places leads matched these filters. Broaden rating/review thresholds, turn off phone/website filters, or verify the Places API key restrictions.
                </div>
              )}

              {leads.map((lead) => (
                <article key={lead.id} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-white">{lead.company}</h3>
                      <p className="mt-1 truncate text-xs liminull-muted">{lead.location}</p>
                      <p className="mt-2 text-sm text-cyan-100">{lead.phone || "No phone found"}</p>
                      <p className="mt-1 truncate text-xs text-white/45">
                        {lead.website || "No website attached to Google profile"}
                      </p>
                      <p className="mt-2 text-xs text-white/55">{buildLeadFitSummary(lead)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-cyan-300/10 px-3 py-1 text-sm font-black text-cyan-100">
                      {lead.score}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.size}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.aiIntent} intent</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.rating ? `${lead.rating}★` : "No rating"}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.reviewCount || 0} reviews</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.website ? "Website attached" : "No website"}</span>
                    {isWeakWebsiteLead(lead) && <span className="rounded-full bg-amber-300/10 px-3 py-1 text-amber-100">Weak web signal</span>}
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.niche}</span>
                  </div>
                  <ul className="mt-3 line-clamp-2 list-disc space-y-1 pl-5 text-xs text-white/60">
                    {lead.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => importLead(lead)}
                      className="liminull-button inline-flex px-4 py-2 text-sm"
                    >
                      Import
                    </button>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${lead.company} ${lead.location} business owner`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-50"
                    >
                      Research
                    </a>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${lead.company} ${lead.location} website`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-50"
                    >
                      Website audit
                    </a>
                    <button
                      type="button"
                      onClick={() => createOutreachDraft(lead)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-50"
                    >
                      Outreach draft
                    </button>
                    <button
                      type="button"
                      onClick={() => createIntelligencePacket(lead)}
                      className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-50 transition hover:border-cyan-300/30 hover:bg-cyan-300/15"
                    >
                      Intelligence packet
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {outreachDraft && (
              <div className="mt-5 rounded-2xl border border-cyan-300/35 bg-cyan-50/95 p-4 shadow-[0_18px_45px_rgba(14,116,144,0.10)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Draft copied / review required</p>
                    <h3 className="mt-1 text-sm font-black text-slate-950">{outreachDraft.company}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOutreachDraft(null)}
                    className="rounded-full border border-slate-300/70 bg-white/65 px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-950"
                  >
                    Clear
                  </button>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{outreachDraft.text}</p>
              </div>
            )}

            {intelligencePacket && (
              <div className="mt-5 rounded-2xl border border-emerald-300/40 bg-emerald-50/95 p-4 shadow-[0_18px_45px_rgba(5,150,105,0.10)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Lead intelligence / review required</p>
                    <h3 className="mt-1 text-sm font-black text-slate-950">{intelligencePacket.company}</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {intelligencePacket.recommendedOffer} · {intelligencePacket.status}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => copyIntelligencePacket(intelligencePacket)}
                      className="rounded-full border border-emerald-300/55 bg-emerald-100/90 px-3 py-1 text-xs font-bold text-emerald-800 shadow-sm hover:border-emerald-400/70 hover:bg-emerald-200/70"
                    >
                      Copy packet
                    </button>
                    {intelligencePacket.status !== "approved" && intelligencePacket.status !== "used" && (
                      <button
                        type="button"
                        onClick={() => updateIntelligenceStatus(intelligencePacket, "approved")}
                        className="rounded-full border border-cyan-300/55 bg-cyan-100/90 px-3 py-1 text-xs font-bold text-cyan-800 shadow-sm hover:border-cyan-400/70 hover:bg-cyan-200/70"
                      >
                        Approve
                      </button>
                    )}
                    {intelligencePacket.status !== "used" && (
                      <button
                        type="button"
                        onClick={() => updateIntelligenceStatus(intelligencePacket, "used")}
                        className="rounded-full border border-amber-300/60 bg-amber-100/90 px-3 py-1 text-xs font-bold text-amber-800 shadow-sm hover:border-amber-400/75 hover:bg-amber-200/70"
                      >
                        Mark used
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => prepareSalesActionBrief(intelligencePacket)}
                      className="rounded-full border border-violet-300/55 bg-violet-100/90 px-3 py-1 text-xs font-bold text-violet-800 shadow-sm hover:border-violet-400/70 hover:bg-violet-200/70"
                    >
                      Prep sales action
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntelligencePacket(null)}
                      className="rounded-full border border-slate-300/70 bg-white/65 px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-950"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700/80">Pain hypothesis</p>
                    <p className="mt-1">{intelligencePacket.painHypothesis}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700/80">Website notes</p>
                    <p className="mt-1">{intelligencePacket.websiteNotes}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700/80">Outreach hook</p>
                    <p className="mt-1">{intelligencePacket.outreachHook}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700/80">Discovery questions</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {intelligencePacket.discoveryQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="rounded-2xl border border-emerald-200/70 bg-white/70 p-3 text-xs text-slate-600">
                    {intelligencePacket.approvalNote}
                  </p>
                </div>
              </div>
            )}

            {salesActionBrief && (
              <div className="mt-5 rounded-2xl border border-violet-300/15 bg-violet-300/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-100/70">Sales action brief / internal prep</p>
                    <h3 className="mt-1 text-sm font-black text-white">{salesActionBrief.company}</h3>
                    <p className="mt-1 text-xs text-slate-600">{salesActionBrief.readinessLabel}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => copySalesActionBrief(salesActionBrief)}
                      className="rounded-full border border-violet-300/55 bg-violet-100/90 px-3 py-1 text-xs font-bold text-violet-800 shadow-sm hover:border-violet-400/70 hover:bg-violet-200/70"
                    >
                      Copy sales brief
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalesActionBrief(null)}
                      className="rounded-full border border-slate-300/70 bg-white/65 px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-950"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/60">Recommended package</p>
                    <p className="mt-2 text-sm font-black text-white">{salesActionBrief.recommendedOffer.name}</p>
                    <p className="mt-2 text-xs leading-5 text-violet-50/80">{salesActionBrief.recommendedOffer.why}</p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/60">Discovery agenda</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-violet-50/85">
                      {salesActionBrief.discoveryAgenda.map((item) => <li key={item}>{item}</li>)}
                    </ol>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/60">Mini audit outline</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-violet-50/85">
                      {salesActionBrief.miniAuditOutline.map((item) => <li key={item}>{item}</li>)}
                    </ol>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-100/60">Proposal outline</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-violet-50/85">
                      {salesActionBrief.proposalOutline.map((item) => <li key={item}>{item}</li>)}
                    </ol>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 rounded-2xl border border-white/5 bg-black/20 p-3 text-xs leading-5 text-white/60">
                  <p>{salesActionBrief.nextStep}</p>
                  <p>{salesActionBrief.recommendedOffer.tylerDecision}</p>
                  <p>{salesActionBrief.reviewNote}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="liminull-card-soft p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="liminull-eyebrow">Sales Prep Queue</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">Approved packets ready to work</h2>
              <p className="mt-2 text-sm liminull-muted">Copy a sales brief, mark the packet used, or jump back into the source packet.</p>
            </div>
            <span className="rounded-full bg-violet-300/10 px-3 py-1 text-xs font-black text-violet-100">{salesPrepQueue.length} ready</span>
          </div>
          <div className="mt-4 grid gap-3">
            {salesPrepQueue.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm liminull-muted">No approved unused packets yet. Approve a lead intelligence packet to queue sales prep here.</div>
            ) : salesPrepQueue.map(({ packet, lead }) => {
              const brief = buildLeadSalesActionBrief(packet);
              return (
                <article key={packet.id} className="rounded-2xl border border-violet-300/10 bg-violet-300/[0.05] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-white">{packet.company}</h3>
                      <p className="mt-1 text-xs text-slate-600">{brief.recommendedOffer.name} · {deriveLeadPriority(lead).tier}</p>
                    </div>
                    <span className="rounded-full bg-violet-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-violet-100">approved</span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-violet-50/80">{brief.nextStep}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => prepareSalesActionBrief(packet)} className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-bold text-violet-50">Open prep</button>
                    <button type="button" onClick={() => copySalesActionBrief(brief)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/70">Copy brief</button>
                    <button type="button" onClick={() => updateIntelligenceStatus(packet, "used")} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-50">Mark used</button>
                    <button type="button" onClick={() => setIntelligencePacket(packet)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60">Open packet</button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="liminull-card-soft p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="liminull-eyebrow">Follow-up nudges</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">Stale lead rescue</h2>
              <p className="mt-2 text-sm liminull-muted">Keep good leads from becoming database clutter.</p>
            </div>
            <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">{staleLeadNudges.length} due</span>
          </div>
          <div className="mt-4 grid gap-3">
            {staleLeadNudges.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm liminull-muted">No stale leads under the current filters.</div>
            ) : staleLeadNudges.map((lead) => (
              <article key={lead.id} className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.05] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-white">{lead.company}</h3>
                    <p className="mt-1 text-xs text-slate-600">{lead.owner} · {stageLabel(lead.stage)}</p>
                  </div>
                  <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-100">follow up</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-amber-50/80">{lead.nextAction}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => markLeadTouched(lead, "Follow up sent — wait for response", 4)} className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-50">Followed up</button>
                  <button type="button" onClick={() => updatePipelineLead(lead.id, { stage: "meeting_requested", nextAction: "Prep discovery call agenda", lastTouchedAt: new Date().toISOString(), nextFollowUpAt: followUpDate(1) })} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-50">Discovery booked</button>
                  <button type="button" onClick={() => updatePipelineLead(lead.id, { stage: "closed_lost", nextAction: "Moved to no-fit/nurture", lastTouchedAt: new Date().toISOString() })} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/60">No fit</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="liminull-card-soft p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="liminull-eyebrow">Employee lead pipeline</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
              Pipeline command center
            </h2>
            <p className="mt-2 text-sm liminull-muted">
              Admin view shows every employee’s leads by default. Filter by owner/stage or sort alphabetically to work the shared pipeline cleanly.
            </p>
          </div>
          <button type="button" onClick={loadPipeline} disabled={pipelineLoading} className="liminull-button disabled:opacity-60">
            {pipelineLoading ? "Loading..." : "Refresh pipeline"}
          </button>
        </div>

        {pipelineMessage && (
          <div className="mt-4 rounded-2xl border border-cyan-300/35 bg-cyan-50/95 p-4 shadow-[0_18px_45px_rgba(14,116,144,0.10)] text-sm text-cyan-50">
            {pipelineMessage}
          </div>
        )}

        {isAdminAccount && (
          <PipelineHealthPanel
            totalLeads={pipelineLeads.length}
            openLeads={pipelineHealth.open}
            closedWonLeads={pipelineHealth.closedWon}
            hotWithoutPrep={pipelineHealth.hotWithoutPrep}
            activeWithoutFollowUp={pipelineHealth.activeWithoutFollowUp}
            staleByEmployee={ownerPipelineSummaries}
          />
        )}

        {isAdminAccount && (
          <EmployeePipelineSummary
            summaries={ownerPipelineSummaries}
            allSummary={allOwnerSummary}
            selectedOwner={pipelineFilters.owner}
            onSelectOwner={(owner) => setPipelineFilters((current) => ({ ...current, owner }))}
            onCopySummary={copyEmployeePipelineRollup}
          />
        )}

        <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">Saved views</p>
              <p className="mt-1 text-xs liminull-muted">Jump into the highest-use pipeline cuts without rebuilding filters by hand.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pipelineSavedViews.map((view) => (
                <button key={view.label} type="button" onClick={() => applyPipelineSavedView(view.filters)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/65 transition hover:border-cyan-300/25 hover:text-cyan-50">
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isAdminAccount && (
          <NeedsAttentionPanel
            items={attentionItems}
            onCopyQueue={copyPipelineAttentionBrief}
            onSelectLead={togglePipelineLeadSelection}
            onMarkWorked={(lead) => markLeadTouched(lead, "Attention queue worked — follow up on response", 3)}
            onCreatePrep={(lead) => createIntelligencePacket(pipelineLeadToLeadRecord(lead))}
          />
        )}

        <div className="mt-5 grid gap-4 rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-white">Today’s focus</p>
              <p className="mt-1 text-xs liminull-muted">Top open leads by score, contactability, weak web presence, and stale next action.</p>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              {todayFocusLeads.length} queued
            </span>
          </div>

          {todayFocusLeads.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm liminull-muted">
              No open focus leads match the current filters.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {todayFocusLeads.map((lead) => {
                const priority = deriveLeadPriority(lead);
                const savedPacket = savedIntelligencePackets[lead.id];
                return (
                  <article key={lead.id} className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-white">{lead.company}</h3>
                        <p className="mt-1 truncate text-xs text-white/45">{lead.owner} · {stageLabel(lead.stage)}</p>
                      </div>
                      <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs font-black uppercase text-cyan-100">
                        {priority.tier}
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-cyan-50/80">{lead.nextAction}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                      {priority.signals.slice(0, 3).map((signal) => (
                        <span key={signal} className="rounded-full bg-white/5 px-2 py-1">{signal}</span>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => savedPacket ? prepareSalesActionBrief(savedPacket) : createIntelligencePacket(pipelineLeadToLeadRecord(lead))}
                        className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-50"
                      >
                        {savedPacket ? "Open prep" : "Create packet"}
                      </button>
                      <button
                        type="button"
                        onClick={() => createOutreachDraft(pipelineLeadToLeadRecord(lead))}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/70"
                      >
                        Copy outreach
                      </button>
                      <button
                        type="button"
                        onClick={() => markLeadTouched(lead, "Focus lead worked — follow up on response", 3)}
                        className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-50"
                      >
                        Worked today
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
            Employee view
            <select
              value={isAdminAccount ? pipelineFilters.owner : signedInEmployeeName}
              onChange={(event) => setPipelineFilters((current) => ({ ...current, owner: event.target.value }))}
              disabled={Boolean(account && !isAdminAccount)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isAdminAccount && <option value="all">Admin: all employees</option>}
              {!isAdminAccount && <option value={signedInEmployeeName}>{signedInEmployeeName || "My leads"}</option>}
              {pipelineOwnerOptions.map((owner) => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
            {isAdminAccount ? (
              <span className="normal-case tracking-normal text-white/40">Admins can inspect every employee pipeline or narrow to one owner.</span>
            ) : (
              <span className="normal-case tracking-normal text-white/40">Employee accounts only see their assigned pipeline.</span>
            )}
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
            Stage
            <select
              value={pipelineFilters.stage}
              onChange={(event) => setPipelineFilters((current) => ({ ...current, stage: event.target.value as LeadPipelineStage | "all" }))}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
            >
              <option value="all">All stages</option>
              {pipelineStages.map((stage) => (
                <option key={stage} value={stage}>{stageLabel(stage)}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
            Sort
            <select
              value={pipelineFilters.sortBy}
              onChange={(event) => setPipelineFilters((current) => ({ ...current, sortBy: event.target.value as PipelineFilters["sortBy"] }))}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
            >
              <option value="company">Name A-Z</option>
              <option value="priority">Priority</option>
            </select>
          </label>

          <div className="flex flex-wrap items-end gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs font-bold text-white/65">
              <input
                type="checkbox"
                checked={pipelineFilters.hotScoreOnly}
                onChange={(event) => setPipelineFilters((current) => ({ ...current, hotScoreOnly: event.target.checked }))}
                className="h-4 w-4 accent-cyan-300"
              />
              Hot only
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs font-bold text-white/65">
              <input
                type="checkbox"
                checked={pipelineFilters.noWebsiteOnly}
                onChange={(event) => setPipelineFilters((current) => ({ ...current, noWebsiteOnly: event.target.checked }))}
                className="h-4 w-4 accent-cyan-300"
              />
              No website
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs font-bold text-white/65">
              <input
                type="checkbox"
                checked={pipelineFilters.hasPhoneOnly}
                onChange={(event) => setPipelineFilters((current) => ({ ...current, hasPhoneOnly: event.target.checked }))}
                className="h-4 w-4 accent-cyan-300"
              />
              Has phone
            </label>
          </div>
        </div>

        {isAdminAccount && (
          <>
            <BulkPipelineActions
              filteredLeadCount={filteredPipelineLeads.length}
              selectedLeadCount={selectedPipelineLeads.length}
              selectedHotLeadCount={selectedHotPipelineLeads.length}
              allVisibleSelected={allFilteredPipelineLeadsSelected}
              bulkOwner={bulkOwner}
              loading={bulkActionLoading}
              onBulkOwnerChange={setBulkOwner}
              onToggleVisibleSelection={selectVisiblePipelineLeads}
              onClearSelection={() => setSelectedPipelineLeadIds([])}
              onReassignSelected={reassignSelectedPipelineLeads}
              onMarkSelectedWorked={markSelectedPipelineLeadsWorked}
              onCloseSelectedLost={closeSelectedPipelineLeadsLost}
              onCreatePrepForSelectedHotLeads={createBulkPrepPacketsForSelectedHotLeads}
            />
            <AdminPipelineReviewTable
              leads={filteredPipelineLeads}
              selectedLeadIds={selectedPipelineLeadIds}
              onToggleLeadSelection={togglePipelineLeadSelection}
              onSelectOwner={(owner) => setPipelineFilters((current) => ({ ...current, owner }))}
            />
          </>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {pipelineLeads.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm liminull-muted lg:col-span-2">
              No imported leads loaded yet. Import a scraped lead or refresh the pipeline.
            </div>
          )}

          {pipelineLeads.length > 0 && filteredPipelineLeads.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm liminull-muted lg:col-span-2">
              No imported leads match the current pipeline filters.
            </div>
          )}

          {filteredPipelineLeads.map((lead) => {
            const priority = deriveLeadPriority(lead);
            const savedPacket = savedIntelligencePackets[lead.id];
            const quickActions = getLeadQuickActions(lead);
            return (
              <article key={lead.id} className={`rounded-2xl border bg-black/20 p-4 ${selectedPipelineLeadIds.includes(lead.id) ? "border-cyan-300/30 ring-1 ring-cyan-300/20" : "border-white/5"}`}>
                {isAdminAccount && (
                  <label className="mb-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/55">
                    <span>Select for bulk action</span>
                    <input
                      type="checkbox"
                      checked={selectedPipelineLeadIds.includes(lead.id)}
                      onChange={() => togglePipelineLeadSelection(lead.id)}
                      className="h-4 w-4 accent-cyan-300"
                    />
                  </label>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-white">{lead.company}</h3>
                    <p className="mt-1 text-xs liminull-muted">Owner: {lead.owner} · {lead.location}</p>
                    <p className="mt-2 text-sm text-cyan-100">{lead.phone || "No phone"}</p>
                    <p className="mt-1 truncate text-xs text-white/40">{lead.website || "No website attached"}</p>
                  </div>
                  <div className="grid justify-items-end gap-2">
                    <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-black text-white/70">
                      {lead.score}
                    </span>
                    <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100">
                      {priority.tier}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                  {priority.signals.length > 0 ? priority.signals.map((signal) => (
                    <span key={signal} className="rounded-full bg-white/5 px-2 py-1">{signal}</span>
                  )) : <span className="rounded-full bg-white/5 px-2 py-1">watch list</span>}
                </div>

                {quickActions.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">Next best moves</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {quickActions.map((action) => (
                        <button
                          key={`${lead.id}-${action.label}`}
                          type="button"
                          onClick={() => applyLeadQuickAction(lead, action)}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-50"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                    Stage
                    <select
                      value={lead.stage}
                      onChange={(event) => updatePipelineLead(lead.id, { stage: event.target.value as LeadPipelineStage })}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                    >
                      {pipelineStages.map((stage) => (
                        <option key={stage} value={stage}>{stageLabel(stage)}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                    Next action
                    <input
                      value={lead.nextAction}
                      onChange={(event) => updatePipelineLead(lead.id, { nextAction: event.target.value })}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                    Next follow-up
                    <input
                      type="date"
                      value={lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : ""}
                      onChange={(event) => updatePipelineLead(lead.id, { nextFollowUpAt: event.target.value ? new Date(`${event.target.value}T12:00:00.000Z`).toISOString() : undefined })}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                    />
                  </label>
                </div>

                <label className="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  Notes
                  <textarea
                    value={lead.notes}
                    onChange={(event) => updatePipelineLead(lead.id, { notes: event.target.value })}
                    placeholder="Contact attempts, decision maker, objections, next meeting..."
                    className="min-h-20 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25"
                  />
                </label>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyPipelineLeadBrief(lead)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-50"
                  >
                    Copy lead brief
                  </button>
                  <button
                    type="button"
                    onClick={() => createIntelligencePacket(pipelineLeadToLeadRecord(lead))}
                    className="rounded-full border border-cyan-300/55 bg-cyan-100/80 px-4 py-2 text-sm font-bold text-cyan-800 transition hover:border-cyan-400/75 hover:bg-cyan-200/70"
                  >
                    {savedPacket ? "Regenerate intelligence" : "Save intelligence packet"}
                  </button>
                  {savedPacket && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIntelligencePacket(savedPacket)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 transition hover:border-cyan-300/25 hover:text-cyan-50"
                      >
                        Open {savedPacket.status}
                      </button>
                      {savedPacket.status === "draft" && (
                        <button
                          type="button"
                          onClick={() => updateIntelligenceStatus(savedPacket, "approved")}
                          className="rounded-full border border-emerald-300/55 bg-emerald-100/80 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-400/75 hover:bg-emerald-200/70"
                        >
                          Approve packet
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => prepareSalesActionBrief(savedPacket)}
                        className="rounded-full border border-violet-300/55 bg-violet-100/80 px-4 py-2 text-sm font-bold text-violet-800 transition hover:border-violet-400/75 hover:bg-violet-200/70"
                      >
                        Prep sales action
                      </button>
                    </>
                  )}
                </div>

                {lead.stage === "closed_won" && (
                  <button
                    type="button"
                    onClick={() => convertLeadToClientWorkspace(lead)}
                    className="mt-3 rounded-full border border-emerald-300/55 bg-emerald-100/80 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:border-emerald-400/75 hover:bg-emerald-200/70"
                  >
                    Convert to client workspace
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>

      {result && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="liminull-card-soft p-5">
            <p className="liminull-eyebrow">AI-intent search queries</p>
            <div className="mt-4 grid gap-2">
              {queries.map((query) => (
                <div key={query} className="rounded-2xl border border-white/5 bg-black/20 p-3 text-sm text-white/70">
                  {query}
                </div>
              ))}
            </div>
          </div>

          <div className="liminull-card-soft p-5">
            <p className="liminull-eyebrow">Platform discovery</p>
            <div className="mt-4 grid gap-2">
              {sourceLinks.map((link) => (
                <a
                  key={link.source}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/5 bg-black/20 p-3 text-sm text-cyan-100 transition hover:border-cyan-300/20 hover:bg-cyan-300/10"
                >
                  <span className="font-black capitalize">{link.source}</span>
                  <span className="mt-1 block text-white/50">{link.query}</span>
                </a>
              ))}
            </div>
            {result.complianceNote && (
              <p className="mt-4 text-xs leading-5 liminull-muted">{result.complianceNote}</p>
            )}
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}
