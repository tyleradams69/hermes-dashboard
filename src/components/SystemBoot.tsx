"use client";

import { useEffect, useState } from "react";

export default function SystemBoot() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2400);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes bootPulse {
          0% {
            opacity: 0;
            transform: scale(0.98);
          }

          18% {
            opacity: 1;
          }

          80% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: scale(1.03);
          }
        }

        @keyframes bootScan {
          0% {
            transform: translateY(-100%);
          }

          100% {
            transform: translateY(120vh);
          }
        }

        .boot-sequence {
          animation: bootPulse 2.4s ease-out forwards;
        }

        .boot-scanline {
          animation: bootScan 1.6s linear infinite;
        }
      `}</style>

      <div className="boot-sequence pointer-events-none fixed inset-0 z-[9999] overflow-hidden bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_55%)]" />

        <div className="boot-scanline absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-transparent via-cyan-200/18 to-transparent" />

        <div className="flex h-full flex-col items-center justify-center">
          <div className="border border-cyan-300/20 bg-black/60 px-10 py-8 backdrop-blur-2xl">
            <p className="text-xs uppercase tracking-[0.42em] text-cyan-200">
              ACCESS GRANTED
            </p>

            <h1 className="mt-4 text-6xl font-black uppercase tracking-[-0.08em] text-white">
              SPIRE LINK
              <br />
              ESTABLISHED
            </h1>

            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />

            <div className="mt-6 flex justify-between text-[10px] uppercase tracking-[0.28em] text-white/35">
              <span>Hermes Control</span>
              <span>Operator Runtime Online</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
