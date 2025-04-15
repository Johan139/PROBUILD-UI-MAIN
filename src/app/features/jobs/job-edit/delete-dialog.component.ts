import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog'; // Import MatDialogModule

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule], // Add MatDialogModule to imports
  template: `
    <h2 mat-dialog-title>Are You Sure You Want to delete?</h2>
    <mat-dialog-content>
      <p>
       Are you sure you want to delete a subtask line?
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button class="dialog-btn return-btn" (click)="onReturn()">No</button>
      <button mat-button class="dialog-btn confirm-btn" (click)="onConfirm()">Yes</button>
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
      color: 333;
    }

    .confirm-btn:hover {
      background-color: #FBD008; /* Darker red */
    }
  `]
})
export class DeleteDialogComponent {
  constructor(public dialogRef: MatDialogRef<DeleteDialogComponent>) {}

  onReturn(): void {
    this.dialogRef.close(false); // Return false to indicate cancellation was not confirmed
  }

  onConfirm(): void {
    this.dialogRef.close(true); // Return true to indicate cancellation was confirmed
  }
}