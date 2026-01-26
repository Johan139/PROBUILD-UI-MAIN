import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-category-picker-dialog',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    MatRadioModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
  ],
  template: `
    <h2 mat-dialog-title>Generate Quote</h2>

    <mat-dialog-content style="min-height: 200px; padding: 20px;">
      <mat-radio-group [(ngModel)]="mode">
        <mat-radio-button value="PROJECT"> Whole Project </mat-radio-button>
        <mat-radio-button value="PHASE"> Specific Phase </mat-radio-button>
      </mat-radio-group>

      <mat-form-field
        *ngIf="mode === 'PHASE' && safePhaseList.length > 0"
        appearance="outline"
        style="width: 100%; margin-top: 16px;"
      >
        <mat-label>Select Phase</mat-label>
        <mat-select [(ngModel)]="selectedPhase">
          <mat-option
            *ngFor="let phase of safePhaseList ?? []"
            [value]="phase.phase"
          >
            {{ phase.phase }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button
        mat-raised-button
        color="primary"
        (click)="confirm()"
        [disabled]="mode === 'PHASE' && !selectedPhase"
      >
        Generate
      </button>
    </mat-dialog-actions>
  `,
})
export class CategoryPickerDialogComponent {
  mode: 'PROJECT' | 'PHASE' = 'PROJECT';
  selectedPhase: string | null = null;

  // ✅ MUST be initialized immediately
  safePhaseList: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<CategoryPickerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: any,
  ) {
    const raw = data?.phases;

    if (Array.isArray(raw)) {
      this.safePhaseList = raw;
    } else if (raw && typeof raw === 'object') {
      this.safePhaseList = Object.values(raw);
    } else {
      this.safePhaseList = [];
    }
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    this.dialogRef.close({
      mode: this.mode,
      selectedPhase: this.selectedPhase,
    });
  }
}
