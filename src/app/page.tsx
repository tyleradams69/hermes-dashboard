"use client";

import LeadDrawer from "../components/LeadDrawer";
import PipelineBoard from "../components/PipelineBoard";
import SignalAlert from "../components/SignalAlert";
import SystemTelemetry from "../components/SystemTelemetry";
import CommandPalette from "../components/CommandPalette";
import SystemToasts from "../components/SystemToasts";
import SystemStatusBar from "../components/SystemStatusBar";
import OperatorPresence from "../components/OperatorPresence";
import ApprovalQueue from "../components/ApprovalQueue";
import AIAlerts from "../components/AIAlerts";
import PredictiveSignals from "../components/PredictiveSignals";
import PredictiveFeed from "../components/PredictiveFeed";
import OperatorPerformancePanel from "../components/OperatorPerformancePanel";
import OperationalCorrelationsPanel from "../components/OperationalCorrelationsPanel";
import StrategyPanel from "../components/StrategyPanel";
import ArtifactRuntime from "../components/ArtifactRuntime";
import SystemBoot from "../components/SystemBoot";
import OperatorAtmosphere from "../components/OperatorAtmosphere";
import { useEffect, useMemo, useState } from "react";
import ActivityFeed from "../components/ActivityFeed";

type LeadState = {
  status?: string;
  pipelineStage?: string;
  website?: string;
  toEmail?: string;
  sentAt?: string;
  updatedAt?: string;
  replyStatus?: string;
  latestReply?: string;
  followupCount?: number;
  nextFollowupAt?: string;
  outreachFile?: string;
  auditFile?: string;
};

type StateResponse = Record<string, LeadState>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

