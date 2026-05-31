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
