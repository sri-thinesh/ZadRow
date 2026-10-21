/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * Real AI Agent Execution Engine & Persona Skill Injector
 *
 * Responsibilities:
 * - Dynamic Persona Loading: Reads full persona markdown specifications from `mas_agency/agents/`
 * - Dynamic Skill Injection: Ingests assigned skills from `.agents/skills/` and `mas_agency/skills/`
 * - Antigravity CLI Execution: Dispatches prompts to the `agy` binary resolved via
 *   options.cliPath -> ANTIGRAVITY_CLI_PATH -> PATH lookup (see `resolveCliPath`).
 * - High-Fidelity Prompt Construction: Assembles identity, guardrails, skills, briefs, and schemas
 * - Robust Output Sanitization: Strips reasoning tags, markdown fences, and repairs JSON anomalies
 * - Resilience: Automatic retries with corrective feedback and bounded timeouts.
 * - Offline Mode: An explicit, opt-in deterministic backend (`executionMode: "mock"`) that labels
 *   every result with `synthetic: true`. There is NO silent fallback: when no CLI binary is
 *   resolvable and mock mode is off, execution throws.
 * - Workspace Artifact Persistence: Writes all generated artifacts to `mas_agency/workspace/artifacts/`
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SkillLoader: Discovers, parses, and caches specialized skill documentation
 */
export class SkillLoader {
  constructor(skillsDirs = []) {
    this.skillsDirs = skillsDirs;
    this.cache = new Map();
  }

  loadSkill(skillId) {
    if (!skillId) return null;
    if (this.cache.has(skillId)) return this.cache.get(skillId);

    // Normalize identifier if full or relative path was supplied
    let cleanId = skillId;
    if (cleanId.includes('/') || cleanId.includes('\\')) {
      const parts = cleanId.split(/[/\\]/);
      const last = parts[parts.length - 1];
      if (last.endsWith('.md')) {
        cleanId = parts[parts.length - 2];
      } else {
        cleanId = last;
      }
    }

    let foundContent = null;
    for (const baseDir of this.skillsDirs) {
      if (!fs.existsSync(baseDir)) continue;

      const candidates = [
        path.join(baseDir, cleanId, 'SKILL.md'),
        path.join(baseDir, cleanId, 'AGENTS.md'),
        path.join(baseDir, cleanId, 'README.md'),
        path.join(baseDir, cleanId),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          foundContent = fs.readFileSync(cand, 'utf8');
          break;
        }
      }
      if (foundContent) break;
    }

    if (foundContent) {
      this.cache.set(skillId, foundContent);
      this.cache.set(cleanId, foundContent);
    }
    return foundContent;
  }

  loadSkills(skillIds = []) {
    const loaded = {};
    for (const id of skillIds) {
      const content = this.loadSkill(id);
      if (content) {
        loaded[id] = content;
      }
    }
    return loaded;
  }

  extractSkillsFromMarkdown(markdown) {
    if (!markdown) return [];
    const skills = new Set();

    // Pattern 1: Path references like `.agents/skills/<name>/SKILL.md` or `skills/<name>`
    const pathMatches = markdown.matchAll(/skills[/\\]([a-zA-Z0-9_-]+)/g);
    for (const m of pathMatches) {
      const name = m[1];
      if (name && name !== 'tier' && !name.endsWith('.md')) {
        skills.add(name);
      }
    }

    // Pattern 2: Backticks under Assigned Skills section
    const assignedSectionMatch = markdown.match(/##\s*3\.\s*Assigned Skills([\s\S]*?)(?:##\s*4|\n---|$)/i);
    if (assignedSectionMatch) {
      const sectionText = assignedSectionMatch[1];
      const backtickMatches = sectionText.matchAll(/`([a-z0-9_-]+)`/g);
      for (const bm of backtickMatches) {
        const val = bm[1];
        if (val.includes('-') && !val.endsWith('.md')) {
          skills.add(val);
        }
      }
    }

    return Array.from(skills);
  }
}

/**
 * PromptBuilder: Assembles high-signal, multi-layered structured prompts
 */
