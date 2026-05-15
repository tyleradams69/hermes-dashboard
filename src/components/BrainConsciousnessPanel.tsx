"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function BrainConsciousnessPanel() {
  const [data, setData] =
    useState<any>(null);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/brain-consciousness?business_id=liminull`,
        { cache: "no-store" }
      );

      const json = await res.json();

      setData(json.consciousness || null);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);

    return () => clearInterval(timer);
  }, []);

  if (!data) return null;

  return (
    <div className="border border-cyan-300/20 bg-cyan-300/10 p-4">
      <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-cyan-200">
        Consciousness Index
      </p>

      <div className="flex items-end justify-between gap-4">
        <h1 className="text-6xl font-black tracking-[-0.09em] text-cyan-100">
          {data.consciousness_index}%
        </h1>

        <div className="border border-cyan-300/20 bg-black/35 px-4 py-3 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          {data.consciousness_state}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Metric label="Brain State" value={data.brain_state} />
        <Metric label="Density" value={data.neural_density} />
        <Metric label="Heat" value={data.recent_activity_heat} />
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
    <div className="border border-white/10 bg-black/25 p-3">
      <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p className="text-lg font-black uppercase tracking-[-0.04em] text-white">
        {value}
      </p>
    </div>
  );
}
