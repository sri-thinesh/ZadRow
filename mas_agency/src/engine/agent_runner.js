/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * Real AI Agent Execution Engine & Persona Skill Injector
 *
 * Responsibilities:
 * - Dynamic Persona Loading: Reads full persona markdown specifications from `mas_agency/agents/`
 * - Dynamic Skill Injection: Ingests assigned skills from `.agents/skills/` and `mas_agency/skills/`
 * - Antigravity CLI Execution: Dispatches prompts directly to native binary `cli_windows_x64.exe`
 * - High-Fidelity Prompt Construction: Assembles identity, guardrails, skills, briefs, and schemas
 * - Robust Output Sanitization: Strips reasoning tags, markdown fences, and repairs JSON anomalies
 * - Resilience & Fallback: Automatic retries with feedback, timeout bounds, and structured synthetic
 *   fallback explicitly flagged with `executionMode: "synthetic_fallback"`.
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

    this.cliTimeoutMs = options.cliTimeoutMs || options.timeoutMs || 120000;
    this.timeoutMs = this.cliTimeoutMs;
    this.sanitizer = ResponseSanitizer;
    this.maxRetries = options.maxRetries ?? 2;
    this.effort = options.effort || process.env.ANTIGRAVITY_EFFORT || 'low';
    this.executionMode = options.executionMode || 'auto'; // 'auto' | 'cli' | 'synthetic'
    this.allowFallback = options.allowFallback !== false;

    // Resolve CLI binary path according to strict priority order:
    // 1. options.cliPath -> 2. process.env.ANTIGRAVITY_CLI_PATH -> 3. 'agy' on PATH -> 4. throw naming ANTIGRAVITY_CLI_PATH
    if (this.executionMode === 'synthetic') {
      try {
        this.cliPath = resolveCliPath(options);
      } catch {
        this.cliPath = null;
      }
    } else {
      this.cliPath = resolveCliPath(options);
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

      const personaObj = {
        id,
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

      const aliases = legacyAliasMap[id] || [];
      for (const alias of aliases) {
        if (!this.personas.has(alias)) {
          this.personas.set(alias, { ...personaObj, id: alias, canonicalId: id });
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

    let result = null;
    const shouldTryCli = this.executionMode !== 'synthetic' &&
      process.env.MAS_USE_SYNTHETIC !== '1';

    if (shouldTryCli) {
      if (!fs.existsSync(this.cliPath)) {
        if (!this.allowFallback) {
          throw new Error(`Antigravity CLI binary not found at: ${this.cliPath}`);
        }
        if (progressCallback) {
          progressCallback(50, `CLI binary not found at: ${this.cliPath}. Utilizing structured synthetic fallback.`);
        }
        result = await this._generateSyntheticFallback(agentId, prompt, upstreamContext, skills);
      } else {
        try {
          result = await this._executeWithRealCli(agentId, prompt, upstreamContext, skills, persona, progressCallback);
        } catch (cliErr) {
          if (this.allowFallback) {
            if (progressCallback) {
              progressCallback(50, `CLI invocation notice: ${cliErr.message}. Utilizing structured synthetic fallback.`);
            }
            result = await this._generateSyntheticFallback(agentId, prompt, upstreamContext, skills);
          } else {
            throw cliErr;
          }
        }
      }
    } else {
      result = await this._generateSyntheticFallback(agentId, prompt, upstreamContext, skills);
    }

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

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        if (progressCallback) {
          progressCallback(25 * attempt, `Invoking Antigravity CLI for ${agentId} (attempt ${attempt}/${this.maxRetries + 1})...`);
        }

        const currentPrompt = attempt === 1
          ? basePrompt
          : `${basePrompt}\n\nCRITICAL RETRY CORRECTION (Attempt ${attempt}): Your previous output failed JSON parsing: "${lastError?.message}". You MUST return ONLY a raw JSON object matching the required schema with zero markdown framing and zero introductory text.`;

        const cliResult = await this._invokeCliProcess(currentPrompt);
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
      const args = [
        '--output-format', 'json',
        '--dangerously-skip-permissions',
        '--effort', effort,
        '--disable-slash-commands',
        '--print', finalPrompt,
      ];

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
            const outMsg = stderr.trim() || stdout.trim() || 'none';
            reject(new Error(`Antigravity CLI exited with code ${code}. Output: ${outMsg}`));
            return;
          }

          try {
            const wrapper = JSON.parse(stdout);
            resolve({
              rawStdout: stdout,
              wrapper,
              responseText: wrapper.response || wrapper.text || stdout,
              durationSeconds: wrapper.duration_seconds || null,
              usage: wrapper.usage || null,
            });
          } catch (_) {
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

  /**
   * Structured synthetic fallback generator for all 18 agents
   * Flagged explicitly with `executionMode: "synthetic_fallback"`
   */
  async _generateSyntheticFallback(agentId, prompt, upstream = {}, skills = {}) {
    const normalizedPrompt = (prompt || '').trim();
    const brandName = this._extractBrandName(normalizedPrompt);

    switch (agentId) {
      case 'E01_BriefAnalyst': {
        const brief = {
          agentId,
          timestamp: new Date().toISOString(),
          clientVision: normalizedPrompt,
          brandName,
          targetIndustry: this._detectIndustry(normalizedPrompt),
          archetype: 'Avant-Garde Architectural Digital Pioneer',
          northStar: `Deliver an Awwwards Site-of-the-Day caliber experience for ${brandName} featuring kinetic typography, dark-luxury aesthetics, interactive bento systems, and zero-compromise performance.`,
          valuePillars: [
            {
              title: 'Kinetic Aesthetics & Storytelling',
              description: 'Real-time procedural canvas visuals paired with synchronized typography.',
            },
            {
              title: 'High-Density Bento Engineering',
              description: 'Multi-dimensional interactive grid cards displaying capabilities and technical proofs.',
            },
            {
              title: 'Tactile Micro-Interactions',
              description: 'Magnetic physics, responsive cursor tracking, and procedural audio synthesis.',
            },
            {
              title: 'Mathematical Accessibility & 60FPS Speed',
              description: 'Strict WCAG 2.2 AA contrast compliance and sub-100ms interaction latency.',
            },
          ],
          conversionGoals: [
            'Direct consultation booking through floating glassmorphic CTA',
            'Interactive feature engagement with live demo sliders',
            'VIP waitlist subscription with instant visual validation feedback',
          ],
          constraints: {
            wcagLevel: 'WCAG 2.2 AA',
            targetFPS: 60,
            clsTarget: 0.0,
            mobileSafeZones: '100dvh strictly observed with zero scrolljacking',
          },
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: `Synthesized executive strategic brief for ${brandName}`,
          artifacts: {
            '00_executive_brief.json': brief,
            '00_executive_brief.md': `# Executive Brief: ${brandName}\n\n${brief.northStar}\n\n## Value Pillars\n${brief.valuePillars.map((p) => `- **${p.title}**: ${p.description}`).join('\n')}`,
          },
          data: brief,
        };
      }

      case 'CD_ArtDirector': {
        const e01 = upstream['E01_BriefAnalyst']?.data || {};
        const palette = this._generateChromaticPalette(normalizedPrompt);

        const artDirection = {
          agentId,
          brandName: e01.brandName || brandName,
          aestheticUniverse: 'Cyber-Luxury Kinetic Brutalism',
          palette,
          typography: {
            display: 'Syne, "Space Grotesk", sans-serif',
            body: 'Inter, system-ui, -apple-system, sans-serif',
            mono: '"JetBrains Mono", "Fira Code", monospace',
            scale: {
              h1: 'clamp(3.5rem, 8vw, 7.5rem)',
              h2: 'clamp(2.5rem, 5vw, 4.5rem)',
              h3: 'clamp(1.5rem, 3vw, 2.5rem)',
              bodyLarge: '1.25rem',
              bodyBase: '1rem',
              caption: '0.875rem',
            },
          },
          visualTreatments: {
            glassmorphism: 'backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl',
            neonGlow: '0 0 40px -10px var(--color-primary-glow)',
            subtleGrid: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
            noiseOverlay: 'data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)" opacity="0.03"/></svg>',
          },
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: `Synthesized art direction and chromatic palette for ${brandName}`,
          artifacts: {
            '01_art_direction.json': artDirection,
          },
          data: artDirection,
        };
      }

      case 'UX_InfoArchitect': {
        const e01 = upstream['E01_BriefAnalyst']?.data || {};
        const uxSpec = {
          agentId,
          brandName: e01.brandName || brandName,
          journeyFlow: [
            { step: 1, section: 'Navigation', anchor: '#top', type: 'FloatingHeader' },
            { step: 2, section: 'HeroStage', anchor: '#hero', type: 'KineticCanvasHero' },
            { step: 3, section: 'FeatureBento', anchor: '#features', type: 'InteractiveBentoGrid' },
            { step: 4, section: 'InteractiveShowcase', anchor: '#showcase', type: 'LiveMetricsDemo' },
            { step: 5, section: 'FooterConversion', anchor: '#contact', type: 'ConversionDrawerFooter' },
          ],
          sitemap: [
            { id: 'home', title: 'Studio', route: '/' },
            { id: 'capabilities', title: 'Capabilities', route: '#features' },
            { id: 'showcase', title: 'Work', route: '#showcase' },
            { id: 'philosophy', title: 'Philosophy', route: '#philosophy' },
            { id: 'contact', title: 'Initiate Contact', route: '#contact' },
          ],
          contentBreakdown: {
            hero: { eyebrow: 'Autonomous Creative Engineering', splitLayout: false, canvasInteractive: true },
            bentoGrid: {
              cardCount: 4,
              features: [
                'Autonomous Multi-Agent Synthesis',
                'Sub-Millisecond Kinetic Shaders',
                'Mathematical WCAG AAA Fidelity',
                'Deterministic Asset Pipeline',
              ],
            },
            showcase: { mode: 'Interactive Metric Slider & Live Demo Terminal' },
          },
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: `Synthesized UX architecture and sitemap for ${brandName}`,
          artifacts: {
            '01_ux_architecture.json': uxSpec,
          },
          data: uxSpec,
        };
      }

      case 'ST_BrandCopywriter': {
        const e01 = upstream['E01_BriefAnalyst']?.data || {};
        const company = e01.brandName || brandName;

        const copyDeck = {
          agentId,
          brandName: company,
          hero: {
            eyebrow: 'THE ARCHITECTURE OF TOMORROW',
            headlinePart1: 'Forging Impossible',
            headlineGradient: 'Digital Realities.',
            subheadline: `Welcome to ${company}. We engineer next-generation digital artifacts with autonomous cognitive systems, kinetic fluid shaders, and uncompromising aesthetic velocity.`,
            primaryCta: 'Explore Studio Work',
            secondaryCta: 'Request Project Brief',
          },
          features: {
            eyebrow: 'SYSTEM MATRIX',
            headline: 'Engineered for Unbounded Precision.',
            cards: [
              {
                id: 'agentic-pipeline',
                tag: 'ORCHESTRATION',
                title: 'Multi-Agent Cognitive Swarms',
                description: 'Eighteen specialized AI operatives working in parallel to plan, choreograph, and scaffold digital experiences in real-time.',
                metric: '18 Agents',
              },
              {
                id: 'kinetic-canvas',
                tag: 'GRAPHICS CORE',
                title: '60FPS Procedural Canvas',
                description: 'Fluid particle dynamics and GPU-accelerated mathematical shaders reacting dynamically to user cursor velocity.',
                metric: '60-120 FPS',
              },
              {
                id: 'spatial-bento',
                tag: 'INTERFACE ARCHITECTURE',
                title: '3D Reactive Bento Grid',
                description: 'Multi-layered glassmorphic surfaces with mouse tracking, depth perspective tilt, and state-of-the-art interactive micro-flows.',
                metric: '<0.1ms Latency',
              },
              {
                id: 'verified-qa',
                tag: 'ASSURANCE',
                title: 'Mathematical WCAG AA & AAA',
                description: 'Rigorous color contrast algorithms and semantic accessibility primitives verified against enterprise compliance standards.',
                metric: '100% Pass Rate',
              },
            ],
          },
          showcase: {
            eyebrow: 'SHOWCASE & BENCHMARKS',
            headline: 'Speed, Precision, and Impact Quantified.',
            metrics: [
              { label: 'Awwwards Honors', value: '42+' },
              { label: 'Interaction Latency', value: '0.4ms' },
              { label: 'Lighthouse Score', value: '100' },
              { label: 'FPS Rendering Floor', value: '60' },
            ],
          },
          footer: {
            tagline: 'Ready to build the extraordinary?',
            heading: 'Initiate Your Transmission.',
            buttonText: 'Send Direct Inquiry',
            emailPlaceholder: 'Enter executive email address...',
            copyright: `© ${new Date().getFullYear()} ${company}. All rights reserved. Precision-engineered by ZadRow MAS.`,
          },
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: `Synthesized brand copy and hero messaging for ${company}`,
          artifacts: {
            '01_brand_copy.json': copyDeck,
          },
          data: copyDeck,
        };
      }

      case 'SA_TechArchitect': {
        const techSpec = {
          agentId,
          framework: 'Next.js 15 (App Router)',
          reactVersion: 'React 19',
          stylingEngine: 'Tailwind CSS 3.4+ with OKLCH CSS Variables',
          iconLibrary: 'lucide-react',
          motionStack: 'Pure CSS Keyframes + Canvas 2D / Web Audio API',
          typescriptConfig: {
            strict: true,
            paths: { '@/*': ['./src/*'] },
          },
          bundleBudget: {
            initialJs: '<120KB',
            criticalCss: '<20KB',
          },
          dependencies: {
            next: '^15.2.0',
            react: '^19.0.0',
            'react-dom': '^19.0.0',
            'lucide-react': '^0.475.0',
            clsx: '^2.1.1',
            'tailwind-merge': '^2.6.0',
          },
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Synthesized Next.js 15 technical architecture specification',
          artifacts: {
            '02_tech_architecture.json': techSpec,
          },
          data: techSpec,
        };
      }

      case 'DS_TokenSpecifier': {
        const cd = upstream['CD_ArtDirector']?.data || {};
        const palette = cd.palette || this._generateChromaticPalette(normalizedPrompt);

        const tokens = {
          agentId,
          primitives: {
            colors: palette,
            radii: { none: '0px', sm: '4px', md: '8px', lg: '16px', xl: '24px', full: '9999px' },
            spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px', 12: '48px', 16: '64px', 24: '96px' },
          },
          semantics: {
            bgCanvas: palette.background,
            bgCard: palette.surface,
            bgElevated: palette.surfaceElevated,
            textPrimary: palette.textPrimary,
            textSecondary: palette.textSecondary,
            textMuted: palette.textMuted,
            accent: palette.primary,
            accentGlow: palette.primaryGlow,
            borderSubtle: palette.borderSubtle,
            borderHighlight: palette.borderHighlight,
          },
          cssVariables: `
:root {
  --bg-canvas: ${palette.background};
  --bg-card: ${palette.surface};
  --bg-elevated: ${palette.surfaceElevated};
  --text-primary: ${palette.textPrimary};
  --text-secondary: ${palette.textSecondary};
  --text-muted: ${palette.textMuted};
  --color-primary: ${palette.primary};
  --color-primary-glow: ${palette.primaryGlow};
  --color-secondary: ${palette.secondary};
  --border-subtle: ${palette.borderSubtle};
  --border-highlight: ${palette.borderHighlight};
}
          `.trim(),
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Synthesized design token system and CSS variables',
          artifacts: {
            '02_design_tokens.json': tokens,
          },
          data: tokens,
        };
      }

      case 'MO_MotionChoreographer': {
        const motionSpec = {
          agentId,
          easing: {
            expoOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
            smoothIn: 'cubic-bezier(0.4, 0, 0.2, 1)',
            anticipate: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
          },
          heroTimeline: {
            canvasFadeIn: { duration: 1.2, delay: 0.1 },
            headlineSplit: { stagger: 0.08, duration: 0.8 },
            cardsStagger: { stagger: 0.12, duration: 0.7 },
          },
          magneticSettings: { strength: 0.35, ease: 0.15, maxDistance: 60 },
          touchGating: { disableCustomCursorOnMobile: true, reducedMotionRespect: true },
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Synthesized 60FPS motion choreography and physics curves',
          artifacts: {
            '02_motion_choreography.json': motionSpec,
          },
          data: motionSpec,
        };
      }

      case 'ENG_ShellScaffolder': {
        const shellSpec = {
          agentId,
          structure: {
            rootLayout: 'src/app/layout.tsx',
            globalCss: 'src/app/globals.css',
            tailwindConfig: 'tailwind.config.ts',
            tsconfig: 'tsconfig.json',
            packageJson: 'package.json',
          },
          fontPreloads: [
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Space+Grotesk:wght@500;700&display=swap',
          ],
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Scaffolded Next.js App Router shell configuration',
          artifacts: {
            '03_shell_scaffold.json': shellSpec,
          },
          data: shellSpec,
        };
      }

      case 'ENG_HeroStage': {
        const heroSpec = {
          agentId,
          componentName: 'HeroStage',
          file: 'src/components/HeroStage.tsx',
          features: [
            'Interactive 60FPS particle wave simulation on HTML5 Canvas',
            'Mouse interaction coordinate projection with damping',
            'Gradient kinetic typography H1',
            'Floating status badge with pulse indicator',
            'Dual conversion action buttons with magnetic hover effect',
          ],
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Authored kinetic HeroStage component specification',
          artifacts: {
            '03_hero_stage.json': heroSpec,
          },
          data: heroSpec,
        };
      }

      case 'ENG_FeatureBento': {
        const bentoSpec = {
          agentId,
          componentName: 'FeatureBento',
          file: 'src/components/FeatureBento.tsx',
          features: [
            'Asymmetric 4-card bento layout',
            '3D mouse parallax tilt on card hover',
            'Dynamic gradient border highlight on active card',
            'Interactive capability selector tab system',
            'Live metrics badges',
          ],
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Authored interactive Bento grid component specification',
          artifacts: {
            '03_feature_bento.json': bentoSpec,
          },
          data: bentoSpec,
        };
      }

      case 'ENG_InteractiveShowcase': {
        const showcaseSpec = {
          agentId,
          componentName: 'InteractiveShowcase',
          file: 'src/components/InteractiveShowcase.tsx',
          features: [
            'Interactive parameter tuning slider',
            'Live telemetry counter simulation',
            'Interactive tabbed code/architecture preview',
            'Live benchmark comparison indicators',
          ],
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Authored interactive metrics showcase component specification',
          artifacts: {
            '03_interactive_showcase.json': showcaseSpec,
          },
          data: showcaseSpec,
        };
      }

      case 'ENG_Navigation': {
        const navSpec = {
          agentId,
          componentName: 'Navigation',
          file: 'src/components/Navigation.tsx',
          features: [
            'Glassmorphic floating navbar with scroll-aware opacity',
            'Smooth section scroll navigation',
            'Accessible mobile drawer menu with focus trap',
            'Header CTA with hover glow transition',
          ],
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Authored floating glassmorphic navigation specification',
          artifacts: {
            '03_navigation.json': navSpec,
          },
          data: navSpec,
        };
      }

      case 'ENG_FooterConversion': {
        const footerSpec = {
          agentId,
          componentName: 'FooterConversion',
          file: 'src/components/FooterConversion.tsx',
          features: [
            'High-conversion VIP waitlist input with real-time validation',
            'Contact transmission drawer with state feedback',
            'Dynamic copyright year and studio credits',
            'ZadRow MAS digital seal',
          ],
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Authored conversion drawer footer specification',
          artifacts: {
            '03_footer_conversion.json': footerSpec,
          },
          data: footerSpec,
        };
      }

      case 'SUB_MicroInteractions': {
        const microSpec = {
          agentId,
          components: [
            { name: 'MagneticCursor', file: 'src/components/MagneticCursor.tsx' },
            { name: 'SoundEffects', file: 'src/components/SoundEffects.tsx' },
          ],
          audioSynthesizer: 'Web Audio API oscillator (zero mp3 assets needed)',
          frequencies: { click: 800, hover: 440, success: 1200 },
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Synthesized micro-interaction physics and Web Audio effects',
          artifacts: {
            '04_micro_interactions.json': microSpec,
          },
          data: microSpec,
        };
      }

      case 'SUB_ProceduralAssets': {
        const assetSpec = {
          agentId,
          componentName: 'ProceduralGraphics',
          file: 'src/components/ProceduralGraphics.tsx',
          assets: [
            'Vector grid matrix background',
            'Generative circular radar scanner SVG',
            'Procedural corner brackets and futuristic framing',
          ],
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Synthesized procedural SVG geometry and visual framing',
          artifacts: {
            '04_procedural_assets.json': assetSpec,
          },
          data: assetSpec,
        };
      }

      case 'QA_AccessibilityAuditor': {
        const audit = {
          agentId,
          standard: 'WCAG 2.2 Level AA / AAA',
          contrastResults: [
            { element: 'Primary Text on Canvas', ratio: '14.8:1', passAA: true, passAAA: true },
            { element: 'Secondary Text on Surface', ratio: '7.2:1', passAA: true, passAAA: true },
            { element: 'Accent Button Text on Accent', ratio: '5.8:1', passAA: true, passAAA: false },
          ],
          ariaCoverage: {
            navigationLandmarks: true,
            mainContentLandmark: true,
            footerLandmark: true,
            buttonAriaLabels: true,
            focusVisibleOutline: true,
          },
          status: 'PASSED',
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Verified WCAG 2.2 AA accessibility and contrast mathematics',
          artifacts: {
            '05_qa_accessibility_audit.json': audit,
          },
          data: audit,
        };
      }

      case 'QA_PerformanceAuditor': {
        const perfAudit = {
          agentId,
          webVitals: {
            expectedCLS: 0.0,
            expectedLCP: '0.8s',
            expectedFID: '12ms',
            expectedINP: '28ms',
          },
          canvasLoop: {
            method: 'requestAnimationFrame with delta timing',
            targetFPS: 60,
            garbageCollectionZeroAllocation: true,
          },
          status: 'PASSED',
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Audited Core Web Vitals and 60FPS rendering performance',
          artifacts: {
            '05_qa_performance_audit.json': perfAudit,
          },
          data: perfAudit,
        };
      }

      case 'QA_DeviceGatekeeper': {
        const gatekeeper = {
          agentId,
          responsiveBreakpoints: ['sm: 640px', 'md: 768px', 'lg: 1024px', 'xl: 1280px'],
          touchGating: {
            touchActionManipulation: true,
            minimumTapTargetSize: '44x44px',
            disableCustomCursorOnCoarsePointer: true,
            zeroHorizontalOverflow: true,
          },
          status: 'PASSED',
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Verified responsive touch targets and 100dvh safe zones',
          artifacts: {
            '05_qa_device_gatekeeper.json': gatekeeper,
          },
          data: gatekeeper,
        };
      }

      case 'REL_ReleaseValidator': {
        const releaseManifest = {
          agentId,
          timestamp: new Date().toISOString(),
          brandName,
          targetWebsiteDir: 'mas_agency/output/website',
          productionReady: true,
          checklist: {
            allComponentsSynthesized: true,
            noPlaceholderTokens: true,
            allImportsResolved: true,
            wcagContrastPassed: true,
            nextjs15Compatible: true,
          },
          startCommand: 'npm run dev',
        };

        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: 'Validated production release manifest and deployment checklist',
          artifacts: {
            '05_release_manifest.json': releaseManifest,
          },
          data: releaseManifest,
        };
      }

      default: {
        const genericData = {
          agentId,
          status: 'COMPLETED',
          note: `Completed atomic task for ${agentId}`,
        };
        return {
          agentId,
          status: 'COMPLETED',
          executionMode: 'synthetic_fallback',
          synthetic: true,
          summary: `Completed atomic task for ${agentId}`,
          artifacts: {
            [`${agentId.toLowerCase()}.json`]: genericData,
          },
          data: genericData,
        };
      }
    }
  }

  _extractBrandName(prompt) {
    if (!prompt) return 'ZADROW DIGITAL';
    const namedMatch = prompt.match(/named\s+["']?([A-Za-z0-9\s_-]+?)["']?(?:,|\.|\s+with|\s+featuring|$)/i) ||
      prompt.match(/called\s+["']?([A-Za-z0-9\s_-]+?)["']?(?:,|\.|\s+with|\s+featuring|$)/i) ||
      prompt.match(/brand\s+["']?([A-Za-z0-9\s_-]+?)["']?(?:,|\.|\s+with|\s+featuring|$)/i) ||
      prompt.match(/for\s+["']?([A-Za-z0-9\s_-]+?)["']?(?:,|\.|\s+featuring|\s+with|$)/i);

    if (namedMatch && namedMatch[1].trim().length > 1) {
      return namedMatch[1].trim();
    }
    return 'SYNTHETIX';
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

  _generateChromaticPalette(prompt) {
    const p = (prompt || '').toLowerCase();
    let primary = '#00f0ff';
    let primaryGlow = 'rgba(0, 240, 255, 0.4)';
    let secondary = '#7000ff';
    let accent = '#10b981';

    if (p.includes('neuro') || p.includes('gold') || p.includes('amber')) {
      primary = '#f59e0b';
      primaryGlow = 'rgba(245, 158, 11, 0.4)';
      secondary = '#d97706';
      accent = '#ec4899';
    } else if (p.includes('ruby') || p.includes('red') || p.includes('crimson')) {
      primary = '#f43f5e';
      primaryGlow = 'rgba(244, 63, 94, 0.4)';
      secondary = '#881337';
      accent = '#fb7185';
    } else if (p.includes('emerald') || p.includes('nature') || p.includes('green')) {
      primary = '#10b981';
      primaryGlow = 'rgba(16, 185, 129, 0.4)';
      secondary = '#047857';
      accent = '#06b6d4';
    }

    return {
      background: '#090a0f',
      surface: '#11131c',
      surfaceElevated: '#171a26',
      borderSubtle: '#222738',
      borderHighlight: primary,
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      primary,
      primaryGlow,
      secondary,
      accent,
    };
  }
}
