"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import HermesAssistantPanel from "@/components/HermesAssistantPanel";

const API_URL = "/api/hermes";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="liminull-card p-5">
      <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">
        {title}
      </p>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-black/[0.09] bg-gradient-to-br from-white to-[#f5f5f7] p-5 text-sm text-[#6e6e73]">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0071e3] shadow-sm ring-1 ring-black/[0.05]">
          —
        </span>
        <div>
          <p className="font-medium text-[#1d1d1f]">Clear for now</p>
          <p className="mt-0.5 text-xs text-[#86868b]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function OperationsContent() {

  const searchParams =
    useSearchParams();

  const businessId =
    searchParams.get("business_id") ||
    "liminull";

  const [overview, setOverview] = useState<any>(null);

  const [businessName, setBusinessName] =
    useState("Liminull");
  const [workerHealth, setWorkerHealth] = useState<any[]>([]);
  const [workerRecovery, setWorkerRecovery] = useState<any[]>([]);
  const [rollbackSnapshots, setRollbackSnapshots] = useState<any[]>([]);
  const [proactiveRecommendations, setProactiveRecommendations] = useState<any[]>([]);
  const [executiveBriefings, setExecutiveBriefings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");

  async function load() {
    try {
      const headers = {
        "x-hermes-role": "admin",
      };

      const [
        overviewRes,
        healthRes,
        recoveryRes,
        rollbackRes,
        proactiveRes,
        briefingRes,
        notificationRes,
      ] = await Promise.all([
        fetch(`${API_URL}/api/operations-overview?business_id=${businessId}`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/worker-health`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/worker-recovery`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/rollback-snapshots?business_id=${businessId}`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/proactive-recommendations?business_id=${businessId}`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/executive-briefings?business_id=${businessId}`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/notifications?business_id=${businessId}`, {
          cache: "no-store",
          headers,
        }),
      ]);

      const [
        overviewData,
        healthData,
        recoveryData,
        rollbackData,
        proactiveData,
        briefingData,
        notificationData,
      ] = await Promise.all([
        overviewRes.json(),
        healthRes.json(),
        recoveryRes.json(),
        rollbackRes.json(),
        proactiveRes.json(),
        briefingRes.json(),
        notificationRes.json(),
      ]);

      setOverview(overviewData.overview || null);

      setBusinessName(
        overviewData?.overview?.business?.name ||
        businessId
      );
      setWorkerHealth(healthData.alerts || []);
      setWorkerRecovery(recoveryData.recoveries || []);
      setRollbackSnapshots(rollbackData.snapshots || []);
      setProactiveRecommendations(proactiveData.recommendations || []);
      setExecutiveBriefings(briefingData.briefings || []);
      setNotifications(notificationData.notifications || []);
      setLoadError("");
    } catch (err) {
      console.warn("Operations load failed", err);
      setLoadError("Live dashboard data could not load. Check the API connection or try again in a moment.");
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [businessId]);

  const stats = useMemo(() => {
    const queue = overview?.queue || [];
    const workers = overview?.workers || [];
    const failures = overview?.failures || [];
    const deadLetters = overview?.deadLetters || [];

    return {
      mode: overview?.mode?.mode || "unknown",
      workersOnline: workers.filter((w: any) => w.status === "online").length,
      pending: queue.filter((j: any) => j.status === "pending").length,
      completed: queue.filter((j: any) => j.status === "completed").length,
      failures: failures.length,
      deadLetters: deadLetters.length,
    };
  }, [overview]);

  const statCards = [
    { label: "Mode", value: stats.mode, detail: "Runtime posture", tone: "blue" },
    { label: "Workers", value: stats.workersOnline, detail: "Online now", tone: "green" },
    { label: "Queue", value: stats.pending, detail: "Pending jobs", tone: "amber" },
    { label: "Completed", value: stats.completed, detail: "Closed jobs", tone: "blue" },
    { label: "Failures", value: stats.failures, detail: "Needs review", tone: "red" },
    { label: "Dead letters", value: stats.deadLetters, detail: "Quarantined", tone: "slate" },
  ];

  const activityBars = [
    stats.pending + 2,
    stats.completed + 4,
    stats.workersOnline + 3,
    stats.failures + 1,
    stats.deadLetters + 1,
    stats.completed + 6,
    stats.pending + 3,
    stats.completed + 5,
    stats.workersOnline + stats.pending + 4,
    stats.completed + stats.failures + 3,
  ];

  const systemLoad = Math.min(
    96,
    Math.max(24, stats.pending * 10 + stats.failures * 14 + stats.deadLetters * 12 + 38)
  );

  return (
    <AppShell
      active="dashboard"
      eyebrow="Liminull Dashboard"
      title={`${businessName} Dashboard`}
      description={`Operational intelligence, supervision, notifications, and live workflows for ${businessName}.`}
      businessId={businessId}
    >
      {loadError && (
        <div className="liminull-card-soft border-red-300/20 bg-red-500/10 p-5 text-sm text-red-100">
          <p className="font-black">Dashboard data unavailable</p>
          <p className="mt-2 text-red-100/70">{loadError}</p>
          <button onClick={load} className="liminull-button mt-4">Retry now</button>
        </div>
      )}

      {!loadError && !overview && (
        <div className="liminull-card-soft p-5 text-sm text-white/60">
          Waiting for first pilot signal. Once activity lands for this client, the live operations panels will populate here.
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="liminull-operational-abstract relative overflow-hidden rounded-[34px] border border-black/[0.06] bg-white p-4 shadow-[0_28px_90px_rgba(0,0,0,0.08)] sm:p-5">
          <div className="liminull-operational-glow liminull-operational-glow-blue" />
          <div className="liminull-operational-glow liminull-operational-glow-green" />

          <div className="liminull-command-rail mb-4">
            <div>
              <span>LIVE COMMAND LAYER</span>
              <strong>{businessName}</strong>
            </div>
            <div>
              <span>QUEUE</span>
              <strong>{stats.pending}</strong>
            </div>
            <div>
              <span>WORKERS</span>
              <strong>{stats.workersOnline}</strong>
            </div>
            <div>
              <span>RISK</span>
              <strong>{stats.failures + stats.deadLetters}</strong>
            </div>
          </div>

          <div className="relative flex flex-wrap items-start justify-between gap-4 sm:gap-6">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="liminull-fragment-label">memory mesh</span>
                <span className="liminull-fragment-label">queue pressure</span>
                <span className="liminull-fragment-label">rollback vectors</span>
              </div>
              <h2 className="mt-4 text-[clamp(2rem,9vw,2.75rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[#1d1d1f] sm:text-5xl sm:leading-none">
                {businessName} is being actively supervised.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#6e6e73]">
                A cleaner operating picture for queues, worker health, failures,
                recovery paths, executive briefings, and automation safeguards.
              </p>
            </div>

            <div className="w-full rounded-[26px] bg-[#f5f5f7] p-4 ring-1 ring-black/[0.05] sm:w-[260px]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#6e6e73]">System pressure</p>
                <p className="text-sm font-semibold text-[#1d1d1f]">{systemLoad}%</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#34c759] via-[#0071e3] to-[#5856d6]"
                  style={{ width: `${systemLoad}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                  <p className="text-xs text-[#86868b]">Workers</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    {stats.workersOnline}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/[0.04]">
                  <p className="text-xs text-[#86868b]">Open risk</p>
                  <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    {stats.failures + stats.deadLetters}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[22px] border border-black/[0.05] bg-[#fbfbfd]/85 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[#6e6e73]">{card.label}</p>
                  <span className="h-2 w-2 rounded-full bg-[#0071e3]" />
                </div>
                <p className="mt-3 truncate text-3xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                  {String(card.value)}
                </p>
                <p className="mt-1 text-xs text-[#86868b]">{card.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="liminull-card p-6">
            <p className="liminull-eyebrow">Executive Summary</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[#1d1d1f]">
              Stable, monitored, ready to intervene.
            </h2>
            <p className="mt-3 text-sm leading-6 liminull-muted">
              Liminull is watching workflow throughput, worker health,
              notifications, recovery recommendations, and rollback safety.
            </p>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#eaf8ee] px-4 py-3 text-sm font-semibold text-[#248a3d]">
              <span className="h-2 w-2 rounded-full bg-[#248a3d] liminull-live-pulse" />
              Operationally synced
            </div>
          </div>

          <div className="liminull-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="liminull-eyebrow">Active Workspace</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                  {businessName}
                </h2>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1d1d1f] text-xl font-semibold text-white shadow-lg">
                {businessName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-[#f5f5f7] px-4 py-3">
                <span className="text-sm text-[#6e6e73]">Environment</span>
                <span className="text-sm font-semibold text-[#1d1d1f]">Production</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f5f5f7] px-4 py-3">
                <span className="text-sm text-[#6e6e73]">Status</span>
                <span className="text-sm font-semibold text-[#248a3d]">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="liminull-card p-6">
          <p className="liminull-eyebrow">Operational Throughput</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">
            Live activity curve
          </h2>
          <p className="mt-2 text-sm liminull-muted">Last 24 hours, weighted by queue and completion flow.</p>

          <div className="mt-8 h-[210px] rounded-[24px] bg-gradient-to-b from-[#f5f5f7] to-white p-5 ring-1 ring-black/[0.05]">
            <div className="flex h-full items-end gap-2.5">
              {activityBars.map((v, i) => (
                <div
                  key={i}
                  className="relative flex-1 overflow-hidden rounded-t-2xl bg-gradient-to-t from-[#0071e3]/25 via-[#0071e3]/55 to-[#0071e3] shadow-[0_10px_24px_rgba(0,113,227,0.18)]"
                  style={{ height: `${Math.min(100, Math.max(18, v * 11))}%` }}
                >
                  <div className="absolute inset-x-0 top-0 h-8 bg-white/25" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="liminull-dark-card relative overflow-hidden rounded-[30px] bg-[#1d1d1f] p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.14)]">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#0071e3]/35 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-[#34c759]/20 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-medium text-white/55">Priority Intelligence</p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-white">
              Keep the operator focused on what changed, what broke, and what to approve next.
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Alerts", notifications.length, "Notifications waiting"],
                ["Briefings", executiveBriefings.length, "Executive summaries"],
                ["Recoveries", workerRecovery.length, "Suggested repairs"],
              ].map(([label, value, detail]) => (
                <div key={String(label)} className="rounded-2xl bg-white/[0.09] p-4 ring-1 ring-white/10">
                  <p className="text-xs text-white/50">{label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
                  <p className="mt-1 text-xs text-white/45">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <Panel title="System Mode">
          <h2 className="text-3xl font-black uppercase text-cyan-100">
            {overview?.mode?.mode || "unknown"}
          </h2>
          <p className="mt-3 text-sm liminull-muted">
            {overview?.mode?.reason || "No mode reason available."}
          </p>
        </Panel>

        <Panel title="Workers Online">
          {(overview?.workers || []).length === 0 ? (
            <Empty text="No workers online." />
          ) : (
            <div className="space-y-4">
              {(overview?.workers || []).slice(0, 4).map((worker: any) => (
                <div key={worker.worker_name} className="liminull-card-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-black tracking-[-0.03em]">{worker.worker_name}</p>
                    <span className="text-xs uppercase text-cyan-200">
                      {worker.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs liminull-muted">
                    Last heartbeat: {worker.last_heartbeat}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Notifications">
          {notifications.length === 0 ? (
            <Empty text="No active notifications." />
          ) : (
            <div className="space-y-4">
              {notifications.slice(0, 5).map((notification: any) => (
                <div key={notification.id} className="liminull-card-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-black tracking-[-0.03em]">{notification.title}</p>
                    <span className="text-xs uppercase text-cyan-200">
                      {notification.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm liminull-muted">
                    {notification.message}
                  </p>
                  <button
                    onClick={async () => {
                      await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
                        method: "POST",
                        headers: {
                          "x-hermes-role": "admin",
                        },
                      });
                      load();
                    }}
                    className="liminull-button mt-4"
                  >
                    Mark Read
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Executive Intelligence">
          {executiveBriefings.length === 0 ? (
            <Empty text="No executive briefings generated." />
          ) : (
            executiveBriefings.slice(0, 1).map((briefing: any) => (
              <div key={briefing.id} className="liminull-card-soft p-4">
                <p className="text-lg font-black">{briefing.title}</p>
                <p className="mt-3 text-sm leading-6 liminull-muted">
                  {briefing.summary}
                </p>
              </div>
            ))
          )}
        </Panel>

        <Panel title="Queue">
          {(overview?.queue || []).length === 0 ? (
            <Empty text="No queue jobs." />
          ) : (
            <div className="space-y-4">
              {(overview?.queue || []).slice(0, 4).map((job: any) => (
                <div key={job.id} className="liminull-card-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-black tracking-[-0.03em]">{job.job_type}</p>
                    <span className="text-xs uppercase text-cyan-200">
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs liminull-muted">
                    Attempts: {job.attempts}/{job.max_attempts}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Audit Feed">
          {(overview?.audits || []).length === 0 ? (
            <Empty text="No audit events." />
          ) : (
            <div className="max-h-[360px] space-y-3 overflow-y-auto liminull-scroll pr-2">
              {(overview?.audits || []).slice(0, 5).map((audit: any) => (
                <div key={audit.id} className="liminull-card-soft p-4">
                  <p className="text-[15px] font-black tracking-[-0.03em]">{audit.action_type}</p>
                  <p className="mt-2 text-xs liminull-muted">
                    Actor: {audit.actor_role}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Proactive Intelligence">
          {proactiveRecommendations.length === 0 ? (
            <Empty text="No proactive recommendations." />
          ) : (
            <div className="space-y-4">
              {proactiveRecommendations.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="liminull-card-soft p-4">
                  <p className="text-[15px] font-black tracking-[-0.03em]">{item.title}</p>
                  <p className="mt-2 text-sm liminull-muted">
                    {item.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recovery">
          {workerRecovery.length === 0 ? (
            <Empty text="No recovery recommendations." />
          ) : (
            <div className="space-y-4">
              {workerRecovery.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="liminull-card-soft p-4">
                  <p className="text-[15px] font-black tracking-[-0.03em]">{item.recovery_type}</p>
                  <p className="mt-2 text-sm liminull-muted">
                    {item.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Rollback Snapshots">
          {rollbackSnapshots.length === 0 ? (
            <Empty text="No rollback snapshots." />
          ) : (
            <div className="max-h-[360px] space-y-3 overflow-y-auto liminull-scroll pr-2">
              {rollbackSnapshots.slice(0, 5).map((snapshot: any) => (
                <div key={snapshot.id} className="liminull-card-soft p-4">
                  <p className="text-[15px] font-black tracking-[-0.03em]">{snapshot.snapshot_type}</p>
                  <p className="mt-2 text-xs liminull-muted">
                    Target: {snapshot.target_id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      
        <div className="xl:col-span-2">
          <HermesAssistantPanel businessId={businessId} />
        </div>

    </AppShell>
  );
}

export default function OperationsPage() {
  return (
    <Suspense fallback={null}>
      <OperationsContent />
    </Suspense>
  );
}
