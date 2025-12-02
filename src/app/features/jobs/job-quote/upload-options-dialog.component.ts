import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-upload-options-dialog',
  templateUrl: './upload-options-dialog.component.html',
  styleUrls: ['./upload-options-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
})
export class UploadOptionsDialogComponent {
  constructor(public dialogRef: MatDialogRef<UploadOptionsDialogComponent>) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
