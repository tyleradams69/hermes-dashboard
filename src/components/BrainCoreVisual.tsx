"use client";

import Link from "next/link";

export default function BrainCoreVisual() {
  return (
    <div className="relative h-[390px] w-[620px] overflow-visible">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_68%)]" />

      <div className="pointer-events-none absolute bottom-[-8px] right-[18px] h-[360px] w-[360px] animate-[artifactDrift_8s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),rgba(0,0,0,0.72)_52%,transparent_74%)]">
        <video
          className="artifact-video pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2 select-none object-cover opacity-95 mix-blend-screen drop-shadow-[0_0_55px_rgba(103,232,249,0.35)] [clip-path:circle(38%_at_50%_50%)] [mask-image:radial-gradient(circle_at_center,black_28%,rgba(0,0,0,0.75)_44%,transparent_66%),linear-gradient(to_bottom,black_0%,black_72%,transparent_100%)]"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          controlsList="nodownload nofullscreen noremoteplayback"
          preload="auto"
          poster="/assets/liminull_alien_spire_poster.png"
        >
          <source src="/assets/liminull_alien_spire.webm" type="video/webm" />
          <source src="/assets/liminull_alien_spire.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 z-20 cursor-default" />

        <div className="absolute inset-[-36px] animate-[artifactOrbit_14s_linear_infinite] rounded-full border border-cyan-300/15" />
        <div className="absolute inset-[-68px] animate-[artifactOrbitReverse_22s_linear_infinite] rounded-full border border-cyan-300/10" />
        <div className="absolute inset-[-100px] animate-[artifactOrbit_34s_linear_infinite] rounded-full border border-cyan-300/5" />
      </div>


      
      <Link
        href="/"
        aria-label="Return to Runtime"
        className="absolute bottom-[42px] right-[108px] z-50 h-[255px] w-[155px] cursor-pointer rounded-full"
      />

      <style jsx>{`
        .artifact-video::-webkit-media-controls {
          display: none !important;
        }

        .artifact-video::-webkit-media-controls-panel {
          display: none !important;
        }

        .artifact-video::-webkit-media-controls-play-button {
          display: none !important;
        }

        @keyframes artifactDrift {
          0%, 100% {
            transform: translate(-50%, -50%) rotate(-2deg) scale(1);
            filter: drop-shadow(0 0 24px rgba(34, 211, 238, 0.22));
          }
          50% {
            transform: translate(-50%, -54%) rotate(3deg) scale(1.045);
            filter: drop-shadow(0 0 70px rgba(34, 211, 238, 0.42));
          }
        }

        @keyframes artifactOrbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes artifactOrbitReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
