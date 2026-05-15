"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function NeuralDensityPanel() {
  const [density, setDensity] =
    useState<any>(null);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/neural-memory-density?business_id=liminull`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setDensity(data.density || null);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 12000);

    return () => clearInterval(timer);
  }, []);

  if (!density) {
    return (
      <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
        No neural density data.
      </div>
    );
  }

  const stats = [
    ["Strategies", density.strategies],
    ["Memories", density.memories],
    ["Correlations", density.correlations],
    ["Mutations", density.mutations],
  ];

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Neural Memory Density
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Intelligence Mass
        </div>
      </div>

      <div className="mb-4 border border-cyan-300/20 bg-cyan-300/10 p-4">
        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
          Neural Density
        </p>

        <h1 className="text-5xl font-black tracking-[-0.08em] text-cyan-100">
          {density.neural_density}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="border border-white/10 bg-black/25 p-3"
          >
            <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-white/35">
              {label}
            </p>

            <p className="text-2xl font-black tracking-[-0.05em] text-white">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