function formatDate(value?: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function stageLabel(stage?: string) {
  return stage?.replaceAll("_", " ").toUpperCase() || "UNCLASSIFIED";
}

function statusTone(status?: string) {
  switch (status) {
    case "sent":
      return "border-cyan-300/50 bg-cyan-300/10 text-cyan-100";
    case "approved":
      return "border-lime-300/50 bg-lime-300/10 text-lime-100";
    case "rejected":
    case "failed":
      return "border-red-300/50 bg-red-300/10 text-red-100";
    default:
      return "border-white/15 bg-black/35 backdrop-blur-2xl/5 text-white/70";
  }
}

function stageTone(stage?: string) {
  switch (stage) {
    case "meeting_requested":
      return "text-cyan-200";
    case "pricing_requested":
      return "text-blue-200";
    case "closed_lost":
      return "text-red-200";
    case "contacted":
      return "text-emerald-200";
    default:
      return "text-white/70";
  }
}

export default function Home() {
  const [state, setState] = useState<StateResponse>({});
  const [followups, setFollowups] = useState<{ totalDue: number; due: unknown[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
const [leadActivity, setLeadActivity] = useState<any[]>([]);
const [newCompany, setNewCompany] = useState("");
const [newEmail, setNewEmail] = useState("");
const [newPhone, setNewPhone] = useState("");
const [newWebsite, setNewWebsite] = useState("");
const [importing, setImporting] = useState(false);
const [drawerOpen, setDrawerOpen] = useState(false);

  async function loadData() {
    try {
      const [stateRes, followupRes] = await Promise.all([
        fetch(`${API_URL}/api/state`, { cache: "no-store" }),
        fetch(`${API_URL}/api/followups`, { cache: "no-store" }),
      ]);

      const stateJson = await stateRes.json();
      const followupJson = await followupRes.json();

      setState(stateJson);
      setFollowups(followupJson);

if (selectedLead) {

  const activityRes =
    await fetch(
      `${API_URL}/api/activity/${selectedLead}`
    );

  const activityJson =
    await activityRes.json();

  setLeadActivity(
    activityJson.activity || []
  );
}

      setSelectedLead((current) => {
        if (current) return current;

        if (Object.keys(stateJson).length > 0) {
          return Object.keys(stateJson)[0];
        }

        return null;
      });
    } finally {
      setLoading(false);
    }
  }

async function importLead() {

  if (!newCompany.trim()) {
    alert("Company name required");
    return;
  }

  try {

    setImporting(true);

    const response = await fetch(
      `${API_URL}/api/leads/import`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          company: newCompany,
          email: newEmail,
          phone: newPhone,
          website: newWebsite,
        }),
      }
    );

    const result = await response.json();

    if (!result.ok) {
      alert(result.error || "Import failed");
      return;
    }

    setNewCompany("");
    setNewEmail("");
    setNewPhone("");
    setNewWebsite("");

    await loadData();

  } catch (err) {

    console.error(err);

    alert("Failed to import lead");

  } finally {

    setImporting(false);
  }
}

  useEffect(() => {
    loadData();

    const timer = setInterval(loadData, 5000);

    return () => clearInterval(timer);
  }, []);

  const leads = useMemo(() => {
    return Object.entries(state).map(([company, data]) => ({
      company,
      ...data,
    }));
  }, [state]);

  const selected = selectedLead ? state[selectedLead] : null;
const latestLeadName = leads[0]?.company || null;

  const metrics = useMemo(() => {
    return {
      total: leads.length,
      sent: leads.filter((lead) => lead.status === "sent").length,
      meetings: leads.filter((lead) => lead.pipelineStage === "meeting_requested").length,
      pricing: leads.filter((lead) => lead.pipelineStage === "pricing_requested").length,
      lost: leads.filter((lead) => lead.pipelineStage === "closed_lost").length,
      due: followups?.totalDue || 0,
    };
  }, [leads, followups]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#08090a] text-white">
<OperatorAtmosphere />
<SystemBoot />
<SignalAlert signal={latestLeadName} />
<SystemStatusBar />
<SystemToasts signal={latestLeadName} />
<AIAlerts />
<PredictiveSignals />
<OperatorPresence />
<ApprovalQueue />

<CommandPalette
  leads={leads}
  onSelectLead={(lead) => {
    setSelectedLead(lead.company);
    setDrawerOpen(true);
  }}
  onImportLead={() => {
    const el = document.querySelector("input[placeholder='Company']") as HTMLInputElement | null;
    el?.focus();
  }}
/>

<LeadDrawer
  open={drawerOpen}
  company={selectedLead}
  data={selected}
  activity={leadActivity}
  onClose={() => setDrawerOpen(false)}
/>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(0,210,255,0.22),transparent_28%),radial-gradient(circle_at_20%_80%,rgba(120,80,255,0.16),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_45%,rgba(0,0,0,0.75)_100%)]" />
      </div>

      <section className="relative grid min-h-screen pt-10 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_300px] gap-px bg-black/35 backdrop-blur-2xl/10">
        <aside className="bg-black/55 p-4 backdrop-blur-2xl lg:p-5">
          <div className="mb-10">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
              <p className="text-xs uppercase tracking-[0.38em] text-cyan-200">Live System</p>
            </div>

            <h1 className="text-3xl font-black uppercase leading-none tracking-[-0.08em]">
              Hermes
              <br />
              Control
            </h1>

            <p className="mt-4 max-w-[190px] text-xs leading-relaxed text-white/45">
              AI outbound operations layer for Liminull pipeline intelligence.
            </p>
          </div>

          <nav className="space-y-2 text-xs uppercase tracking-[0.18em] text-white/50">
            {["Pipeline", "Approvals", "Signals", "Followups", "Replies"].map((item, index) => (
              <button
                key={item}
                className={`group flex w-full items-center justify-between border px-3 py-3 text-left transition ${
                  index === 0
                    ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                    : "border-cyan-300/15 hover:border-cyan-300/30 hover:bg-black/35 backdrop-blur-2xl/5 hover:text-white"
                }`}
              >
                <span>{item}</span>
                <span className="text-white/25">0{index + 1}</span>
              </button>
            ))}
          </nav>

          <div className="mt-10 border border-cyan-300/15 bg-black/35 backdrop-blur-2xl/[0.03] p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-white/35">
