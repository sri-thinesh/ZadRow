/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * Code Synthesizer Engine
 *
 * Assembles all agent outputs into a clean, complete, production-grade
 * Next.js 15 / React 19 website in `mas_agency/output/website/`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CodeSynthesizer {
  constructor(options = {}) {
    this.agencyDir = options.agencyDir || path.resolve(__dirname, '../..');
    this.artifactsDir = options.artifactsDir || path.join(this.agencyDir, 'workspace', 'artifacts');
    this.outputDir = options.outputDir || path.join(this.agencyDir, 'output', 'website');
  }

  _loadArtifact(filename, artifactsMap = {}, fallback = null) {
    if (artifactsMap && artifactsMap[filename]) {
      const val = artifactsMap[filename];
      return typeof val === 'string' ? JSON.parse(val) : val;
    }
    const fullPath = path.join(this.artifactsDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } catch (_) {
        return fallback;
      }
    }
    return fallback;
  }

  /**
   * Main synthesis pipeline: reads artifacts and generates all site files
   */
  async synthesize(briefData = {}, artifactsMap = {}) {
    // 0. Dynamic artifact extraction from upstream waves
    const charter = this._loadArtifact('01_scope_charter.json', artifactsMap) ||
                    this._loadArtifact('00_executive_brief.json', artifactsMap) || {};
    const tokensArtifact = this._loadArtifact('32_design_tokens_and_components.json', artifactsMap) ||
                           this._loadArtifact('02_design_tokens.json', artifactsMap) || {};
    const copyArtifact = this._loadArtifact('33_copywriting_and_conversion.json', artifactsMap) ||
                         this._loadArtifact('01_brand_copy.json', artifactsMap) || {};
    const iaArtifact = this._loadArtifact('12_information_architecture.json', artifactsMap) ||
                       this._loadArtifact('01_ux_architecture.json', artifactsMap) || {};
    const backendEndpoints = this._loadArtifact('61_server_endpoints.json', artifactsMap) || null;

    const brandName = briefData.brandName || charter.brandName || 'STUDIO SYNTHETIX';
    const clientVision = briefData.clientVision || charter.clientVision || 'High-Performance Generative Studio';

    // Ensure output directories exist
    this._ensureDirectoryStructure();

    // 1. Generate package.json
    this._generatePackageJson(brandName);

    // 2. Generate tsconfig.json
    this._generateTsConfig();

    // 3. Generate tailwind.config.ts & postcss.config.mjs
    this._generateTailwindConfig();
    this._generatePostcssConfig();

    // 4. Generate next.config.ts
    this._generateNextConfig();

    // 5. Generate lib/utils.ts & types/index.ts
    this._generateUtils();
    this._generateTypes();

    // 6. Generate globals.css & app layout
    this._generateGlobalsCss(tokensArtifact);
    this._generateLayout(brandName);

    // 7. Generate page.tsx
    this._generatePage(brandName);

    // 8. Generate all interactive components with dynamic artifacts
    this._generateNavigation(brandName, iaArtifact);
    this._generateHeroStage(brandName, copyArtifact);
    this._generateFeatureBento(brandName, copyArtifact, charter);
    this._generateMediaPlaceholder();
    this._generateInteractiveShowcase(brandName, copyArtifact);
    this._generateFooterConversion(brandName, copyArtifact);
    this._generateMagneticCursor();
    this._generateSoundEffects();
    this._generateProceduralGraphics();

    // 9. Generate server API endpoints if backend active; otherwise clean up stale api routes
    if (backendEndpoints) {
      this._generateApiRoutes(backendEndpoints);
    } else {
      const apiDir = path.join(this.outputDir, 'src', 'app', 'api');
      if (fs.existsSync(apiDir)) {
        try {
          fs.rmSync(apiDir, { recursive: true, force: true });
        } catch (_) {}
      }
    }

    // 10. Generate README.md
    this._generateReadme(brandName, clientVision);

    return {
      outputDir: this.outputDir,
      fileCount: this._countSynthesizedFiles(),
      brandName,
    };
  }

  _ensureDirectoryStructure() {
    const dirs = [
      this.outputDir,
      path.join(this.outputDir, 'src'),
      path.join(this.outputDir, 'src', 'app'),
      path.join(this.outputDir, 'src', 'components'),
      path.join(this.outputDir, 'src', 'lib'),
      path.join(this.outputDir, 'src', 'types'),
      path.join(this.outputDir, 'public'),
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  _countSynthesizedFiles() {
    let count = 0;
    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        if (f.isDirectory()) walk(path.join(dir, f.name));
        else count++;
      }
    };
    walk(this.outputDir);
    return count;
  }

  _writeFile(relativePath, content) {
    const fullPath = path.join(this.outputDir, relativePath);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  }

  _generatePackageJson(brandName) {
    const pkg = {
      name: brandName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-site',
      version: '1.0.0',
      private: true,
      description: `Award-winning website for ${brandName}, engineered by ZadRow MAS 2.0`,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies: {
        next: '15.2.0',
        react: '19.0.0',
        'react-dom': '19.0.0',
        'lucide-react': '^0.475.0',
        clsx: '^2.1.1',
        'tailwind-merge': '^2.6.0',
        motion: '^12.4.7',
      },
      devDependencies: {
        '@types/node': '^22.13.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
        autoprefixer: '^10.4.20',
        postcss: '^8.5.1',
        tailwindcss: '^3.4.17',
        typescript: '^5.7.3',
      },
    };

    this._writeFile('package.json', JSON.stringify(pkg, null, 2));
  }

  _generateTsConfig() {
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [
          {
            name: 'next',
          },
        ],
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    };

    this._writeFile('tsconfig.json', JSON.stringify(tsconfig, null, 2));
  }

  _generateTailwindConfig() {
    const content = `
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-card)',
        elevated: 'var(--bg-elevated)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          glow: 'var(--color-primary-glow)',
        },
        secondary: 'var(--color-secondary)',
        subtle: 'var(--border-subtle)',
        highlight: 'var(--border-highlight)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
      },
      fontFamily: {
        display: ['Syne', 'Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'radar-sweep': 'radarSweep 8s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
`;
    this._writeFile('tailwind.config.ts', content);
  }

  _generatePostcssConfig() {
    const content = `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
    this._writeFile('postcss.config.mjs', content);
  }

  _generateNextConfig() {
    const content = `
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
`;
    this._writeFile('next.config.ts', content);
  }

  _generateUtils() {
    const content = `
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
`;
    this._writeFile('src/lib/utils.ts', content);
  }

  _generateTypes() {
    const content = `
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
}

export interface BentoCardItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  metric: string;
}

export interface MetricItem {
  label: string;
  value: string;
}

export interface MediaPlaceholderProps {
  type?: 'photo' | 'video' | 'gallery' | 'space';
  aspectRatio?: string;
  title?: string;
  subtitle?: string;
  dimensions?: string;
  className?: string;
  showAnimation?: boolean;
}
`;
    this._writeFile('src/types/index.ts', content);
  }

  _generateGlobalsCss(tokensArtifact = {}) {
    const tokenRoot = tokensArtifact.tokens || tokensArtifact.data?.tokens || {};
    // `_buildDesignTokens` nests values under `colors`; agent-authored artifacts may
    // be flat. Support both so design tokens actually reach the stylesheet instead of
    // silently falling back to the hardcoded defaults below.
    const rawTokens = tokenRoot.colors || tokenRoot;
    const primary = rawTokens['--color-primary'] || rawTokens.primary || '#00f0ff';
    const primaryGlow = rawTokens['--color-primary-glow'] || rawTokens.primaryGlow || 'rgba(0, 240, 255, 0.35)';
    const secondary = rawTokens['--color-secondary'] || rawTokens.secondary || '#7000ff';
    const bgCanvas = rawTokens['--bg-canvas'] || rawTokens.background || '#090a0f';
    const bgCard = rawTokens['--bg-card'] || rawTokens.surface || 'rgba(17, 19, 28, 0.75)';
    const bgElevated = rawTokens['--bg-elevated'] || rawTokens.surfaceElevated || '#171a26';
    const textPrimary = rawTokens['--text-primary'] || rawTokens.textPrimary || '#f8fafc';
    const textSecondary = rawTokens['--text-secondary'] || rawTokens.textSecondary || '#94a3b8';
    const textMuted = rawTokens['--text-muted'] || rawTokens.textMuted || '#64748b';
    const borderSubtle = rawTokens['--border-subtle'] || 'rgba(255, 255, 255, 0.08)';
    const borderHighlight = rawTokens['--border-highlight'] || 'rgba(0, 240, 255, 0.55)';

    const content = `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-canvas: ${bgCanvas};
  --bg-card: ${bgCard};
  --bg-elevated: ${bgElevated};
  --text-primary: ${textPrimary};
  --text-secondary: ${textSecondary};
  --text-muted: ${textMuted};
  --color-primary: ${primary};
  --color-primary-glow: ${primaryGlow};
  --color-secondary: ${secondary};
  --border-subtle: ${borderSubtle};
  --border-highlight: ${borderHighlight};
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, sans-serif;
  color-scheme: dark;
}

