import fs from 'fs';
import path from 'path';
import os from 'os';
import assert from 'assert';

const PLUGIN_ID = 'multiagent-system-2-0';
const pluginRoot = path.join(os.homedir(), '.gemini', 'config', 'plugins', PLUGIN_ID);
let workspaceRoot = process.env.ZADROW_WORKSPACE || process.cwd();

// If invoked from within mas_agency or scripts subdir, resolve up to workspace root containing plugin.json
if (!fs.existsSync(path.join(workspaceRoot, 'plugin.json')) && fs.existsSync(path.join(workspaceRoot, '..', 'plugin.json'))) {
  workspaceRoot = path.resolve(workspaceRoot, '..');
}

// Read plugin.json and assert its name === PLUGIN_ID, throwing if they drift
const pluginJsonPath = path.join(workspaceRoot, 'plugin.json');
if (!fs.existsSync(pluginJsonPath)) {
  throw new Error(`plugin.json not found at workspaceRoot: ${workspaceRoot}`);
}
const pluginConfig = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'));
if (pluginConfig.name !== PLUGIN_ID) {
  throw new Error(`plugin.json name "${pluginConfig.name}" does not match expected PLUGIN_ID "${PLUGIN_ID}"`);
}

const registryPath = path.join(workspaceRoot, 'mas_agency', 'agents', 'agent_registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const pluginAgentsDir = path.join(pluginRoot, 'agents');
const workspaceAgentsDir = path.join(workspaceRoot, 'agents');

if (!fs.existsSync(pluginAgentsDir)) fs.mkdirSync(pluginAgentsDir, { recursive: true });
if (!fs.existsSync(workspaceAgentsDir)) fs.mkdirSync(workspaceAgentsDir, { recursive: true });

// Mirror plugin.json and rules to pluginRoot
fs.copyFileSync(pluginJsonPath, path.join(pluginRoot, 'plugin.json'));

const workspaceRulesDir = path.join(workspaceRoot, 'rules');
const pluginRulesDir = path.join(pluginRoot, 'rules');
if (fs.existsSync(workspaceRulesDir)) {
  if (!fs.existsSync(pluginRulesDir)) fs.mkdirSync(pluginRulesDir, { recursive: true });
  for (const ruleFile of fs.readdirSync(workspaceRulesDir)) {
    fs.copyFileSync(path.join(workspaceRulesDir, ruleFile), path.join(pluginRulesDir, ruleFile));
  }
}

// Check for legacy directory with spaces for backward compatibility on existing installs
const legacyPluginDir = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'multiagent system 2.0');
const legacyAgentsDir = path.join(legacyPluginDir, 'agents');
const syncLegacy = fs.existsSync(legacyPluginDir);
if (syncLegacy && !fs.existsSync(legacyAgentsDir)) {
  fs.mkdirSync(legacyAgentsDir, { recursive: true });
}

// Explicit tool overrides map: only applied if an explicit entry is present
const TOOL_OVERRIDES = {};

/**
 * Extracts YAML frontmatter, markdown body, and tools block from file content
 */
function parseFrontmatterAndBody(fileContent) {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatterRaw: null, body: fileContent, toolsBlock: null };
  }
  const frontmatterRaw = match[1];
  const body = match[2];

  // Extract tools block verbatim from frontmatter
  const toolsMatch = frontmatterRaw.match(/^tools:\r?\n((?:[ \t]+-[^\r\n]*\r?\n?)*)/m);
  const toolsBlock = toolsMatch ? toolsMatch[0].trimEnd() : null;

  return { frontmatterRaw, body, toolsBlock };
}

