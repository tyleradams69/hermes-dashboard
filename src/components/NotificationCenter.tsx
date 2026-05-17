"use client";

import { useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<any[]>([]);

  async function load() {
    try {
      const res = await fetch(
        `${API_URL}/api/notifications?business_id=demo-law-firm`,
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

      setNotifications(
        data.notifications || []
      );
    } catch {
      setNotifications([]);
    }
  }

  async function markRead(id: string) {
    await fetch(
      `${API_URL}/api/notifications/${id}/read`,
      {
        method: "POST",

        headers: {
          "x-hermes-token":
            process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",

          "x-hermes-role":
            "admin",
        },
      }
    );

    load();
  }

  useEffect(() => {
    load();

    const timer =
      setInterval(load, 10000);

    return () =>
      clearInterval(timer);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.06]"
      >
        Notifications

        {notifications.length > 0 && (
          <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-black text-black shadow-[0_0_30px_rgba(103,232,249,0.45)]">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-16 z-50 w-[420px] overflow-hidden rounded-3xl border border-white/5 bg-[#0d0d0f]/95 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="border-b border-white/5 p-5">
            <p className="liminull-eyebrow">
              Notification Center
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.06em]">
              Operational Alerts
            </h2>
          </div>

          <div className="max-h-[520px] overflow-y-auto liminull-scroll p-4">
            {notifications.length === 0 && (
              <div className="liminull-card-soft p-4 text-sm liminull-muted">
                No active notifications.
              </div>
            )}

            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="liminull-card-soft p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black">
                        {notification.title}
                      </p>

                      <p className="mt-2 text-sm leading-6 liminull-muted">
                        {notification.message}
                      </p>
                    </div>

                    <span className="rounded-full border border-cyan-300/10 bg-cyan-300/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                      {notification.priority}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      markRead(notification.id)
                    }
                    className="liminull-button mt-4"
                  >
                    Mark Read
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
