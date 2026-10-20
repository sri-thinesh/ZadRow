/**
 * ZadRow Multi-Agent Digital Studio (MAS 2.0)
 * High-Performance DAG (Directed Acyclic Graph) Execution Engine
 *
 * Supports:
 * - Dynamic parallel branch execution
 * - Sequential barrier synchronization
 * - Topological dependency resolution and cycle detection
 * - Upstream artifact passing and contract isolation
 * - Real-time EventEmitter telemetry and phase hooks
 * - Configurable concurrency limiting and retry backoff
 */

import { EventEmitter } from 'events';

export class DAGNode {
  constructor({
    id,
    name,
    tier = 0,
    dependsOn = [],
    execute,
    primaryArtifact = null,
    metadata = {},
    condition = null,
    runIfSkipped = false,
  }) {
    if (!id) throw new Error('DAGNode requires an id');
    if (typeof execute !== 'function') throw new Error(`DAGNode "${id}" requires an execute function`);

    this.id = id;
    this.name = name || id;
    this.tier = tier;
    this.dependsOn = Array.isArray(dependsOn) ? [...dependsOn] : [];
    this.execute = execute;
    this.primaryArtifact = primaryArtifact;
    this.metadata = metadata;
    this.condition = condition;
    this.runIfSkipped = Boolean(runIfSkipped);

    // Runtime state
    this.status = 'PENDING'; // PENDING | QUEUED | RUNNING | COMPLETED | FAILED | SKIPPED
    this.skipReason = null;
    this.startTime = null;
    this.endTime = null;
    this.durationMs = null;
    this.result = null;
    this.error = null;
    this.attempts = 0;
  }
}

export class DAGRunner extends EventEmitter {
  constructor(options = {}) {
    super();
    this.nodes = new Map();
    this.maxConcurrency = options.maxConcurrency || 6;
    this.maxRetries = options.maxRetries ?? 1;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.failFast = options.failFast ?? false;
    this.context = {
      shared: {},
      artifacts: {},
      outputs: {},
      ...(options.initialContext || {}),
    };
  }

  /**
   * Register a node in the DAG
   */
  addNode(nodeConfig) {
    const node = nodeConfig instanceof DAGNode ? nodeConfig : new DAGNode(nodeConfig);
    if (this.nodes.has(node.id)) {
      throw new Error(`Node with ID "${node.id}" already exists in DAG`);
    }
    this.nodes.set(node.id, node);
    return this;
  }

  /**
   * Validate the graph structure:
   * 1. All dependsOn IDs must exist
   * 2. No cycles (topological sort check)
   */
  validate() {
    // 1. Dependency existence check
    for (const [id, node] of this.nodes) {
      for (const depId of node.dependsOn) {
        if (!this.nodes.has(depId)) {
          throw new Error(`DAG Validation Error: Node "${id}" depends on unknown node "${depId}"`);
        }
      }
    }

    // 2. Cycle detection via Kahn's Algorithm
    const inDegree = new Map();
    const adj = new Map();

    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
      adj.set(id, []);
    }

    for (const [id, node] of this.nodes) {
      for (const depId of node.dependsOn) {
        adj.get(depId).push(id);
        inDegree.set(id, inDegree.get(id) + 1);
      }
    }

    const queue = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    let visitedCount = 0;
    const sortedOrder = [];

