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

export type PipelineLeadQuickAction = {
  label: string;
  stage: LeadPipelineStage;
  nextAction: string;
  followUpInDays?: number;
};

export type PipelineOwnerSummary = {
  owner: string;
  totalLeads: number;
  openLeads: number;
  hotLeads: number;
  staleLeads: number;
  prepReadyLeads: number;
  dueSoonLeads: number;
};

export type PipelineAttentionReason =
  | "missing_next_action"
  | "missing_follow_up"
  | "stale_untouched"
  | "hot_without_prep"
  | "overdue_active_stage"
  | "approved_prep_unused";

export type PipelineAttentionItem = {
  lead: PipelineLead;
  reasons: PipelineAttentionReason[];
  severity: "critical" | "warning" | "info";
  score: number;
  summary: string;
  nextBestAction: string;
};

export type PipelineDuplicateReason = "same_phone" | "same_website" | "similar_company_location";

export type PipelineDuplicateGroup = {
  key: string;
  reason: PipelineDuplicateReason;
  label: string;
  leads: PipelineLead[];
  score: number;
};

export type PipelineLeadFilters = {
  owner?: string;
  stage?: LeadPipelineStage | "all";
  sortBy?: "company" | "priority";
  noWebsiteOnly?: boolean;
  hasPhoneOnly?: boolean;
  hotScoreOnly?: boolean;
  staleOnly?: boolean;
  prepReadyOnly?: boolean;
};

export type PipelineBulkAction = "worked_today" | "closed_lost" | "reassign";

export function buildPipelineBulkActionPatch(
  action: PipelineBulkAction,
  options: { owner?: string; now?: Date; nextFollowUpInDays?: number } = {}
): PipelineLeadMutation {
  const now = options.now || new Date();
  const touchedAt = now.toISOString();

  if (action === "reassign") {
    return options.owner?.trim() ? { owner: options.owner.trim(), lastTouchedAt: touchedAt } : {};
  }

  if (action === "closed_lost") {
    return {
      stage: "closed_lost",
      nextAction: "Closed lost from bulk admin review",
      lastTouchedAt: touchedAt,
    };
  }

  const nextFollowUp = new Date(now);
  nextFollowUp.setDate(nextFollowUp.getDate() + (options.nextFollowUpInDays ?? 3));

  return {
    nextAction: "Worked today — follow up on response",
    lastTouchedAt: touchedAt,
    nextFollowUpAt: nextFollowUp.toISOString(),
  };
}

export const emptyLeadPipelineState: LeadPipelineState = { leads: [] };

function daysSince(value: string, now: Date) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return 0;
  return Math.max(0, (now.getTime() - timestamp) / (1000 * 60 * 60 * 24));
}

function isOpenPipelineStage(stage: LeadPipelineStage) {
  return stage !== "closed_won" && stage !== "closed_lost";
}

function normalizePhoneKey(value: string | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length < 7) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeWebsiteKey(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  }
}

