---
name: wcag-contrast-auditor
description: Audit and enforce WCAG 2.2 Level AA and AAA accessibility compliance. Includes exact mathematical relative luminance algorithms, 4.5:1 and 3:1 contrast ratio verification, alpha blending calculations, focus-visible indicators, keyboard navigation traps, and ARIA roles for complex custom interactive components. Use when checking accessibility, calculating color contrast, testing keyboard focus rings, designing accessible forms, modals, tabs, or auditing UI components against WCAG standards.
license: MIT
metadata:
  author: mas-agency
  version: "1.0.0"
---

# WCAG Contrast Auditor & A11y Verification Engine

Production-grade guide and mathematical algorithms for auditing WCAG 2.2 Level AA and AAA compliance: relative luminance calculation, alpha-composite contrast checking, high-visibility focus indicators, and robust ARIA keyboard contracts.

---

## The Mathematical Luminance & Contrast Formula

The Web Content Accessibility Guidelines (WCAG 2.2) define contrast ratio based on relative luminance ($L$), defined on a scale of `0.0` (pure black) to `1.0` (pure white).

### 1. Relative Luminance ($L$)
Convert 8-bit sRGB color channels ($R_8, G_8, B_8 \in [0, 255]$) to linear float components ($C_{linear} \in [0, 1]$):

$$C_{srgb} = \frac{C_8}{255}$$

$$C_{linear} = \begin{cases} 
\frac{C_{srgb}}{12.92} & \text{if } C_{srgb} \le 0.04045 \\
\left(\frac{C_{srgb} + 0.055}{1.055}\right)^{2.4} & \text{if } C_{srgb} > 0.04045 
\end{cases}$$

Then compute luminance:

$$L = 0.2126 \times R_{linear} + 0.7152 \times G_{linear} + 0.0722 \times B_{linear}$$

### 2. Contrast Ratio ($CR$)
Given the luminance of the lighter color ($L_1$) and darker color ($L_2$):

$$CR = \frac{L_1 + 0.05}{L_2 + 0.05} \quad (1.0 \le CR \le 21.0)$$

### 3. Alpha Blending over Solid Background
When a foreground color has transparency ($\alpha < 1.0$), blend against the background before computing luminance:

$$C_{blended} = \alpha \times C_{fg} + (1 - \alpha) \times C_{bg}$$

---

## WCAG 2.2 Compliance Matrix

| UI Element Type | Size / Weight Threshold | Level AA Minimum | Level AAA Minimum | Success Criterion |
|-----------------|-------------------------|------------------|-------------------|-------------------|
| **Body / Normal Text** | `< 24px` (`< 18pt`) or `< 18.66px` bold | **4.5 : 1** | **7.0 : 1** | SC 1.4.3 / 1.4.6 |
| **Large Text** | `≥ 24px` (`≥ 18pt`) or `≥ 18.66px` (`≥ 14pt`) bold | **3.0 : 1** | **4.5 : 1** | SC 1.4.3 / 1.4.6 |
| **UI Components** | Input borders, checkboxes, toggle switches | **3.0 : 1** | N/A | SC 1.4.11 |
| **Graphical Objects** | Essential icons, charts, infographics | **3.0 : 1** | N/A | SC 1.4.11 |
| **Focus Rings** | Focused vs unfocused state & background | **3.0 : 1** (thickness ≥ 2px) | **3.0 : 1** | SC 2.4.13 |

---

## Complete TypeScript Auditor Engine

```ts
// utils/wcagContrast.ts

export interface RGB {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

export interface RGBA extends RGB {
  a: number; // 0.0 - 1.0
}

export interface ContrastAuditResult {
  contrastRatio: number;
  formattedRatio: string;
  passesAA_NormalText: boolean;
  passesAA_LargeText: boolean;
  passesAA_UIComponent: boolean;
  passesAAA_NormalText: boolean;
  passesAAA_LargeText: boolean;
}

export function parseHex(hex: string): RGBA {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('') + 'ff';
  } else if (clean.length === 6) {
    clean = clean + 'ff';
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 24) & 255,
    g: (num >> 16) & 255,
    b: (num >> 8) & 255,
    a: (num & 255) / 255,
  };
}

export function compositeAlpha(fg: RGBA, bg: RGB): RGB {
  return {
    r: Math.round(fg.a * fg.r + (1 - fg.a) * bg.r),
    g: Math.round(fg.a * fg.g + (1 - fg.a) * bg.g),
    b: Math.round(fg.a * fg.b + (1 - fg.a) * bg.b),
  };
}

export function calculateRelativeLuminance(rgb: RGB): number {
  const transform = (c8: number): number => {
    const c = c8 / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const rLinear = transform(rgb.r);
  const gLinear = transform(rgb.g);
  const bLinear = transform(rgb.b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

export function getContrastRatio(fgHex: string, bgHex: string): number {
  const fgRGBA = parseHex(fgHex);
  const bgRGBA = parseHex(bgHex);
  const bgRGB: RGB = { r: bgRGBA.r, g: bgRGBA.g, b: bgRGBA.b };

  const effectiveFG = fgRGBA.a < 1.0 ? compositeAlpha(fgRGBA, bgRGB) : fgRGBA;

  const l1 = calculateRelativeLuminance(effectiveFG);
  const l2 = calculateRelativeLuminance(bgRGB);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function auditContrast(fgHex: string, bgHex: string): ContrastAuditResult {
  const ratio = getContrastRatio(fgHex, bgHex);
  const rounded = Math.floor(ratio * 100) / 100;

  return {
    contrastRatio: rounded,
    formattedRatio: `${rounded.toFixed(2)}:1`,
    passesAA_NormalText: rounded >= 4.5,
    passesAA_LargeText: rounded >= 3.0,
    passesAA_UIComponent: rounded >= 3.0,
    passesAAA_NormalText: rounded >= 7.0,
    passesAAA_LargeText: rounded >= 4.5,
  };
}
```

