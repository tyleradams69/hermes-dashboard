"use client";

import AIFollowupPanel from "./AIFollowupPanel";
import LeadMemoryPanel from "./LeadMemoryPanel";
import PredictiveInsightsPanel from "./PredictiveInsightsPanel";

type Props = {
  open: boolean;
  company: string | null;
  data: any;
  activity: any[];
  onClose: () => void;
};

function formatDate(value?: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeadDrawer({
  open,
  company,
  data,
  activity,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9997] flex justify-end">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-cyan-300/20 bg-[#050608] p-8 text-white shadow-[0_0_120px_rgba(34,211,238,0.16)]">
        <div className="mb-8 flex items-start justify-between border-b border-white/10 pb-6">
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.32em] text-cyan-200">
              Lead Intelligence
            </p>

            <h1 className="text-5xl font-black uppercase tracking-[-0.08em]">
              {company || "Unknown"}
            </h1>
          </div>

          <button
            onClick={onClose}
            className="border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.22em] text-white/60 transition-all duration-300 ease-out hover:border-red-300/30 hover:bg-red-300 hover:text-black"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            ["Status", data?.status || "unknown"],
            ["Stage", data?.pipelineStage || "unknown"],
            ["Reply", data?.replyStatus || "none"],
            ["Followups", data?.followupCount || 0],
            ["Updated", formatDate(data?.updatedAt)],
            ["Website", data?.website || "none"],
          ].map(([label, value]) => (
            <div key={label} className="border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                {label}
              </p>

              <p className="mt-3 text-lg font-bold text-cyan-100">
                {String(value)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 border border-white/10 bg-white/[0.03] p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.28em] text-cyan-200">
            Latest Reply
          </p>
        <div className="mt-8 border border-cyan-300/20 bg-cyan-300/5 p-5 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
              AI Assessment
            </p>

            <div className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100">
              {String(data?.leadTemperature || "warm").toUpperCase()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                Lead Score
              </p>

              <p className="mt-3 text-5xl font-black tracking-[-0.08em] text-cyan-100">
                {data?.leadScore || 50}
              </p>
            </div>

            <div className="border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                Priority
              </p>

              <p className="mt-3 text-3xl font-black uppercase tracking-[-0.08em] text-cyan-100">
                {data?.leadPriority || "normal"}
              </p>
            </div>
          </div>

          <div className="mt-4 border border-white/10 bg-black/20 p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-white/35">
              AI Reasoning
            </p>

            <p className="text-sm leading-7 text-white/70">
              {data?.aiReasoning || "No reasoning generated yet."}
            </p>
          </div>
        </div>

          <div className="mt-4 border border-cyan-300/20 bg-cyan-300/5 p-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
              Suggested Next Action
            </p>

            <div className="border border-white/10 bg-black/20 px-4 py-4">
              <p className="text-lg font-black uppercase tracking-[-0.04em] text-cyan-100">
                {data?.suggestedNextAction ||
                  "Awaiting operational guidance"}
              </p>
            </div>
          </div>




          <p className="text-sm leading-7 text-white/70">
            {data?.latestReply || "No reply intelligence captured yet."}
          </p>
        </div>

        <PredictiveInsightsPanel company={company} />

        <LeadMemoryPanel company={company} />

        <AIFollowupPanel company={company} />

        <div className="mt-8">
          <p className="mb-4 text-xs uppercase tracking-[0.28em] text-cyan-200">
            Activity Timeline
          </p>

          <div className="space-y-4">
            {activity.length === 0 ? (
              <div className="border border-white/10 bg-white/[0.03] p-5 text-sm text-white/40">
                No activity recorded.
              </div>
            ) : (
              activity.map((event) => (
                <div key={event.id} className="border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
                      {event.type?.replaceAll("_", " ")}
                    </p>

                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                      {formatDate(event.timestamp)}
                    </p>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-white/70">
                    {event.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
