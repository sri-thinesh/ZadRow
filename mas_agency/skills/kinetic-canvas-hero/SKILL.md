---
name: kinetic-canvas-hero
description: Build high-performance 60 FPS procedural HTML5 Canvas and WebGL interactive hero sections, particle fields, and dynamic gradient meshes. Use when creating animated canvas backgrounds, interactive physics particle systems, hero header visuals, WebGL shaders, pointer repulsion or attraction fields, with automatic IntersectionObserver viewport pausing and Retina DPR scaling.
license: MIT
metadata:
  author: mas-agency
  version: "1.0.0"
---

# Kinetic Canvas Hero

Production architecture for 60-120 FPS interactive canvas particle fields, WebGL procedural gradient meshes, pointer physics, automatic viewport pausing via `IntersectionObserver`, and Retina DPR optimization.

---

## The Canvas Performance Contract

A hero canvas animation must never drop frames, cause layout thrashing, or burn mobile battery in background tabs.

### Core Architecture Rules
1. **Viewport Pausing:** Stop `requestAnimationFrame` entirely when the hero element is scrolled out of view or the browser tab is hidden.
2. **Object Pooling:** Never instantiate objects (`new Particle()`, object literals `{...}`) inside the 60 FPS render loop. Pre-allocate flat typed arrays or fixed object pools to avoid Garbage Collection (GC) pauses.
3. **Capped Device Pixel Ratio (DPR):** High-density displays (e.g., iPhone 3x, Retina 2x) exponentially increase pixel count ($W \times H \times DPR^2$). Cap DPR at `2.0` to preserve GPU fill rate.
4. **Delta-Time Compensation:** Decouple motion physics from refresh rate so simulations run identically on 60 Hz, 120 Hz, and 144 Hz monitors.

---

## DPR Scaling & Crisp Coordinate Buffer

A common bug is blurry rendering on Retina displays or incorrect pointer interaction offsets. Always maintain separate buffer dimensions and CSS dimensions:

$$\text{Buffer Width} = \text{Client Width} \times \text{DPR}$$

$$\text{Buffer Height} = \text{Client Height} \times \text{DPR}$$

```ts
// utils/canvasScaling.ts
export function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  maxDPR = 2
): { ctx: CanvasRenderingContext2D; dpr: number } {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Could not get 2D context');

  const dpr = Math.min(window.devicePixelRatio || 1, maxDPR);

  // Set internal buffer size
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  // Set display style size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // Scale context coordinates so 1 unit = 1 CSS pixel
  ctx.scale(dpr, dpr);

  return { ctx, dpr };
}
```

---

## Kinetic Particle Hero Component Pattern

Complete, production-tested React/Next.js component with pointer repulsion physics, spring return, delta-time compensation, and automatic IntersectionObserver pausing.

