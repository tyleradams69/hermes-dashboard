"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { getClientNotesKey } from "@/lib/pilotWorkspace";

const API_URL = "/api/hermes";

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [clientNotes, setClientNotes] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    id: "",
    name: "",
    industry: "",
    website: "",
  });

  async function load() {
    try {
      const res = await fetch(`${API_URL}/api/businesses`, {
        cache: "no-store",
        headers: {
          "x-hermes-role": "admin",
        },
      });

      const data = await res.json();
      const nextBusinesses = data.businesses || [];
      setBusinesses(nextBusinesses);
      setLoadError("");
      setClientNotes(
        Object.fromEntries(
          nextBusinesses.map((business: any) => [
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
    load();
  }, []);

  async function createBusiness(e: React.FormEvent) {
    e.preventDefault();

    await fetch(`${API_URL}/api/businesses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hermes-role": "admin",
      },
      body: JSON.stringify(form),
    });

    setForm({ id: "", name: "", industry: "", website: "" });
    load();
  }

  function saveClientNote(businessId: string, note: string) {
    setClientNotes((current) => ({ ...current, [businessId]: note }));
    window.localStorage.setItem(getClientNotesKey(businessId), note);
  }

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
            {businesses.length}
          </p>
        </div>

        <div className="liminull-card-soft p-5">
          <p className="liminull-eyebrow">Active</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.08em]">
            {businesses.filter((b) => b.status === "active").length}
          </p>
        </div>

        <div className="liminull-card-soft p-5">
          <p className="liminull-eyebrow">Industries</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.08em]">
            {new Set(businesses.map((b) => b.industry).filter(Boolean)).size}
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
