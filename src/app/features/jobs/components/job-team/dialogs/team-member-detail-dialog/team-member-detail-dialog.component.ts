import { Component, Inject } from '@angular/core';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SharedModule } from '../../../../../../shared/shared.module';

@Component({
  selector: 'app-team-member-detail-dialog',
  standalone: true,
  imports: [
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
        <div class="avatar-large yellow-bg yellow-text">
          {{ getInitials(data.member.firstName + ' ' + data.member.lastName) }}
        </div>
        <div>
          <h3>{{ data.member.firstName }} {{ data.member.lastName }}</h3>
          <p class="role">{{ (data.member.jobRole || '') | roleDisplay }}</p>
          <span class="badge">{{ (data.member.userType || '') | roleDisplay }}</span>
        </div>
      </div>

      <div class="details-section">
        <h4>Contact Information</h4>

        <div class="detail-row">
          <mat-icon class="yellow-text">mail</mat-icon>
          <div>
            <p class="label">Email</p>
            <p class="value">{{ data.member.email || 'N/A' }}</p>
          </div>
        </div>

        <div class="detail-row">
          <mat-icon class="yellow-text">phone</mat-icon>
          <div>
            <p class="label">Phone</p>
            <p class="value">{{ data.member.phoneNumber || 'N/A' }}</p>
          </div>
        </div>

        <div class="detail-row">
          <mat-icon class="yellow-text">business</mat-icon>
          <div>
            <p class="label">Department</p>
            <p class="value">{{ (data.member.userType || '') | roleDisplay }}</p>
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
      .badge {
        display: inline-block;
        margin-top: var(--space-2);
        padding: 4px 12px;
        background-color: color-mix(in oklab, var(--color-primary) 20%, transparent);
        color: var(--color-primary);
        border-radius: 9999px;
        font-size: var(--fs-xs);
        font-weight: var(--fw-medium);
      }
    }
    .avatar-large {
      width: 64px;
      height: 64px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--fs-xl);
      font-weight: var(--fw-bold);
      flex-shrink: 0;

      &.yellow-bg { background-color: color-mix(in oklab, var(--color-primary) 20%, transparent); }
      .yellow-text { color: var(--color-primary); }
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
export class TeamMemberDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TeamMemberDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { member: any }
  ) {}

  getInitials(name: string): string {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';
  }
}
