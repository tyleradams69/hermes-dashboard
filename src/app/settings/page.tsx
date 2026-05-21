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

type AccountUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettings>(() =>
    typeof window === "undefined"
      ? defaultWorkspaceSettings
      : parseWorkspaceSettings(window.localStorage.getItem(workspaceSettingsKey))
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch("/api/account", { cache: "no-store" });
        const data = await response.json();
        if (data.ok) {
          setAccount(data.user);
          setName(data.user.name || "");
        }
      } catch {
        setAccountError("Unable to load account details.");
      }
    }

    loadAccount();
  }, []);

  function saveSettings(nextSettings: WorkspaceSettings) {
    setSettings(nextSettings);
    window.localStorage.setItem(workspaceSettingsKey, serializeWorkspaceSettings(nextSettings));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }

  async function updateAccount(payload: { name?: string; password?: string }) {
    setAccountError("");
    setAccountMessage("");

    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Account update failed");
    }

    setAccount(data.user);
    setName(data.user.name || "");
    return data.user as AccountUser;
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      await updateAccount({ name });
      setAccountMessage("Name updated.");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Name update failed.");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await updateAccount({ password });
      setPassword("");
      setAccountMessage("Password updated.");
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Password update failed.");
    } finally {
      setSavingPassword(false);
    }
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
        <section className="liminull-card p-6 xl:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="liminull-eyebrow">Employee Account</p>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.06em]">
                Profile & Password
              </h2>
              <p className="mt-3 text-sm leading-6 liminull-muted">
                Update the name shown in your Liminull session or rotate your Supabase login password.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4 text-sm">
              <p className="font-black text-white">{account?.name || "Signed in employee"}</p>
              <p className="mt-2 liminull-muted">{account?.email || "Loading account..."}</p>
            </div>
          </div>

          {(accountMessage || accountError) && (
            <div
              className={
                accountError
                  ? "mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
                  : "mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100"
              }
            >
              {accountError || accountMessage}
            </div>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <form onSubmit={saveName} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <p className="text-sm font-black">Display name</p>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <button className="liminull-button mt-4 px-5 py-3 text-sm" disabled={savingName}>
                {savingName ? "Saving name..." : "Update name"}
              </button>
            </form>

            <form onSubmit={savePassword} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <p className="text-sm font-black">Password</p>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10"
                />
              </label>
              <button className="liminull-button mt-4 px-5 py-3 text-sm" disabled={savingPassword}>
                {savingPassword ? "Updating password..." : "Update password"}
              </button>
            </form>
          </div>
        </section>

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
