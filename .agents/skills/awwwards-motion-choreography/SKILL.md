---
name: awwwards-motion-choreography
description: Implement award-winning web animations using GSAP 3, ScrollTrigger, Lenis smooth scrolling, magnetic cursor physics, and native View Transitions. Use when building high-end interactive websites, smooth scroll experiences, pinned scrollytelling sequences, physics-based hover effects, magnetic buttons, or page transitions with strict touch/mobile gating fallback.
license: MIT
metadata:
  author: mas-agency
  version: "1.0.0"
---

# Awwwards Motion Choreography

Production-grade choreography guide for building silky-smooth, award-winning interactive web experiences using GSAP 3, ScrollTrigger, Lenis smooth scroll, magnetic cursor physics, and native View Transitions.

---

## Motion Hierarchy & Performance Law

Award-winning motion feels instantaneous, organic, and physically grounded. It never compromises framerate or accessibility.

### The 120 FPS Golden Rule
- **Composite-only properties:** Animate exclusively `transform` (`x`, `y`, `scale`, `rotation`, `skew`) and `opacity`.
- **Zero layout thrashing:** Never animate geometric properties (`top`, `left`, `width`, `height`, `margin`, `padding`, `border-width`).
- **GPU hinting:** Apply `will-change: transform` only to active animation targets, and remove it after completion if thousands of DOM nodes exist.
- **Delta-time independence:** Never tie animations to unthrottled frame count; always use physics spring dampening or GSAP's synchronized ticker.

### Reduced Motion Contract
Always respect users who request reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

In GSAP:
```ts
import gsap from 'gsap';

export const isReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

---

## Lenis + GSAP ScrollTrigger Synchronization

Lenis delivers virtualized inertia scrolling, but standard GSAP `ScrollTrigger` listens to native scroll events. If not unified, animations jitter and stutter.

### Unified RAF Architecture

Do **not** run two independent `requestAnimationFrame` loops. Tie Lenis directly into GSAP's internal ticker and disable GSAP's lag smoothing:

```tsx
// components/providers/SmoothScrollProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SmoothScrollContext = createContext<Lenis | null>(null);

export const useLenis = () => useContext(SmoothScrollContext);

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // 1. Strict Touch Gating: Check fine pointer & hover support
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || prefersReduced) {
      // Allow native mobile momentum scroll without overhead
      return;
    }

    // 2. Initialize Lenis with production-grade damping
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease-out
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      infinite: false,
    });

    lenisRef.current = lenis;

    // 3. Connect Lenis scroll to ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // 4. Drive Lenis through GSAP ticker for frame-locked synchronization
    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0); // Critical: eliminates stutter during frame drops

    // 5. Recalculate triggers after DOM settles
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      clearTimeout(timeout);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={lenisRef.current}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
```

---

## Strict Touch & Pointer Gating

Never render custom cursor rings or apply magnetic physics on mobile/touch screens. It causes latency, ghost clicks, and broken accessibility.

### Device Capability Detection Matrix

| Device / Environment | `pointer` query | `hover` query | Action |
|----------------------|-----------------|---------------|--------|
| Desktop (Mouse/Trackpad) | `(pointer: fine)` | `(hover: hover)` | Enable magnetic cursor, custom pointer, pinned scrub |
| Phone / Tablet (Touchscreen) | `(pointer: coarse)` | `(hover: none)` | **Disable cursor entirely**, enable native swipe/touch |
| Hybrid (Laptop + Touchscreen) | `(pointer: fine)` | `(hover: hover)` | Enable cursor while fine pointer is active |

```ts
// hooks/usePointerCapabilities.ts
import { useState, useEffect } from 'react';

export interface PointerCapabilities {
  hasHover: boolean;
  isFinePointer: boolean;
  canAnimateCursor: boolean;
}

