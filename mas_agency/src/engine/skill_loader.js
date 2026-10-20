/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * Specialized Agent Skill Delivery Subsystem & Runtime Loader
 *
 * Responsibilities:
 * - Robust disk loading of SKILL.md across search paths (.agents/skills, mas_agency/skills, plugin root)
 * - Pure Node.js YAML frontmatter extraction & Markdown instruction body parsing
 * - Alias normalization & fuzzy resolution (e.g. react-best-practices -> vercel-react-best-practices)
 * - In-memory caching for zero-latency retrieval
 * - High-signal prompt formatting & instruction extraction for LLM injection
 * - Registry validation of agent skill assignments across the permanent agency hierarchy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SkillLoader {
  /**
   * @param {Object} options
   * @param {string} [options.rootDir] Root plugin directory
   * @param {string} [options.agencyDir] Agency root directory (mas_agency)
   * @param {string[]} [options.searchDirs] Custom search directories for skills
   * @param {Object} [options.customAliases] Additional skill aliases
   */
  constructor(options = {}) {
    this.rootDir = options.rootDir || path.resolve(__dirname, '../../..');
    this.agencyDir = options.agencyDir || path.resolve(__dirname, '../..');

    this.searchDirs = options.searchDirs || [
      path.join(this.rootDir, '.agents', 'skills'),
      path.join(this.agencyDir, 'skills'),
      path.join(this.agencyDir, '.agents', 'skills'),
      path.join(this.rootDir, 'skills'),
      this.rootDir,
    ];

    this.cache = new Map();
    this.warnings = [];
    this.aliasMap = this._initAliasMap(options.customAliases || {});
    this.hierarchyMapping = this._initHierarchyMapping();
  }

  /**
   * Initialize standard skill alias table
   */
  _initAliasMap(customAliases = {}) {
    return {
      // Vercel skill aliases
      'react-best-practices': 'vercel-react-best-practices',
      'react-best-practice': 'vercel-react-best-practices',
      'composition-patterns': 'vercel-composition-patterns',
      'react-composition-patterns': 'vercel-composition-patterns',
      'react-view-transitions': 'vercel-react-view-transitions',
      'view-transitions': 'vercel-react-view-transitions',
      'web-design': 'web-design-guidelines',
      'web-guidelines': 'web-design-guidelines',
      'writing': 'writing-guidelines',
      'prose-guidelines': 'writing-guidelines',

      // ZadRow Custom skills aliases
      'canvas-design': 'kinetic-canvas-hero',
      'kinetic-canvas': 'kinetic-canvas-hero',
      'canvas-hero': 'kinetic-canvas-hero',
      'motion-choreography': 'awwwards-motion-choreography',
      'awwwards-motion': 'awwwards-motion-choreography',
      'motion': 'awwwards-motion-choreography',
      'tokens-specifier': 'design-tokens-specifier',
      'design-tokens': 'design-tokens-specifier',
      'token-specifier': 'design-tokens-specifier',
      'accessibility-auditor': 'wcag-contrast-auditor',
      'contrast-auditor': 'wcag-contrast-auditor',
      'wcag-auditor': 'wcag-contrast-auditor',
      'wcag': 'wcag-contrast-auditor',
      'responsive-touch': 'responsive-touch-gatekeeper',
      'touch-gatekeeper': 'responsive-touch-gatekeeper',
      'device-gatekeeper': 'responsive-touch-gatekeeper',

      // UI/UX Pro Max aliases
      'ui-ux': 'ui-ux-pro-max',
      'uiux-pro-max': 'ui-ux-pro-max',
      'ui-ux-pro': 'ui-ux-pro-max',
      'styling': 'ui-styling',
      'tokens': 'design-system',

      // Superpowers aliases
      'parallel-agents': 'dispatching-parallel-agents',
      'code-review': 'requesting-code-review',
      'tdd': 'test-driven-development',
      'debugging': 'systematic-debugging',
      'subagent-development': 'subagent-driven-development',
      'subagents': 'subagent-driven-development',
      'verification': 'verification-before-completion',
      'plans': 'writing-plans',

      ...customAliases,
    };
  }

  /**
   * Permanent hierarchy mapping connecting the 19 agency operatives to their verified skills
   */
  _initHierarchyMapping() {
    return {
      // Tier 0: Executive Intake
      'E01_BriefAnalyst': [
        'writing-guidelines',
        'find-skills',
        'brainstorming',
      ],

      // Tier 1: Strategy & Creative Direction
      'CD_ArtDirector': [
        'web-design-guidelines',
        'writing-guidelines',
        'kinetic-canvas-hero',
        'algorithmic-art',
        'brand',
        'design',
      ],
      'UX_InfoArchitect': [
        'web-design-guidelines',
        'writing-guidelines',
        'ui-ux-pro-max',
      ],
      'ST_BrandCopywriter': [
        'writing-guidelines',
        'brand',
        'doc-coauthoring',
      ],

      // Tier 2: Architecture & Tokens
      'SA_TechArchitect': [
        'vercel-react-best-practices',
        'vercel-composition-patterns',
      ],
      'DS_TokenSpecifier': [
        'design-tokens-specifier',
        'web-design-guidelines',
        'design-system',
        'vercel-composition-patterns',
      ],
      'MO_MotionChoreographer': [
        'awwwards-motion-choreography',
        'vercel-react-view-transitions',
        'web-design-guidelines',
      ],

      // Tier 3: Core Scaffolding & Component Specialists
      'ENG_ShellScaffolder': [
        'vercel-composition-patterns',
        'vercel-react-best-practices',
        'vercel-react-view-transitions',
      ],
      'ENG_HeroStage': [
        'kinetic-canvas-hero',
        'awwwards-motion-choreography',
        'vercel-react-best-practices',
        'vercel-composition-patterns',
        'web-design-guidelines',
      ],
      'ENG_FeatureBento': [
        'vercel-composition-patterns',
        'vercel-react-best-practices',
        'web-design-guidelines',
      ],
      'ENG_InteractiveShowcase': [
        'awwwards-motion-choreography',
        'vercel-react-best-practices',
        'vercel-composition-patterns',
        'web-design-guidelines',
      ],
      'ENG_Navigation': [
        'web-design-guidelines',
        'vercel-react-best-practices',
        'vercel-composition-patterns',
      ],
      'ENG_FooterConversion': [
        'web-design-guidelines',
        'vercel-react-best-practices',
        'vercel-composition-patterns',
        'writing-guidelines',
      ],

      // Tier 4: Sub-Agents (Micro-Interactions & Procedural SVGs)
      'SUB_MicroInteractions': [
        'awwwards-motion-choreography',
        'vercel-react-best-practices',
        'web-design-guidelines',
      ],
      'SUB_ProceduralAssets': [
        'kinetic-canvas-hero',
        'algorithmic-art',
        'web-design-guidelines',
      ],

      // Tier 5: Quality Assurance & Governance
      'QA_AccessibilityAuditor': [
        'wcag-contrast-auditor',
        'web-design-guidelines',
      ],
      'QA_PerformanceAuditor': [
        'vercel-react-best-practices',
        'webapp-testing',
      ],
      'QA_DeviceGatekeeper': [
        'responsive-touch-gatekeeper',
        'web-design-guidelines',
      ],
      'REL_ReleaseValidator': [
        'vercel-react-best-practices',
        'verification-before-completion',
        'web-design-guidelines',
        'writing-guidelines',
      ],
    };
  }

  /**
   * Resolve an arbitrary skill identifier or path to its canonical skill name
   * @param {string} rawId
   * @returns {string}
   */
  resolveSkillId(rawId) {
    if (!rawId || typeof rawId !== 'string') return '';

    let clean = rawId.trim();

    // If a full path or markdown reference is passed (e.g. '.agents/skills/writing-guidelines/SKILL.md')
    clean = clean.replace(/\\/g, '/');
    if (clean.endsWith('.md')) {
      const parts = clean.split('/');
      // The skill directory is typically the parent folder of SKILL.md
      if (parts.length >= 2) {
        clean = parts[parts.length - 2];
      }
    } else if (clean.includes('/')) {
      const parts = clean.split('/').filter(Boolean);
      clean = parts[parts.length - 1];
    }

    clean = clean.toLowerCase();

    // Direct alias map lookup
    if (this.aliasMap[clean]) {
      return this.aliasMap[clean];
    }

    // Direct match against known skills if already loaded or on disk
    return clean;
  }

  /**
   * Pure Node.js YAML frontmatter parser and markdown instruction extractor
   * @param {string} content
   * @returns {{ frontmatter: Object, body: string }}
   */
  _parseFrontmatterAndBody(content) {
    if (!content || typeof content !== 'string') {
      return { frontmatter: {}, body: '' };
    }

    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = content.match(fmRegex);

    if (!match) {
      return { frontmatter: {}, body: content.trim() };
    }

    const rawYaml = match[1];
    const body = match[2].trim();
    const frontmatter = {};

    const lines = rawYaml.split(/\r?\n/);
    let currentKey = null;
    let isMultiLineString = false;
    let multiLineBuffer = [];

    const flushBuffer = () => {
      if (currentKey && isMultiLineString) {
        frontmatter[currentKey] = multiLineBuffer.join(' ').trim();
        multiLineBuffer = [];
        isMultiLineString = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check indentation for nested properties (e.g. under metadata:) or multiline strings
      const indentMatch = line.match(/^(\s+)(.*)$/);
      if (indentMatch) {
        const rest = indentMatch[2];
        const subKv = rest.match(/^([\w-]+):\s*(.*)$/);

        if (subKv && currentKey && typeof frontmatter[currentKey] === 'object' && !isMultiLineString) {
          let val = subKv[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          frontmatter[currentKey][subKv[1]] = val;
          continue;
        }

        if (isMultiLineString) {
          multiLineBuffer.push(rest.trim());
          continue;
        }
      }

      flushBuffer();

      const kv = trimmed.match(/^([\w-]+):\s*(.*)$/);
      if (kv) {
        const key = kv[1];
        let val = kv[2].trim();

        if (val === '' || val === '>' || val === '|') {
          // Check if subsequent lines have sub-keys (object) or text lines (multiline string)
          let isNestedObject = false;
          for (let j = i + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            if (!nextTrimmed) continue;
            if (lines[j].match(/^\s+[\w-]+:\s*/)) {
              isNestedObject = true;
            }
            break;
          }

          if (isNestedObject) {
            frontmatter[key] = {};
            currentKey = key;
          } else {
            currentKey = key;
            isMultiLineString = true;
            multiLineBuffer = [];
          }
        } else {
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          frontmatter[key] = val;
          currentKey = key;
        }
      }
    }

    flushBuffer();

    return { frontmatter, body };
  }

  /**
   * Detect provenance category for a skill
   * @param {string} skillId
   * @returns {string}
   */
  _detectCategory(skillId) {
    const categories = {
      Anthropic: [
        'skill-creator',
        'doc-coauthoring',
        'algorithmic-art',
        'webapp-testing',
        'mcp-builder',
        'frontend-design',
      ],
      Vercel: [
        'find-skills',
        'web-design-guidelines',
        'vercel-react-best-practices',
        'vercel-composition-patterns',
        'vercel-react-view-transitions',
        'writing-guidelines',
      ],
      'UI/UX Pro Max': [
        'ui-ux-pro-max',
        'banner-design',
        'brand',
        'design',
        'design-system',
        'slides',
        'ui-styling',
      ],
      Superpowers: [
        'brainstorming',
        'writing-plans',
        'dispatching-parallel-agents',
        'subagent-driven-development',
        'test-driven-development',
        'systematic-debugging',
        'requesting-code-review',
        'verification-before-completion',
      ],
      Custom: [
        'awwwards-motion-choreography',
        'design-tokens-specifier',
        'kinetic-canvas-hero',
        'responsive-touch-gatekeeper',
        'wcag-contrast-auditor',
      ],
    };

    for (const [category, list] of Object.entries(categories)) {
      if (list.includes(skillId)) return category;
    }
    return 'Custom';
  }

  /**
   * Locate the physical file path for a skill
   * @param {string} canonicalId
   * @returns {string|null}
   */
  _findSkillFile(canonicalId) {
    // 1. Direct path check if an absolute or relative path was passed
    if (path.isAbsolute(canonicalId) && fs.existsSync(canonicalId)) {
      return canonicalId;
    }

    // 2. Search through searchDirs
    for (const baseDir of this.searchDirs) {
      if (!fs.existsSync(baseDir)) continue;

      const candidates = [
        path.join(baseDir, canonicalId, 'SKILL.md'),
        path.join(baseDir, canonicalId, 'AGENTS.md'),
        path.join(baseDir, canonicalId, 'README.md'),
        path.join(baseDir, `${canonicalId}.md`),
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          return cand;
        }
      }
    }

    // 3. Fallback: Check if prefix 'vercel-' matches
    if (!canonicalId.startsWith('vercel-')) {
      const vercelPrefixed = `vercel-${canonicalId}`;
      for (const baseDir of this.searchDirs) {
        const cand = path.join(baseDir, vercelPrefixed, 'SKILL.md');
        if (fs.existsSync(cand)) return cand;
      }
    }

    return null;
  }

  /**
   * Load and parse a skill by its identifier or alias
   * @param {string} skillId
   * @returns {Object|null} Parsed skill or null if not found
   */
  loadSkill(skillId) {
    if (!skillId) return null;

    const canonicalId = this.resolveSkillId(skillId);

    // Memory cache hit
    if (this.cache.has(canonicalId)) {
      return this.cache.get(canonicalId);
    }

    const filePath = this._findSkillFile(canonicalId);
    if (!filePath) {
      const warning = `[SkillLoader] Warning: Skill "${skillId}" (resolved: "${canonicalId}") could not be located in search paths.`;
      this.warnings.push(warning);
      return null;
    }

    try {
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const { frontmatter, body } = this._parseFrontmatterAndBody(rawContent);
      const category = this._detectCategory(canonicalId);
      const stat = fs.statSync(filePath);

      // Extract a high-level summary (first 1-2 paragraphs of body or frontmatter description)
      let summaryText = frontmatter.description || '';
      if (!summaryText && body) {
        const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim() && !p.startsWith('#'));
        summaryText = paragraphs[0] ? paragraphs[0].trim() : '';
      }

      const skillRecord = {
        id: canonicalId,
        requestedId: skillId,
        name: frontmatter.name || canonicalId,
        description: frontmatter.description || '',
        license: frontmatter.license || 'Proprietary / MIT',
        metadata: frontmatter.metadata || {},
        frontmatter,
        body,
        instructions: body,
        rawContent,
        category,
        filePath,
        byteSize: stat.size,
        summary: summaryText,
        loadedAt: new Date().toISOString(),
      };

      // Store in memory cache
      this.cache.set(canonicalId, skillRecord);
      if (canonicalId !== skillId) {
        this.cache.set(skillId, skillRecord);
      }

      return skillRecord;
    } catch (err) {
      const errorMsg = `[SkillLoader] Error reading skill at ${filePath}: ${err.message}`;
      this.warnings.push(errorMsg);
      return null;
    }
  }

  /**
   * Load all assigned skills for a specific agent
   * @param {string} agentId Agent Identifier (e.g. 'E01_BriefAnalyst', 'SA_TechArchitect')
   * @param {string[]} [skillIds] Optional explicit list of skill IDs. If omitted, uses hierarchy mapping.
   * @returns {Object} { agentId, skills: Object, skillsList: Array, missing: Array, promptBlock: string, count: number }
   */
  loadSkillsForAgent(agentId, skillIds = null) {
    let targetSkillIds = skillIds;

    if (!targetSkillIds || !Array.isArray(targetSkillIds) || targetSkillIds.length === 0) {
      targetSkillIds = this.hierarchyMapping[agentId] || [];

      // If still empty, check disk for agent markdown file in mas_agency/agents
      if (targetSkillIds.length === 0) {
        targetSkillIds = this._discoverSkillsFromAgentFile(agentId);
      }
    }

    const loadedSkills = {};
    const skillsList = [];
    const missing = [];

    for (const rawSkillId of targetSkillIds) {
      const skill = this.loadSkill(rawSkillId);
      if (skill) {
        loadedSkills[skill.id] = skill;
        if (!skillsList.some((s) => s.id === skill.id)) {
          skillsList.push(skill);
        }
      } else {
        missing.push(rawSkillId);
      }
    }

    const promptBlock = this.formatSkillPrompt(skillsList);

    return {
      agentId,
      skills: loadedSkills,
      skillsList,
      missing,
      promptBlock,
      count: skillsList.length,
    };
  }

  /**
   * Scans agent specification files in mas_agency/agents to parse assigned skills
   * @param {string} agentId
   * @returns {string[]}
   */
  _discoverSkillsFromAgentFile(agentId) {
    const agentsDir = path.join(this.agencyDir, 'agents');
    if (!fs.existsSync(agentsDir)) return [];

    let foundSkills = [];
    const walkSync = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkSync(fullPath);
        } else if (entry.name.replace(/\.[^/.]+$/, '') === agentId) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const matches = content.matchAll(/skills\/([a-z0-9-]+)\/SKILL\.md/gi);
          for (const m of matches) {
            if (!foundSkills.includes(m[1])) {
              foundSkills.push(m[1]);
            }
          }
        }
      }
    };

    try {
      walkSync(agentsDir);
    } catch {
      // Ignore directory walk issues
    }
    return foundSkills;
  }

  /**
   * Return a concise structured summary of a skill
   * @param {string} skillId
   * @returns {Object}
   */
  getSkillSummary(skillId) {
    const skill = this.loadSkill(skillId);
    if (!skill) {
      return {
        id: skillId,
        valid: false,
        error: `Skill "${skillId}" could not be resolved or found.`,
      };
    }

    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      license: skill.license,
      metadata: skill.metadata,
      size: skill.byteSize,
      filePath: skill.filePath,
      summary: skill.summary,
      valid: true,
    };
  }

  /**
   * Format loaded skills into an optimized markdown prompt block for model injection
   * @param {Array<Object>} skills Array of loaded Skill objects
   * @param {Object} [options] Formatting options
   * @param {boolean} [options.concise=false] If true, strips repetitive prose/examples
   * @param {number} [options.maxCharsPerSkill=8000] Maximum character budget per skill
   * @returns {string}
   */
  formatSkillPrompt(skills = [], options = {}) {
    if (!skills || skills.length === 0) return '';

    const concise = options.concise || false;
    const maxChars = options.maxCharsPerSkill || 8000;

    const sections = [
      '# ==============================================================================#',
      '# OPERATIONAL AGENT SPECIALIST SKILLS & ARCHITECTURAL DIRECTIVES                 #',
      '# ==============================================================================#',
      '',
    ];

    for (const skill of skills) {
      sections.push(`## SPECIALIST SKILL: ${skill.name}`);
      if (skill.description) {
        sections.push(`> **Skill Purpose**: ${skill.description}`);
      }
      sections.push(`- **Skill ID**: \`${skill.id}\` | **Category**: ${skill.category}`);
      sections.push('');

      let bodyToInject = skill.body;
      if (concise && bodyToInject.length > maxChars) {
        // Strip large code examples or trim to maxChars
        bodyToInject = bodyToInject.slice(0, maxChars) + '\n\n[... Skill directives condensed for prompt budget ...]';
      }

      sections.push(bodyToInject);
      sections.push('');
      sections.push('---');
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Validate all skill assignments for every agent in an agency registry
   * @param {Array|Object|null} registry
   * @returns {Object} Detailed validation summary
   */
  validateSkillAssignments(registry = null) {
    const report = {
      valid: true,
      totalAgents: 0,
      totalSkillAssignments: 0,
      validAssignments: 0,
      missingAssignments: [],
      warnings: [],
      agentDetails: {},
    };

    let agentMap = {};

    if (!registry) {
      // Use standard hierarchy mapping
      agentMap = { ...this.hierarchyMapping };
    } else if (Array.isArray(registry)) {
      // Array of agent definition objects: [{ id, name, skills: [...] }]
      for (const def of registry) {
        const id = def.id;
        const skills = def.skills || this.hierarchyMapping[id] || [];
        agentMap[id] = skills;
      }
    } else if (typeof registry === 'object') {
      agentMap = registry;
    }

    const agentIds = Object.keys(agentMap);
    report.totalAgents = agentIds.length;

    for (const agentId of agentIds) {
      const rawSkills = agentMap[agentId] || [];
      const resolvedList = [];
      const errors = [];
      let agentValid = true;

      for (const rawSkill of rawSkills) {
        report.totalSkillAssignments++;
        const skill = this.loadSkill(rawSkill);

        if (skill) {
          report.validAssignments++;
          resolvedList.push(skill.id);
        } else {
          agentValid = false;
          report.valid = false;
          const issue = {
            agentId,
            skillId: rawSkill,
            reason: `Skill "${rawSkill}" could not be resolved from any configured search directory.`,
          };
          report.missingAssignments.push(issue);
          errors.push(issue.reason);
        }
      }

      report.agentDetails[agentId] = {
        assigned: rawSkills,
        resolved: resolvedList,
        valid: agentValid,
        errors,
      };
    }

    report.warnings = [...this.warnings];
    return report;
  }

  /**
   * Alias for listAllAvailableSkills()
   * @returns {Array<Object>}
   */
  discoverSkills() {
    return this.listAllAvailableSkills();
  }

  /**
   * Enumerate all 32 physical skills available in the environment
   * @returns {Array<Object>} List of all discovered skills with metadata
   */
  listAllAvailableSkills() {
    const discovered = new Map();

    for (const baseDir of this.searchDirs) {
      if (!fs.existsSync(baseDir)) continue;

      let subdirs = [];
      try {
        subdirs = fs.readdirSync(baseDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const dirent of subdirs) {
        if (!dirent.isDirectory()) continue;
        const skillId = dirent.name;
        if (discovered.has(skillId)) continue;

        const skillFile = path.join(baseDir, skillId, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          const loaded = this.loadSkill(skillId);
          if (loaded) {
            discovered.set(skillId, {
              id: loaded.id,
              name: loaded.name,
              category: loaded.category,
              description: loaded.description,
              filePath: loaded.filePath,
              size: loaded.byteSize,
            });
          }
        }
      }
    }

    return Array.from(discovered.values());
  }

  /**
   * Clear in-memory skill cache
   */
  clearCache() {
    this.cache.clear();
    this.warnings = [];
  }
}

export default SkillLoader;