```tsx
// components/hero/KineticCanvasHero.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  baseAlpha: number;
}

interface KineticHeroProps {
  particleCount?: number;
  repelRadius?: number;
  repelStrength?: number;
  springStiffness?: number;
  damping?: number;
  title?: string;
  subtitle?: string;
}

export function KineticCanvasHero({
  particleCount = 180,
  repelRadius = 140,
  repelStrength = 18,
  springStiffness = 0.04,
  damping = 0.88,
  title = "Next-Gen Creative Systems",
  subtitle = "Crafting high-velocity, award-winning digital experiences.",
}: KineticHeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let lastTime = performance.now();
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Pointer state
    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      isActive: false,
    };

    // Pre-allocated particle pool
    const particles: Particle[] = [];
    const colors = [
      'rgba(99, 102, 241, ', // Indigo
      'rgba(168, 85, 247, ', // Purple
      'rgba(236, 72, 153, ', // Pink
      'rgba(56, 189, 248, ', // Sky
    ];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      // Re-seed particle grid
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        const px = Math.random() * width;
        const py = Math.random() * height;
        const baseAlpha = Math.random() * 0.5 + 0.3;
        particles.push({
          x: px,
          y: py,
          originX: px,
          originY: py,
          vx: 0,
          vy: 0,
          radius: Math.random() * 2.2 + 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: baseAlpha,
          baseAlpha,
        });
      }
    };

    resize();

    // Debounced ResizeObserver
    let resizeTimer: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 100);
    });
    resizeObserver.observe(container);

    // 60-120 FPS Physics Loop
    const render = (currentTime: number) => {
      if (!isVisible) return;

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap delta-time at 100ms
      lastTime = currentTime;

      // Smooth pointer position lerp
      if (mouse.isActive) {
        mouse.x += (mouse.targetX - mouse.x) * 0.15;
        mouse.y += (mouse.targetY - mouse.y) * 0.15;
      }

      ctx.clearRect(0, 0, width, height);

      // Connect nearby particles with subtle neural web lines
      const maxConnectDistance = 90;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxConnectDistance) {
            const lineAlpha = (1 - dist / maxConnectDistance) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Update & Draw Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Mouse Repulsion Force
        if (mouse.isActive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);

          if (dist < repelRadius && dist > 0.001) {
            const force = (1 - dist / repelRadius) * repelStrength;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
            p.alpha = Math.min(1, p.baseAlpha + 0.4);
          } else {
            p.alpha += (p.baseAlpha - p.alpha) * 0.05;
          }
        }

        // 2. Spring Force returning to origin
        const springX = (p.originX - p.x) * springStiffness;
        const springY = (p.originY - p.y) * springStiffness;

        p.vx = (p.vx + springX) * damping;
        p.vy = (p.vy + springY) * damping;

        p.x += p.vx * (dt * 60);
        p.y += p.vy * (dt * 60);

        // 3. Render Particle with soft halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `${p.color}0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset for performance
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Pointer event listeners
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isActive = true;
    };

    const handlePointerLeave = () => {
      mouse.isActive = false;
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    // Viewport IntersectionObserver to pause when off-screen
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!isVisible) {
              isVisible = true;
              lastTime = performance.now();
              animationFrameId = requestAnimationFrame(render);
            }
          } else {
            isVisible = false;
            cancelAnimationFrame(animationFrameId);
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // Page Visibility API listener (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isVisible = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        isVisible = true;
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start initial loop
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      clearTimeout(resizeTimer);
    };
  }, [particleCount, repelRadius, repelStrength, springStiffness, damping]);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden bg-neutral-950 px-6 py-24 text-white"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 h-full w-full touch-none"
      />

      <div className="relative z-10 mx-auto max-w-4xl text-center pointer-events-none">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
        <p className="mt-6 text-lg text-neutral-300 sm:text-xl">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
```

---

## WebGL Procedural Gradient Mesh Alternative

For continuous fluid liquid simulations, WebGL shaders run with lower CPU overhead than Canvas 2D iterations.

```glsl
// shaders/mesh.frag - GLSL Fragment Shader
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

// Simplex noise approximation
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  st.x *= u_resolution.x / u_resolution.y;

  vec2 mouseNorm = u_mouse / u_resolution.xy;
  float distToMouse = distance(st, mouseNorm);

  float n = snoise(st * 2.2 + vec2(u_time * 0.08, u_time * 0.05));
  float disturbance = smoothstep(0.4, 0.0, distToMouse) * 0.35;
  n += disturbance;

  // 3-color palette mixing in OKLab/RGB
  vec3 col1 = vec3(0.06, 0.08, 0.16); // Deep space navy
  vec3 col2 = vec3(0.38, 0.20, 0.79); // Electric violet
  vec3 col3 = vec3(0.09, 0.74, 0.82); // Cyan highlight

  vec3 finalColor = mix(col1, col2, smoothstep(-0.4, 0.6, n));
  finalColor = mix(finalColor, col3, smoothstep(0.4, 1.0, n));

  gl_FragColor = vec4(finalColor, 1.0);
}
```

---

## Critical Canvas Pitfalls

| Mistake | Consequence | Remedy |
|---------|-------------|--------|
| Running RAF while off-screen | 25-40% continuous CPU/GPU drain, laptop fan noise | Disconnect loop using `IntersectionObserver` |
| Setting `canvas.width = rect.width` without DPR | Blurry pixels on high-resolution Retina screens | Multiply buffer by `Math.min(devicePixelRatio, 2)` and scale context |
| `new Particle()` inside render loop | Major garbage collection pauses every 2-3 seconds | Pre-allocate particles in a static pool |
| Unclamped delta-time ($dt$) | Tab sleep causes huge $dt$, exploding physics into infinity | Clamp delta-time: `Math.min(dt, 0.1)` |
| Un-debounced window resize | Hundreds of context resets freeze the browser UI thread | Debounce with `ResizeObserver` (100ms) |
