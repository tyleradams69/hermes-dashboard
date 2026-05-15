"use client";

import { useEffect, useRef, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function AIAlerts() {
  const [alert, setAlert] =
    useState<any>(null);

  const lastId =
    useRef<string | null>(null);

  async function poll() {
    try {
      const res = await fetch(
        `${API_URL}/api/activity`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      const items =
        data.activity || [];

      const latest =
        items.find(
          (item: any) =>
            item.type === "reply_classified" ||
            item.type === "auto_followup_queued"
        );

      if (!latest) return;

      if (
        latest.id !== lastId.current
      ) {

        lastId.current =
          latest.id;

        setAlert(latest);

        setTimeout(() => {
          setAlert(null);
        }, 5000);
      }

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    poll();

    const timer =
      setInterval(poll, 4000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  if (!alert) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-start justify-center pt-24">
      <div className="border border-cyan-300/30 bg-black/85 px-8 py-6 shadow-[0_0_120px_rgba(34,211,238,0.28)] backdrop-blur-2xl">
        <p className="text-xs uppercase tracking-[0.42em] text-cyan-200">
          AI INTELLIGENCE ALERT
        </p>

        <h1 className="mt-4 text-5xl font-black uppercase tracking-[-0.08em] text-white">
          {alert.company}
        </h1>

        <p className="mt-4 text-sm uppercase tracking-[0.28em] text-cyan-100">
          {alert.message}
        </p>

        {alert.type === "auto_followup_queued" && (
          <div className="mt-5 border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
            Hermes generated a followup proposal and added it to the approval queue.
          </div>
        )}

        {alert.type === "auto_followup_queued" && (
          <div className="mt-5 border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-cyan-100">
            Hermes generated a followup proposal and added it to the approval queue.
          </div>
        )}
      </div>
    </div>
  );
}
