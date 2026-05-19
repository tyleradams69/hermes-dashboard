"use client";

import { useEffect, useState } from "react";

const API_URL = "/api/hermes";

export default function OperatorPerformancePanel() {
  const [stats, setStats] =
    useState<any>(null);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/operator-actions-summary?business_id=liminull`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setStats(data.summary || null);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);

    return () => clearInterval(timer);
  }, []);

  if (!stats) {
    return (
      <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
        No operator analytics yet.
      </div>
    );
  }

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Operator Performance
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Live Analytics
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Metric label="Actions" value={stats.total_actions} />
        <Metric label="Avg Response" value={`${stats.avg_response_seconds}s`} />
        <Metric label="Fast Responses" value={`${stats.fast_response_rate}%`} />
        <Metric label="Escalations Acked" value={stats.predictive_ack_count} />
      </div>

      <div className="mt-5 border border-cyan-300/20 bg-cyan-300/10 p-4">
        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
          Operational Insight
        </p>

        <p className="text-[13px] leading-6 text-white/75">
          {stats.operational_insight}
        </p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border border-white/10 bg-black/25 p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
        {label}
      </p>

      <h1 className="text-3xl font-black tracking-[-0.06em] text-white">
        {value}
      </h1>
    </div>
  );
}
