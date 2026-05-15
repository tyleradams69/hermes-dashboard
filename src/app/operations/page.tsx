"use client";

import { useEffect, useMemo, useState } from "react";
import HermesAssistantPanel from "@/components/HermesAssistantPanel";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function OperationsPage() {
  const [overview, setOverview] =
    useState<any>(null);

  const [workerHealth, setWorkerHealth] =
    useState<any[]>([]);

  const [workerRecovery, setWorkerRecovery] =
    useState<any[]>([]);

  const [rollbackSnapshots, setRollbackSnapshots] =
    useState<any[]>([]);

  async function load() {
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

    const [healthRes, recoveryRes, rollbackRes] =
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
      ]);

    const [healthData, recoveryData, rollbackData] =
      await Promise.all([
        healthRes.json(),
        recoveryRes.json(),
        rollbackRes.json(),
      ]);

    setWorkerHealth(healthData.alerts || []);
    setWorkerRecovery(recoveryData.recoveries || []);
    setRollbackSnapshots(rollbackData.snapshots || []);
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
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
            Hermes Operations
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-[-0.08em]">
            Operational Command Center
          </h1>
        </div>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-6">
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
                <div key={index} className="border border-cyan-300/15 bg-cyan-300/10 p-4">
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
                <div key={job.id} className="border border-red-300/20 bg-red-300/10 p-4">
                  <p className="font-black">{job.job_type}</p>
                  <p className="mt-2 text-xs text-red-100/70">
                    {job.last_error || "No error recorded."}
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
      </div>
          <HermesAssistantPanel businessId="liminull" />
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
    <div className="border border-cyan-300/15 bg-cyan-300/10 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.06em]">
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
    <div className="border border-white/10 bg-white/[0.03] p-5">
      <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/40">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
