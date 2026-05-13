"use client";

import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function AIFollowupPanel({
  company,
}: {
  company: string | null;
}) {
  const [loading, setLoading] = useState(false);

  const [followup, setFollowup] =
    useState<any>(null);

  async function generate() {
    if (!company) return;

    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/lead/${encodeURIComponent(company)}/generate-followup`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (!data.ok) {
        alert(data.error || "Failed");
        return;
      }

      setFollowup(data.followup);

    } catch (err) {
      console.error(err);

      alert("Generation failed");

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 border border-cyan-300/20 bg-cyan-300/5 p-5 shadow-[0_0_40px_rgba(34,211,238,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">
          AI Followup
        </p>

        <button
          onClick={generate}
          disabled={loading}
          className="border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
        >
          {loading
            ? "Generating..."
            : "Generate Followup"}
        </button>
      </div>

      {!followup ? (
        <p className="text-sm text-white/35">
          No followup generated yet.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="border border-white/10 bg-black/20 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
              Subject
            </p>

            <p className="text-sm text-cyan-100">
              {followup.subject}
            </p>
          </div>

          <div className="border border-white/10 bg-black/20 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
              Body
            </p>

            <p className="whitespace-pre-wrap text-sm leading-7 text-white/70">
              {followup.body}
            </p>
          </div>

          <div className="border border-white/10 bg-black/20 p-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
              AI Reasoning
            </p>

            <p className="text-sm leading-7 text-white/70">
              {followup.reasoning}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
