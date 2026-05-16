"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function HermesAssistantPanel({
  businessId = "liminull",
}: {
  businessId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [actions, setActions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadHistory() {
    try {
      const res = await fetch(
        `${API_URL}/api/assistant-conversations?business_id=${businessId}`,
        {
          cache: "no-store",
          headers: {
            "x-hermes-token":
              process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
            "x-hermes-role": "admin",
          },
        }
      );

      const data = await res.json();
      setHistory(data.conversations || []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, businessId]);

  async function askHermes(e: React.FormEvent) {
    e.preventDefault();

    if (!question.trim()) return;

    setLoading(true);

    const res = await fetch(`${API_URL}/api/hermes-assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hermes-token":
          process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
        "x-hermes-role": "admin",
      },
      body: JSON.stringify({
        business_id: businessId,
        question,
        conversation_history: history.slice(0, 5),
      }),
    });

    const data = await res.json();

    setAnswer(data.answer || "Liminull could not answer that yet.");
    setActions(data.suggested_actions || []);
    setLoading(false);
    setQuestion("");

    loadHistory();
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 w-[420px] max-w-[calc(100vw-2rem)] border border-cyan-300/20 bg-black p-4 text-white shadow-2xl shadow-cyan-500/10">
          <div className="mb-3">
            <p className="liminull-eyebrow">
              Liminull Assistant
            </p>

            <p className="mt-1 text-sm liminull-muted">
              Ask Liminull about this business, operations, workers, approvals, or system health.
            </p>
          </div>

          <form onSubmit={askHermes} className="space-y-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Liminull..."
              className="min-h-[90px] w-full border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/25"
            />

            <button className="w-full border border-cyan-300/30 px-4 py-3 text-xs uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black">
              {loading ? "Thinking..." : "Ask Liminull"}
            </button>
          </form>

          {answer && (
            <div className="mt-4 border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-white/75">
              {answer}
            </div>
          )}

          {actions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                Suggested Actions
              </p>

              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (action.payload?.route) {
                      window.location.href = action.payload.route;
                    }
                  }}
                  className="w-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-left text-xs uppercase tracking-[0.15em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
                >
                  {action.title}
                </button>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                Conversation History
              </p>

              <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
                {history.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="border border-white/10 bg-white/[0.03] p-3"
                  >
                    <p className="text-xs font-black text-cyan-100">
                      {item.question}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-white/60">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="border border-cyan-300/30 bg-cyan-300 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-2xl shadow-cyan-500/20"
      >
        {open ? "Close Liminull" : "Ask Liminull"}
      </button>
    </div>
  );
}
