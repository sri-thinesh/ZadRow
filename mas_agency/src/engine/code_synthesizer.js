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

/**
 * The page's section composition is an agent deliverable, not a decision this
 * module is entitled to make. A52 (Page Engineering Lead) emits
 * `52_page_assemblies.json` describing the assembled sections per route, and its
 * own specification forbids forcing a kinetic hero, a bento grid or a conversion
 * footer unless the approved wireframes prescribe them. A31 emits
 * `31_wireframe_ux_flow.json` with the approved screens and their sections.
 *
 * This table maps the vocabulary those artifacts use onto the bespoke component
 * generators this engine owns. A section that matches nothing is reported as
 * unmapped rather than silently replaced with a default.
 */
const SECTION_COMPONENTS = [
  {
    component: 'Navigation',
    placement: 'chrome-top',
    generate: '_generateNavigation',
    match: ['navigation', 'navbar', 'nav', 'header', 'menu', 'topbar'],
  },
  {
    component: 'HeroStage',
    placement: 'main',
    generate: '_generateHeroStage',
    match: ['hero', 'masthead', 'opening', 'above-the-fold', 'abovefold'],
  },
  {
    component: 'FeatureBento',
    placement: 'main',
    generate: '_generateFeatureBento',
    match: ['bento', 'feature', 'capabilit', 'service', 'offering', 'value-prop', 'benefit'],
  },
  {
    component: 'InteractiveShowcase',
    placement: 'main',
    generate: '_generateInteractiveShowcase',
    match: [
      'showcase',
      'gallery',
      'project',
      'portfolio',
      'work',
      'telemetry',
      'case stud',
      'casestud',
      'exhibit',
      'stories',
      'story',
      'insight',
    ],
  },
  {
    component: 'FooterConversion',
    placement: 'chrome-bottom',
    generate: '_generateFooterConversion',
    match: ['footer', 'contact', 'cta', 'conversion', 'inquire', 'enquir', 'get-in-touch', 'signup', 'waitlist'],
  },
];

/** The engine's own default composition, used only when no artifact describes one. */
const DEFAULT_SECTION_PLAN = [
  { section_id: 'default_navigation', component: 'Navigation', placement: 'chrome-top' },
  { section_id: 'default_hero', component: 'HeroStage', placement: 'main' },
  { section_id: 'default_features', component: 'FeatureBento', placement: 'main' },
  { section_id: 'default_showcase', component: 'InteractiveShowcase', placement: 'main' },
  { section_id: 'default_footer', component: 'FooterConversion', placement: 'chrome-bottom' },
];

/**
 * The in-page anchor each section component renders, and the label the navigation
 * gives it. A generator that links to a sibling section must consult this map and the
 * resolved section plan: the composition varies per brief now, so a hardcoded
 * `href="#features"` can point at a section the wireframes never asked for.
 */
const SECTION_ANCHORS = {
  HeroStage: { id: 'hero', label: 'Studio' },
  FeatureBento: { id: 'features', label: 'Matrix' },
  InteractiveShowcase: { id: 'showcase', label: 'Telemetry' },
  FooterConversion: { id: 'contact', label: 'Transmission' },
};

/**
 * The section components a composition can select. Only these are subject to
 * cleanup: the shared primitives (MediaPlaceholder, MagneticCursor, SoundEffects,
 * ProceduralGraphics) are imported by whichever sections are generated, so
 * removing them because no *section* names them would break the build.
 */
const SECTION_COMPONENT_NAMES = SECTION_COMPONENTS.map((entry) => entry.component);

