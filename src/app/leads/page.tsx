"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import type { PipelineLead, LeadPipelineStage } from "@/lib/leadPipeline";
import type { LeadRecord, LeadSourceLink } from "@/lib/leadScraper";

type LeadScraperResponse = {
  ok: boolean;
  input?: {
    business: string;
    location: string;
    distanceMiles: number;
    niche: string;
  };
  setup?: {
    googlePlacesConfigured: boolean;
  };
  queries?: string[];
  sourceLinks?: LeadSourceLink[];
  leads?: LeadRecord[];
  warnings?: string[];
  complianceNote?: string;
  error?: string;
};

type PipelineResponse = {
  ok: boolean;
  leads?: PipelineLead[];
  lead?: PipelineLead;
  existingLead?: PipelineLead;
  reason?: string;
  error?: string;
};

const defaultForm = {
  business: "dentists",
  location: "Austin, TX",
  distanceMiles: "25",
  niche: "AI intake automation",
};

const pipelineStages: LeadPipelineStage[] = [
  "new_lead",
  "contacted",
  "interested",
  "pricing_requested",
  "meeting_requested",
  "closed_won",
  "closed_lost",
];

function stageLabel(stage: string) {
  return stage.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function LeadsPage() {
  const [form, setForm] = useState(defaultForm);
  const [employee, setEmployee] = useState("Tyler");
  const [loading, setLoading] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [result, setResult] = useState<LeadScraperResponse | null>(null);
  const [pipelineLeads, setPipelineLeads] = useState<PipelineLead[]>([]);
  const [error, setError] = useState("");
  const [pipelineMessage, setPipelineMessage] = useState("");

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/lead-scraper", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          distanceMiles: Number(form.distanceMiles),
        }),
      });
      const data = (await response.json()) as LeadScraperResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Lead scraper request failed");
      }

      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Lead scraper request failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const loadPipeline = useCallback(async () => {
    setPipelineLoading(true);
    setPipelineMessage("");

    try {
      const response = await fetch("/api/lead-pipeline", { cache: "no-store" });
      const data = (await response.json()) as PipelineResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Pipeline could not load");
      }

      setPipelineLeads(data.leads || []);
    } catch (caught) {
      setPipelineMessage(caught instanceof Error ? caught.message : "Pipeline could not load");
    } finally {
      setPipelineLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPipeline();
    });
  }, [loadPipeline]);

  async function importLead(lead: LeadRecord) {
    setPipelineMessage("");

    try {
      const response = await fetch("/api/lead-pipeline", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lead, owner: employee }),
      });
      const data = (await response.json()) as PipelineResponse;

      if (response.status === 409) {
        if (data.existingLead) {
          setPipelineLeads((current) =>
            current.some((pipelineLead) => pipelineLead.id === data.existingLead!.id)
              ? current
              : [data.existingLead!, ...current]
          );
        }
        setPipelineMessage(
          `${lead.company} is already owned by ${data.existingLead?.owner || "another employee"}; duplicates are blocked globally.`
        );
        return;
      }

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Lead import failed");
      }

      setPipelineLeads((current) => [data.lead!, ...current]);
      setPipelineMessage(`${lead.company} imported into ${employee}'s pipeline.`);
    } catch (caught) {
      setPipelineMessage(caught instanceof Error ? caught.message : "Lead import failed");
    }
  }

  async function updatePipelineLead(id: string, patch: Partial<Pick<PipelineLead, "stage" | "notes" | "nextAction">>) {
    setPipelineMessage("");

    try {
      const response = await fetch("/api/lead-pipeline", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = (await response.json()) as PipelineResponse;

      if (!response.ok || !data.ok || !data.lead) {
        throw new Error(data.error || "Lead update failed");
      }

      setPipelineLeads((current) => current.map((lead) => (lead.id === id ? data.lead! : lead)));
    } catch (caught) {
      setPipelineMessage(caught instanceof Error ? caught.message : "Lead update failed");
    }
  }

  const leads = result?.leads || [];
  const sourceLinks = result?.sourceLinks || [];
  const queries = result?.queries || [];

  return (
    <AppShell
      active="leads"
      eyebrow="Employee-only intelligence"
      title="AI Lead Scraper + Pipeline"
      description="Find local companies, enrich phone numbers through Google Places, and import unique leads into employee-owned Liminull pipelines."
      businessId="liminull"
    >
      <div className="grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={runSearch} className="liminull-card-soft self-start p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="liminull-eyebrow">Search inputs</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                Local company discovery
              </h2>
              <p className="mt-2 text-sm liminull-muted">
                Enter any business type, market, radius, and niche. Phone numbers come from Google Place Details when available.
              </p>
            </div>
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
              Staff
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-white/80">
              Employee importing leads
              <input
                value={employee}
                onChange={(event) => setEmployee(event.target.value)}
                placeholder="Tyler, Jack, etc."
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-white/80">
              Business / company type
              <input
                value={form.business}
                onChange={(event) => setForm((current) => ({ ...current, business: event.target.value }))}
                placeholder="law firms, restaurants, clinics, HVAC companies..."
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-white/80">
              Location
              <input
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="City, state, region"
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-white/80">
                Distance (miles)
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={form.distanceMiles}
                  onChange={(event) => setForm((current) => ({ ...current, distanceMiles: event.target.value }))}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-white/80">
                AI niche
                <input
                  value={form.niche}
                  onChange={(event) => setForm((current) => ({ ...current, niche: event.target.value }))}
                  placeholder="AI phones, intake, workflows..."
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/40"
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="liminull-button mt-6 w-full justify-center disabled:opacity-60">
            {loading ? "Searching..." : "Run lead scrape"}
          </button>
        </form>

        <div className="grid min-w-0 gap-5 self-start">
          <div className="liminull-card-soft self-start p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="liminull-eyebrow">Google Places leads</p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                  Ranked prospects
                </h2>
              </div>
              <span className="rounded-full border border-cyan-300/10 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                {leads.length} found
              </span>
            </div>

            {result?.warnings?.map((warning) => (
              <div key={warning} className="mt-4 rounded-2xl border border-amber-200/15 bg-amber-300/10 p-4 text-sm text-amber-50">
                {warning}
              </div>
            ))}

            <div className="mt-5 grid max-h-[620px] gap-3 overflow-y-auto pr-1">
              {!result && (
                <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm liminull-muted">
                  Run a search to populate scored Google Places leads and platform discovery links.
                </div>
              )}

              {result && leads.length === 0 && (
                <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm liminull-muted">
                  No Google Places leads returned yet. Broaden the search or verify the Places API key restrictions.
                </div>
              )}

              {leads.map((lead) => (
                <article key={lead.id} className="rounded-2xl border border-white/5 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-white">{lead.company}</h3>
                      <p className="mt-1 truncate text-xs liminull-muted">{lead.location}</p>
                      <p className="mt-2 text-sm text-cyan-100">{lead.phone || "No phone found"}</p>
                      {lead.website && <p className="mt-1 truncate text-xs text-white/45">{lead.website}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-cyan-300/10 px-3 py-1 text-sm font-black text-cyan-100">
                      {lead.score}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.size}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.aiIntent} intent</span>
                    <span className="rounded-full bg-white/5 px-3 py-1">{lead.niche}</span>
                  </div>
                  <ul className="mt-3 line-clamp-2 list-disc space-y-1 pl-5 text-xs text-white/60">
                    {lead.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => importLead(lead)}
                    className="liminull-button mt-3 inline-flex px-4 py-2 text-sm"
                  >
                    Import to {employee || "employee"} pipeline
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="liminull-card-soft p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="liminull-eyebrow">Employee lead pipeline</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
              Imported leads
            </h2>
            <p className="mt-2 text-sm liminull-muted">
              Duplicate lock is global: once imported by one Liminull employee, another employee cannot import that same lead.
            </p>
          </div>
          <button type="button" onClick={loadPipeline} disabled={pipelineLoading} className="liminull-button disabled:opacity-60">
            {pipelineLoading ? "Loading..." : "Refresh pipeline"}
          </button>
        </div>

        {pipelineMessage && (
          <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4 text-sm text-cyan-50">
            {pipelineMessage}
          </div>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {pipelineLeads.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-black/20 p-5 text-sm liminull-muted lg:col-span-2">
              No imported leads loaded yet. Import a scraped lead or refresh the pipeline.
            </div>
          )}

          {pipelineLeads.map((lead) => (
            <article key={lead.id} className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white">{lead.company}</h3>
                  <p className="mt-1 text-xs liminull-muted">Owner: {lead.owner} · {lead.location}</p>
                  <p className="mt-2 text-sm text-cyan-100">{lead.phone || "No phone"}</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-sm font-black text-white/70">
                  {lead.score}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  Stage
                  <select
                    value={lead.stage}
                    onChange={(event) => updatePipelineLead(lead.id, { stage: event.target.value as LeadPipelineStage })}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                  >
                    {pipelineStages.map((stage) => (
                      <option key={stage} value={stage}>{stageLabel(stage)}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  Next action
                  <input
                    value={lead.nextAction}
                    onChange={(event) => updatePipelineLead(lead.id, { nextAction: event.target.value })}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none"
                  />
                </label>
              </div>

              <label className="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                Notes
                <textarea
                  value={lead.notes}
                  onChange={(event) => updatePipelineLead(lead.id, { notes: event.target.value })}
                  placeholder="Contact attempts, decision maker, objections, next meeting..."
                  className="min-h-20 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25"
                />
              </label>
            </article>
          ))}
        </div>
      </div>

      {result && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="liminull-card-soft p-5">
            <p className="liminull-eyebrow">AI-intent search queries</p>
            <div className="mt-4 grid gap-2">
              {queries.map((query) => (
                <div key={query} className="rounded-2xl border border-white/5 bg-black/20 p-3 text-sm text-white/70">
                  {query}
                </div>
              ))}
            </div>
          </div>

          <div className="liminull-card-soft p-5">
            <p className="liminull-eyebrow">Platform discovery</p>
            <div className="mt-4 grid gap-2">
              {sourceLinks.map((link) => (
                <a
                  key={link.source}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/5 bg-black/20 p-3 text-sm text-cyan-100 transition hover:border-cyan-300/20 hover:bg-cyan-300/10"
                >
                  <span className="font-black capitalize">{link.source}</span>
                  <span className="mt-1 block text-white/50">{link.query}</span>
                </a>
              ))}
            </div>
            {result.complianceNote && (
              <p className="mt-4 text-xs leading-5 liminull-muted">{result.complianceNote}</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
