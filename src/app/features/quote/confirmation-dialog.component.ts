import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [MatDialogModule, MatCheckboxModule, MatButtonModule, FormsModule],
  template: `
    <div class="dialog-wrapper">
      <h2 mat-dialog-title class="dialog-title">{{ data.title }}</h2>

      <mat-dialog-content class="dialog-content">
        <p class="dialog-message">{{ data.message }}</p>
        <mat-checkbox [(ngModel)]="confirmed" class="dialog-checkbox">
          I understand and confirm
        </mat-checkbox>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button
          mat-button
          class="dialog-btn cancel-btn"
          (click)="dialogRef.close(false)"
        >
          Cancel
        </button>
        <button
          mat-button
          class="dialog-btn confirm-btn"
          [disabled]="!confirmed"
          (click)="dialogRef.close(true)"
        >
          Confirm
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dialog-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 500;
        transition: background-color 0.3s ease;
      }

      .cancel-btn {
        background-color: transparent;
        color: #aaaaaa;
        border: 1px solid #555555;
      }

      .cancel-btn:hover {
        background-color: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }

      .confirm-btn {
        background-color: #fbd008;
        color: #000000;
      }

      .confirm-btn:hover:not([disabled]) {
        background-color: #e0bb00;
      }

      .confirm-btn[disabled] {
        background-color: #555;
        color: #888;
        cursor: not-allowed;
      }
    `,
  ],
})
export class ConfirmationDialogComponent {
  confirmed = false;

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string },
  ) {}
}
