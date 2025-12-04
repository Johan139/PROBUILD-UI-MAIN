import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  constructor() {}

  setItem(key: string, data: any): void {
    const timestamp = new Date().getTime();
    const dataWithTimestamp = {
      timestamp,
      data,
    };
    localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
  }

  getItem(key: string): any {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }

    const { timestamp, data } = JSON.parse(item);
    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;

    if (now - timestamp > oneHour) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
