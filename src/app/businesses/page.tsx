"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  deriveClientWorkspaceReadiness,
  formatClientDeliveryActionPlan,
  formatClientHandoffSummary,
  selectDeliveryFocusWorkspaces,
  type ClientWorkspace,
  type ClientWorkspaceLaunchStatus,
  type ClientWorkspacePhase,
} from "@/lib/clientWorkspace";
import { getClientNotesKey } from "@/lib/pilotWorkspace";

const API_URL = "/api/hermes";

type BusinessWorkspace = {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  status?: string;
};

type ClientWorkspaceResponse = {
  ok: boolean;
  workspaces?: ClientWorkspace[];
  workspace?: ClientWorkspace;
  error?: string;
};

const clientWorkspacePhases: ClientWorkspacePhase[] = ["handoff", "build", "review", "launched"];
const launchStatuses: ClientWorkspaceLaunchStatus[] = ["not_started", "access_needed", "in_progress", "ready_to_launch", "launched"];

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeClientWorkspace(workspace: ClientWorkspace): ClientWorkspace {
  return {
    ...workspace,
    assetChecklistCompleted: workspace.assetChecklistCompleted || [],
    launchStatus: workspace.launchStatus || "not_started",
  };
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessWorkspace[]>([]);
  const [clientWorkspaces, setClientWorkspaces] = useState<ClientWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [savingWorkspaceId, setSavingWorkspaceId] = useState("");
  const [copiedWorkspaceId, setCopiedWorkspaceId] = useState("");
  const [clientNotes, setClientNotes] = useState<Record<string, string>>({});

  async function load() {
    try {
      const workspaceRes = await fetch("/api/client-workspaces", { cache: "no-store" });
      const workspaceData = (await workspaceRes.json()) as ClientWorkspaceResponse;

      if (!workspaceRes.ok || !workspaceData.ok) {
        throw new Error(workspaceData.error || "Delivery workspaces could not load");
      }

      setClientWorkspaces((workspaceData.workspaces || []).map(normalizeClientWorkspace));
    } catch {
      setClientWorkspaces([]);
    }

    try {
      const res = await fetch(`${API_URL}/api/businesses`, {
        cache: "no-store",
        headers: {
          "x-hermes-role": "admin",
        },
      });

      const data = await res.json();
      const nextBusinesses = (data.businesses || []) as BusinessWorkspace[];
      setBusinesses(nextBusinesses);
      setLoadError("");
      setClientNotes(
        Object.fromEntries(
          nextBusinesses.map((business: BusinessWorkspace) => [
            business.id,
            window.localStorage.getItem(getClientNotesKey(business.id)) || "",
          ])
        )
      );
    } catch {
      setBusinesses([]);
      setLoadError("Client workspaces could not load. Check the backend connection, then retry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);

  function updateClientWorkspaceDraft(workspaceId: string, patch: Partial<ClientWorkspace>) {
    setClientWorkspaces((current) =>
      current.map((workspace) => (workspace.id === workspaceId ? normalizeClientWorkspace({ ...workspace, ...patch }) : workspace))
    );
  }

  async function saveClientWorkspace(workspace: ClientWorkspace) {
    setSavingWorkspaceId(workspace.id);
    setWorkspaceMessage("");

    try {
      const response = await fetch("/api/client-workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspace: normalizeClientWorkspace(workspace) }),
      });
      const data = (await response.json()) as ClientWorkspaceResponse;

      if (!response.ok || !data.ok || !data.workspace) {
        throw new Error(data.error || "Client workspace could not be saved");
      }

      setClientWorkspaces((current) =>
        current.map((item) => (item.id === workspace.id ? normalizeClientWorkspace(data.workspace as ClientWorkspace) : item))
      );
      setWorkspaceMessage(`${workspace.name} delivery workspace saved.`);
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : "Client workspace could not be saved");
    } finally {
      setSavingWorkspaceId("");
    }
  }

  function toggleChecklistItem(workspace: ClientWorkspace, item: string) {
    const completed = new Set(workspace.assetChecklistCompleted || []);
    if (completed.has(item)) {
      completed.delete(item);
    } else {
      completed.add(item);
    }
    updateClientWorkspaceDraft(workspace.id, { assetChecklistCompleted: Array.from(completed) });
  }

  function saveClientNote(businessId: string, note: string) {
    setClientNotes((current) => ({ ...current, [businessId]: note }));
    window.localStorage.setItem(getClientNotesKey(businessId), note);
  }

  async function copyWorkspaceText(workspace: ClientWorkspace, text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWorkspaceId(`${workspace.id}:${label}`);
      setWorkspaceMessage(`${workspace.name} ${label} copied.`);
    } catch {
      setWorkspaceMessage("Copy failed. Open the summary and copy the text manually.");
    }
  }

  const deliveryFocusWorkspaces = selectDeliveryFocusWorkspaces(clientWorkspaces);

  return (
    <AppShell
      active="clients"
      eyebrow="Client Infrastructure"
      title="Clients"
      description="Create, manage, and supervise client workspaces connected to Liminull operational intelligence."
    >
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="liminull-card-soft p-5">
          <p className="liminull-eyebrow">Total Clients</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.08em]">
            {businesses.length + clientWorkspaces.length}
          </p>
        </div>

        <div className="liminull-card-soft p-5">
          <p className="liminull-eyebrow">Active</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.08em]">
            {businesses.filter((b) => b.status === "active").length + clientWorkspaces.filter((workspace) => workspace.phase !== "launched").length}
          </p>
        </div>

        <div className="liminull-card-soft p-5">
          <p className="liminull-eyebrow">Industries</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.08em]">
            {new Set([...businesses.map((b) => b.industry), ...clientWorkspaces.map((workspace) => workspace.packageFit)].filter(Boolean)).size}
          </p>
        </div>
      </div>


      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="liminull-eyebrow">
            Workspace Management
          </p>

          <p className="mt-2 text-sm liminull-muted">
            Existing operational workspaces connected to Liminull intelligence.
          </p>
        </div>

        <a
          href="/onboarding"
          className="liminull-button"
        >
          New Client Onboarding
        </a>
      </div>

      {clientWorkspaces.length > 0 && (
        <div className="mb-8 liminull-card-soft p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="liminull-eyebrow">Delivery Focus Queue</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">What needs delivery attention next</h2>
              <p className="mt-2 text-sm liminull-muted">
                Prioritized from launch blockers, asset readiness, current phase, and final QA status so client work does not stall after close-won conversion.
              </p>
            </div>
            <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
              {deliveryFocusWorkspaces.length} active focus items
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {deliveryFocusWorkspaces.map(({ workspace, readiness }) => (
              <article key={workspace.id} className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{workspace.name}</p>
                    <p className="mt-1 text-xs liminull-muted">{workspace.owner} · {labelize(workspace.phase)} · {labelize(readiness.tier)}</p>
                  </div>
                  <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                    {readiness.score}% ready
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/70">{readiness.nextStep}</p>

                {readiness.blockers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {readiness.blockers.map((blocker) => (
                      <span key={blocker} className="rounded-full border border-amber-300/10 bg-amber-300/[0.08] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100/80">
                        {blocker}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {clientWorkspaces.length > 0 && (
        <div className="mb-8 liminull-card-soft p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="liminull-eyebrow">Client Delivery OS</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">Delivery workspaces</h2>
              <p className="mt-2 text-sm liminull-muted">
                Closed-won pipeline leads converted into editable internal delivery workspaces. Update phase, launch status, assets, notes, and next deliverables here.
              </p>
            </div>
            <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-100">
              {clientWorkspaces.length} from pipeline
            </span>
          </div>

          {workspaceMessage && (
            <div className="mt-4 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.06] p-3 text-sm text-emerald-50">
              {workspaceMessage}
            </div>
          )}

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {clientWorkspaces.map((workspace) => {
              const completedCount = workspace.assetChecklistCompleted?.length || 0;
              const readiness = deriveClientWorkspaceReadiness(workspace);
              const handoffSummary = formatClientHandoffSummary(workspace);
              const actionPlan = formatClientDeliveryActionPlan(workspace);
              return (
                <article key={workspace.id} className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-white">{workspace.name}</h3>
                      <p className="mt-1 text-xs liminull-muted">{workspace.owner} · {workspace.location}</p>
                    </div>
                    <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100">
                      {labelize(workspace.phase)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/45">
                      Phase
                      <select
                        value={workspace.phase}
                        onChange={(event) => updateClientWorkspaceDraft(workspace.id, { phase: event.target.value as ClientWorkspacePhase })}
                        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40"
                      >
                        {clientWorkspacePhases.map((phase) => (
                          <option key={phase} value={phase}>{labelize(phase)}</option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/45">
                      Launch status
                      <select
                        value={workspace.launchStatus || "not_started"}
                        onChange={(event) => updateClientWorkspaceDraft(workspace.id, { launchStatus: event.target.value as ClientWorkspaceLaunchStatus })}
                        className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-emerald-300/40"
                      >
                        {launchStatuses.map((status) => (
                          <option key={status} value={status}>{labelize(status)}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Package</p>
                    <p className="mt-2 text-sm font-black text-emerald-50">{workspace.packageFit}</p>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Delivery readiness</p>
                      <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/70">
                        {labelize(readiness.tier)}
                      </span>
                    </div>
                    <p className="mt-2 text-2xl font-black text-emerald-50">{readiness.score}%</p>
                    <p className="mt-2 text-xs leading-5 text-white/55">{readiness.nextStep}</p>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Delivery action plan</p>
                      <button
                        type="button"
                        onClick={() => copyWorkspaceText(workspace, actionPlan, "action plan")}
                        className="rounded-full border border-emerald-300/10 bg-emerald-300/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100 transition hover:border-emerald-300/30"
                      >
                        {copiedWorkspaceId === `${workspace.id}:action plan` ? "Copied" : "Copy plan"}
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs leading-5 text-white/60">
                      <p><span className="font-black text-white/75">Next:</span> {readiness.nextStep}</p>
                      <p><span className="font-black text-white/75">Deliverable:</span> {workspace.nextDeliverable || "Set the next delivery milestone"}</p>
                      {readiness.blockers.length > 0 && (
                        <p><span className="font-black text-amber-100/80">Blocked by:</span> {readiness.blockers.join(", ")}</p>
                      )}
                    </div>
                  </div>

                  <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/45">
                    Next deliverable
                    <input
                      value={workspace.nextDeliverable}
                      onChange={(event) => updateClientWorkspaceDraft(workspace.id, { nextDeliverable: event.target.value })}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
                    />
                  </label>

                  <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Asset checklist</p>
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/60">
                        {completedCount}/{workspace.assetChecklist.length} complete
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {workspace.assetChecklist.map((item) => (
                        <label key={item} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2 text-xs text-white/70">
                          <input
                            type="checkbox"
                            checked={workspace.assetChecklistCompleted?.includes(item) || false}
                            onChange={() => toggleChecklistItem(workspace, item)}
                            className="mt-0.5 h-4 w-4 accent-emerald-300"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/45">
                    Internal delivery notes
                    <textarea
                      value={workspace.internalNotes}
                      onChange={(event) => updateClientWorkspaceDraft(workspace.id, { internalNotes: event.target.value })}
                      placeholder="Delivery blockers, access status, kickoff notes, launch details..."
                      className="min-h-24 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm normal-case leading-5 tracking-normal text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveClientWorkspace(workspace)}
                      disabled={savingWorkspaceId === workspace.id}
                      className="liminull-button px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {savingWorkspaceId === workspace.id ? "Saving..." : "Save delivery workspace"}
                    </button>
                    {workspace.website && (
                      <a href={workspace.website} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/70 transition hover:border-emerald-300/25 hover:text-emerald-50">
                        Open website
                      </a>
                    )}
                  </div>

                  <details className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3 text-sm text-white/70">
                    <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.16em] text-emerald-100/70">
                      Client-safe handoff summary
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyWorkspaceText(workspace, handoffSummary, "handoff summary")}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-emerald-300/25 hover:text-emerald-50"
                      >
                        {copiedWorkspaceId === `${workspace.id}:handoff summary` ? "Copied handoff" : "Copy handoff"}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyWorkspaceText(workspace, actionPlan, "action plan")}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-white/70 transition hover:border-emerald-300/25 hover:text-emerald-50"
                      >
                        {copiedWorkspaceId === `${workspace.id}:action plan` ? "Copied plan" : "Copy action plan"}
                      </button>
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-white/60">{handoffSummary}</pre>
                  </details>
                </article>
              );
            })}
          </div>
        </div>
      )}


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && (
          <div className="liminull-card-soft p-5 text-white/50">
            Loading clients...
          </div>
        )}

        {!loading && loadError && (
          <div className="liminull-card-soft p-5 text-white/60 md:col-span-2 xl:col-span-3">
            <p className="text-sm font-black text-red-200">Client data unavailable</p>
            <p className="mt-2 text-sm liminull-muted">{loadError}</p>
            <button onClick={load} className="liminull-button mt-4">Retry</button>
          </div>
        )}

        {!loading && !loadError && businesses.length === 0 && (
          <div className="liminull-card-soft p-5 text-white/60 md:col-span-2 xl:col-span-3">
            <p className="text-sm font-black text-white">No pilot clients yet.</p>
            <p className="mt-2 text-sm liminull-muted">Create a workspace from onboarding, then use this page to track pilot notes and follow-up.</p>
            <a href="/onboarding" className="liminull-button mt-4 inline-flex">Start onboarding</a>
          </div>
        )}

        {businesses.map((business) => (
          <div
            key={business.id}
            className="liminull-card-soft p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black">{business.name}</p>
                <p className="mt-1 text-xs liminull-muted">{business.id}</p>
              </div>

              <span className="rounded-full border border-cyan-300/10 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                {business.status}
              </span>
            </div>

            <div className="mt-5 space-y-2 text-sm text-white/60">
              <p>Industry: {business.industry || "unknown"}</p>
              <p>Website: {business.website || "none"}</p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  Readiness
                </p>

                <p className="mt-2 text-lg font-black text-cyan-100">
                  Active
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  Supervision
                </p>

                <p className="mt-2 text-lg font-black text-cyan-100">
                  Live
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                  Operational Status
                </p>

                <p className="mt-1 text-sm font-black text-cyan-100">
                  Synced
                </p>
              </div>

              <div className="h-3 w-3 rounded-full bg-cyan-300 liminull-live-pulse" />
            </div>

            <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/30" htmlFor={`note-${business.id}`}>
                Internal pilot notes
              </label>
              <textarea
                id={`note-${business.id}`}
                value={clientNotes[business.id] || ""}
                onChange={(event) => saveClientNote(business.id, event.target.value)}
                placeholder="Pain points, decision maker, follow-up date, package fit, next action..."
                className="mt-3 min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
              />
              <p className="mt-2 text-xs liminull-muted">Saved locally in this dashboard browser for pilot follow-up.</p>
            </div>

            <a
              href={`/operations?business_id=${business.id}`}
              className="mt-5 inline-flex rounded-xl liminull-button"
            >
              Open Dashboard
            </a>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
