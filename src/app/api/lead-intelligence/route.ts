import { NextResponse } from "next/server";

import { buildLeadIntelligencePacket, type LeadIntelligenceStatus } from "../../../lib/leadIntelligence";
import { createLeadIntelligencePacketStore } from "../../../lib/leadIntelligencePacketStore";
import type { LeadRecord } from "../../../lib/leadScraper";

export const dynamic = "force-dynamic";

const leadIntelligenceStatuses: LeadIntelligenceStatus[] = ["draft", "approved", "used"];

function isLeadRecord(value: unknown): value is LeadRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LeadRecord>;
  return Boolean(
    typeof candidate.id === "string" &&
      typeof candidate.company === "string" &&
      typeof candidate.location === "string" &&
      typeof candidate.niche === "string" &&
      typeof candidate.score === "number" &&
      Array.isArray(candidate.evidence)
  );
}

function isLeadIntelligenceStatus(value: unknown): value is LeadIntelligenceStatus {
  return typeof value === "string" && leadIntelligenceStatuses.includes(value as LeadIntelligenceStatus);
}

export async function GET() {
  try {
    const store = createLeadIntelligencePacketStore();
    const packets = await store.listPackets();
    return NextResponse.json({ ok: true, packets });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Lead intelligence packets could not load";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { lead?: unknown } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid intelligence request" }, { status: 400 });
  }

  if (!isLeadRecord(body.lead)) {
    return NextResponse.json({ ok: false, error: "lead is required" }, { status: 400 });
  }

  try {
    const store = createLeadIntelligencePacketStore();
    const packet = await store.upsertPacket(buildLeadIntelligencePacket(body.lead));
    return NextResponse.json({ ok: true, packet });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Lead intelligence failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: { leadId?: unknown; status?: unknown } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid intelligence status request" }, { status: 400 });
  }

  if (typeof body.leadId !== "string" || !body.leadId) {
    return NextResponse.json({ ok: false, error: "leadId is required" }, { status: 400 });
  }

  if (!isLeadIntelligenceStatus(body.status)) {
    return NextResponse.json({ ok: false, error: "status must be draft, approved, or used" }, { status: 400 });
  }

  try {
    const store = createLeadIntelligencePacketStore();
    const packet = await store.updateStatus(body.leadId, body.status);
    return NextResponse.json({ ok: true, packet });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Lead intelligence status update failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
