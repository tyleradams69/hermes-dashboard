"use client";

import { useEffect, useState } from "react";

const API_URL = "/api/hermes";

export default function RuntimeBriefing() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  async function load() {
    try {
      const [stateRes, perfRes, corrRes] =
        await Promise.all([
          fetch(`${API_URL}/api/state?business_id=liminull`, { cache: "no-store" }),
          fetch(`${API_URL}/api/operator-actions-summary?business_id=liminull`, { cache: "no-store" }),
          fetch(`${API_URL}/api/operator-correlations?business_id=liminull`, { cache: "no-store" }),
        ]);

      const state = await stateRes.json();
      const perf = await perfRes.json();
      const corr = await corrRes.json();

      const leads = Object.entries(state || {}).map(
        ([company, lead]: any) => ({
          ...lead,
          company,
        })
      );

      const hotLeads =
        leads
          .filter((lead: any) => lead.leadScore >= 80)
          .slice(0, 3);

      const briefing: any[] = [];

      for (const lead of hotLeads) {
        briefing.push({
          title: "High-Value Lead Active",
          label: lead.company,
          detail: `${lead.leadTemperature || "warm"} lead with AI score ${lead.leadScore}. Recommended action: ${lead.suggestedNextAction || "Review lead."}`,
        });
      }

      if (perf.summary) {
        briefing.push({
          title: "Operator Performance",
          label: `${perf.summary.fast_response_rate}% fast response rate`,
          detail: perf.summary.operational_insight,
        });
      }

      for (const item of (corr.correlations || []).slice(0, 2)) {
        briefing.push({
          title: item.correlation_type?.replaceAll("_", " "),
          label: `${item.confidence}% confidence`,
          detail: item.impact_summary,
        });
      }

      setItems(briefing.slice(0, 6));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      await load();

      if (!sessionStorage.getItem("runtimeBriefingAcknowledged")) {
        setOpen(true);
      }
    }, 5200);

    return () => clearTimeout(timer);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-xl">
      <div className="w-[780px] border border-cyan-300/25 bg-black/90 p-6 shadow-[0_0_160px_rgba(34,211,238,0.20)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.34em] text-cyan-200">
              Runtime Briefing
            </p>

            <h1 className="text-4xl font-black uppercase tracking-[-0.07em] text-white">
              Operational Snapshot
            </h1>
          </div>

          <div className="border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-cyan-100">
            Live
          </div>
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="border border-white/10 bg-black/30 p-4 text-sm text-white/45">
              No critical runtime briefing items.
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                className="border border-cyan-300/15 bg-cyan-300/5 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <p className="text-sm font-black uppercase tracking-[-0.04em] text-white">
                    {item.title}
                  </p>

                  <div className="border border-white/10 bg-black/30 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                    {item.label}
                  </div>
                </div>

                <p className="text-sm leading-6 text-white/65">
                  {item.detail}
                </p>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => {
            sessionStorage.setItem("runtimeBriefingAcknowledged", "true");
            setOpen(false);
          }}
          className="mt-6 w-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-4 text-[11px] uppercase tracking-[0.28em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
        >
          Acknowledge Briefing
        </button>
      </div>
    </div>
  );
}
