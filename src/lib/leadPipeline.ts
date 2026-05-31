import type { LeadRecord } from "./leadScraper";

export type LeadPipelineStage =
  | "new_lead"
  | "contacted"
  | "interested"
  | "pricing_requested"
  | "meeting_requested"
  | "closed_won"
  | "closed_lost";

export type PipelineLead = {
  id: string;
  dedupeKey: string;
  company: string;
  owner: string;
  stage: LeadPipelineStage;
  source: LeadRecord["source"];
  location: string;
  niche: string;
  aiIntent: LeadRecord["aiIntent"];
  score: number;
  phone?: string;
  localPhone?: string;
  website?: string;
  evidence: string[];
  notes: string;
  nextAction: string;
  lastTouchedAt?: string;
  nextFollowUpAt?: string;
  salesPrepStatus?: "none" | "ready" | "used";
  prepWorkspaceNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadPipelineState = {
  leads: PipelineLead[];
};

export type ImportPipelineResult = {
  imported: boolean;
  reason?: "duplicate_owned_by_other_employee" | "duplicate_owned_by_same_employee";
  lead?: PipelineLead;
  existingLead?: PipelineLead;
  state: LeadPipelineState;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

export function normalizeLeadDedupeKey(lead: Pick<LeadRecord, "id" | "company">) {
  if (lead.id.startsWith("google:") && lead.id.length > "google:".length) {
    return lead.id;
  }

  return `company:${slugify(lead.company)}`;
}

export function createPipelineLead(lead: LeadRecord, owner: string): PipelineLead {
  const now = new Date().toISOString();
  return {
    id: `${normalizeLeadDedupeKey(lead)}:${slugify(owner)}`,
    dedupeKey: normalizeLeadDedupeKey(lead),
    company: lead.company,
    owner: owner.trim() || "Liminull",
    stage: "new_lead",
    source: lead.source,
    location: lead.location,
    niche: lead.niche,
    aiIntent: lead.aiIntent,
    score: lead.score,
    phone: lead.phone,
    localPhone: lead.localPhone,
    website: lead.website,
    evidence: lead.evidence,
    notes: "",
    nextAction: "Qualify and contact decision maker",
    createdAt: now,
    updatedAt: now,
  };
}

export function importLeadIntoPipeline(
  state: LeadPipelineState,
  lead: LeadRecord,
  owner: string
): ImportPipelineResult {
  const dedupeKey = normalizeLeadDedupeKey(lead);
  const existingLead = state.leads.find((item) => item.dedupeKey === dedupeKey);

  if (existingLead) {
    return {
      imported: false,
      reason:
        existingLead.owner.trim().toLowerCase() === owner.trim().toLowerCase()
          ? "duplicate_owned_by_same_employee"
          : "duplicate_owned_by_other_employee",
      existingLead,
      state,
    };
  }

  const pipelineLead = createPipelineLead(lead, owner);
  return {
    imported: true,
    lead: pipelineLead,
    state: {
      leads: [pipelineLead, ...state.leads],
    },
  };
}

export type PipelineLeadMutation = Partial<Pick<PipelineLead, "stage" | "notes" | "nextAction" | "owner" | "lastTouchedAt" | "nextFollowUpAt" | "salesPrepStatus" | "prepWorkspaceNotes">>;

export function updatePipelineLead(
  lead: PipelineLead,
  patch: PipelineLeadMutation
): PipelineLead {
  const now = new Date().toISOString();
  const updatedAt = now === lead.updatedAt
    ? new Date(Date.parse(now) + 1).toISOString()
    : now;

  return {
    ...lead,
    stage: patch.stage || lead.stage,
    notes: patch.notes ?? lead.notes,
    nextAction: patch.nextAction ?? lead.nextAction,
    owner: patch.owner?.trim() || lead.owner,
    lastTouchedAt: patch.lastTouchedAt ?? lead.lastTouchedAt,
    nextFollowUpAt: patch.nextFollowUpAt ?? lead.nextFollowUpAt,
    salesPrepStatus: patch.salesPrepStatus ?? lead.salesPrepStatus,
    prepWorkspaceNotes: patch.prepWorkspaceNotes ?? lead.prepWorkspaceNotes,
    updatedAt,
  };
}

export type PipelineLeadPriorityTier = "hot" | "warm" | "watch";

export type PipelineLeadPriority = {
  score: number;
  tier: PipelineLeadPriorityTier;
  signals: string[];
};

export type PipelineLeadFilters = {
  owner?: string;
  stage?: LeadPipelineStage | "all";
  noWebsiteOnly?: boolean;
  hasPhoneOnly?: boolean;
  hotScoreOnly?: boolean;
};

export const emptyLeadPipelineState: LeadPipelineState = { leads: [] };

function daysSince(value: string, now: Date) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, (now.getTime() - timestamp) / (1000 * 60 * 60 * 24));
}

