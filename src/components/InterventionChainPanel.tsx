"use client";

import { useEffect, useState } from "react";

const API_URL = "/api/hermes";

export default function InterventionChainPanel() {
  const [chains, setChains] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/intervention-chains?business_id=liminull`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setChains(data.chains || []);
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
          Intervention Chains
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Strategy Sequence
        </div>
      </div>

      <div className="space-y-3">
        {chains.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
            No intervention chains yet.
          </div>
        ) : (
          chains.map((chain) => (
            <div
              key={chain.id}
              className="border border-white/10 bg-black/25 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-sm font-black uppercase tracking-[-0.04em] text-white">
                  {chain.chain_name?.replaceAll("_", " ")}
                </h2>

                <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                  {chain.confidence}% confidence
                </div>
              </div>

              <p className="mb-4 text-[13px] leading-6 text-white/65">
                {chain.observation}
              </p>

              <div className="mb-4 space-y-2">
                {(chain.ordered_actions || []).map(
                  (action: string, idx: number) => (
                    <div
                      key={action}
                      className="flex items-center gap-3 border border-cyan-300/10 bg-black/20 p-3"
                    >
                      <div className="flex h-7 w-7 items-center justify-center border border-cyan-300/20 bg-cyan-300/10 text-xs font-black text-cyan-100">
                        {idx + 1}
                      </div>

                      <p className="text-[12px] font-black uppercase tracking-[0.12em] text-white/75">
                        {action.replaceAll("_", " ")}
                      </p>
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-cyan-300/20 bg-cyan-300/10 p-3">
                  <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-cyan-200">
                    Probability Delta
                  </p>

                  <p className="text-2xl font-black tracking-[-0.05em] text-cyan-100">
                    +{chain.cumulative_probability_delta}
                  </p>
                </div>

                <div className="border border-white/10 bg-black/20 p-3">
                  <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-white/35">
                    Risk Reduction
                  </p>

                  <p className="text-2xl font-black tracking-[-0.05em] text-white">
                    -{chain.cumulative_risk_reduction}
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