---

## Keyboard Navigation & Focus Visible Rings

WCAG 2.2 Success Criterion 2.4.13 (Focus Appearance) requires:
1. **Minimum area:** The focus indicator must have an area at least as large as a 2px thick perimeter around the component.
2. **Contrast:** The focus indicator must have at least **3.0:1 contrast** against both the unfocused element state and the adjacent background.

### Bulletproof Focus Visible CSS / Tailwind Pattern

Never suppress `outline: none` without providing an explicit `:focus-visible` ring.

```css
/* Accessible High-Contrast Focus Ring */
.interactive-element:focus-visible {
  outline: 2px solid transparent; /* Fallback for Windows High Contrast Mode */
  outline-offset: 2px;
  box-shadow: 
    0 0 0 2px var(--surface-canvas),  /* Spacing ring */
    0 0 0 4px var(--border-focus);    /* Visible 3:1 focus ring */
}
```

In Tailwind CSS:
```tsx
<button
  className="rounded-lg px-4 py-2 bg-indigo-600 text-white font-medium
             focus:outline-none 
             focus-visible:ring-2 
             focus-visible:ring-indigo-500 
             focus-visible:ring-offset-2 
             focus-visible:ring-offset-neutral-950"
>
  Accessible Action
</button>
```

---

## ARIA Contracts for Custom Interactive Components

### 1. Accessible Modal Dialog (WAI-ARIA 1.2)
- Must trap Tab key focus within modal boundaries.
- Must dismiss on `Escape` key press.
- Must restore focus to trigger element when closed.
- Must lock background scrolling (`aria-hidden="true"` on root or scroll lock).

```tsx
// components/ui/AccessibleModal.tsx
'use client';

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function AccessibleModal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab' && modalRef.current) {
          const focusable = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Focus first element on open
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 50);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        triggerRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="modal-title" className="text-xl font-bold text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded p-1 text-neutral-400 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 text-neutral-300">{children}</div>
      </div>
    </div>
  );
}
```

### 2. Accessible Tabs Pattern (Roving Tabindex)
- `role="tablist"` with `aria-orientation="horizontal"`.
- Active tab has `tabIndex={0}` and `aria-selected="true"`.
- Inactive tabs have `tabIndex={-1}` and `aria-selected="false"`.
- `ArrowRight` / `ArrowLeft` keys cycle through tabs, skipping tab panels.

```tsx
// components/ui/AccessibleTabs.tsx
'use client';

import React, { useState, useRef } from 'react';

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function AccessibleTabs({ tabs }: { tabs: TabItem[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    setSelectedIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="w-full">
      <div role="tablist" aria-orientation="horizontal" className="flex border-b border-neutral-700">
        {tabs.map((tab, idx) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[idx] = el; }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selectedIndex === idx}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selectedIndex === idx ? 0 : -1}
            onClick={() => setSelectedIndex(idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              selectedIndex === idx
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${tabs[selectedIndex].id}`}
        aria-labelledby={`tab-${tabs[selectedIndex].id}`}
        tabIndex={0}
        className="py-4 text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {tabs[selectedIndex].content}
      </div>
    </div>
  );
}
```

---

## Critical WCAG Audit Checklist

1. [ ] **Text Contrast:** Normal text has at least `4.5:1` contrast against its effective blended background.
2. [ ] **Large Text Contrast:** Text ≥ 24px (or ≥ 18.66px bold) has at least `3.0:1` contrast.
3. [ ] **Input & Icon Boundaries:** Form input borders and active indicators have at least `3.0:1` contrast against surrounding canvas.
4. [ ] **Keyboard Focus Rings:** Every interactive button, link, and input has a `:focus-visible` indicator with `3.0:1` contrast and ≥ 2px visual footprint.
5. [ ] **No Color-Only State:** Errors and active states pair color changes with an icon, badge, or text label.
6. [ ] **Focus Trapping:** Modal dialogs constrain Tab navigation to the modal and return focus to the trigger on close.
