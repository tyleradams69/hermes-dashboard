import { readServerEnv } from "./env";
import { normalizeLeadSearchInput, type LeadSearchInput } from "./leadScraper";

export type LeadSearchRun = {
  id: string;
  input: LeadSearchInput;
  resultCount: number;
  topLeadCompany?: string;
  warnings: string[];
  createdAt: string;
};

export type LeadSearchRunStoreConfig = {
  url: string;
  serviceRoleKey: string;
};

export type LeadSearchRunRow = {
  id: string;
  business: string;
  location: string;
  distance_miles: number;
  niche: string;
  only_without_website: boolean;
  has_phone_only: boolean;
  min_rating: number;
  min_reviews: number;
  weak_website_candidate: boolean;
  result_count: number;
  top_lead_company?: string | null;
  warnings: string[];
  created_at: string;
};

type SupabaseErrorBody = {
  message?: string;
  code?: string;
  details?: string;
};

const memoryStores = new Map<string, LeadSearchRun[]>();

function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function storeKey() {
  return readServerEnv("LEAD_SEARCH_RUN_STORE_PATH") || "default";
}

function cloneRun(run: LeadSearchRun): LeadSearchRun {
  return { ...run, input: { ...run.input }, warnings: [...run.warnings] };
}

function cloneRuns(runs: LeadSearchRun[]) {
  return runs.map(cloneRun);
}

function fingerprintInput(input: LeadSearchInput) {
  return [
    input.business,
    input.location,
    input.distanceMiles,
    input.niche,
    input.onlyWithoutWebsite ? "no-site" : "all-sites",
    input.hasPhoneOnly ? "phone" : "any-phone",
    input.minRating || 0,
    input.minReviews || 0,
    input.weakWebsiteCandidate ? "weak" : "any-web",
  ]
    .join("::")
    .toLowerCase();
}

export function getLeadSearchRunStoreConfig(): LeadSearchRunStoreConfig | null {
  const url = readServerEnv("SUPABASE_URL") || readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url, serviceRoleKey };
}

export function createLeadSearchRunId(input: LeadSearchInput, createdAt: string) {
  const slug = [input.business, input.location, input.niche]
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `run-${slug || "lead-search"}-${Date.parse(createdAt) || Date.now()}`;
}

export function buildLeadSearchRun(params: {
  input: Partial<LeadSearchInput>;
  resultCount: number;
  topLeadCompany?: string;
  warnings?: string[];
  createdAt?: Date;
}): LeadSearchRun {
  const input = normalizeLeadSearchInput(params.input);
  const createdAt = (params.createdAt || new Date()).toISOString();
  return {
    id: createLeadSearchRunId(input, createdAt),
    input,
    resultCount: Math.max(0, Math.round(Number(params.resultCount) || 0)),
    topLeadCompany: params.topLeadCompany,
    warnings: params.warnings || [],
    createdAt,
  };
}

export function mapLeadSearchRunToRow(run: LeadSearchRun): LeadSearchRunRow {
  return {
    id: run.id,
    business: run.input.business,
    location: run.input.location,
    distance_miles: run.input.distanceMiles || 15,
    niche: run.input.niche || "AI automation",
    only_without_website: Boolean(run.input.onlyWithoutWebsite),
    has_phone_only: Boolean(run.input.hasPhoneOnly),
    min_rating: run.input.minRating || 0,
    min_reviews: run.input.minReviews || 0,
    weak_website_candidate: Boolean(run.input.weakWebsiteCandidate),
    result_count: run.resultCount,
    top_lead_company: run.topLeadCompany || null,
    warnings: run.warnings,
    created_at: run.createdAt,
  };
}

export function mapRowToLeadSearchRun(row: LeadSearchRunRow): LeadSearchRun {
  return {
    id: row.id,
    input: normalizeLeadSearchInput({
      business: row.business,
      location: row.location,
      distanceMiles: row.distance_miles,
      niche: row.niche,
      onlyWithoutWebsite: row.only_without_website,
      hasPhoneOnly: row.has_phone_only,
      minRating: row.min_rating,
      minReviews: row.min_reviews,
      weakWebsiteCandidate: row.weak_website_candidate,
    }),
    resultCount: row.result_count,
    topLeadCompany: row.top_lead_company || undefined,
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    createdAt: row.created_at,
  };
}

export class MemoryLeadSearchRunStore {
  async listRuns(): Promise<LeadSearchRun[]> {
    return cloneRuns(memoryStores.get(storeKey()) || []);
  }

  async saveRun(run: LeadSearchRun): Promise<LeadSearchRun> {
    const current = memoryStores.get(storeKey()) || [];
    const next = [run, ...current.filter((item) => fingerprintInput(item.input) !== fingerprintInput(run.input))].slice(0, 12);
    memoryStores.set(storeKey(), cloneRuns(next));
    return cloneRun(run);
  }
}

export class SupabaseLeadSearchRunStore {
  private readonly url: string;
  private readonly serviceRoleKey: string;

  constructor(config: LeadSearchRunStoreConfig) {
    this.url = normalizeSupabaseUrl(config.url);
    this.serviceRoleKey = config.serviceRoleKey;
  }

  async listRuns(): Promise<LeadSearchRun[]> {
    const rows = await this.request<LeadSearchRunRow[]>("/lead_search_runs?select=*&order=created_at.desc&limit=12");
    return rows.map(mapRowToLeadSearchRun);
  }

  async saveRun(run: LeadSearchRun): Promise<LeadSearchRun> {
    const response = await fetch(`${this.baseUrl()}/lead_search_runs`, {
      method: "POST",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify(mapLeadSearchRunToRow(run)),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response, "Supabase lead search run save failed");
    }

    const rows = (await response.json()) as LeadSearchRunRow[];
    return rows[0] ? mapRowToLeadSearchRun(rows[0]) : run;
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl()}${path}`, {
      method: "GET",
      headers: this.headers(),
    });

    if (!response.ok) {
      await this.throwSupabaseError(response, "Supabase lead search run request failed");
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

    const error = new Error(body.message || fallback);
    error.name = body.code || `HTTP_${response.status}`;
    throw error;
  }
}

export type LeadSearchRunStore = MemoryLeadSearchRunStore | SupabaseLeadSearchRunStore;

export function createLeadSearchRunStore(): LeadSearchRunStore {
  const config = getLeadSearchRunStoreConfig();

  if (config) {
    return new SupabaseLeadSearchRunStore(config);
  }

  return new MemoryLeadSearchRunStore();
}