function isOpenPipelineStage(stage: LeadPipelineStage) {
  return stage !== "closed_won" && stage !== "closed_lost";
}

export function isLeadStale(lead: PipelineLead, now = new Date(), staleAfterDays = 3) {
  if (!isOpenPipelineStage(lead.stage)) return false;
  const dueAt = lead.nextFollowUpAt ? Date.parse(lead.nextFollowUpAt) : NaN;
  if (!Number.isNaN(dueAt) && dueAt <= now.getTime()) return true;
  const touchedAt = lead.lastTouchedAt || lead.updatedAt;
  return daysSince(touchedAt, now) >= staleAfterDays;
}

export function deriveLeadPriority(lead: PipelineLead, now = new Date()): PipelineLeadPriority {
  const signals: string[] = [];
  let priorityScore = lead.score;

  if (lead.score >= 85) {
    priorityScore += 10;
    signals.push("high score");
  }

  if (!lead.website) {
    priorityScore += 14;
    signals.push("no website");
  }

  if (lead.phone || lead.localPhone) {
    priorityScore += 8;
    signals.push("phone available");
  }

  if (isLeadStale(lead, now)) {
    priorityScore += 12;
    signals.push("stale next action");
  }

  if (lead.stage === "interested" || lead.stage === "pricing_requested" || lead.stage === "meeting_requested") {
    priorityScore += 10;
    signals.push("active buying signal");
  }

  const tier: PipelineLeadPriorityTier = priorityScore >= 90 ? "hot" : priorityScore >= 70 ? "warm" : "watch";

  return { score: priorityScore, tier, signals };
}

export function selectTodayFocusLeads(leads: PipelineLead[], now = new Date(), limit = 5) {
  return leads
    .filter((lead) => isOpenPipelineStage(lead.stage))
    .map((lead) => ({ lead, priority: deriveLeadPriority(lead, now) }))
    .sort((a, b) => b.priority.score - a.priority.score || Date.parse(b.lead.updatedAt) - Date.parse(a.lead.updatedAt))
    .slice(0, limit)
    .map(({ lead }) => lead);
}

export function selectStaleLeadNudges(leads: PipelineLead[], now = new Date(), limit = 6) {
  return leads
    .filter((lead) => isLeadStale(lead, now))
    .sort((a, b) => Date.parse(a.nextFollowUpAt || a.lastTouchedAt || a.updatedAt) - Date.parse(b.nextFollowUpAt || b.lastTouchedAt || b.updatedAt))
    .slice(0, limit);
}

export function filterPipelineLeads(leads: PipelineLead[], filters: PipelineLeadFilters) {
  const owner = filters.owner?.trim().toLowerCase();

  return leads.filter((lead) => {
    if (owner && lead.owner.trim().toLowerCase() !== owner) return false;
    if (filters.stage && filters.stage !== "all" && lead.stage !== filters.stage) return false;
    if (filters.noWebsiteOnly && lead.website) return false;
    if (filters.hasPhoneOnly && !lead.phone && !lead.localPhone) return false;
    if (filters.hotScoreOnly && deriveLeadPriority(lead).tier !== "hot") return false;
    return true;
  });
}
