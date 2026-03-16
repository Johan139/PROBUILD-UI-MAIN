import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>Delete Task</h2>
    <mat-dialog-content>
      <p>Are you sure you want to delete this task? This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button class="btn btn-secondary" (click)="onReturn()">Cancel</button>
      <button mat-button class="btn btn-danger" (click)="onConfirm()">Delete</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        background-color: var(--color-surface);
        color: var(--color-text);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 16px;
      }

      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-text);
        margin: 0 0 8px 0;
      }

      p {
        font-size: 0.875rem;
        color: var(--color-text-muted);
        line-height: 1.5;
        margin: 0;
      }

      mat-dialog-content {
        margin: 0 0 24px 0;
        padding: 0 !important;
        max-height: none;
      }

      mat-dialog-actions {
        display: flex;
        gap: 8px;
        padding: 0;
        margin: 0;
        justify-content: flex-end;
      }
    `,
  ],
})
export class DeleteDialogComponent {
  constructor(public dialogRef: MatDialogRef<DeleteDialogComponent>) {
  }

  onReturn(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
