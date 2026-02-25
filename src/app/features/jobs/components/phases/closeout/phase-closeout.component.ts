import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-phase-closeout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './phase-closeout.component.html',
  styleUrl: './phase-closeout.component.scss',
})
export class PhaseCloseoutComponent {
  @Input() projectDetails: any;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() archive = new EventEmitter<void>();

  readonly closeoutItems = [
    { id: 'as-builts', label: 'As-built drawings package', done: true },
    { id: 'warranty', label: 'Warranty and O&M manuals', done: true },
    { id: 'final-inspection', label: 'Final inspection signoff', done: false },
    { id: 'handover', label: 'Owner handover confirmation', done: false },
  ];

  readonly closureStats = [
    { label: 'Closeout Package', value: '100%' },
    { label: 'Signoffs', value: 'Owner · PM · Finance' },
    { label: 'Retention', value: 'Released' },
    { label: 'Archive State', value: 'Ready' },
  ];

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize || '2,450';
  }

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '228';
    }

    return Math.round(numeric * 0.0929).toLocaleString();
  }

  get completedCount(): number {
    return this.closeoutItems.filter((item) => item.done).length;
  }

  get completionPercent(): number {
    return Math.round((this.completedCount / this.closeoutItems.length) * 100);
  }

  get canArchive(): boolean {
    return this.completedCount === this.closeoutItems.length;
  }

  get archiveState(): string {
    return this.canArchive ? 'Ready' : 'Pending checklist';
  }

  toggleItem(itemId: string): void {
    const item = this.closeoutItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    item.done = !item.done;
  }
}

