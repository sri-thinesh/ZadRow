'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowDown, Cpu, Zap, Activity, Terminal } from 'lucide-react';

export function HeroStage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes for fluid kinetic web
    const nodeCount = Math.min(60, Math.floor(width / 25));
    const nodes: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1,
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Subtle pull towards mouse cursor
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          node.x += dx * 0.01;
          node.y += dy * 0.01;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.fill();

        // Connect near neighbors
        for (let j = i + 1; j < nodes.length; j++) {
          const other = nodes[j];
          const ndx = node.x - other.x;
          const ndy = node.y - other.y;
          const nDist = Math.sqrt(ndx * ndx + ndy * ndy);

          if (nDist < 120) {
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${(1 - nDist / 120) * 0.15})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section
      id="hero"
      aria-label="Hero Stage"
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28 pb-16 px-4 sm:px-6 lg:px-8"
    >
      {/* 60FPS Interactive Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Atmospheric ambient lighting */}
      <div
        aria-hidden="true"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none z-0"
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border-primary/20 text-xs font-mono text-text-secondary">
          <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>ZADROW MAS 2.0 // HIGH-FIDELITY ACTIVE</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[1.05]">
          Forging Impossible <br />
          <span className="text-gradient">Digital Realities.</span>
        </h1>

        {/* Narrative Description */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-text-secondary font-light leading-relaxed">
          Welcome to <strong className="text-text-primary font-medium">STUDIO SYNTHETIX</strong>. An autonomous digital studio coordinating specialized AI swarms to choreograph kinetic typography, 60FPS canvas shaders, and mathematical WCAG AAA fidelity.
        </p>

        {/* Character / Personality Attributes Bar */}
        

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] rounded-full bg-primary text-black font-mono font-semibold text-sm tracking-wide hover:bg-white hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all duration-300"
          >
            <Cpu className="w-4 h-4" />
            <span>EXPLORE MATRIX</span>
          </a>
          <a
            href="#showcase"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] rounded-full glass-panel hover:bg-white/10 text-text-primary font-mono text-sm tracking-wide transition-all duration-300"
          >
            <Zap className="w-4 h-4 text-primary" />
            <span>LIVE TELEMETRY</span>
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="pt-12 flex justify-center">
          <a
            href="#features"
            aria-label="Scroll to Next Section"
            className="text-text-muted hover:text-primary transition-colors min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2.5"
          >
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}
