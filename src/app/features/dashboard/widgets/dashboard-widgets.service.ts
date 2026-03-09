import { Injectable } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';

// CHANGED: lowercase to match your CSS classes
export type WidgetSize = 'small' | 'medium' | 'large';

export interface DashboardWidget {
  id: string;
  title: string;
  icon: string;
  size: WidgetSize;
  enabled: boolean;
}

const STORAGE_KEY = 'dashboardWidgets';
const CUSTOM_STORAGE_KEY = 'dashboardWidgets.custom';
const SELECTED_LAYOUT_KEY = 'dashboardWidgets.layout';

@Injectable({ providedIn: 'root' })
export class DashboardWidgetsService {
  private widgets: DashboardWidget[] = [
    {
      id: 'weather',
      title: 'Weather',
      icon: 'cloud',
      size: 'small', // 4 columns (1/3 width)
      enabled: true,
    },
    {
      id: 'executiveSnapshot',
      title: 'Executive Snapshot',
      icon: 'insights',
      size: 'medium',
      enabled: true,
    },
    {
      id: 'actionPoints',
      title: 'Action Points',
      icon: 'check_circle',
      size: 'small', // 6 columns (1/2 width)
      enabled: true,
    },
  ];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.widgets = JSON.parse(saved) as DashboardWidget[];
      } catch {
        this.persist();
      }
    }
  }

  getSelectedLayout(): 'default' | 'compact' | 'focus' | 'monitoring' | 'custom' {
    const raw = localStorage.getItem(SELECTED_LAYOUT_KEY);
    const id = String(raw ?? 'default');
    if (id === 'compact' || id === 'focus' || id === 'monitoring' || id === 'custom') return id;
    return 'default';
  }

  setSelectedLayout(id: 'default' | 'compact' | 'focus' | 'monitoring' | 'custom'): void {
    localStorage.setItem(SELECTED_LAYOUT_KEY, id);
  }

  saveCustomLayout(): void {
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(this.widgets));
  }

  loadCustomLayout(): DashboardWidget[] | null {
    const saved = localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as DashboardWidget[];
    } catch {
      return null;
    }
  }

  hasCustomLayout(): boolean {
    return !!this.loadCustomLayout();
  }

  applyLayout(id: 'default' | 'compact' | 'focus' | 'monitoring' | 'custom'): void {
    if (id === 'default') {
      const custom = this.loadCustomLayout();
      if (custom?.length) {
        this.setWidgets(custom);
        return;
      }
      this.applyPresetInternal('default');
      return;
    }

    if (id === 'custom') {
      const custom = this.loadCustomLayout();
      if (custom?.length) {
        this.setWidgets(custom);
      }
      return;
    }

    this.applyPresetInternal(id);
  }

  /** Full widget registry (used by config bar + dashboard) */
  getWidgets(): DashboardWidget[] {
    return this.widgets;
  }

  /** Enabled state (used by dashboard grid) */
  isEnabled(id: string): boolean {
    return this.widgets.find((w) => w.id === id)?.enabled ?? false;
  }

  /** Toggle visibility (eye icon) */
  toggle(id: string): void {
    const widget = this.widgets.find((w) => w.id === id);
    if (!widget) return;

    widget.enabled = !widget.enabled;
    this.persist();
  }

  /** Resize widget (small / medium / large badge) */
  setSize(id: string, size: WidgetSize): void {
    const widget = this.widgets.find((w) => w.id === id);
    if (!widget) return;

    widget.size = size;
    this.persist();
  }

  /** Reorder widgets (drag in config bar OR dashboard) */
  moveWidget(from: number, to: number): void {
    moveItemInArray(this.widgets, from, to);
    this.persist();
  }

  /** Replace registry safely (used by drag-drop lists) */
  setWidgets(widgets: DashboardWidget[]): void {
    this.widgets = [...widgets];
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.widgets));
  }

  applyPreset(presetId: 'default' | 'compact' | 'focus' | 'monitoring'): void {
    this.applyLayout(presetId);
  }

  private applyPresetInternal(presetId: 'default' | 'compact' | 'focus' | 'monitoring'): void {
    const presets = {
      default: [
        { id: 'weather', size: 'small' as WidgetSize },
        { id: 'executiveSnapshot', size: 'medium' as WidgetSize },
        { id: 'actionPoints', size: 'medium' as WidgetSize },
      ],
      compact: [
        { id: 'weather', size: 'small' as WidgetSize },
        { id: 'executiveSnapshot', size: 'small' as WidgetSize },
        { id: 'actionPoints', size: 'small' as WidgetSize },
      ],
      focus: [
        { id: 'executiveSnapshot', size: 'large' as WidgetSize },
        { id: 'actionPoints', size: 'large' as WidgetSize },
        { id: 'weather', size: 'small' as WidgetSize },
      ],
      monitoring: [
        { id: 'weather', size: 'large' as WidgetSize },
        { id: 'executiveSnapshot', size: 'large' as WidgetSize },
        { id: 'actionPoints', size: 'large' as WidgetSize },
      ],
    };

    const preset = presets[presetId];

    // Update widgets with preset configuration
    preset.forEach((config, index) => {
      const widget = this.widgets.find((w) => w.id === config.id);
      if (widget) {
        widget.size = config.size;
        // Move widget to correct position
        const currentIndex = this.widgets.indexOf(widget);
        if (currentIndex !== index) {
          moveItemInArray(this.widgets, currentIndex, index);
        }
      }
    });

    this.persist();
  }
}
