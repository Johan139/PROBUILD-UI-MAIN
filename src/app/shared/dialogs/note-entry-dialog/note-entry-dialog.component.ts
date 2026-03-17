import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export type NoteEntryVisibility = 'private' | 'team-only' | 'public';

export interface NoteEntryDialogData {
  title?: string;
  text?: string;
  visibility?: NoteEntryVisibility;
  maxLength?: number;
}

export interface NoteEntryDialogResult {
  text: string;
  visibility: NoteEntryVisibility;
}

@Component({
  selector: 'app-note-entry-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title || 'Add Note' }}</h2>
    <mat-dialog-content>
      <p style="margin: 0 0 10px; font-size: 12px; color: var(--color-text-muted);">Default visibility: Private</p>
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 8px;">
        <mat-label>Note</mat-label>
        <textarea
          matInput
          [(ngModel)]="text"
          [maxlength]="maxLength"
          rows="5"
          placeholder="Enter your note"
        ></textarea>
      </mat-form-field>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <mat-form-field appearance="outline" style="min-width: 180px;">
          <mat-label>Visibility</mat-label>
          <mat-select [(ngModel)]="visibility">
            <mat-option value="private">Private</mat-option>
            <mat-option value="team-only">Team only</mat-option>
            <mat-option value="public">Public</mat-option>
          </mat-select>
        </mat-form-field>

        <span style="font-size: 12px; color: var(--color-text-muted);">{{ remaining }} characters remaining</span>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
      <button mat-button class="btn btn-primary" (click)="onSave()" [disabled]="!canSave()">Save</button>
    </mat-dialog-actions>
  `,
})
export class NoteEntryDialogComponent {
  text = '';
  visibility: NoteEntryVisibility = 'private';
  maxLength = 2000;

  constructor(
    public dialogRef: MatDialogRef<NoteEntryDialogComponent, NoteEntryDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: NoteEntryDialogData,
  ) {
    this.maxLength = data?.maxLength || 2000;
    this.text = data?.text || '';
    this.visibility = data?.visibility || 'private';
  }

  get remaining(): number {
    return this.maxLength - (this.text?.length || 0);
  }

  canSave(): boolean {
    const trimmed = (this.text || '').trim();
    return trimmed.length > 0 && trimmed.length <= this.maxLength;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSave(): void {
    if (!this.canSave()) {
      return;
    }

    this.dialogRef.close({
      text: this.text.trim(),
      visibility: this.visibility,
    });
  }
}