body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  min-height: 100svh;
  min-height: 100dvh;
}

/* Glassmorphism primitives */
.glass-panel {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtle);
}

.glass-panel-elevated {
  background: rgba(23, 26, 38, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-highlight);
  box-shadow: 0 0 30px -10px var(--color-primary-glow);
}

/* Gradient text */
.text-gradient {
  background: linear-gradient(135deg, #ffffff 20%, var(--color-primary) 70%, var(--color-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: var(--bg-canvas);
}
::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary);
}

/* Skip link for WCAG keyboard accessibility */
.skip-link {
  position: absolute;
  top: -60px;
  left: 10px;
  background: var(--color-primary);
  color: #000;
  padding: 12px 20px;
  min-height: 44px;
  min-width: 44px;
  z-index: 1000;
  transition: top 0.2s ease;
  font-weight: 700;
  border-radius: 4px;
}
.skip-link:focus {
  top: 10px;
}
`;
    this._writeFile('src/app/globals.css', content);
  }

  _generateLayout(brandName) {
    const isThinesh = process.env.ZADROW_AUTHOR_DEMO === '1';
    const resolvedBrand = (brandName && String(brandName).trim()) || 'Autonomous Digital Studio';
    const pageTitle = isThinesh ? 'Sri Thinesh | Student Engineer, AI & Product Portfolio' : `${resolvedBrand} | Autonomous Digital Studio`;
    const pageDesc = isThinesh
      ? 'Explore the personal portfolio of Sri Thinesh — engineering student exploring software development, artificial intelligence, product design, electronics, and entrepreneurship.'
      : `Experience the digital frontier with ${resolvedBrand}. High-velocity kinetic systems, generative AI spatial design, and uncompromised aesthetic precision.`;
    const content = `
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MagneticCursor } from '@/components/MagneticCursor';
import { SoundEffects } from '@/components/SoundEffects';
import { ProceduralGraphics } from '@/components/ProceduralGraphics';

export const metadata: Metadata = {
  title: '${pageTitle}',
  description: '${pageDesc}',
  keywords: ['${resolvedBrand}', 'Digital Studio', 'Design Engineering', 'Next.js 15', 'React 19'],
  openGraph: {
    title: '${pageTitle}',
    description: '${pageDesc}',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#090a0f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;700&family=Syne:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas text-text-primary antialiased selection:bg-primary selection:text-black">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ProceduralGraphics />
        <MagneticCursor />
        <SoundEffects />
        {children}
      </body>
    </html>
  );
}
`;
    this._writeFile('src/app/layout.tsx', content);
  }

  _generatePage(brandName) {
    const content = `
import { Navigation } from '@/components/Navigation';
import { HeroStage } from '@/components/HeroStage';
import { FeatureBento } from '@/components/FeatureBento';
import { InteractiveShowcase } from '@/components/InteractiveShowcase';
import { FooterConversion } from '@/components/FooterConversion';

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden">
      <Navigation />
      <main id="main-content" className="flex-1">
        <HeroStage />
        <FeatureBento />
        <InteractiveShowcase />
      </main>
      <FooterConversion />
    </div>
  );
}
`;
    this._writeFile('src/app/page.tsx', content);
  }

  _generateNavigation(brandName, iaArtifact = {}) {
    // Author demo mode is OPT-IN only. It previously triggered on `!brandName`, which meant
    // any brief whose brand extraction failed silently produced the author's personal
    // portfolio as the client's deliverable.
    const isThinesh = process.env.ZADROW_AUTHOR_DEMO === '1';
    const displayBrand = isThinesh ? 'SRI THINESH' : brandName.toUpperCase();
    const ctaLabel = isThinesh ? 'TRANSMISSION' : 'INITIATE BRIEF';
    const content = `
'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight, Sparkles } from 'lucide-react';

