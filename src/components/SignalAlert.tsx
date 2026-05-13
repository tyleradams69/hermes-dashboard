"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  signal: string | null;
};

export default function SignalAlert({ signal }: Props) {
  const previous = useRef<string | null>(null);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!signal) return;

    if (previous.current && previous.current !== signal) {
      setVisible(true);

      const timer = setTimeout(() => {
        setVisible(false);
      }, 2600);

      return () => clearTimeout(timer);
    }

    previous.current = signal;
  }, [signal]);

  useEffect(() => {
    previous.current = signal;
  }, [signal]);

  if (!visible || !signal) return null;

  return (
    <>
      <style jsx global>{`
        @keyframes signalFlash {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }

          10% {
            opacity: 1;
          }

          80% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: scale(1.04);
          }
        }

        @keyframes signalSweep {
          0% {
            transform: translateY(-100%);
          }

          100% {
            transform: translateY(120vh);
          }
        }

        .signal-alert {
          animation: signalFlash 2.6s ease-out forwards;
        }

        .signal-scan {
          animation: signalSweep 1.4s linear infinite;
        }
      `}</style>

      <div className="signal-alert pointer-events-none fixed inset-0 z-[9998] overflow-hidden">
        <div className="absolute inset-0 bg-cyan-300/10 backdrop-blur-[2px]" />

        <div className="signal-scan absolute left-0 top-0 h-32 w-full bg-gradient-to-b from-transparent via-cyan-200/18 to-transparent" />

        <div className="flex h-full items-center justify-center">
          <div className="border border-cyan-300/30 bg-black/75 px-10 py-8 shadow-[0_0_120px_rgba(103,232,249,0.45)] backdrop-blur-2xl">
            <p className="text-xs uppercase tracking-[0.42em] text-cyan-200">
              NEW SIGNAL DETECTED
            </p>

            <h1 className="mt-4 text-6xl font-black uppercase tracking-[-0.08em] text-white">
              {signal}
            </h1>

            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />

            <div className="mt-6 flex justify-between text-[10px] uppercase tracking-[0.28em] text-white/35">
              <span>Pipeline Updated</span>
              <span>Hermes Runtime Active</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
