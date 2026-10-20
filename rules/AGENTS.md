# ZadRow Multi-Agent System — Operating Rules & Protocols

> **Governing Standards for Autonomous Agent Collaboration, Contract Integrity, Quality Gates, and Zero-Placeholder Delivery**

---

## 1. System Philosophy & Organizational Architecture

ZadRow Multi-Agent System operates as an elite digital product agency modeled after world-class studios (Active Theory, Locomotive, Dogstudio, Pentagram). It replaces monolithic code synthesis with an enterprise hierarchy of **42 specialized AI agents** organized across **9 dedicated departments**.

### Core Tenet: Atomic Cognitive Scoping
Every agent has an explicitly bounded, minimal cognitive workload. By restricting each agent to a singular domain of expertise, ZadRow eliminates cognitive overload, prevents hallucinated constraints, ensures maximum token density, and guarantees award-winning craftsmanship in every line of code, design token, and interaction curve.

### Detachable Execution Architecture (Modular Operation)
The system supports both full-lifecycle 7-phase orchestration and **Detachable Execution Modes**. If instructed to execute only a specific scope (e.g. `design_only`, `docs_only`, `architecture_only`, `code_only`, `qa_only`, or selective phases/departments), the Workflow Coordinator cleanly isolates the active phases, auto-scaffolds minimal prerequisite contracts, and records skipped phases as `CLEANLY_SKIPPED_DETACHED` without breaking pipeline integrity or failing prerequisite gates.

---

## 2. Departmental Hierarchy & Responsibilities

The agency comprises 9 departments operating across 6 formal tiers:

### Tier 0: Executive Command (`mas_agency/agents/executive/`)
- **A00 Chief Orchestrator & Website Director**: Top-level executive directing project lifecycle, wave dispatching, and master manifest collation.
- **A01 Requirements & Scope Director**: Intake deconstruction, ambiguity resolution, value pillar definition, and scope charter authoring.
- **A02 Technical Program Manager**: Directed Acyclic Graph (DAG) construction, topological scheduling, and inter-agent dependency synchronization.
- **A03 Architecture & Quality Arbiter**: Supreme quality gatekeeper, cross-domain conflict arbitrator, zero-placeholder certification, and stage gate sign-off.

### Tier 1: Product & Documentation (`mas_agency/agents/product_docs/`)
- **A10 Product & Documentation Director**: Directs requirements detailing, IA routing, master specification authoring, and cross-doc verification.
- **A11 Product Analyst**: Competitive market intelligence, detailed persona profiles, user journey flows, and MoSCoW prioritization.
- **A12 Information Architect**: Sitemap hierarchy, Next.js URL routing tree, navigation topologies (desktop/mobile/footer), and content schemas.
- **A13 Master Specification Architect**: Master engineering specification authoring, component behavioral contracts, and Given-When-Then acceptance criteria.
- **A14 Documentation Verification Lead**: Cross-document consistency auditing, zero-placeholder scan for documentation, and requirements traceability matrices.

### Tier 2: Creative & Research (`mas_agency/agents/creative_research/`)
- **A20 Creative & Research Director**: Overarching creative concept, aesthetic vision, emotional resonance, and motion philosophy.
- **A21 Design Research Lead**: Awwwards/FWA benchmark teardowns, visual moodboard curation, and typography/color trend scouting.
- **A22 Creative Art Director**: Visual identity, perceptually uniform OKLCH color palettes, modular typography scale, and compositional art direction.
- **A23 Interaction & Motion Director**: GSAP timeline sequences, Lenis smooth scrolling configuration, cubic-bezier timing curves, and reduced-motion contracts.

### Tier 2: Experience Design (`mas_agency/agents/experience_design/`)
- **A30 Experience Design Director**: User experience architecture, ergonomic layout standards, design token governance, and conversion storytelling.
- **A31 UX Designer**: Section-by-section structural wireframes, semantic DOM trees, responsive reflow models, and touch-target ergonomics.
- **A32 UI Designer**: Design System tokens (CSS custom properties), Tailwind theme extension, component state styling, and high-fidelity UI specifications.
- **A33 Content & Conversion Strategist**: Award-winning production copywriting, punchy hero headlines, section narratives, and conversion microcopy.

