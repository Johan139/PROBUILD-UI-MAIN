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
      id: 'actionPoints',
      title: 'Action Points',
      icon: 'check_circle',
      size: 'small', // 6 columns (1/2 width)
      enabled: true,
    },
    {
      id: 'recentProjects',
      title: 'Recent Projects',
      icon: 'folder',
      size: 'large', // 12 columns (full width, own row)
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
    const presets = {
      default: [
        { id: 'weather', size: 'small' as WidgetSize },
        { id: 'actionPoints', size: 'medium' as WidgetSize },
        { id: 'recentProjects', size: 'large' as WidgetSize },
      ],
      compact: [
        { id: 'weather', size: 'small' as WidgetSize },
        { id: 'actionPoints', size: 'small' as WidgetSize },
        { id: 'recentProjects', size: 'large' as WidgetSize },
      ],
      focus: [
        { id: 'actionPoints', size: 'large' as WidgetSize },
        { id: 'weather', size: 'small' as WidgetSize },
        { id: 'recentProjects', size: 'medium' as WidgetSize },
      ],
      monitoring: [
        { id: 'weather', size: 'large' as WidgetSize },
        { id: 'actionPoints', size: 'large' as WidgetSize },
        { id: 'recentProjects', size: 'large' as WidgetSize },
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
