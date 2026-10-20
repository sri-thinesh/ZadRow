/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * Runtime Orchestration Engine - Main Programmatic Entry
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { DAGRunner, DAGNode } from './engine/dag_runner.js';
import { AgentRunner, ResponseSanitizer } from './engine/agent_runner.js';
import { CodeSynthesizer } from './engine/code_synthesizer.js';
import { QAVerifier } from './engine/qa_verifier.js';
import { SkillLoader } from './engine/skill_loader.js';
import {
  WorkflowCoordinator,
  WorkflowError,
  GateFailureError,
  PrerequisiteError,
  PHASE_DEFINITIONS,
} from './engine/workflow_coordinator.js';
import { Logger, Colors, Badges } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export {
  WorkflowCoordinator,
  WorkflowError,
  GateFailureError,
  PrerequisiteError,
  PHASE_DEFINITIONS,
  DAGRunner,
  DAGNode,
  AgentRunner,
  ResponseSanitizer,
  SkillLoader,
  CodeSynthesizer,
  QAVerifier,
  Logger,
  Colors,
  Badges,
};

/**
 * Run the full 18-agent DAG orchestration pipeline
 */
export async function runOrchestration(prompt, options = {}) {
  const agencyDir = options.agencyDir || path.resolve(__dirname, '..');
  const maxConcurrency = options.concurrency || 6;
  const skipQA = options.skipQA || false;

  const agentRunner = new AgentRunner({ agencyDir });
  const dag = new DAGRunner({ maxConcurrency });

  // 1. Build DAG Nodes for the 18 Agency Operatives
  const agentDefinitions = [
    // Tier 0: Executive
    {
      id: 'E01_BriefAnalyst',
      name: 'Executive Brief Director',
      tier: 0,
      dependsOn: [],
      primaryArtifact: '00_executive_brief.json',
    },
    // Tier 1: Strategy & Creative
    {
      id: 'CD_ArtDirector',
      name: 'Creative Art Director',
      tier: 1,
      dependsOn: ['E01_BriefAnalyst'],
      primaryArtifact: '01_art_direction.json',
    },
    {
      id: 'UX_InfoArchitect',
      name: 'Lead UX Architect',
      tier: 1,
      dependsOn: ['E01_BriefAnalyst'],
      primaryArtifact: '01_ux_architecture.json',
    },
    {
      id: 'ST_BrandCopywriter',
      name: 'Chief Brand Copywriter',
      tier: 1,
      dependsOn: ['E01_BriefAnalyst'],
      primaryArtifact: '01_brand_copy.json',
    },
    // Tier 2: Architecture & Tokens
    {
      id: 'SA_TechArchitect',
      name: 'Principal Tech Architect',
      tier: 2,
      dependsOn: ['CD_ArtDirector', 'UX_InfoArchitect'],
      primaryArtifact: '02_tech_architecture.json',
    },
    {
      id: 'DS_TokenSpecifier',
      name: 'Design System Lead',
      tier: 2,
      dependsOn: ['CD_ArtDirector'],
      primaryArtifact: '02_design_tokens.json',
    },
    {
      id: 'MO_MotionChoreographer',
      name: 'Motion Choreographer',
      tier: 2,
      dependsOn: ['CD_ArtDirector', 'UX_InfoArchitect'],
      primaryArtifact: '02_motion_choreography.json',
    },
    // Tier 3: Core Scaffolding & Component Specialists
    {
      id: 'ENG_ShellScaffolder',
      name: 'Core Scaffolding Engineer',
      tier: 3,
      dependsOn: ['SA_TechArchitect', 'DS_TokenSpecifier'],
      primaryArtifact: '03_shell_scaffold.json',
    },
    {
      id: 'ENG_HeroStage',
      name: 'Kinetic Hero Specialist',
      tier: 3,
      dependsOn: ['ENG_ShellScaffolder', 'MO_MotionChoreographer', 'ST_BrandCopywriter'],
      primaryArtifact: '03_hero_stage.json',
    },
    {
      id: 'ENG_FeatureBento',
      name: 'Bento Grid Specialist',
      tier: 3,
      dependsOn: ['ENG_ShellScaffolder', 'ST_BrandCopywriter'],
      primaryArtifact: '03_feature_bento.json',
    },
    {
      id: 'ENG_InteractiveShowcase',
      name: 'Showcase Specialist',
      tier: 3,
      dependsOn: ['ENG_ShellScaffolder', 'ST_BrandCopywriter'],
      primaryArtifact: '03_interactive_showcase.json',
    },
    {
      id: 'ENG_Navigation',
      name: 'Navigation Specialist',
      tier: 3,
      dependsOn: ['ENG_ShellScaffolder', 'UX_InfoArchitect'],
      primaryArtifact: '03_navigation.json',
    },
    {
      id: 'ENG_FooterConversion',
      name: 'Conversion Specialist',
      tier: 3,
      dependsOn: ['ENG_ShellScaffolder', 'ST_BrandCopywriter'],
      primaryArtifact: '03_footer_conversion.json',
    },
    // Tier 4: Sub-Agents (Micro-Interactions & Assets)
    {
      id: 'SUB_MicroInteractions',
      name: 'Micro-Interaction Sub-Agent',
      tier: 4,
      dependsOn: ['ENG_HeroStage', 'MO_MotionChoreographer'],
      primaryArtifact: '04_micro_interactions.json',
    },
    {
      id: 'SUB_ProceduralAssets',
      name: 'Procedural Graphics Sub-Agent',
      tier: 4,
      dependsOn: ['ENG_ShellScaffolder', 'CD_ArtDirector'],
      primaryArtifact: '04_procedural_assets.json',
    },
    // Tier 5: Quality Assurance
    {
      id: 'QA_AccessibilityAuditor',
      name: 'WCAG 2.2 AAA Auditor',
      tier: 5,
      dependsOn: ['DS_TokenSpecifier', 'ENG_HeroStage', 'ENG_FeatureBento'],
      primaryArtifact: '05_qa_accessibility_audit.json',
    },
    {
      id: 'QA_PerformanceAuditor',
      name: 'Web Vitals Auditor',
      tier: 5,
      dependsOn: ['ENG_HeroStage', 'SUB_MicroInteractions'],
      primaryArtifact: '05_qa_performance_audit.json',
    },
    {
      id: 'QA_DeviceGatekeeper',
      name: 'Responsive Touch Auditor',
      tier: 5,
      dependsOn: ['ENG_Navigation', 'SUB_MicroInteractions'],
      primaryArtifact: '05_qa_device_gatekeeper.json',
    },
    {
      id: 'REL_ReleaseValidator',
      name: 'Delivery & Release Lead',
      tier: 5,
      dependsOn: ['QA_AccessibilityAuditor', 'QA_PerformanceAuditor', 'QA_DeviceGatekeeper'],
      primaryArtifact: '05_release_manifest.json',
    },
  ];

  for (const def of agentDefinitions) {
    dag.addNode({
      id: def.id,
      name: def.name,
      tier: def.tier,
      dependsOn: def.dependsOn,
      primaryArtifact: def.primaryArtifact,
      execute: async (context) => {
        return await agentRunner.executeAgent(
          def.id,
          prompt,
          context.upstream,
          (progress, msg) => context.emitProgress(progress, msg)
        );
      },
    });
  }

  return { dag, agentRunner };
}