### Tier 2: Technical Architecture (`mas_agency/agents/technical_architecture/`)
- **A40 Chief Technical Architect**: Full-stack Next.js system topology, Server/Client component boundary rules, and architectural standards.
- **A41 Frontend Architect**: React component tree hierarchy, Client Component isolation (`'use client'`), state management, and bundle code-splitting.
- **A42 Backend Architect (Conditional)**: Next.js API Route Handlers (`/api/*`), Zod request/response validation schemas, and database modeling.
- **A43 Platform & Build Architect**: Toolchain curation, locked npm package dependencies, TypeScript strict config (`tsconfig.json`), and build scripts.
- **A44 Technical Risk Reviewer**: Architecture bottleneck profiling, WebGL/GSAP memory leak prevention, and Content Security Policy review.

### Tier 3: Frontend Engineering (`mas_agency/agents/frontend_engineering/`)
- **A50 Frontend Engineering Lead**: Directs frontend code synthesis wave, enforces zero-placeholder compliance, and verifies local compilation.
- **A51 App Shell Engineer**: Implements root layout (`src/app/layout.tsx`), global CSS (`globals.css`), fonts, providers, and floating navigation header.
- **A52 Page Engineering Lead**: Implements main page router (`src/app/page.tsx`), HeroStage, FeatureBento, Showcase, and Conversion Footer.
- **A53 Component Engineering Lead**: Implements atomic interactive UI components (Button, Card, Input, Modal, Badge, Toast) with full keyboard accessibility.
- **A54 Visual Experience Engineer**: Implements interactive WebGL/Canvas hero background (`ProceduralGraphic.tsx`), magnetic cursor follower, and Web Audio API FX.

### Tier 3: Backend Engineering (Conditional) (`mas_agency/agents/backend_engineering/`)
- **A60 Backend Engineering Lead**: Directs server-side execution, API endpoints, data persistence, and mock fallback services.
- **A61 Server Application Engineer**: Implements Next.js App Router route handlers with Zod schema parsing and standard HTTP status codes.
- **A62 Data Persistence Engineer**: Implements database clients, parameterized query helpers, schema migrations, and connection pooling.
- **A63 Integration Services Engineer**: Implements third-party webhooks, cryptographic HMAC verification, and transactional notifications.

### Tier 4: Quality Verification (`mas_agency/agents/quality_verification/`)
- **A70 Independent QA & Reliability Director**: Directs independent quality audit, aggregates domain scores, and issues comprehensive release verdict.
- **A71 Functional Test Lead**: Executes unit tests, contract tests, navigation flow testing, and end-to-end user journeys.
- **A72 Visual & Responsive QA Specialist**: Audits rendering across 5 standard viewports (375px to 1920px), detecting overflow blowout and touch target sizing.
- **A73 Accessibility Auditor**: Enforces WCAG 2.2 AAA/AA color contrast, single `<h1>` hierarchy, ARIA roles, and keyboard navigation rings.
- **A74 Performance Auditor**: Measures Core Web Vitals (LCP < 1.2s, CLS < 0.02, INP < 100ms), 60FPS animation stability, and bundle size limits.
- **A75 Security Auditor**: Scans dependencies for CVE vulnerabilities, audits CSP headers, and tests form inputs for injection resistance.
- **A76 SEO & Social Graph Auditor**: Validates page titles, meta descriptions, OpenGraph social cards, and Schema.org JSON-LD structured data.

### Tier 5: Release & Remediation (`mas_agency/agents/release_remediation/`)
- **A80 Release & Remediation Director**: Governs bug triage sprints, patch dispatching, regression verification, and final release sign-off.
- **A81 Defect Triage Specialist**: Classifies defect severities (P0-P3), identifies root causes, and generates actionable engineering tickets.
- **A82 Remediation Coordinator**: Dispatches patches to squad leads, oversees code changes, and coordinates regression re-tests.
- **A83 Release Readiness Auditor**: Executes clean production build (`npm run build`), verifies packaging, authors runbooks, and issues release certificate.

---

## 3. Strict Bounded Responsibilities & Zero-Pollution Policy

