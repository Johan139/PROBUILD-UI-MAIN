import { Injectable } from '@angular/core';

interface CacheEnvelope<T> {
  value: T;
  expiresAt?: number;
}

@Injectable({
  providedIn: 'root',
})
export class JobCacheService {
  get<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as CacheEnvelope<T> | T;

      // Backward compatible: support both wrapped and legacy values.
      if (
        parsed &&
        typeof parsed === 'object' &&
        'value' in (parsed as Record<string, unknown>)
      ) {
        const envelope = parsed as CacheEnvelope<T>;
        if (
          typeof envelope.expiresAt === 'number' &&
          Number.isFinite(envelope.expiresAt) &&
          Date.now() > envelope.expiresAt
        ) {
          localStorage.removeItem(key);
          return null;
        }
        return envelope.value ?? null;
      }

      return parsed as T;
    } catch (e) {
      console.error(`JobCacheService: failed to parse key ${key}`, e);
      localStorage.removeItem(key);
      return null;
    }
  }

  set(key: string, value: unknown, options?: { ttlMs?: number }): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const ttlMs = Number(options?.ttlMs || 0);
      const payload: CacheEnvelope<unknown> = {
        value,
        expiresAt: ttlMs > 0 ? Date.now() + ttlMs : undefined,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.error(`JobCacheService: failed to store key ${key}`, e);
    }
  }

  remove(key: string): void {
    if (typeof localStorage === 'undefined') return;

    localStorage.removeItem(key);
  }
}
