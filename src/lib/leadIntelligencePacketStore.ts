import { readServerEnv } from "./env";
import type { LeadIntelligencePacket, LeadIntelligenceStatus } from "./leadIntelligence";

export type LeadIntelligencePacketStoreConfig = {
  url: string;
  serviceRoleKey: string;
};

export type LeadIntelligencePacketRow = {
  id: string;
  lead_id: string;
  company: string;
  status: LeadIntelligenceStatus;
  generated_at: string;
  pain_hypothesis: string;
  recommended_offer: string;
  outreach_hook: string;
  discovery_questions: string[];
  website_notes: string;
  approval_note: string;
  created_at?: string;
  updated_at?: string;
};

type SupabaseErrorBody = {
  message?: string;
  code?: string;
  details?: string;
};

const memoryStores = new Map<string, LeadIntelligencePacket[]>();

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function storeKey() {
  return readServerEnv("LEAD_INTELLIGENCE_PACKET_STORE_PATH") || "default";
}

function clonePacket(packet: LeadIntelligencePacket): LeadIntelligencePacket {
  return { ...packet, discoveryQuestions: [...packet.discoveryQuestions] };
}

function clonePackets(packets: LeadIntelligencePacket[]) {
  return packets.map(clonePacket);
}

export function getLeadIntelligencePacketStoreConfig(): LeadIntelligencePacketStoreConfig | null {
  const url = readServerEnv("SUPABASE_URL") || readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function mapLeadIntelligencePacketToRow(
  packet: LeadIntelligencePacket
): Omit<LeadIntelligencePacketRow, "created_at" | "updated_at"> {
  return {
    id: packet.id,
    lead_id: packet.leadId,
    company: packet.company,
    status: packet.status,
    generated_at: packet.generatedAt,
    pain_hypothesis: packet.painHypothesis,
    recommended_offer: packet.recommendedOffer,
    outreach_hook: packet.outreachHook,
    discovery_questions: packet.discoveryQuestions,
    website_notes: packet.websiteNotes,
    approval_note: packet.approvalNote,
  };
}

export function mapRowToLeadIntelligencePacket(row: LeadIntelligencePacketRow): LeadIntelligencePacket {
  return {
    id: row.id,
    leadId: row.lead_id,
    company: row.company,
    status: row.status,
    generatedAt: row.generated_at,
    painHypothesis: row.pain_hypothesis,
    recommendedOffer: row.recommended_offer,
    outreachHook: row.outreach_hook,
    discoveryQuestions: Array.isArray(row.discovery_questions) ? row.discovery_questions : [],
    websiteNotes: row.website_notes,
    approvalNote: row.approval_note,
  };
}

export class MemoryLeadIntelligencePacketStore {
  async listPackets(): Promise<LeadIntelligencePacket[]> {
    return clonePackets(memoryStores.get(storeKey()) || []);
  }

  async upsertPacket(packet: LeadIntelligencePacket): Promise<LeadIntelligencePacket> {
    const current = memoryStores.get(storeKey()) || [];
    const next = [packet, ...current.filter((item) => item.leadId !== packet.leadId && item.id !== packet.id)];
    memoryStores.set(storeKey(), clonePackets(next));
    return clonePacket(packet);
  }

  async updateStatus(leadId: string, status: LeadIntelligenceStatus): Promise<LeadIntelligencePacket> {
    const current = memoryStores.get(storeKey()) || [];
    const existing = current.find((item) => item.leadId === leadId || item.id === leadId);
    if (!existing) {
      throw new Error("Lead intelligence packet was not found");
    }

    const updated = { ...existing, status };
    const next = current.map((item) => (item.leadId === existing.leadId ? updated : item));
    memoryStores.set(storeKey(), clonePackets(next));
    return clonePacket(updated);
  }
}

export class SupabaseLeadIntelligencePacketStore {
  private readonly url: string;
  private readonly serviceRoleKey: string;

  constructor(config: LeadIntelligencePacketStoreConfig) {
    this.url = normalizeSupabaseUrl(config.url);
    this.serviceRoleKey = config.serviceRoleKey;
  }

  async listPackets(): Promise<LeadIntelligencePacket[]> {
    try {
      const rows = await this.request<LeadIntelligencePacketRow[]>("/lead_intelligence_packets?select=*&order=updated_at.desc&limit=50");
      return rows.map(mapRowToLeadIntelligencePacket);
    } catch (error) {
      if (!this.isMissingTableError(error)) {
        throw error;
      }

      return new MemoryLeadIntelligencePacketStore().listPackets();
    }
  }

  async upsertPacket(packet: LeadIntelligencePacket): Promise<LeadIntelligencePacket> {
    const response = await fetch(`${this.baseUrl()}/lead_intelligence_packets?on_conflict=lead_id`, {
      method: "POST",
      headers: this.headers({ prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(mapLeadIntelligencePacketToRow(packet)),
    });

    if (!response.ok) {
      const error = await this.buildSupabaseError(response, "Supabase lead intelligence packet upsert failed");
      if (this.isMissingTableError(error)) {
        return new MemoryLeadIntelligencePacketStore().upsertPacket(packet);
      }
      throw error;
    }

    const rows = (await response.json()) as LeadIntelligencePacketRow[];
    return rows[0] ? mapRowToLeadIntelligencePacket(rows[0]) : packet;
  }

  async updateStatus(leadId: string, status: LeadIntelligenceStatus): Promise<LeadIntelligencePacket> {
    const response = await fetch(`${this.baseUrl()}/lead_intelligence_packets?lead_id=eq.${encodeURIComponent(leadId)}`, {
      method: "PATCH",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await this.buildSupabaseError(response, "Supabase lead intelligence packet status update failed");
      if (this.isMissingTableError(error)) {
        return new MemoryLeadIntelligencePacketStore().updateStatus(leadId, status);
      }
      throw error;
    }

    const rows = (await response.json()) as LeadIntelligencePacketRow[];
    if (!rows[0]) {
      throw new Error("Lead intelligence packet was not found");
    }

    return mapRowToLeadIntelligencePacket(rows[0]);
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method: "GET",
      headers: this.headers(),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response, "Supabase lead intelligence packet request failed");
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
    throw await this.buildSupabaseError(response, fallback);
  }

  private async buildSupabaseError(response: Response, fallback: string) {
    let body: SupabaseErrorBody = {};
    try {
      body = (await response.json()) as SupabaseErrorBody;
    } catch {
      // Ignore malformed Supabase error payloads and use fallback below.
    }

    const error = new Error(body.message || fallback);
    error.name = body.code || `HTTP_${response.status}`;
    return error;
  }

  private isMissingTableError(error: unknown) {
    return error instanceof Error && (error.name === "PGRST205" || error.message.includes("lead_intelligence_packets"));
  }
}

export type LeadIntelligencePacketStore = MemoryLeadIntelligencePacketStore | SupabaseLeadIntelligencePacketStore;

export function createLeadIntelligencePacketStore(): LeadIntelligencePacketStore {
  const config = getLeadIntelligencePacketStoreConfig();

  if (config) {
    return new SupabaseLeadIntelligencePacketStore(config);
  }

  return new MemoryLeadIntelligencePacketStore();
}