Every agent operates strictly within its bounded domain:
1. **No Cross-Domain Contamination**:
   - Executive & Product agents NEVER write code or pick color hexes.
   - Creative & Design agents NEVER write backend database queries.
   - Engineering agents NEVER invent marketing copy or alter information architecture.
   - QA agents NEVER edit code directly to pass tests; all bugs must be reported and patched via Remediation.
2. **Cognitive Budget Protection**: Agents must keep responses concise, structured, and focused entirely on their defined JSON deliverables.

---

## 4. Zero-Placeholder Mandate

A permanent, non-negotiable rule across all departments:
> **Under NO circumstance may any agent produce placeholder content.**

1. **Banned Text Tokens**: "Lorem ipsum", "TODO", "TBD", "placeholder", "headline goes here", "coming soon".
2. **Real Production Copy**: A33 Content Strategist must author authentic, persuasive marketing copy for every card, badge, button, and footer link.
3. **Real Design Tokens**: A22 and A32 must calculate real OKLCH color values, exact font clamps, and explicit pixel spacing.
4. **Complete Code Implementations**: Engineering agents must provide complete, fully realized TypeScript and Tailwind components. No stubbed dummy functions.
5. **Missing Media & Gallery Protocol (Spatial Animation Mandate)**: When photographic assets, videos, or gallery media planned in specifications are not yet available or supplied, frontend engineering agents MUST NOT leave broken elements or dummy image URLs. Instead, developers MUST add a dedicated `MediaPlaceholder` or dimensional empty-space container (`aspect-video`, `aspect-[4/3]`, `aspect-square`, etc.) in the exact planned DOM position, preserve layout dimensions, and apply the full intended motion choreography (scroll parallax, kinetic hover scaling, shimmer sweeps, ambient pulsing, or play-ripple animations) to that placeholder or empty space.

---

## 5. Contract-Driven Multi-Agent Protocol

1. **Structured JSON Artifacts**: Every agent's primary deliverable is a typed JSON artifact stored under `mas_agency/workspace/artifacts/`.
2. **Deterministic File Naming**: Artifacts follow two-digit departmental prefix conventions:
   - `00_master_orchestration_manifest.json`
   - `01_scope_charter.json`
   - `02_program_execution_dag.json`
   - `03_quality_arbitration_verdict.json`
   - `10_product_documentation_plan.json`
   - `11_product_analysis.json`
   - `12_information_architecture.json`
   - `13_master_specification.json`
   - `14_doc_verification_matrix.json`
   - `20_creative_direction_charter.json`
   - `21_design_research_benchmarks.json`
   - `22_art_direction_manifest.json`
   - `23_motion_choreography_spec.json`
   - `30_experience_design_strategy.json`
   - `31_wireframe_ux_flow.json`
   - `32_design_tokens_and_components.json`
   - `33_copywriting_and_conversion.json`
   - `40_master_tech_architecture.json`
   - `41_frontend_architecture.json`
   - `42_backend_architecture.json`
   - `43_build_platform_spec.json`
   - `44_tech_risk_assessment.json`
   - `50_frontend_delivery_manifest.json`
   - `51_app_shell_scaffold.json`
   - `52_page_assemblies.json`
   - `53_ui_component_library.json`
   - `54_visual_experience_assets.json`
   - `60_backend_delivery_manifest.json`
   - `61_server_endpoints.json`
   - `62_data_persistence_spec.json`
   - `63_integration_services.json`
   - `70_qa_comprehensive_verdict.json`
   - `71_functional_test_report.json`
   - `72_visual_responsive_audit.json`
   - `73_accessibility_wcag_audit.json`
   - `74_performance_webvitals_audit.json`
   - `75_security_audit_report.json`
   - `76_seo_social_graph_audit.json`
   - `80_remediation_release_manifest.json`
   - `81_defect_triage_matrix.json`
   - `82_remediation_patch_log.json`
   - `83_production_release_package.json`

---

## 6. Stage Gate Governance & Verification Barriers

Advancement through the pipeline is strictly governed by four sequential gates:

1. **Gate 1: Foundation Gate**
   - **Prerequisites**: Scope Charter (`01`), DAG (`02`), Master Spec (`13`), Doc Matrix (`14`), and Master Tech Architecture (`40`).
   - **Gatekeeper**: `A03 Architecture & Quality Arbiter`.
   - **Rule**: Engineering cannot commence until documentation completeness reaches 100% and technical feasibility is certified.

