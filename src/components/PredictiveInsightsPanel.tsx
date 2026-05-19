"use client";

import { useEffect, useState } from "react";

const API_URL = "/api/hermes";

export default function PredictiveInsightsPanel({
  company,
}: {
  company: string | null;
}) {

  const [insight, setInsight] =
    useState<any>(null);

  async function load() {
    if (!company) return;

    try {
      const res = await fetch(
        `${API_URL}/api/predictive-insights/${encodeURIComponent(company)}?business_id=liminull`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      setInsight(
        data.insight || null
      );

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
  }, [company]);

  if (!insight) {
    return (
      <div className="mt-8 border border-white/10 bg-black/20 p-5">
        <p className="text-sm text-white/35">
          No predictive intelligence yet.
        </p>
      </div>
    );
  }

  function tone(value: number) {
    if (value >= 80) {
      return "text-cyan-100 border-cyan-300/30 bg-cyan-300/10";
    }

    if (value <= 35) {
      return "text-red-100 border-red-300/30 bg-red-300/10";
    }

    return "text-white/80 border-white/10 bg-black/20";
  }

  return (
    <div className="mt-8 border border-cyan-300/20 bg-cyan-300/5 p-5 shadow-[0_0_40px_rgba(34,211,238,0.08)]">

      <div className="mb-5 flex items-center justify-between">

        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Predictive Intelligence
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Forecasting Active
        </div>

      </div>

      <div className="grid grid-cols-2 gap-4">

        <div className={`border p-4 ${tone(insight.close_probability)}`}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em]">
            Close Probability
          </p>

          <h1 className="text-4xl font-black tracking-[-0.06em]">
            {insight.close_probability}%
          </h1>
        </div>

        <div className={`border p-4 ${tone(insight.response_probability)}`}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em]">
            Response Probability
          </p>

          <h1 className="text-4xl font-black tracking-[-0.06em]">
            {insight.response_probability}%
          </h1>
        </div>

        <div className={`border p-4 ${tone(100 - insight.stale_risk)}`}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em]">
            Recovery Probability
          </p>

          <h1 className="text-4xl font-black tracking-[-0.06em]">
            {insight.recovery_probability}%
          </h1>
        </div>

        <div className={`border p-4 ${tone(100 - insight.stale_risk)}`}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.24em]">
            Stale Risk
          </p>

          <h1 className="text-4xl font-black tracking-[-0.06em]">
            {insight.stale_risk}%
          </h1>
        </div>

      </div>

      <div className="mt-5 border border-cyan-300/20 bg-cyan-300/10 p-4">

        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
          Recommended Intervention
        </p>

        <p className="text-lg font-black uppercase tracking-[-0.04em] text-cyan-100">
          {insight.recommended_intervention}
        </p>

      </div>

      <div className="mt-5 border border-white/10 bg-black/20 p-4">

        <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-white/35">
          Predictive Reasoning
        </p>

        <p className="text-sm leading-7 text-white/70">
          {insight.reasoning}
        </p>

      </div>

    </div>
  );
}
