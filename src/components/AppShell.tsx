"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import NotificationCenter from "@/components/NotificationCenter";
import { buildFeedbackMailto } from "@/lib/pilotWorkspace";

const API_URL = "/api/hermes";


function formatHeaderTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppShell({
  active = "dashboard",
  title,
  eyebrow,
  description,
  businessId = "demo-law-firm",
  children,
}: {
  active?: "dashboard" | "clients" | "leads" | "onboarding" | "settings" | "intelligence";
  title: string;
  eyebrow: string;
  description?: string;
  businessId?: string;
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [currentPath, setCurrentPath] = useState<string>(active);

  const loadNotifications = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    try {
      const res = await fetch(`${API_URL}/api/notifications?business_id=${encodeURIComponent(businessId)}`, {
        cache: "no-store",
        headers: {
          "x-hermes-role": "admin",
        },
      });

      const data = await res.json();
      setUnreadCount((data.notifications || []).length);
    } catch {
      setUnreadCount(0);
    }
  }, [businessId]);

  useEffect(() => {
    setCurrentPath(window.location.pathname);

    const updateClock = () => {
      setCurrentTime(
        formatHeaderTime()
      );
    };

    updateClock();
    queueMicrotask(() => void loadNotifications());

    const clockTimer = setInterval(updateClock, 30000);
    const notificationTimer = setInterval(() => void loadNotifications(), 30000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateClock();
        void loadNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(notificationTimer);
      clearInterval(clockTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadNotifications]);

  const nav = useMemo(() => [
    { id: "dashboard", label: "Dashboard", href: "/operations" },
    { id: "clients", label: "Clients", href: "/businesses" },
    { id: "leads", label: "Lead Scraper", href: "/leads" },
    { id: "onboarding", label: "Onboarding", href: "/onboarding" },
    { id: "settings", label: "Settings", href: "/settings" },
    { id: "intelligence", label: "Intelligence", href: "/brain" },
  ], []);

  return (
    <main className="liminull-apple relative min-h-screen bg-background text-foreground liminull-grid-bg">
      <header className="relative z-50 border-b border-white/70 bg-white/92 shadow-sm">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-3 px-3 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-5">
          <div className="flex min-w-0 items-center justify-between gap-3 lg:contents">
          <a href="/operations" className="flex min-h-11 min-w-0 shrink items-center gap-3 rounded-full pr-2 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/25 lg:shrink-0">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#030712] shadow-sm ring-1 ring-black/[0.08]">
              <Image
                src="/assets/liminull-logo.png"
                alt="Liminull logo"
                width={36}
                height={36}
                priority
                sizes="36px"
                className="h-full w-full object-cover"
              />
            </span>
            <span className="truncate text-[15px] font-semibold tracking-[-0.025em] text-[#1d1d1f]">
              Liminull Operations
            </span>
          </a>

          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <NotificationCenter businessId={businessId} />
          </div>
          </div>

          <nav aria-label="Primary navigation" className="-mx-1 flex min-w-0 scroll-px-2 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-full bg-black/[0.035] p-1 liminull-scroll sm:mx-0 lg:flex-none">
            {nav.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={
                  active === item.id
                    ? "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] text-[#1d1d1f] shadow-[0_1px_10px_rgba(0,0,0,0.08)]"
                    : "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium tracking-[-0.01em] text-[#6e6e73] transition hover:bg-white/70 hover:text-[#1d1d1f]"
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

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <a
              href={buildFeedbackMailto({
                businessId,
                page: currentPath,
              })}
              className="hidden rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#1d1d1f] shadow-sm ring-1 ring-black/[0.04] transition hover:bg-[#eaf4ff] md:inline-flex"
            >
              Send feedback
            </a>
            <div className="hidden rounded-full bg-white px-3 py-2 text-xs font-medium text-[#6e6e73] shadow-sm ring-1 ring-black/[0.04] md:flex">
              {currentTime || "--:--"}
            </div>
            <NotificationCenter businessId={businessId} />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-3 py-4 sm:px-6 sm:py-6">
        <section className="liminull-hero liminull-abstract-hero liminull-compact-hero mb-5 overflow-hidden rounded-[24px] bg-[#1d1d1f] px-4 py-5 text-white shadow-[0_22px_64px_rgba(0,0,0,0.13)] sm:rounded-[26px] sm:px-7 sm:py-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-medium text-white/55">{eyebrow}</p>
              <h1 className="mt-2 max-w-3xl text-[clamp(1.8rem,8vw,2.35rem)] font-semibold leading-[1.02] tracking-[-0.052em] sm:text-5xl sm:leading-[0.98]">
                {title}
              </h1>
              {description && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
                  {description}
                </p>
              )}
            </div>

            <div className="liminull-glass-panel liminull-field-card grid min-w-0 gap-3 rounded-[20px] bg-white p-3 text-[#1d1d1f] shadow-[0_14px_44px_rgba(0,0,0,0.16)] ring-1 ring-white/20">
              <div className="flex items-center justify-between border-b border-black/[0.07] pb-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#6e6e73]">Signal field</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#eaf8ee] px-3 py-1 text-xs font-semibold text-[#248a3d]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#248a3d]" />
                  Live
                </span>
              </div>
              <div className="liminull-field-map" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="grid min-w-0 grid-cols-3 gap-2">
                <div className="liminull-micro-tile"><p>{unreadCount}</p><span>alerts</span></div>
                <div className="liminull-micro-tile"><p>PRD</p><span>workspace</span></div>
                <div className="liminull-micro-tile"><p>ON</p><span>runtime</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">{children}</section>
      </div>

      <footer className="relative z-10 border-t border-white/70 bg-white/86">
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
