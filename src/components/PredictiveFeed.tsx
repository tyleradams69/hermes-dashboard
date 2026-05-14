"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function PredictiveFeed() {

  const [events, setEvents] =
    useState<any[]>([]);

  const [acknowledged, setAcknowledged] =
    useState<Record<string, string>>({});

  async function load() {
    try {

      const ackRes = await fetch(
        `${API_URL}/api/predictive-acknowledgments?business_id=liminull`,
        {
          cache: "no-store",
        }
      );

      const ackData =
        await ackRes.json();

      const ackMap: Record<string, string> = {};

      for (const ack of ackData.acknowledgments || []) {
        ackMap[
          `${ack.company}-${ack.signal_type}`
        ] =
          ack.insight_signature || "";
      }

      setAcknowledged(ackMap);

      const stateRes = await fetch(
        `${API_URL}/api/state?business_id=liminull`,
        {
          cache: "no-store",
        }
      );

      const state = await stateRes.json();

      const leads =
        Object.entries(state || {}).map(
          ([company, lead]: any) => ({
            ...lead,
            company,
          })
        );

      const generated = [];

      for (const lead of leads) {

        const lastUpdated =
          lead.updatedAt
            ? new Date(lead.updatedAt).getTime()
            : Date.now();

        const hoursSinceUpdate =
          Math.floor(
            (Date.now() - lastUpdated) /
            (1000 * 60 * 60)
          );

        const insightRes = await fetch(
          `${API_URL}/api/predictive-insights/${encodeURIComponent(
            lead.company
          )}?business_id=liminull`,
          {
            cache: "no-store",
          }
        );

        const insightData =
          await insightRes.json();

        const insight =
          insightData.insight;

        if (!insight) continue;

        // CLOSE PROBABILITY

        if (
          insight.close_probability >= 85
        ) {

          if (
            ackMap[
              `${lead.company}-close`
            ] === insight.insight_signature
          ) {
            continue;
          }

          let severity = "warning";

          if (
            insight.close_probability >= 97 ||
            hoursSinceUpdate >= 4
          ) {
            severity = "immediate";
          } else if (
            insight.close_probability >= 92 ||
            hoursSinceUpdate >= 2
          ) {
            severity = "critical";
          }

          generated.push({
            type: severity,
            title:
              severity === "immediate"
                ? "Immediate Action Required"
                : "High Close Probability",

            company:
              lead.company,

            detail:
              insight.recommended_intervention,

            created_at:
              insight.updated_at,

            signal_type:
              "close",

            insight_signature:
              insight.insight_signature,

            metric:
              `${insight.close_probability}%`,

            age:
              `${hoursSinceUpdate}h since update`,
          });
        }

        // STALE RISK

        if (
          insight.stale_risk >= 70
        ) {

          generated.push({
            type: "warning",
            title:
              "Stale Risk Escalating",
            company:
              lead.company,
            detail:
              "Lead may require immediate followup escalation.",
            metric:
              `${insight.stale_risk}%`,
          });
        }

        // RECOVERY SIGNAL

        if (
          insight.recovery_probability >= 75
        ) {

          generated.push({
            type: "info",
            title:
              "Recovery Opportunity",
            company:
              lead.company,
            detail:
              "Historically recoverable objection pattern detected.",
            metric:
              `${insight.recovery_probability}%`,
          });
        }
      }

      setEvents(
        generated.slice(0, 12)
      );

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {

    load();

    const timer =
      setInterval(load, 9000);

    return () =>
      clearInterval(timer);

  }, []);

  function tone(type: string) {

    if (type === "immediate") {
      return "border-red-300/40 bg-red-300/20 text-red-100 shadow-[0_0_80px_rgba(255,80,80,0.18)]";
    }

    if (type === "critical") {
      return "border-orange-300/30 bg-orange-300/15 text-orange-100";
    }

    if (type === "warning") {
      return "border-yellow-300/25 bg-yellow-300/10 text-yellow-100";
    }

    return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  }

  return (
    <div className="border border-cyan-300/15 bg-black/35 p-4 backdrop-blur-2xl">

      <div className="mb-5 flex items-center justify-between">

        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          Predictive Operations Feed
        </p>

        <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
          Live
        </div>

      </div>

      <div className="space-y-3">

        {events.length === 0 ? (
          <div className="border border-white/10 bg-black/20 p-4 text-sm text-white/35">
            No predictive operational events.
          </div>
        ) : (
          events.map((event, idx) => (
            <div
              key={idx}
              className={`border p-4 ${tone(event.type)}`}
            >

              <div className="mb-3 flex items-center justify-between">

                <p className="text-sm font-black uppercase tracking-[-0.04em]">
                  {event.title}
                </p>

                <div className="flex items-center gap-2">

                  <div className="border border-white/10 bg-black/20 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/70">
                    {event.metric}
                  </div>

                  <button
                    onClick={async () => {

                      try {

                        await fetch(
                          `${API_URL}/api/predictive-acknowledgments`,
                          {
                            method: "POST",

                            headers: {
                              "Content-Type": "application/json",
                            },

                            body: JSON.stringify({
                              business_id: "liminull",
                              company: event.company,
                              signal_type: "close",
                              insight_signature:
                                event.insight_signature,
                            }),
                          }
                        );

                        await fetch(
                          `${API_URL}/api/operator-actions`,
                          {
                            method: "POST",

                            headers: {
                              "Content-Type": "application/json",
                            },

                            body: JSON.stringify({
                              business_id: "liminull",
                              company: event.company,
                              action_type:
                                "predictive_signal_acknowledged",

                              action_target:
                                event.signal_type,

                              action_details:
                                `${event.label} acknowledged by operator.`,

                              response_latency_seconds:
                                event.created_at
                                  ? Math.max(
                                      0,
                                      Math.floor(
                                        (Date.now() -
                                          new Date(event.created_at).getTime()) /
                                          1000
                                      )
                                    )
                                  : 0,
                            }),
                          }
                        );

                        setAcknowledged((prev) => ({
                          ...prev,
                          [`${event.company}-close`]:
                            event.insight_signature || "",
                        }));

                        setEvents((current) =>
                          current.filter(
                            (item) =>
                              !(
                                item.company === event.company &&
                                item.signal_type === "close"
                              )
                          )
                        );

                      } catch (err) {
                        console.error(err);
                      }

                    }}
                    className="pointer-events-auto border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
                  >
                    Ack
                  </button>

                </div>

              </div>

              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">
                {event.company}
              </p>

              <p className="text-sm leading-7 text-white/75">
                {event.detail}
              </p>

              {event.age && (
                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/35">
                  {event.age}
                </p>
              )}

            </div>
          ))
        )}

      </div>

    </div>
  );
}