export function usePointerCapabilities(): PointerCapabilities {
  const [caps, setCaps] = useState<PointerCapabilities>({
    hasHover: false,
    isFinePointer: false,
    canAnimateCursor: false,
  });

  useEffect(() => {
    const hoverQuery = window.matchMedia('(hover: hover)');
    const pointerQuery = window.matchMedia('(pointer: fine)');

    const update = () => {
      const hasHover = hoverQuery.matches;
      const isFinePointer = pointerQuery.matches;
      setCaps({
        hasHover,
        isFinePointer,
        canAnimateCursor: hasHover && isFinePointer,
      });
    };

    update();
    hoverQuery.addEventListener('change', update);
    pointerQuery.addEventListener('change', update);

    return () => {
      hoverQuery.removeEventListener('change', update);
      pointerQuery.removeEventListener('change', update);
    };
  }, []);

  return caps;
}
```

---

## Magnetic Elements & Interactive Physics

High-performance magnetic attraction requires `gsap.quickTo`. Unlike standard `gsap.to`, `quickTo` bypasses tween allocation overhead and updates GPU coordinates instantly.

### Magnetic Button Component Pattern

```tsx
// components/ui/MagneticButton.tsx
'use client';

import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { usePointerCapabilities } from '@/hooks/usePointerCapabilities';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  magneticStrength?: number; // 0.1 to 0.5 recommended
  activeScale?: number;
}

export function MagneticButton({
  children,
  magneticStrength = 0.35,
  activeScale = 1.05,
  className = '',
  ...props
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const { canAnimateCursor } = usePointerCapabilities();

  useEffect(() => {
    const button = buttonRef.current;
    const text = textRef.current;
    if (!button || !canAnimateCursor) return;

    // Allocate high-speed quickTo setters
    const xTo = gsap.quickTo(button, 'x', { duration: 0.8, ease: 'power3.out' });
    const yTo = gsap.quickTo(button, 'y', { duration: 0.8, ease: 'power3.out' });
    const textXTo = text ? gsap.quickTo(text, 'x', { duration: 0.6, ease: 'power3.out' }) : null;
    const textYTo = text ? gsap.quickTo(text, 'y', { duration: 0.6, ease: 'power3.out' }) : null;

    const onMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Distance from center of element
      const deltaX = (e.clientX - centerX) * magneticStrength;
      const deltaY = (e.clientY - centerY) * magneticStrength;

      xTo(deltaX);
      yTo(deltaY);

      // Inner content moves faster for a 3D parallax depth effect
      if (textXTo && textYTo) {
        textXTo(deltaX * 0.4);
        textYTo(deltaY * 0.4);
      }
    };

    const onMouseEnter = () => {
      gsap.to(button, { scale: activeScale, duration: 0.4, ease: 'back.out(1.7)' });
    };

    const onMouseLeave = () => {
      // Elastic spring release
      xTo(0);
      yTo(0);
      if (textXTo && textYTo) {
        textXTo(0);
        textYTo(0);
      }
      gsap.to(button, {
        scale: 1,
        duration: 0.7,
        ease: 'elastic.out(1.1, 0.4)',
      });
    };

    button.addEventListener('mousemove', onMouseMove);
    button.addEventListener('mouseenter', onMouseEnter);
    button.addEventListener('mouseleave', onMouseLeave);

    return () => {
      button.removeEventListener('mousemove', onMouseMove);
      button.removeEventListener('mouseenter', onMouseEnter);
      button.removeEventListener('mouseleave', onMouseLeave);
      gsap.killTweensOf([button, text]);
    };
  }, [canAnimateCursor, magneticStrength, activeScale]);

  return (
    <button
      ref={buttonRef}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      {...props}
    >
      <span ref={textRef} className="pointer-events-none block">
        {children}
      </span>
    </button>
  );
}
```

---

## Pinned Horizontal Scrollytelling Sequence

Pinned stage animations require scoped cleanup using `@gsap/react` `useGSAP` to prevent orphan ScrollTriggers during hot reloading and navigation.

```tsx
// components/sections/HorizontalPinnedGallery.tsx
'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

interface ProjectCard {
  id: string;
  title: string;
  tagline: string;
  imgUrl: string;
}

