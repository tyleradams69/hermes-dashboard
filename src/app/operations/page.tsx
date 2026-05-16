"use client";

import { useEffect, useMemo, useState } from "react";
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
      <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-white/35">
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

export default function OperationsPage() {
  const [overview, setOverview] = useState<any>(null);
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
        fetch(`${API_URL}/api/operations-overview?business_id=liminull`, {
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
  }, []);

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
    ["Mode", stats.mode],
    ["Workers", stats.workersOnline],
    ["Pending", stats.pending],
    ["Completed", stats.completed],
    ["Failures", stats.failures],
    ["Dead Letters", stats.deadLetters],
  ];

  return (
    <AppShell
      active="dashboard"
      eyebrow="Liminull Dashboard"
      title="Operations Dashboard"
      description="A focused command center for workers, automations, notifications, executive briefings, and operational intelligence."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map(([label, value]) => (
          <div key={label} className="liminull-card-soft p-5">
            <p className="liminull-eyebrow">{label}</p>
            <p className="mt-3 text-3xl font-black tracking-[-0.08em]">
              {String(value)}
            </p>
          </div>
        ))}
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

        <Panel title="Workers">
          {(overview?.workers || []).length === 0 ? (
            <Empty text="No workers online." />
          ) : (
            <div className="space-y-3">
              {(overview?.workers || []).slice(0, 4).map((worker: any) => (
                <div key={worker.worker_name} className="liminull-card-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-black">{worker.worker_name}</p>
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
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification: any) => (
                <div key={notification.id} className="liminull-card-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-black">{notification.title}</p>
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
            <div className="space-y-3">
              {(overview?.queue || []).slice(0, 4).map((job: any) => (
                <div key={job.id} className="liminull-card-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-black">{job.job_type}</p>
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
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2">
              {(overview?.audits || []).slice(0, 5).map((audit: any) => (
                <div key={audit.id} className="liminull-card-soft p-4">
                  <p className="font-black">{audit.action_type}</p>
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
            <div className="space-y-3">
              {proactiveRecommendations.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="liminull-card-soft p-4">
                  <p className="font-black">{item.title}</p>
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
            <div className="space-y-3">
              {workerRecovery.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="liminull-card-soft p-4">
                  <p className="font-black">{item.recovery_type}</p>
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
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2">
              {rollbackSnapshots.slice(0, 5).map((snapshot: any) => (
                <div key={snapshot.id} className="liminull-card-soft p-4">
                  <p className="font-black">{snapshot.snapshot_type}</p>
                  <p className="mt-2 text-xs liminull-muted">
                    Target: {snapshot.target_id}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <HermesAssistantPanel businessId="liminull" />
    </AppShell>
  );
}