export class PromptBuilder {
  static buildPrompt({
    persona,
    prompt,
    upstreamContext = {},
    skills = {},
    brandName = 'STUDIO SYNTHETIX',
    targetIndustry = 'Autonomous AI Digital Products',
  }) {
    const sections = [];

    // 1. Agent Persona & Role Specification
    sections.push(`# AGENT IDENTITY & ROLE SPECIFICATION: ${persona.id} - ${persona.title || persona.id}`);
    sections.push(`Tier: ${persona.tier ?? 0}`);
    if (persona.reportsTo) sections.push(`Reports To: ${persona.reportsTo}`);
    if (persona.collaboratesWith) sections.push(`Collaborates With: ${persona.collaboratesWith}`);
    if (persona.archetype) sections.push(`Persona Archetype: ${persona.archetype}`);
    if (persona.tone) sections.push(`Tone & Demeanor: ${persona.tone}`);
    if (persona.philosophy) sections.push(`Core Philosophy: ${persona.philosophy}`);

    if (persona.inScope && persona.inScope.length > 0) {
      sections.push(`\n## STRICT IN-SCOPE RESPONSIBILITIES:\n${persona.inScope.map((s) => `- ${s}`).join('\n')}`);
    }

    if (persona.forbiddenScope && persona.forbiddenScope.length > 0) {
      sections.push(`\n## STRICTLY FORBIDDEN SCOPE (ZERO POLLUTION):\n${persona.forbiddenScope.map((s) => `- ${s}`).join('\n')}`);
    }

    // 2. Injected Skills
    const skillKeys = Object.keys(skills);
    if (skillKeys.length > 0) {
      sections.push(`\n## ASSIGNED SPECIALIZED SKILLS (${skillKeys.length} INJECTED GUIDELINES)`);
      for (const [sId, sContent] of Object.entries(skills)) {
        const trimmed = sContent.length > 500
          ? `${sContent.slice(0, 500).trim()}\n\n[... Guidelines continued ...]`
          : sContent.trim();
        sections.push(`\n### SKILL GUIDELINE: ${sId}\n\`\`\`markdown\n${trimmed}\n\`\`\``);
      }
    }

    // 3. Project Intake Brief
    sections.push(`\n## CLIENT VISION & PROJECT BRIEF`);
    sections.push(`Brand Name: ${brandName}`);
    sections.push(`Target Industry: ${targetIndustry}`);
    sections.push(`Intake Vision Prompt:\n"${prompt}"`);

    // 4. Upstream Artifact Context
    const upstreamKeys = Object.keys(upstreamContext);
    if (upstreamKeys.length > 0) {
      sections.push(`\n## UPSTREAM ARTIFACT CONTEXT (DEPENDENCIES)`);
      for (const [depId, depVal] of Object.entries(upstreamContext)) {
        if (!depVal) continue;
        const depData = depVal.data || depVal.artifacts || depVal;
        sections.push(`\n### Dependency [${depId}] Output:\n\`\`\`json\n${JSON.stringify(depData, null, 2)}\n\`\`\``);
      }
    }

    // 5. Output Requirements & Schema
    sections.push(`\n## MANDATORY OUTPUT CONTRACT (RAW JSON ONLY)`);
    sections.push(`CRITICAL INSTRUCTION: You MUST return a single, valid, well-formed JSON object.
Do NOT include preamble, markdown commentary, or explanations outside the JSON object.
The JSON object MUST follow this exact schema:

{
  "agentId": "${persona.id}",
  "status": "COMPLETED",
  "summary": "<1-2 sentence executive summary of actions performed and artifacts authored>",
  "artifacts": {
    "<primary_artifact_filename>.json": { ... }
  },
  "data": { ... }
}

Ensure all artifact files and domain properties meet the strict technical standards of your persona and skills.`);

    return sections.join('\n\n');
  }
}

/**
 * ResponseSanitizer: Safely strips reasoning tokens, markdown fences, and extracts JSON
 */
export class ResponseSanitizer {
  static parseAgentResponse(rawText) {
    return ResponseSanitizer.extractJsonFromText(rawText);
  }

  static extractJsonObject(rawText) {
    return ResponseSanitizer.extractJsonFromText(rawText);
  }

  static extractJsonFromText(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      throw new Error('Response is empty or not a string');
    }

    let cleaned = rawText.trim();

    // 1. Remove thinking / reasoning tags e.g. <thought>...</thought>, <think>...</think>
    cleaned = cleaned.replace(/<(?:thought|reasoning|thinking|think)>[\s\S]*?<\/(?:thought|reasoning|thinking|think)>/gi, '').trim();

