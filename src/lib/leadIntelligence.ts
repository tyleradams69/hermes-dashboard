import { isWeakWebsiteCandidate, type LeadRecord } from "./leadScraper";

export type LeadIntelligenceStatus = "draft" | "approved" | "used";

export type LeadIntelligencePacket = {
  id: string;
  leadId: string;
  company: string;
  status: LeadIntelligenceStatus;
  generatedAt: string;
  painHypothesis: string;
  recommendedOffer: string;
  outreachHook: string;
  discoveryQuestions: string[];
  websiteNotes: string;
  approvalNote: string;
};

export type LeadRecommendedOffer = {
  name: string;
  why: string;
  included: string[];
  exclusions: string[];
  upsell: string;
  tylerDecision: string;
};

export type LeadSalesActionBrief = {
  company: string;
  packetStatus: LeadIntelligenceStatus;
  readinessLabel: string;
  discoveryAgenda: string[];
  miniAuditOutline: string[];
  proposalOutline: string[];
  recommendedOffer: LeadRecommendedOffer;
  nextStep: string;
  reviewNote: string;
};

function marketFromLocation(location: string) {
  const cityStateMatch = location.match(/,\s*([^,]+,\s*[A-Z]{2})(?:\s+\d{5})?/);
  return cityStateMatch?.[1] || location;
}

function recommendedOfferForLead(lead: LeadRecord) {
  const niche = lead.niche.toLowerCase();
  if (niche.includes("booking")) return "AI booking and follow-up sprint";
  if (niche.includes("missed-call") || niche.includes("missed call") || niche.includes("phone")) return "AI missed-call capture sprint";
  if (niche.includes("intake")) return "AI intake automation sprint";
  return "AI lead capture workflow sprint";
}

function websiteNotesForLead(lead: LeadRecord) {
  if (!lead.website) {
    return "No full website is attached to the Google profile, so the business may be relying on maps/search visibility without a controlled conversion path.";
  }

  if (isWeakWebsiteCandidate(lead)) {
    return "The attached site appears to be a platform/profile-style website, which may limit trust, tracking, booking flow control, and offer-specific landing pages.";
  }

  return "A website is attached; review the intake, booking, contact, and follow-up paths before assuming the main gap is web presence.";
}

function painHypothesisForLead(lead: LeadRecord) {
  if (!lead.website) {
    return "Google profile is doing too much of the first-impression work. Calls, form fills, and after-hours inquiries may not have a clear conversion path after discovery.";
  }

  if (isWeakWebsiteCandidate(lead)) {
    return "Booking and follow-up may be leaking because the current web presence looks dependent on a platform/profile page instead of a purpose-built intake flow.";
  }

  if (!lead.phone && !lead.localPhone) {
    return "The business has visibility, but contactability looks weak. Prospects may be dropping before a staff member can respond or qualify them.";
  }

  return "The business has enough demand signal to justify checking whether intake, missed-call capture, and follow-up are converting interest into booked conversations.";
}

function outreachHookForLead(lead: LeadRecord) {
  const market = marketFromLocation(lead.location);
  if (!lead.website) {
    return `Offer ${lead.company} a short intake audit focused on turning ${market} Google searches into calls, form fills, and booked conversations.`;
  }

  if (isWeakWebsiteCandidate(lead)) {
    return `Offer ${lead.company} a quick review of friction points between their current profile-style site and a booked ${lead.niche} inquiry.`;
  }

  return `Offer ${lead.company} a concise conversion-path review for ${market}: phone handling, form response, booking friction, and follow-up gaps.`;
}

function createLeadIntelligencePacketId(lead: LeadRecord) {
  const slug = [lead.company, lead.location]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `packet-${slug || "lead"}-${lead.id.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48)}`;
}

export function buildLeadIntelligencePacket(lead: LeadRecord, generatedAt = new Date()): LeadIntelligencePacket {
  return {
    id: createLeadIntelligencePacketId(lead),
    leadId: lead.id,
    company: lead.company,
    status: "draft",
    generatedAt: generatedAt.toISOString(),
    painHypothesis: painHypothesisForLead(lead),
    recommendedOffer: recommendedOfferForLead(lead),
    outreachHook: outreachHookForLead(lead),
    discoveryQuestions: [
      "How are missed calls, form fills, and after-hours inquiries handled today?",
      "What happens when a new lead asks about pricing, availability, or booking outside business hours?",
      "Which follow-up steps are currently manual, delayed, or inconsistent?",
      "What would make the first conversation more qualified before staff time is spent?",
    ],
    websiteNotes: websiteNotesForLead(lead),
    approvalNote: "Review before using externally. This packet is an internal sales aid, not an automatically sent message.",
  };
}

export function formatLeadIntelligencePacketForCopy(packet: LeadIntelligencePacket) {
  return [
    `Lead Intelligence Packet: ${packet.company}`,
    `Status: ${packet.status}`,
    `Generated: ${packet.generatedAt}`,
    `Recommended offer: ${packet.recommendedOffer}`,
    "",
    "Pain hypothesis:",
    packet.painHypothesis,
    "",
    "Website notes:",
    packet.websiteNotes,
    "",
    "Outreach hook:",
    packet.outreachHook,
    "",
    "Discovery questions:",
    ...packet.discoveryQuestions.map((question, index) => `${index + 1}. ${question}`),
    "",
    packet.approvalNote,
  ].join("\n");
}

