"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";

type Props = {
  leads: any[];
  onSelectLead: (lead: any) => void;
  onImportLead: () => void;
};

export default function CommandPalette({
  leads,
  onSelectLead,
  onImportLead,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
    }

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 px-6 pt-28 backdrop-blur-md">
      <div
        className="absolute inset-0"
        onClick={() => setOpen(false)}
      />

      <Command className="relative w-full max-w-2xl overflow-hidden border border-cyan-300/20 bg-[#050608]/95 text-white shadow-[0_0_120px_rgba(34,211,238,0.18)]">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-cyan-200">
            Hermes Command Runtime
          </p>

          <Command.Input
            autoFocus
            placeholder="Type a command or search lead..."
            className="w-full bg-transparent text-2xl font-black uppercase tracking-[-0.04em] text-white outline-none placeholder:text-white/20"
          />
        </div>

        <Command.List className="max-h-[420px] overflow-y-auto p-3">
          <Command.Empty className="p-5 text-sm text-white/35">
            No command signal found.
          </Command.Empty>

          <Command.Group heading="Actions">
            <Command.Item
              onSelect={() => {
                setOpen(false);
                onImportLead();
              }}
              className="cursor-pointer border border-white/10 bg-white/[0.03] px-4 py-4 text-sm uppercase tracking-[0.18em] text-white/70 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
            >
              Import Lead
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Leads">
            {leads.map((lead) => (
              <Command.Item
                key={lead.company}
                value={lead.company}
                onSelect={() => {
                  setOpen(false);
                  onSelectLead(lead);
                }}
                className="mt-2 cursor-pointer border border-white/10 bg-white/[0.03] px-4 py-4 text-sm uppercase tracking-[0.18em] text-white/70 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
              >
                Open {lead.company}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-[10px] uppercase tracking-[0.24em] text-white/25">
          <span>Cmd + K</span>
          <span>Operator Command Layer</span>
        </div>
      </Command>
    </div>
  );
}
