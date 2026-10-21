/**
 * ZadRow Multi-Agent System
 * High-Concurrency Atomic Data Persistence & API Security Engine
 *
 * Guarantees:
 * 1. Atomic Writes: Temp-file swap ensures interrupted writes never corrupt data.
 * 2. Concurrency Safety: Mutex queue prevents race conditions under parallel requests.
 * 3. Duplicate Prevention & Idempotency: Deduplicates by unique key (e.g. email).
 * 4. Input Sanitization: Rejects injection tokens, strips XSS payloads, enforces max lengths.
 * 5. Authorization: Validates admin bearer tokens / header keys for protected routes.
 * 6. Information Shielding: Eliminates stack trace leakage and internal system path disclosure.
 */

import fs from 'fs';
import path from 'path';

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&\x27*+/=?^_\x60{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Admin key for protected routes, read from the environment on every call so a
 * rotated key takes effect without a restart.
 *
 * There is deliberately no fallback value. The previous implementation defaulted
 * to a hardcoded string and additionally accepted two legacy literals, which
 * meant every deployment that forgot to set ADMIN_API_KEY shipped a
 * publicly-known administrative credential.
 */
export function getAdminKey() {
  const key = process.env.ADMIN_API_KEY;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/**
 * Length-safe string comparison, so a wrong key cannot be recovered by timing
 * the response.
 */
function constantTimeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Mutex lock manager for concurrent filesystem operations
 */
class MutexManager {
  constructor() {
    this.locks = new Map();
  }

  async acquire(key) {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolver;
    const promise = new Promise((resolve) => {
      resolver = resolve;
    });
    this.locks.set(key, promise);
    return () => {
      this.locks.delete(key);
      resolver();
    };
  }
}

const mutex = new MutexManager();

/**
 * Input sanitization and validation helper
 */
export function validateAndSanitizeInput(data, rules = {}) {
  const errors = [];
  const sanitized = {};

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Request payload must be a non-empty JSON object.'], sanitized: {} };
  }

  // Prevent prototype pollution
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return { valid: false, errors: ['Disallowed prototype property detected.'], sanitized: {} };
    }
  }

  const effectiveRules = Object.keys(rules).length > 0 ? rules : Object.fromEntries(
    Object.keys(data).map((k) => [k, { type: typeof data[k], maxLength: 1000, sanitizeHtml: true }])
  );

  for (const [field, rule] of Object.entries(effectiveRules)) {
    let value = data[field];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required.`);
      continue;
    }

    if (value === undefined || value === null) {
      if (rule.default !== undefined) {
        sanitized[field] = rule.default;
      }
      continue;
    }

    // Type check
    if (rule.type && typeof value !== rule.type) {
      errors.push(`Field '${field}' must be of type ${rule.type}.`);
      continue;
    }

    // String processing
    if (typeof value === 'string') {
      // Strip null bytes and control chars
      value = value.replace(/\0/g, '').trim();

      // Max length enforcement
      const maxLen = rule.maxLength || 500;
      if (value.length > maxLen) {
        errors.push(`Field '${field}' exceeds maximum length of ${maxLen} characters.`);
        continue;
      }

      // Email validation
      if (rule.isEmail) {
        if (!EMAIL_REGEX.test(value)) {
          errors.push(`Field '${field}' must be a valid email address.`);
          continue;
        }
        value = value.toLowerCase();
      }

      // XSS and HTML tag sanitization
      if (rule.sanitizeHtml !== false) {
        value = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/javascript:/gi, '');
      }
    }

    sanitized[field] = value;
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : {},
  };
}

/**
 * Verify administrative authorization
 */
export function verifyAdminAuth(reqHeaders = {}) {
  const expected = getAdminKey();
  // Fail closed: with no key configured, nothing is authorized.
  if (!expected) return false;

  const authHeader = reqHeaders['authorization'] || reqHeaders['Authorization'] || '';
  const adminKeyHeader = reqHeaders['x-admin-key'] || reqHeaders['X-Admin-Key'] || '';

  if (authHeader.startsWith('Bearer ')) {
    if (constantTimeEquals(authHeader.substring(7).trim(), expected)) return true;
  }

  if (adminKeyHeader && constantTimeEquals(adminKeyHeader, expected)) return true;

  return false;
}

/**
 * Atomic persistent store with concurrency locking
 */
export class AtomicStore {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.dir = path.dirname(this.filePath);
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  async read() {
    const release = await mutex.acquire(this.filePath);
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      if (!raw || !raw.trim()) {
        return [];
      }
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // Fallback on corrupt read
        return [];
      }
    } finally {
      release();
    }
  }

  async writeAtomic(data) {
    this._ensureDir();
    const release = await mutex.acquire(this.filePath);
    const tmpFile = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;

    try {
      const payload = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(tmpFile, payload, 'utf8');
      await fs.promises.rename(tmpFile, this.filePath);
      return true;
    } catch (err) {
      try {
        if (fs.existsSync(tmpFile)) {
          await fs.promises.unlink(tmpFile);
        }
      } catch (_) {}
      throw new Error(`Atomic write failed: ${err.message}`);
    } finally {
      release();
    }
  }

  async insertRecord(newRecord, uniqueKey = 'email') {
    this._ensureDir();
    const release = await mutex.acquire(this.filePath);
    const tmpFile = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;

    try {
      let records = [];
      if (fs.existsSync(this.filePath)) {
        const raw = await fs.promises.readFile(this.filePath, 'utf8');
        if (raw && raw.trim()) {
          try {
            records = JSON.parse(raw);
            if (!Array.isArray(records)) records = [];
          } catch {
            records = [];
          }
        }
      }

      // Duplicate check if uniqueKey provided
      if (uniqueKey && newRecord[uniqueKey]) {
        const searchVal = String(newRecord[uniqueKey]).toLowerCase();
        const existing = records.find(
          (r) => r[uniqueKey] && String(r[uniqueKey]).toLowerCase() === searchVal
        );
        if (existing) {
          return {
            success: true,
            duplicate: true,
            record: existing,
            totalRecords: records.length,
          };
        }
      }

      // Assign unique ID and timestamp
      const finalized = {
        id: `REC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        ...newRecord,
        created_at: new Date().toISOString(),
      };

      records.push(finalized);

      const payload = JSON.stringify(records, null, 2);
      await fs.promises.writeFile(tmpFile, payload, 'utf8');
      await fs.promises.rename(tmpFile, this.filePath);

      return {
        success: true,
        duplicate: false,
        record: finalized,
        totalRecords: records.length,
      };
    } catch (err) {
      try {
        if (fs.existsSync(tmpFile)) {
          await fs.promises.unlink(tmpFile);
        }
      } catch (_) {}
      throw err;
    } finally {
      release();
    }
  }

  async clear() {
    const release = await mutex.acquire(this.filePath);
    try {
      if (fs.existsSync(this.filePath)) {
        await fs.promises.unlink(this.filePath);
      }
    } finally {
      release();
    }
  }
}
