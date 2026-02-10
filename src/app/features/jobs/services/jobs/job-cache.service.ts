import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class JobCacheService {
  get<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      return JSON.parse(raw) as T;
    } catch (e) {
      console.error(`JobCacheService: failed to parse key ${key}`, e);
      return null;
    }
  }

  set(key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`JobCacheService: failed to store key ${key}`, e);
    }
  }

  remove(key: string): void {
    if (typeof localStorage === 'undefined') return;

    localStorage.removeItem(key);
  }
}
