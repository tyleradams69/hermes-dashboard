"use client";

import { useEffect, useState } from "react";

const API_URL = "/api/hermes";

export default function ApprovalQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [minimized, setMinimized] = useState(false);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/followup-approvals`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      setItems(data.approvals || []);

    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();

    const timer =
      setInterval(load, 4000);

    return () => clearInterval(timer);
  }, []);

  async function updateStatus(
    id: string,
    status: "approved" | "rejected"
  ) {
    try {
      const res = await fetch(
        `${API_URL}/api/followup-approvals/${id}/status`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status,
          }),
        }
      );

      const data = await res.json();

      if (!data.ok) {
        alert(data.error || "Failed");
        return;
      }

      load();

    } catch (err) {
      console.error(err);

      alert("Failed to update approval");
    }
  }


  return (
    <div className="fixed left-6 bottom-6 z-40 w-[320px] border border-cyan-300/20 bg-black/70 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-2xl">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">
            Approval Queue
          </p>

          <div className="border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] font-bold text-cyan-100">
            {items.length}
          </div>
          <button
            onClick={() => setMinimized(!minimized)}
            className="border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
          >
            {minimized ? "Open" : "Min"}
          </button>
        </div>
      </div>

      {minimized ? (
        <div className="px-4 py-4 text-xs uppercase tracking-[0.22em] text-white/45">
          {items.length} pending approvals
        </div>
      ) : (

      <div className="max-h-[280px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-5 text-sm text-white/35">
            No pending approvals.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="border-b border-white/5 px-4 py-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200">
                  {item.company}
                </p>

                <div className="border border-yellow-300/20 bg-yellow-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-yellow-100">
                  Pending
                </div>
              </div>

              <p className="text-sm font-bold text-white">
                {item.subject}
              </p>

              <p className="mt-3 line-clamp-4 text-sm leading-6 text-white/60">
                {item.body}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() =>
                    updateStatus(
                      item.id,
                      "approved"
                    )
                  }
                  className="flex-1 border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-cyan-100 transition-all duration-300 ease-out hover:bg-cyan-300 hover:text-black">
                  Approve
                </button>

                <button
                  onClick={() =>
                    updateStatus(
                      item.id,
                      "rejected"
                    )
                  }
                  className="flex-1 border border-red-300/20 bg-red-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-red-100 transition-all duration-300 ease-out hover:bg-red-300 hover:text-black">
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
}
