"use client";

import { useEffect, useState } from "react";

const API_URL = "/api/hermes";

export default function OperationalCorrelationsPanel() {
  const [correlations, setCorrelations] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/operator-correlations?business_id=liminull`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setCorrelations(data.correlations || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer =
      setInterval(load, 12000);

    return () => clearInterval(timer);
  }, []);

  function tone(confidence: number) {
    if (confidence >= 85) {
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
    }

    if (confidence >= 65) {
      return "border-yellow-300/25 bg-yellow-300/10 text-yellow-100";
    }

    return "border-white/10 bg-black/20 text-white/70";
  }

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Operational Correlations
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Self-Analysis
        </div>
      </div>

      <div className="space-y-3">
        {correlations.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
            No operational correlations detected yet.
          </div>
        ) : (
          correlations.map((item) => (
            <div
              key={item.id}
              className={`border p-4 ${tone(item.confidence || 0)}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-black uppercase tracking-[-0.04em]">
                  {item.correlation_type?.replaceAll("_", " ")}
                </p>

                <div className="border border-white/10 bg-black/25 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/75">
                  {item.confidence}% confidence
                </div>
              </div>

              <p className="text-[13px] leading-6 text-white/70">
                {item.observation}
              </p>

              <div className="mt-4 border border-white/10 bg-black/25 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">
                  Impact
                </p>

                <p className="text-[13px] leading-6 text-white/75">
                  {item.impact_summary}
                </p>
              </div>

              <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/35">
                Supporting Events: {item.supporting_events || 0}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
