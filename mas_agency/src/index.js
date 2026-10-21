/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * Runtime Orchestration Engine - Main Programmatic Entry
 */

import fs from 'fs';
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
 * Run the registry-driven multi-agent DAG orchestration pipeline.
 *
 * Nodes are derived from `agents/agent_registry.json`, so the DAG can never drift
 * from the registered agent roster. Tier ordering comes from each agent's declared
 * tier and dependencies follow the supervisor chain.
 */
export async function runOrchestration(prompt, options = {}) {
  const agencyDir = options.agencyDir || path.resolve(__dirname, '..');
  const maxConcurrency = options.concurrency || 6;
  const agentRunner = options.agentRunner || new AgentRunner({
    agencyDir,
    executionMode: options.executionMode || 'cli',
    allowMissingCli: options.allowMissingCli,
    mockArtifactFactory: options.mockArtifactFactory,
    // Never defaulted on: the operator opts in per run or via the environment.
    skipPermissions:
      options.skipPermissions === true || process.env.ANTIGRAVITY_SKIP_PERMISSIONS === '1',
  });

  const registryPath = path.join(agencyDir, 'agents', 'agent_registry.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const agents = registry.agents || {};

  const tierNumber = (tier) => {
    const match = /(\d+)/.exec(String(tier || ''));
    return match ? Number(match[1]) : 0;
  };

  const dag = new DAGRunner({ maxConcurrency });

  const ordered = Object.values(agents).sort((a, b) => {
    const delta = tierNumber(a.tier) - tierNumber(b.tier);
    return delta !== 0 ? delta : String(a.id).localeCompare(String(b.id));
  });

  for (const agent of ordered) {
    const supervisorId = (/^(A\d{2})/.exec(agent.supervisor || '') || [])[1];
    const hasSupervisor = Boolean(supervisorId && supervisorId !== agent.id && agents[supervisorId]);
    const deliverable = path.basename(agent.primary_deliverable || `${agent.id}.json`);

    dag.addNode({
      id: agent.id,
      name: agent.title || agent.slug || agent.id,
      tier: tierNumber(agent.tier),
      dependsOn: hasSupervisor ? [supervisorId] : [],
      primaryArtifact: deliverable,
      execute: async (context) => {
        const delegation = await agentRunner.delegateTask(
          hasSupervisor ? supervisorId : agent.id,
          agent.id,
          `Author artifact "${deliverable}" for project: ${prompt}`,
          { upstreamPrompt: prompt, upstreamArtifacts: context.upstream },
          (progress, msg) => context.emitProgress(progress, msg)
        );
        return delegation.result;
      },
    });
  }

  return { dag, agentRunner, registry };
}
