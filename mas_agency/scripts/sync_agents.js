import fs from 'fs';
import path from 'path';

const pluginRoot = 'C:/Users/ksrit/.gemini/config/plugins/multiagent system 2.0';
const workspaceRoot = 'c:/Users/ksrit/OneDrive/Documents/multiagent system 2.0';
const registryPath = path.join(workspaceRoot, 'mas_agency/agents/agent_registry.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const pluginAgentsDir = path.join(pluginRoot, 'agents');
const workspaceAgentsDir = path.join(workspaceRoot, 'agents');

if (!fs.existsSync(pluginAgentsDir)) fs.mkdirSync(pluginAgentsDir, { recursive: true });
if (!fs.existsSync(workspaceAgentsDir)) fs.mkdirSync(workspaceAgentsDir, { recursive: true });

// Role-based tool permissions mapping conforming to Antigravity runtime tool schema
function getToolsForAgent(id, agent) {
  // A00 Chief Orchestrator: Full supervisory and system capabilities
  if (id === 'A00') {
    return [
      'view_file',
      'write_to_file',
      'replace_file_content',
      'run_command',
      'send_message',
      'invoke_subagent',
      'define_subagent',
      'manage_subagents',
    ];
  }

  // Departmental Directors & Squad Leads: Supervisory delegation + file authoring
  const squadLeads = ['A10', 'A20', 'A30', 'A40', 'A50', 'A60', 'A70', 'A80'];
  if (squadLeads.includes(id)) {
    // Technical, Frontend, Backend, QA Leads also require run_command for toolchains/tests
    if (['A50', 'A60', 'A70'].includes(id)) {
      return [
        'view_file',
        'write_to_file',
        'replace_file_content',
        'run_command',
        'send_message',
        'invoke_subagent',
        'manage_subagents',
      ];
    }
    return [
      'view_file',
      'write_to_file',
      'replace_file_content',
      'send_message',
      'invoke_subagent',
      'manage_subagents',
    ];
  }

  // Technical specialists requiring terminal commands (builds, testing, audits)
  const technicalCommandSpecialists = [
    'A43', // Platform & Build Architect (build toolchains, dependencies)
    'A71', // Functional Test Lead (executes test suites)
    'A72', // Visual & Responsive QA (browser audits, viewport checks)
    'A74', // Performance Auditor (CWV, lighthouse, profiling)
    'A75', // Security Auditor (dependency scans, security audits)
    'A83', // Release Readiness Auditor (production build compilation verification)
  ];

  if (technicalCommandSpecialists.includes(id)) {
    return [
      'view_file',
      'write_to_file',
      'replace_file_content',
      'run_command',
      'send_message',
    ];
  }

  // Pure design, analysis, copywriting, architecture, and code authoring specialists:
  // Strictly restricted from executing arbitrary shell commands according to security boundaries
  return [
    'view_file',
    'write_to_file',
    'replace_file_content',
    'send_message',
  ];
}

let count = 0;
for (const [id, agent] of Object.entries(registry.agents)) {
  const srcPath = path.join(workspaceRoot, agent.file_path);
  if (!fs.existsSync(srcPath)) {
    console.error('Source file not found:', srcPath);
    continue;
  }
  const body = fs.readFileSync(srcPath, 'utf8');

  const tools = getToolsForAgent(id, agent);
  const toolsYaml = tools.map((t) => `  - ${t}`).join('\n');

  const skillsYaml = Array.isArray(agent.skills) && agent.skills.length > 0
    ? `\nskills:\n${agent.skills.map((s) => `  - ${s}`).join('\n')}`
    : '';

  const frontmatter = `---
name: ${id}
description: ZadRow ${id} ${agent.title} - ${agent.department} specialist for ${agent.tier}.
tools:
${toolsYaml}${skillsYaml}
mainAgent: true
subagent: true
commandExecutionPolicy: auto
---

`;

  const fullContent = frontmatter + body;
  const targetFileName = `${id}_${agent.slug}.md`;

  fs.writeFileSync(path.join(pluginAgentsDir, targetFileName), fullContent, 'utf8');
  fs.writeFileSync(path.join(workspaceAgentsDir, targetFileName), fullContent, 'utf8');
  count++;
}

// Synchronize multiagent-system.md and zadrow.md orchestrator entrypoints
const masEntrypointSrc = path.join(workspaceAgentsDir, 'multiagent-system.md');
if (fs.existsSync(masEntrypointSrc)) {
  fs.copyFileSync(masEntrypointSrc, path.join(pluginAgentsDir, 'multiagent-system.md'));
  console.log('Synchronized multiagent-system.md orchestrator entrypoint.');
  
  // Also create zadrow.md entrypoint
  const zadrowContent = fs.readFileSync(masEntrypointSrc, 'utf8').replace(/^name:\s*multiagent-system/m, 'name: zadrow');
  fs.writeFileSync(path.join(workspaceAgentsDir, 'zadrow.md'), zadrowContent, 'utf8');
  fs.writeFileSync(path.join(pluginAgentsDir, 'zadrow.md'), zadrowContent, 'utf8');
  console.log('Synchronized zadrow.md orchestrator entrypoint.');
}

console.log(`Successfully generated and synchronized ${count} agent files in both plugin and workspace directories.`);
