'use client';

import React, { useState } from 'react';
import { Layers, ShieldCheck, Zap, Compass, Cpu, Wrench, Sparkles, Binary, CircuitBoard } from 'lucide-react';

const BENTO_CARDS = [
  {
    id: 'agentic-swarm',
    icon: Layers,
    tag: 'COGNITIVE SWARM',
    title: '18 Specialized AI Operatives',
    description: 'Divided into 6 hierarchical tiers. Every pixel, kinetic curve, and token is engineered by an isolated domain specialist with zero cognitive hallucination.',
    metric: '18 Agents',
    stat: '100% Atomic Workload',
  },
  {
    id: 'kinetic-core',
    icon: Zap,
    tag: 'GRAPHICS ENGINE',
    title: '60FPS Procedural Canvas',
    description: 'Hardware-accelerated mathematical shaders and particle webs reacting fluidly to cursor trajectory and velocity with zero garbage collection spikes.',
    metric: '60-120 FPS',
    stat: 'Sub-1ms Frame Delta',
  },
  {
    id: 'spatial-bento',
    icon: Compass,
    tag: 'SPATIAL ARCHITECTURE',
    title: '3D Interactive Bento Grid',
    description: 'Multilayered glassmorphic perspective cards with dynamic mouse tilt geometry, hover glows, and responsive touch gating for modern devices.',
    metric: '<0.1ms Latency',
    stat: 'Zero Layout Shift',
  },
  {
    id: 'wcag-fidelity',
    icon: ShieldCheck,
    tag: 'ENTERPRISE AUDIT',
    title: 'Mathematical WCAG AAA Fidelity',
    description: 'Exhaustive algorithmic contrast ratio validation, complete ARIA landmark hierarchies, and touch target enforcement verified by built-in QA engines.',
    metric: '18.79:1 Ratio',
    stat: '100% Test Pass',
  },
];



export function FeatureBento() {
  const [activeCard, setActiveCard] = useState<string>('agentic-swarm');

  return (
    <section
      id="about"
      aria-label="Mindset and Capabilities"
      className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Anchor alias for backwards compatibility */}
      <div id="features" className="sr-only" aria-hidden="true" />

      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          // CAPABILITIES ARCHITECTURE
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight">
          Engineered for <span className="text-gradient">Unbounded Precision.</span>
        </h2>
        <p className="text-text-secondary text-base sm:text-lg">
          Each card represents a modular system layer engineered by ZadRow&apos;s concurrent agent network.
        </p>
      </div>

      {/* Responsive Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {BENTO_CARDS.map((card) => {
          const Icon = card.icon;
          const isActive = activeCard === card.id;

          return (
            <div
              key={card.id}
              onClick={() => setActiveCard(card.id)}
              className={`relative p-8 rounded-3xl transition-all duration-500 cursor-pointer ${
                isActive
                  ? 'glass-panel-elevated ring-1 ring-primary/40'
                  : 'glass-panel hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-subtle flex items-center justify-center text-primary">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-xs text-text-muted">{card.tag}</span>
                  <span className="font-mono font-bold text-lg text-primary">{card.metric}</span>
                </div>
              </div>

              <h3 className="font-display font-bold text-2xl text-text-primary mb-3">
                {card.title}
              </h3>

              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                {card.description}
              </p>

              <div className="pt-4 border-t border-subtle/60 flex items-center justify-between text-xs font-mono text-text-muted">
                <span>BENCHMARK</span>
                <span className="text-text-primary font-medium">{card.stat}</span>
              </div>
            </div>
          );
        })}
      </div>

      
    </section>
  );
}
