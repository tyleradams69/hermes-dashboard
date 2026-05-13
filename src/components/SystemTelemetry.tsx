"use client";

import { useEffect, useState } from "react";

const API_URL = "https://api.liminullai.com";

export default function SystemTelemetry() {
  const [events, setEvents] = useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/activity`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      setEvents(data.activity || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style jsx global>{`
        @keyframes telemetryPulse {
          0%, 100% {
            opacity: 0.45;
          }

          50% {
            opacity: 1;
          }
        }

        .telemetry-pulse {
          animation: telemetryPulse 2.4s ease-in-out infinite;
        }
      `}</style>

      <div className="fixed right-6 top-24 z-40 w-[340px] border border-cyan-300/20 bg-black/70 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="telemetry-pulse h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,1)]" />

            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">
              LIVE TELEMETRY
            </p>
          </div>

          <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
            HERMES
          </p>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-5 text-sm text-white/35">
              No telemetry yet.
            </div>
          ) : (
            events.slice(0, 20).map((event, index) => (
              <div
                key={index}
                className="border-b border-white/5 px-4 py-4 transition hover:bg-cyan-300/5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200">
                    {event.type?.replaceAll("_", " ")}
                  </p>

                  <div className="h-2 w-2 rounded-full bg-cyan-300/80" />
                </div>

                <p className="text-sm leading-6 text-white/70">
                  {event.message}
                </p>

                <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/25">
                  {event.company || "SYSTEM"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
