"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: "",
    name: "",
    industry: "",
    website: "",
  });

  async function load() {
    try {
      const res = await fetch(`${API_URL}/api/businesses`, {
        cache: "no-store",
        headers: {
          "x-hermes-token": process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
          "x-hermes-role": "admin",
        },
      });

      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createBusiness(e: React.FormEvent) {
    e.preventDefault();

    await fetch(`${API_URL}/api/businesses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hermes-token": process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
        "x-hermes-role": "admin",
      },
      body: JSON.stringify(form),
    });

    setForm({ id: "", name: "", industry: "", website: "" });
    load();
  }

  return (
    <AppShell
      active="clients"
      eyebrow="Client Infrastructure"
      title="Clients"
      description="Create, manage, and supervise client workspaces connected to Liminull operational intelligence."
    >
      <form
        onSubmit={createBusiness}
        className="mb-8 grid gap-3 liminull-card-soft p-5 md:grid-cols-4"
      >
        {["id", "name", "industry", "website"].map((field) => (
          <input
            key={field}
            placeholder={field}
            value={(form as any)[field]}
            onChange={(e) =>
              setForm({
                ...form,
                [field]: e.target.value,
              })
            }
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
          />
        ))}

        <button className="rounded-xl liminull-button md:col-span-4">
          Create Client
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && (
          <div className="liminull-card-soft p-5 text-white/50">
            Loading clients...
          </div>
        )}

        {!loading && businesses.length === 0 && (
          <div className="liminull-card-soft p-5 text-white/50">
            No clients found.
          </div>
        )}

        {businesses.map((business) => (
          <div
            key={business.id}
            className="liminull-card-soft p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black">{business.name}</p>
                <p className="mt-1 text-xs liminull-muted">{business.id}</p>
              </div>

              <span className="rounded-full border border-cyan-300/10 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100">
                {business.status}
              </span>
            </div>

            <div className="mt-5 space-y-2 text-sm text-white/60">
              <p>Industry: {business.industry || "unknown"}</p>
              <p>Website: {business.website || "none"}</p>
            </div>

            <a
              href={`/operations?business_id=${business.id}`}
              className="mt-5 inline-flex rounded-xl liminull-button"
            >
              Open Dashboard
            </a>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
