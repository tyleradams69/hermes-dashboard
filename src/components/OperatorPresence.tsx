"use client";

export default function OperatorPresence() {
  return (
    <div className="fixed bottom-6 right-6 z-40 border border-cyan-300/20 bg-black/70 px-4 py-3 text-[10px] uppercase tracking-[0.24em] text-cyan-100 shadow-[0_0_50px_rgba(34,211,238,0.14)] backdrop-blur-xl">
      <div className="mb-2 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,1)]" />
        <span>Operator Active</span>
      </div>

      <div className="space-y-1 text-white/50">
        <div>TYLER ONLINE</div>
        <div>JACK AUTHORIZED</div>
      </div>
    </div>
  );
}

