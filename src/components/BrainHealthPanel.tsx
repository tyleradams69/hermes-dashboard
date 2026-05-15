"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function BrainHealthPanel() {
  const [health, setHealth] =
    useState<any>(null);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/brain-health?business_id=liminull`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setHealth(data.health || null);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);

    return () => clearInterval(timer);
  }, []);

  if (!health) {
    return (
      <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
        No brain health data.
      </div>
    );
  }

  const vitals = [
    ["Learning Velocity", health.learning_velocity],
    ["Strategy Confidence", `${health.strategy_confidence}%`],
    ["Correlation Confidence", `${health.correlation_confidence}%`],
    ["Optimization Avg", health.optimization_weight_avg],
    ["Operator Latency", `${health.operator_response_latency}s`],
    ["Memory Depth", health.memory_depth],
    ["Evolution Events", health.evolution_events],
  ];

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Brain Health
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Vital Signs
        </div>
      </div>

      <div className="mb-4 border border-cyan-300/20 bg-cyan-300/10 p-4">
        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
          Brain Health Score
        </p>

        <div className="flex items-end justify-between gap-4">
          <h1 className="text-5xl font-black tracking-[-0.08em] text-cyan-100">
            {health.brain_health_score}%
          </h1>

          <div className="border border-cyan-300/20 bg-black/30 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
            {health.brain_state}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {vitals.map(([label, value]) => (
          <div
            key={label}
            className="border border-white/10 bg-black/25 p-3"
          >
            <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-white/35">
              {label}
            </p>

            <p className="text-2xl font-black tracking-[-0.06em] text-white">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
