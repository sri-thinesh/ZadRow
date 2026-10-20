---
name: design-tokens-specifier
description: Architect multi-tier design token systems (Primitives to Semantic to Component tokens), mathematical typography modular scales with fluid clamp calculations, OKLCH color palettes, dark mode surface elevation shadows, CSS variable runtimes, and Tailwind CSS v3/v4 configurations. Use when establishing a design system, defining color palettes, setting up responsive typography scales, configuring dark mode theme tokens, or standardizing design-to-code pipelines.
license: MIT
metadata:
  author: mas-agency
  version: "1.0.0"
---

# Design Tokens Specifier

Production architecture for multi-tier token systems, mathematical typography scales, OKLCH color palettes, dark mode elevation physics, and seamless Tailwind CSS integration following the W3C Design Tokens Community Group (DTCG) specification.

---

## The Three-Tier Token Architecture

Never expose raw primitive values directly to component code. Strict decoupling ensures theme switches, rebranding, and accessibility contrast adjustments require zero component-level refactoring.

```
┌────────────────────────────────────────────────────────┐
│  Tier 1: Primitives (Raw, Unopinionated Values)       │
│  e.g., color.blue.500, font.size.step-3, space.16      │
└───────────────────────────┬────────────────────────────┘
                            │ mapped to
┌───────────────────────────▼────────────────────────────┐
│  Tier 2: Semantic (Contextual & Mode Intent)           │
│  e.g., surface.canvas, text.primary, action.primary.bg │
│  * Light and Dark modes diverge here                    │
└───────────────────────────┬────────────────────────────┘
                            │ consumed by
┌───────────────────────────▼────────────────────────────┐
│  Tier 3: Component (Component Scope Bindings)          │
│  e.g., button.primary.bg = var(--action-primary-bg)    │
└────────────────────────────────────────────────────────┘
```

---

## Mathematical Typography Modular Scale

Typography scales must be derived from mathematical ratios rather than arbitrary pixel sizes.

### Recommended Ratios

| Name | Ratio | Best For |
|------|-------|----------|
| Minor Third | `1.200` | Compact UI, dense dashboards, data-heavy apps |
| Major Third | `1.250` | Balanced enterprise SaaS, content blogs |
| Perfect Fourth | `1.333` | Marketing pages, expressive landing pages, editorial |
| Golden Ratio | `1.618` | High-drama display headers, artistic portfolios |

### Mathematical Fluid Clamp Formula

Smooth interpolation between minimum viewport ($W_{min}$) and maximum viewport ($W_{max}$) without abrupt media query jumps:

$$\text{Slope} = \frac{\text{Size}_{max} - \text{Size}_{min}}{W_{max} - W_{min}}$$

$$y\text{-intercept} = \text{Size}_{min} - (\text{Slope} \times W_{min})$$

$$\text{CSS Clamp} = \text{clamp}(\text{Size}_{min}\text{rem}, y\text{-intercept}\text{rem} + (\text{Slope} \times 100)\text{vw}, \text{Size}_{max}\text{rem})$$

### TypeScript Fluid Scale Calculator

```ts
// scripts/generateFluidTokens.ts

interface FluidStepConfig {
  minPx: number;
  maxPx: number;
  minViewportPx?: number;
  maxViewportPx?: number;
}

export function calculateFluidClamp({
  minPx,
  maxPx,
  minViewportPx = 375,  // Mobile minimum
  maxViewportPx = 1440, // Desktop maximum
}: FluidStepConfig): string {
  const minRem = minPx / 16;
  const maxRem = maxPx / 16;
  const minVwRem = minViewportPx / 16;
  const maxVwRem = maxViewportPx / 16;

  const slope = (maxRem - minRem) / (maxVwRem - minVwRem);
  const yIntercept = -minVwRem * slope + minRem;

  const slopeVw = (slope * 100).toFixed(4);
  const interceptRem = yIntercept.toFixed(4);

  return `clamp(${minRem.toFixed(4)}rem, ${interceptRem}rem + ${slopeVw}vw, ${maxRem.toFixed(4)}rem)`;
}

// Generate Major Third scale (1.25)
const baseSize = 16;
const ratio = 1.25;

export const typographyScale = {
  'step--2': calculateFluidClamp({ minPx: 10.24, maxPx: 10.24 }),
  'step--1': calculateFluidClamp({ minPx: 12.80, maxPx: 12.80 }),
  'step-0':  calculateFluidClamp({ minPx: 15.00, maxPx: 16.00 }),  // Base body
  'step-1':  calculateFluidClamp({ minPx: 18.00, maxPx: 20.00 }),  // H4 / Subheading
  'step-2':  calculateFluidClamp({ minPx: 21.60, maxPx: 25.00 }),  // H3
  'step-3':  calculateFluidClamp({ minPx: 26.00, maxPx: 31.25 }),  // H2
  'step-4':  calculateFluidClamp({ minPx: 31.20, maxPx: 39.06 }),  // H1
  'step-5':  calculateFluidClamp({ minPx: 37.40, maxPx: 48.83 }),  // Display Hero
};
```

