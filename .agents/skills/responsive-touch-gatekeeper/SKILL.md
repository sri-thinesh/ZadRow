---
name: responsive-touch-gatekeeper
description: Enforce mobile-first touch ergonomics, dynamic viewport unit safety (100dvh/100svh), minimum 44x44px touch hit targets, strict zero scroll-jacking policies, and automatic conversion of pinned desktop scrollytelling into native swipeable touch carousels. Use when building mobile-responsive layouts, fixing mobile browser address bar jumpiness, implementing touch carousels, auditing touch target sizes, or creating adaptive desktop-to-mobile layouts.
license: MIT
metadata:
  author: mas-agency
  version: "1.0.0"
---

# Responsive Touch Gatekeeper

Mobile-first responsive architecture ensuring zero scroll-jacking, dynamic viewport stability (`100dvh`), WCAG compliant touch targets (≥ 44×44px), and seamless conversion of pinned desktop scrollytelling into native touch-friendly carousels.

---

## The Dynamic Viewport Height Contract (`100dvh` vs `100vh`)

On mobile devices (iOS Safari, Android Chrome), browser navigation bars expand and retract during scrolling. Using standard `100vh` causes content to be cut off beneath the bottom toolbar and creates jarring layout jumps when the bar toggles.

### Viewport Height Rules

| Unit | Browser State | Recommended Use Case |
|------|---------------|----------------------|
| `100svh` (Small) | Address bar fully expanded | Initial above-the-fold hero sections where no content may hide behind toolbars |
| `100lvh` (Large) | Address bar fully collapsed | Fullscreen media or immersive modal backdrops |
| `100dvh` (Dynamic)| Dynamically recalculates with bar | Layout containers that must fill the active visible window |
| `100vh` (Classic) | Fixed to initial viewport | **Avoid on mobile** due to bottom bar clipping |

### Safe Area Insets Architecture

Modern smartphones feature camera notches and home indicator pills. Never anchor interactive buttons flush to `bottom: 0`.

```css
/* base-viewport.css */
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}

.hero-fullscreen {
  min-height: 100svh; /* Fallback */
  min-height: 100dvh;
  padding-top: max(1.5rem, var(--safe-top));
  padding-bottom: max(1.5rem, var(--safe-bottom));
  padding-left: max(1rem, var(--safe-left));
  padding-right: max(1rem, var(--safe-right));
}

/* Eliminate 300ms double-tap delay on mobile browsers */
html, button, a, input {
  touch-action: manipulation;
}
```

---

## Touch Target Ergonomics (WCAG 2.5.5 & 2.5.8)

Users touch screens with thumb pads measuring roughly `10mm` across. Interactive elements with small hit targets lead to mis-clicks, frustration, and abandonment.

### Specifications
- **WCAG 2.2 AAA (SC 2.5.5):** Minimum target size of **44 × 44 CSS pixels**.
- **WCAG 2.2 AA (SC 2.5.8):** Minimum target size of **24 × 24 CSS pixels**, provided there is at least **24 CSS pixels of spacing** to the nearest interactive boundary.

### The "Ghost Hit Area" Technique

When visual design requires a compact 18px or 20px icon, expand its clickable boundary to 44×44px using an invisible pseudo-element without disturbing the flexbox/grid layout:

```tsx
// components/ui/GhostIconButton.tsx
import React from 'react';

interface GhostIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
}

export function GhostIconButton({ icon, label, className = '', ...props }: GhostIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`relative inline-flex items-center justify-center p-2 rounded-full 
                 text-neutral-300 hover:text-white transition-colors
                 focus-visible:ring-2 focus-visible:ring-indigo-500
                 /* Ghost Hit Area: Ensures ≥ 44x44px target */
                 after:absolute after:inset-[-10px] after:content-[''] after:min-w-[44px] after:min-h-[44px]
                 ${className}`}
      {...props}
    >
      <span className="w-5 h-5 pointer-events-none">{icon}</span>
    </button>
  );
}
```

---

## The Zero Scroll-Jacking Mandate on Touchscreens

Scroll-jacking (intercepting wheel events, pinning full-page sections, or simulating physics on mobile touchscreens) is strictly prohibited. It breaks hardware-accelerated momentum scrolling, produces motion sickness, and traps users inside pinned DOM sections.

### Dual-Mode Architecture

```
┌────────────────────────────────────────────────────────┐
│               Device Capability Check                  │
│       matchMedia('(hover: hover) and (pointer: fine)') │
└───────────┬────────────────────────────────┬───────────┘
            │ True                           │ False
┌───────────▼─────────────┐      ┌───────────▼───────────┐
│ Desktop Experience      │      │ Mobile/Touch Experience│
│ • GSAP ScrollTrigger    │      │ • CSS Scroll Snap     │
│ • Section Pinning       │      │ • Native Momentum     │
│ • Parallax Offsets      │      │ • Swipeable Carousel  │
│ • Magnetic Cursors      │      │ • Touch Pagination    │
└─────────────────────────┘      └───────────────────────┘
```

