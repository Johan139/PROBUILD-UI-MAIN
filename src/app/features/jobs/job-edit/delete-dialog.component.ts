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
    <mat-dialog-actions align="end">
      <button mat-button class="dialog-btn cancel-btn" (click)="onReturn()">
        Cancel
      </button>
      <button mat-button class="dialog-btn delete-btn" (click)="onConfirm()">
        Delete
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        background-color: #18181b;
        color: white;
        border: 1px solid #3f3f46;
        border-radius: 8px;
        padding: 16px;
      }

      h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: white;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 0.875rem;
        color: #a1a1aa;
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

      .dialog-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.875rem;
        line-height: 1.25rem;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s ease;
      }

      .cancel-btn {
        background-color: transparent;
        color: white;
        border-color: #52525b;
      }

      .cancel-btn:hover {
        background-color: #27272a;
      }

      .delete-btn {
        background-color: #dc2626;
        color: white;
      }

      .delete-btn:hover {
        background-color: #b91c1c;
      }
    `,
  ],
})
export class DeleteDialogComponent {
  constructor(public dialogRef: MatDialogRef<DeleteDialogComponent>) {
    dialogRef.addPanelClass('dark-theme-dialog');
  }

  onReturn(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
