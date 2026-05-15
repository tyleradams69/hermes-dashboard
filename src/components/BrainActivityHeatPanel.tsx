"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function BrainActivityHeatPanel() {
  const [heat, setHeat] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/brain-activity-heat?business_id=liminull`,
        {
          cache: "no-store",
          headers: {
            "x-hermes-token":
              process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
            "x-hermes-role":
              "admin",
          },
        }
      );

      const data = await res.json();

      setHeat(data.heat || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);

    return () => clearInterval(timer);
  }, []);

  const max =
    Math.max(
      1,
      ...heat.map((item) => item.intensity || 0)
    );

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Brain Activity Heat
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Intensity
        </div>
      </div>

      <div className="space-y-3">
        {heat.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-[13px] text-white/35">
            No brain heat activity yet.
          </div>
        ) : (
          heat.slice(-8).map((item) => {
            const level =
              Math.max(
                8,
                Math.round((item.intensity / max) * 100)
              );

            return (
              <div
                key={item.time}
                className="border border-white/10 bg-black/25 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
                    {item.time}
                  </p>

                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                    {item.intensity} mutations
                  </p>
                </div>

                <div className="h-2 overflow-hidden bg-white/5">
                  <div
                    className="h-full bg-cyan-300/70 shadow-[0_0_22px_rgba(34,211,238,0.6)]"
                    style={{
                      width: `${level}%`,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