    // 2. Extract from markdown code fences if present
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    // 3. Try direct JSON parse
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      // Continue to heuristic boundary scanning
    }

    // 4. Find outermost { and }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (_) {
        // Try repairing trailing commas and curly quotes
        const repaired = candidate
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/[\u201C\u201D]/g, '"');
        try {
          return JSON.parse(repaired);
        } catch (repairErr) {
          throw new Error(`Failed to parse extracted JSON block: ${repairErr.message}`);
        }
      }
    }

    throw new Error('No valid JSON object structure found in response text');
  }

  static sanitizeAgentOutput(parsed, expectedAgentId = null, fallbackContext = {}) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Parsed output is not a JSON object');
    }

    const agentId = parsed.agentId || expectedAgentId || 'UNKNOWN_AGENT';
    const status = parsed.status || 'COMPLETED';
    const summary = parsed.summary || `Completed atomic execution for ${agentId}`;
    let artifacts = parsed.artifacts;

    if (!artifacts || typeof artifacts !== 'object' || Array.isArray(artifacts)) {
      artifacts = {};
    }

    // Determine primary data
    let data = parsed.data;
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      // Pick first artifact that is an object
      for (const val of Object.values(artifacts)) {
        if (val && typeof val === 'object') {
          data = { ...val };
          break;
        }
      }
    }
    if (!data || typeof data !== 'object') {
      data = { ...parsed };
    }

    // Ensure brandName is resolved and assigned
    const brandName = fallbackContext.brandName || parsed.brandName || data.brandName;
    if (brandName) {
      data.brandName = brandName;
      for (const [fName, artVal] of Object.entries(artifacts)) {
        if (artVal && typeof artVal === 'object' && !artVal.brandName) {
          artVal.brandName = brandName;
        }
      }
    }

    // Ensure at least one primary artifact is present in artifacts
    if (Object.keys(artifacts).length === 0) {
      const primaryArtifact = fallbackContext.primaryArtifact || `${agentId.toLowerCase()}.json`;
      artifacts[primaryArtifact] = data;
    }

    return {
      agentId,
      status,
      summary,
      artifacts,
      data,
    };
  }
}

/**
 * Resolves the Antigravity CLI binary path using strict precedence:
 * 1. options.cliPath
 * 2. process.env.ANTIGRAVITY_CLI_PATH
 * 3. 'agy' found on PATH (scan process.env.PATH for agy, agy.exe, cli_*.exe)
 * 4. throw a clear Error naming ANTIGRAVITY_CLI_PATH as the thing to set.
 * Never falls back to a hardcoded user directory.
 *
 * @param {Object} [options={}]
 * @returns {string} Resolved CLI binary path
 */
export function resolveCliPath(options = {}) {
  // 1. options.cliPath
  if (options && options.cliPath && typeof options.cliPath === 'string' && options.cliPath.trim().length > 0) {
    return options.cliPath.trim();
  }

  // 2. process.env.ANTIGRAVITY_CLI_PATH
  if (process.env.ANTIGRAVITY_CLI_PATH && process.env.ANTIGRAVITY_CLI_PATH.trim().length > 0) {
    return process.env.ANTIGRAVITY_CLI_PATH.trim();
  }

  // 3. 'agy' found on PATH (scan process.env.PATH for agy, agy.exe, cli_*.exe)
  const pathEnv = process.env.PATH || '';
  const pathDirs = pathEnv.split(path.delimiter).filter(Boolean);

  const exactNames = process.platform === 'win32'
    ? ['agy.exe', 'agy.cmd', 'agy.bat', 'agy']
    : ['agy'];

  for (const dir of pathDirs) {
    // Check exact binary names first
    for (const name of exactNames) {
      const candidate = path.join(dir, name);
      try {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate;
        }
      } catch {
        // Skip inaccessible paths
      }
    }

    // Scan directory for cli_*.exe (Windows) or cli_* (POSIX)
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        const files = fs.readdirSync(dir);
        const cliMatch = files.find((file) => {
          if (process.platform === 'win32') {
            return /^cli_.*\.exe$/i.test(file);
          }
          return /^cli_[a-z0-9_]+$/i.test(file);
        });
        if (cliMatch) {
          const candidate = path.join(dir, cliMatch);
          if (fs.statSync(candidate).isFile()) {
            return candidate;
          }
        }
      }
    } catch {
      // Skip directory read errors (permissions, locked folders)
    }
  }

  // 4. throw a clear Error naming ANTIGRAVITY_CLI_PATH as the thing to set
  throw new Error(
    'Antigravity CLI binary not found. Please set the ANTIGRAVITY_CLI_PATH environment variable to the CLI executable or ensure "agy" is installed on your PATH.'
  );
}

/**
 * AgentRunner: Executes agent tasks via Antigravity CLI or synthetic fallback
 */
export class AgentRunner {
  static resolveCliPath = resolveCliPath;

