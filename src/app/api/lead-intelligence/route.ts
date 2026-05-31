import { NextResponse } from "next/server";

import { buildLeadIntelligencePacket } from "../../../lib/leadIntelligence";
import type { LeadRecord } from "../../../lib/leadScraper";

export const dynamic = "force-dynamic";

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

  return NextResponse.json({ ok: true, packet: buildLeadIntelligencePacket(body.lead) });
}
