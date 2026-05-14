"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function RuntimeWeightsPanel() {
  const [weights, setWeights] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/runtime-weights?business_id=liminull`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setWeights(data.weights || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Runtime Optimization Weights
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Adaptive
        </div>
      </div>

      <div className="space-y-3">
        {weights.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
            No runtime weights found.
          </div>
        ) : (
          weights.map((weight) => (
            <div
              key={weight.id}
              className="border border-cyan-300/15 bg-black/25 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                  {weight.weight_key?.replaceAll("_", " ")}
                </p>

                <h1 className="text-3xl font-black tracking-[-0.06em] text-cyan-100">
                  {Number(weight.weight_value || 1).toFixed(2)}
                </h1>
              </div>

              <p className="text-[13px] leading-6 text-white/60">
                {weight.reasoning}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