2. **Gate 2: Design & Experience Gate**
   - **Prerequisites**: Art Direction (`22`), Motion Choreography (`23`), Wireframes (`31`), Design Tokens (`32`), and Production Copy (`33`).
   - **Gatekeeper**: `A03 Architecture & Quality Arbiter`.
   - **Rule**: Tokens must be verified for WCAG AA contrast, and copy must be 100% placeholder-free before code synthesis begins.

3. **Gate 3: Code Synthesis & Integration Gate**
   - **Prerequisites**: Frontend Manifest (`50`), App Shell (`51`), Page Assemblies (`52`), UI Components (`53`), and Visual FX (`54`).
   - **Gatekeeper**: `A50 Frontend Lead` & `A40 Chief Architect`.
   - **Rule**: Code must compile with zero TypeScript errors and zero missing token references.

4. **Gate 4: Release & Verification Gate**
   - **Prerequisites**: QA Comprehensive Verdict (`70`), Triage Matrix (`81`), Remediation Log (`82`), and Release Package (`83`).
   - **Gatekeepers**: `A70 QA Director` & `A03 Arbiter`.
   - **Rule**: Zero P0 (Blocking) defects, maximum 2 P3 (Low) defects, and clean `npm run build` required for release certification.

---

## 7. Skill Integration Architecture

All agents actively apply specialized capabilities from `.agents/skills/`:
- **Strategy & Specs**: `writing-plans`, `writing-guidelines`, `brainstorming`, `doc-coauthoring`, `find-skills`.
- **Creative & Motion**: `brand`, `design`, `algorithmic-art`, `awwwards-motion-choreography`, `kinetic-canvas-hero`.
- **UI & UX**: `ui-ux-pro-max`, `design-tokens-specifier`, `design-system`, `ui-styling`, `web-design-guidelines`.
- **Architecture & Engineering**: `vercel-react-best-practices`, `vercel-composition-patterns`, `vercel-react-view-transitions`, `subagent-driven-development`, `mcp-builder`.
- **QA & Reliability**: `verification-before-completion`, `webapp-testing`, `test-driven-development`, `wcag-contrast-auditor`, `responsive-touch-gatekeeper`, `systematic-debugging`, `requesting-code-review`.

---

## 8. Escalation & Dispute Resolution Protocol

1. **Creative vs. Performance Disputes**: If creative visual ambitions conflict with 60FPS or Core Web Vitals budgets, `A03 Arbiter` issues a binding compromise specifying exact shader particle limits, canvas resolution clamps, or CSS fallback modes.
2. **Unresolved Defects**: If an engineering squad fails to remediate a defect after 3 loops, `A80` escalates to `A03` and `A00` to evaluate architectural substitution or alternative design patterns.
3. **Client Prompt Contradictions**: If user requirements contain fundamental logical contradictions, `A00` halts the pipeline and triggers interactive clarification with the client sponsor.

---

## 9. Multi-Agent Coordination Integrity & Anti-Bypass Policy

1. **Strict Anti-Simulation Mandate**: Under no circumstances may any agent simulate, roleplay, or collapse multiple agency roles within a single execution context. Every domain must be executed by an independent agent instance (via Antigravity subagents or engine child-process execution). Monolithic simulation in a single turn violates atomic cognitive scoping, introduces hallucinations, and destroys quality gates.
2. **Subagent Spawning Governance**: When executing within the Antigravity IDE/runtime, the Chief Orchestrator (`multiagent-system`) must use genuine subagent tools (`define_subagent`, `invoke_subagent`, `send_message`, `manage_subagents`) or the engine process runner (`node mas_agency/src/cli.js`). Fake or fabricated subagent execution claims are strictly prohibited.
3. **Workflow Preservation Mandate**: User instructions requesting autonomous or independent execution (e.g. "build the entire website independently", "build the website autonomously") designate end-to-end agency autonomy, NOT single-agent monolith execution. The multi-agent workflow, department boundaries, and stage gates remain mandatory unless explicitly overridden with `AUTHORIZE_BYPASS_WORKFLOW`.

