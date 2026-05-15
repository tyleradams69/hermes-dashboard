"use client";

import StrategyPanel from "../../components/StrategyPanel";
import PredictiveFeed from "../../components/PredictiveFeed";
import OperatorPerformancePanel from "../../components/OperatorPerformancePanel";
import OperationalCorrelationsPanel from "../../components/OperationalCorrelationsPanel";
import RuntimeWeightsPanel from "../../components/RuntimeWeightsPanel";
import BrainConsciousnessPanel from "../../components/BrainConsciousnessPanel";
import BrainHealthPanel from "../../components/BrainHealthPanel";
import BrainActivityHeatPanel from "../../components/BrainActivityHeatPanel";
import PredictionDriftPanel from "../../components/PredictionDriftPanel";
import NeuralDensityPanel from "../../components/NeuralDensityPanel";
import InterventionSimulationPanel from "../../components/InterventionSimulationPanel";
import InterventionChainPanel from "../../components/InterventionChainPanel";
import BrainEvolutionFeed from "../../components/BrainEvolutionFeed";
import BrainTimelinePanel from "../../components/BrainTimelinePanel";
import BrainCoreVisual from "../../components/BrainCoreVisual";

export default function BrainPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="border-b border-cyan-300/10 bg-black/80 px-8 py-6 backdrop-blur-2xl">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">
            Liminull AI
          </p>

          <div />
        </div>

        <div className="grid grid-cols-12 items-center gap-8">
          <div className="col-span-8">
            <h1 className="text-6xl font-black uppercase tracking-[-0.08em] text-white">
              Live AI Brain
            </h1>

            <p className="mt-4 max-w-4xl text-sm leading-8 text-white/45">
              Real-time operational intelligence evolution, predictive reasoning,
              adaptive optimization, strategic learning, escalation awareness, and
              runtime self-adjustment systems.
            </p>
          </div>

          <div className="col-span-4 flex justify-center overflow-visible">
            <BrainCoreVisual />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 p-5">
        <div className="col-span-3 space-y-4">
          <BrainConsciousnessPanel />
          <BrainHealthPanel />
          <BrainActivityHeatPanel />
          <PredictionDriftPanel />
          <NeuralDensityPanel />
          <InterventionSimulationPanel />
          <InterventionChainPanel />
          <RuntimeWeightsPanel />
          <OperatorPerformancePanel />
        </div>

        <div className="col-span-6 space-y-4">
          <OperationalCorrelationsPanel />
          <StrategyPanel />
        </div>

        <div className="col-span-3 space-y-4">
          <PredictiveFeed />
          <BrainEvolutionFeed />
          <BrainTimelinePanel />
        </div>
      </div>
    </main>
  );
}
