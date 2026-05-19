"use client";

import { useEffect, useState } from "react";

const API_URL = "/api/hermes";

export default function HermesAssistantPanel({
  businessId = "liminull",
}: {
  businessId?: string;
}) {
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
    loadHistory();
  }, [businessId]);

  async function askHermes(e: React.FormEvent) {
    e.preventDefault();

    if (!question.trim()) return;

    setLoading(true);

    const res = await fetch(`${API_URL}/api/hermes-assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    setQuestion("");
    setLoading(false);

    loadHistory();
  }

  return (
    <section className="liminull-card p-5">
      <div className="mb-4">
        <p className="liminull-eyebrow">Liminull Assistant</p>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.06em]">
          Operational Copilot
        </h2>

        <p className="mt-2 text-sm leading-6 liminull-muted">
          Embedded operational intelligence for workflows, infrastructure,
          supervision, and executive guidance.
        </p>
      </div>

      <form onSubmit={askHermes} className="space-y-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask Liminull..."
          className="min-h-[110px] w-full rounded-2xl border border-white/5 bg-black/30 p-4 text-sm text-white outline-none placeholder:text-white/25"
        />

        <button className="liminull-button w-full">
          {loading ? "Thinking..." : "Ask Liminull"}
        </button>
      </form>

      {answer && (
        <div className="mt-4 liminull-card-soft p-4 text-sm leading-6 text-white/70">
          {answer}
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="liminull-eyebrow">Suggested Actions</p>

          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                if (action.payload?.route) {
                  window.location.href = action.payload.route;
                }
              }}
              className="liminull-button w-full text-left"
            >
              {action.title}
            </button>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="liminull-eyebrow">Recent Context</p>

          <div className="mt-3 max-h-[260px] space-y-3 overflow-y-auto pr-1">
            {history.slice(0, 5).map((item, index) => (
              <div key={index} className="liminull-card-soft p-3">
                <p className="text-xs font-black text-cyan-100">
                  {item.question}
                </p>

                <p className="mt-2 text-xs leading-5 liminull-muted">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