---

## OKLCH Color Architecture & Light/Dark Parity

OKLCH delivers perceptual uniformity: increasing chroma ($C$) does not artificially distort perceived lightness ($L$). Hue ($H$) remains stable across tints and shades.

### OKLCH Palette Structure

- **Lightness ($L$):** `0.0` (pure black) to `1.0` (pure white)
- **Chroma ($C$):** `0.0` (pure greyscale) to `0.37` (maximum gamut vibrancy)
- **Hue ($H$):** `0` to `360` degrees

```css
/* primitives.css */
:root {
  /* Brand Hue: Indigo (265deg) */
  --color-brand-50:  oklch(0.97 0.015 265);
  --color-brand-100: oklch(0.93 0.035 265);
  --color-brand-200: oklch(0.85 0.075 265);
  --color-brand-500: oklch(0.55 0.220 265); /* Vibrant Action */
  --color-brand-600: oklch(0.48 0.220 265);
  --color-brand-900: oklch(0.24 0.080 265);
  --color-brand-950: oklch(0.14 0.035 265);

  /* Neutral Slate (260deg) */
  --color-neutral-0:   oklch(1.00 0.000 0);
  --color-neutral-50:  oklch(0.98 0.005 260);
  --color-neutral-100: oklch(0.95 0.008 260);
  --color-neutral-200: oklch(0.89 0.012 260);
  --color-neutral-400: oklch(0.70 0.015 260);
  --color-neutral-700: oklch(0.36 0.020 260);
  --color-neutral-800: oklch(0.26 0.020 260);
  --color-neutral-900: oklch(0.18 0.018 260);
  --color-neutral-950: oklch(0.12 0.014 260);
  --color-neutral-1000: oklch(0.08 0.010 260);
}
```

### Semantic Token Runtime Binding

```css
/* semantic.css */
:root {
  color-scheme: light;

  /* Surfaces */
  --surface-canvas: var(--color-neutral-50);
  --surface-card: var(--color-neutral-0);
  --surface-elevated: var(--color-neutral-0);
  --surface-overlay: var(--color-neutral-100);

  /* Typography */
  --text-primary: var(--color-neutral-950);
  --text-secondary: var(--color-neutral-700);
  --text-muted: var(--color-neutral-400);
  --text-inverted: var(--color-neutral-0);

  /* Actions */
  --action-primary-bg: var(--color-brand-500);
  --action-primary-hover: var(--color-brand-600);
  --action-primary-fg: var(--color-neutral-0);

  /* Borders */
  --border-subtle: var(--color-neutral-200);
  --border-strong: var(--color-neutral-400);
  --border-focus: var(--color-brand-500);
}

[data-theme="dark"],
.dark {
  color-scheme: dark;

  /* Surfaces: Progressively lightened elevation */
  --surface-canvas: var(--color-neutral-1000);
  --surface-card: var(--color-neutral-950);
  --surface-elevated: var(--color-neutral-900);
  --surface-overlay: var(--color-neutral-800);

  /* Typography */
  --text-primary: var(--color-neutral-50);
  --text-secondary: var(--color-neutral-200);
  --text-muted: var(--color-neutral-400);
  --text-inverted: var(--color-neutral-950);

  /* Actions */
  --action-primary-bg: var(--color-brand-500);
  --action-primary-hover: var(--color-brand-600);
  --action-primary-fg: var(--color-neutral-0);

  /* Borders */
  --border-subtle: var(--color-neutral-800);
  --border-strong: var(--color-neutral-700);
  --border-focus: var(--color-brand-200);
}
```

---

## Dark Mode Elevation & Physics-Based Shadows

