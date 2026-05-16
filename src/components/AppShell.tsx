"use client";

import LogoutButton from "@/components/LogoutButton";

export default function AppShell({
  active = "dashboard",
  title,
  eyebrow,
  description,
  children,
}: {
  active?: "dashboard" | "clients" | "intelligence";
  title: string;
  eyebrow: string;
  description?: string;
  children: React.ReactNode;
}) {
  const nav = [
    { id: "dashboard", label: "Dashboard", href: "/operations" },
    { id: "clients", label: "Clients", href: "/businesses" },
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
                    ? "block rounded-2xl border border-cyan-300/10 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-[0_0_40px_rgba(103,232,249,0.06)]"
                    : "block rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"
                }
              >
                {item.label}
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
          <div className="mb-8">
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

          {children}
        </section>
      </div>
    </main>
  );
}
