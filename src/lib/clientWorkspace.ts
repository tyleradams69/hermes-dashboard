import type { PipelineLead } from "./leadPipeline";

export const clientWorkspacesStorageKey = "liminull:client-delivery:workspaces";

export type ClientWorkspacePhase = "handoff" | "build" | "review" | "launched";
export type ClientWorkspaceLaunchStatus = "not_started" | "access_needed" | "in_progress" | "ready_to_launch" | "launched";

export type ClientWorkspace = {
  id: string;
  sourceLeadId: string;
  name: string;
  owner: string;
  phase: ClientWorkspacePhase;
  packageFit: string;
  website?: string;
  phone?: string;
  location: string;
  nextDeliverable: string;
  assetChecklist: string[];
  assetChecklistCompleted?: string[];
  launchStatus?: ClientWorkspaceLaunchStatus;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientWorkspaceReadinessTier = "blocked" | "needs_assets" | "in_progress" | "launch_ready" | "live";

export type ClientWorkspaceReadiness = {
  score: number;
  tier: ClientWorkspaceReadinessTier;
  blockers: string[];
  nextStep: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "workspace";
}

function defaultNextDeliverable(lead: PipelineLead) {
  if (lead.nextAction?.trim() && lead.nextAction !== "Qualify and contact decision maker") {
    return lead.nextAction;
  }

  return "Collect brand, access, intake, and workflow assets for delivery kickoff";
}

function assetChecklistForLead(lead: PipelineLead) {
  const checklist = [
    "Website/domain access or current platform login",
    "Current intake/contact form details",
    "Booking or calendar workflow access",
    "Logo, brand colors, and preferred client-facing wording",
    "Primary offer/package details and qualification rules",
  ];

  if (!lead.website) {
    checklist.unshift("Decision on new website/landing page domain and launch path");
  }

  if (lead.phone || lead.localPhone) {
    checklist.push("Phone handling, missed-call, and voicemail process notes");
  }

  return checklist;
}

export function buildClientWorkspaceFromPipelineLead(lead: PipelineLead, createdAt = new Date()): ClientWorkspace {
  const timestamp = createdAt.toISOString();

  return {
    id: `client-${slugify(lead.id)}`,
    sourceLeadId: lead.id,
    name: lead.company,
    owner: lead.owner,
    phase: "handoff",
    packageFit: lead.niche,
    website: lead.website,
    phone: lead.phone || lead.localPhone,
    location: lead.location,
    nextDeliverable: defaultNextDeliverable(lead),
    assetChecklist: assetChecklistForLead(lead),
    assetChecklistCompleted: [],
    launchStatus: "not_started",
    internalNotes: lead.notes || `Converted from ${lead.stage} pipeline lead.`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function formatClientHandoffSummary(workspace: ClientWorkspace) {
  return [
    `Client workspace: ${workspace.name}`,
    `Phase: ${workspace.phase}`,
    `Owner: ${workspace.owner}`,
    `Package/offer: ${workspace.packageFit}`,
    `Location: ${workspace.location}`,
    workspace.website ? `Website: ${workspace.website}` : "Website: needs setup/review",
    workspace.phone ? `Phone: ${workspace.phone}` : "Phone: not captured yet",
    `Next deliverable: ${workspace.nextDeliverable}`,
    `Launch status: ${workspace.launchStatus || "not_started"}`,
    "",
    "Asset checklist:",
    ...workspace.assetChecklist.map((item, index) => {
      const checked = workspace.assetChecklistCompleted?.includes(item) ? "x" : " ";
      return `${index + 1}. [${checked}] ${item}`;
    }),
    "",
    "Internal notes:",
    workspace.internalNotes,
  ].join("\n");
}

export function formatClientDeliveryActionPlan(workspace: ClientWorkspace) {
  const readiness = deriveClientWorkspaceReadiness(workspace);
  const completed = new Set(workspace.assetChecklistCompleted || []);
  const remainingAssets = workspace.assetChecklist.filter((item) => !completed.has(item));

  return [
    `${workspace.name} — delivery action plan`,
    `Readiness: ${readiness.score}% (${readiness.tier})`,
    `Current phase: ${workspace.phase}`,
    `Launch status: ${workspace.launchStatus || "not_started"}`,
    `Next deliverable: ${workspace.nextDeliverable || "Set the next delivery milestone"}`,
    "",
    "Immediate next step:",
    readiness.nextStep,
    "",
    "Blockers:",
    ...(readiness.blockers.length > 0 ? readiness.blockers.map((blocker) => `- ${blocker}`) : ["- None flagged"]),
    "",
    "Remaining assets:",
    ...(remainingAssets.length > 0 ? remainingAssets.map((item) => `- ${item}`) : ["- Asset checklist complete"]),
  ].join("\n");
}

function assetCompletionRatio(workspace: ClientWorkspace) {
  if (workspace.assetChecklist.length === 0) return 1;
  const completed = new Set(workspace.assetChecklistCompleted || []);
  return workspace.assetChecklist.filter((item) => completed.has(item)).length / workspace.assetChecklist.length;
}

export function deriveClientWorkspaceReadiness(workspace: ClientWorkspace): ClientWorkspaceReadiness {
  if (workspace.phase === "launched" || workspace.launchStatus === "launched") {
    return {
      score: 100,
      tier: "live",
      blockers: [],
      nextStep: "Monitor launch health, collect proof, and prepare the next optimization sprint.",
    };
  }

  const blockers: string[] = [];
  const completionRatio = assetCompletionRatio(workspace);
  const launchStatus = workspace.launchStatus || "not_started";
  const phaseScore: Record<ClientWorkspacePhase, number> = {
    handoff: 4,
    build: 12,
    review: 20,
    launched: 30,
  };
  const launchScore: Record<ClientWorkspaceLaunchStatus, number> = {
    not_started: 0,
    access_needed: -12,
    in_progress: 8,
    ready_to_launch: 18,
    launched: 30,
  };

  if (launchStatus === "access_needed") {
    blockers.push("Launch access is still needed");
  }

  if (!workspace.website && workspace.launchStatus !== "ready_to_launch") {
    blockers.push("Website or launch path still needs confirmation");
  }

  if (completionRatio === 0) {
    blockers.push("No delivery assets have been marked complete");
  }

  if (!workspace.nextDeliverable.trim()) {
    blockers.push("Next deliverable is missing");
  }

  const score = Math.max(
    0,
    Math.min(100, Math.round(28 + completionRatio * 42 + phaseScore[workspace.phase] + launchScore[launchStatus] - blockers.length * 5))
  );

  if (launchStatus === "ready_to_launch") {
    return {
      score: Math.max(score, 88),
      tier: "launch_ready",
      blockers,
      nextStep: "Run the final launch QA checklist and prepare a client-safe handoff note.",
    };
  }

  if (blockers.length > 0 || launchStatus === "access_needed") {
    return {
      score,
      tier: "blocked",
      blockers,
      nextStep: "Collect missing access and confirm the launch path before build work continues.",
    };
  }

  if (completionRatio < 0.5) {
    return {
      score,
      tier: "needs_assets",
      blockers,
      nextStep: "Collect the remaining kickoff assets and confirm the delivery scope.",
    };
  }

  return {
    score,
    tier: "in_progress",
    blockers,
    nextStep: "Keep the build moving and update the next deliverable after the current milestone.",
  };
}

function deliveryFocusRank(readiness: ClientWorkspaceReadiness) {
  const tierRank: Record<ClientWorkspaceReadinessTier, number> = {
    blocked: 0,
    launch_ready: 1,
    needs_assets: 2,
    in_progress: 3,
    live: 4,
  };

  return tierRank[readiness.tier];
}

export function selectDeliveryFocusWorkspaces(workspaces: ClientWorkspace[], limit = 4) {
  return workspaces
    .map((workspace) => ({ workspace, readiness: deriveClientWorkspaceReadiness(workspace) }))
    .filter((item) => item.readiness.tier !== "live")
    .sort(
      (a, b) =>
        deliveryFocusRank(a.readiness) - deliveryFocusRank(b.readiness) ||
        a.readiness.score - b.readiness.score ||
        Date.parse(b.workspace.updatedAt) - Date.parse(a.workspace.updatedAt)
    )
    .slice(0, limit);
}