In dark mode, drop shadows cast by black silhouettes are invisible against dark canvas surfaces. Dark mode elevation must be achieved using two physical techniques:
1. **Surface Luminance Increment:** Higher elements reflect more ambient light (elevate lightness by `+2%` to `+6%` OKLCH per tier).
2. **Inner Specular Highlight Rim:** Subtly highlight the top edge of floating cards.

```css
/* elevation.css */
:root {
  /* Light Mode Multi-Layer Shadows (Ambient + Direct) */
  --shadow-elevation-1: 
    0 1px 2px -1px rgb(0 0 0 / 0.08),
    0 2px 4px -1px rgb(0 0 0 / 0.04);

  --shadow-elevation-2: 
    0 4px 6px -2px rgb(0 0 0 / 0.05),
    0 10px 15px -3px rgb(0 0 0 / 0.08);

  --shadow-elevation-3: 
    0 10px 25px -5px rgb(0 0 0 / 0.10),
    0 20px 25px -5px rgb(0 0 0 / 0.04);
}

[data-theme="dark"],
.dark {
  /* Dark Mode: Ambient Glow + Specular Rim Lighting */
  --shadow-elevation-1:
    inset 0 1px 0 0 rgb(255 255 255 / 0.07),
    0 1px 3px 0 rgb(0 0 0 / 0.40);

  --shadow-elevation-2:
    inset 0 1px 0 0 rgb(255 255 255 / 0.10),
    0 4px 12px 0 rgb(0 0 0 / 0.55),
    0 1px 3px 0 rgb(0 0 0 / 0.40);

  --shadow-elevation-3:
    inset 0 1px 0 0 rgb(255 255 255 / 0.14),
    0 12px 32px 0 rgb(0 0 0 / 0.70),
    0 2px 6px 0 rgb(0 0 0 / 0.50);
}
```

---

## Tailwind CSS Integration

### Tailwind v4 Setup (`app.css`)

```css
@import "tailwindcss";

@theme {
  /* Colors linked directly to semantic variables */
  --color-canvas: var(--surface-canvas);
  --color-card: var(--surface-card);
  --color-elevated: var(--surface-elevated);
  --color-primary: var(--action-primary-bg);
  --color-primary-hover: var(--action-primary-hover);
  --color-text-main: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-border-subtle: var(--border-subtle);

  /* Fluid Typography Scale */
  --font-size-step-0: var(--type-step-0);
  --font-size-step-1: var(--type-step-1);
  --font-size-step-2: var(--type-step-2);
  --font-size-step-3: var(--type-step-3);
  --font-size-step-4: var(--type-step-4);
  --font-size-step-5: var(--type-step-5);

  /* Elevation Shadows */
  --shadow-elev-1: var(--shadow-elevation-1);
  --shadow-elev-2: var(--shadow-elevation-2);
  --shadow-elev-3: var(--shadow-elevation-3);
}
```

### Tailwind v3 Configuration (`tailwind.config.ts`)

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--surface-canvas)',
        card: 'var(--surface-card)',
        elevated: 'var(--surface-elevated)',
        primary: {
          DEFAULT: 'var(--action-primary-bg)',
          hover: 'var(--action-primary-hover)',
          fg: 'var(--action-primary-fg)',
        },
        fg: {
          main: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
      },
      boxShadow: {
        'elev-1': 'var(--shadow-elevation-1)',
        'elev-2': 'var(--shadow-elevation-2)',
        'elev-3': 'var(--shadow-elevation-3)',
      },
      fontSize: {
        'step-0': 'var(--type-step-0)',
        'step-1': 'var(--type-step-1)',
        'step-2': 'var(--type-step-2)',
        'step-3': 'var(--type-step-3)',
        'step-4': 'var(--type-step-4)',
        'step-5': 'var(--type-step-5)',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Token Architecture Anti-Patterns

| Anti-Pattern | Fatal Flaw | Correct Architecture |
|--------------|------------|----------------------|
| Hardcoding `#3b82f6` in component classes | Breaking rebrand requires scanning thousands of files | Bind to `bg-primary` which points to `--action-primary-bg` |
| Component using Primitive directly | Bypasses light/dark semantic mapping | `Component -> Semantic -> Primitive` |
| Dark mode identical surface colors | Complete loss of visual depth and modal separation | Increase surface lightness by +2% to +6% per z-layer |
| Black drop shadows in dark mode | Invisible against black canvas | Combine ambient spread with `inset 0 1px 0 rgba(255,255,255,0.1)` |
| Breakpoint jump font-sizes | Jarring layout shifts on window resize | Use mathematical `clamp()` fluid formulas |
