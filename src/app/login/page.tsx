"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/operations");
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="liminull-apple liminull-abstract-stage relative min-h-screen overflow-hidden bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,1),transparent_32rem),radial-gradient(circle_at_82%_18%,rgba(0,113,227,0.10),transparent_24rem),linear-gradient(180deg,#ffffff_0%,#f5f5f7_46%,#efeff3_100%)]" />
      <div className="liminull-abstract-composition" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="liminull-particle-field" aria-hidden="true">
        {[
          ["12%", "72%", "4px", "10s", "-2s", "14px"],
          ["24%", "48%", "2px", "12s", "-6s", "-10px"],
          ["42%", "78%", "5px", "9s", "-4s", "20px"],
          ["64%", "36%", "3px", "11s", "-7s", "-16px"],
          ["78%", "70%", "4px", "13s", "-5s", "18px"],
          ["90%", "44%", "2px", "10.5s", "-8s", "-12px"],
          ["8%", "30%", "3px", "14s", "-9s", "22px"],
          ["34%", "20%", "2px", "9.5s", "-4s", "-16px"],
          ["56%", "88%", "5px", "15s", "-11s", "18px"],
          ["86%", "18%", "3px", "11.5s", "-7s", "-20px"],
        ].map(([x, y, s, d, delay, drift], index) => (
          <span
            key={index}
            style={
              {
                "--x": x,
                "--y": y,
                "--s": s,
                "--d": d,
                "--delay": delay,
                "--particle-drift": drift,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Floating artifacts */}
      <div className="pointer-events-none absolute -left-10 top-[8%] hidden h-28 w-28 rotate-[-14deg] rounded-[30px] border border-white/70 bg-white/35 shadow-[0_30px_90px_rgba(0,0,0,0.08)] backdrop-blur-2xl md:block liminull-artifact-float" />
      <div className="pointer-events-none absolute right-[10%] top-[16%] h-24 w-24 rotate-[18deg] rounded-full border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(0,113,227,0.16))] shadow-[0_24px_80px_rgba(0,113,227,0.18)] backdrop-blur-xl liminull-artifact-float-delayed" />
      <div className="pointer-events-none absolute bottom-[12%] left-[16%] hidden h-24 w-44 rotate-[9deg] rounded-[999px] border border-white/70 bg-white/45 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-2xl lg:block liminull-artifact-float-slow" />
      <div className="pointer-events-none absolute bottom-[18%] right-[18%] h-20 w-20 rotate-45 rounded-[24px] bg-[#1d1d1f] shadow-[0_30px_90px_rgba(0,0,0,0.22)] liminull-artifact-float" />

      <section className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1180px] items-center gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="hidden lg:block lg:-mt-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#0071e3] shadow-sm ring-1 ring-black/[0.05] backdrop-blur-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[#248a3d]" />
            Secure operator access
          </div>

          <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-[-0.06em] text-[#1d1d1f] xl:text-6xl">
            Enter the Liminull operations layer.
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-8 text-[#6e6e73]">
            A clean command surface for live workflows, client intelligence,
            queue health, recovery paths, and executive supervision.
          </p>

          <div className="liminull-signal-plate mt-8 hidden max-w-xl p-5 xl:block">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#0071e3]">Field state</p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-[#6e6e73]">
                  Operator access sits inside a living command field — client memory,
                  worker pressure, recovery vectors, and private execution traces.
                </p>
              </div>
              <div className="liminull-mini-orbit" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                ["LIVE", "watch"],
                ["NULL", "private"],
                ["SYNC", "memory"],
              ].map(([label, detail]) => (
                <div key={label} className="liminull-micro-tile">
                  <p>{label}</p>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[430px]">
          <div className="liminull-glass-panel relative overflow-hidden rounded-[34px] bg-white/86 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06] backdrop-blur-2xl sm:p-7">
            <div className="pointer-events-none !absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#0071e3]/12 blur-3xl" />
            <div className="pointer-events-none !absolute -bottom-24 left-8 h-48 w-48 rounded-full bg-[#34c759]/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_16px_42px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06]">
                  <Image
                    src="/assets/liminull-real-logo.png"
                    alt="Liminull"
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    priority
                  />
                </div>
                <div className="rounded-full bg-[#eaf8ee] px-3 py-1.5 text-xs font-semibold text-[#248a3d]">
                  Secure employee auth
                </div>
              </div>

              <p className="mt-5 text-sm font-medium text-[#6e6e73]">Liminull</p>
              <h2 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-[#1d1d1f]">
                Operator login
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#6e6e73]">
                Authenticate with your Liminull employee account to enter the private operations workspace.
              </p>

              <form onSubmit={login} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#6e6e73]">
                    Employee email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@liminull.com"
                    autoComplete="email"
                    className="w-full rounded-full border border-black/[0.08] bg-[#f5f5f7]/90 px-5 py-4 text-[15px] font-medium text-[#1d1d1f] outline-none shadow-inner placeholder:text-[#86868b] transition focus:border-[#0071e3]/45 focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#6e6e73]">
                    Password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full rounded-full border border-black/[0.08] bg-[#f5f5f7]/90 px-5 py-4 text-[15px] font-medium text-[#1d1d1f] outline-none shadow-inner placeholder:text-[#86868b] transition focus:border-[#0071e3]/45 focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10"
                  />
                </label>

                {error && (
                  <div className="rounded-[22px] border border-[#d70015]/15 bg-[#fff2f4] p-4 text-sm font-medium text-[#d70015]">
                    {error}
                  </div>
                )}

                <button className="liminull-button w-full py-4 text-[15px]" disabled={loading}>
                  {loading ? "Authenticating..." : "Enter workspace"}
                </button>
              </form>

              <div className="mt-5 rounded-[22px] bg-[#f5f5f7] p-4 ring-1 ring-black/[0.04]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#6e6e73]">Session scope</p>
                  <p className="text-sm font-semibold text-[#1d1d1f]">Local only</p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#34c759] via-[#0071e3] to-[#5856d6]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
