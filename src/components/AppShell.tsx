"use client";

import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import NotificationCenter from "@/components/NotificationCenter";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState("");

  async function loadNotifications() {
    try {
      const res = await fetch(`${API_URL}/api/notifications?business_id=demo-law-firm`, {
        cache: "no-store",
        headers: {
          "x-hermes-token": process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
          "x-hermes-role": "admin",
        },
      });

      const data = await res.json();
      setUnreadCount((data.notifications || []).length);
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

    const clockTimer = setInterval(updateClock, 1000);
    const timer = setInterval(loadNotifications, 10000);

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
    <main className="liminull-apple min-h-screen bg-background text-foreground liminull-grid-bg">
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/72 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/62">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-5">
          <a href="/operations" className="flex shrink-0 items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0071e3]/25">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white shadow-sm">
              L
            </span>
            <span className="text-[15px] font-semibold tracking-[-0.025em] text-[#1d1d1f]">
              Liminull Operations
            </span>
          </a>

          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-black/[0.035] p-1 liminull-scroll lg:flex-none">
            {nav.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={
                  active === item.id
                    ? "inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold tracking-[-0.01em] text-[#1d1d1f] shadow-[0_1px_10px_rgba(0,0,0,0.08)]"
                    : "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium tracking-[-0.01em] text-[#6e6e73] transition hover:bg-white/70 hover:text-[#1d1d1f]"
                }
              >
                <span>{item.label}</span>
                {item.id === "dashboard" && unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#0071e3] px-1.5 text-[11px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden rounded-full bg-white px-3 py-2 text-xs font-medium text-[#6e6e73] shadow-sm ring-1 ring-black/[0.04] md:flex">
              {currentTime || "--:--"}
            </div>
            <NotificationCenter />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">
        <section className="liminull-hero mb-7 overflow-hidden rounded-[34px] bg-[#1d1d1f] px-6 py-8 text-white shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:px-10 sm:py-11">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-sm font-medium text-white/55">{eyebrow}</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
                {title}
              </h1>
              {description && (
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
                  {description}
                </p>
              )}
            </div>

            <div className="grid gap-3 rounded-[24px] bg-white p-4 text-[#1d1d1f] shadow-[0_18px_60px_rgba(0,0,0,0.18)] ring-1 ring-white/20">
              <div className="flex items-center justify-between border-b border-black/[0.07] pb-3">
                <span className="text-sm font-medium text-[#6e6e73]">Status</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf8ee] px-3 py-1 text-xs font-semibold text-[#248a3d]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#248a3d]" />
                  Live
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-black/[0.07] pb-3">
                <span className="text-sm font-medium text-[#6e6e73]">Notifications</span>
                <span className="text-sm font-semibold text-[#1d1d1f]">{unreadCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#6e6e73]">Workspace</span>
                <span className="text-sm font-semibold text-[#1d1d1f]">Production</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">{children}</section>
      </div>

      <footer className="border-t border-black/[0.06] bg-white/44">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-4 py-5 text-xs text-[#6e6e73] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>Liminull Operations</span>
          <div className="flex items-center gap-4">
            <span>Operational intelligence</span>
            <LogoutButton />
          </div>
        </div>
      </footer>
    </main>
  );
}