  constructor(options = {}) {
    this.rootDir = options.rootDir || path.resolve(__dirname, '../../..');
    this.agencyDir = options.agencyDir || path.resolve(__dirname, '../..');
    this.agentsDir = path.join(this.agencyDir, 'agents');
    this.skillsDirs = [
      path.join(this.agencyDir, 'skills'),
      path.join(this.rootDir, '.agents', 'skills'),
      path.join(this.rootDir, 'skills'),
    ];
    this.artifactsDir = options.artifactsDir || path.join(this.agencyDir, 'workspace', 'artifacts');

    this.cliTimeoutMs = options.cliTimeoutMs || options.timeoutMs || 300000;
    this.timeoutMs = this.cliTimeoutMs;
    this.sanitizer = ResponseSanitizer;
    this.maxRetries = options.maxRetries ?? 2;
    this.effort = options.effort || process.env.ANTIGRAVITY_EFFORT || 'medium';
    this.executionMode = options.executionMode || 'cli';

    // Offline/mock execution is an explicit, opt-in mode. It is never a silent
    // fallback: every result from `_executeMock` is labelled `executionMode: 'mock'`
    // and `synthetic: true` so downstream consumers can refuse it in production.
    this.isMockMode =
      this.executionMode === 'test' ||
      this.executionMode === 'mock' ||
      this.executionMode === 'synthetic' ||
      options.allowMissingCli === true;

    // Optional deterministic backend used only by `_executeMock`. Receives
    // (agentId, prompt, upstreamContext) and returns the artifact object.
    this.mockArtifactFactory = typeof options.mockArtifactFactory === 'function'
      ? options.mockArtifactFactory
      : null;

    // Resolve CLI binary path according to strict priority order:
    // 1. options.cliPath -> 2. process.env.ANTIGRAVITY_CLI_PATH -> 3. 'agy' on PATH -> 4. throw naming ANTIGRAVITY_CLI_PATH
    try {
      this.cliPath = resolveCliPath(options);
      this._cliResolveError = null;
    } catch (err) {
      this.cliPath = null;
      this._cliResolveError = err;
      if (!this.isMockMode) {
        throw err;
      }
    }

    this.personas = new Map();
    this.skillLoader = new SkillLoader(this.skillsDirs);

    this._ensureDirectories();
    this._loadAllPersonas();
  }

