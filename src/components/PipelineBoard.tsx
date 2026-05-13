"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

const PIPELINE_COLUMNS = [
  "new_lead",
  "contacted",
  "interested",
  "pricing_requested",
  "meeting_requested",
  "closed_lost",
];

function label(stage: string) {
  return stage.replaceAll("_", " ").toUpperCase();
}

function tone(stage: string) {
  switch (stage) {
    case "meeting_requested":
      return "border-cyan-300/40 bg-cyan-300/5";
    case "pricing_requested":
      return "border-blue-300/30 bg-blue-300/5";
    case "interested":
      return "border-emerald-300/30 bg-emerald-300/5";
    case "closed_lost":
      return "border-red-300/30 bg-red-300/5";
    default:
      return "border-white/10 bg-white/[0.025]";
  }
}

export default function PipelineBoard({
  leads,
  onSelect,
  onStageChange,
}: {
  leads: any[];
  onSelect: (lead: any) => void;
  onStageChange?: () => void;
}) {
  async function moveLead(company: string, stage: string) {
    const res = await fetch(
      `${API_URL}/api/lead/${encodeURIComponent(company)}/stage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipeline_stage: stage,
        }),
      }
    );

    const data = await res.json();

    if (!data.ok) {
      alert(data.error || "Failed to update stage");
      return;
    }

    if (onStageChange) {
      onStageChange();
    }
  }

  return (
    <div className="flex max-w-full gap-3 overflow-x-auto pb-4 pr-4">
      {PIPELINE_COLUMNS.map((stage) => {
        const stageLeads = leads.filter(
          (lead) => (lead.pipelineStage || "new_lead") === stage
        );

        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();

              const company = e.dataTransfer.getData("company");

              if (company) {
                moveLead(company, stage);
              }
            }}
            className="min-w-[220px] max-w-[220px] flex-shrink-0 border border-white/10 bg-[#06080b]/95 backdrop-blur-2xl transition-all duration-300 ease-out hover:shadow-[0_0_45px_rgba(34,211,238,0.12)]"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">
                  {label(stage)}
                </p>

                <div className="border border-cyan-300/20 bg-cyan-300/5 px-2 py-1 text-[10px] font-bold text-cyan-100">
                  {stageLeads.length}
                </div>
              </div>
            </div>

            <div className="min-h-[160px] max-h-[560px] space-y-3 overflow-y-auto p-3">
              {stageLeads.length === 0 ? (
                <div className="border border-dashed border-white/10 p-4 text-center text-xs uppercase tracking-[0.2em] text-white/20">
                  NO SIGNALS
                </div>
              ) : (
                stageLeads.map((lead) => (
                  <div
                    key={lead.company}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("company", lead.company);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => onSelect(lead)}
                    className={`w-full cursor-grab border p-4 text-left transition-all duration-300 ease-out hover:-translate-y-[4px] hover:border-cyan-300/40 hover:shadow-[0_12px_40px_rgba(34,211,238,0.14)] active:cursor-grabbing ${tone(stage)}`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />

                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                        Drag
                      </p>
                    </div>

                    <h3 className="text-lg font-black uppercase leading-none tracking-[-0.06em] text-white">
                      {lead.company}
                    </h3>

                    <div className="mt-4 space-y-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
                      <p>Reply: {lead.replyStatus || "none"}</p>

                      <p>Followups: {lead.followupCount || 0}</p>

                      <div className="flex items-center justify-between">
                        <span>AI Score</span>

                        <span className="font-bold text-cyan-200">
                          {lead.leadScore || 50}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Temperature</span>

                        <span
                          className={
                            lead.leadTemperature === "hot"
                              ? "text-red-300"
                              : lead.leadTemperature === "cold"
                              ? "text-blue-300"
                              : "text-yellow-200"
                          }
                        >
                          {(lead.leadTemperature || "warm").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
