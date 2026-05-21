import {
  createPipelineLead,
  normalizeLeadDedupeKey,
  updatePipelineLead,
  type ImportPipelineResult,
  type LeadPipelineStage,
  type PipelineLead,
} from "./leadPipeline";
import type { LeadRecord } from "./leadScraper";

export type SupabaseLeadPipelineConfig = {
  url: string;
  serviceRoleKey: string;
};

export type SupabaseLeadPipelineRow = {
  id: string;
  dedupe_key: string;
  source: LeadRecord["source"];
  source_external_id?: string | null;
  company: string;
  location: string;
  niche: string;
  ai_intent: LeadRecord["aiIntent"];
  phone?: string | null;
  local_phone?: string | null;
  website?: string | null;
  score: number;
  owner: string;
  stage: LeadPipelineStage;
  notes: string;
  next_action: string;
  evidence: string[];
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorBody = {
  code?: string;
  message?: string;
  details?: string;
};

export function getSupabaseLeadPipelineConfig(): SupabaseLeadPipelineConfig | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function sourceExternalIdFromDedupeKey(dedupeKey: string) {
  return dedupeKey.startsWith("google:") ? dedupeKey.slice("google:".length) : null;
}

export function mapPipelineLeadToSupabaseRow(lead: PipelineLead): Omit<SupabaseLeadPipelineRow, "id" | "created_at" | "updated_at"> {
  return {
    dedupe_key: lead.dedupeKey,
    source: lead.source,
    source_external_id: sourceExternalIdFromDedupeKey(lead.dedupeKey),
    company: lead.company,
    location: lead.location,
    niche: lead.niche,
    ai_intent: lead.aiIntent,
    phone: lead.phone || null,
    local_phone: lead.localPhone || null,
    website: lead.website || null,
    score: lead.score,
    owner: lead.owner,
    stage: lead.stage,
    notes: lead.notes,
    next_action: lead.nextAction,
    evidence: lead.evidence,
    metadata: {},
  };
}

export function mapSupabaseRowToPipelineLead(row: SupabaseLeadPipelineRow): PipelineLead {
  return {
    id: row.id,
    dedupeKey: row.dedupe_key,
    company: row.company,
    owner: row.owner,
    stage: row.stage,
    source: row.source,
    location: row.location,
    niche: row.niche,
    aiIntent: row.ai_intent,
    score: row.score,
    phone: row.phone || undefined,
    localPhone: row.local_phone || undefined,
    website: row.website || undefined,
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    notes: row.notes || "",
    nextAction: row.next_action || "Qualify and contact decision maker",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseLeadPipelineStore {
  private readonly url: string;
  private readonly serviceRoleKey: string;

  constructor(config: SupabaseLeadPipelineConfig) {
    this.url = normalizeSupabaseUrl(config.url);
    this.serviceRoleKey = config.serviceRoleKey;
  }

  async listLeads(): Promise<PipelineLead[]> {
    const rows = await this.request<SupabaseLeadPipelineRow[]>(
      "/lead_pipeline?select=*&order=created_at.desc"
    );
    return rows.map(mapSupabaseRowToPipelineLead);
  }

  async importLead(lead: LeadRecord, owner: string): Promise<ImportPipelineResult> {
    const pipelineLead = createPipelineLead(lead, owner);
    const row = mapPipelineLeadToSupabaseRow(pipelineLead);

    const response = await fetch(`${this.baseUrl()}/lead_pipeline`, {
      method: "POST",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify(row),
    });

    if (response.ok) {
      const rows = (await response.json()) as SupabaseLeadPipelineRow[];
      const importedLead = mapSupabaseRowToPipelineLead(rows[0]);
      const leads = await this.listLeads();
      return {
        imported: true,
        lead: importedLead,
        state: { leads },
      };
    }

    if (response.status === 409) {
      const existingLead = await this.findByDedupeKey(normalizeLeadDedupeKey(lead));
      if (existingLead) {
        return {
          imported: false,
          reason:
            existingLead.owner.trim().toLowerCase() === owner.trim().toLowerCase()
              ? "duplicate_owned_by_same_employee"
              : "duplicate_owned_by_other_employee",
          existingLead,
          state: { leads: await this.listLeads() },
        };
      }
    }

    return await this.throwSupabaseError(response, "Supabase lead import failed");
  }

  async updateLead(
    id: string,
    patch: Partial<Pick<PipelineLead, "stage" | "notes" | "nextAction" | "owner">>
  ): Promise<PipelineLead | null> {
    const current = await this.findById(id);

    if (!current) {
      return null;
    }

    const updated = updatePipelineLead(current, patch);
    const response = await fetch(`${this.baseUrl()}/lead_pipeline?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify({
        owner: updated.owner,
        stage: updated.stage,
        notes: updated.notes,
        next_action: updated.nextAction,
      }),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response, "Supabase lead update failed");
    }

    const rows = (await response.json()) as SupabaseLeadPipelineRow[];
    return rows[0] ? mapSupabaseRowToPipelineLead(rows[0]) : null;
  }

  private async findById(id: string): Promise<PipelineLead | null> {
    const rows = await this.request<SupabaseLeadPipelineRow[]>(
      `/lead_pipeline?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
    );
    return rows[0] ? mapSupabaseRowToPipelineLead(rows[0]) : null;
  }

  private async findByDedupeKey(dedupeKey: string): Promise<PipelineLead | null> {
    const rows = await this.request<SupabaseLeadPipelineRow[]>(
      `/lead_pipeline?select=*&dedupe_key=eq.${encodeURIComponent(dedupeKey)}&limit=1`
    );
    return rows[0] ? mapSupabaseRowToPipelineLead(rows[0]) : null;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method: "GET",
      headers: this.headers(),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response, "Supabase lead pipeline request failed");
    }

    return (await response.json()) as T;
  }

  private baseUrl() {
    return `${this.url}/rest/v1`;
  }

  private headers(options: { prefer?: string } = {}) {
    return {
      apikey: this.serviceRoleKey,
      authorization: `Bearer ${this.serviceRoleKey}`,
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
    };
  }

  private async throwSupabaseError(response: Response, fallback: string): Promise<never> {
    let body: SupabaseErrorBody = {};
    try {
      body = (await response.json()) as SupabaseErrorBody;
    } catch {
      // Ignore malformed Supabase error payloads and use fallback below.
    }

    throw new Error(body.message || fallback);
  }
}