export function HorizontalPinnedGallery({ items }: { items: ProjectCard[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const track = trackRef.current;
      const container = containerRef.current;
      if (!track || !container) return;

      // Check for mobile/touch: bypass pin and leave horizontal scroll native
      const isTouch = window.matchMedia('(hover: none) or (pointer: coarse)').matches;
      if (isTouch) return;

      const totalScrollWidth = track.scrollWidth - window.innerWidth;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          pin: true,
          scrub: 1, // 1-second lag smoothing for buttery response
          anticipatePin: 1,
          start: 'top top',
          end: () => `+=${totalScrollWidth}`,
          invalidateOnRefresh: true, // Recomputes on window resize
        },
      });

      tl.to(track, {
        x: () => -totalScrollWidth,
        ease: 'none',
      });

      // Layered parallax on child images inside the track
      gsap.utils.toArray<HTMLElement>('.parallax-layer').forEach((layer) => {
        gsap.to(layer, {
          xPercent: 18,
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            start: 'top top',
            end: () => `+=${totalScrollWidth}`,
            scrub: 1.2,
          },
        });
      });
    },
    { scope: containerRef, dependencies: [items] }
  );

  return (
    <section ref={containerRef} className="relative w-full overflow-hidden bg-neutral-950 text-white">
      {/* On touch screens, track becomes native swipeable overflow */}
      <div
        ref={trackRef}
        className="flex h-screen items-center gap-12 px-12 md:w-max md:px-24 overflow-x-auto md:overflow-visible"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative flex h-[70vh] w-[85vw] max-w-[650px] flex-shrink-0 flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 p-8 md:w-[60vw]"
            style={{ scrollSnapAlign: 'center' }}
          >
            <div className="parallax-layer absolute inset-0 -left-[10%] w-[120%] h-full">
              <img
                src={item.imgUrl}
                alt={item.title}
                className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="relative z-10">
              <span className="text-xs uppercase tracking-widest text-emerald-400">{item.tagline}</span>
              <h3 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">{item.title}</h3>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

---

## Native View Transitions Choreography

Coordinate React 19 / Next.js route transitions with GSAP timeline sequences without flash of unstyled content (FOUC).

```tsx
// hooks/usePageTransition.ts
import { useRouter } from 'next/navigation';

export function usePageTransition() {
  const router = useRouter();

  const transitionTo = (href: string) => {
    if (!document.startViewTransition) {
      router.push(href);
      return;
    }

    // Native browser snapshot with CSS animation choreography
    document.startViewTransition(async () => {
      router.push(href);
    });
  };

  return { transitionTo };
}
```

```css
/* globals.css - Cinematic View Transition Curtains */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.65s;
  animation-timing-function: cubic-bezier(0.85, 0, 0.15, 1);
}

::view-transition-old(root) {
  animation-name: slide-fade-out;
}

::view-transition-new(root) {
  animation-name: slide-fade-in;
}

@keyframes slide-fade-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-20px) scale(0.98);
  }
}

@keyframes slide-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px) scale(1.02);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

---

## Critical Motion Anti-Patterns

| Anti-Pattern | Why It Breaks | Correct Pattern |
|--------------|---------------|-----------------|
| `top: '20px'`, `left: '50px'` in GSAP | Forces browser reflow & paint on every frame; drops to 15fps | Always use `y: 20`, `x: 50` (composite transforms) |
| Omitting `ScrollTrigger.refresh()` after images load | Pins trigger at wrong scroll offsets due to layout shifts | Call `ScrollTrigger.refresh()` after fonts, images, or async data load |
| Custom cursor on touch screen | Sticky invisible rings, double-tap requirement, broken taps | Gate with `(hover: hover) and (pointer: fine)` |
| Independent `requestAnimationFrame` with Lenis | Race condition between two RAF loops causing jitter | Pass Lenis `raf()` directly into `gsap.ticker.add()` |
| Running heavy blur filters on scroll | Blur shaders saturate the GPU tile rasterizer | Animate opacity or pre-rendered blurred assets |
| Forgetting `useGSAP` cleanup/revert | Orphaned ScrollTriggers continue calculating after unmount | Always wrap GSAP hooks in `@gsap/react` `useGSAP` with scope |
