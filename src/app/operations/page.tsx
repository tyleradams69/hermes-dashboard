"use client";

import { useEffect, useMemo, useState } from "react";
import HermesAssistantPanel from "@/components/HermesAssistantPanel";
import LogoutButton from "@/components/LogoutButton";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function DashboardPage() {
  const [overview, setOverview] =
    useState<any>(null);

  const [workerHealth, setWorkerHealth] =
    useState<any[]>([]);

  const [workerRecovery, setWorkerRecovery] =
    useState<any[]>([]);

  const [rollbackSnapshots, setRollbackSnapshots] =
    useState<any[]>([]);

  const [proactiveRecommendations, setProactiveRecommendations] =
    useState<any[]>([]);

  const [executiveBriefings, setExecutiveBriefings] =
    useState<any[]>([]);

  const [notifications, setNotifications] =
    useState<any[]>([]);

  async function load() {
    try {
    const res = await fetch(
      `${API_URL}/api/operations-overview?business_id=liminull`,
      {
        cache: "no-store",
        headers: {
          "x-hermes-token":
            process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
          "x-hermes-role": "admin",
        },
      }
    );

    const data = await res.json();
    setOverview(data.overview || null);

    const headers = {
      "x-hermes-token":
        process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
      "x-hermes-role": "admin",
    };

    const [healthRes, recoveryRes, rollbackRes, proactiveRes, briefingRes, notificationRes] =
      await Promise.all([
        fetch(`${API_URL}/api/worker-health`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/worker-recovery`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/rollback-snapshots?business_id=liminull`, {
          cache: "no-store",
          headers,
        }),

        fetch(`${API_URL}/api/proactive-recommendations?business_id=liminull`, {
          cache: "no-store",
          headers,
        }),

        fetch(`${API_URL}/api/executive-briefings?business_id=demo-law-firm`, {
          cache: "no-store",
          headers,
        }),

        fetch(`${API_URL}/api/notifications?business_id=demo-law-firm`, {
          cache: "no-store",
          headers,
        }),
      ]);

    const [healthData, recoveryData, rollbackData, proactiveData, briefingData, notificationData] =
      await Promise.all([
        healthRes.json(),
        recoveryRes.json(),
        rollbackRes.json(),
        proactiveRes.json(),
        briefingRes.json(),
        notificationRes.json(),
      ]);

    setWorkerHealth(healthData.alerts || []);
    setWorkerRecovery(recoveryData.recoveries || []);
    setRollbackSnapshots(rollbackData.snapshots || []);
    setProactiveRecommendations(proactiveData?.recommendations || []);
    setExecutiveBriefings(briefingData?.briefings || []);
    setNotifications(notificationData?.notifications || []);
    } catch (err) {
      console.warn("Operations dashboard load failed", err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);

    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const queue = overview?.queue || [];
    const workers = overview?.workers || [];
    const failures = overview?.failures || [];
    const deadLetters = overview?.deadLetters || [];

    return {
      pending: queue.filter((j: any) => j.status === "pending").length,
      completed: queue.filter((j: any) => j.status === "completed").length,
      failed: queue.filter((j: any) => j.status === "failed").length,
      workersOnline: workers.filter((w: any) => w.status === "online").length,
      failures: failures.length,
      deadLetters: deadLetters.length,
    };
  }, [overview]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex min-h-screen">


        <aside className="hidden w-[260px] border-r border-white/5 bg-[#0f0f10] p-6 lg:flex lg:flex-col">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300/80">
              LIMINULL
            </p>

            <h1 className="mt-3 text-2xl font-black tracking-[-0.08em] text-white">
              Operations
            </h1>

            <p className="mt-2 text-xs leading-5 text-white/35">
              Operational intelligence for active business workflows.
            </p>
          </div>

          <nav className="mt-8 space-y-3">
            <a href="/operations" className="block rounded-xl border border-cyan-300/10 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15">
              Dashboard
            </a>

            <a href="/businesses" className="block rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white">
              Clients
            </a>

            <a href="/brain" className="block rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white">
              Intelligence
            </a>
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
                Workspace
              </p>
              <p className="mt-2 text-sm font-semibold text-white/80">
                Liminull
              </p>
              <p className="mt-1 text-xs text-white/35">
                Production monitor
              </p>
            </div>

            <LogoutButton />
          </div>
        </aside>

        <section className="flex-1 p-6 lg:p-10">

        

        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
            Operations Dashboard
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.08em]">
            Operations Dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
            Today’s operational command center for workers, automations, notifications, executive briefings, and Liminull intelligence.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          <Stat label="Mode" value={overview?.mode?.mode || "unknown"} />
          <Stat label="Workers" value={stats.workersOnline} />
          <Stat label="Pending" value={stats.pending} />
          <Stat label="Completed" value={stats.completed} />
          <Stat label="Failures" value={stats.failures} />
          <Stat label="Dead Letters" value={stats.deadLetters} />
        </section>

        {overview?.mode?.mode !== "normal" && (
          <section className="border border-yellow-300/30 bg-yellow-300/10 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-200">
              System Safeguard Active
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-yellow-100">
              {overview?.mode?.mode}
            </h2>
            <p className="mt-2 text-sm text-yellow-100/70">
              {overview?.mode?.reason}
            </p>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="System Mode">
            <p className="text-3xl font-black uppercase tracking-[-0.06em] text-cyan-100">
              {overview?.mode?.mode || "unknown"}
            </p>
            <p className="mt-3 text-sm leading-6 text-white/60">
              {overview?.mode?.reason || "No mode reason available."}
            </p>
          </Panel>

          <Panel title="Workers">
            {(overview?.workers || []).map((worker: any) => (
              <div key={worker.id} className="border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-black">{worker.worker_name}</p>
                  <span className="text-xs uppercase text-cyan-200">
                    {worker.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/45">
                  Processed jobs: {worker.processed_jobs}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  Last heartbeat: {worker.last_heartbeat}
                </p>
              </div>
            ))}
          </Panel>

          <Panel title="Queue">
            {(overview?.queue || []).slice(0, 8).map((job: any) => (
              <div key={job.id} className="border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-black">{job.job_type}</p>
                  <span className="text-xs uppercase text-cyan-200">
                    {job.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/45">
                  Attempts: {job.attempts}/{job.max_attempts}
                </p>
              </div>
            ))}
          </Panel>

          <Panel title="Audit Feed">
            {(overview?.audits || []).slice(0, 8).map((audit: any) => (
              <div key={audit.id} className="border border-white/10 bg-black/30 p-4">
                <p className="font-black">{audit.action_type}</p>
                <p className="mt-2 text-xs text-white/45">
                  Actor: {audit.actor_role}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  Target: {audit.target_type}
                </p>
              </div>
            ))}
          </Panel>

          <Panel title="Worker Alerts">
            {workerHealth.length === 0 ? (
              <Empty text="No worker alerts." />
            ) : (
              workerHealth.map((alert: any, index: number) => (
                <div key={index} className="border border-yellow-300/20 bg-yellow-300/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-black">{alert.alert_type}</p>
                    <span className="text-xs uppercase text-yellow-200">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-yellow-100/70">
                    {alert.observation}
                  </p>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Recovery Recommendations">
            {workerRecovery.length === 0 ? (
              <Empty text="No recovery recommendations." />
            ) : (
              workerRecovery.map((item: any, index: number) => (
                <div key={index} className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
                  <p className="font-black">{item.recovery_type}</p>
                  <p className="mt-2 text-xs text-cyan-100/70">
                    {item.recommendation}
                  </p>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Dead Letters">
            {(overview?.deadLetters || []).length === 0 ? (
              <Empty text="No dead-letter jobs." />
            ) : (
              (overview?.deadLetters || []).slice(0, 8).map((job: any) => (
                <div key={job.id} className="rounded-2xl border border-red-400/10 bg-red-400/5 p-4">
                  <p className="font-black">{job.job_type}</p>

                  <p className="mt-2 text-xs text-red-100/70">
                    {job.last_error || "No error recorded."}
                  </p>

                  <button
                    onClick={async () => {
                      await fetch(
                        `${API_URL}/api/dead-letter-jobs/${job.id}/retry`,
                        {
                          method: "POST",

                          headers: {
                            "x-hermes-token":
                              process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",

                            "x-hermes-role":
                              "admin",
                          },
                        }
                      );

                      load();
                    }}
                    className="mt-4 border border-red-300/30 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-red-100 transition hover:bg-red-300 hover:text-black"
                  >
                    Retry Job
                  </button>
                </div>
              ))
            )}
          </Panel>



          <Panel title="Notifications">
            {notifications.length === 0 ? (
              <Empty text="No notifications." />
            ) : (
              notifications.slice(0, 10).map((notification: any) => (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.025] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-black">
                      {notification.title}
                    </p>

                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                      {notification.priority}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {notification.message}
                  </p>

                  <button
                    onClick={async () => {
                      await fetch(
                        `${API_URL}/api/notifications/${notification.id}/read`,
                        {
                          method: "POST",

                          headers: {
                            "x-hermes-token":
                              process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",

                            "x-hermes-role":
                              "admin",
                          },
                        }
                      );

                      load();
                    }}
                    className="mt-4 border border-cyan-300/20 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
                  >
                    Mark Read
                  </button>
                </div>
              ))
            )}
          </Panel>


          <Panel title="Executive Intelligence">
            {executiveBriefings.length === 0 ? (
              <Empty text="No executive briefings generated." />
            ) : (
              executiveBriefings.slice(0, 3).map((briefing: any) => (
                <div
                  key={briefing.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.025] p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black">
                      {briefing.title}
                    </p>

                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                      {briefing.briefing_type}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-white/70">
                    {briefing.summary}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {Object.entries(briefing.metrics || {}).map(
                      ([key, value]: any) => (
                        <div
                          key={key}
                          className="border border-white/10 bg-black/20 p-3"
                        >
                          <p className="text-[10px] uppercase tracking-[0.15em] text-white/35">
                            {key.replaceAll("_", " ")}
                          </p>

                          <p className="mt-2 text-xl font-black">
                            {String(value)}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </Panel>


          <Panel title="Proactive Intelligence">
            {proactiveRecommendations.length === 0 ? (
              <Empty text="No proactive recommendations." />
            ) : (
              proactiveRecommendations.map((item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/5 bg-white/[0.025] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-black">{item.title}</p>

                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                      {item.priority}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {item.recommendation}
                  </p>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Rollback Snapshots">
            {rollbackSnapshots.length === 0 ? (
              <Empty text="No rollback snapshots." />
            ) : (
              rollbackSnapshots.slice(0, 8).map((snapshot: any) => (
                <div key={snapshot.id} className="border border-white/10 bg-black/30 p-4">
                  <p className="font-black">{snapshot.snapshot_type}</p>
                  <p className="mt-2 text-xs text-white/45">
                    Target: {snapshot.target_id}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Created by: {snapshot.created_by_role}
                  </p>
                </div>
              ))
            )}
          </Panel>
        </section>
          <HermesAssistantPanel businessId="liminull" />
        </section>
      </div>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-4 text-sm text-white/35">
      {text}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-[-0.06em]">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-5">
      <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-white/35">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
