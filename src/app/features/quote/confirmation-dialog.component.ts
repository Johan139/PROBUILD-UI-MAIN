import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
    selector: 'app-confirmation-dialog',
    standalone: true,
    imports: [
        MatDialogModule,
        MatCheckboxModule,
        MatButtonModule,
        FormsModule
    ],
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
          class="dialog-btn confirm-btn"
          (click)="dialogRef.close(false)">
          Cancel
        </button>
        <button
          mat-button
          class="dialog-btn confirm-btn"
          [disabled]="!confirmed"
          (click)="dialogRef.close(true)">
          Confirm
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .dialog-btn {
       padding: 8px 16px;
       border-radius: 6px;
       font-weight: 500;
       transition: background-color 0.3s ease;
     }
     .confirm-btn {
       background-color: #FBD008; /* Red */
       color: black;
     }

     .confirm-btn:hover {
       background-color: #FBD008; /* Darker red */
     }
   `]
})
export class ConfirmationDialogComponent {
  confirmed = false;

  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string; message: string }
  ) {}
}