<button
  onClick={async () => {
    await fetch("/api/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }}
  className="mb-4 w-full border border-red-300/30 bg-red-300/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-red-100 transition hover:bg-red-300 hover:text-white"
>
  Logout
</button>             

 Operator Feed
            </p>

            <div className="space-y-3 text-xs text-white/55">
              <p><span className="text-cyan-200">●</span> API linked on port 3002</p>
              <p><span className="text-cyan-200">●</span> State sync every 5s</p>
              <p><span className="text-cyan-200">●</span> Pipeline memory online</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 bg-black/40 p-6 text-white backdrop-blur-2xl">
          <div className="mb-6 flex items-start justify-between border-b border-cyan-300/12 pb-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.35em] text-white/45">
                Local AI Systems / Outbound Ops
              </p>
              <h2 className="max-w-4xl text-7xl font-black uppercase leading-[0.82] tracking-[-0.1em]">
                Pipeline
                <br />
                Without The
                <br />
                Circus.
              </h2>
            </div>

            <button
              onClick={loadData}
              className="border border-cyan-300/20 bg-black px-4 py-3 text-xs font-bold uppercase tracking-[0.22em] text-white transition hover:bg-cyan-300 hover:text-white"
            >
              Sync State
            </button>
          </div>

           <div className="mb-6">
            <ArtifactRuntime />

          <StrategyPanel />

          <PredictiveFeed />

          <OperatorPerformancePanel />

          <OperationalCorrelationsPanel />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["Leads", metrics.total],
              ["Sent", metrics.sent],
              ["Meetings", metrics.meetings],
              ["Pricing", metrics.pricing],
              ["Lost", metrics.lost],
              ["Due", metrics.due],
            ].map(([label, value]) => (
              <div key={label} className="border border-cyan-300/12 bg-black/35 backdrop-blur-2xl/45 p-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</p>
                <p className="mt-3 text-4xl font-black tracking-[-0.08em]">{value}</p>
              </div>
            ))}
          </div>

<div className="mb-6 border border-cyan-300/12 bg-black/35 backdrop-blur-2xl/60 p-4">

  <div className="mb-4">
    <p className="text-xs uppercase tracking-[0.25em] text-white/45">
      Manual Lead Import
    </p>
  </div>

  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

    <input
      value={newCompany}
      onChange={(e) => setNewCompany(e.target.value)}
      placeholder="Company"
      className="border border-cyan-300/12 bg-black/35 backdrop-blur-2xl px-3 py-3 text-sm outline-none"
    />

    <input
      value={newEmail}
      onChange={(e) => setNewEmail(e.target.value)}
      placeholder="Email"
      className="border border-cyan-300/12 bg-black/35 backdrop-blur-2xl px-3 py-3 text-sm outline-none"
    />

    <input
      value={newPhone}
      onChange={(e) => setNewPhone(e.target.value)}
      placeholder="Phone"
      className="border border-cyan-300/12 bg-black/35 backdrop-blur-2xl px-3 py-3 text-sm outline-none"
    />

    <input
      value={newWebsite}
      onChange={(e) => setNewWebsite(e.target.value)}
      placeholder="Website"
      className="border border-cyan-300/12 bg-black/35 backdrop-blur-2xl px-3 py-3 text-sm outline-none"
    />

  </div>

  <button
    onClick={importLead}
    disabled={importing}
    className="mt-4 border border-black bg-black px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-cyan-300 hover:text-white disabled:opacity-40"
  >
    {importing ? "Importing..." : "Import Lead"}
  </button>

</div>

          <PipelineBoard
            leads={leads}
            onSelect={(lead) => {
              setSelectedLead(lead.company);
              setDrawerOpen(true);
            }}
            onStageChange={loadData}
          />
        </section>

        <aside className="w-full bg-black/55 p-4 backdrop-blur-2xl lg:w-[300px]">
          <div className="mb-4 border border-cyan-300/25 bg-cyan-300/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">Leak Map</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/60">Live</p>
            </div>

            <div className="relative h-44 overflow-hidden border border-cyan-300/15 bg-black">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_45%,rgba(34,211,238,0.65),transparent_6%),radial-gradient(circle_at_40%_58%,rgba(168,85,247,0.55),transparent_7%),radial-gradient(circle_at_62%_62%,rgba(34,211,238,0.45),transparent_5%)]" />
              <div className="absolute bottom-3 left-3 right-3 flex gap-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2 flex-1 bg-cyan-300/70"
                    style={{ opacity: 0.2 + ((i % 6) + 1) / 8 }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4 border border-cyan-300/15 bg-black/35 backdrop-blur-2xl/[0.035]">
            <div className="border-b border-cyan-300/15 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                Operator View
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {[
                ["Signal", selectedLead || "No target"],
                ["Status", selected?.status || "unknown"],
                ["Stage", stageLabel(selected?.pipelineStage)],
                ["Reply", selected?.replyStatus || "none"],
                ["Followups", selected?.followupCount || 0],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[110px_1fr] px-4 py-3 text-xs">
                  <span className="uppercase tracking-[0.2em] text-white/35">{label}</span>
                  <span className={stageTone(selected?.pipelineStage)}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-cyan-300/15 bg-black/35 backdrop-blur-2xl/[0.035] p-4">
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-white/45">
              Latest Reply
            </p>

<div className="mt-4 border border-cyan-300/15 bg-black/35 backdrop-blur-2xl/[0.035] p-4">

  <p className="mb-4 text-xs uppercase tracking-[0.28em] text-white/45">
    Lead Intelligence
  </p>

  <div className="space-y-3 text-sm">

    <div>
      <div className="text-white/35 text-[10px] uppercase tracking-[0.18em] mb-1">
        Company
      </div>

      <div className="text-white font-bold">
        {selectedLead || "No lead selected"}
      </div>
    </div>

    <div>
      <div className="text-white/35 text-[10px] uppercase tracking-[0.18em] mb-1">
        Pipeline Stage
      </div>

      <div className="text-cyan-300 font-bold">
        {stageLabel(selected?.pipelineStage)}
      </div>
    </div>

    <div>
      <div className="text-white/35 text-[10px] uppercase tracking-[0.18em] mb-1">
        Reply Status
      </div>

      <div className="text-white/80">
        {selected?.replyStatus || "none"}
      </div>
    </div>

    <div>
      <div className="text-white/35 text-[10px] uppercase tracking-[0.18em] mb-1">
        Last Updated
      </div>

      <div className="text-white/60">
        {formatDate(selected?.updatedAt)}
      </div>
    </div>

    <div>
      <div className="text-white/35 text-[10px] uppercase tracking-[0.18em] mb-1">
        Followups
      </div>

      <div className="text-white/80">
        {selected?.followupCount || 0}
      </div>
    </div>

  </div>

</div>

            <p className="min-h-[120px] text-sm leading-relaxed text-white/70">
              {selected?.latestReply || "No reply intelligence captured yet."}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className={`border px-3 py-2 text-center text-[10px] uppercase tracking-[0.18em] ${statusTone(selected?.status)}`}>
                {selected?.status || "idle"}
              </div>
              <div className="border border-cyan-300/15 bg-black/35 backdrop-blur-2xl/5 px-3 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-white/55">
                {formatDate(selected?.updatedAt)}
              </div>
            </div>
          </div>

<div className="mt-4">

          <div className="mt-4 border border-cyan-300/15 bg-black/35 backdrop-blur-2xl/[0.035] p-4">
            <p className="mb-4 text-xs uppercase tracking-[0.28em] text-white/45">
              Lead Timeline
            </p>

            <div className="space-y-3 max-h-[260px] overflow-y-auto">
              {leadActivity.length === 0 ? (
                <p className="text-sm text-white/35">
                  No lead-specific activity yet.
                </p>
              ) : (
                leadActivity.map((event) => (
                  <div key={event.id} className="border border-cyan-300/15 bg-black/25 backdrop-blur-xl p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                      {event.type.replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-sm text-white/75">
                      {event.message}
                    </div>
                    <div className="mt-2 text-[10px] text-white/30">
                      {formatDate(event.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
  <ActivityFeed />
</div>        

</aside>
      </section>
    </main>
  );
}
