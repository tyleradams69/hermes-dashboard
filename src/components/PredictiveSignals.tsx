"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = "/api/hermes";

export default function PredictiveSignals() {
  const [signal, setSignal] =
    useState<any>(null);

  const lastKey =
    useRef<string | null>(null);

  async function load() {
    try {
      const stateRes = await fetch(
        `${API_URL}/api/state?business_id=liminull`,
        { cache: "no-store" }
      );

      const state = await stateRes.json();

      const leads =
        Object.entries(state || {}).map(
          ([company, lead]: any) => ({
            ...lead,
            company,
          })
        );

      for (const lead of leads) {
        const insightRes = await fetch(
          `${API_URL}/api/predictive-insights/${encodeURIComponent(
            lead.company
          )}?business_id=liminull`,
          { cache: "no-store" }
        );

        const insightData =
          await insightRes.json();

        const insight =
          insightData.insight;

        if (!insight) continue;

        let type = "";
        let label = "";

        if (insight.close_probability >= 85) {
          type = "high_close";
          label = "High Close Probability";
        } else if (insight.stale_risk >= 75) {
          type = "stale_risk";
          label = "Stale Risk Detected";
        } else if (insight.recovery_probability >= 75) {
          type = "recovery";
          label = "Recovery Opportunity";
        }

        if (!type) continue;

        const key =
          `${lead.company}-${type}-${insight.updated_at}`;

        if (lastKey.current === key) {
          return;
        }

        lastKey.current = key;

        setSignal({
          company: lead.company,
          type,
          label,
          closeProbability:
            insight.close_probability,
          responseProbability:
            insight.response_probability,
          staleRisk:
            insight.stale_risk,
          recoveryProbability:
            insight.recovery_probability,
          intervention:
            insight.recommended_intervention,
          reasoning:
            insight.reasoning,
        });

        setTimeout(() => {
          setSignal(null);
        }, 6000);

        return;
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer =
      setInterval(load, 8000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  if (!signal) return null;

  const urgent =
    signal.type === "high_close" ||
    signal.type === "stale_risk";

  return (
    <div className={`pointer-events-none fixed bottom-8 right-8 z-[9999] w-[360px] border p-6 backdrop-blur-2xl ${
      urgent
        ? "border-red-300/30 bg-black/92 shadow-[0_0_140px_rgba(255,80,80,0.22)]"
        : "border-cyan-300/30 bg-black/90 shadow-[0_0_120px_rgba(34,211,238,0.24)]"
    }`}>

      <div className="mb-4 flex items-center justify-between">

        <p className={`text-xs uppercase tracking-[0.32em] ${
          urgent ? "text-red-200" : "text-cyan-200"
        }`}>
          Predictive Signal
        </p>

        <div className={`animate-pulse border px-3 py-2 text-[10px] uppercase tracking-[0.22em] ${
          urgent
            ? "border-red-300/30 bg-red-300/10 text-red-100"
            : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
        }`}>
          Active
        </div>

      </div>

      <p className={`mb-3 text-[10px] uppercase tracking-[0.28em] ${
        urgent ? "text-red-100" : "text-cyan-100"
      }`}>
        {signal.label}
      </p>

      <h1 className="text-3xl font-black uppercase tracking-[-0.08em] text-white">
        {signal.company}
      </h1>

      <div className="mt-5 grid grid-cols-2 gap-3">

        <Metric label="Close" value={signal.closeProbability} />
        <Metric label="Response" value={signal.responseProbability} />
        <Metric label="Recovery" value={signal.recoveryProbability} />
        <Metric label="Stale Risk" value={signal.staleRisk} />

      </div>

      <div className={`mt-5 border p-4 ${
        urgent
          ? "border-red-300/20 bg-red-300/10"
          : "border-cyan-300/20 bg-cyan-300/10"
      }`}>

        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/45">
          Recommended Intervention
        </p>

        <p className="text-sm leading-7 text-white/80">
          {signal.intervention}
        </p>

      </div>

      <p className="mt-4 text-xs leading-6 text-white/45">
        {signal.reasoning}
      </p>

    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border border-white/10 bg-black/30 p-3">
      <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-white/35">
        {label}
      </p>

      <p className="text-2xl font-black tracking-[-0.06em] text-white">
        {value}%
      </p>
    </div>
  );
}
