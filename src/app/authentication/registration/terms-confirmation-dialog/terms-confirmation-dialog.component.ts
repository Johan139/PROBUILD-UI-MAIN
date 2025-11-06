import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-terms-confirmation-dialog',
    standalone: true,
    imports: [
        MatDialogModule,
        MatCheckboxModule,
        MatButtonModule,
        FormsModule
    ],
    template: `
   <h1 mat-dialog-title>Terms and Conditions</h1>
<mat-dialog-content>
<mat-checkbox
  [checked]="acceptedMSA"
  (change)="acceptedMSA = $event.checked"
>
  I accept the
  <a href="/masteragreement" target="_blank" rel="noopener noreferrer">
    Master Services Agreement
  </a>
  and Order Form terms
</mat-checkbox>
<br />
<mat-checkbox
  [checked]="acknowledgedPrivacy"
  (change)="acknowledgedPrivacy = $event.checked"
>
  I acknowledge the
  <a href="/privacy" target="_blank" rel="noopener noreferrer">
    Privacy Policy
  </a>
</mat-checkbox>
  <br />
  <mat-checkbox [(ngModel)]="confirmAuthorization">
    I confirm that I am authorized to enter into this subscription on behalf of the Client
  </mat-checkbox>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button class="return-btn" (click)="cancel()">Cancel</button>
  <button
    mat-flat-button
    color="primary"
    class="confirm-btn"
    [disabled]="!allChecked()"
    (click)="confirm()"
  >
    Continue
  </button>
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
      background-color: #FBD008;
      color: #333;
    }

    .return-btn:hover {
      background-color: #e6bf00;
    }

    .confirm-btn {
      background-color: #FBD008;
      color: black;
    }

    .confirm-btn:hover {
      background-color: #e6bf00;
    }

    .confirm-btn:disabled {
      background-color: #ccc !important;
      color: #666 !important;
      cursor: not-allowed;
    }
  `]
})
export class TermsConfirmationDialogComponent {
  acceptedMSA = false;
  acknowledgedPrivacy = false;
  confirmAuthorization = false;

  constructor(private dialogRef: MatDialogRef<TermsConfirmationDialogComponent>) {}

  allChecked(): boolean {
    return this.acceptedMSA && this.acknowledgedPrivacy && this.confirmAuthorization;
  }

  cancel() {
    this.dialogRef.close(false);
  }

  confirm() {
    this.dialogRef.close(true);
  }
}
