"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function BrainEvolutionFeed() {
  const [events, setEvents] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/activity?business_id=liminull`,
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

      const relevant =
        (data.activity || []).filter((item: any) =>
          [
            "strategy_memory_updated",
            "workflow_outcome_recorded",
            "predictive_signal_acknowledged",
            "operator_action_recorded",
            "predictive_signal_acknowledged",
          ].includes(item.type)
        );

      setEvents(relevant.slice(0, 5));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 7000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Brain Evolution Feed
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Live Evolution
        </div>
      </div>

      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
            No brain evolution events yet.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="border border-cyan-300/10 bg-black/20 p-3"
            >
              <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200">
                {event.type?.replaceAll("_", " ")}
              </p>

              <p className="line-clamp-2 text-[12px] leading-5 text-white/65">
                {event.message}
              </p>

              <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
                {event.company}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