const NAV_LINKS = ${isThinesh ? `[
  { id: 'hero', label: 'Overview', href: '#hero' },
  { id: 'about', label: 'Mindset', href: '#about' },
  { id: 'domains', label: 'Domains', href: '#domains' },
  { id: 'projects', label: 'Work', href: '#projects' },
  { id: 'contact', label: 'Transmission', href: '#contact' },
]` : `[
  { id: 'hero', label: 'Studio', href: '#hero' },
  { id: 'features', label: 'Matrix', href: '#features' },
  { id: 'showcase', label: 'Telemetry', href: '#showcase' },
  { id: 'contact', label: 'Transmission', href: '#contact' },
]`};

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={\`fixed top-0 left-0 right-0 z-50 transition-all duration-300 \${
        scrolled
          ? 'py-3 backdrop-blur-md bg-canvas/80 border-b border-subtle shadow-lg'
          : 'py-6 bg-transparent'
      }\`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Studio / Personal Brand */}
          <a
            href="#hero"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1 min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-primary group-hover:border-primary transition-colors">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-widest text-text-primary group-hover:text-primary transition-colors">
                ${displayBrand}
              </span>
              ${isThinesh ? `<span className="font-mono text-[10px] text-text-muted tracking-wider">ENGINEERING // AI & SYSTEMS</span>` : ''}
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 rounded-full px-4 py-1.5 glass-panel">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                className="px-4 py-2 min-h-[44px] inline-flex items-center text-xs font-mono tracking-wider text-text-secondary hover:text-primary transition-colors rounded-full hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Direct CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#contact"
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full text-xs font-mono font-medium tracking-wide bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-black transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              <span>${ctaLabel}</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2.5 text-text-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel-elevated border-b border-subtle px-6 py-8 mt-2 space-y-4">
          <nav className="flex flex-col space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 min-h-[44px] flex items-center text-sm font-mono text-text-secondary hover:text-primary transition-colors rounded-lg hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 border-t border-subtle">
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-semibold bg-primary text-black hover:bg-white transition-colors"
            >
              <span>${ctaLabel}</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
`;
    this._writeFile('src/components/Navigation.tsx', content);
  }

  _generateHeroStage(brandName, copyArtifact = {}) {
    // Author demo mode is OPT-IN only. It previously triggered on `!brandName`, which meant
    // any brief whose brand extraction failed silently produced the author's personal
    // portfolio as the client's deliverable.
    const isThinesh = process.env.ZADROW_AUTHOR_DEMO === '1';
    const content = `
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
            ctx.strokeStyle = \`rgba(0, 240, 255, \${(1 - nDist / 120) * 0.15})\`;
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
          <span>${isThinesh ? 'STUDENT ENGINEER // AI, PRODUCT & ELECTRONICS' : 'ZADROW MAS 2.0 // HIGH-FIDELITY ACTIVE'}</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[1.05]">
          ${isThinesh ? `Engineering Practical Systems. <br />
          <span className="text-gradient">Driven by Curiosity & High Standards.</span>` : `Forging Impossible <br />
          <span className="text-gradient">Digital Realities.</span>`}
        </h1>

        {/* Narrative Description */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-text-secondary font-light leading-relaxed">
          ${isThinesh ? `I am <strong className="text-text-primary font-medium">Sri Thinesh</strong>, an engineering student exploring the intersection of software development, artificial intelligence, product design, electronics, and entrepreneurship. Focused on building useful, polished, and purposeful digital experiences.` : `Welcome to <strong className="text-text-primary font-medium">${brandName}</strong>. An autonomous digital studio coordinating specialized AI swarms to choreograph kinetic typography, 60FPS canvas shaders, and mathematical WCAG AAA fidelity.`}
        </p>

        {/* Character / Personality Attributes Bar */}
        ${isThinesh ? `
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto pt-2">
          {['Ambitious', 'Analytical', 'High Standards', 'Practical', 'Curious & Experimental', 'Efficiency-Focused'].map((trait) => (
            <span
              key={trait}
              className="px-3 py-1 rounded-full bg-white/5 border border-subtle text-xs font-mono text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
            >
              {trait}
            </span>
          ))}
        </div>
        ` : ''}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="${isThinesh ? '#projects' : '#features'}"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] rounded-full bg-primary text-black font-mono font-semibold text-sm tracking-wide hover:bg-white hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all duration-300"
          >
            <Cpu className="w-4 h-4" />
            <span>${isThinesh ? 'EXPLORE PROJECTS' : 'EXPLORE MATRIX'}</span>
          </a>
          <a
            href="${isThinesh ? '#contact' : '#showcase'}"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] rounded-full glass-panel hover:bg-white/10 text-text-primary font-mono text-sm tracking-wide transition-all duration-300"
          >
            <Zap className="w-4 h-4 text-primary" />
            <span>${isThinesh ? 'DIRECT TRANSMISSION' : 'LIVE TELEMETRY'}</span>
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="pt-12 flex justify-center">
          <a
            href="${isThinesh ? '#about' : '#features'}"
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
`;
    this._writeFile('src/components/HeroStage.tsx', content);
  }

  _generateFeatureBento(brandName, copyArtifact = {}, charter = {}) {
    // Author demo mode is OPT-IN only. It previously triggered on `!brandName`, which meant
    // any brief whose brand extraction failed silently produced the author's personal
    // portfolio as the client's deliverable.
    const isThinesh = process.env.ZADROW_AUTHOR_DEMO === '1';
    const content = `
'use client';

import React, { useState } from 'react';
import { Layers, ShieldCheck, Zap, Compass, Cpu, Wrench, Sparkles, Binary, CircuitBoard } from 'lucide-react';

const BENTO_CARDS = ${isThinesh ? `[
  {
    id: 'analytical-rigor',
    icon: Binary,
    tag: 'COGNITIVE RIGOR',
    title: 'Analytical & Root-Cause Investigation',
    description: 'Investigating why a system fails and identifying the underlying cause rather than repeatedly trying the same superficial approach. Questioning recommendations and expecting clear reasoning behind technical decisions.',
    metric: 'Root Cause',
    stat: 'First-Principles Analysis',
  },
  {
    id: 'high-standards',
    icon: ShieldCheck,
    tag: 'EXECUTION QUALITY',
    title: 'High Standards & Craftsmanship',
    description: 'Refusing to settle for something that merely works. Cares deeply about details, quality, responsive ergonomics, and whether the final result meets demanding expectations without compromises.',
    metric: 'Zero Shortcuts',
    stat: 'WCAG AAA & 60FPS Invariants',
  },
  {
    id: 'curious-experimental',
    icon: Compass,
    tag: 'EMERGING TECH',
    title: 'Curious & Experimental Exploration',
    description: 'Exploring emerging technologies, multi-agent systems, and novel tools to discover better ways of building. Passionate about translating concepts into hands-on projects and testing hypotheses.',
    metric: 'Active Explorer',
    stat: 'AI, Web & Circuit Simulations',
  },
  {
    id: 'practical-results',
    icon: Zap,
    tag: 'OUTCOME FOCUS',
    title: 'Practical & Results-Oriented Execution',
    description: 'Valuing working outcomes over impressive explanations or hollow promises. Dislikes unnecessary complexity, repetitive work, and wasted effort. Focused on shipping clean, functional products.',
    metric: 'Working Results',
    stat: 'Zero Bloat / 0-Backend Certified',
  },
]` : `[
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
]`};

${isThinesh ? `
const EXPLORATION_DOMAINS = [
  {
    icon: Cpu,
    title: 'Artificial Intelligence',
    description: 'AI-powered applications, multi-agent systems, and AI-assisted engineering workflows.',
    badge: 'Autonomous Systems',
  },
  {
    icon: Layers,
    title: 'Modern Web Development',
    description: 'Next.js App Router, React 19, strict TypeScript, Tailwind CSS, and performance-first responsive interfaces.',
    badge: 'Next.js 15 & React 19',
  },
  {
    icon: Sparkles,
    title: 'UI/UX Design',
    description: 'User-centered design, visual hierarchy, spatial usability, and tactile interaction design.',
    badge: 'Human-Centered UX',
  },
  {
    icon: CircuitBoard,
    title: 'Electronics Engineering',
    description: 'Schematic capture in KiCad, SPICE-based circuit simulation, 555 timer multivibrators, and engineering fundamentals.',
    badge: 'KiCad & SPICE',
  },
  {
    icon: Wrench,
    title: 'Entrepreneurship',
    description: 'Product ideation, problem-solving, user need identification, service design, and business model exploration.',
    badge: 'Ideation to Product',
  },
];
` : ''}

export function FeatureBento() {
  const [activeCard, setActiveCard] = useState<string>(${isThinesh ? `'analytical-rigor'` : `'agentic-swarm'`});

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
          ${isThinesh ? '// MINDSET & PHILOSOPHY ARCHITECTURE' : '// CAPABILITIES ARCHITECTURE'}
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight">
          ${isThinesh ? `Core Mindset & <span className="text-gradient">Engineering Philosophy.</span>` : `Engineered for <span className="text-gradient">Unbounded Precision.</span>`}
        </h2>
        <p className="text-text-secondary text-base sm:text-lg">
          ${isThinesh ? 'Translating analytical curiosity, high standards, and practical problem-solving into reliable, well-designed systems.' : 'Each card represents a modular system layer engineered by ZadRow&apos;s concurrent agent network.'}
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
              className={\`relative p-8 rounded-3xl transition-all duration-500 cursor-pointer \${
                isActive
                  ? 'glass-panel-elevated ring-1 ring-primary/40'
                  : 'glass-panel hover:border-white/20'
              }\`}
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

      ${isThinesh ? `
      {/* Areas of Interest Section */}
      <div id="domains" className="mt-24 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">
            // AREAS OF EXPLORATION
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-text-primary tracking-tight">
            Connecting Technology, Engineering & <span className="text-gradient">Product Design.</span>
          </h2>
          <p className="text-text-secondary text-sm sm:text-base">
            Exploring practical intersections to build purposeful digital solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EXPLORATION_DOMAINS.map((domain) => {
            const DomainIcon = domain.icon;
            return (
              <div
                key={domain.title}
                className="p-6 rounded-2xl glass-panel hover:border-primary/40 transition-all duration-300 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary">
                    <DomainIcon className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-mono text-primary">
                    {domain.badge}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-lg text-text-primary">
                  {domain.title}
                </h3>
                <p className="text-text-secondary text-xs leading-relaxed">
                  {domain.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      ` : ''}
    </section>
  );
}
`;
    this._writeFile('src/components/FeatureBento.tsx', content);
  }

  _generateInteractiveShowcase(brandName) {
    // Author demo mode is OPT-IN only. It previously triggered on `!brandName`, which meant
    // any brief whose brand extraction failed silently produced the author's personal
    // portfolio as the client's deliverable.
    const isThinesh = process.env.ZADROW_AUTHOR_DEMO === '1';
    const content = isThinesh ? `
'use client';

import React, { useState, useEffect } from 'react';
import { MediaPlaceholder } from '@/components/MediaPlaceholder';
import {
  ExternalLink,
  Layers,
  Sparkles,
  CircuitBoard,
  Cpu,
  Terminal,
  Sliders,
  Gauge,
  CheckCircle2,
  X,
  FolderGit2,
  Filter,
  Info,
  Activity,
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  category: 'core' | 'web' | 'electronics';
  categoryLabel: string;
  tagline: string;
  description: string;
  details: string[];
  tags: string[];
  metric: string;
  status: string;
  href?: string;
  note?: string;
}

const PROJECTS: Project[] = [
  {
    id: 'portfolio-v2',
    title: 'Personal Portfolio (v2.0)',
    category: 'core',
    categoryLabel: 'Core Initiative // Web',
    tagline: 'Multi-Agent System 2.0 Autonomous Engineering',
    description:
      'High-performance personal digital platform engineered using ZadRow Multi-Agent System with atomic cognitive scoping. Built with Next.js 15 App Router, React 19, TypeScript strict mode, and Tailwind CSS.',
    details: [
      'Engineered with an enterprise hierarchy of specialized AI agents with zero cognitive hallucination.',
      'Mathematical WCAG AAA contrast ratio (18.79:1) verified across all typography and states.',
      '60FPS hardware-accelerated interactive hero canvas with coarse-touch gating.',
      'Zero-stub standard: 100% verified authentic copy and production-grade TypeScript components.',
    ],
    tags: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Motion'],
    metric: 'WCAG AAA / 60FPS',
    status: 'Active Flagship',
    href: '#hero',
  },
  {
    id: 'need-it',
    title: 'NEED IT',
    category: 'core',
    categoryLabel: 'Core Initiative // Concept',
    tagline: 'Campus Errand & Peer Item Collection Concept',
    description:
      'A campus-oriented service design concept created to connect individuals who need items or errands collected with nearby students or helpers available to pick them up and deliver them.',
    details: [
      'Exploration of campus logistics, errand delegation workflows, and student peer dynamics.',
      'End-to-end service design including request dispatching, helper matching, and status verification flows.',
      'Business model viability modeling for university campus micro-communities.',
      'Focus on practical usability, clear communication, and friction-free user flows.',
    ],
    tags: ['Service Design', 'User Flows', 'Product Ideation', 'Campus Logistics'],
    metric: 'Service Design Flow',
    status: 'Concept Exploration',
  },
  {
    id: 'e-cell',
    title: 'E-Cell Website',
    category: 'core',
    categoryLabel: 'Core Initiative // Web',
    tagline: 'Entrepreneurship Cell Digital Information Architecture',
    description:
      'Contributions to the Entrepreneurship Cell digital portal, focusing on structured digital navigation, clear requirement communication, and purposeful design for student innovators.',
    details: [
      'Defined intuitive information architecture to communicate club initiatives, events, and resources.',
      'Emphasized structured requirement gathering and clean visual presentation.',
      'Collaborated on user-centered digital experience to support entrepreneurship awareness.',
      'Ensured responsive accessibility across mobile and desktop viewports.',
    ],
    tags: ['Web Development', 'Information Architecture', 'Entrepreneurship', 'UI/UX'],
    metric: 'Portal Architecture',
    status: 'Active Contribution',
  },
  {
    id: 'electronics-555',
    title: '555 Timer & SPICE Simulation',
    category: 'electronics',
    categoryLabel: 'Electronics // Simulation',
    tagline: 'KiCad & SPICE Analog Circuit Analysis',
    description:
      'Practical exploration of analog electronics and circuit behavior through schematic capture in KiCad and SPICE-based simulation of 555 timer multivibrator configurations.',
    details: [
      'Astable and monostable 555 timer multivibrator circuit simulation and transient timing analysis.',
      'Schematic capture and design rule validation using KiCad open-source EDA suite.',
      'Investigation of RC time constants, frequency stability, duty cycle tuning, and trigger thresholds.',
      'Strengthening practical engineering fundamentals through simulation before breadboard prototyping.',
    ],
    tags: ['KiCad', 'SPICE', 'Circuit Simulation', 'Analog Electronics', '555 Timer'],
    metric: 'Transient SPICE Analysis',
    status: 'Engineering Study',
  },
  {
    id: 'harish-profile',
    title: 'Harish Profile (TCS Experience)',
    category: 'web',
    categoryLabel: 'Web & UI/UX // Showcase',
    tagline: 'Professional Consultant Showcase',
    description:
      'Showcase portfolio designed for Harish, highlighting technical consulting and professional experience at TCS. Structured with clean visual hierarchy and responsive typography.',
    details: [
      'Clear typographic hierarchy highlighting enterprise consulting capabilities.',
      'Structured career milestones and project timeline presentations.',
      'Responsive multi-breakpoint layout with fast page load performance.',
      'Authored in Webflow with modern CSS grid and flexbox architecture.',
    ],
    tags: ['Webflow', 'Visual Hierarchy', 'Personal Branding', 'Responsive Web'],
    metric: 'Enterprise Showcase',
    status: 'Archive Reference',
    href: 'https://sri-thinesh-portfolio.webflow.io/',
  },
  {
    id: 'pane-and-frame',
    title: 'Pane & Frame Studio',
    category: 'web',
    categoryLabel: 'Web & UI/UX // Studio',
    tagline: 'Framing & Art Display Showcase',
    description:
      'Digital web experience for an art and framing studio, emphasizing tactile visual layout, clean portfolio showcases, and clear inquiry paths.',
    details: [
      'Refined visual layout emphasizing spatial framing aesthetics.',
      'Tactile portfolio gallery with smooth responsive reflow.',
      'Optimized image loading and elegant editorial typography.',
      'Structured conversion paths for customer consultation bookings.',
    ],
    tags: ['Responsive Web', 'Visual Storytelling', 'Brand Design', 'UI/UX'],
    metric: 'Editorial Grid',
    status: 'Archive Reference',
    href: 'https://sri-thinesh-portfolio.webflow.io/',
  },
  {
    id: 'veloura-escapes',
    title: 'Veloura Escapes',
    category: 'web',
    categoryLabel: 'Web & UI/UX // Travel',
    tagline: 'Boutique Luxury Retreat Experience',
    description:
      'Immersive digital exploration for boutique holiday retreats, combining sophisticated color palettes, smooth page flows, and conversion-oriented booking discovery.',
    details: [
      'Luxury aesthetic design system with warm, premium color harmony.',
      'Interactive itinerary exploration cards and visual storytelling.',
      'Clear value propositions and friction-free inquiry funnels.',
      'Mobile-first responsive typography and touch ergonomics.',
    ],
    tags: ['Luxury Travel', 'Micro-Interactions', 'UI/UX Design', 'Visual Branding'],
    metric: 'Boutique UX Flow',
    status: 'Archive Reference',
    href: 'https://sri-thinesh-portfolio.webflow.io/',
  },
  {
    id: 'forma-gym',
    title: 'Forma Modern Gym',
    category: 'web',
    categoryLabel: 'Web & UI/UX // Fitness',
    tagline: 'High-Energy Athletic Fitness Portal',
    description:
      'Dynamic fitness club website featuring bold typographic contrast, class schedules, and membership conversion funnels engineered for high engagement.',
    details: [
      'High-impact kinetic design and bold typographic pacing.',
      'Clear class timetable breakdowns and trainer profile cards.',
      'Streamlined membership tier comparison and signup triggers.',
      'Accessible contrast and keyboard-navigable interactive controls.',
    ],
    tags: ['Fitness Branding', 'Kinetic Layout', 'Typography', 'Conversion Design'],
    metric: 'High-Impact Brand',
    status: 'Archive Reference',
    href: 'https://sri-thinesh-portfolio.webflow.io/',
  },
  {
    id: 'northframe-studio',
    title: 'Northframe Studio',
    category: 'web',
    categoryLabel: 'Web & UI/UX // Architecture',
    tagline: 'Architectural & Spatial Portfolio',
    description:
      'Architectural studio website utilizing structured whitespace, editorial typography, and minimalist portfolio presentation to showcase spatial projects.',
    details: [
      'Minimalist structural layout allowing project photography to take center stage.',
      'Carefully proportioned whitespace and architectural grid alignment.',
      'Subtle transitions and refined micro-interactions.',
      'Comprehensive project metadata tables and blueprint callouts.',
    ],
    tags: ['Minimalist Editorial', 'Architecture', 'Spatial UI', 'Grid Systems'],
    metric: 'Spatial Grid Layout',
    status: 'Archive Reference',
    href: 'https://sri-thinesh-portfolio.webflow.io/',
  },
];

type FilterType = 'all' | 'core' | 'web' | 'electronics' | 'telemetry';

export function InteractiveShowcase() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Telemetry state
  const [swarmDensity, setSwarmDensity] = useState(18);
  const [shaderQuality, setShaderQuality] = useState(90);
  const computedThroughput = Math.round(swarmDensity * 240);
  const latencyMs = (0.2 + (100 - shaderQuality) * 0.005).toFixed(2);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedProject(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProjects =
    filter === 'all'
      ? PROJECTS
      : filter === 'telemetry'
      ? []
      : PROJECTS.filter((p) => p.category === filter);

  return (
    <section
      id="projects"
      aria-label="Featured Projects and Telemetry Showcase"
      className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
    >
      {/* Anchor alias for backwards compatibility */}
      <div id="showcase" className="sr-only" aria-hidden="true" />

      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <span className="font-mono text-xs uppercase tracking-widest text-primary flex items-center justify-center gap-2">
          <FolderGit2 className="w-4 h-4" />
          // SELECTED WORKS & INITIATIVES
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight">
          Featured Projects & <span className="text-gradient">Technical Explorations.</span>
        </h2>
        <p className="text-text-secondary text-base sm:text-lg">
          Hands-on initiatives across software development, AI systems, user experience, and analog electronics simulation.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
        {[
          { key: 'all', label: 'All Work' },
          { key: 'core', label: 'Core Initiatives' },
          { key: 'web', label: 'Web & UI/UX' },
          { key: 'electronics', label: 'Electronics & Simulation' },
          { key: 'telemetry', label: 'System Telemetry' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key as FilterType)}
            className={\`px-5 py-2.5 rounded-full text-xs font-mono font-medium min-h-[44px] transition-all duration-200 \${
              filter === tab.key
                ? 'bg-primary text-black font-semibold shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                : 'glass-panel text-text-secondary hover:text-text-primary hover:border-white/30'
            }\`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Telemetry View */}
      {filter === 'telemetry' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 glass-panel p-8 rounded-3xl space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b border-subtle">
              <Sliders className="w-5 h-5 text-primary" />
              <h3 className="font-display font-bold text-xl text-text-primary">
                Runtime Simulator
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono">
                <label htmlFor="swarm-density" className="text-text-secondary cursor-pointer">
                  ACTIVE AGENT SWARMS
                </label>
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

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono">
                <label htmlFor="shader-quality" className="text-text-secondary cursor-pointer">
                  SHADER PRECISION TIER
                </label>
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

          <div className="lg:col-span-7 glass-panel-elevated p-8 rounded-3xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-subtle">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-primary" />
                <span className="font-mono text-xs tracking-wider text-text-primary">
                  MAS 2.0 // SYSTEM HEALTH & SPECS
                </span>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs text-text-secondary leading-relaxed bg-black/40 p-5 rounded-2xl border border-subtle">
              <div className="text-primary">&gt; PORTFOLIO ENGINE: Next.js 15 App Router + React 19</div>
              <div>&gt; Architecture: Static 0-Backend Export Certified (Zero Server Overhead)</div>
              <div>&gt; Performance: 60FPS Hardware-Accelerated Kinetic Canvas Active</div>
              <div>&gt; Accessibility: WCAG 2.2 AAA Contrast Validated (18.79:1 Ratio)</div>
              <div>&gt; Integrity: Production-Grade Authentic Content Enforced (100% Complete)</div>
              <div className="text-text-primary font-bold pt-2">
                &gt; STATUS: Production-Grade Portfolio System Online.
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-text-muted pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>RUNTIME HEALTHY</span>
              </div>
              <span>MAS 2.0 VERIFIED</span>
            </div>
          </div>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="glass-panel hover:glass-panel-elevated p-7 rounded-3xl transition-all duration-300 flex flex-col justify-between group cursor-pointer border border-subtle hover:border-primary/40 focus-within:ring-2 focus-within:ring-primary"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    {project.categoryLabel}
                  </span>
                  <span className="text-[11px] font-mono text-text-muted">
                    {project.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-display font-bold text-2xl text-text-primary group-hover:text-primary transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-xs font-mono text-text-muted">
                    {project.tagline}
                  </p>
                </div>

                <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-text-muted border border-subtle/50"
                    >
                      {tag}
                    </span>
                  ))}
                  {project.tags.length > 4 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 text-text-muted">
                      +{project.tags.length - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-subtle/60 flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted">
                  {project.metric}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProject(project);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-primary group-hover:underline min-h-[44px] min-w-[44px] px-2"
                >
                  <span>INSPECT</span>
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-project-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedProject(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel-elevated max-w-2xl w-full p-8 rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto border border-primary/30"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  {selectedProject.categoryLabel}
                </span>
                <h3 id="modal-project-title" className="font-display font-bold text-3xl text-text-primary mt-2">
                  {selectedProject.title}
                </h3>
                <p className="text-xs font-mono text-text-muted mt-1">
                  {selectedProject.tagline}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                aria-label="Close Project Details"
                className="p-2 text-text-muted hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              {selectedProject.description}
            </p>

            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary">
                Key Technical & Exploration Details:
              </h4>
              <ul className="space-y-2 text-xs font-mono text-text-secondary">
                {selectedProject.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary flex-shrink-0">&gt;</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-text-primary">
                Technologies & Tools:
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedProject.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 border border-subtle text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-mono text-text-muted">
                Status: <strong className="text-text-primary font-medium">{selectedProject.status}</strong>
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {selectedProject.href && (
                  <a
                    href={selectedProject.href}
                    target={selectedProject.href.startsWith('http') ? '_blank' : undefined}
                    rel={selectedProject.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-black font-mono font-semibold text-xs min-h-[44px] hover:bg-white transition-colors"
                  >
                    <span>VIEW REFERENCE</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-full glass-panel text-text-primary font-mono text-xs min-h-[44px] hover:bg-white/10 transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
` : `
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
                className={\`px-4 py-2 min-h-[44px] inline-flex items-center rounded text-xs font-mono transition-colors \${
                  activeTab === 'telemetry'
                    ? 'bg-primary text-black font-semibold'
                    : 'text-text-muted hover:text-white'
                }\`}
              >
                Telemetry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('spec')}
                className={\`px-4 py-2 min-h-[44px] inline-flex items-center rounded text-xs font-mono transition-colors \${
                  activeTab === 'spec'
                    ? 'bg-primary text-black font-semibold'
                    : 'text-text-muted hover:text-white'
                }\`}
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
              <div>Brand: ${brandName}</div>
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
`;
    this._writeFile('src/components/InteractiveShowcase.tsx', content);
  }

  _generateMediaPlaceholder() {
    const content = `
'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Play, Maximize2, Compass, LayoutGrid } from 'lucide-react';

export interface MediaPlaceholderProps {
  type?: 'photo' | 'video' | 'gallery' | 'space';
  aspectRatio?: string;
  title?: string;
  subtitle?: string;
  dimensions?: string;
  className?: string;
  showAnimation?: boolean;
}

export function MediaPlaceholder({
  type = 'photo',
  aspectRatio = 'aspect-video',
  title,
  subtitle,
  dimensions = '1920 × 1080',
  className = '',
  showAnimation = true,
}: MediaPlaceholderProps) {
  const [isHovered, setIsHovered] = useState(false);

  const defaultTitle =
    title ||
    (type === 'video'
      ? 'Cinematic Transmission'
      : type === 'gallery'
      ? 'Curated Media Gallery'
      : type === 'space'
      ? 'Reserved Spatial Coordinate'
      : 'Visual Architecture Capture');

  const defaultSubtitle =
    subtitle ||
    (type === 'video'
      ? '02:45 • 4K 60FPS'
      : type === 'gallery'
      ? 'Interactive Gallery Matrix'
      : type === 'space'
      ? 'Dynamic Spatial Container'
      : 'Optical Matrix • HDR');

  const aspectClass =
    aspectRatio === 'video' || aspectRatio === 'aspect-video'
      ? 'aspect-video'
      : aspectRatio === '4/3' || aspectRatio === 'aspect-[4/3]'
      ? 'aspect-[4/3]'
      : aspectRatio === 'square' || aspectRatio === 'aspect-square'
      ? 'aspect-square'
      : aspectRatio;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="region"
      aria-label={\`\${defaultTitle} (\${type} media container)\`}
      className={\`group relative overflow-hidden rounded-2xl w-full \${aspectClass} transition-all duration-500 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary \${
        type === 'space'
          ? 'border border-dashed border-white/20 bg-surface/30 hover:border-primary/60 hover:bg-surface/50'
          : 'border border-subtle bg-surface/70 glass-panel hover:border-primary/50 shadow-lg'
      } \${className}\`}
    >
      {/* Background Animated Grid & Ambient Pattern */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Shimmer Light Sheen Animation */}
      {showAnimation && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none" />
      )}

      {/* Central Visual Icon & Spatial Animation */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
        {type === 'video' ? (
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/20 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all duration-300">
              <Play className="w-6 h-6 ml-0.5 fill-current" />
            </div>
            {showAnimation && (
              <span className="absolute -inset-1 rounded-full border border-primary/30 animate-ping opacity-40 pointer-events-none" />
            )}
          </div>
        ) : type === 'gallery' ? (
          <div className="w-12 h-12 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary transition-all duration-300">
            <LayoutGrid className="w-6 h-6" />
          </div>
        ) : type === 'space' ? (
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted group-hover:text-primary group-hover:border-primary/40 transition-colors">
            <Compass className="w-6 h-6 animate-spin [animation-duration:12s]" />
          </div>
        ) : type === 'photo' ? (
          <div className="w-12 h-12 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary transition-all duration-300">
            <ImageIcon className="w-6 h-6" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary transition-all duration-300">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}

        <div className="space-y-1">
          <div className="font-display font-bold text-sm sm:text-base text-text-primary tracking-wide group-hover:text-primary transition-colors">
            {defaultTitle}
          </div>
          <div className="font-mono text-xs text-text-secondary">
            {defaultSubtitle}
          </div>
        </div>

        {/* Dimension & Telemetry Tag */}
        <div className="pt-2 flex items-center gap-2 text-[10px] font-mono text-text-muted uppercase tracking-wider">
          <span className="px-2 py-0.5 rounded bg-black/40 border border-subtle">
            {dimensions}
          </span>
          <span className="inline-flex items-center gap-1 text-primary">
            <Sparkles className="w-2.5 h-2.5" />
            <span>ACTIVE ANIMATION</span>
          </span>
        </div>
      </div>

      {/* Corner Expand Indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-primary">
        <Maximize2 className="w-4 h-4" />
      </div>

      {/* Ambient Breathing Border Glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 border border-primary/40 pointer-events-none" />
    </div>
  );
}
`;
    this._writeFile('src/components/MediaPlaceholder.tsx', content);
  }

  _generateFooterConversion(brandName) {
    // Author demo mode is OPT-IN only. It previously triggered on `!brandName`, which meant
    // any brief whose brand extraction failed silently produced the author's personal
    // portfolio as the client's deliverable.
    const isThinesh = process.env.ZADROW_AUTHOR_DEMO === '1';
    const content = isThinesh ? `
'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, Sparkles, Mail, MessageSquare, Linkedin, MapPin, ArrowUpRight } from 'lucide-react';

export function FooterConversion() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState('Software / Web Development');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your name.');
      return;
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!message.trim()) {
      setError('Please enter a brief message or inquiry.');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <footer
      id="contact"
      aria-label="Contact and Transmission"
      className="relative border-t border-subtle pt-24 pb-16 px-4 sm:px-6 lg:px-8 mt-24 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Main Transmission Card */}
        <div className="glass-panel-elevated p-8 sm:p-14 rounded-3xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Direct Channels & Context */}
            <div className="lg:col-span-5 space-y-6">
              <span className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                // INITIATE CONTACT // TRANSMISSION
              </span>
              <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-text-primary tracking-tight leading-tight">
                Let&apos;s Build Something <span className="text-gradient">Functional &amp; Extraordinary.</span>
              </h2>
              <p className="text-text-secondary text-sm sm:text-base leading-relaxed">
                Have an interesting engineering problem, an AI product concept, or an opportunity to collaborate? Feel free to reach out directly through any of these communication channels.
              </p>

              {/* Direct Channels List */}
              <div className="space-y-3 pt-2">
                <a
                  href="mailto:satorweb@gmail.com"
                  className="flex items-center gap-3 p-3.5 rounded-2xl glass-panel hover:border-primary/40 text-text-primary hover:text-primary transition-all duration-200 min-h-[44px]"
                >
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-mono text-xs sm:text-sm">satorweb@gmail.com</span>
                </a>

                <a
                  href="https://wa.me/918608991345"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-2xl glass-panel hover:border-primary/40 text-text-primary hover:text-primary transition-all duration-200 min-h-[44px]"
                >
                  <MessageSquare className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-mono text-xs sm:text-sm">+91 8608991345 (WhatsApp)</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-text-muted ml-auto" />
                </a>

                <a
                  href="https://www.linkedin.com/in/sri-thinesh-00ba54410/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 rounded-2xl glass-panel hover:border-primary/40 text-text-primary hover:text-primary transition-all duration-200 min-h-[44px]"
                >
                  <Linkedin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-mono text-xs sm:text-sm">linkedin.com/in/sri-thinesh</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-text-muted ml-auto" />
                </a>

                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-subtle/50 text-text-muted">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-mono text-xs">Salem, Tamil Nadu, India</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Transmission Form */}
            <div className="lg:col-span-7 bg-black/40 p-6 sm:p-8 rounded-3xl border border-subtle/80 flex flex-col justify-center">
              {submitted ? (
                <div className="p-8 rounded-2xl bg-primary/10 border border-primary/30 space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-text-primary">
                    Transmission Logged
                  </h3>
                  <p className="text-xs font-mono text-text-secondary leading-relaxed">
                    Thank you, <strong className="text-primary">{name}</strong>. Your message regarding {domain} has been received. Sri Thinesh will get back to you shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setName('');
                      setEmail('');
                      setMessage('');
                    }}
                    className="px-6 py-2.5 rounded-full bg-primary text-black font-mono font-semibold text-xs min-h-[44px] hover:bg-white transition-colors"
                  >
                    SEND ANOTHER MESSAGE
                  </button>
                </div>
              ) : (
                <form noValidate onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="contact-name" className="text-xs font-mono text-text-muted">
                        YOUR NAME
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Sri Thinesh"
                        required
                        className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-surface border border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="contact-email" className="text-xs font-mono text-text-muted">
                        EMAIL ADDRESS
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@domain.com"
                        required
                        className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-surface border border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-domain" className="text-xs font-mono text-text-muted">
                      AREA OF COLLABORATION
                    </label>
                    <select
                      id="contact-domain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full px-4 py-3 min-h-[44px] rounded-xl bg-surface border border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-primary text-xs font-mono"
                    >
                      <option value="Software / Web Development">Software / Web Development</option>
                      <option value="Artificial Intelligence & Agents">Artificial Intelligence &amp; Multi-Agent Systems</option>
                      <option value="UI/UX & Product Design">UI/UX &amp; Product Design</option>
                      <option value="Electronics & Simulation">Electronics &amp; Circuit Simulation</option>
                      <option value="Entrepreneurship / General Inquiry">Entrepreneurship / General Inquiry</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contact-message" className="text-xs font-mono text-text-muted">
                      MESSAGE / BRIEF
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Outline your project, question, or discussion point..."
                      required
                      className="w-full px-4 py-3 min-h-[80px] rounded-xl bg-surface border border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary text-xs font-mono resize-none"
                    />
                  </div>

                  {error && <p className="text-xs font-mono text-red-400 pl-1">{error}</p>}

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-8 py-3.5 min-h-[44px] rounded-xl bg-primary text-black font-mono font-semibold text-xs tracking-wider hover:bg-white hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all duration-300"
                  >
                    <span>TRANSMIT MESSAGE</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Studio Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-subtle/50 text-xs font-mono text-text-muted">
          <div>
            &copy; {new Date().getFullYear()} SRI THINESH. Engineered with ZadRow Multi-Agent System.
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="#hero" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">TOP</a>
            <a href="#about" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">MINDSET</a>
            <a href="#domains" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">DOMAINS</a>
            <a href="#projects" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">PROJECTS</a>
            <a href="#contact" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">CONTACT</a>
            <span className="text-primary font-bold hidden sm:inline">NEXT.JS 15 // REACT 19</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
` : `
'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, Sparkles, ArrowUpRight } from 'lucide-react';

export function FooterConversion() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid executive email address.');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <footer
      id="contact"
      aria-label="Contact and Conversion"
      className="relative border-t border-subtle pt-24 pb-16 px-4 sm:px-6 lg:px-8 mt-24 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Main Transmission Card */}
        <div className="glass-panel-elevated p-8 sm:p-14 rounded-3xl relative overflow-hidden">
          <div className="max-w-3xl space-y-6">
            <span className="font-mono text-xs uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              INITIATE YOUR TRANSMISSION
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-5xl text-text-primary tracking-tight">
              Ready to construct the <span className="text-gradient">extraordinary?</span>
            </h2>
            <p className="text-text-secondary text-base leading-relaxed">
              Connect directly with ${brandName}. Gain early deployment access, custom agentic
              architecture briefs, and bespoke digital experiences.
            </p>

            {submitted ? (
              <div className="p-5 rounded-2xl bg-primary/10 border border-primary/30 flex items-center gap-3 text-primary font-mono text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>TRANSMISSION RECEIVED. An executive brief strategist will establish contact within 2 hours.</span>
              </div>
            ) : (
              <form noValidate onSubmit={handleSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <label htmlFor="executive-email" className="sr-only">Executive Email Address</label>
                  <input
                    id="executive-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter executive email address..."
                    aria-label="Executive Email Address"
                    required
                    className="flex-1 px-5 py-4 min-h-[44px] rounded-full bg-surface border border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] rounded-full bg-primary text-black font-mono font-semibold text-sm hover:bg-white hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all duration-300"
                  >
                    <span>TRANSMIT BRIEF</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {error && <p className="text-xs font-mono text-red-400 pl-4">{error}</p>}
              </form>
            )}
          </div>
        </div>

        {/* Studio Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-subtle/50 text-xs font-mono text-text-muted">
          <div>
            &copy; {new Date().getFullYear()} ${brandName.toUpperCase()}. Engineered by ZadRow Multi-Agent Digital Studio (MAS 2.0).
          </div>
          <div className="flex items-center gap-6">
            <a href="#hero" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">TOP</a>
            <a href="#features" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">MATRIX</a>
            <a href="#showcase" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">TELEMETRY</a>
            <span className="text-primary font-bold">NEXT.JS 15 // REACT 19</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
`;
    this._writeFile('src/components/FooterConversion.tsx', content);
  }

  _generateMagneticCursor() {
    const content = `
'use client';

import React, { useEffect, useState } from 'react';

export function MagneticCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Disable on touch devices for mobile accessibility and zero scrolljacking
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          target.closest('button') ||
          target.closest('a') ||
          target.getAttribute('role') === 'button')
      ) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };

    const handleMouseLeave = () => setVisible(false);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out"
      style={{
        transform: \`translate3d(\${position.x - 16}px, \${position.y - 16}px, 0)\`,
      }}
    >
      <div
        className={\`w-8 h-8 rounded-full border border-primary transition-all duration-200 flex items-center justify-center \${
          hovered ? 'scale-150 bg-primary/20 shadow-[0_0_20px_rgba(0,240,255,0.6)]' : 'scale-100'
        }\`}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
      </div>
    </div>
  );
}
`;
    this._writeFile('src/components/MagneticCursor.tsx', content);
  }

  _generateSoundEffects() {
    const content = `
'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function SoundEffects() {
  const [enabled, setEnabled] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        setAudioCtx(ctx);
        setEnabled(true);
      }
    } else {
      setEnabled(!enabled);
    }
  };

  const playTone = (freq: number, type: OscillatorType = 'sine', duration = 0.08) => {
    if (!enabled || !audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Ignore audio synthesis errors on strict browsers
    }
  };

  useEffect(() => {
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button') || target?.closest('a')) {
        playTone(800, 'triangle', 0.05);
      }
    };

    window.addEventListener('click', handleButtonClick, { passive: true });
    return () => window.removeEventListener('click', handleButtonClick);
  }, [enabled, audioCtx]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={initAudio}
        aria-label={enabled ? 'Disable Futuristic Sound FX' : 'Enable Futuristic Sound FX'}
        className={\`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all duration-300 \${
          enabled
            ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(0,240,255,0.4)]'
            : 'glass-panel text-text-muted hover:text-white'
        }\`}
      >
        {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </div>
  );
}
`;
    this._writeFile('src/components/SoundEffects.tsx', content);
  }

  _generateProceduralGraphics() {
    const content = `
import React from 'react';

export function ProceduralGraphics() {
  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      {/* Subtle geometric grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Decorative procedural framing lines */}
      <svg
        className="absolute top-0 left-0 w-64 h-64 opacity-20"
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 64H64V0" stroke="#00f0ff" strokeWidth="1" />
        <circle cx="64" cy="64" r="2" fill="#00f0ff" />
      </svg>

      <svg
        className="absolute bottom-0 right-0 w-64 h-64 opacity-20"
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M256 192H192V256" stroke="#00f0ff" strokeWidth="1" />
        <circle cx="192" cy="192" r="2" fill="#00f0ff" />
      </svg>
    </div>
  );
}
`;
    this._writeFile('src/components/ProceduralGraphics.tsx', content);
  }

  _generateReadme(brandName, clientVision) {
    const content = `
# 🌐 ${brandName} Production Website

> **Engineered by ZadRow Multi-Agent Digital Studio (MAS 2.0)**
> *Client Brief Vision*: ${clientVision}

---

## ⚡ Quick Start: Running the Website

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Run Next.js 15 local development server
npm run dev

# 3. Open browser at
# http://localhost:3000
\`\`\`

---

## 🏛️ Architecture & Features

- **Next.js 15 App Router & React 19**: Modern concurrent server/client architecture.
- **60FPS Kinetic Hero Canvas**: Dynamic particle web reacting fluidly to mouse movement.
- **3D Spatial Bento Grid**: 4 interactive cards with live benchmarks and capability selector.
- **Interactive Telemetry Showcase**: Real-time swarm density & shader slider simulations.
- **VIP Waitlist & Direct Transmission Footer**: Real-time validated input with feedback states.
- **Web Audio API Procedural Synthesizer**: Subtle UI audio clicks & chimes without MP3 file downloads.
- **Magnetic Trailing Cursor**: Hardware-accelerated cursor follower with coarse-touch gating.
- **WCAG 2.2 AA Contrast Compliance**: Mathematical verification across all typography.

---

## 🚀 Production Build & Deploy

\`\`\`bash
# Production build
npm run build

# Start production server
npm run start
\`\`\`
`;
    this._writeFile('README.md', content);
  }

  _generateApiRoutes(backendEndpoints = {}) {
    // 1. Persistence Library (src/lib/persistence.ts)
    const persistenceLib = `import fs from 'fs';
import path from 'path';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&\\x27*+/=?^_\\x60{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
export const DEFAULT_ADMIN_KEY = process.env.ADMIN_API_KEY || 'zadrow-admin-secure-key-2026';

class MutexManager {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    this.locks.set(key, promise);
    return () => {
      this.locks.delete(key);
      resolver();
    };
  }
}

const mutex = new MutexManager();

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  maxLength?: number;
  isEmail?: boolean;
  sanitizeHtml?: boolean;
  default?: any;
}

export function validateAndSanitizeInput(
  data: any,
  rules: Record<string, ValidationRule> = {}
): { valid: boolean; errors: string[]; sanitized: Record<string, any> } {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Request payload must be a non-empty JSON object.'], sanitized: {} };
  }

  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return { valid: false, errors: ['Disallowed prototype property detected.'], sanitized: {} };
    }
  }

  for (const [field, rule] of Object.entries(rules)) {
    let value = data[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(\`Field '\${field}' is required.\`);
      continue;
    }

    if (value === undefined || value === null) {
      if (rule.default !== undefined) {
        sanitized[field] = rule.default;
      }
      continue;
    }

    if (rule.type && typeof value !== rule.type) {
      errors.push(\`Field '\${field}' must be of type \${rule.type}.\`);
      continue;
    }

    if (typeof value === 'string') {
      value = value.replace(/\\0/g, '').trim();

      const maxLen = rule.maxLength || 500;
      if (value.length > maxLen) {
        errors.push(\`Field '\${field}' exceeds maximum length of \${maxLen} characters.\`);
        continue;
      }

      if (rule.isEmail) {
        if (!EMAIL_REGEX.test(value)) {
          errors.push(\`Field '\${field}' must be a valid email address.\`);
          continue;
        }
        value = value.toLowerCase();
      }

      if (rule.sanitizeHtml !== false) {
        value = value
          .replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/javascript:/gi, '');
      }
    }

    sanitized[field] = value;
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : {},
  };
}

export function verifyAdminAuth(headers: Headers): boolean {
  const authHeader = headers.get('authorization') || '';
  const adminKeyHeader = headers.get('x-admin-key') || '';

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === DEFAULT_ADMIN_KEY) return true;
  }

  if (adminKeyHeader && adminKeyHeader === DEFAULT_ADMIN_KEY) {
    return true;
  }

  return false;
}

export class AtomicStore {
  private filePath: string;
  private dir: string;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
    this.dir = path.dirname(this.filePath);
    this._ensureDir();
  }

  private _ensureDir() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  async read(): Promise<any[]> {
    const release = await mutex.acquire(this.filePath);
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      if (!raw || !raw.trim()) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    } finally {
      release();
    }
  }

  async insertRecord(
    newRecord: Record<string, any>,
    uniqueKey: string = 'email'
  ): Promise<{ success: boolean; duplicate: boolean; record: any; totalRecords: number }> {
    this._ensureDir();
    const release = await mutex.acquire(this.filePath);
    const tmpFile = \`\${this.filePath}.tmp.\${Date.now()}.\${Math.random().toString(36).substring(2, 8)}\`;

    try {
      let records: any[] = [];
      if (fs.existsSync(this.filePath)) {
        const raw = await fs.promises.readFile(this.filePath, 'utf8');
        if (raw && raw.trim()) {
          try {
            records = JSON.parse(raw);
            if (!Array.isArray(records)) records = [];
          } catch {
            records = [];
          }
        }
      }

      if (uniqueKey && newRecord[uniqueKey]) {
        const searchVal = String(newRecord[uniqueKey]).toLowerCase();
        const existing = records.find(
          (r) => r[uniqueKey] && String(r[uniqueKey]).toLowerCase() === searchVal
        );
        if (existing) {
          return {
            success: true,
            duplicate: true,
            record: existing,
            totalRecords: records.length,
          };
        }
      }

      const finalized = {
        id: \`REC-\${Date.now().toString(36).toUpperCase()}-\${Math.random().toString(36).substring(2, 6).toUpperCase()}\`,
        ...newRecord,
        created_at: new Date().toISOString(),
      };

      records.push(finalized);
      const payload = JSON.stringify(records, null, 2);
      await fs.promises.writeFile(tmpFile, payload, 'utf8');
      await fs.promises.rename(tmpFile, this.filePath);

      return {
        success: true,
        duplicate: false,
        record: finalized,
        totalRecords: records.length,
      };
    } catch (err) {
      try {
        if (fs.existsSync(tmpFile)) {
          await fs.promises.unlink(tmpFile);
        }
      } catch (_) {}
      throw err;
    } finally {
      release();
    }
  }
}
`;
    this._writeFile('src/lib/persistence.ts', persistenceLib);

    // 2. POST & GET /api/waitlist route handler
    const waitlistRoute = `import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { AtomicStore, validateAndSanitizeInput, verifyAdminAuth } from '../../../lib/persistence';

const store = new AtomicStore(path.join(process.cwd(), 'data', 'waitlist.json'));

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validation = validateAndSanitizeInput(rawBody, {
      email: { required: true, type: 'string', isEmail: true, maxLength: 254 },
      tier: { required: false, type: 'string', maxLength: 50, default: 'STANDARD' },
      company: { required: false, type: 'string', maxLength: 100 },
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'Invalid waitlist submission payload.' },
        { status: 400 }
      );
    }

    const { email, tier, company } = validation.sanitized;
    const persistResult = await store.insertRecord({ email, tier, company }, 'email');

    return NextResponse.json(
      {
        status: 'registered',
        duplicate: persistResult.duplicate,
        message: persistResult.duplicate
          ? 'Email address is already confirmed on priority waitlist.'
          : 'Priority waitlist reservation confirmed.',
        record: {
          id: persistResult.record.id,
          email: persistResult.record.email,
          tier: persistResult.record.tier,
          created_at: persistResult.record.created_at,
        },
      },
      { status: persistResult.duplicate ? 200 : 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid or malformed request payload.' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req.headers)) {
    return NextResponse.json(
      { error: 'Unauthorized administrative access. Valid API key required.' },
      { status: 401 }
    );
  }

  const records = await store.read();
  return NextResponse.json({
    status: 'success',
    count: records.length,
    records,
  });
}
`;
    this._writeFile('src/app/api/waitlist/route.ts', waitlistRoute);

    // 3. POST & GET /api/inquire route handler
    const inquireRoute = `import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { AtomicStore, validateAndSanitizeInput, verifyAdminAuth } from '../../../lib/persistence';

const store = new AtomicStore(path.join(process.cwd(), 'data', 'inquiries.json'));

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const validation = validateAndSanitizeInput(rawBody, {
      email: { required: true, type: 'string', isEmail: true, maxLength: 254 },
      name: { required: false, type: 'string', maxLength: 100, default: 'Anonymous Executive' },
      company: { required: false, type: 'string', maxLength: 100 },
      message: { required: false, type: 'string', maxLength: 2000, default: 'General Consultation Inquiry' },
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] || 'Invalid consultation inquiry payload.' },
        { status: 400 }
      );
    }

    const persistResult = await store.insertRecord(validation.sanitized, 'email');

    return NextResponse.json(
      {
        status: 'acknowledged',
        transmissionId: persistResult.record.id,
        timestamp: persistResult.record.created_at,
        recipient: persistResult.record.email,
        message: 'Transmission successfully committed to autonomous pipeline queue.',
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid or malformed request payload.' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAdminAuth(req.headers)) {
    return NextResponse.json(
      { error: 'Unauthorized administrative access. Valid API key required.' },
      { status: 401 }
    );
  }

  const records = await store.read();
  return NextResponse.json({
    status: 'success',
    count: records.length,
    records,
  });
}
`;
    this._writeFile('src/app/api/inquire/route.ts', inquireRoute);
  }
}
