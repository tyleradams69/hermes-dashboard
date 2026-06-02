"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

const API_URL = "/api/hermes";

export default function BrainPage() {
  const [events, setEvents] = useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/brain-timeline?business_id=global`,
        {
          cache: "no-store",
          headers: {
            "x-hermes-role": "admin",
          },
        }
      );

      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const metrics = useMemo(() => {
    return {
      total: events.length,
      recoveries: events.filter((e) =>
        String(e.event_type).includes("recovery")
      ).length,
      systemChanges: events.filter((e) =>
        String(e.event_type).includes("system")
      ).length,
      intelligence: events.filter((e) =>
        String(e.event_type).includes("recommend")
      ).length,
    };
  }, [events]);

  const grouped = useMemo(() => {
    return {
      infrastructure: events.filter((e) =>
        String(e.event_type).includes("worker")
      ),

      safeguards: events.filter((e) =>
        String(e.event_type).includes("system")
      ),

      intelligence: events.filter((e) =>
        String(e.event_type).includes("recommend")
      ),
    };
  }, [events]);

  return (
    <AppShell
      active="intelligence"
      eyebrow="Liminull Intelligence"
      title="Intelligence Core"
      description="Live operational cognition, infrastructure awareness, recommendations, and system intelligence."
    >
      {/* LIVE METRICS */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Events", metrics.total],
          ["Recoveries", metrics.recoveries],
          ["System Changes", metrics.systemChanges],
          ["Intelligence Signals", metrics.intelligence],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="liminull-card p-5"
          >
            <p className="text-[11px] uppercase tracking-[0.22em] liminull-muted">
              {label}
            </p>

            <p className="mt-3 text-4xl font-black tracking-[-0.08em]">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* LIVE PULSE */}

      <div className="mt-6 rounded-2xl border border-cyan-300/10 bg-gradient-to-br from-cyan-300/[0.08] to-white/[0.02] p-5 shadow-[0_0_80px_rgba(103,232,249,0.06)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="liminull-eyebrow">
              Operational Pulse
            </p>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">
              Liminull is continuously monitoring infrastructure events,
              operational changes, worker activity, recommendations,
              and system safeguards in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-cyan-300 liminull-live-pulse" />
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">
              Active
            </p>
          </div>
        </div>
      </div>

      {/* VISUAL GRAPH AREA */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_.9fr]">
        <div className="liminull-card p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="liminull-eyebrow">
                Operational Activity
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.07em]">
                Intelligence Flow
              </h2>
            </div>

            <p className="text-xs text-white/30">
              Last 24 Hours
            </p>
          </div>

          <div className="mt-6 h-[220px] rounded-2xl border border-white/5 bg-black/30 p-4 sm:mt-8 sm:h-[260px] sm:p-6">
            <div className="flex h-full items-end gap-3">
              {Array.from({ length: 10 }).map((_, i) => {
                const bucketSize =
                  Math.ceil(events.length / 10) || 1;

                const bucketCount =
                  events.slice(i * bucketSize, (i + 1) * bucketSize).length;

                const maxCount =
                  Math.max(1, Math.ceil(events.length / 10));

                const v =
                  Math.max(12, Math.round((bucketCount / maxCount) * 100));

                return (
                <div
                  key={i}
                  className="relative flex-1 rounded-t-xl liminull-float bg-gradient-to-t from-cyan-300/10 via-cyan-300/50 to-cyan-200 transition-all duration-700"
                  style={{
                    height: `${v}%`,
                  }}
                  title={`${bucketCount} event(s)`}
                >
                  <div className="absolute inset-0 liminull-live-pulse rounded-t-xl bg-cyan-300/10" />
                </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* INTELLIGENCE CLUSTERS */}

        <div className="space-y-6">
          {[
            ["Infrastructure", grouped.infrastructure.length],
            ["Safeguards", grouped.safeguards.length],
            ["Recommendations", grouped.intelligence.length],
          ].map(([title, count]) => (
            <div
              key={String(title)}
              className="liminull-card p-5"
            >
              <p className="text-[10px] uppercase tracking-[0.25em] liminull-muted">
                {title}
              </p>

              <p className="mt-3 text-4xl font-black tracking-[-0.08em]">
                {count}
              </p>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-cyan-300"
                  style={{
                    width: `${Math.min(
                      Number(count) * 12,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* LIVE TOPOLOGY */}

      <div className="mt-8 rounded-3xl border border-white/5 bg-white/[0.025] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="liminull-eyebrow">
              Cognitive Topology
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.07em]">
              Operational Intelligence Map
            </h2>
          </div>

          <div className="w-fit rounded-full border border-cyan-300/10 bg-cyan-300/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-cyan-100">
            Operationally Synced
          </div>
        </div>

        <div className="relative mt-8 h-[420px] overflow-hidden rounded-3xl border border-white/5 bg-black/25">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(103,232,249,0.07),transparent_62%)]" />

          <svg
            className="absolute inset-0 h-full w-full opacity-70"
            viewBox="0 0 1000 380"
            preserveAspectRatio="none"
          >
            <path d="M500 190 C390 110 280 95 180 120" fill="none" stroke="rgba(103,232,249,.18)" strokeWidth="2" />
            <path d="M500 190 C610 110 730 95 835 120" fill="none" stroke="rgba(103,232,249,.18)" strokeWidth="2" />
            <path d="M500 190 C390 270 280 285 180 260" fill="none" stroke="rgba(103,232,249,.18)" strokeWidth="2" />
            <path d="M500 190 C610 270 730 285 835 260" fill="none" stroke="rgba(103,232,249,.18)" strokeWidth="2" />
          </svg>

          <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
          <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-cyan-300/10 shadow-[0_0_120px_rgba(103,232,249,0.16)] liminull-live-pulse">
            <div className="flex h-full flex-col items-center justify-center">
              <p className="text-[9px] uppercase tracking-[0.25em] text-cyan-300">
                Core
              </p>
              <p className="mt-1 text-lg font-black">
                Active
              </p>
            </div>
          </div>

          {[
            ["Workers", "left-[10%] top-[20%]", grouped.infrastructure.length],
            ["Notifications", "right-[10%] top-[20%]", metrics.intelligence],
            ["Executive Intel", "left-[10%] bottom-[20%]", metrics.systemChanges],
            ["Recommendations", "right-[10%] bottom-[20%]", grouped.intelligence.length],
          ].map(([label, pos, count], i) => (
            <div
              key={i}
              className={`absolute ${pos} w-[190px] rounded-2xl border border-white/5 bg-white/[0.045] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:bg-white/[0.06]`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.22em] liminull-muted">
                  Node
                </p>

                <span className="h-2 w-2 rounded-full bg-cyan-300" />
              </div>

              <p className="mt-3 text-sm font-black text-white">
                {label}
              </p>

              <p className="mt-1 text-xs liminull-muted">
                {count} signal(s)
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* TIMELINE */}

      <div className="mt-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="liminull-eyebrow">
              Intelligence Timeline
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.07em]">
              Primary Intelligence Feed
            </h2>
          </div>

          <p className="text-xs text-white/30">
            Auto-refreshing every 10s
          </p>
        </div>

        <div className="grid max-h-[720px] gap-4 overflow-y-auto liminull-scroll pr-2">
          {events.length === 0 && (
            <div className="liminull-card-soft p-6 liminull-muted">
              No intelligence events found yet.
            </div>
          )}

          {events.slice(0, 10).map((event) => (
            <div
              key={event.id}
              className="liminull-card p-5 transition hover:bg-white/[0.045]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-white">
                    {event.event_title || event.event_type}
                  </p>

                  <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">
                    {event.event_type}
                  </p>
                </div>

                <p className="text-xs text-white/30">
                  {event.created_at}
                </p>
              </div>

              <p className="mt-5 max-w-4xl text-sm leading-7 text-white/60">
                {event.event_summary || "No summary recorded."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
