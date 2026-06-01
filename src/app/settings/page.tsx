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

type TeamAccount = AccountUser & {
  emailConfirmed?: boolean;
};

type TeamDraft = {
  name: string;
  role: "admin" | "employee";
  password: string;
};

type TeamCreateDraft = TeamDraft & {
  email: string;
};

function generateTemporaryPassword() {
  const random = Math.random().toString(36).slice(2, 10);
  return `Liminull-${random}-25!`;
}

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
  const [teamAccounts, setTeamAccounts] = useState<TeamAccount[]>([]);
  const [teamDrafts, setTeamDrafts] = useState<Record<string, TeamDraft>>({});
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSavingId, setTeamSavingId] = useState<string | null>(null);
  const [teamCreating, setTeamCreating] = useState(false);
  const [newTeamDraft, setNewTeamDraft] = useState<TeamCreateDraft>(() => ({
    email: "",
    name: "",
    role: "employee",
    password: generateTemporaryPassword(),
  }));
  const [teamMessage, setTeamMessage] = useState("");
  const [teamError, setTeamError] = useState("");
  const isAdmin = account?.role === "admin";

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

  async function loadTeamAccounts() {
    setTeamLoading(true);
    setTeamError("");
    try {
      const response = await fetch("/api/team", { cache: "no-store" });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || "Unable to load team accounts.");
      }

      const accounts = (data.accounts || []) as TeamAccount[];
      setTeamAccounts(accounts);
      setTeamDrafts(Object.fromEntries(accounts.map((teamAccount) => [
        teamAccount.id,
        {
          name: teamAccount.name || "",
          role: teamAccount.role === "admin" ? "admin" : "employee",
          password: "",
        },
      ])));
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Unable to load team accounts.");
    } finally {
      setTeamLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin) {
      queueMicrotask(() => void loadTeamAccounts());
    }
  }, [isAdmin]);

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

  function updateTeamDraft(id: string, patch: Partial<TeamDraft>) {
    setTeamDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || { name: "", role: "employee", password: "" }), ...patch },
    }));
  }

  function updateNewTeamDraft(patch: Partial<TeamCreateDraft>) {
    setNewTeamDraft((current) => ({ ...current, ...patch }));
  }

  async function createTeamAccount(e: React.FormEvent) {
    e.preventDefault();
    setTeamCreating(true);
    setTeamError("");
    setTeamMessage("");
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: newTeamDraft.email.trim(),
          name: newTeamDraft.name.trim(),
          role: newTeamDraft.role,
          password: newTeamDraft.password,
        }),
      });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || "Employee creation failed.");
      }

      setTeamMessage(`${newTeamDraft.name.trim() || newTeamDraft.email.trim()} added to Supabase Auth.`);
      setNewTeamDraft({ email: "", name: "", role: "employee", password: generateTemporaryPassword() });
      await loadTeamAccounts();
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Employee creation failed.");
    } finally {
      setTeamCreating(false);
    }
  }

  async function saveTeamAccount(teamAccount: TeamAccount) {
    const draft = teamDrafts[teamAccount.id];
    if (!draft) return;

    setTeamSavingId(teamAccount.id);
    setTeamError("");
    setTeamMessage("");
    try {
      const payload: { id: string; name?: string; role?: "admin" | "employee"; password?: string } = { id: teamAccount.id };
      if ((teamAccount.name || "") !== draft.name.trim()) payload.name = draft.name.trim();
      if ((teamAccount.role || "employee") !== draft.role) {
        payload.role = draft.role;
        payload.name = draft.name.trim();
      }
      if (draft.password) payload.password = draft.password;

      if (!payload.name && !payload.role && !payload.password) {
        setTeamMessage("No team changes to save.");
        return;
      }

      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.ok) {
        throw new Error(data.error || "Team update failed.");
      }

      setTeamMessage(`${draft.name.trim() || teamAccount.email} updated.`);
      await loadTeamAccounts();
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Team update failed.");
    } finally {
      setTeamSavingId(null);
    }
  }

  const teamSummary = useMemo(() => ({
    admins: teamAccounts.filter((teamAccount) => teamAccount.role === "admin").length,
    employees: teamAccounts.filter((teamAccount) => teamAccount.role !== "admin").length,
    unconfirmed: teamAccounts.filter((teamAccount) => !teamAccount.emailConfirmed).length,
  }), [teamAccounts]);

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

        {isAdmin && (
          <section className="liminull-card p-6 xl:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="liminull-eyebrow">Admin Team</p>
                <h2 className="mt-3 text-2xl font-black tracking-[-0.06em]">Authenticated Users</h2>
                <p className="mt-3 text-sm leading-6 liminull-muted">
                  Manage Supabase display names, dashboard roles, and temporary passwords without leaving the dashboard.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-center text-xs">
                <div><p className="text-xl font-black text-white">{teamSummary.employees}</p><p className="mt-1 text-white/40">employees</p></div>
                <div><p className="text-xl font-black text-white">{teamSummary.admins}</p><p className="mt-1 text-white/40">admins</p></div>
                <div><p className="text-xl font-black text-white">{teamSummary.unconfirmed}</p><p className="mt-1 text-white/40">unconfirmed</p></div>
              </div>
            </div>

            {(teamMessage || teamError) && (
              <div className={teamError ? "mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100" : "mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-100"}>
                {teamError || teamMessage}
              </div>
            )}

            <form onSubmit={createTeamAccount} className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-white">Add employee</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">Creates a Supabase Auth user with dashboard role metadata and a temporary password.</p>
                </div>
                <button type="button" onClick={() => updateNewTeamDraft({ password: generateTemporaryPassword() })} className="w-fit rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-white/75 transition hover:border-cyan-300/30 hover:text-cyan-50">
                  Generate password
                </button>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_0.7fr_1fr_auto] lg:items-end">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Name</span>
                  <input value={newTeamDraft.name} onChange={(event) => updateNewTeamDraft({ name: event.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10" placeholder="Employee name" required />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Email</span>
                  <input type="email" value={newTeamDraft.email} onChange={(event) => updateNewTeamDraft({ email: event.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10" placeholder="name@company.com" required />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Role</span>
                  <select value={newTeamDraft.role} onChange={(event) => updateNewTeamDraft({ role: event.target.value === "admin" ? "admin" : "employee" })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10">
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Temp password</span>
                  <input value={newTeamDraft.password} onChange={(event) => updateNewTeamDraft({ password: event.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10" placeholder="Temporary password" required minLength={8} />
                </label>
                <button className="liminull-button px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={teamCreating}>
                  {teamCreating ? "Adding..." : "Add user"}
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                {teamLoading ? "Loading team accounts..." : `${teamAccounts.length} authenticated accounts`}
              </p>
              <button type="button" onClick={() => void loadTeamAccounts()} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-bold text-white/70 transition hover:border-cyan-300/30 hover:text-cyan-50">
                Refresh team
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {teamAccounts.map((teamAccount) => {
                const draft = teamDrafts[teamAccount.id] || { name: teamAccount.name || "", role: teamAccount.role === "admin" ? "admin" : "employee", password: "" };
                const savingThisAccount = teamSavingId === teamAccount.id;
                return (
                  <article key={teamAccount.id} className="rounded-3xl border border-white/5 bg-black/20 p-4">
                    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.9fr_1.1fr_auto] lg:items-end">
                      <div>
                        <p className="text-sm font-black text-white">{teamAccount.name || "Unnamed user"}</p>
                        <p className="mt-1 text-xs text-white/45">{teamAccount.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={teamAccount.role === "admin" ? "rounded-full border border-violet-300/35 bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase text-violet-800 shadow-sm" : "rounded-full border border-blue-300/35 bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700 shadow-sm"}>{teamAccount.role === "admin" ? "admin" : "employee"}</span>
                          <span className={teamAccount.emailConfirmed ? "rounded-full border border-emerald-300/40 bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800 shadow-sm" : "rounded-full border border-amber-300/45 bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800 shadow-sm"}>{teamAccount.emailConfirmed ? "confirmed" : "needs confirmation"}</span>
                        </div>
                      </div>

                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Display name</span>
                        <input value={draft.name} onChange={(event) => updateTeamDraft(teamAccount.id, { name: event.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10" placeholder="Employee name" />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Role</span>
                          <select value={draft.role} onChange={(event) => updateTeamDraft(teamAccount.id, { role: event.target.value === "admin" ? "admin" : "employee" })} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10">
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Temp password</span>
                          <div className="mt-2 flex gap-2">
                            <input value={draft.password} onChange={(event) => updateTeamDraft(teamAccount.id, { password: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/40 focus:ring-4 focus:ring-cyan-300/10" placeholder="Optional reset" />
                            <button type="button" onClick={() => updateTeamDraft(teamAccount.id, { password: generateTemporaryPassword() })} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 text-xs font-bold text-white/65">Generate</button>
                          </div>
                        </label>
                      </div>

                      <button type="button" onClick={() => void saveTeamAccount(teamAccount)} disabled={savingThisAccount} className="liminull-button px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60">
                        {savingThisAccount ? "Saving..." : "Save user"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

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
