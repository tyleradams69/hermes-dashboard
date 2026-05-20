"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  defaultWorkspaceSettings,
  parseWorkspaceSettings,
  serializeWorkspaceSettings,
  workspaceSettingsKey,
  type WorkspaceSettings,
} from "@/lib/pilotWorkspace";

export default function SettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultWorkspaceSettings);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setSettings(parseWorkspaceSettings(window.localStorage.getItem(workspaceSettingsKey)));
  }, []);

  function saveSettings(nextSettings: WorkspaceSettings) {
    setSettings(nextSettings);
    window.localStorage.setItem(workspaceSettingsKey, serializeWorkspaceSettings(nextSettings));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }

  const supervisionOptions = useMemo(
    () => [
      ["supervised", "Human approval required", "Best default for pilots and client-facing automations."],
      ["semi_autonomous", "Low-risk automations enabled", "Use only after pilot workflow boundaries are clear."],
    ] as const,
    []
  );

  return (
    <AppShell
      active="settings"
      eyebrow="Workspace Configuration"
      title="Settings"
      description="Configure operational supervision, notifications, pilot reminders, and workspace behavior."
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="liminull-card p-6">
          <p className="liminull-eyebrow">Supervision</p>

          <h2 className="mt-3 text-2xl font-black tracking-[-0.06em]">
            Operational Oversight
          </h2>

          <p className="mt-3 text-sm leading-6 liminull-muted">
            These settings persist in this dashboard browser so pilot demos keep the same operating posture between sessions.
          </p>

          <div className="mt-6 space-y-3">
            {supervisionOptions.map(([id, title, desc]) => (
              <button
                key={id}
                onClick={() => saveSettings({ ...settings, supervision: id })}
                className={
                  settings.supervision === id
                    ? "liminull-card p-5 text-left border-cyan-300/20"
                    : "liminull-card-soft p-5 text-left"
                }
              >
                <p className="text-lg font-black">{title}</p>
                <p className="mt-3 text-sm liminull-muted">{desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="liminull-card p-6">
          <p className="liminull-eyebrow">Pilot Controls</p>

          <h2 className="mt-3 text-2xl font-black tracking-[-0.06em]">
            Alerts & Follow-up
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
              <div>
                <p className="text-sm font-black">Live Notifications</p>
                <p className="mt-2 text-sm liminull-muted">
                  Enable operational supervision alerts during pilot reviews.
                </p>
              </div>

              <button
                onClick={() => saveSettings({ ...settings, notifications: !settings.notifications })}
                className={
                  settings.notifications
                    ? "h-8 w-14 rounded-full bg-cyan-300 p-1"
                    : "h-8 w-14 rounded-full bg-white/10 p-1"
                }
                aria-label="Toggle live notifications"
              >
                <div
                  className={
                    settings.notifications
                      ? "h-6 w-6 translate-x-6 rounded-full bg-black transition"
                      : "h-6 w-6 rounded-full bg-white transition"
                  }
                />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
              <div>
                <p className="text-sm font-black">Weekly Pilot Digest</p>
                <p className="mt-2 text-sm liminull-muted">
                  Keep a standing reminder to package wins, blockers, and next actions for each pilot.
                </p>
              </div>

              <button
                onClick={() => saveSettings({ ...settings, weeklyDigest: !settings.weeklyDigest })}
                className={
                  settings.weeklyDigest
                    ? "h-8 w-14 rounded-full bg-cyan-300 p-1"
                    : "h-8 w-14 rounded-full bg-white/10 p-1"
                }
                aria-label="Toggle weekly pilot digest"
              >
                <div
                  className={
                    settings.weeklyDigest
                      ? "h-6 w-6 translate-x-6 rounded-full bg-black transition"
                      : "h-6 w-6 rounded-full bg-white transition"
                  }
                />
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-300/10 bg-cyan-300/10 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-100">Saved state</p>
            <p className="mt-2 text-sm text-white/70">
              {savedAt ? `Settings saved at ${savedAt}.` : "Settings are ready. Change a control to save this browser's pilot defaults."}
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
