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
