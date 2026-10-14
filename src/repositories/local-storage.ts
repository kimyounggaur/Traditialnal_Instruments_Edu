export const STORAGE_KEY = 'gugak-library:v1';
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

/** The adapter is asynchronous so restoration never writes before its read completes. */
export interface StorageLike {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

const adapterWrites = new WeakMap<StorageLike, Promise<unknown>>();

/** Serializes same-page adapters; Web Locks also coordinates supported browser tabs. */
export async function withStorageLock<T>(storage: StorageLike | null, operation: () => Promise<T>): Promise<T> {
  const local = (): Promise<T> => {
    if (!storage) return operation();
    const task = (adapterWrites.get(storage) ?? Promise.resolve()).catch(() => undefined).then(operation);
    adapterWrites.set(storage, task);
    return task;
  };
  if (storage && typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(`${STORAGE_KEY}:write`, local);
  }
  return local();
}

export function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  // Access itself can throw when browser privacy settings block localStorage.
  return window.localStorage;
}

export function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

export function assertBackupSize(text: string): void {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    throw new Error('가져올 JSON은 2MB 이하여야 합니다.');
  }
}

export function containsUnsafeText(value: unknown): boolean {
  if (typeof value === 'string') {
    return /<\s*\/?\s*(?:script|iframe|object|embed|style)\b|\bon\w+\s*=|(?:javascript|data|vbscript|file)\s*:/i.test(value);
  }
  if (Array.isArray(value)) return value.some(containsUnsafeText);
  if (value && typeof value === 'object') return Object.entries(value).some(([key, item]) =>
    ['__proto__', 'prototype', 'constructor'].includes(key) || containsUnsafeText(item));
  return false;
}
