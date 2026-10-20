'use client';

import React, { useState } from 'react';
import { Sliders, Terminal, Gauge, CheckCircle2, Play } from 'lucide-react';
import { MediaPlaceholder } from '@/components/MediaPlaceholder';

export function InteractiveShowcase() {
  const [swarmDensity, setSwarmDensity] = useState(18);
  const [shaderQuality, setShaderQuality] = useState(90);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'spec'>('telemetry');

  const computedThroughput = Math.round(swarmDensity * 240);
  const latencyMs = (0.2 + (100 - shaderQuality) * 0.005).toFixed(2);

  return (
    <section
      id="showcase"
      aria-label="Interactive Telemetry Showcase"
      className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <span className="font-mono text-xs uppercase tracking-widest text-primary">
          // LIVE TELEMETRY SIMULATOR
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl tracking-tight">
          Speed, Precision, and Impact <span className="text-gradient">Quantified.</span>
        </h2>
        <p className="text-text-secondary text-base sm:text-lg">
          Manipulate real-time parameters to inspect dynamic cognitive throughput and frame latency.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Interactive Controls */}
        <div className="lg:col-span-5 glass-panel p-8 rounded-3xl space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-subtle">
            <Sliders className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-xl text-text-primary">
              Control Parameters
            </h3>
          </div>

          {/* Slider 1: Swarm Density */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor="swarm-density" className="text-text-secondary cursor-pointer">ACTIVE AGENT SWARMS</label>
              <span className="text-primary font-bold">{swarmDensity} Operatives</span>
            </div>
            <input
              id="swarm-density"
              type="range"
              min="4"
              max="24"
              value={swarmDensity}
              onChange={(e) => setSwarmDensity(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer h-2 bg-elevated rounded-lg"
              aria-label="Swarm Density"
            />
          </div>

          {/* Slider 2: Shader Quality */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-mono">
              <label htmlFor="shader-quality" className="text-text-secondary cursor-pointer">SHADER PRECISION TIER</label>
              <span className="text-primary font-bold">{shaderQuality}% Target</span>
            </div>
            <input
              id="shader-quality"
              type="range"
              min="30"
              max="100"
              value={shaderQuality}
              onChange={(e) => setShaderQuality(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer h-2 bg-elevated rounded-lg"
              aria-label="Shader Quality"
            />
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-surface border border-subtle">
              <div className="flex items-center gap-2 text-xs font-mono text-text-muted mb-1">
                <Gauge className="w-3.5 h-3.5 text-primary" />
                <span>THROUGHPUT</span>
              </div>
              <div className="text-2xl font-mono font-bold text-text-primary">
                {computedThroughput} <span className="text-xs text-text-muted">tok/s</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-surface border border-subtle">
              <div className="flex items-center gap-2 text-xs font-mono text-text-muted mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>FRAME DELTA</span>
              </div>
              <div className="text-2xl font-mono font-bold text-primary">
                {latencyMs} <span className="text-xs text-text-muted">ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Terminal / Telemetry Display */}
        <div className="lg:col-span-7 glass-panel-elevated p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-subtle">
            <div className="flex items-center gap-3">
              <Terminal className="w-5 h-5 text-primary" />
              <span className="font-mono text-xs tracking-wider text-text-primary">
                ZADROW ENGINE // LIVE TELEMETRY LOGS
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('telemetry')}
                className={`px-4 py-2 min-h-[44px] inline-flex items-center rounded text-xs font-mono transition-colors ${
                  activeTab === 'telemetry'
                    ? 'bg-primary text-black font-semibold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Telemetry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('spec')}
                className={`px-4 py-2 min-h-[44px] inline-flex items-center rounded text-xs font-mono transition-colors ${
                  activeTab === 'spec'
                    ? 'bg-primary text-black font-semibold'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                System Spec
              </button>
            </div>
          </div>

          {activeTab === 'telemetry' ? (
            <div className="space-y-3 font-mono text-xs text-text-secondary leading-relaxed bg-black/40 p-4 rounded-2xl border border-subtle">
              <div className="text-primary">&gt; SYSTEM INITIALIZED: Next.js 15 App Router & React 19</div>
              <div>&gt; DAG Execution: 6 Tiers, {swarmDensity} active agents synchronized</div>
              <div>&gt; Canvas Frame Rate: 60.0 FPS [Zero dropped frames]</div>
              <div>&gt; Contrast Compliance: 18.79:1 verified against WCAG 2.2 AAA standard</div>
              <div>&gt; Memory Allocation: 4.2MB heap [Zero garbage collection lockup]</div>
              <div className="text-text-primary font-bold pt-2">
                &gt; STATUS: Production-Grade Synthesis Verified.
              </div>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-xs text-text-secondary leading-relaxed bg-black/40 p-4 rounded-2xl border border-subtle">
              <div>// STUDIO CONFIGURATION MATRIX</div>
              <div>Brand: STUDIO SYNTHETIX</div>
              <div>Aesthetic Universe: Cyber-Luxury Kinetic Brutalism</div>
              <div>Color Space: OKLCH / Dynamic CSS Custom Properties</div>
              <div>Accessibility: WCAG 2.2 Level AA Standard</div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-mono text-text-muted pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>RUNTIME KERNEL HEALTHY</span>
            </div>
            <span>PORT 3000 DEV-READY</span>
          </div>
        </div>
      </div>

      {/* Visual Exhibition & Gallery Matrix (Animated Media Placeholders & Spatial Containers) */}
      <div className="mt-16 pt-16 border-t border-subtle space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              // EXHIBITION MATRIX &amp; SPATIAL MEDIA
            </span>
            <h3 className="font-display font-bold text-2xl sm:text-3xl text-text-primary tracking-tight">
              Curated Production Gallery
            </h3>
          </div>
          <p className="font-mono text-xs text-text-muted">
            Dimensional media slots with active motion choreography
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MediaPlaceholder
            type="video"
            aspectRatio="aspect-video"
            title="Generative Motion Reel"
            subtitle="02:30 • 4K 60FPS Spatial Feed"
            dimensions="1920 × 1080"
          />
          <MediaPlaceholder
            type="photo"
            aspectRatio="aspect-video"
            title="Spatial Geometry Study"
            subtitle="Optical Architecture Capture"
            dimensions="1920 × 1080"
          />
          <MediaPlaceholder
            type="space"
            aspectRatio="aspect-video"
            title="Reserved Spatial Coordinate"
            subtitle="Adaptive Empty Space Container"
            dimensions="Dynamic Viewport"
          />
        </div>
      </div>
    </section>
  );
}
