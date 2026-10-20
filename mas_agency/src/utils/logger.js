/**
 * AURA Multi-Agent Digital Studio (MAS 2.0)
 * Visual Terminal Logger & Formatting Utilities
 */

export const Colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright foreground
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

export function stripAnsi(str) {
  return typeof str === 'string' ? str.replace(/\x1b\[[0-9;]*m/g, '') : '';
}

export function timestamp() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${Colors.gray}[${h}:${m}:${s}.${ms}]${Colors.reset}`;
}

export const Badges = {
  PENDING: `${Colors.gray}[PENDING]${Colors.reset}`,
  RUNNING: `${Colors.brightCyan}${Colors.bold}[RUNNING]${Colors.reset}`,
  COMPLETED: `${Colors.brightGreen}${Colors.bold}[COMPLETED]${Colors.reset}`,
  FAILED: `${Colors.brightRed}${Colors.bold}[FAILED]${Colors.reset}`,
  SKIPPED: `${Colors.yellow}[SKIPPED]${Colors.reset}`,
  INFO: `${Colors.cyan}[INFO]${Colors.reset}`,
  WARN: `${Colors.brightYellow}[WARN]${Colors.reset}`,
  ERROR: `${Colors.brightRed}[ERROR]${Colors.reset}`,
  TIER: `${Colors.brightMagenta}[TIER]${Colors.reset}`,
  ARTIFACT: `${Colors.brightCyan}[ARTIFACT]${Colors.reset}`,
  QA_PASS: `${Colors.brightGreen}[QA PASS]${Colors.reset}`,
  QA_WARN: `${Colors.brightYellow}[QA WARN]${Colors.reset}`,
  QA_FAIL: `${Colors.brightRed}[QA FAIL]${Colors.reset}`,
  GATE_PASS: `${Colors.brightGreen}[GATE PASS]${Colors.reset}`,
  GATE_FAIL: `${Colors.brightRed}[GATE FAIL]${Colors.reset}`,
};

export class Logger {
  static info(message, ...args) {
    console.log(`${timestamp()} ${Badges.INFO} ${message}`, ...args);
  }

  static warn(message, ...args) {
    console.warn(`${timestamp()} ${Badges.WARN} ${Colors.yellow}${message}${Colors.reset}`, ...args);
  }

  static error(message, ...args) {
    console.error(`${timestamp()} ${Badges.ERROR} ${Colors.brightRed}${message}${Colors.reset}`, ...args);
  }

  static success(message, ...args) {
    console.log(`${timestamp()} ${Badges.COMPLETED} ${Colors.brightGreen}${message}${Colors.reset}`, ...args);
  }

  static tier(tierName, description = '') {
    const width = 76;
    const line = '═'.repeat(width);
    console.log(`\n${Colors.brightMagenta}╔${line}╗${Colors.reset}`);
    const titleText = ` TIER ${tierName.toUpperCase()} `;
    const paddingLeft = Math.max(0, Math.floor((width - titleText.length) / 2));
    const paddingRight = Math.max(0, width - titleText.length - paddingLeft);
    console.log(`${Colors.brightMagenta}║${' '.repeat(paddingLeft)}${Colors.bold}${titleText}${Colors.reset}${Colors.brightMagenta}${' '.repeat(paddingRight)}║${Colors.reset}`);
    if (description) {
      const descPadding = Math.max(0, width - description.length - 2);
      console.log(`${Colors.brightMagenta}║ ${Colors.dim}${description}${' '.repeat(descPadding)}${Colors.reset}${Colors.brightMagenta}║${Colors.reset}`);
    }
    console.log(`${Colors.brightMagenta}╚${line}╝${Colors.reset}\n`);
  }

  static banner() {
    const bannerText = `
${Colors.brightCyan}  ███████╗ █████╗ ██████╗ ██████╗  ██████╗ ██╗    ██╗
  ╚══███╔╝██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██║    ██║
    ███╔╝ ███████║██║  ██║██████╔╝██║   ██║██║ █╗ ██║
   ███╔╝  ██╔══██║██║  ██║██╔══██╗██║   ██║██║███╗██║
  ███████╗██║  ██║██████╔╝██║  ██║╚██████╔╝╚███╔███╔╝
  ╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ${Colors.reset}
  ${Colors.dim}ZadRow Autonomous Digital Studio (MAS 2.0) — Next.js 15 & React 19${Colors.reset}
`;
    console.log(bannerText);
  }

  static agentCard(agent) {
    const width = 74;
    const border = '─'.repeat(width);
    const id = agent.id.padEnd(24);
    const role = (agent.title || agent.role || '').padEnd(30);
    const status = agent.status || 'PENDING';
    const statusBadge = Badges[status] || `[${status}]`;
    console.log(`${Colors.gray}  ┌${border}┐${Colors.reset}`);
    console.log(`  │ ${Colors.bold}${Colors.brightWhite}${id}${Colors.reset} │ ${Colors.cyan}${role}${Colors.reset} │ ${statusBadge} │`);
    console.log(`${Colors.gray}  └${border}┘${Colors.reset}`);
  }

  static summaryTable(nodes) {
    console.log(`\n${Colors.bold}${Colors.brightWhite}═══ EXECUTION SUMMARY TIMELINE ═══${Colors.reset}\n`);
    const colId = 24;
    const colTier = 8;
    const colStatus = 12;
    const colDuration = 10;
    const colArtifact = 22;

    const header = [
      'AGENT ID'.padEnd(colId),
      'TIER'.padEnd(colTier),
      'STATUS'.padEnd(colStatus),
      'DURATION'.padEnd(colDuration),
      'PRIMARY ARTIFACT'.padEnd(colArtifact),
    ].join(' | ');

    const divider = '-'.repeat(header.length);
    console.log(Colors.dim + divider + Colors.reset);
    console.log(Colors.bold + header + Colors.reset);
    console.log(Colors.dim + divider + Colors.reset);

    let totalDurationMs = 0;

    for (const node of nodes) {
      const dur = node.durationMs != null ? `${node.durationMs}ms` : '-';
      if (node.durationMs) totalDurationMs += node.durationMs;
      const statusColor = node.status === 'COMPLETED' ? Colors.brightGreen : (node.status === 'FAILED' ? Colors.brightRed : Colors.gray);
      const row = [
        (node.id || '').padEnd(colId),
        (String(node.tier ?? '-')).padEnd(colTier),
        `${statusColor}${(node.status || 'PENDING').padEnd(colStatus)}${Colors.reset}`,
        dur.padEnd(colDuration),
        (node.primaryArtifact || (node.artifacts && node.artifacts[0]) || '-').padEnd(colArtifact),
      ].join(' | ');
      console.log(row);
    }
    console.log(Colors.dim + divider + Colors.reset);
    console.log(`${Colors.bold}Cumulative Agent Workload Time: ${Colors.brightCyan}${(totalDurationMs / 1000).toFixed(2)}s${Colors.reset}\n`);
  }
}