    while (queue.length > 0) {
      const curr = queue.shift();
      sortedOrder.push(curr);
      visitedCount++;

      for (const neighbor of adj.get(curr)) {
        inDegree.set(neighbor, inDegree.get(neighbor) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (visitedCount !== this.nodes.size) {
      const cycleNodes = [];
      for (const [id, deg] of inDegree) {
        if (deg > 0) cycleNodes.push(id);
      }
      throw new Error(`DAG Validation Error: Cycle detected among nodes: [${cycleNodes.join(', ')}]`);
    }

    return sortedOrder;
  }

  /**
   * Get sorted unique tiers in the DAG
   */
  getTiers() {
    const tiers = new Set();
    for (const node of this.nodes.values()) {
      tiers.add(node.tier);
    }
    return Array.from(tiers).sort((a, b) => a - b);
  }

  /**
   * Execute the DAG with parallel branches and barrier joins
   */
  async run() {
    const sortedOrder = this.validate();
    const startTime = Date.now();
    const totalNodes = this.nodes.size;
    const tiers = this.getTiers();

    this.emit('dag:start', { totalNodes, tiers, sortedOrder });

    // Node state tracking
    const completed = new Set();
    const failed = new Set();
    const skipped = new Set();
    const running = new Set();
    const inFlightPromises = new Map();

    const buildExecutionContext = (node) => {
      const upstreamArtifacts = {};
      for (const depId of node.dependsOn) {
        upstreamArtifacts[depId] = this.context.outputs[depId] || null;
      }
      return {
        ...this.context,
        nodeId: node.id,
        tier: node.tier,
        upstream: upstreamArtifacts,
        emitProgress: (progress, message) => {
          this.emit('node:progress', { node, progress, message });
        },
      };
    };

    // Check if node is ready to evaluate (all dependencies completed or skipped)
    const isReady = (node) => {
      if (node.status !== 'PENDING') return false;
      return node.dependsOn.every((depId) => completed.has(depId) || skipped.has(depId));
    };

    // Check if node has blocked dependencies (any dependency failed)
    const hasFailedDependency = (node) => {
      return node.dependsOn.some((depId) => failed.has(depId));
    };

    // Check if node has any skipped dependencies
    const hasSkippedDependency = (node) => {
      return node.dependsOn.some((depId) => skipped.has(depId));
    };

    // Main execution loop
    while (completed.size + failed.size + skipped.size < totalNodes) {
      // 1. Mark any nodes with failed dependencies as SKIPPED
      for (const node of this.nodes.values()) {
        if (node.status === 'PENDING' && hasFailedDependency(node)) {
          node.status = 'SKIPPED';
          node.skipReason = `Dependencies failed: ${node.dependsOn.filter((d) => failed.has(d)).join(', ')}`;
          failed.add(node.id);
          this.emit('node:skipped', {
            node,
            reason: node.skipReason,
          });
        }
      }

      // 2. Find all currently ready candidates
      const readyCandidates = Array.from(this.nodes.values()).filter(isReady);

      // Process conditional activation & skipped upstream dependencies
      const readyNodes = [];
      for (const node of readyCandidates) {
        // If an upstream dependency was skipped and runIfSkipped is false
        if (hasSkippedDependency(node) && !node.runIfSkipped) {
          node.status = 'SKIPPED';
          node.skipReason = `Upstream dependency skipped: ${node.dependsOn.filter((d) => skipped.has(d)).join(', ')}`;
          skipped.add(node.id);
          this.context.outputs[node.id] = {
            agentId: node.id,
            status: 'SKIPPED',
            skipped: true,
            reason: node.skipReason,
          };
          this.emit('node:skipped', {
            node,
            reason: node.skipReason,
          });
          continue;
        }

        // If node has dynamic condition predicate
        if (typeof node.condition === 'function') {
          const executionContext = buildExecutionContext(node);
          let conditionPassed = false;
          try {
            conditionPassed = await Promise.resolve(node.condition(executionContext));
          } catch (condErr) {
            conditionPassed = false;
          }

          if (!conditionPassed) {
            node.status = 'SKIPPED';
            node.skipReason = 'Dynamic activation condition returned false';
            skipped.add(node.id);
            this.context.outputs[node.id] = {
              agentId: node.id,
              status: 'SKIPPED',
              skipped: true,
              reason: node.skipReason,
            };
            this.emit('node:skipped', {
              node,
              reason: node.skipReason,
            });
            continue;
          }
        }

        readyNodes.push(node);
      }

      // If no nodes are running and none are ready, break
      if (readyNodes.length === 0 && running.size === 0) {
        break;
      }

      // 3. Launch ready nodes up to maxConcurrency limit
      while (readyNodes.length > 0 && running.size < this.maxConcurrency) {
        const node = readyNodes.shift();
        node.status = 'RUNNING';
        running.add(node.id);

        this.emit('node:start', { node });

        const taskPromise = this._executeNodeWithRetries(node, buildExecutionContext(node))
          .then((result) => {
            node.status = 'COMPLETED';
            node.result = result;
            completed.add(node.id);
            running.delete(node.id);
            inFlightPromises.delete(node.id);

            // Store in shared context
            this.context.outputs[node.id] = result;
            if (result && result.artifacts) {
              this.context.artifacts[node.id] = result.artifacts;
            }

            this.emit('node:complete', {
              node,
              durationMs: node.durationMs,
              result,
            });
          })
          .catch((error) => {
            node.status = 'FAILED';
            node.error = error;
            failed.add(node.id);
            running.delete(node.id);
            inFlightPromises.delete(node.id);

            this.emit('node:fail', {
              node,
              error,
              attempts: node.attempts,
            });

            if (this.failFast) {
              throw error;
            }
          });

        inFlightPromises.set(node.id, taskPromise);
      }

      // 4. Wait for at least one running task to complete
      if (inFlightPromises.size > 0) {
        await Promise.race(Array.from(inFlightPromises.values()));
      }
    }

    const durationMs = Date.now() - startTime;
    const summary = {
      total: totalNodes,
      completed: completed.size,
      failed: failed.size,
      skipped: skipped.size,
      durationMs,
      nodes: Array.from(this.nodes.values()),
    };

    if (failed.size > 0 && this.failFast) {
      this.emit('dag:fail', { summary, durationMs });
      throw new Error(`DAG execution aborted with ${failed.size} failed node(s).`);
    }

    this.emit('dag:complete', { summary, durationMs });
    return summary;
  }

  /**
   * Internal execution with retry backoff
   */
  async _executeNodeWithRetries(node, executionContext = null) {
    node.startTime = Date.now();
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      node.attempts = attempt;
      try {
        const ctx = executionContext || {
          ...this.context,
          nodeId: node.id,
          tier: node.tier,
          upstream: Object.fromEntries(
            node.dependsOn.map((depId) => [depId, this.context.outputs[depId] || null])
          ),
          emitProgress: (progress, message) => {
            this.emit('node:progress', { node, progress, message });
          },
        };

        const result = await node.execute(ctx);
        node.endTime = Date.now();
        node.durationMs = node.endTime - node.startTime;
        return result;
      } catch (err) {
        lastError = err;
        if (attempt <= this.maxRetries) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          this.emit('node:retry', { node, attempt, delayMs: delay, error: err });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    node.endTime = Date.now();
    node.durationMs = node.endTime - node.startTime;
    throw lastError;
  }
}
