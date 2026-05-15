"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

function formatValue(value: string) {
  const parsed = Number(value);

  if (!Number.isNaN(parsed)) {
    return parsed.toFixed(2);
  }

  return value || "—";
}

function delta(before: string, after: string) {
  const b = Number(before);
  const a = Number(after);

  if (Number.isNaN(b) || Number.isNaN(a)) {
    return "";
  }

  const change = a - b;

  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}`;
}

export default function BrainTimelinePanel() {
  const [events, setEvents] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/brain-timeline?business_id=liminull`,
        {
          cache: "no-store",
          headers: {
            "x-hermes-token":
              process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
            "x-hermes-role":
              "admin",
          },
        }
      );

      const data = await res.json();

      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 9000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Brain Timeline
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Evolution History
        </div>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
            No brain timeline events yet.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="border border-cyan-300/10 bg-black/20 p-4"
            >
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200">
                {event.event_type?.replaceAll("_", " ")}
              </p>

              <h2 className="text-lg font-black uppercase tracking-[-0.05em] text-white">
                {event.event_title?.replaceAll("_", " ")}
              </h2>

              <p className="mt-3 text-[13px] leading-6 text-white/65">
                {event.event_summary}
              </p>

              <div className="mt-5 border border-cyan-300/10 bg-black/25 p-4">
                <div className="flex items-center justify-between gap-4">

                  <div>
                    <p className="mb-2 text-[9px] uppercase tracking-[0.22em] text-white/30">
                      Before
                    </p>

                    <p className="text-3xl font-black tracking-[-0.06em] text-white/55">
                      {formatValue(event.before_value)}
                    </p>
                  </div>

                  <div className="text-2xl font-black text-cyan-200/70">
                    →
                  </div>

                  <div>
                    <p className="mb-2 text-[9px] uppercase tracking-[0.22em] text-cyan-200">
                      After
                    </p>

                    <p className="text-3xl font-black tracking-[-0.06em] text-cyan-100">
                      {formatValue(event.after_value)}
                    </p>
                  </div>

                  <div className="ml-auto border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-[13px] font-black tracking-[-0.04em] text-cyan-100">
                    {delta(event.before_value, event.after_value)}
                  </div>

                </div>
              </div>

              <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
                {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
