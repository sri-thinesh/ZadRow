# 🌐 ZadRow Multi-Agent System (MAS 2.0)

> **Autonomous Digital Product Agency for Award-Winning Production Web Experiences**  
> *Modeled after elite digital product studios (Active Theory, Locomotive, Dogstudio, Pentagram). Powered by 42 specialized AI agents across 9 departments with strict contracts, rigorous QA, and Google Antigravity integration.*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-15.2%20(App%20Router)-black.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.x-blue.svg)](https://www.typescriptlang.org)
[![WCAG](https://img.shields.io/badge/Accessibility-WCAG%202.2%20AAA-success.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![Google Antigravity](https://img.shields.io/badge/Antigravity-Certified%20Plugin-purple.svg)](https://gemini.google.com)

---

## 🏛️ System Overview

**ZadRow** is an autonomous multi-agent agency that transforms a **single client brief or vision prompt** into a complete, award-winning, zero-placeholder production website.

Unlike monolithic AI code generators that cram planning, design tokens, UI design, component coding, and testing into one prompt—causing hallucinations and generic templates—ZadRow operates on **Atomic Cognitive Scoping**:
- **42 Specialized AI Agents** organized across **9 dedicated departments** and **6 formal tiers**.
- Each agent has an explicitly bounded, minimal cognitive workload with assigned domain skills from `.agents/skills/`.
- Every department produces typed, schema-validated JSON artifacts stored in `mas_agency/workspace/artifacts/`.
- Four **Sequential Stage Gates** halt the pipeline if specifications contradict, contrast math fails, or defects remain.
- The **Zero-Placeholder Mandate** permanently bans "Lorem ipsum", "TODO", "coming soon", and placeholder copies.

---

## 📐 Enterprise Departmental Hierarchy

```
                                      [ USER PROMPT / BRIEF ]
                                                 │
                                 ┌───────────────▼───────────────┐
                                 │   Tier 0: Executive Command   │
                                 │  A00 Chief Orchestrator       │
                                 │  A01 Scope Director           │
                                 │  A02 Program Manager (DAG)    │
                                 │  A03 Architecture Arbiter     │
                                 └───────────────┬───────────────┘
                                                 │
               ┌─────────────────────────────────┼─────────────────────────────────┐
               │                                 │                                 │
┌──────────────▼──────────────┐   ┌──────────────▼──────────────┐   ┌──────────────▼──────────────┐
│  Tier 1: Product & Docs     │   │ Tier 2: Creative & Research │   │  Tier 2: Experience Design  │
│ A10 Product Director        │   │ A20 Creative Director       │   │ A30 Experience Director     │
│ A11 Product Analyst         │   │ A21 Design Research Lead    │   │ A31 UX Designer             │
│ A12 Information Architect   │   │ A22 Creative Art Director   │   │ A32 UI Designer (Tokens)    │
│ A13 Master Spec Architect   │   │ A23 Motion Choreographer    │   │ A33 Content Strategist      │
│ A14 Doc Verification Lead   │   └──────────────┬──────────────┘   └──────────────┬──────────────┘
└──────────────┬──────────────┘                  │                                 │
               │                                 └────────────────┬────────────────┘
               └─────────────────────────────────┬────────────────┘
                                                 │
                                  GATE 1: FOUNDATION & DESIGN GATE
                                                 │
                                 ┌───────────────▼───────────────┐
                                 │ Tier 2: Technical Arch        │
                                 │  A40 Chief Technical Architect│
                                 │  A41 Frontend Architect       │
                                 │  A42 Backend Architect (Cond) │
                                 │  A43 Platform & Build Arch    │
                                 │  A44 Technical Risk Reviewer  │
                                 └───────────────┬───────────────┘
                                                 │
               ┌─────────────────────────────────┴─────────────────────────────────┐
               │                                                                   │
┌──────────────▼──────────────┐                                     ┌──────────────▼──────────────┐
│ Tier 3: Frontend Squad      │                                     │ Tier 3: Backend Squad (Cond)│
│ A50 Frontend Lead           │                                     │ A60 Backend Lead            │
│ A51 App Shell Engineer      │                                     │ A61 Server App Engineer     │
│ A52 Page Engineering Lead   │                                     │ A62 Persistence Engineer    │
│ A53 Component Lead          │                                     │ A63 Integration Engineer    │
│ A54 Visual Experience Eng   │                                     └──────────────┬──────────────┘
└──────────────┬──────────────┘                                                    │
               │                                                                   │
               └─────────────────────────────────┬─────────────────────────────────┘
                                                 │
                                   GATE 2: CODE SYNTHESIS GATE
                                                 │
                                 ┌───────────────▼───────────────┐
                                 │ Tier 4: Quality Verification  │
                                 │  A70 Independent QA Director  │
                                 │  A71 Functional Test Lead     │
                                 │  A72 Visual/Responsive QA     │
                                 │  A73 Accessibility (WCAG 2.2) │
                                 │  A74 Performance & Web Vitals │
                                 │  A75 Security & Vulnerability │
                                 │  A76 SEO & Social Graph       │
                                 └───────────────┬───────────────┘
                                                 │
                                   GATE 3: REMEDIATION & RETEST
                                                 │
                                 ┌───────────────▼───────────────┐
                                 │ Tier 5: Release & Remediation │
                                 │  A80 Release Director         │
                                 │  A81 Defect Triage Specialist │
                                 │  A82 Remediation Coordinator  │
                                 │  A83 Release Readiness Audit  │
                                 └───────────────┬───────────────┘
                                                 │
                                 [ AWWWARDS-GRADE PRODUCTION SITE ]
```

---

## 📋 The 42 Specialist Agent Inventory

| ID | Title | Department | Tier | Primary Assigned Skills | Primary JSON Deliverable |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **A00** | Chief Orchestrator & Website Director | Executive Command | Tier 0 | `dispatching-parallel-agents`, `writing-plans` | `00_master_orchestration_manifest.json` |
| **A01** | Requirements & Scope Director | Executive Command | Tier 0 | `brainstorming`, `writing-guidelines` | `01_scope_charter.json` |
| **A02** | Technical Program Manager | Executive Command | Tier 0 | `subagent-driven-development` | `02_program_execution_dag.json` |
| **A03** | Architecture & Quality Arbiter | Executive Command | Tier 0 | `verification-before-completion` | `03_quality_arbitration_verdict.json` |
| **A10** | Product & Documentation Director | Product & Docs | Tier 1 | `doc-coauthoring`, `writing-plans` | `10_product_documentation_plan.json` |
| **A11** | Product Analyst | Product & Docs | Tier 1 | `brainstorming`, `writing-guidelines` | `11_product_analysis.json` |
| **A12** | Information Architect | Product & Docs | Tier 1 | `ui-ux-pro-max`, `design-system` | `12_information_architecture.json` |
| **A13** | Master Specification Architect | Product & Docs | Tier 1 | `writing-guidelines`, `test-driven-development` | `13_master_specification.json` |
| **A14** | Documentation Verification Lead | Product & Docs | Tier 1 | `verification-before-completion` | `14_doc_verification_matrix.json` |
| **A20** | Creative & Research Director | Creative & Research | Tier 2 | `brand`, `design`, `algorithmic-art` | `20_creative_direction_charter.json` |
| **A21** | Design Research Lead | Creative & Research | Tier 2 | `frontend-design`, `ui-ux-pro-max` | `21_design_research_benchmarks.json` |
| **A22** | Creative Art Director | Creative & Research | Tier 2 | `design-tokens-specifier`, `ui-styling` | `22_art_direction_manifest.json` |
| **A23** | Interaction & Motion Director | Creative & Research | Tier 2 | `awwwards-motion-choreography` | `23_motion_choreography_spec.json` |
| **A30** | Experience Design Director | Experience Design | Tier 2 | `ui-ux-pro-max`, `design-system` | `30_experience_design_strategy.json` |
| **A31** | UX Designer | Experience Design | Tier 2 | `responsive-touch-gatekeeper`, `design` | `31_wireframe_ux_flow.json` |
| **A32** | UI Designer | Experience Design | Tier 2 | `design-tokens-specifier`, `ui-styling` | `32_design_tokens_and_components.json` |
| **A33** | Content & Conversion Strategist | Experience Design | Tier 2 | `brand`, `writing-guidelines` | `33_copywriting_and_conversion.json` |
| **A40** | Chief Technical Architect | Tech Architecture | Tier 2 | `vercel-react-best-practices` | `40_master_tech_architecture.json` |
| **A41** | Frontend Architect | Tech Architecture | Tier 2 | `vercel-composition-patterns` | `41_frontend_architecture.json` |
| **A42** | Backend Architect | Tech Architecture | Tier 2 | `firebase-data-connect`, `mcp-builder` | `42_backend_architecture.json` |
| **A43** | Platform & Build Architect | Tech Architecture | Tier 2 | `modern-web-guidance` | `43_build_platform_spec.json` |
| **A44** | Technical Risk Reviewer | Tech Architecture | Tier 2 | `verification-before-completion` | `44_tech_risk_assessment.json` |
| **A50** | Frontend Engineering Lead | Frontend Engineering | Tier 3 | `vercel-react-best-practices` | `50_frontend_delivery_manifest.json` |
| **A51** | App Shell Engineer | Frontend Engineering | Tier 3 | `vercel-react-view-transitions` | `51_app_shell_scaffold.json` |
| **A52** | Page Engineering Lead | Frontend Engineering | Tier 3 | `vercel-composition-patterns` | `52_page_assemblies.json` |
| **A53** | Component Engineering Lead | Frontend Engineering | Tier 3 | `ui-styling`, `wcag-contrast-auditor` | `53_ui_component_library.json` |
| **A54** | Visual Experience Engineer | Frontend Engineering | Tier 3 | `kinetic-canvas-hero`, `algorithmic-art` | `54_visual_experience_assets.json` |
| **A60** | Backend Engineering Lead | Backend Engineering | Tier 3 | `firebase-firestore` | `60_backend_delivery_manifest.json` |
| **A61** | Server Application Engineer | Backend Engineering | Tier 3 | `firebase-auth-basics` | `61_server_endpoints.json` |
| **A62** | Data Persistence Engineer | Backend Engineering | Tier 3 | `firebase-firestore` | `62_data_persistence_spec.json` |
| **A63** | Integration Services Engineer | Backend Engineering | Tier 3 | `mcp-builder` | `63_integration_services.json` |
| **A70** | Independent QA Director | Quality Verification | Tier 4 | `verification-before-completion` | `70_qa_comprehensive_verdict.json` |
| **A71** | Functional Test Lead | Quality Verification | Tier 4 | `webapp-testing`, `test-driven-dev` | `71_functional_test_report.json` |
| **A72** | Visual & Responsive QA Specialist | Quality Verification | Tier 4 | `responsive-touch-gatekeeper` | `72_visual_responsive_audit.json` |
| **A73** | Accessibility Auditor | Quality Verification | Tier 4 | `wcag-contrast-auditor`, `a11y-debugging`| `73_accessibility_wcag_audit.json` |
| **A74** | Performance & Web Vitals Auditor | Quality Verification | Tier 4 | `debug-optimize-lcp` | `74_performance_webvitals_audit.json` |
| **A75** | Security Auditor | Quality Verification | Tier 4 | `firebase-security-rules-auditor` | `75_security_audit_report.json` |
| **A76** | SEO & Social Graph Auditor | Quality Verification | Tier 4 | `web-design-guidelines` | `76_seo_social_graph_audit.json` |
| **A80** | Release & Remediation Director | Release & Remediation| Tier 5 | `verification-before-completion` | `80_remediation_release_manifest.json` |
| **A81** | Defect Triage Specialist | Release & Remediation| Tier 5 | `systematic-debugging` | `81_defect_triage_matrix.json` |
| **A82** | Remediation Coordinator | Release & Remediation| Tier 5 | `requesting-code-review` | `82_remediation_patch_log.json` |
| **A83** | Release Readiness Auditor | Release & Remediation| Tier 5 | `verification-before-completion` | `83_production_release_package.json` |

---

## ⚡ The Four Governing Stage Gates

Advancement through the ZadRow lifecycle is strictly regulated by sequential gates governed by **A03 Architecture & Quality Arbiter**:

1. **Gate 1: Foundation Gate**  
   *Prerequisites*: Scope Charter (`01`), Execution DAG (`02`), Master Spec (`13`), Doc Verification (`14`), and Master Tech Architecture (`40`).  
   *Rule*: Implementation cannot begin until documentation reaches 100% completeness and zero architectural contradictions exist.

2. **Gate 2: Design & Experience Gate**  
   *Prerequisites*: Art Direction (`22`), Motion Choreography (`23`), Wireframes (`31`), Design Tokens (`32`), and Copywriting (`33`).  
   *Rule*: Tokens must mathematically satisfy WCAG AA/AAA contrast ratios, and copy must be 100% placeholder-free before code synthesis begins.

3. **Gate 3: Code Synthesis & Integration Gate**  
   *Prerequisites*: Frontend Manifest (`50`), App Shell (`51`), Page Assemblies (`52`), UI Components (`53`), Visual Assets (`54`).  
   *Rule*: Code must compile with zero TypeScript errors, zero missing token references, and strict 60 FPS animation discipline.

4. **Gate 4: Release & Verification Gate**  
   *Prerequisites*: QA Verdict (`70`), Triage Matrix (`81`), Patch Log (`82`), Release Package (`83`).  
   *Rule*: Exactly 0 P0/P1 defects, maximum 2 P3 defects, clean production build (`npm run build`), and deployment readiness certification.

---

## 🔀 Detachable Execution Subsystem

ZadRow supports both full 7-phase execution and modular **Detachable Execution Modes**. If instructed to execute a specific department or phase, the engine isolates the active phase, auto-scaffolds minimal upstream contracts, and records skipped phases as `CLEANLY_SKIPPED_DETACHED` without breaking dependencies:

```bash
# Run creative and UX design only
node mas_agency/src/cli.js --prompt "Create a luxury cyber-tech brand" --scope design_only

# Run documentation and specifications only
node mas_agency/src/cli.js --prompt "SaaS data intelligence platform" --scope docs_only

# Run technical architecture only
node mas_agency/src/cli.js --prompt "Real-time AI telemetry dashboard" --scope architecture_only

# Run implementation code synthesis only
node mas_agency/src/cli.js --prompt "Kinetic generative art showcase" --scope code_only

# Run quality verification audit only
node mas_agency/src/cli.js --validate-only
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js >= 18.0.0 (v20+ recommended)
- Windows x64, macOS, or Linux
- Google Antigravity IDE or CLI runtime

### Installation
```bash
# Clone the repository
git clone https://github.com/sri-thinesh/ZadRow.git
cd ZadRow

# Install orchestration dependencies
cd mas_agency
npm install
cd ..
```

### Running with a Single Prompt
```bash
# Execute end-to-end multi-agent orchestration
node mas_agency/src/cli.js --prompt "Create an award-winning portfolio for a generative AI architecture studio named Studio Synthetix, featuring kinetic typography, dark oklch palette, interactive canvas shader, and smooth Lenis scrolling."
```

### Launching the Synthesized Website
```bash
cd mas_agency/output/website
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view your production-ready digital experience.

---

## 🧪 Comprehensive Testing & Verification Suite

ZadRow includes a verified test harness covering unit, integration, parallel concurrency, and native agent execution:

```bash
# 1. Run full 7-phase workflow, gate barriers, and failure recovery acceptance suite
node mas_agency/test/workflow_and_failure_acceptance_test.js

# 2. Run all 43 agents native Antigravity CLI acceptance test
node mas_agency/test/all_agents_acceptance_test.js

# 3. Run workflow coordinator gate enforcement test
node mas_agency/test/workflow_coordinator_test.js

# 4. Run real AI agent execution and skill injection test
node mas_agency/test/agent_runner_test.js

# 5. Run automated WCAG 2.2 AAA math & responsive QA test
node mas_agency/test/qa_verifier_test.js

# 6. Run atomic persistence and concurrency test (50 parallel writes)
node mas_agency/test/backend_persistence_test.js

# 7. Validate Antigravity plugin manifest
agy plugin validate
```

---

## 📂 Repository Architecture

```
ZadRow/
├── .agents/
│   └── skills/                 # Assigned agent capability modules (Vercel, UI/UX, Motion)
├── agents/                     # 44 registered Antigravity agent personas
│   ├── A00_ChiefOrchestrator.md ... A83_ReleaseReadinessAuditor.md
│   ├── multiagent-system.md    # Primary orchestrator alias
│   └── zadrow.md               # ZadRow brand entrypoint
├── plugin.json                 # Antigravity plugin manifest
├── rules/
│   └── AGENTS.md               # Governing rules, Zero-Placeholder mandate, anti-bypass protocols
├── mas_agency/
│   ├── agents/                 # Departmental markdown source personas and agent registry
│   ├── docs/                   # Architectural guides and documentation
│   ├── output/
│   │   └── website/            # Synthesized Next.js 15 production website
│   ├── scripts/
│   │   ├── sync_agents.js      # Role-based tool synchronization engine
│   │   └── run_thinesh_orchestration.js
│   ├── src/
│   │   ├── cli.js              # Command-line interface and interactive runner
│   │   ├── index.js            # Main programmatic API exports
│   │   ├── engine/             # Core engines: DAG, AgentRunner, Synthesizer, QA, Coordinator
│   │   ├── lib/                # Atomic persistence, mutex locks, and security validators
│   │   └── utils/              # ANSI logger, ASCII banner, and telemetry formats
│   ├── test/                   # Comprehensive automated test suites
│   └── test_results/           # Verifiable execution logs, SQLite evidence, and acceptance reports
└── README.md
```

---

## 📜 Zero-Placeholder Mandate

A permanent, non-negotiable rule across all operations:
> **Under NO circumstance may any agent produce placeholder content.**

1. **Banned Text Tokens**: "Lorem ipsum", "TODO", "TBD", "placeholder", "headline goes here", "coming soon".
2. **Real Production Copy**: Authentically authored headlines, narratives, and microcopy for every element.
3. **Real Design Tokens**: Mathematically uniform OKLCH color palettes, fluid CSS font clamps, explicit spacing scales.
4. **Complete Implementations**: Fully realized TypeScript components with zero empty stubs.
5. **Spatial Animation Protocol**: When media assets are not supplied, developers generate dimensional `MediaPlaceholder` containers preserving layout ratios (`aspect-video`, `aspect-[4/3]`) with hardware-accelerated animations (parallax, kinetic hover, shimmer sweeps).

---

## 📄 License & Credits

- **License**: MIT
- **Engineered by**: [Sri Thinesh](https://github.com/sri-thinesh) & ZadRow Autonomous Multi-Agent Systems Team.
- **Agency Archetype**: Modeled after Active Theory, Locomotive, Dogstudio, and Pentagram.
