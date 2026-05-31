import { NextResponse } from "next/server";
import { buildLeadSearchRun, createLeadSearchRunStore } from "../../../lib/leadSearchRunStore";
import type { LeadSearchInput } from "../../../lib/leadScraper";

export const dynamic = "force-dynamic";

type LeadSearchRunRequest = {
  input?: Partial<LeadSearchInput>;
  resultCount?: number;
  topLeadCompany?: string;
  warnings?: string[];
};

export async function GET() {
  try {
    const runs = await createLeadSearchRunStore().listRuns();
    return NextResponse.json({ ok: true, runs });
  } catch (error) {
    console.error("Lead search runs load failed", error);
    return NextResponse.json({ ok: false, error: "Lead search runs could not load" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadSearchRunRequest;

    if (!body.input) {
      return NextResponse.json({ ok: false, error: "input is required" }, { status: 400 });
    }

    const run = buildLeadSearchRun({
      input: body.input,
      resultCount: body.resultCount || 0,
      topLeadCompany: body.topLeadCompany,
      warnings: body.warnings,
    });
    const savedRun = await createLeadSearchRunStore().saveRun(run);

    return NextResponse.json({ ok: true, run: savedRun }, { status: 201 });
  } catch (error) {
    console.error("Lead search run save failed", error);
    return NextResponse.json({ ok: false, error: "Lead search run could not be saved" }, { status: 500 });
  }
}
