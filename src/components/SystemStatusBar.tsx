"use client";

import { useEffect, useState } from "react";

export default function SystemStatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function update() {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    }

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed left-0 right-0 top-0 z-[9996] flex items-center justify-between border-b border-cyan-300/10 bg-black/70 px-6 py-2 text-[10px] uppercase tracking-[0.28em] text-cyan-100 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <span>SPIRE LINK ACTIVE</span>
        <span>HERMES RUNTIME ONLINE</span>
      </div>

      <div className="flex items-center gap-6">
        <span>OPERATOR AUTHENTICATED</span>
        <span>{time}</span>
      </div>
    </div>
  );
}