let count = 0;
for (const [id, agent] of Object.entries(registry.agents)) {
  const srcPath = path.join(workspaceRoot, agent.file_path);
  if (!fs.existsSync(srcPath)) {
    console.error('Source file not found:', srcPath);
    continue;
  }
  const rawSrcContent = fs.readFileSync(srcPath, 'utf8');
  const { frontmatterRaw, body, toolsBlock: srcToolsBlock } = parseFrontmatterAndBody(rawSrcContent);

  if (!srcToolsBlock) {
    throw new Error(`Source manifest for ${id} (${srcPath}) does not declare a "tools:" list in YAML frontmatter!`);
  }

  let finalToolsBlock = srcToolsBlock;
  let isOverridden = false;

  if (TOOL_OVERRIDES[id]) {
    isOverridden = true;
    const overrideYaml = 'tools:\n' + TOOL_OVERRIDES[id].map((t) => `  - ${t}`).join('\n');
    console.log(`[OVERRIDE] Overriding tools for ${id}: ${TOOL_OVERRIDES[id].join(', ')}`);
    finalToolsBlock = overrideYaml;
  }

  // Construct synchronized file content preserving frontmatter and tools verbatim
  let fullContent;
  if (frontmatterRaw) {
    let syncedFrontmatter = frontmatterRaw;
    if (isOverridden) {
      syncedFrontmatter = frontmatterRaw.replace(/^tools:\r?\n((?:[ \t]+-[^\r\n]*\r?\n?)*)/m, finalToolsBlock + '\n');
    }
    fullContent = `---\n${syncedFrontmatter.trim()}\n---\n\n${body.trimStart()}`;
  } else {
    const skillsYaml = Array.isArray(agent.skills) && agent.skills.length > 0
      ? `\nskills:\n${agent.skills.map((s) => `  - ${s}`).join('\n')}`
      : '';
    fullContent = `---
name: ${id}
description: ZadRow ${id} ${agent.title} - ${agent.department} specialist for ${agent.tier}.
${finalToolsBlock}${skillsYaml}
mainAgent: true
subagent: true
commandExecutionPolicy: auto
---

${body.trimStart()}`;
  }

  const targetFileName = `${id}_${agent.slug}.md`;
  const pluginFilePath = path.join(pluginAgentsDir, targetFileName);
  const workspaceFilePath = path.join(workspaceAgentsDir, targetFileName);

  fs.writeFileSync(pluginFilePath, fullContent, 'utf8');
  fs.writeFileSync(workspaceFilePath, fullContent, 'utf8');
  if (syncLegacy) {
    fs.writeFileSync(path.join(legacyAgentsDir, targetFileName), fullContent, 'utf8');
  }
  count++;

  // Verify byte-identical tools block in written output
  const writtenContent = fs.readFileSync(pluginFilePath, 'utf8');
  const { toolsBlock: writtenToolsBlock } = parseFrontmatterAndBody(writtenContent);

  if (!isOverridden) {
    assert.strictEqual(
      writtenToolsBlock,
      srcToolsBlock,
      `Agent ${id}: Written tools block is not byte-identical to source manifest!`
    );
  }

  // Assert A01, A02, A03 contain invoke_subagent
  if (['A01', 'A02', 'A03'].includes(id)) {
    assert(
      writtenToolsBlock.includes('invoke_subagent'),
      `Agent ${id} must contain "invoke_subagent" in its tools list!`
    );
  }
}

// Synchronize multiagent-system.md and zadrow.md orchestrator entrypoints
const masEntrypointSrc = path.join(workspaceAgentsDir, 'multiagent-system.md');
if (fs.existsSync(masEntrypointSrc)) {
  fs.copyFileSync(masEntrypointSrc, path.join(pluginAgentsDir, 'multiagent-system.md'));
  if (syncLegacy) {
    fs.copyFileSync(masEntrypointSrc, path.join(legacyAgentsDir, 'multiagent-system.md'));
  }
  console.log('Synchronized multiagent-system.md orchestrator entrypoint.');
  
  // Also create zadrow.md entrypoint
  const zadrowContent = fs.readFileSync(masEntrypointSrc, 'utf8').replace(/^name:\s*multiagent-system/m, 'name: zadrow');
  fs.writeFileSync(path.join(workspaceAgentsDir, 'zadrow.md'), zadrowContent, 'utf8');
  fs.writeFileSync(path.join(pluginAgentsDir, 'zadrow.md'), zadrowContent, 'utf8');
  if (syncLegacy) {
    fs.writeFileSync(path.join(legacyAgentsDir, 'zadrow.md'), zadrowContent, 'utf8');
  }
  console.log('Synchronized zadrow.md orchestrator entrypoint.');
}

console.log(`Successfully generated and synchronized ${count} agent files in both plugin and workspace directories.`);
