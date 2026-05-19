"use client";

import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import NotificationCenter from "@/components/NotificationCenter";

const API_URL = "/api/hermes";

export default function AppShell({
  active = "dashboard",
  title,
  eyebrow,
  description,
  children,
}: {
  active?: "dashboard" | "clients" | "onboarding" | "settings" | "intelligence";
  title: string;
  eyebrow: string;
  description?: string;
  children: React.ReactNode;
}) {

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [currentTime, setCurrentTime] =
    useState("");

  async function loadNotifications() {
    try {

      const res = await fetch(
        `${API_URL}/api/notifications?business_id=demo-law-firm`,
        {
          cache: "no-store",

          headers: {
            "x-hermes-role":
              "admin",
          },
        }
      );

      const data =
        await res.json();

      setUnreadCount(
        (data.notifications || []).length
      );

    } catch {
      setUnreadCount(0);
    }
  }

  useEffect(() => {
    loadNotifications();

    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    updateClock();

    const clockTimer =
      setInterval(updateClock, 1000);

    const timer =
      setInterval(
        loadNotifications,
        10000
      );

    return () => {
      clearInterval(timer);
      clearInterval(clockTimer);
    };

  }, []);
  const nav = [
    { id: "dashboard", label: "Dashboard", href: "/operations" },
    { id: "clients", label: "Clients", href: "/businesses" },
    { id: "onboarding", label: "Onboarding", href: "/onboarding" },
    { id: "settings", label: "Settings", href: "/settings" },
    { id: "intelligence", label: "Intelligence", href: "/brain" },
  ];

  return (
    <main className="min-h-screen bg-[#090909] text-white liminull-grid-bg">
      <div className="flex min-h-screen">
        <aside className="hidden w-[268px] border-r border-white/5 bg-[#0d0d0e]/95 p-6 backdrop-blur-xl lg:flex lg:flex-col">
          <div>
            <p className="liminull-eyebrow">LIMINULL</p>

            <h1 className="mt-3 text-2xl font-black tracking-[-0.08em]">
              Operations
            </h1>

            <p className="mt-2 text-xs leading-5 liminull-muted">
              Operational intelligence for active business workflows.
            </p>
          </div>

          <nav className="mt-8 space-y-3">
            {nav.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={
                  active === item.id
                    ? "flex items-center justify-between rounded-2xl border border-cyan-300/10 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_40px_rgba(103,232,249,0.06)]"
                    : "flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
                }
              >
                <span>{item.label}</span>

                {item.id === "dashboard" && unreadCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cyan-300 px-1 text-[10px] font-black text-black">
                    {unreadCount}
                  </span>
                )}
              </a>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="liminull-card-soft p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/30">
                Workspace
              </p>
              <p className="mt-2 text-sm font-semibold text-white/80">
                Liminull
              </p>
              <p className="mt-1 text-xs text-white/35">
                Production monitor
              </p>
            </div>

            <LogoutButton />
          </div>
        </aside>

        <section className="flex-1 p-6 lg:p-10">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
            <p className="liminull-eyebrow">{eyebrow}</p>

            <h1 className="mt-2 text-5xl font-black tracking-[-0.09em]">
              {title}
            </h1>

            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 liminull-muted">
                {description}
              </p>
            )}
            </div>

            <NotificationCenter />
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.025] px-5 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-300 animate-pulse" />

                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-300">
                    Live
                  </p>

                  <p className="text-xs text-white/60">
                    Operationally synced
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                  Notifications
                </p>

                <p className="mt-1 text-sm font-black">
                  {unreadCount}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                Local Time
              </p>

              <p className="mt-1 text-sm font-black">
                {currentTime}
              </p>
            </div>
          </div>


          {children}
        </section>
      </div>
    </main>
  );
}
