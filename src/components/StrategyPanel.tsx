"use client";

import { useEffect, useState } from "react";

const API_URL = "/api/hermes";

export default function StrategyPanel() {
  const [strategies, setStrategies] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/strategy-memory?business_id=liminull`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      setStrategies(
        data.strategies || []
      );

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer =
      setInterval(load, 6000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Strategic Intelligence
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          {strategies.length} Patterns
        </div>
      </div>

      <div className="space-y-4">
        {strategies.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-sm text-white/40">
            No strategy memory yet.
          </div>
        ) : (
          strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="border border-cyan-300/15 bg-black/20 p-4"
            >
              <div className="mb-3 flex items-center justify-between">

                <p className="text-sm font-black uppercase tracking-[-0.04em] text-cyan-100">
                  {strategy.category?.replaceAll("_", " ")}
                </p>

                <div className="border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                  {strategy.adaptive_confidence || 50}
                </div>

              </div>

              <p className="text-sm leading-7 text-white/65">
                {strategy.observation}
              </p>

              <div className="mt-4 border border-white/10 bg-black/30 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                  Recommendation
                </p>

                <p className="text-sm text-white/70">
                  {strategy.recommendation}
                </p>
              </div>

              <div className="mt-4 flex gap-2 text-[10px] uppercase tracking-[0.18em]">

                <div className="border border-cyan-300/15 bg-cyan-300/10 px-3 py-2 text-cyan-100">
                  Success:
                  {" "}
                  {strategy.success_count || 0}
                </div>

                <div className="border border-red-300/15 bg-red-300/10 px-3 py-2 text-red-100">
                  Failure:
                  {" "}
                  {strategy.failure_count || 0}
                </div>

                <div className="border border-white/10 bg-black/30 px-3 py-2 text-white/60">
                  Usage:
                  {" "}
                  {strategy.usage_count || 0}
                </div>

              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
