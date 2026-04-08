import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TemperatureUnit = 'C' | 'F';
export type MeasurementSystem = 'Metric' | 'Imperial';

export interface MeasurementSettings {
  system: MeasurementSystem;
  temperature: TemperatureUnit;
}
export interface UnitOption {
  code: string; // stored in DB / JSON
  label: string; // shown in dropdown
  category:
    | 'area'
    | 'length'
    | 'volume'
    | 'count'
    | 'package'
    | 'time'
    | 'other'
    | 'weight';
}

@Injectable({
  providedIn: 'root',
})
export class MeasurementService {
  private static readonly STORAGE_KEY = 'measurement_settings';

  private settingsSubject: BehaviorSubject<MeasurementSettings>;

  constructor() {
    const savedSettings = this.loadSettingsFromStorage();
    this.settingsSubject = new BehaviorSubject<MeasurementSettings>(
      savedSettings,
    );
  }

  private loadSettingsFromStorage(): MeasurementSettings {
    try {
      const saved = localStorage.getItem(MeasurementService.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(
        'Could not parse measurement settings from local storage',
        e,
      );
    }
    return this.getDefaults();
  }

  private getDefaults(): MeasurementSettings {
    const userLocale = navigator.language || (navigator as any).userLanguage;
    const isImperial = userLocale === 'en-US' || userLocale === 'en-GB';
    return {
      system: isImperial ? 'Imperial' : 'Metric',
      temperature: isImperial ? 'F' : 'C',
    };
  }

  public getSettings(): BehaviorSubject<MeasurementSettings> {
    return this.settingsSubject;
  }

  public updateSettings(newSettings: Partial<MeasurementSettings>): void {
    const currentSettings = this.settingsSubject.getValue();
    const updatedSettings = { ...currentSettings, ...newSettings };
    this.settingsSubject.next(updatedSettings);
    try {
      localStorage.setItem(
        MeasurementService.STORAGE_KEY,
        JSON.stringify(updatedSettings),
      );
    } catch (e) {
      console.error('Could not save measurement settings to local storage', e);
    }
  }

  public convertTemperature(
    tempCelsius: number,
    toUnit?: TemperatureUnit,
  ): number {
    const unit = toUnit || this.settingsSubject.getValue().temperature;
    if (unit === 'F') {
      return (tempCelsius * 9) / 5 + 32;
    }
    return tempCelsius;
  }

  public getUnits(): UnitOption[] {
    return [
      // AREA
      { code: 'sq ft', label: 'Square Feet (sq ft)', category: 'area' },
      {
        code: 'SFCA',
        label: 'Square Feet Contact Area (SFCA)',
        category: 'area',
      },
      { code: 'SQ', label: 'Roofing Square (100 sq ft)', category: 'area' },

      // LENGTH
      { code: 'ln ft', label: 'Linear Feet (ft)', category: 'length' },

      // VOLUME
      { code: 'cu yd', label: 'Cubic Yards (cu yd)', category: 'volume' },
      { code: 'cu m', label: 'Cubic Meters (cu m)', category: 'volume' },

      // COUNT
      { code: 'ea', label: 'Each (ea)', category: 'count' },
      { code: 'set', label: 'Set', category: 'count' },
      { code: 'pcs', label: 'Pieces (pcs)', category: 'count' },

      // PACKAGING
      { code: 'roll', label: 'Roll', category: 'package' },
      { code: 'bundle', label: 'Bundle', category: 'package' },
      { code: 'box', label: 'Box', category: 'package' },
      { code: 'bag', label: 'Bag', category: 'package' },
      { code: 'sheet', label: 'Sheet', category: 'package' },
      { code: 'pail', label: 'Pail', category: 'package' },
      { code: 'tube', label: 'Tube', category: 'package' },
      { code: 'can', label: 'Can', category: 'package' },
      { code: 'package', label: 'Package', category: 'package' },
      { code: 'pallet', label: 'Pallet', category: 'package' },
      { code: 'pack', label: 'Pack', category: 'package' },
      { code: 'case', label: 'Case', category: 'package' },

      // WEIGHT
      { code: 'lb', label: 'Pounds (lb)', category: 'weight' },

      // LIQUID
      { code: 'gal', label: 'Gallon (gal)', category: 'volume' },
      { code: 'qt', label: 'Quart (qt)', category: 'volume' },

      // ALLOWANCE / LUMP SUM
      { code: 'ls', label: 'Lump Sum / Allowance', category: 'other' },
      { code: 'lot', label: 'Lot / Allowance', category: 'other' },

      // TIME
      { code: 'day', label: 'Day', category: 'time' },
      { code: 'hour', label: 'Hour', category: 'time' },
    ];
  }
  // -----------------------------
  // UNIT NORMALIZATION
  // -----------------------------

  private readonly UNIT_ALIASES: Record<string, string> = {
    // LENGTH
    lf: 'ln ft',
    ft: 'ln ft',
    'linear ft': 'ln ft',

    // AREA
    sqft: 'sq ft',
    sf: 'sq ft',
    sfca: 'SFCA',
    sq: 'SQ',

    // VOLUME
    'cubic yards': 'cu yd',
    'cubic yard': 'cu yd',

    // WEIGHT
    lbs: 'lb',

    // COUNT
    each: 'ea',
    piece: 'pcs',
    pieces: 'pcs',

    // PACKAGE
    pkg: 'package',

    // LUMP SUM
    ls: 'ls',
  };

  public normalizeUnit(rawUnit: string | null | undefined): string | null {
    if (!rawUnit) return null;

    const trimmed = rawUnit.trim();

    // First: try alias map (case-insensitive)
    const aliasKey = trimmed.toLowerCase();
    const aliased = this.UNIT_ALIASES[aliasKey];

    if (aliased) {
      return aliased;
    }

    // Second: try direct match against canonical units (case-insensitive)
    const directMatch = this.getUnits().find(
      (u) => u.code.toLowerCase() === aliasKey,
    );

    return directMatch ? directMatch.code : null;
  }
}