---

## Adaptive Scrollytelling-to-Carousel Component

The following component automatically detects device capabilities:
- **On Desktop:** Pins the viewport and scrolls horizontally via GSAP ScrollTrigger.
- **On Touch/Mobile:** Immediately bypasses GSAP pinning and renders a 100% native CSS Scroll Snap carousel with hardware momentum.

```tsx
// components/sections/AdaptiveScrollytelling.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

export interface StepItem {
  id: string;
  stepNumber: string;
  title: string;
  description: string;
  badge: string;
}

interface AdaptiveScrollytellingProps {
  steps: StepItem[];
}

export function AdaptiveScrollytelling({ steps }: AdaptiveScrollytellingProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);

  // 1. Detect capability
  useEffect(() => {
    const checkCapability = () => {
      const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      const wideScreen = window.innerWidth >= 1024;
      setIsDesktop(finePointer && wideScreen);
    };

    checkCapability();
    window.addEventListener('resize', checkCapability);
    return () => window.removeEventListener('resize', checkCapability);
  }, []);

  // 2. Desktop-only GSAP ScrollTrigger
  useGSAP(
    () => {
      if (!isDesktop) return;

      const track = trackRef.current;
      const container = containerRef.current;
      if (!track || !container) return;

      const scrollDistance = track.scrollWidth - window.innerWidth;

      const trigger = ScrollTrigger.create({
        trigger: container,
        pin: true,
        scrub: 1,
        start: 'top top',
        end: () => `+=${scrollDistance}`,
        invalidateOnRefresh: true,
        animation: gsap.to(track, {
          x: () => -scrollDistance,
          ease: 'none',
        }),
      });

      return () => {
        trigger.kill();
      };
    },
    { scope: containerRef, dependencies: [isDesktop, steps] }
  );

  // 3. Mobile scroll listener for pagination indicator dots
  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isDesktop) return;
    const target = e.currentTarget;
    const itemWidth = target.clientWidth * 0.85;
    const index = Math.round(target.scrollLeft / itemWidth);
    setActiveMobileIndex(Math.min(Math.max(0, index), steps.length - 1));
  };

  return (
    <section
      ref={containerRef}
      className={`relative w-full bg-neutral-950 text-white ${
        isDesktop ? 'h-screen overflow-hidden' : 'py-16'
      }`}
    >
      <div className="px-6 md:px-12 mb-8 max-w-7xl mx-auto">
        <span className="text-sm font-mono uppercase tracking-widest text-indigo-400">
          Choreographed Workflow
        </span>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mt-2">
          From Concept to Production
        </h2>
      </div>

      {/* Track Container: GSAP transform on desktop, Native CSS Scroll Snap on mobile */}
      <div
        ref={trackRef}
        onScroll={handleMobileScroll}
        className={`flex items-center gap-6 ${
          isDesktop
            ? 'h-[75vh] w-max px-12 will-change-transform'
            : 'w-full overflow-x-auto px-6 pb-6 pt-2 snap-x snap-mandatory scroll-smooth'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: isDesktop ? 'auto' : 'none',
        }}
      >
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 shadow-xl ${
              isDesktop
                ? 'w-[520px] h-[480px] flex-shrink-0'
                : 'w-[85vw] max-w-[360px] h-[380px] flex-shrink-0 snap-center'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-4xl font-black text-neutral-600 font-mono">
                  {step.stepNumber}
                </span>
                <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                  {step.badge}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-bold text-white">{step.title}</h3>
              <p className="mt-3 text-neutral-400 leading-relaxed text-sm">
                {step.description}
              </p>
            </div>

            <div className="pt-6 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
              <span>Standard Verification</span>
              <span className="text-emerald-400 font-mono">Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Pagination Indicator Dots */}
      {!isDesktop && (
        <div className="mt-6 flex justify-center items-center gap-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                activeMobileIndex === idx
                  ? 'w-6 bg-indigo-500'
                  : 'w-2 bg-neutral-700'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

---

## Critical Touch & Responsive Anti-Patterns

| Anti-Pattern | Consequence | Remedy |
|--------------|-------------|--------|
| `e.preventDefault()` on touchmove | Completely disables page scrolling on mobile | Never prevent default on document-level touch events |
| `100vh` for full-screen hero containers | Dynamic toolbar expansion cuts off CTA buttons | Use `100svh` or `100dvh` with safe-area insets |
| 24px icon button without padding | 40% miss-rate when tapped with mobile thumbs | Add ghost hit area `after:inset-[-10px]` to reach ≥ 44×44px |
| Pinned scrollytelling on mobile screens | User gets stuck; page traps vertical scroll in fake horizontal loop | Gate pinning with `(hover: hover) and (pointer: fine)` |
| Omitting `touch-action: manipulation` | Mobile browsers delay click events by 300ms to detect double-taps | Add `touch-action: manipulation` to interactive controls |
| Disabling user pinch-to-zoom (`user-scalable=no`) | Severe accessibility violation for visually impaired users | Never disable user viewport scaling in meta tags |