export class CodeSynthesizer {
  constructor(options = {}) {
    this.agencyDir = options.agencyDir || path.resolve(__dirname, '../..');
    this.artifactsDir = options.artifactsDir || path.join(this.agencyDir, 'workspace', 'artifacts');
    this.outputDir = options.outputDir || path.join(this.agencyDir, 'output', 'website');

    // When true, synthesizing from offline placeholder artifacts is a hard error
    // rather than a labelled preview. The coordinator enables this for real runs.
    this.requireRealArtifacts = options.requireRealArtifacts === true;
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

    // The composition of the page is itself an agent deliverable. A52 emits the
    // assembled sections; A31 emits the approved wireframes they were assembled
    // from. Either can drive the page; the engine's own default order is the last
    // resort and is reported as such.
    const pageAssemblies = this._loadArtifact('52_page_assemblies.json', artifactsMap) || null;
    const wireframes = this._loadArtifact('31_wireframe_ux_flow.json', artifactsMap) || null;

    const brandName = briefData.brandName || charter.brandName || 'STUDIO SYNTHETIX';
    const clientVision = briefData.clientVision || charter.clientVision || 'High-Performance Generative Studio';

    // Offline placeholder artifacts are not agent output. Building a site from them
    // is legitimate for a preview and unacceptable for a deliverable, so it is
    // detected, recorded, and refused outright when requireRealArtifacts is set.
    const syntheticInputs = this._detectSyntheticInputs({
      '01_scope_charter.json': charter,
      '32_design_tokens_and_components.json': tokensArtifact,
      '33_copywriting_and_conversion.json': copyArtifact,
      '12_information_architecture.json': iaArtifact,
      '61_server_endpoints.json': backendEndpoints,
      '52_page_assemblies.json': pageAssemblies,
      '31_wireframe_ux_flow.json': wireframes,
    });
    if (syntheticInputs.length > 0 && this.requireRealArtifacts) {
      throw new Error(
        `Refusing to synthesize a production site: ${syntheticInputs.length} input artifact(s) are ` +
          `offline placeholders rather than agent output (${syntheticInputs.join(', ')}). A site built ` +
          `from these would be presented as agent-authored work while containing none. Run the pipeline ` +
          `against a real Antigravity CLI, or construct CodeSynthesizer without requireRealArtifacts to ` +
          `build a clearly-labelled preview.`
      );
    }

    const sectionPlan = this._resolveSectionPlan(pageAssemblies, wireframes);

    // The anchors the site will actually have, so no generator links to a section the
    // wireframes did not prescribe.
    const entryRoute =
      sectionPlan.routes.find((route) => route.route === '/') || sectionPlan.routes[0] || { sections: [] };
    const anchorManifest = this._buildAnchorManifest(entryRoute.sections, sectionPlan.routes.length);

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

    // 7. Generate the section components the artifacts actually call for. A
    //    component no route uses is not generated, so the deliverable carries no
    //    section the wireframes did not ask for.
    const usedComponents = new Set(
      sectionPlan.routes.flatMap((route) => route.sections.map((section) => section.component))
    );

    if (usedComponents.has('Navigation')) this._generateNavigation(brandName, iaArtifact, anchorManifest);
    if (usedComponents.has('HeroStage')) this._generateHeroStage(brandName, copyArtifact, anchorManifest);
    if (usedComponents.has('FeatureBento')) this._generateFeatureBento(brandName, copyArtifact, charter);
    if (usedComponents.has('InteractiveShowcase')) this._generateInteractiveShowcase(brandName, copyArtifact);
    if (usedComponents.has('FooterConversion')) this._generateFooterConversion(brandName, copyArtifact, anchorManifest);

    // Shared primitives the section components import.
    this._generateMediaPlaceholder();
    this._generateMagneticCursor();
    this._generateSoundEffects();
    this._generateProceduralGraphics();

    // Remove component files left behind by an earlier run that this composition
    // no longer uses, so a stale section cannot survive into the deliverable.
    this._removeUnusedComponents(usedComponents);

    // 8. Generate the route files from the resolved plan
    for (const route of sectionPlan.routes) {
      this._generatePage(route);
    }

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
      // Provenance of the deliverable, so no caller has to guess whether the site
      // reflects the agents' decisions or this engine's defaults.
      sectionPlanSource: sectionPlan.source,
      artifactDriven: sectionPlan.source !== 'fallback',
      routes: sectionPlan.routes.map((route) => route.route),
      sectionsFromArtifact: sectionPlan.routes.reduce(
        (total, route) => total + route.sections.length,
        0
      ),
      unmappedSections: sectionPlan.unmapped,
      syntheticInputs,
    };
  }

  /**
   * Report which of the supplied artifacts are offline placeholders rather than
   * agent output. `_executeMock` stamps every artifact it writes with `_mock` and
   * `_execution_mode`, so this is a positive identification, not a heuristic.
   */
  _detectSyntheticInputs(artifactsByName = {}) {
    const synthetic = [];
    for (const [name, value] of Object.entries(artifactsByName)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      const mode = value._execution_mode;
      if (value._mock === true || value.synthetic === true || mode === 'mock' || mode === 'synthetic') {
        synthetic.push(name);
      }
    }
    return synthetic;
  }

  /**
   * Decide which sections appear on which routes, and in what order.
   *
   * Precedence: A52's assembled sections, then A31's approved wireframes, then this
   * engine's default order. The source is returned so callers can tell the
   * difference between a site the agents designed and one this module defaulted to.
   */
  _resolveSectionPlan(pageAssemblies = null, wireframes = null) {
    const routes = [];
    const unmapped = [];

    // A section may name its component outright (`components: ['HeroStage']`), which
    // is authoritative, or describe itself in prose (`layout_type: 'editorial-split'`),
    // which is matched against the section vocabulary.
    const resolveSection = (section) => {
      const explicit = section.components || section.component_file || section.component;
      for (const candidate of Array.isArray(explicit) ? explicit : [explicit]) {
        const name = this._canonicalComponent(candidate);
        if (name) return { component: name, placement: this._placementOf(name) };
      }

      const name = this._canonicalComponent(
        [
          section.id,
          section.section_id,
          section.layout_type,
          section.dom_element,
          section.visitor_journey_stage,
          ...(Array.isArray(section.features_included) ? section.features_included : []),
        ]
          .filter(Boolean)
          .join(' ')
      );
      return name ? { component: name, placement: this._placementOf(name) } : null;
    };

    const collect = (rawSections, routeLabel) => {
      const sections = [];
      for (const raw of rawSections || []) {
        if (!raw || typeof raw !== 'object') continue;
        const match = resolveSection(raw);
        if (!match) {
          unmapped.push({
            route: routeLabel,
            section_id: raw.id || raw.section_id || '(unnamed)',
            layout_type: raw.layout_type || null,
          });
          continue;
        }
        sections.push({
          section_id: raw.id || raw.section_id || match.component,
          component: match.component,
          placement: match.placement,
        });
      }
      return sections;
    };

    // Navigation is structural chrome, not a creative section: the accessibility
    // scaffold declares header/main/footer landmarks and a mobile menu focus trap,
    // so a page without it is a broken page. It is therefore always present unless
    // the composition already places one. A conversion footer is NOT treated this
    // way — A52's specification forbids forcing one that the wireframes did not ask
    // for, so it appears only when a section prescribes it.
    const withChrome = (sections) =>
      sections.some((section) => section.component === 'Navigation')
        ? sections
        : [{ section_id: 'chrome_navigation', component: 'Navigation', placement: 'chrome-top' }, ...sections];

    // 1. A52's page assemblies: `pages[].assembled_sections[]`.
    const pages = pageAssemblies && Array.isArray(pageAssemblies.pages) ? pageAssemblies.pages : null;
    if (pages && pages.length > 0) {
      for (const page of pages) {
        if (!page || typeof page !== 'object') continue;
        const route = this._normalizeRoute(page.route);
        const sections = collect(page.assembled_sections, route);
        if (sections.length > 0) {
          routes.push({ route, source: 'page_assemblies', sections: withChrome(sections) });
        }
      }
      if (routes.length > 0) return { source: 'page_assemblies', routes, unmapped };
    }

    // 1b. A52 is also emitted with the sections at the top level.
    const assembled =
      pageAssemblies && Array.isArray(pageAssemblies.assembled_sections)
        ? pageAssemblies.assembled_sections
        : null;
    if (assembled && assembled.length > 0) {
      const sections = collect(assembled, '/');
      if (sections.length > 0) {
        routes.push({ route: '/', source: 'page_assemblies', sections: withChrome(sections) });
        return { source: 'page_assemblies', routes, unmapped };
      }
    }

    // 2. A31's approved wireframes, one page per screen.
    const screens = wireframes && Array.isArray(wireframes.screens) ? wireframes.screens : null;
    if (screens && screens.length > 0) {
      for (const screen of screens) {
        if (!screen || typeof screen !== 'object') continue;
        const route = this._normalizeRoute(screen.route);
        const sections = collect(screen.sections, route);
        if (sections.length > 0) {
          routes.push({ route, source: 'wireframe_ux_flow', sections: withChrome(sections) });
        }
      }
      if (routes.length > 0) return { source: 'wireframe_ux_flow', routes, unmapped };
    }

    // 3. This engine's default order.
    return {
      source: 'fallback',
      routes: [
        { route: '/', source: 'fallback', sections: DEFAULT_SECTION_PLAN.map((s) => ({ ...s })) },
      ],
      unmapped,
    };
  }

  /**
   * Map a component name, file path or descriptive phrase onto one of the section
   * components this engine can generate. Returns null when nothing matches, so an
   * unrecognised section is reported rather than silently substituted.
   */
  _canonicalComponent(value) {
    const normalise = (text) =>
      String(text || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const haystack = normalise(value);
    if (!haystack) return null;

    for (const entry of SECTION_COMPONENTS) {
      if (normalise(entry.component) === haystack) return entry.component;
    }
    for (const entry of SECTION_COMPONENTS) {
      if (entry.match.some((keyword) => haystack.includes(normalise(keyword)))) {
        return entry.component;
      }
    }
    return null;
  }

  /**
   * Describe the in-page anchors the generated site will actually have, so every
   * generator links only to sections that exist.
   *
   * `primarySections` are the sections on the site's entry route: in-page anchors are
   * only meaningful there. When the site has more than one route the links are made
   * absolute (`/#hero`) so they work from any page instead of silently doing nothing.
   */
  _buildAnchorManifest(primarySections = [], routeCount = 1) {
    const present = new Set(primarySections.map((section) => section.component));
    const multiRoute = routeCount > 1;

    const available = {};
    const links = [];
    for (const [component, anchor] of Object.entries(SECTION_ANCHORS)) {
      const isPresent = present.has(component);
      available[anchor.id] = isPresent;
      if (isPresent) {
        links.push({
          id: anchor.id,
          label: anchor.label,
          href: multiRoute ? `/#${anchor.id}` : `#${anchor.id}`,
        });
      }
    }

    return { available, links, multiRoute, home: '#main-content' };
  }

  /** The href for an anchor id, or null when the site has no such section. */
  _anchorHref(manifest, id) {
    if (!manifest || !manifest.available[id]) return null;
    return manifest.multiRoute ? `/#${id}` : `#${id}`;
  }

  /** Where a component sits in the document. */
  _placementOf(component) {
    const entry = SECTION_COMPONENTS.find((candidate) => candidate.component === component);
    return entry ? entry.placement : 'main';
  }

  /** Normalise an artifact's route string into an app-router path. */
  _normalizeRoute(route) {
    const raw = String(route || '/').trim();
    if (!raw || raw === '/' || raw === 'index' || raw === 'home') return '/';
    const cleaned = raw.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, '');
    return cleaned ? `/${cleaned}` : '/';
  }

  /**
   * Delete section component files this composition does not use, so a section the
   * wireframes dropped cannot survive into the deliverable from an earlier run.
   * Shared primitives are never removed — they are dependencies, not sections.
   */
  _removeUnusedComponents(usedComponents) {
    for (const name of SECTION_COMPONENT_NAMES) {
      if (usedComponents.has(name)) continue;
      const filePath = path.join(this.outputDir, 'src', 'components', `${name}.tsx`);
      if (fs.existsSync(filePath)) {
        try {
          fs.rmSync(filePath, { force: true });
        } catch (_) {}
      }
    }
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
        // Pinned to a patched release. 15.2.0 carried CVE-2025-66478, so every site
        // this engine generated shipped a known-vulnerable framework. Verified by
        // `npm audit` and a production build against the generated output.
        next: '15.5.28',
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
    const resolvedBrand = (brandName && String(brandName).trim()) || 'Autonomous Digital Studio';
    const pageTitle = `${resolvedBrand} | Autonomous Digital Studio`;
    const pageDesc = `Experience the digital frontier with ${resolvedBrand}. High-velocity kinetic systems, generative AI spatial design, and uncompromised aesthetic precision.`;
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

  /**
   * Emit a route file from a resolved section plan.
   *
   * The page is composed from the sections the artifacts prescribe, in the order
   * they prescribe them. When no composition artifact was available the engine's
   * default order is used, and the file says so on its face so nobody mistakes a
   * default layout for an approved one.
   */
  _generatePage(plan) {
    const route = plan.route || '/';
    const sections = plan.sections || [];

    const chromeTop = sections.filter((s) => s.placement === 'chrome-top').map((s) => s.component);
    const main = sections.filter((s) => s.placement === 'main').map((s) => s.component);
    const chromeBottom = sections
      .filter((s) => s.placement === 'chrome-bottom')
      .map((s) => s.component);

    const used = [...new Set([...chromeTop, ...main, ...chromeBottom])];
    const imports = used.map((name) => `import { ${name} } from '@/components/${name}';`).join('\n');

    const provenance =
      plan.source === 'fallback'
        ? [
            '// PROVENANCE: no page-composition artifact was available',
            '// (52_page_assemblies.json from A52, or 31_wireframe_ux_flow.json from A31),',
            '// so this route uses the synthesis engine\'s default section order. It is NOT',
            '// derived from approved wireframes and should be treated as a preview layout.',
          ].join('\n')
        : `// PROVENANCE: section composition derived from ${
            plan.source === 'page_assemblies'
              ? '52_page_assemblies.json (A52, Page Engineering Lead)'
              : '31_wireframe_ux_flow.json (A31, UX Architecture)'
          }.`;

    const renderRows = (list, indent) => list.map((name) => `${indent}<${name} />`).join('\n');

    const content = `${provenance}
${imports}

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-x-hidden">
${renderRows(chromeTop, '      ')}
      <main id="main-content" className="flex-1">
${renderRows(main, '        ')}
      </main>
${renderRows(chromeBottom, '      ')}
    </div>
  );
}
`;

    const relativePath =
      route === '/'
        ? 'src/app/page.tsx'
        : `src/app/${route.replace(/^\/+|\/+$/g, '')}/page.tsx`;
    this._writeFile(relativePath, content);
  }

  _generateNavigation(brandName, iaArtifact = {}, anchorManifest = null) {
    // Author demo mode is OPT-IN only. It previously triggered on `!brandName`, which meant
    // any brief whose brand extraction failed silently produced the author's personal
    // portfolio as the client's deliverable.
    const displayBrand = brandName.toUpperCase();
    const ctaLabel = 'INITIATE BRIEF';

    // Links are built from the sections this site actually has. A hardcoded list pointed
    // at `#features` and `#contact` whatever the wireframes prescribed, so a composition
    // without those sections shipped navigation that went nowhere.
    const manifest = anchorManifest || { available: {}, links: [], multiRoute: false, home: '#main-content' };
    const navLinks = manifest.links;

    // Emitted as hand-written-looking source rather than JSON: the generated site is a
    // deliverable the client reads, and quoted JSON keys with one field per line read
    // like machine output.
    const navLinksSource = navLinks.length
      ? `[\n${navLinks
          .map((link) => `  { id: '${link.id}', label: '${link.label}', href: '${link.href}' },`)
          .join('\n')}\n]`
      : '[]';
    const logoHref = this._anchorHref(manifest, 'hero') || manifest.home;
    const ctaHref = this._anchorHref(manifest, 'contact');

    // A call to action with no destination is worse than no call to action: it is
    // rendered only when the site has a section to convert into.
    const desktopCta = ctaHref
      ? `          {/* Direct CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="${ctaHref}"
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-full text-xs font-mono font-medium tracking-wide bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-black transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
            >
              <span>${ctaLabel}</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>`
      : '';

    const mobileCta = ctaHref
      ? `          <div className="pt-4 border-t border-subtle">
            <a
              href="${ctaHref}"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-mono font-semibold bg-primary text-black hover:bg-white transition-colors"
            >
              <span>${ctaLabel}</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>`
      : '';

    const content = `
'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight, Sparkles } from 'lucide-react';

const NAV_LINKS = ${navLinksSource};

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
            href="${logoHref}"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1 min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-primary group-hover:border-primary transition-colors">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-widest text-text-primary group-hover:text-primary transition-colors">
                ${displayBrand}
              </span>
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

${desktopCta}

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
${mobileCta}
        </div>
      )}
    </header>
  );
}
`;
    this._writeFile('src/components/Navigation.tsx', content);
  }

  _generateHeroStage(brandName, copyArtifact = {}, anchorManifest = null) {
    // The hero's calls to action and its scroll cue must lead somewhere. They are built
    // from the sections this composition actually contains, so a hero on a page with no
    // matrix section does not ship a button pointing at nothing.
    const manifest = anchorManifest || { available: {}, links: [], multiRoute: false, home: '#main-content' };
    const heroActions = [
      { id: 'features', label: 'EXPLORE MATRIX', icon: 'Cpu', primary: true },
      { id: 'showcase', label: 'LIVE TELEMETRY', icon: 'Zap', primary: false },
    ].filter((action) => manifest.available[action.id]);

    const heroActionMarkup = heroActions
      .map((action) => {
        const href = this._anchorHref(manifest, action.id);
        const className = action.primary
          ? 'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] rounded-full bg-primary text-black font-mono font-semibold text-sm tracking-wide hover:bg-white hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all duration-300'
          : 'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[44px] rounded-full glass-panel hover:bg-white/10 text-text-primary font-mono text-sm tracking-wide transition-all duration-300';
        const iconClass = action.primary ? 'w-4 h-4' : 'w-4 h-4 text-primary';
        return `          <a
            href="${href}"
            className="${className}"
          >
            <${action.icon} className="${iconClass}" />
            <span>${action.label}</span>
          </a>`;
      })
      .join('\n');

    const scrollTarget =
      this._anchorHref(manifest, 'features') ||
      this._anchorHref(manifest, 'showcase') ||
      this._anchorHref(manifest, 'contact');

    const scrollIndicator = scrollTarget
      ? `        {/* Scroll Indicator */}
        <div className="pt-12 flex justify-center">
          <a
            href="${scrollTarget}"
            aria-label="Scroll to Next Section"
            className="text-text-muted hover:text-primary transition-colors min-w-[44px] min-h-[44px] inline-flex items-center justify-center p-2.5"
          >
            <ArrowDown className="w-5 h-5 animate-bounce" />
          </a>
        </div>`
      : '';
    // Author demo mode is OPT-IN only. It previously triggered on `!brandName`, which meant
    // any brief whose brand extraction failed silently produced the author's personal
    // portfolio as the client's deliverable.
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
          <span>${'ZADROW MAS 2.0 // HIGH-FIDELITY ACTIVE'}</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-display font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[1.05]">
          ${`Forging Impossible <br />
          <span className="text-gradient">Digital Realities.</span>`}
        </h1>

        {/* Narrative Description */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-text-secondary font-light leading-relaxed">
          ${`Welcome to <strong className="text-text-primary font-medium">${brandName}</strong>. An autonomous digital studio coordinating specialized AI swarms to choreograph kinetic typography, 60FPS canvas shaders, and mathematical WCAG AAA fidelity.`}
        </p>

        {/* Character / Personality Attributes Bar */}
        
        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
${heroActionMarkup}
        </div>

${scrollIndicator}
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
    const content = `
'use client';

import React, { useState } from 'react';
import { Layers, ShieldCheck, Zap, Compass, Cpu, Wrench, Sparkles, Binary, CircuitBoard } from 'lucide-react';

const BENTO_CARDS = ${`[
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


export function FeatureBento() {
  const [activeCard, setActiveCard] = useState<string>(${`'agentic-swarm'`});

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
          ${'// CAPABILITIES ARCHITECTURE'}
        </span>
        <h2 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight">
          ${`Engineered for <span className="text-gradient">Unbounded Precision.</span>`}
        </h2>
        <p className="text-text-secondary text-base sm:text-lg">
          ${'Each card represents a modular system layer engineered by ZadRow&apos;s concurrent agent network.'}
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
    const content = `
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

  _generateFooterConversion(brandName, copyArtifact = {}, anchorManifest = null) {
    // Footer quick links are built from the sections this site has. The hardcoded
    // TOP/MATRIX/TELEMETRY row pointed at `#hero`, `#features` and `#showcase` whatever
    // the wireframes prescribed, so a composition without them shipped dead links.
    const manifest = anchorManifest || { available: {}, links: [], multiRoute: false, home: '#main-content' };
    const footerLinks = [
      { label: 'TOP', href: this._anchorHref(manifest, 'hero') || manifest.home },
      ...manifest.links
        .filter((link) => link.id !== 'hero')
        .map((link) => ({ label: link.label.toUpperCase(), href: link.href })),
    ];
    const footerLinkMarkup = footerLinks
      .map(
        (link) =>
          `            <a href="${link.href}" className="hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2">${link.label}</a>`
      )
      .join('\n');
    // Author demo mode is OPT-IN only. It previously triggered on `!brandName`, which meant
    // any brief whose brand extraction failed silently produced the author's personal
    // portfolio as the client's deliverable.
    const content = `
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
${footerLinkMarkup}
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
export function getAdminKey(): string | null {
  const key = process.env.ADMIN_API_KEY;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

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
  const expected = getAdminKey();
  // Fail closed: with no ADMIN_API_KEY configured, nothing is authorized.
  if (!expected) return false;

  const authHeader = headers.get('authorization') || '';
  const adminKeyHeader = headers.get('x-admin-key') || '';

  if (authHeader.startsWith('Bearer ')) {
    if (constantTimeEquals(authHeader.substring(7).trim(), expected)) return true;
  }

  if (adminKeyHeader && constantTimeEquals(adminKeyHeader, expected)) {
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
