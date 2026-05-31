import { readServerEnv } from "./env";
import type { ClientWorkspace } from "./clientWorkspace";

export type ClientWorkspaceStoreConfig = {
  url: string;
  serviceRoleKey: string;
};

export type ClientWorkspaceRow = {
  id: string;
  source_lead_id: string;
  name: string;
  owner: string;
  phase: ClientWorkspace["phase"];
  package_fit: string;
  website?: string | null;
  phone?: string | null;
  location: string;
  next_deliverable: string;
  asset_checklist: string[];
  asset_checklist_completed?: string[] | null;
  launch_status?: ClientWorkspace["launchStatus"] | null;
  internal_notes: string;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorBody = {
  message?: string;
  code?: string;
  details?: string;
};

type SupabaseLeadPipelineMetadataRow = {
  metadata?: {
    clientWorkspace?: ClientWorkspace;
  } | null;
};

const memoryStores = new Map<string, ClientWorkspace[]>();

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function cloneWorkspace(workspace: ClientWorkspace): ClientWorkspace {
  return {
    ...workspace,
    assetChecklist: [...workspace.assetChecklist],
    assetChecklistCompleted: [...(workspace.assetChecklistCompleted || [])],
  };
}

function cloneWorkspaces(workspaces: ClientWorkspace[]) {
  return workspaces.map(cloneWorkspace);
}

function storeKey() {
  return readServerEnv("CLIENT_WORKSPACE_STORE_PATH") || "default";
}

export function getClientWorkspaceStoreConfig(): ClientWorkspaceStoreConfig | null {
  const url = readServerEnv("SUPABASE_URL") || readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function mapClientWorkspaceToRow(workspace: ClientWorkspace): Omit<ClientWorkspaceRow, "created_at" | "updated_at"> {
  return {
    id: workspace.id,
    source_lead_id: workspace.sourceLeadId,
    name: workspace.name,
    owner: workspace.owner,
    phase: workspace.phase,
    package_fit: workspace.packageFit,
    website: workspace.website || null,
    phone: workspace.phone || null,
    location: workspace.location,
    next_deliverable: workspace.nextDeliverable,
    asset_checklist: workspace.assetChecklist,
    asset_checklist_completed: workspace.assetChecklistCompleted || [],
    launch_status: workspace.launchStatus || "not_started",
    internal_notes: workspace.internalNotes,
  };
}

export function mapRowToClientWorkspace(row: ClientWorkspaceRow): ClientWorkspace {
  return {
    id: row.id,
    sourceLeadId: row.source_lead_id,
    name: row.name,
    owner: row.owner,
    phase: row.phase,
    packageFit: row.package_fit,
    website: row.website || undefined,
    phone: row.phone || undefined,
    location: row.location,
    nextDeliverable: row.next_deliverable,
    assetChecklist: Array.isArray(row.asset_checklist) ? row.asset_checklist : [],
    assetChecklistCompleted: Array.isArray(row.asset_checklist_completed) ? row.asset_checklist_completed : [],
    launchStatus: row.launch_status || "not_started",
    internalNotes: row.internal_notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MemoryClientWorkspaceStore {
  async listWorkspaces(): Promise<ClientWorkspace[]> {
    return cloneWorkspaces(memoryStores.get(storeKey()) || []);
  }

  async upsertWorkspace(workspace: ClientWorkspace): Promise<ClientWorkspace> {
    const current = memoryStores.get(storeKey()) || [];
    const existing = current.find((item) => item.id === workspace.id || item.sourceLeadId === workspace.sourceLeadId);
    const nextWorkspace = {
      ...workspace,
      createdAt: existing?.createdAt || workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
    const next = [nextWorkspace, ...current.filter((item) => item.id !== nextWorkspace.id && item.sourceLeadId !== nextWorkspace.sourceLeadId)];
    memoryStores.set(storeKey(), cloneWorkspaces(next));
    return cloneWorkspace(nextWorkspace);
  }
}

export class SupabaseClientWorkspaceStore {
  private readonly url: string;
  private readonly serviceRoleKey: string;

  constructor(config: ClientWorkspaceStoreConfig) {
    this.url = normalizeSupabaseUrl(config.url);
    this.serviceRoleKey = config.serviceRoleKey;
  }

  async listWorkspaces(): Promise<ClientWorkspace[]> {
    try {
      const rows = await this.request<ClientWorkspaceRow[]>("/client_workspaces?select=*&order=updated_at.desc");
      return rows.map(mapRowToClientWorkspace);
    } catch (error) {
      if (!this.isMissingTableError(error)) {
        throw error;
      }

      return this.listWorkspacesFromLeadMetadata();
    }
  }

  async upsertWorkspace(workspace: ClientWorkspace): Promise<ClientWorkspace> {
    const response = await fetch(`${this.baseUrl()}/client_workspaces?on_conflict=source_lead_id`, {
      method: "POST",
      headers: this.headers({ prefer: "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(mapClientWorkspaceToRow(workspace)),
    });

    if (!response.ok) {
      const error = await this.buildSupabaseError(response, "Supabase client workspace upsert failed");
      if (this.isMissingTableError(error)) {
        return this.upsertWorkspaceIntoLeadMetadata(workspace);
      }
      throw error;
    }

    const rows = (await response.json()) as ClientWorkspaceRow[];
    return rows[0] ? mapRowToClientWorkspace(rows[0]) : workspace;
  }

  private async listWorkspacesFromLeadMetadata(): Promise<ClientWorkspace[]> {
    const rows = await this.request<SupabaseLeadPipelineMetadataRow[]>(
      "/lead_pipeline?select=metadata&order=updated_at.desc"
    );

    return rows
      .map((row) => row.metadata?.clientWorkspace)
      .filter((workspace): workspace is ClientWorkspace => Boolean(workspace))
      .map(cloneWorkspace);
  }

  private async upsertWorkspaceIntoLeadMetadata(workspace: ClientWorkspace): Promise<ClientWorkspace> {
    const response = await fetch(`${this.baseUrl()}/lead_pipeline?id=eq.${encodeURIComponent(workspace.sourceLeadId)}`, {
      method: "PATCH",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify({ metadata: { clientWorkspace: workspace } }),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response, "Supabase lead metadata workspace upsert failed");
    }

    const rows = (await response.json()) as unknown[];
    if (rows.length === 0) {
      throw new Error("Source pipeline lead was not found for client workspace handoff");
    }

    return cloneWorkspace(workspace);
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method: "GET",
      headers: this.headers(),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response, "Supabase client workspace request failed");
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
    return error instanceof Error && (error.name === "PGRST205" || error.message.includes("client_workspaces"));
  }
}

export type ClientWorkspaceStore = MemoryClientWorkspaceStore | SupabaseClientWorkspaceStore;

export function createClientWorkspaceStore(): ClientWorkspaceStore {
  const config = getClientWorkspaceStoreConfig();

  if (config) {
    return new SupabaseClientWorkspaceStore(config);
  }

  return new MemoryClientWorkspaceStore();
}
