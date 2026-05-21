import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { NextResponse } from "next/server";
import {
  emptyLeadPipelineState,
  importLeadIntoPipeline,
  updatePipelineLead,
  type LeadPipelineState,
  type LeadPipelineStage,
  type PipelineLead,
} from "../../../lib/leadPipeline";
import {
  getSupabaseLeadPipelineConfig,
  SupabaseLeadPipelineStore,
} from "../../../lib/leadPipelineSupabase";
import type { LeadRecord } from "../../../lib/leadScraper";

export const dynamic = "force-dynamic";

type PatchBody = {
  id?: string;
  stage?: LeadPipelineStage;
  notes?: string;
  nextAction?: string;
  owner?: string;
};

function storePath() {
  return process.env.LEAD_PIPELINE_STORE_PATH || join(/* turbopackIgnore: true */ process.cwd(), ".data", "lead-pipeline.json");
}

async function readState(): Promise<LeadPipelineState> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as LeadPipelineState;
    return { leads: Array.isArray(parsed.leads) ? parsed.leads : [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyLeadPipelineState;
    }
    throw error;
  }
}

async function writeState(state: LeadPipelineState) {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2));
}

class FileLeadPipelineStore {
  async listLeads(): Promise<PipelineLead[]> {
    return (await readState()).leads;
  }

  async importLead(lead: LeadRecord, owner: string) {
    const state = await readState();
    const result = importLeadIntoPipeline(state, lead, owner);

    if (result.imported) {
      await writeState(result.state);
    }

    return result;
  }

  async updateLead(
    id: string,
    patch: Partial<Pick<PipelineLead, "stage" | "notes" | "nextAction" | "owner">>
  ): Promise<PipelineLead | null> {
    const state = await readState();
    const index = state.leads.findIndex((lead) => lead.id === id);

    if (index === -1) {
      return null;
    }

    const updated = updatePipelineLead(state.leads[index], patch);
    const nextState = {
      leads: state.leads.map((lead, leadIndex) => (leadIndex === index ? updated : lead)),
    };

    await writeState(nextState);
    return updated;
  }
}

type LeadPipelineStore = FileLeadPipelineStore | SupabaseLeadPipelineStore;

function createStore(): LeadPipelineStore {
  const supabaseConfig = getSupabaseLeadPipelineConfig();

  if (supabaseConfig) {
    return new SupabaseLeadPipelineStore(supabaseConfig);
  }

  return new FileLeadPipelineStore();
}

export async function GET() {
  const leads = await createStore().listLeads();
  return NextResponse.json({ ok: true, leads });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lead?: LeadRecord; owner?: string };

    if (!body.lead || !body.owner?.trim()) {
      return NextResponse.json(
        { ok: false, error: "lead and owner are required" },
        { status: 400 }
      );
    }

    const result = await createStore().importLead(body.lead, body.owner);

    if (!result.imported) {
      return NextResponse.json(
        {
          ok: false,
          reason: result.reason,
          existingLead: result.existingLead,
        },
        { status: 409 }
      );
    }

    await writeState(result.state);
    return NextResponse.json({ ok: true, lead: result.lead }, { status: 201 });
  } catch (error) {
    console.error("Lead pipeline import failed", error);
    return NextResponse.json({ ok: false, error: "Lead import failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as PatchBody;

    if (!body.id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const updated = await createStore().updateLead(body.id, body);

    if (!updated) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead: updated });
  } catch (error) {
    console.error("Lead pipeline update failed", error);
    return NextResponse.json({ ok: false, error: "Lead update failed" }, { status: 500 });
  }
}
