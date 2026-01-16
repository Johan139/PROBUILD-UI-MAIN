import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from '../../../../../../shared/shared.module';
import { JobsService } from '../../../../../../services/jobs.service';

@Component({
  selector: 'app-subcontractor-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    SharedModule
  ],
  template: `
    <div class="modal-container">
      <button class="close-btn" mat-icon-button mat-dialog-close>
        <mat-icon>close</mat-icon>
      </button>

      <div class="header">
        <div class="avatar-large gray-bg">
          <mat-icon class="yellow-text large-icon">build</mat-icon>
        </div>
        <div>
          <h3>{{ data.sub.firstName }} {{ data.sub.lastName }}</h3>
          <p class="role">{{ (data.sub.jobRole || '') | roleDisplay }}</p>
          <div class="status-row">
            <span class="status-pill confirmed">Confirmed</span>
            <div class="rating">
              <mat-icon class="star-icon">star</mat-icon>
              <span>{{ data.rating || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="details-section">
        <div class="stats-grid">
          <div class="stat-box">
            <p class="label">Contract Value</p>
            <p class="value yellow-text">HARDCODED TBD</p> <!-- TODO: Mocked as we don't have contract value easily linked yet -->
          </div>
          <div class="stat-box">
            <p class="label">Completed Projects</p>
            <p class="value">{{ completedProjectsCount }}</p>
          </div>
        </div>

        <h4>Contact Information</h4>

        <div class="detail-row">
          <mat-icon class="yellow-text">person</mat-icon>
          <div>
            <p class="label">Primary Contact</p>
            <p class="value">{{ data.sub.firstName }} {{ data.sub.lastName }}</p>
          </div>
        </div>

        <div class="detail-row">
          <mat-icon class="yellow-text">phone</mat-icon>
          <div>
            <p class="label">Phone</p>
            <p class="value">{{ data.sub.phoneNumber || 'N/A' }}</p>
          </div>
        </div>

        <div class="detail-row">
          <mat-icon class="yellow-text">mail</mat-icon>
          <div>
            <p class="label">Email</p>
            <p class="value">{{ data.sub.email || 'N/A' }}</p>
          </div>
        </div>
      </div>

      <div class="actions">
        <button mat-flat-button class="yellow-btn full-width">
          <mat-icon>mail</mat-icon>
          Send Email
        </button>
      </div>
    </div>
  `,
  styles: [`
    .modal-container {
      padding: var(--space-6);
      position: relative;
      background-color: var(--color-surface);
      color: var(--color-text);
      border-radius: var(--radius-md);
    }
    .close-btn {
      position: absolute;
      top: var(--space-2);
      right: var(--space-2);
      color: var(--color-text-muted);
    }
    .header {
      display: flex;
      gap: var(--space-4);
      align-items: flex-start;
      margin-bottom: var(--space-8);

      h3 { margin: 0; font-size: var(--fs-xl); font-weight: var(--fw-bold); color: var(--color-text); }
      .role { margin: 0; color: var(--color-text-muted); font-size: var(--fs-sm); }
      .status-row { display: flex; align-items: center; gap: var(--space-4); margin-top: var(--space-2); }
      .status-pill.confirmed {
        background-color: color-mix(in oklab, var(--color-success) 20%, transparent);
        color: var(--color-success);
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: var(--fs-xs);
        font-weight: var(--fw-medium);
      }
      .rating {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: var(--fs-sm);
        color: var(--color-text-muted);
        .star-icon { font-size: 16px; width: 16px; height: 16px; color: var(--color-primary); }
      }
    }
    .avatar-large {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.gray-bg { background-color: var(--color-surface-hover); }
      .yellow-text { color: var(--color-primary); }
      .large-icon { font-size: 32px; width: 32px; height: 32px; }
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
      margin-bottom: var(--space-6);

      .stat-box {
        background-color: var(--color-surface-subtle);
        padding: var(--space-4);
        border-radius: var(--radius-md);

        .label { margin: 0; font-size: var(--fs-xs); color: var(--color-text-muted); }
        .value { margin: 0; font-size: var(--fs-lg); font-weight: var(--fw-bold); color: var(--color-text); &.yellow-text { color: var(--color-primary); } }
      }
    }
    .details-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      margin-bottom: var(--space-8);

      h4 { font-size: var(--fs-sm); font-weight: var(--fw-semibold); margin-bottom: var(--space-2); color: var(--color-text); }
    }
    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      padding: var(--space-3);
      background-color: var(--color-surface-subtle);
      border-radius: var(--radius-md);

      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      .yellow-text { color: var(--color-primary); }

      .label { margin: 0; font-size: var(--fs-xs); color: var(--color-text-muted); }
      .value { margin: 0; font-size: var(--fs-sm); font-weight: var(--fw-medium); color: var(--color-text); }
    }
    .yellow-btn {
      background-color: var(--color-primary);
      color: var(--color-text-inverse);
      width: 100%;
      font-weight: var(--fw-semibold);
      &:hover { background-color: var(--color-primary-hover); }
    }
  `]
})

export class SubcontractorDetailDialogComponent implements OnInit {
  completedProjectsCount: number = 0;

  constructor(
    public dialogRef: MatDialogRef<SubcontractorDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sub: any; rating?: number },
    private jobsService: JobsService,
  ) {}

  ngOnInit() {
    if (this.data.sub && this.data.sub.id) {
      this.jobsService.getAllJobsByUserId(this.data.sub.id).subscribe({
        next: (jobs: any[]) => {
          if (jobs) {
            this.completedProjectsCount = jobs.filter(
              (j) => j.status === 'COMPLETED',
            ).length;
          }
        },
        error: (err) => console.error('Failed to load sub jobs', err),
      });
    }
  }
}
