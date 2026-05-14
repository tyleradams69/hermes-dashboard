"use client";

export default function ArtifactRuntime() {
  return (
    <div className="relative overflow-hidden border border-cyan-300/20 bg-black shadow-[0_0_120px_rgba(34,211,238,0.12)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_62%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.035)_1px,transparent_1px)] bg-[size:26px_26px]" />

      <video
        className="pointer-events-none relative z-10 h-[360px] w-full select-none object-cover opacity-95 mix-blend-screen"
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

      <div className="absolute inset-0 z-20 cursor-default border border-cyan-300/10" />

      <div className="absolute left-6 top-6 z-30 border border-cyan-300/20 bg-black/45 px-5 py-3 text-[10px] uppercase tracking-[0.28em] text-cyan-100 backdrop-blur-xl">
        3D Artifact Runtime
      </div>

      <div className="absolute bottom-6 right-6 z-30 border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-[10px] uppercase tracking-[0.28em] text-cyan-100 backdrop-blur-xl">
        Spire Core Online
      </div>
    </div>
  );
}
