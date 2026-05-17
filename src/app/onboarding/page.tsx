"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002";

const steps = [
  "Client",
  "Industry",
  "Channels",
  "Workflows",
  "Supervision",
  "Verification",
  "Launch",
];

function makeBusinessId(name: string) {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);

  const suffix =
    Math.random()
      .toString(36)
      .slice(2, 7);

  return `${base || "client"}-${suffix}`;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);

  const [form, setForm] = useState({
    id: "",
    name: "",
    website: "",
    industry: "",
    supervision: "supervised",

    channels: {
      website_form: false,
      email_inbox: false,
      calendar: false,
      crm: false,
    },

    channelDetails: {
      website_form: "",
      email_inbox: "",
      calendar: "",
      crm: "",
    },
  });

  const [creating, setCreating] =
    useState(false);

  const [created, setCreated] =
    useState(false);

  const [readiness, setReadiness] =
    useState<any>(null);

  const progress = useMemo(() => {
    return Math.round(((step + 1) / steps.length) * 100);
  }, [step]);


  async function loadReadiness(
    businessId: string
  ) {

    try {

      const res = await fetch(
        `${API_URL}/api/onboarding-readiness?business_id=${businessId}`,
        {
          cache: "no-store",

          headers: {
            "x-hermes-token":
              process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",

            "x-hermes-role":
              "admin",
          },
        }
      );

      const data =
        await res.json();

      setReadiness(data);

    } catch (err) {
      console.error(err);
    }
  }

  async function createWorkspace() {
    try {
      setCreating(true);

      const res = await fetch(
        `${API_URL}/api/businesses`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-hermes-token":
              process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",

            "x-hermes-role":
              "admin",
          },

          body: JSON.stringify({
            id:
              form.id,

            name:
              form.name,

            industry:
              form.industry,

            website:
              form.website,
          }),
        }
      );

      const data = await res.json();

      if (data.ok) {

        await fetch(
          `${API_URL}/api/business-settings`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "x-hermes-token":
                process.env.NEXT_PUBLIC_HERMES_API_TOKEN || "",

              "x-hermes-role":
                "admin",
            },

            body: JSON.stringify({
              business_id:
                form.id,

              supervision_mode:
                form.supervision,

              workflows_enabled: [
                "intake_supervision",
                "followup_approval",
              ],

              onboarding_completed:
                true,
            }),
          }
        );

        await loadReadiness(form.id);

        setCreated(true);
        setStep(steps.length - 1);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell
      active="onboarding"
      eyebrow="Client Provisioning"
      title="Onboarding"
      description="Provision operational intelligence for a new client workspace."
    >
      <div className="liminull-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="liminull-eyebrow">
              Provisioning Progress
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.07em]">
              {steps[step]}
            </h2>
          </div>

          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
              Completion
            </p>

            <p className="mt-2 text-3xl font-black">
              {progress}%
            </p>
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-cyan-300 transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-6 liminull-card p-6">
        {step === 0 && (
          <div>
            <p className="liminull-eyebrow">
              Step 1
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.07em]">
              Create Client Workspace
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <input
                placeholder="Client Name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;

                  setForm({
                    ...form,
                    name,
                    id: form.id || makeBusinessId(name),
                  });
                }}
                className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm outline-none placeholder:text-white/25"
              />

              <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                  Auto Business ID
                </p>

                <p className="mt-2 text-sm font-black text-cyan-100">
                  {form.id || "Generated automatically"}
                </p>
              </div>

              <input
                placeholder="Website"
                value={form.website}
                onChange={(e) =>
                  setForm({
                    ...form,
                    website: e.target.value,
                  })
                }
                className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm outline-none placeholder:text-white/25 md:col-span-2"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="liminull-eyebrow">
              Step 2
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.07em]">
              Select Industry Intelligence
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                "law_firm",
                "car_dealership",
                "insurance_agency",
                "home_services",
                "consulting",
                "custom",
              ].map((industry) => (
                <button
                  key={industry}
                  onClick={() =>
                    setForm({
                      ...form,
                      industry,
                    })
                  }
                  className={
                    form.industry === industry
                      ? "liminull-card p-6 text-left border-cyan-300/20"
                      : "liminull-card-soft p-6 text-left transition hover:bg-white/[0.05]"
                  }
                >
                  <p className="text-lg font-black">
                    {industry.replaceAll("_", " ")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="liminull-eyebrow">
              Step 4
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.07em]">
              Connect Communication Channels
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-7 liminull-muted">
              Configure operational communication channels for supervision,
              intake monitoring, workflow intelligence, and automation readiness.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["website_form", "Website Forms"],
                ["email_inbox", "Inbox Integration"],
                ["calendar", "Scheduling Calendar"],
                ["crm", "CRM / Pipeline"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() =>
                    setForm({
                      ...form,

                      channels: {
                        ...form.channels,

                        [id]:
                          !form.channels[id],
                      },
                    })
                  }
                  className={
                    form.channels[id]
                      ? "liminull-card p-6 text-left border-cyan-300/20"
                      : "liminull-card-soft p-6 text-left transition hover:bg-white/[0.05]"
                  }
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-black">
                        {label}
                      </p>

                      <p className="mt-3 text-sm leading-6 liminull-muted">
                        Operational connection ready for onboarding workflows.
                      </p>
                    </div>

                    <div
                      className={
                        form.channels[id]
                          ? "h-4 w-4 rounded-full bg-cyan-300"
                          : "h-4 w-4 rounded-full border border-white/20"
                      }
                    />
                  </div>

                  {form.channels[id] && (
                    <input
                      onClick={(e) => e.stopPropagation()}
                      value={form.channelDetails[id]}
                      onChange={(e) =>
                        setForm({
                          ...form,

                          channelDetails: {
                            ...form.channelDetails,

                            [id]:
                              e.target.value,
                          },
                        })
                      }
                      placeholder={
                        id === "website_form"
                          ? "Webhook or contact form URL"
                          : id === "email_inbox"
                          ? "Intake inbox email"
                          : id === "calendar"
                          ? "Scheduling or booking link"
                          : "CRM or pipeline URL"
                      }
                      className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}



        {step === 3 && (
          <div>
            <p className="liminull-eyebrow">
              Step 3
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.07em]">
              Supervision Level
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ["supervised", "Human approval required"],
                ["semi_autonomous", "Low-risk automation enabled"],
              ].map(([id, desc]) => (
                <button
                  key={id}
                  onClick={() =>
                    setForm({
                      ...form,
                      supervision: id,
                    })
                  }
                  className={
                    form.supervision === id
                      ? "liminull-card p-6 text-left border-cyan-300/20"
                      : "liminull-card-soft p-6 text-left transition hover:bg-white/[0.05]"
                  }
                >
                  <p className="text-lg font-black">
                    {id.replaceAll("_", " ")}
                  </p>

                  <p className="mt-3 text-sm liminull-muted">
                    {desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === steps.length - 1 && created && (
          <div className="py-16 text-center">
            <p className="liminull-eyebrow">
              Workspace Ready
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-[-0.08em]">
              Client Provisioned
            </h2>

            <p className="mt-4 text-sm liminull-muted">
              Operational intelligence infrastructure is now active.
            </p>

            {readiness && (
              <div className="mt-10 liminull-card-soft p-5 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="liminull-eyebrow">
                      Operational Readiness
                    </p>

                    <h3 className="mt-2 text-2xl font-black tracking-[-0.06em]">
                      {readiness.readiness}% Ready
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-cyan-300 liminull-live-pulse" />

                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">
                      Verified
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {readiness.checks.map((check: any) => (
                    <div
                      key={check.id}
                      className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold">
                          {check.label}
                        </p>

                        <div
                          className={
                            check.ok
                              ? "h-3 w-3 rounded-full bg-cyan-300"
                              : "h-3 w-3 rounded-full bg-red-400"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            <a
              href="/businesses"
              className="liminull-button mt-8 inline-flex"
            >
              Open Clients
            </a>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            disabled={step === 0}
            onClick={() =>
              setStep((s) => Math.max(0, s - 1))
            }
            className="liminull-button disabled:opacity-30"
          >
            Back
          </button>

          {step < 3 && (
            <button
              onClick={() =>
                setStep((s) =>
                  Math.min(steps.length - 1, s + 1)
                )
              }
              className="liminull-button"
            >
              Continue
            </button>
          )}

          {step === 3 && (
            <button
              onClick={createWorkspace}
              disabled={creating}
              className="liminull-button"
            >
              {creating
                ? "Provisioning..."
                : "Launch Workspace"}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
