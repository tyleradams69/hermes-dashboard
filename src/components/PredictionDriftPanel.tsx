"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function PredictionDriftPanel() {
  const [drift, setDrift] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/prediction-drift?business_id=liminull`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setDrift(data.drift || []);
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
          Prediction Drift
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Predictive Evolution
        </div>
      </div>

      <div className="space-y-3">
        {drift.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
            No prediction drift yet.
          </div>
        ) : (
          drift.slice(-6).map((item, idx) => (
            <div
              key={idx}
              className="border border-white/10 bg-black/25 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-[-0.04em] text-white">
                  {item.company}
                </p>

                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                  {new Date(item.updated_at).toLocaleTimeString()}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Metric
                  label="Close"
                  value={`${item.close_probability}%`}
                />

                <Metric
                  label="Recovery"
                  value={`${item.recovery_probability}%`}
                />

                <Metric
                  label="Stale"
                  value={`${item.stale_risk}%`}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-cyan-300/10 bg-black/20 p-3">
      <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p className="text-xl font-black tracking-[-0.05em] text-cyan-100">
        {value}
      </p>
    </div>
  );
}
