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

const memoryStores = new Map<string, LeadPipelineState>();

function storeKey() {
  return process.env.LEAD_PIPELINE_STORE_PATH || "default";
}

function cloneState(state: LeadPipelineState): LeadPipelineState {
  return { leads: state.leads.map((lead) => ({ ...lead, evidence: [...lead.evidence] })) };
}

async function readState(): Promise<LeadPipelineState> {
  return cloneState(memoryStores.get(storeKey()) || emptyLeadPipelineState);
}

async function writeState(state: LeadPipelineState) {
  memoryStores.set(storeKey(), cloneState(state));
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
