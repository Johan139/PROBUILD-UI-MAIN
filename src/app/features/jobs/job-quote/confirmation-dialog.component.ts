import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog'; // Import MatDialogModule

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule], // Add MatDialogModule to imports
  template: `
    <h2 mat-dialog-title>Are you sure you want to cancel?</h2>
    <mat-dialog-content>
      <p>
        You are about to cancel the creation of this job quote. Any progress,
        including uploaded documents, will be permanently discarded. This action
        cannot be undone.
      </p>
      <p>
        Please confirm if you wish to proceed with the cancellation, or return
        to your work to preserve your progress.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button class="btn btn-secondary" (click)="onReturn()">No</button>
      <button mat-button class="btn btn-danger" (click)="onConfirm()">Yes</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 16px;
      }

      p {
        font-size: 1rem;
        color: var(--color-text-muted);
        line-height: 1.5;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class ConfirmationDialogComponent {
  constructor(public dialogRef: MatDialogRef<ConfirmationDialogComponent>) {}

  onReturn(): void {
    this.dialogRef.close(false); // Return false to indicate cancellation was not confirmed
  }

  onConfirm(): void {
    this.dialogRef.close(true); // Return true to indicate cancellation was confirmed
  }
}
