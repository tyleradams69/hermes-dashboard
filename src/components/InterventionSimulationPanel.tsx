"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function InterventionSimulationPanel() {
  const [simulations, setSimulations] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/intervention-simulations?business_id=liminull`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setSimulations(data.simulations || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 12000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Intervention Simulations
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Predictive Futures
        </div>
      </div>

      <div className="space-y-3">
        {simulations.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
            No intervention simulations yet.
          </div>
        ) : (
          simulations.map((simulation) => (
            <div
              key={simulation.id}
              className="border border-white/10 bg-black/25 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-sm font-black uppercase tracking-[-0.04em] text-white">
                  {simulation.simulation_type?.replaceAll("_", " ")}
                </h2>

                <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                  {simulation.confidence}% confidence
                </div>
              </div>

              <p className="mb-4 text-[13px] leading-6 text-white/65">
                {simulation.observation}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-white/10 bg-black/20 p-3">
                  <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-white/35">
                    Predicted Effect
                  </p>

                  <p className="text-lg font-black uppercase tracking-[-0.04em] text-white">
                    {simulation.predicted_effect?.replaceAll("_", " ")}
                  </p>
                </div>

                <div className="border border-cyan-300/20 bg-cyan-300/10 p-3">
                  <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-cyan-200">
                    Probability Delta
                  </p>

                  <p className="text-2xl font-black tracking-[-0.05em] text-cyan-100">
                    +{simulation.probability_delta}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
