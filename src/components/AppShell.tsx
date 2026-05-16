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
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-[260px] border-r border-white/5 bg-[#0f0f10] p-6 lg:flex lg:flex-col">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300/80">
              LIMINULL
            </p>

            <h1 className="mt-3 text-2xl font-black tracking-[-0.08em] text-white">
              Operations
            </h1>

            <p className="mt-2 text-xs leading-5 text-white/35">
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
                    ? "block rounded-xl border border-cyan-300/10 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15"
                    : "block rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3 text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                }
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
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
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
              {eyebrow}
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.08em]">
              {title}
            </h1>

            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
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
