import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type TemperatureUnit = 'C' | 'F';
export type MeasurementSystem = 'Metric' | 'Imperial';

export interface MeasurementSettings {
  system: MeasurementSystem;
  temperature: TemperatureUnit;
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

  public getUnits(): string[] {
    return [
      // Imperial Units
      'sq ft',
      'ft',
      'in',
      'yd',
      'mi',
      'acre',
      'lb',
      'oz',
      'ton',
      'gal',
      'qt',
      'pt',
      'fl oz',

      // Metric Units
      'sq m',
      'm',
      'cm',
      'mm',
      'km',
      'ha',
      'kg',
      'g',
      't',
      'L',
      'mL',

      // Other
      'Each',
      'Box',
      'Case',
      'Pallet',
      'Bag',
      'Roll',
      'Linear ft',
      'Linear m',
      'Cubic yd',
      'Cubic m',
      'Sheet',
      'Piece',
      'Unit',
      'Day',
      'Hour',
    ];
  }
}
