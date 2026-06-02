"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = "/api/hermes";

type NotificationItem = {
  id: string;
  title?: string;
  message?: string;
  priority?: string;
};

export default function NotificationCenter({
  businessId = "demo-law-firm",
}: {
  businessId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const load = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    try {
      const res = await fetch(
        `${API_URL}/api/notifications?business_id=${encodeURIComponent(businessId)}`,
        {
          cache: "no-store",

          headers: {
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
  }, [businessId]);

  async function markRead(id: string) {
    await fetch(
      `${API_URL}/api/notifications/${id}/read`,
      {
        method: "POST",

        headers: {
          "x-hermes-role":
            "admin",
        },
      }
    );

    void load();
  }

  useEffect(() => {
    queueMicrotask(() => void load());

    const timer =
      setInterval(load, 10000);

    return () =>
      clearInterval(timer);
  }, [load]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="relative inline-flex min-h-11 items-center rounded-full bg-white px-3.5 py-2.5 text-xs font-semibold tracking-[-0.01em] text-[#1d1d1f] shadow-sm ring-1 ring-black/[0.05] transition hover:bg-[#eaf4ff] sm:px-4 sm:text-sm"
      >
        Notifications

        {notifications.length > 0 && (
          <span className="absolute -right-1.5 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#248a3d] px-1 text-[10px] font-semibold text-white shadow-[0_8px_22px_rgba(36,138,61,0.28)] sm:h-6 sm:min-w-6">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+8.5rem)] z-[80] flex max-h-[min(64vh,500px)] flex-col overflow-hidden rounded-3xl border border-black/[0.08] bg-white/96 text-[#1d1d1f] shadow-[0_30px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-[min(420px,calc(100vw-2rem))] sm:max-h-[min(72vh,560px)]">
          <div className="border-b border-black/[0.07] p-4 sm:p-5">
            <p className="liminull-eyebrow">
              Notification Center
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#1d1d1f]">
              Operational Alerts
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto liminull-scroll p-3 sm:p-4">
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1d1d1f]">
                        {notification.title}
                      </p>

                      <p className="mt-2 text-sm leading-6 liminull-muted [overflow-wrap:anywhere]">
                        {notification.message}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-[#0071e3]/10 bg-[#eaf4ff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0071e3]">
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
