import { NextRequest, NextResponse } from "next/server";
import {
  emptyLeadPipelineState,
  filterPipelineLeads,
  importLeadIntoPipeline,
  updatePipelineLead,
  type LeadPipelineState,
  type LeadPipelineStage,
  type PipelineLead,
  type PipelineLeadMutation,
} from "../../../lib/leadPipeline";
import {
  getSupabaseLeadPipelineConfig,
  SupabaseLeadPipelineStore,
} from "../../../lib/leadPipelineSupabase";
import type { LeadRecord } from "../../../lib/leadScraper";
import { verifyDashboardSession, type DashboardSessionUser } from "../../../lib/authSession";
import { readServerEnv } from "../../../lib/env";

export const dynamic = "force-dynamic";

type PatchBody = PipelineLeadMutation & {
  id?: string;
  stage?: LeadPipelineStage;
};

const memoryStores = new Map<string, LeadPipelineState>();

async function getPipelineSession(request: NextRequest | Request | undefined) {
  if (!request || !("cookies" in request)) {
    return null;
  }

  return verifyDashboardSession(
    request.cookies.get("hermes_dashboard_auth")?.value,
    readServerEnv("HERMES_DASHBOARD_SESSION_TOKEN")
  );
}

function isAdminSession(session: DashboardSessionUser | null) {
  return session?.role === "admin";
}

function visibleLeadsForSession(leads: PipelineLead[], session: DashboardSessionUser | null) {
  if (!session || isAdminSession(session)) {
    return leads;
  }

  const owner = session.name?.trim();
  return owner ? filterPipelineLeads(leads, { owner }) : [];
}

function ownerForImport(requestedOwner: string, session: DashboardSessionUser | null) {
  if (!session || isAdminSession(session)) {
    return requestedOwner;
  }

  return session.name?.trim() || requestedOwner;
}

function canMutateLead(lead: PipelineLead | undefined, session: DashboardSessionUser | null) {
  if (!lead || !session || isAdminSession(session)) {
    return Boolean(lead);
  }

  return Boolean(session.name?.trim() && lead.owner === session.name.trim());
}

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
    patch: PipelineLeadMutation
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

export async function GET(request?: NextRequest) {
  const session = await getPipelineSession(request);
  const leads = await createStore().listLeads();
  return NextResponse.json({ ok: true, leads: visibleLeadsForSession(leads, session) });
}

export async function POST(request: Request) {
  try {
    const session = await getPipelineSession(request);
    const body = (await request.json()) as { lead?: LeadRecord; owner?: string };

    if (!body.lead || !body.owner?.trim()) {
      return NextResponse.json(
        { ok: false, error: "lead and owner are required" },
        { status: 400 }
      );
    }

    const result = await createStore().importLead(body.lead, ownerForImport(body.owner.trim(), session));

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
    const session = await getPipelineSession(request);
    const body = (await request.json()) as PatchBody;

    if (!body.id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const store = createStore();
    const currentLead = (await store.listLeads()).find((lead) => lead.id === body.id);

    if (!canMutateLead(currentLead, session)) {
      return NextResponse.json({ ok: false, error: currentLead ? "Not authorized to update this lead" : "Lead not found" }, { status: currentLead ? 403 : 404 });
    }

    const patch = session && !isAdminSession(session) ? { ...body, owner: currentLead?.owner } : body;
    const updated = await store.updateLead(body.id, patch);

    if (!updated) {
      return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lead: updated });
  } catch (error) {
    console.error("Lead pipeline update failed", error);
    return NextResponse.json({ ok: false, error: "Lead update failed" }, { status: 500 });
  }
}
