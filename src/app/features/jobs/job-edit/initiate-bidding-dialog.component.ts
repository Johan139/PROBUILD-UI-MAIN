import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-initiate-bidding-dialog',
  template: `
    <h1 mat-dialog-title>Initiate Bidding</h1>
    <div mat-dialog-content>
      <p>Specify the details for the bidding process.</p>
      <mat-form-field>
        <mat-label>Required Trades</mat-label>
        <input matInput [(ngModel)]="data.requiredTrades" placeholder="e.g., Plumber, Electrician">
      </mat-form-field>
      <mat-form-field>
        <mat-label>Bidding Type</mat-label>
        <mat-select [(ngModel)]="data.biddingType">
          <mat-option value="PUBLIC">Public</mat-option>
          <mat-option value="CONNECTIONS_ONLY">Connections Only</mat-option>
        </mat-select>
      </mat-form-field>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="onNoClick()">Cancel</button>
      <button mat-button [mat-dialog-close]="data" cdkFocusInitial>Initiate</button>
    </div>
  `,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ]
})
export class InitiateBiddingDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<InitiateBiddingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { requiredTrades: string, biddingType: string }
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
