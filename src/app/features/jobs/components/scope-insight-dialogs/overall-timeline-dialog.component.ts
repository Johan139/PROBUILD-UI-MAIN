import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface TimelineMilestoneRow {
  phase: string;
  weeks: string;
  tone: 'accent' | 'default' | 'success';
}

export interface OverallTimelineDialogData {
  noticeToProceed: string;
  substantialCompletion: string;
  contractDurationText: string;
  workingDaysText: string;
  milestones: TimelineMilestoneRow[];
  weatherDelays: string;
  permitLeadTime: string;
  materialLeadTime: string;
}

@Component({
  selector: 'app-overall-timeline-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="scope-modal">
      <header class="scope-modal-header">
        <div class="scope-modal-heading">
          <div class="scope-modal-icon timeline">
            <mat-icon>calendar_month</mat-icon>
          </div>
          <div>
            <h2>Construction Schedule Details</h2>
            <p>Project milestones and timeline overview</p>
          </div>
        </div>
        <button type="button" class="scope-close-btn" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="scope-modal-content">
        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Schedule Summary</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row"><span>Notice to Proceed</span><strong>{{ data.noticeToProceed }}</strong></div>
            <div class="scope-stat-row"><span>Substantial Completion</span><strong>{{ data.substantialCompletion }}</strong></div>
            <div class="scope-stat-row"><span>Contract Duration</span><strong>{{ data.contractDurationText }}</strong></div>
            <div class="scope-stat-row"><span>Working Days</span><strong>{{ data.workingDaysText }}</strong></div>
          </div>
        </section>

        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Key Milestones</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row" *ngFor="let milestone of data.milestones">
              <span>{{ milestone.phase }}</span>
              <strong [ngClass]="milestone.tone">{{ milestone.weeks }}</strong>
            </div>
          </div>
        </section>

        <section class="scope-modal-section">
          <p class="scope-modal-section-title">Schedule Risk Assessment</p>
          <div class="scope-stat-list">
            <div class="scope-stat-row"><span>Critical Path</span><strong class="accent">Foundation to Framing</strong></div>
            <div class="scope-stat-row"><span>Weather Delays (Est.)</span><strong class="success">{{ data.weatherDelays }}</strong></div>
            <div class="scope-stat-row"><span>Permit Lead Time</span><strong class="accent">{{ data.permitLeadTime }}</strong></div>
            <div class="scope-stat-row"><span>Material Lead Time</span><strong>{{ data.materialLeadTime }}</strong></div>
          </div>
        </section>
      </mat-dialog-content>
    </div>
  `,
  styles: [
    `
      .scope-modal {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-xl);
        color: var(--color-text);
        overflow: hidden;
      }
      .scope-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-4) var(--space-5);
        border-bottom: 1px solid var(--color-border);
      }
      .scope-modal-heading {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        h2 { margin: 0; font-size: var(--fs-sm); font-weight: var(--fw-bold); color: var(--color-text); }
        p { margin: 2px 0 0; font-size: var(--fs-2xs); color: var(--color-text-muted); }
      }
      .scope-modal-icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md);
        display: grid;
        place-items: center;
        mat-icon { width: 16px; height: 16px; font-size: 16px; }
        &.timeline {
          background: color-mix(in oklab, var(--color-text-muted) 15%, transparent);
          mat-icon { color: var(--color-text-muted); }
        }
      }
      .scope-close-btn {
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: var(--radius-md);
        background: var(--color-surface-hover);
        color: var(--color-text-muted);
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .scope-modal-content {
        padding: var(--space-4) var(--space-5);
        display: grid;
        gap: var(--space-3);
        max-height: 70vh;
      }
      .scope-modal-section {
        border-radius: var(--radius-md);
        background: var(--color-surface-subtle);
        padding: var(--space-4);
      }
      .scope-modal-section-title {
        margin: 0 0 var(--space-3);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-muted);
        font-weight: var(--fw-semibold);
      }
      .scope-stat-list { display: grid; gap: 10px; }
      .scope-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        font-size: var(--fs-sm);
        span { color: var(--color-text-muted); }
        strong { color: var(--color-text); font-weight: var(--fw-semibold); }
        .accent { color: var(--color-primary); }
        .success { color: var(--color-success); }
        .default { color: var(--color-text); }
      }
    `,
  ],
})
export class OverallTimelineDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<OverallTimelineDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OverallTimelineDialogData,
  ) {}
}

