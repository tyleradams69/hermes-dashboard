"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import HermesAssistantPanel from "@/components/HermesAssistantPanel";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

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
    <div className="liminull-card-soft p-4 text-sm liminull-muted">
      {text}
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

  async function load() {
    try {
      const headers = {
        "x-hermes-token": process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
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
    } catch (err) {
      console.warn("Operations load failed", err);
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
    ["System Mode", stats.mode],
    ["Workers Online", stats.workersOnline],
    ["Pending Jobs", stats.pending],
    ["Completed Jobs", stats.completed],
    ["Failures", stats.failures],
    ["Dead Letters", stats.deadLetters],
  ];

  return (
    <AppShell
      active="dashboard"
      eyebrow="Liminull Dashboard"
      title={`${businessName} Dashboard`}
      description={`Operational intelligence, supervision, notifications, and live workflows for ${businessName}.`}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map(([label, value]) => (
          <div key={label} className="liminull-card-soft p-6">
            <p className="liminull-eyebrow">{label}</p>
            <p className="mt-3 text-3xl font-black tracking-[-0.08em]">
              {String(value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 liminull-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-300/10 bg-cyan-300/10 text-3xl font-black text-cyan-100 shadow-[0_0_60px_rgba(103,232,249,0.08)]">
              {businessName.charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="liminull-eyebrow">
                Active Workspace
              </p>

              <h2 className="mt-2 text-4xl font-black tracking-[-0.08em]">
                {businessName}
              </h2>

              <p className="mt-2 text-sm liminull-muted">
                Multi-tenant operational intelligence workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/10 px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                Environment
              </p>

              <p className="mt-2 text-sm font-black text-cyan-100">
                Production
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                Status
              </p>

              <div className="mt-2 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-cyan-300 liminull-live-pulse" />

                <p className="text-sm font-black text-cyan-100">
                  Operational
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>



      <div className="mt-6 liminull-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <p className="liminull-eyebrow">
              Executive Summary
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.07em]">
              Operational systems are stable and actively supervised.
            </h2>

            <p className="mt-4 text-sm leading-7 liminull-muted">
              Liminull is currently monitoring operational workflows,
              infrastructure health, notifications, executive intelligence,
              and automation safeguards in real time.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/10 px-5 py-4">
            <div className="h-3 w-3 rounded-full bg-cyan-300 liminull-live-pulse" />

            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                Status
              </p>

              <p className="mt-1 text-sm font-black text-cyan-100">
                Operationally Synced
              </p>
            </div>
          </div>
        </div>
      </div>


      <div className="mt-6 liminull-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="liminull-eyebrow">
              Operational Throughput
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.07em]">
              Live Activity
            </h2>
          </div>

          <p className="text-xs liminull-muted">
            Last 24 hours
          </p>
        </div>

        <div className="mt-8 h-[160px]">
          <div className="flex h-full items-end gap-3">
            {[
              stats.pending + 2,
              stats.completed + 4,
              stats.workersOnline + 3,
              stats.failures + 1,
              stats.deadLetters + 1,
              stats.completed + 6,
              stats.pending + 3,
              stats.completed + 5,
            ].map((v, i) => (
              <div
                key={i}
                className="relative flex-1 overflow-hidden rounded-t-2xl bg-gradient-to-t from-cyan-300/10 via-cyan-300/40 to-cyan-200 liminull-float"
                style={{
                  height: `${Math.max(14, v * 12)}%`,
                  animationDelay: `${i * 0.18}s`,
                }}
              >
                <div className="absolute inset-0 bg-cyan-300/10 liminull-live-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>


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
                          "x-hermes-token":
                            process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
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