  _ensureDirectories() {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  _loadAllPersonas() {
    if (!fs.existsSync(this.agentsDir)) return;

    const walkSync = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          walkSync(fullPath);
        } else if (file.name.endsWith('.md') || file.name.endsWith('.json')) {
          this._parseAndRegisterPersona(fullPath);
        }
      }
    };

    try {
      walkSync(this.agentsDir);
    } catch (_) {}
  }

  _parseAndRegisterPersona(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.basename(filePath);
      const ext = path.extname(filename);
      let id = filename.replace(ext, '');

      let title = id;
      let tier = 0;
      let reportsTo = null;
      let collaboratesWith = null;
      let archetype = null;
      let tone = null;
      let philosophy = null;
      let inScope = [];
      let forbiddenScope = [];
      let skills = [];

      if (ext === '.json') {
        const parsed = JSON.parse(content);
        id = parsed.id || id;
        title = parsed.title || id;
        tier = parsed.tier ?? 0;
        skills = parsed.skills || [];
        inScope = parsed.inScope || [];
        forbiddenScope = parsed.forbiddenScope || [];
      } else {
        const idMatch = content.match(/\*\*Agent ID\*\*:\s*`?([A-Za-z0-9_]+)`?/i) || content.match(/Agent ID:\s*`?([A-Za-z0-9_]+)`?/i);
        if (idMatch) id = idMatch[1].trim();

        const titleMatch = content.match(/\*\*Human Title\*\*:\s*([^\n\r]+)/i) || content.match(/Human Title:\s*([^\n\r]+)/i);
        if (titleMatch) title = titleMatch[1].trim();

        const tierMatch = content.match(/Tier\s*([0-9]+[A-Za-z]?)/i);
        if (tierMatch) {
          const num = parseInt(tierMatch[1], 10);
          if (!isNaN(num)) tier = num;
        }

        const repMatch = content.match(/\*\*Reports To\*\*:\s*([^\n\r]+)/i);
        if (repMatch) reportsTo = repMatch[1].trim();

        const colMatch = content.match(/\*\*Collaborates With\*\*:\s*([^\n\r]+)/i);
        if (colMatch) collaboratesWith = colMatch[1].trim();

        const archMatch = content.match(/\*\*Persona Archetype\*\*:\s*([^\n\r]+)/i);
        if (archMatch) archetype = archMatch[1].trim();

        const toneMatch = content.match(/\*\*Tone & Demeanor\*\*:\s*([^\n\r]+)/i);
        if (toneMatch) tone = toneMatch[1].trim();

        const philMatch = content.match(/\*\*Core Philosophy\*\*:\s*([^\n\r]+)/i);
        if (philMatch) philosophy = philMatch[1].trim();

        // Extract strict in-scope responsibilities
        const inScopeSection = content.match(/### Strict In-Scope Responsibilities([\s\S]*?)(?:### Strictly Forbidden Scope|## 5|\n---)/i);
        if (inScopeSection) {
          const lines = inScopeSection[1].split('\n');
          for (const line of lines) {
            const cleanLine = line.trim();
            const m = cleanLine.match(/^\d+\.\s*\*\*([^*]+)\*\*:\s*(.*)$/);
            if (m) {
              inScope.push(`${m[1]}: ${m[2]}`);
            } else if (cleanLine.startsWith('-')) {
              inScope.push(cleanLine.replace(/^-\s*/, '').trim());
            }
          }
        }

        // Extract strictly forbidden scope
        const forbiddenSection = content.match(/### Strictly Forbidden Scope[^\n]*([\s\S]*?)(?:## 5|\n---)/i);
        if (forbiddenSection) {
          const lines = forbiddenSection[1].split('\n');
          for (const line of lines) {
            const cleanLine = line.trim();
            const m = cleanLine.match(/^-\s*\*\*([^*]+)\*\*:\s*(.*)$/);
            if (m) {
              forbiddenScope.push(`${m[1]}: ${m[2]}`);
            } else if (cleanLine.startsWith('-')) {
              forbiddenScope.push(cleanLine.replace(/^-\s*/, '').trim());
            }
          }
        }

        // Extract skills via SkillLoader
        skills = this.skillLoader.extractSkillsFromMarkdown(content);
      }

      let frontmatterName = null;
      let primaryArtifact = null;
      if (ext === '.md') {
        const fmMatch = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
        if (fmMatch) {
          const nameMatch = fmMatch[1].match(/^name:\s*([^\r\n]+)/m);
          if (nameMatch) {
            frontmatterName = nameMatch[1].trim();
          }
        }
        const artMatch = content.match(/### Primary JSON Artifact:\s*`?([^\r\n`]+)`?/i) ||
                         content.match(/\*\*Primary JSON Artifact\*\*:\s*`?([^\r\n`]+)`?/i) ||
                         content.match(/Primary deliverable:\s*`?([^\r\n`]+)`?/i);
        if (artMatch) {
          primaryArtifact = path.basename(artMatch[1].trim());
        }
      }

      const canonicalId = frontmatterName || id;
      const personaObj = {
        id,
        canonicalId,
        frontmatterName: canonicalId,
        primaryArtifact: primaryArtifact || `${id.toLowerCase()}.json`,
        title,
        tier,
        reportsTo,
        supervisor: reportsTo,
        collaboratesWith,
        archetype,
        tone,
        philosophy,
        inScope,
        forbiddenScope,
        skills,
        rawContent: content,
        filePath,
      };

      // Register under primary ID
      this.personas.set(id, personaObj);

      // Register under file base name (e.g. A01_RequirementsScopeDirector)
      const fileBase = filename.replace(ext, '');
      if (fileBase && fileBase !== id) {
        this.personas.set(fileBase, personaObj);
      }

      // Also register under canonicalId / frontmatterName if different
      if (canonicalId && canonicalId !== id && canonicalId !== fileBase) {
        this.personas.set(canonicalId, personaObj);
      }

      // Legacy MAS 1.0 agent mapping to MAS 2.0 agent specifications
      const legacyAliasMap = {
        'A00': ['ChiefOrchestrator'],
        'A01': ['E01_BriefAnalyst', 'RequirementsScopeDirector'],
        'A12': ['UX_InfoArchitect', 'InfoArchitect'],
        'A20': ['CreativeResearchDirector'],
        'A22': ['CD_ArtDirector', 'CreativeArtDirector'],
        'A23': ['MO_MotionChoreographer', 'InteractionMotionDirector'],
        'A31': ['UXDesigner'],
        'A32': ['DS_TokenSpecifier', 'UIDesigner'],
        'A33': ['ST_BrandCopywriter', 'ContentConversionStrategist'],
        'A40': ['SA_TechArchitect', 'ChiefTechArchitect'],
        'A41': ['FrontendArchitect'],
        'A42': ['BackendArchitect'],
        'A51': ['ENG_ShellScaffolder', 'ENG_Navigation', 'AppShellEngineer'],
        'A53': ['ENG_FeatureBento', 'ENG_InteractiveShowcase', 'ENG_FooterConversion', 'ComponentLead'],
        'A54': ['ENG_HeroStage', 'SUB_MicroInteractions', 'SUB_ProceduralAssets', 'VisualExperienceEngineer'],
        'A60': ['A60_BackendSquad', 'BackendLead'],
        'A72': ['QA_DeviceGatekeeper', 'VisualResponsiveQA'],
        'A73': ['QA_AccessibilityAuditor', 'AccessibilityAuditor'],
        'A74': ['QA_PerformanceAuditor', 'PerformanceAuditor'],
        'A80': ['REL_ReleaseValidator', 'ReleaseRemediationDirector'],
      };

      const aliases = [
        ...(legacyAliasMap[id] || []),
        ...(canonicalId !== id ? (legacyAliasMap[canonicalId] || []) : []),
      ];
      for (const alias of aliases) {
        if (!this.personas.has(alias)) {
          this.personas.set(alias, { ...personaObj, id: alias, canonicalId, frontmatterName: canonicalId });
        }
      }
    } catch (_) {}
  }

  loadSkills(skillIds = []) {
    return this.skillLoader.loadSkills(skillIds);
  }

  getPersona(agentId, options = {}) {
    if (this.personas.has(agentId)) {
      return this.personas.get(agentId);
    }
    // Case-insensitive & partial slug matching
    for (const [key, p] of this.personas.entries()) {
      if (key.toLowerCase() === agentId.toLowerCase() || (p.id && p.id.toLowerCase() === agentId.toLowerCase())) {
        return p;
      }
    }
    if (options.fallback === true) {
      return {
        id: agentId,
        title: agentId,
        tier: 0,
        skills: [],
        inScope: [],
        forbiddenScope: [],
      };
    }
    throw new Error(`Agent definition not found for identifier: "${agentId}". Available agents: ${Array.from(this.personas.keys()).join(', ')}`);
  }

  /**
   * Delegate a specific task from a supervisor agent to a specialized subagent
   */
  async delegateTask(parentAgentId, subagentId, taskBrief, context = {}, progressCallback = null) {
    const parent = this.getPersona(parentAgentId);
    const subagent = this.getPersona(subagentId);

    const delegationPrompt = `[DELEGATED DIRECTIVE from ${parent.title} (${parent.id})]\n` +
      `Task: ${taskBrief}\n\n` +
      `Context: ${JSON.stringify(context.upstreamSummary || context.upstream || {})}`;

    const enrichedContext = {
      ...context,
      delegatedBy: {
        id: parent.id,
        title: parent.title,
      },
      reportingLine: `${subagent.id} -> ${parent.id}`,
    };

    if (progressCallback) {
      progressCallback(10, `[DELEGATION] ${parent.id} dispatching to ${subagent.id}: ${taskBrief.slice(0, 50)}...`);
    }

    const result = await this.executeAgent(subagent.id, delegationPrompt, enrichedContext, progressCallback);

    return {
      delegator: parent.id,
      assignee: subagent.id,
      reportingLine: `${subagent.id} -> ${parent.id}`,
      task: taskBrief,
      status: result.status || 'COMPLETED',
      result,
    };
  }

  /**
   * Nested multi-tier delegation: Top supervisor -> Mid lead -> Worker agent
   */
  async delegateNested(supervisorId, leadId, workerId, missionBrief, context = {}) {
    const supervisor = this.getPersona(supervisorId);
    const lead = this.getPersona(leadId);
    const worker = this.getPersona(workerId);

    // Step 1: Supervisor delegates strategy to Lead
    const leadTask = `Lead operational wave for: ${missionBrief}`;
    const leadResult = await this.delegateTask(supervisor.id, lead.id, leadTask, context);

    // Step 2: Lead delegates atomic execution to Worker
    const workerTask = `Execute concrete deliverable for: ${missionBrief}`;
    const workerResult = await this.delegateTask(lead.id, worker.id, workerTask, {
      ...context,
      leadPlan: leadResult.result?.data || {},
    });

    return {
      chain: [supervisor.id, lead.id, worker.id],
      hierarchyTrace: `${supervisor.id} (${supervisor.title}) -> ${lead.id} (${lead.title}) -> ${worker.id} (${worker.title})`,
      leadResult,
      workerResult,
      status: workerResult.status,
    };
  }

  /**
   * Department director wave delegation
   */
  async delegateDepartmentWave(directorId, prompt, context = {}, progressCallback = null) {
    const director = this.getPersona(directorId);
    const subagents = this.getSubagentsForSupervisor(directorId);

    const delegationResults = {};
    for (const sub of subagents) {
      const subResult = await this.delegateTask(
        director.id,
        sub.id,
        `Execute departmental deliverable for: ${prompt}`,
        context,
        progressCallback
      );
      delegationResults[sub.id] = subResult;
    }

    return {
      department: director.department || director.title,
      directorId: director.id,
      subagentsCount: subagents.length,
      delegationResults,
    };
  }

  getSubagentsForSupervisor(supervisorId) {
    const matches = [];
    const norm = supervisorId.toLowerCase();
    for (const [, p] of this.personas.entries()) {
      const sup = (p.reportsTo || p.supervisor || '').toLowerCase();
      if (sup && (sup.includes(norm) || (p.canonicalId && sup.includes(p.canonicalId.toLowerCase())))) {
        if (!matches.some((m) => m.id === p.id)) {
          matches.push(p);
        }
      }
    }
    return matches;
  }

  /**
   * Main agent execution entry point
   */
  async executeAgent(agentId, prompt, upstreamContext = {}, progressCallback = null) {
    const persona = this.getPersona(agentId);
    const skills = this.loadSkills(persona.skills);

    if (progressCallback) {
      progressCallback(10, `Loaded persona ${agentId} and ${Object.keys(skills).length} skills`);
    }

    if (!this.cliPath || !fs.existsSync(this.cliPath)) {
      if (this.isMockMode) {
        const mockResult = await this._executeMock(agentId, prompt, upstreamContext, persona, progressCallback);
        if (mockResult && mockResult.artifacts) {
          this._saveArtifacts(mockResult.artifacts);
        }
        return mockResult;
      }
      throw (this._cliResolveError || new Error(`Antigravity CLI binary not found at: ${this.cliPath}. Please set the ANTIGRAVITY_CLI_PATH environment variable to the CLI executable or ensure "agy" is installed on your PATH.`));
    }

    const result = await this._executeWithRealCli(agentId, prompt, upstreamContext, skills, persona, progressCallback);

    // Save primary artifacts to disk
    if (result && result.artifacts) {
      this._saveArtifacts(result.artifacts);
    }

    if (progressCallback) {
      progressCallback(100, `Agent ${agentId} execution finalized (${result.executionMode})`);
    }

    return result;
  }

  /**
   * Deterministic offline execution. Used ONLY when executionMode is explicitly
   * mock/test/synthetic (or allowMissingCli is true). Every result is labelled so
   * it can never be mistaken for a real model call.
   */
  async _executeMock(agentId, prompt, upstreamContext = {}, persona = {}, progressCallback = null) {
    const deliverable = (persona && persona.primaryArtifact) || `${String(agentId).toLowerCase()}.json`;

    let data = null;
    if (this.mockArtifactFactory) {
      data = await this.mockArtifactFactory(agentId, prompt, upstreamContext);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      data = {
        agent_id: agentId,
        brandName: this._extractBrandName(prompt),
        summary: `Deterministic offline placeholder for ${agentId}`,
        prompt_excerpt: String(prompt || '').slice(0, 200),
      };
    }

    data = { ...data, _execution_mode: 'mock', _mock: true, _mock_agent: agentId };

    if (progressCallback) {
      progressCallback(100, `[MOCK] ${agentId} produced ${deliverable} without invoking a model`);
    }

    return {
      agentId,
      status: 'COMPLETED',
      summary: `[MOCK] Deterministic offline artifact for ${agentId}`,
      artifacts: { [deliverable]: data },
      data,
      executionMode: 'mock',
      synthetic: true,
    };
  }

  /**
   * Execute with verified native Antigravity CLI binary
   */
  async _executeWithRealCli(agentId, prompt, upstreamContext, skills, persona, progressCallback) {
    const brandName = this._extractBrandName(prompt);
    const targetIndustry = this._detectIndustry(prompt);

    const basePrompt = PromptBuilder.buildPrompt({
      persona,
      prompt,
      upstreamContext,
      skills,
      brandName,
      targetIndustry,
    });

    let lastError = null;

    const targetAgentId = (persona?.frontmatterName || persona?.canonicalId || persona?.id || agentId || '').trim();

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        if (progressCallback) {
          progressCallback(25 * attempt, `Invoking Antigravity CLI for ${targetAgentId} (attempt ${attempt}/${this.maxRetries + 1})...`);
        }

        const currentPrompt = attempt === 1
          ? basePrompt
          : `${basePrompt}\n\nCRITICAL RETRY CORRECTION (Attempt ${attempt}): Your previous output failed JSON parsing: "${lastError?.message}". You MUST return ONLY a raw JSON object matching the required schema with zero markdown framing and zero introductory text.`;

        const cliResult = await this._invokeCliProcess(currentPrompt, {
          agentId: targetAgentId,
        });
        const extracted = ResponseSanitizer.extractJsonFromText(cliResult.responseText);
        const sanitized = ResponseSanitizer.sanitizeAgentOutput(extracted, agentId, {
          brandName,
          primaryArtifact: persona.primaryArtifact,
        });

        return {
          ...sanitized,
          executionMode: 'cli',
          synthetic: false,
          cliMetadata: {
            durationSeconds: cliResult.durationSeconds,
            usage: cliResult.usage,
            attempts: attempt,
          },
        };
      } catch (err) {
        lastError = err;
        if (attempt <= this.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error(`CLI execution failed for ${agentId} after ${this.maxRetries + 1} attempts`);
  }

  /**
   * Low-level process spawner with stdin piping and timeout protection
   */
  async _invokeCliProcess(prompt, options = {}) {
    const cliPath = options.cliPath || this.cliPath;
    const timeoutMs = options.timeoutMs || this.cliTimeoutMs;
    const agentId = (options.agentId || options.agent || '').trim();

    if (!fs.existsSync(cliPath)) {
      throw new Error(`Antigravity CLI binary not found at: ${cliPath}`);
    }

    return new Promise((resolve, reject) => {
      let isSettled = false;
      let finalPrompt = prompt;
      if (finalPrompt.length > 30000) {
        finalPrompt = finalPrompt.slice(0, 30000);
      }
      const effort = options.effort || this.effort || 'low';
      const args = [];
      if (agentId) {
        args.push('--agent', agentId);
      }
      args.push(
        '--output-format', 'json',
        '--dangerously-skip-permissions',
        '--effort', effort,
        '--disable-slash-commands',
        '--print', finalPrompt,
      );

      const proc = spawn(cliPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs,
        maxBuffer: 30 * 1024 * 1024,
        env: { ...process.env, PAGER: 'cat' },
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            if (process.platform === 'win32' && proc.pid) {
              spawn('taskkill', ['/pid', String(proc.pid), '/f', '/t']);
            } else {
              proc.kill('SIGTERM');
            }
          } catch (_) {}
          reject(new Error(`CLI execution timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      proc.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('error', (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          reject(new Error(`Failed to spawn Antigravity CLI: ${err.message}`));
        }
      });

      proc.on('close', (code) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);

          if (code !== 0) {
            try {
              const envelope = JSON.parse(stdout);
              if (envelope && envelope.status && envelope.status !== 'SUCCESS') {
                reject(new Error(`Antigravity CLI returned ${envelope.status}: ${envelope.error || envelope.message || 'Unknown CLI error'}`));
                return;
              }
            } catch (_) {}
            const outMsg = stderr.trim() || stdout.trim() || 'none';
            reject(new Error(`Antigravity CLI exited with code ${code}. Output: ${outMsg}`));
            return;
          }

          try {
            const envelope = JSON.parse(stdout);
            if (envelope && envelope.status && envelope.status !== 'SUCCESS') {
              reject(new Error(`Antigravity CLI returned ${envelope.status}: ${envelope.error || envelope.message || 'Unknown CLI error'}`));
              return;
            }
            resolve({
              rawStdout: stdout,
              wrapper: envelope,
              responseText: envelope.response || envelope.text || stdout,
              durationSeconds: envelope.duration_seconds || null,
              usage: envelope.usage || null,
            });
          } catch (err) {
            if (err.message && err.message.startsWith('Antigravity CLI returned')) {
              reject(err);
              return;
            }
            resolve({
              rawStdout: stdout,
              wrapper: null,
              responseText: stdout,
              durationSeconds: null,
              usage: null,
            });
          }
        }
      });

    });
  }

  /**
   * Save produced artifacts to workspace directory
   */
  _saveArtifacts(artifacts = {}) {
    for (const [filename, content] of Object.entries(artifacts)) {
      const outPath = path.join(this.artifactsDir, filename);
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      if (typeof content === 'object') {
        fs.writeFileSync(outPath, JSON.stringify(content, null, 2), 'utf8');
      } else {
        fs.writeFileSync(outPath, String(content), 'utf8');
      }
    }
  }

  /**
   * Backward-compatible alias for dispatching tasks
   */
  async _dispatchAgentTask(agentId, prompt, upstream, skills, progressCallback) {
    return this.executeAgent(agentId, prompt, upstream, progressCallback);
  }

  _extractBrandName(prompt) {
    if (!prompt) return 'ZADROW DIGITAL';
    const namedMatch = prompt.match(/named\s+["']?([A-Za-z0-9\s_-]+?)["']?(?:,|\.|\s+with|\s+featuring|$)/i) ||
      prompt.match(/called\s+["']?([A-Za-z0-9\s_-]+?)["']?(?:,|\.|\s+with|\s+featuring|$)/i) ||
      prompt.match(/brand\s+["']?([A-Za-z0-9\s_-]+?)["']?(?:,|\.|\s+with|\s+featuring|$)/i) ||
      prompt.match(/for\s+["']?([A-Za-z0-9\s_-]+?)["']?(?:,|\.|\s+featuring|\s+with|$)/i);

    if (namedMatch && namedMatch[1].trim().length > 1) {
      return this._cleanBrandName(namedMatch[1]);
    }
    return 'SYNTHETIX';
  }

  /**
   * Normalises a captured brand name: strips leading articles/possessives and
   * trailing generic nouns so a prompt like "a japanese concrete studio site"
   * yields "Japanese Concrete Studio" rather than "a japanese concrete studio".
   */
  _cleanBrandName(raw) {
    let name = String(raw || '').trim().replace(/[.,;:!?]+$/, '').trim();
    name = name.replace(/^(?:a|an|the)\s+/i, '').trim();
    name = name.replace(/['\u2019]s$/i, '').trim();
    name = name.replace(/\s+(?:web\s?site|web\s?app|site|landing\s+page|homepage|home\s+page|page)$/i, '').trim();
    return name.length > 1 ? name : 'SYNTHETIX';
  }

  _detectIndustry(prompt) {
    const p = (prompt || '').toLowerCase();
    if (p.includes('architecture') || p.includes('spatial')) return 'Generative AI Architecture & Spatial Design';
    if (p.includes('neuro') || p.includes('biotech') || p.includes('health')) return 'Neurotechnology & Human Augmentation';
    if (p.includes('fintech') || p.includes('crypto') || p.includes('defi')) return 'High-Frequency Decentralized Finance';
    if (p.includes('luxury') || p.includes('fashion')) return 'Haute Couture Digital Studio';
    if (p.includes('game') || p.includes('3d') || p.includes('interactive')) return 'Interactive Entertainment & Visual Computing';
    return 'Autonomous AI Digital Products';
  }

}
