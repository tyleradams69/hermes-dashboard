"use client";

import { useEffect, useState } from "react";

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
    const res = await fetch(`${API_URL}/api/businesses`, {
      cache: "no-store",
      headers: {
        "x-hermes-token": process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",
        "x-hermes-role": "admin",
      },
    });

    const data = await res.json();
    setBusinesses(data.businesses || []);
    setLoading(false);
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
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
            Hermes Client Infrastructure
          </p>
          <h1 className="mt-2 text-5xl font-black tracking-[-0.08em]">
            Businesses
          </h1>
        </div>

        <form
          onSubmit={createBusiness}
          className="grid gap-3 border border-cyan-300/10 bg-cyan-300/5 p-5 md:grid-cols-4"
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
              className="border border-white/10 bg-black px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
            />
          ))}

          <button className="border border-cyan-300/30 px-4 py-3 text-xs uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black md:col-span-4">
            Create Business
          </button>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading && (
            <div className="border border-white/10 p-5 text-white/50">
              Loading...
            </div>
          )}

          {!loading && businesses.length === 0 && (
            <div className="border border-white/10 p-5 text-white/50">
              No businesses found.
            </div>
          )}

          {businesses.map((business) => (
            <div
              key={business.id}
              className="border border-cyan-300/10 bg-cyan-300/5 p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-black">{business.name}</p>
                <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-200">
                  {business.status}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-white/65">
                <p>ID: {business.id}</p>
                <p>Industry: {business.industry || "unknown"}</p>
                <p>Website: {business.website || "none"}</p>
              </div>

              <div className="mt-5">
                <a
                  href={`/operations?business_id=${business.id}`}
                  className="inline-flex border border-cyan-300/20 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300 hover:text-black"
                >
                  Open Operations
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
