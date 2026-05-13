"use client";

import { useEffect, useState } from "react";

export default function OperatorAtmosphere() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function move(e: MouseEvent) {
      setMouse({
        x: e.clientX,
        y: e.clientY,
      });
    }

    window.addEventListener("mousemove", move);

    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <>
      <style jsx global>{`
        @keyframes hermesScan {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }

          15% {
            opacity: 0.5;
          }

          100% {
            transform: translateY(120vh);
            opacity: 0;
          }
        }

        @keyframes hermesNoise {
          0% {
            transform: translate(0, 0);
          }

          25% {
            transform: translate(-1%, 1%);
          }

          50% {
            transform: translate(1%, -1%);
          }

          75% {
            transform: translate(-1%, -1%);
          }

          100% {
            transform: translate(0, 0);
          }
        }

        @keyframes hermesPulse {
          0%,
          100% {
            opacity: 0.35;
          }

          50% {
            opacity: 0.85;
          }
        }

        .hermes-pulse {
          animation: hermesPulse 3.8s ease-in-out infinite;
        }

        .hermes-scanline {
          animation: hermesScan 5.5s linear infinite;
        }

        .hermes-noise {
          animation: hermesNoise 0.32s steps(2) infinite;
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[32%] top-[22%] h-[420px] w-[420px] rounded-full bg-cyan-300/6 blur-[120px]" />

          <div className="absolute right-[18%] top-[10%] h-[260px] w-[260px] rounded-full bg-blue-400/5 blur-[100px]" />

          <div className="absolute left-[40%] bottom-[12%] h-[320px] w-[320px] rounded-full bg-cyan-200/5 blur-[120px]" />
        </div>

        <div
          className="absolute h-[360px] w-[360px] rounded-full bg-cyan-300/10 blur-3xl"
          style={{
            left: mouse.x,
            top: mouse.y,
            transform: "translate(-50%, -50%)",
          }}
        />

        <div className="hermes-scanline absolute left-0 top-0 h-28 w-full bg-gradient-to-b from-transparent via-cyan-200/10 to-transparent" />

        <div className="hermes-noise absolute -inset-8 opacity-[0.035] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:13px_13px]" />

        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_4px)] opacity-30" />

        <div className="hermes-pulse absolute right-8 top-8 border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-cyan-100 backdrop-blur-xl">
          SPIRE LINK ACTIVE
        </div>
      </div>
    </>
  );
}
