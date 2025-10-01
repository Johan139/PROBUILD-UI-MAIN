import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bid-options-dialog',
  templateUrl: './bid-options-dialog.component.html',
  styleUrls: ['./bid-options-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
})
export class BidOptionsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BidOptionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number }
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
