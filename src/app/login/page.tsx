"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function move(e: MouseEvent) {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    }

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  async function login() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Login failed");
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        router.push("/");
      }, 900);
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          12% { opacity: 0.65; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.54; filter: blur(0px); }
          50% { opacity: 0.88; filter: blur(0.6px); }
        }

        @keyframes drift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -14px, 0); }
        }

        @keyframes noiseShift {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-2%, 1%); }
          40% { transform: translate(1%, -2%); }
          60% { transform: translate(-1%, 2%); }
          80% { transform: translate(2%, -1%); }
          100% { transform: translate(0, 0); }
        }

        @keyframes accessFlash {
          0% { opacity: 0; transform: scale(0.98); }
          28% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }

        .artifact-drift {
          animation: drift 7s ease-in-out infinite, pulseGlow 4.5s ease-in-out infinite;
        }

        .scanline-pass {
          animation: scan 4.8s linear infinite;
        }

        .noise-layer {
          animation: noiseShift 0.28s steps(2) infinite;
        }

        .access-flash {
          animation: accessFlash 0.9s ease-out forwards;
        }
      `}</style>

      {success && (
        <div className="access-flash pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-cyan-300/10 backdrop-blur-sm">
          <div className="border border-cyan-200 bg-black/80 px-10 py-8 text-center shadow-[0_0_120px_rgba(103,232,249,0.55)]">
            <p className="text-xs uppercase tracking-[0.38em] text-cyan-200">
              ACCESS GRANTED
            </p>
            <p className="mt-3 text-5xl font-black uppercase tracking-[-0.08em] text-white">
             SPIRE LINK ESTABLISHED
            </p>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none fixed h-[360px] w-[360px] rounded-full bg-cyan-300/10 blur-3xl"
        style={{
          left: `calc(50% + ${mouse.x * 220}px)`,
          top: `calc(50% + ${mouse.y * 160}px)`,
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/assets/liminull_alien_spire_poster.png"
          className="artifact-drift absolute inset-0 h-full w-full object-cover opacity-80"
          style={{
            transform: `translate3d(${mouse.x * -14}px, ${mouse.y * -10}px, 0) scale(1.035)`,
          }}
        >
          <source src="/assets/liminull_alien_spire.webm" type="video/webm" />
          <source src="/assets/liminull_alien_spire.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.82)_74%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:54px_54px]" />

        <div className="noise-layer absolute -inset-8 opacity-[0.055] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:13px_13px]" />

        <div className="scanline-pass absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-transparent via-cyan-200/12 to-transparent" />

        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_4px)] opacity-25" />
      </div>

      <section className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_460px]">
        <div className="flex flex-col justify-between p-8 lg:p-16">
          <div>
            <div className="mb-6 flex items-center gap-4">
              <img
                src="/assets/logo-header.svg"
                alt="Liminull"
                className="h-14 w-14 border border-white/10 bg-black/50 p-2 backdrop-blur-xl"
              />

              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-cyan-200">
                  LIMINULL / OPERATOR VIEW
                </p>

                <p className="mt-1 text-xs uppercase tracking-[0.28em] text-white/35">
                  LIVE SYSTEM ACCESS GATE
                </p>
              </div>
            </div>

            <h1
              className="max-w-4xl text-7xl font-black uppercase leading-[0.8] tracking-[-0.1em] md:text-8xl lg:text-9xl"
              style={{
                transform: `translate3d(${mouse.x * 6}px, ${mouse.y * 4}px, 0)`,
              }}
            >
              Enter
              <br />
              The
              <br />
              Spire.
            </h1>

            <p className="mt-8 max-w-xl text-sm leading-7 text-white/50">
              Hermes Control is the operational layer between outbound,
              lifecycle orchestration, reply intelligence, pipeline state,
              follow-up memory, and human operator approval.
            </p>

            <div className="mt-8 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/70">
              {[
                "Reply Memory",
                "Lead Capture",
                "Pipeline State",
                "Operator Approval",
                "Lifecycle Intelligence"
              ].map((item) => (
                <span
                  key={item}
                  className="border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 backdrop-blur-xl transition hover:bg-cyan-300/20"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-12 hidden max-w-lg border border-white/10 bg-black/40 p-5 backdrop-blur-xl lg:block">
            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
              <p className="text-xs uppercase tracking-[0.28em] text-white/45">
                SPIRE 01
              </p>

              <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200">
                LIVE
              </p>
            </div>

            <div className="space-y-3 text-sm text-white/70">
              {[
                ["Signal", "Operator Access"],
                ["Status", "Awaiting Auth"],
                ["System", "Hermes Control"],
                ["Route", "Dashboard Core"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span>{label}</span>
                  <span className="text-cyan-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center border-l border-white/10 bg-black/45 p-8 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_42%)]" />

          <div
            className="relative w-full max-w-md border border-cyan-300/20 bg-black/65 p-8 shadow-[0_0_90px_rgba(34,211,238,0.16)] backdrop-blur-2xl"
            style={{
              transform: `translate3d(${mouse.x * -5}px, ${mouse.y * -4}px, 0)`,
            }}
          >
            <div className="mb-8 flex items-start justify-between border-b border-white/10 pb-5">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.32em] text-white/35">
                  live artifact
                </p>

                <h2 className="text-4xl font-black uppercase tracking-[-0.08em] text-cyan-100">
                  SPIRE 01
                </h2>
              </div>

              <div className="border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                Locked
              </div>
            </div>

            <div className="mb-6 border border-white/10 bg-white/[0.03] p-4 text-xs text-white/55">
              Private operational gateway for Liminull AI systems.
            </div>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
              placeholder="Operator password"
              className="w-full border border-white/10 bg-black px-4 py-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300"
            />

            {error && (
              <div className="mt-4 border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <button
              onClick={login}
              disabled={loading}
              className="mt-5 w-full border border-cyan-300/50 bg-cyan-300 px-5 py-4 text-xs font-black uppercase tracking-[0.25em] text-black transition hover:bg-white disabled:opacity-50"
            >
              {loading ? "Checking Signal..." : "Enter Dashboard"}
            </button>

            <p className="mt-6 text-center text-[10px] uppercase tracking-[0.28em] text-white/25">
              NO MASCOT CHATBOT / OPERATOR SYSTEM ONLY
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
