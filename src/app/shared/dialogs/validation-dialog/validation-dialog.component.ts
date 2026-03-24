import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { LucideIconsModule } from '../../lucide-icons.module';

export interface ValidationDialogData {
  title: string;
  completed: string[];
  missing: string[];
}

@Component({
  selector: 'app-validation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, LucideIconsModule],
  templateUrl: './validation-dialog.component.html',
  styleUrl: './validation-dialog.component.scss',
})
export class ValidationDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ValidationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ValidationDialogData,
  ) {}

  get totalCount(): number {
    return this.data.completed.length + this.data.missing.length;
  }

  get progressPercent(): number {
    if (this.totalCount === 0) {
      return 0;
    }

    return (this.data.completed.length / this.totalCount) * 100;
  }

  close(): void {
    this.dialogRef.close();
  }
}