function normalizeCompanyLocationKey(lead: PipelineLead) {
  const company = slugify(lead.company).replace(/\b(llc|inc|co|company|the)\b/g, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  const location = slugify(lead.location.split(",").slice(0, 2).join(" "));
  return company && location ? `${company}:${location}` : "";
}

function addDuplicateCandidate(groups: Map<string, PipelineDuplicateGroup>, group: PipelineDuplicateGroup) {
  const existing = groups.get(group.key);
  if (!existing || group.score > existing.score || group.leads.length > existing.leads.length) {
    groups.set(group.key, group);
  }
}

export function formatPipelineDuplicateReason(reason: PipelineDuplicateReason) {
  switch (reason) {
    case "same_phone":
      return "same phone";
    case "same_website":
      return "same website";
    case "similar_company_location":
      return "similar company/location";
  }
}

export function selectPipelineDuplicateGroups(leads: PipelineLead[], limit = 6): PipelineDuplicateGroup[] {
  const buckets = new Map<string, { reason: PipelineDuplicateReason; label: string; score: number; leads: PipelineLead[] }>();

  const pushBucket = (key: string, reason: PipelineDuplicateReason, label: string, score: number, lead: PipelineLead) => {
    if (!key) return;
    const bucketKey = `${reason}:${key}`;
    const bucket = buckets.get(bucketKey) || { reason, label, score, leads: [] };
    if (!bucket.leads.some((item) => item.id === lead.id)) bucket.leads.push(lead);
    buckets.set(bucketKey, bucket);
  };

  leads.forEach((lead) => {
    pushBucket(normalizePhoneKey(lead.phone || lead.localPhone), "same_phone", lead.phone || lead.localPhone || "shared phone", 95, lead);
    pushBucket(normalizeWebsiteKey(lead.website), "same_website", normalizeWebsiteKey(lead.website) || "shared website", 80, lead);
    pushBucket(normalizeCompanyLocationKey(lead), "similar_company_location", `${lead.company} · ${lead.location.split(",").slice(0, 2).join(",")}`, 55, lead);
  });

  const groups = new Map<string, PipelineDuplicateGroup>();
  buckets.forEach((bucket, key) => {
    if (bucket.leads.length < 2) return;
    addDuplicateCandidate(groups, {
      key,
      reason: bucket.reason,
      label: bucket.label,
      leads: [...bucket.leads].sort((a, b) => a.company.localeCompare(b.company) || a.owner.localeCompare(b.owner)),
      score: bucket.score + bucket.leads.length,
    });
  });

  return Array.from(groups.values())
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function formatPipelineDuplicateReviewForCopy(leads: PipelineLead[], limit = 6) {
  const groups = selectPipelineDuplicateGroups(leads, limit);
  const lines = groups.map((group, index) => {
    const leadSummary = group.leads.map((lead) => `${lead.company} (${lead.owner}, ${lead.stage.replaceAll("_", " ")})`).join("; ");
    return `${index + 1}. ${formatPipelineDuplicateReason(group.reason)} — ${group.label} — ${leadSummary}`;
  });

  return [
    "Liminull pipeline duplicate review",
    `Groups: ${groups.length}`,
    "",
    lines.length > 0 ? lines.join("\n") : "No likely duplicate groups found under the current filters.",
  ].join("\n");
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

function isFollowUpOverdue(lead: PipelineLead, now: Date) {
  const followUpAt = lead.nextFollowUpAt ? Date.parse(lead.nextFollowUpAt) : NaN;
  return !Number.isNaN(followUpAt) && followUpAt <= now.getTime();
}

export function selectPipelineAttentionItems(leads: PipelineLead[], now = new Date(), limit = 8): PipelineAttentionItem[] {
  return leads
    .filter((lead) => isOpenPipelineStage(lead.stage))
    .map((lead) => {
      const reasons: PipelineAttentionReason[] = [];
      const priority = deriveLeadPriority(lead, now);
      const missingNextAction = !lead.nextAction.trim();
      const missingFollowUp = !lead.nextFollowUpAt && lead.stage !== "new_lead";
      const staleUntouched = isLeadStale(lead, now);
      const hotWithoutPrep = priority.tier === "hot" && lead.salesPrepStatus !== "ready" && lead.salesPrepStatus !== "used";
      const overdueActiveStage = isFollowUpOverdue(lead, now) && ["contacted", "interested", "pricing_requested", "meeting_requested"].includes(lead.stage);
      const approvedPrepUnused = lead.salesPrepStatus === "ready";

      if (missingNextAction) reasons.push("missing_next_action");
      if (missingFollowUp) reasons.push("missing_follow_up");
      if (staleUntouched) reasons.push("stale_untouched");
      if (hotWithoutPrep) reasons.push("hot_without_prep");
      if (overdueActiveStage) reasons.push("overdue_active_stage");
      if (approvedPrepUnused) reasons.push("approved_prep_unused");

      const score =
        (overdueActiveStage ? 38 : 0) +
        (staleUntouched ? 28 : 0) +
        (hotWithoutPrep ? 24 : 0) +
        (missingNextAction ? 18 : 0) +
        (missingFollowUp ? 14 : 0) +
        (approvedPrepUnused ? 10 : 0) +
        Math.min(20, Math.round(priority.score / 8));

      const severity: PipelineAttentionItem["severity"] = score >= 62 ? "critical" : score >= 38 ? "warning" : "info";
      const nextBestAction = overdueActiveStage || staleUntouched
        ? "Send follow-up or mark the lead worked today"
        : hotWithoutPrep
          ? "Create and approve sales prep before outreach"
          : missingFollowUp
            ? "Set a concrete next follow-up date"
            : missingNextAction
              ? "Write the next action before this lead goes stale"
              : approvedPrepUnused
                ? "Open the approved packet and work the sales brief"
                : "Review lead context and choose the next move";
      const summary = reasons.map(formatPipelineAttentionReason).join(" · ");

      return { lead, reasons, severity, score, summary, nextBestAction };
    })
    .filter((item) => item.reasons.length > 0)
    .sort((a, b) => b.score - a.score || a.lead.company.localeCompare(b.lead.company))
    .slice(0, limit);
}

export function formatPipelineAttentionReason(reason: PipelineAttentionReason) {
  switch (reason) {
    case "missing_next_action":
      return "missing next action";
    case "missing_follow_up":
      return "missing follow-up date";
    case "stale_untouched":
      return "stale or due";
    case "hot_without_prep":
      return "hot without prep";
    case "overdue_active_stage":
      return "overdue active stage";
    case "approved_prep_unused":
      return "approved prep unused";
  }
}

export function formatPipelineAttentionBriefForCopy(leads: PipelineLead[], now = new Date(), limit = 8) {
  const items = selectPipelineAttentionItems(leads, now, limit);
  const lines = items.map((item, index) => {
    const followUp = item.lead.nextFollowUpAt ? item.lead.nextFollowUpAt.slice(0, 10) : "not scheduled";
    return `${index + 1}. ${item.lead.company} — ${item.lead.owner} — ${item.severity.toUpperCase()} ${item.score} — ${item.summary} — next: ${item.nextBestAction} — follow-up ${followUp}`;
  });

  return [
    `Liminull pipeline needs-attention queue — ${now.toISOString().slice(0, 10)}`,
    `Items: ${items.length}`,
    "",
    lines.length > 0 ? lines.join("\n") : "No pipeline attention items under the current filters.",
  ].join("\n");
}

export function getLeadQuickActions(lead: PipelineLead): PipelineLeadQuickAction[] {
  switch (lead.stage) {
    case "new_lead":
      return [
        { label: "Mark contacted", stage: "contacted", nextAction: "Wait for first response", followUpInDays: 2 },
        { label: "Interested", stage: "interested", nextAction: "Prep discovery questions", followUpInDays: 1 },
        { label: "No fit", stage: "closed_lost", nextAction: "Moved to no-fit/nurture" },
      ];
    case "contacted":
      return [
        { label: "Interested", stage: "interested", nextAction: "Prep discovery questions", followUpInDays: 1 },
        { label: "Discovery booked", stage: "meeting_requested", nextAction: "Prep discovery call agenda", followUpInDays: 1 },
        { label: "Followed up", stage: "contacted", nextAction: "Follow up sent — wait for response", followUpInDays: 4 },
      ];
    case "interested":
      return [
        { label: "Send pricing", stage: "pricing_requested", nextAction: "Send scoped package/options", followUpInDays: 2 },
        { label: "Discovery booked", stage: "meeting_requested", nextAction: "Prep discovery call agenda", followUpInDays: 1 },
        { label: "No fit", stage: "closed_lost", nextAction: "Moved to no-fit/nurture" },
      ];
    case "pricing_requested":
      return [
        { label: "Pricing sent", stage: "pricing_requested", nextAction: "Follow up on proposal/pricing", followUpInDays: 3 },
        { label: "Closed won", stage: "closed_won", nextAction: "Create client workspace" },
        { label: "Closed lost", stage: "closed_lost", nextAction: "Archive loss reason in notes" },
      ];
    case "meeting_requested":
      return [
        { label: "Meeting done", stage: "pricing_requested", nextAction: "Send scoped package/options", followUpInDays: 1 },
        { label: "Closed won", stage: "closed_won", nextAction: "Create client workspace" },
        { label: "Closed lost", stage: "closed_lost", nextAction: "Archive loss reason in notes" },
      ];
    default:
      return [];
  }
}

export function formatPipelineLeadBriefForCopy(lead: PipelineLead, now = new Date()) {
  const priority = deriveLeadPriority(lead, now);
  const contact = [lead.phone || lead.localPhone, lead.website].filter(Boolean).join(" · ") || "No contact fields saved yet";
  const evidence = lead.evidence.length > 0 ? lead.evidence.slice(0, 3).map((item) => `- ${item}`).join("\n") : "- No evidence saved yet";
  const followUp = lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "Not scheduled";
  const signals = priority.signals.length > 0 ? priority.signals.join(", ") : "watch list";

  return [
    `Lead brief: ${lead.company}`,
    `Owner: ${lead.owner}`,
    `Stage: ${lead.stage.replaceAll("_", " ")}`,
    `Priority: ${priority.tier.toUpperCase()} (${priority.score}) — ${signals}`,
    `Location: ${lead.location}`,
    `Niche: ${lead.niche}`,
    `Contact: ${contact}`,
    `Next action: ${lead.nextAction || "Qualify and contact decision maker"}`,
    `Next follow-up: ${followUp}`,
    lead.notes ? `Notes: ${lead.notes}` : "Notes: none yet",
    "Evidence:",
    evidence,
  ].join("\n");
}

export function formatPipelineDailyBriefForCopy(leads: PipelineLead[], now = new Date(), limit = 5) {
  const openLeads = leads.filter((lead) => isOpenPipelineStage(lead.stage));
  const focusLeads = selectTodayFocusLeads(leads, now, limit);
  const staleLeads = selectStaleLeadNudges(leads, now, limit);
  const stageCounts = leads.reduce<Record<string, number>>((counts, lead) => {
    const label = lead.stage.replaceAll("_", " ");
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
  const stageSummary = Object.entries(stageCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([stage, count]) => `- ${stage}: ${count}`)
    .join("\n") || "- No pipeline leads yet";
  const focusSummary = focusLeads.map((lead, index) => {
    const priority = deriveLeadPriority(lead, now);
    const followUp = lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "not scheduled";
    return `${index + 1}. ${lead.company} — ${priority.tier.toUpperCase()} ${priority.score} — ${lead.nextAction} — follow-up ${followUp}`;
  }).join("\n") || "No open focus leads under the current pipeline.";
  const staleSummary = staleLeads.map((lead) => `- ${lead.company}: ${lead.nextAction}`).join("\n") || "- No stale leads due right now";

  return [
    `Liminull pipeline daily brief — ${now.toISOString().slice(0, 10)}`,
    `Open leads: ${openLeads.length}`,
    `Total leads: ${leads.length}`,
    "",
    "Stage mix:",
    stageSummary,
    "",
    "Today's focus:",
    focusSummary,
    "",
    "Stale follow-ups:",
    staleSummary,
  ].join("\n");
}

export function filterPipelineLeads(leads: PipelineLead[], filters: PipelineLeadFilters) {
  const owner = filters.owner?.trim().toLowerCase();

  return leads
    .filter((lead) => {
      if (owner && lead.owner.trim().toLowerCase() !== owner) return false;
      if (filters.stage && filters.stage !== "all" && lead.stage !== filters.stage) return false;
      if (filters.noWebsiteOnly && lead.website) return false;
      if (filters.hasPhoneOnly && !lead.phone && !lead.localPhone) return false;
      if (filters.hotScoreOnly && deriveLeadPriority(lead).tier !== "hot") return false;
      if (filters.staleOnly && !isLeadStale(lead)) return false;
      if (filters.prepReadyOnly && lead.salesPrepStatus !== "ready") return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "priority") {
        return deriveLeadPriority(b).score - deriveLeadPriority(a).score || a.company.localeCompare(b.company);
      }

      return a.company.localeCompare(b.company) || a.owner.localeCompare(b.owner) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
}

export function summarizePipelineByOwner(leads: PipelineLead[], now = new Date(), dueSoonDays = 3): PipelineOwnerSummary[] {
  const summaries = new Map<string, PipelineOwnerSummary>();
  const dueSoonCutoff = now.getTime() + dueSoonDays * 24 * 60 * 60 * 1000;

  for (const lead of leads) {
    const owner = lead.owner.trim() || "Unassigned";
    const current = summaries.get(owner) || {
      owner,
      totalLeads: 0,
      openLeads: 0,
      hotLeads: 0,
      staleLeads: 0,
      prepReadyLeads: 0,
      dueSoonLeads: 0,
    };

    current.totalLeads += 1;

    if (isOpenPipelineStage(lead.stage)) {
      current.openLeads += 1;

      if (deriveLeadPriority(lead, now).tier === "hot") {
        current.hotLeads += 1;
      }

      if (isLeadStale(lead, now)) {
        current.staleLeads += 1;
      }

      if (lead.salesPrepStatus === "ready") {
        current.prepReadyLeads += 1;
      }

      const followUpAt = lead.nextFollowUpAt ? Date.parse(lead.nextFollowUpAt) : NaN;
      if (!Number.isNaN(followUpAt) && followUpAt <= dueSoonCutoff) {
        current.dueSoonLeads += 1;
      }
    }

    summaries.set(owner, current);
  }

  return Array.from(summaries.values()).sort((a, b) => a.owner.localeCompare(b.owner));
}

export function formatPipelineOwnerSummaryForCopy(leads: PipelineLead[], now = new Date()) {
  const summaries = summarizePipelineByOwner(leads, now);
  const totals = summaries.reduce(
    (summary, owner) => ({
      totalLeads: summary.totalLeads + owner.totalLeads,
      openLeads: summary.openLeads + owner.openLeads,
      hotLeads: summary.hotLeads + owner.hotLeads,
      staleLeads: summary.staleLeads + owner.staleLeads,
      prepReadyLeads: summary.prepReadyLeads + owner.prepReadyLeads,
      dueSoonLeads: summary.dueSoonLeads + owner.dueSoonLeads,
    }),
    { totalLeads: 0, openLeads: 0, hotLeads: 0, staleLeads: 0, prepReadyLeads: 0, dueSoonLeads: 0 }
  );
  const ownerLines = summaries.map(
    (summary) =>
      `- ${summary.owner}: ${summary.openLeads} open / ${summary.totalLeads} total · ${summary.hotLeads} hot · ${summary.staleLeads} stale · ${summary.prepReadyLeads} prep · ${summary.dueSoonLeads} due soon`
  );

  return [
    `Liminull employee pipeline rollup — ${now.toISOString().slice(0, 10)}`,
    `All employees: ${totals.openLeads} open / ${totals.totalLeads} total · ${totals.hotLeads} hot · ${totals.staleLeads} stale · ${totals.prepReadyLeads} prep · ${totals.dueSoonLeads} due soon`,
    "",
    "By employee:",
    ownerLines.length > 0 ? ownerLines.join("\n") : "- No employee-owned leads loaded yet",
  ].join("\n");
}
