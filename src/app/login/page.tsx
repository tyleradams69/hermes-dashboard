"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

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
        body: JSON.stringify({ password }),
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
    <main className="min-h-screen bg-[#090909] text-white liminull-grid-bg">
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md liminull-card p-8">
          <p className="liminull-eyebrow">Liminull</p>

          <h1 className="mt-3 text-5xl font-black tracking-[-0.1em]">
            Operator Login
          </h1>

          <p className="mt-4 text-sm leading-6 liminull-muted">
            Access the operational intelligence workspace.
          </p>

          <form onSubmit={login} className="mt-8 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dashboard password"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-white outline-none placeholder:text-white/25"
            />

            {error && (
              <div className="rounded-2xl border border-red-400/10 bg-red-400/10 p-4 text-sm text-red-100">
                {error}
              </div>
            )}

            <button className="liminull-button w-full">
              {loading ? "Authenticating..." : "Enter Workspace"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
