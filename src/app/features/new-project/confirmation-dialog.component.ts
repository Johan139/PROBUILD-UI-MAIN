import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <h1 mat-dialog-title>{{ data.title || 'Confirm Action' }}</h1>
    <div mat-dialog-content>
      <p>{{ data.message || 'Are you sure?' }}</p>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="onNoClick()">{{ data.cancelButtonText || 'No' }}</button>
      <button mat-button [mat-dialog-close]="true" cdkFocusInitial>{{ data.confirmButtonText || 'Yes' }}</button>
    </div>
  `,
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
