import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-ai-acceptance-dialog',
  standalone: true,
  imports: [MatDialogModule], // Add MatDialogModule to imports
  template: `
    <h1 mat-dialog-title>Confirm Job Details</h1>
    <div mat-dialog-content>
      <p>Please confirm that you have reviewed the AI-generated output and subtasks, and that you accept them as correct.</p>
    </div>
    <mat-dialog-actions align="end">
      <button mat-button class="dialog-btn return-btn" (click)="onCancel()">Cancel</button>
      <button mat-button class="dialog-btn confirm-btn" (click)="onConfirm()">Confirm</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
    }

    p {
      font-size: 1rem;
      color: #555;
      line-height: 1.5;
      margin-bottom: 16px;
    }

    mat-dialog-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
    }

    .dialog-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      transition: background-color 0.3s ease;
    }

    .return-btn {
      background-color: #FBD008; /* Yellow */
      color: #333;
    }

    .return-btn:hover {
      background-color: #e6bf00; /* Darker yellow */
    }

    .confirm-btn {
      background-color: #FBD008; /* Red */
      color: #333;
    }

    .confirm-btn:hover {
      background-color: #FBD008; /* Darker red */
    }
  `]
})
export class ConfirmAIAcceptanceDialogComponent {
  constructor(private dialogRef: MatDialogRef<ConfirmAIAcceptanceDialogComponent>) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
