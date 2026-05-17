"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";

export default function SettingsPage() {
  const [notifications, setNotifications] =
    useState(true);

  const [supervision, setSupervision] =
    useState("supervised");

  return (
    <AppShell
      active="clients"
      eyebrow="Workspace Configuration"
      title="Settings"
      description="Configure operational supervision, notifications, branding, and workspace behavior."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="liminull-card p-6">
          <p className="liminull-eyebrow">
            Supervision
          </p>

          <h2 className="mt-3 text-2xl font-black tracking-[-0.06em]">
            Operational Oversight
          </h2>

          <div className="mt-6 space-y-3">
            {[
              ["supervised", "Human approval required"],
              ["semi_autonomous", "Low-risk automations enabled"],
            ].map(([id, desc]) => (
              <button
                key={id}
                onClick={() =>
                  setSupervision(id)
                }
                className={
                  supervision === id
                    ? "liminull-card p-5 text-left border-cyan-300/20"
                    : "liminull-card-soft p-5 text-left"
                }
              >
                <p className="text-lg font-black">
                  {id.replaceAll("_", " ")}
                </p>

                <p className="mt-3 text-sm liminull-muted">
                  {desc}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="liminull-card p-6">
          <p className="liminull-eyebrow">
            Notifications
          </p>

          <h2 className="mt-3 text-2xl font-black tracking-[-0.06em]">
            Operational Alerts
          </h2>

          <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
            <div>
              <p className="text-sm font-black">
                Live Notifications
              </p>

              <p className="mt-2 text-sm liminull-muted">
                Enable operational supervision alerts.
              </p>
            </div>

            <button
              onClick={() =>
                setNotifications(!notifications)
              }
              className={
                notifications
                  ? "h-8 w-14 rounded-full bg-cyan-300 p-1"
                  : "h-8 w-14 rounded-full bg-white/10 p-1"
              }
            >
              <div
                className={
                  notifications
                    ? "h-6 w-6 translate-x-6 rounded-full bg-black transition"
                    : "h-6 w-6 rounded-full bg-white transition"
                }
              />
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
