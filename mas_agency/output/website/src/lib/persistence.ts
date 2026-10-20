import fs from 'fs';
import path from 'path';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&\x27*+/=?^_\x60{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
export const DEFAULT_ADMIN_KEY = process.env.ADMIN_API_KEY || 'zadrow-admin-secure-key-2026';

class MutexManager {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire(key: string): Promise<() => void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
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

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  maxLength?: number;
  isEmail?: boolean;
  sanitizeHtml?: boolean;
  default?: any;
}

export function validateAndSanitizeInput(
  data: any,
  rules: Record<string, ValidationRule> = {}
): { valid: boolean; errors: string[]; sanitized: Record<string, any> } {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Request payload must be a non-empty JSON object.'], sanitized: {} };
  }

  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return { valid: false, errors: ['Disallowed prototype property detected.'], sanitized: {} };
    }
  }

  for (const [field, rule] of Object.entries(rules)) {
    let value = data[field];

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

    if (rule.type && typeof value !== rule.type) {
      errors.push(`Field '${field}' must be of type ${rule.type}.`);
      continue;
    }

    if (typeof value === 'string') {
      value = value.replace(/\0/g, '').trim();

      const maxLen = rule.maxLength || 500;
      if (value.length > maxLen) {
        errors.push(`Field '${field}' exceeds maximum length of ${maxLen} characters.`);
        continue;
      }

      if (rule.isEmail) {
        if (!EMAIL_REGEX.test(value)) {
          errors.push(`Field '${field}' must be a valid email address.`);
          continue;
        }
        value = value.toLowerCase();
      }

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

export function verifyAdminAuth(headers: Headers): boolean {
  const authHeader = headers.get('authorization') || '';
  const adminKeyHeader = headers.get('x-admin-key') || '';

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === DEFAULT_ADMIN_KEY) return true;
  }

  if (adminKeyHeader && adminKeyHeader === DEFAULT_ADMIN_KEY) {
    return true;
  }

  return false;
}

export class AtomicStore {
  private filePath: string;
  private dir: string;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
    this.dir = path.dirname(this.filePath);
    this._ensureDir();
  }

  private _ensureDir() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  async read(): Promise<any[]> {
    const release = await mutex.acquire(this.filePath);
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(this.filePath, 'utf8');
      if (!raw || !raw.trim()) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    } finally {
      release();
    }
  }

  async insertRecord(
    newRecord: Record<string, any>,
    uniqueKey: string = 'email'
  ): Promise<{ success: boolean; duplicate: boolean; record: any; totalRecords: number }> {
    this._ensureDir();
    const release = await mutex.acquire(this.filePath);
    const tmpFile = `${this.filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;

    try {
      let records: any[] = [];
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
}
