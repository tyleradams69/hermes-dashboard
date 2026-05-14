"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function LeadMemoryPanel({
  company,
}: {
  company: string | null;
}) {
  const [memory, setMemory] =
    useState<any>(null);

  async function load() {
    if (!company) return;

    try {
      const res = await fetch(
        `${API_URL}/api/lead/${encodeURIComponent(company)}/memory`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      setMemory(data.memory || null);

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, [company]);

  if (!memory) {
    return (
      <div className="mt-8 border border-white/10 bg-black/20 p-5">
        <p className="text-sm text-white/35">
          No operational memory yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border border-cyan-300/20 bg-cyan-300/5 p-5 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Operational Memory
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          {memory.relationship_status}
        </div>
      </div>

      <div className="space-y-4">

        <div className="border border-white/10 bg-black/20 p-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
            Summary
          </p>

          <p className="text-sm leading-7 text-white/70">
            {memory.summary}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">

          <div className="border border-white/10 bg-black/20 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
              Intent
            </p>

            <p className="text-sm uppercase text-cyan-100">
              {memory.current_intent}
            </p>
          </div>

          <div className="border border-white/10 bg-black/20 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
              Risk Level
            </p>

            <p className="text-sm uppercase text-cyan-100">
              {memory.risk_level}
            </p>
          </div>

        </div>

        <div className="border border-white/10 bg-black/20 p-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
            Objections
          </p>

          <p className="text-sm leading-7 text-white/70">
            {memory.objections || "None detected"}
          </p>
        </div>

        <div className="border border-white/10 bg-black/20 p-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
            Opportunity Notes
          </p>

          <p className="text-sm leading-7 text-white/70">
            {memory.opportunity_notes}
          </p>
        </div>

        <div className="border border-cyan-300/20 bg-cyan-300/10 p-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
            Recommended Next Action
          </p>

          <p className="text-lg font-black uppercase tracking-[-0.04em] text-cyan-100">
            {memory.recommended_next_action}
          </p>
        </div>

      </div>
    </div>
  );
}