export function buildLeadRecommendedOffer(packet: LeadIntelligencePacket): LeadRecommendedOffer {
  const offer = packet.recommendedOffer.toLowerCase();

  if (offer.includes("booking")) {
    return {
      name: "Booking Flow Cleanup",
      why: "The lead likely needs fewer steps between interest and a booked appointment.",
      included: ["Booking CTA review", "Calendar/intake friction notes", "Reminder and confirmation flow recommendations"],
      exclusions: ["Paid ads", "Unlimited copy rewrites", "Custom calendar platform rebuilds"],
      upsell: "Monthly booking optimization and review-response care",
      tylerDecision: "Decide whether to lead with an audit or a fixed booking sprint.",
    };
  }

  if (offer.includes("missed-call") || offer.includes("phone")) {
    return {
      name: "Missed Lead / AI Receptionist Setup",
      why: "The lead likely loses value when calls, forms, or after-hours inquiries wait too long.",
      included: ["First-response script", "Qualification questions", "Human handoff rules", "Simple logging/reporting plan"],
      exclusions: ["Autonomous client communication without review", "Deep CRM mutation", "Guaranteed revenue lift"],
      upsell: "Managed lead response monitoring after setup",
      tylerDecision: "Pick the safest initial channel: calls, forms, SMS, or booking requests.",
    };
  }

  if (packet.websiteNotes.toLowerCase().includes("no full website") || packet.websiteNotes.toLowerCase().includes("profile-style")) {
    return {
      name: "Website Conversion Audit",
      why: "The business may have demand but lacks a controlled, trust-building conversion path.",
      included: ["Homepage/CTA review", "Mobile trust and intake notes", "Prioritized conversion fixes"],
      exclusions: ["Full brand identity", "Large content migration", "Ongoing SEO content"],
      upsell: "Landing Page Sprint or Website Refresh + Monthly Care",
      tylerDecision: "Decide whether the first offer is audit-only or audit plus selected fixes.",
    };
  }

  return {
    name: "AI Intake Automation Sprint",
    why: "The strongest next angle is making inquiry capture, qualification, and follow-up more consistent.",
    included: ["Workflow map", "Intake script", "Follow-up templates", "Human approval gates"],
    exclusions: ["Fully autonomous sales conversations", "Complex integrations without scoping", "Unlimited revisions"],
    upsell: "Managed workflow monitoring and monthly improvement pass",
    tylerDecision: "Confirm the one workflow that would produce the clearest before/after proof.",
  };
}

export function buildLeadSalesActionBrief(packet: LeadIntelligencePacket): LeadSalesActionBrief {
  const readyForExternalUse = packet.status === "approved" || packet.status === "used";

  return {
    company: packet.company,
    packetStatus: packet.status,
    readinessLabel: readyForExternalUse ? "Approved sales prep" : "Draft prep — approve packet before external use",
    discoveryAgenda: [
      "Confirm current lead sources, response times, and missed-call/form-fill handling.",
      packet.discoveryQuestions[0] || "Map the current intake and follow-up flow.",
      packet.discoveryQuestions[1] || "Identify the highest-friction booking or qualification moment.",
      "Agree on one measurable automation sprint outcome before discussing scope.",
    ],
    miniAuditOutline: [
      `Lead angle: ${packet.outreachHook}`,
      `Likely pain: ${packet.painHypothesis}`,
      `Website/intake note: ${packet.websiteNotes}`,
      "Show 2-3 concrete friction points, then stop before over-explaining.",
    ],
    proposalOutline: [
      `Recommended offer: ${packet.recommendedOffer}`,
      "Problem: inquiries may be leaking before staff can qualify and follow up.",
      "Sprint: install a focused intake, booking, or missed-call capture workflow with simple reporting.",
      "Proof: compare new inquiry capture, response speed, and booked conversations before/after launch.",
    ],
    recommendedOffer: buildLeadRecommendedOffer(packet),
    nextStep: readyForExternalUse
      ? "Use this to prep the discovery call, mini audit, or lightweight proposal. Mark the packet used after the asset is sent or the call is complete."
      : "Approve the intelligence packet before sending any client-facing audit, discovery agenda, or proposal language.",
    reviewNote: "Internal Liminull prep only. Verify facts manually before sending anything to the prospect.",
  };
}

export function formatLeadSalesActionBriefForCopy(brief: LeadSalesActionBrief) {
  return [
    `Sales Action Brief: ${brief.company}`,
    `Readiness: ${brief.readinessLabel}`,
    `Packet status: ${brief.packetStatus}`,
    "",
    "Discovery agenda:",
    ...brief.discoveryAgenda.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Mini audit outline:",
    ...brief.miniAuditOutline.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Proposal outline:",
    ...brief.proposalOutline.map((item, index) => `${index + 1}. ${item}`),
    "",
    "Recommended package:",
    `Name: ${brief.recommendedOffer.name}`,
    `Why: ${brief.recommendedOffer.why}`,
    "Included:",
    ...brief.recommendedOffer.included.map((item, index) => `${index + 1}. ${item}`),
    "Exclusions:",
    ...brief.recommendedOffer.exclusions.map((item, index) => `${index + 1}. ${item}`),
    `Upsell: ${brief.recommendedOffer.upsell}`,
    `Tyler decision: ${brief.recommendedOffer.tylerDecision}`,
    "",
    `Next step: ${brief.nextStep}`,
    brief.reviewNote,
  ].join("\n");
}
