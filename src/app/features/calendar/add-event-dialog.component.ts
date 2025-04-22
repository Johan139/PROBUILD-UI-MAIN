import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-event-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    CommonModule
  ],
  template: `
    <h2 mat-dialog-title>Add New Event</h2>
    <mat-dialog-content>
      <form [formGroup]="eventForm">
        <mat-form-field appearance="fill">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" placeholder="Event Title" />
          <mat-error *ngIf="eventForm.get('title')?.hasError('required')">
            Title is required
          </mat-error>
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Start Date</mat-label>
          <input matInput type="date" formControlName="startDate" />
          <mat-error *ngIf="eventForm.get('startDate')?.hasError('required')">
            Start Date is required
          </mat-error>
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>End Date</mat-label>
          <input matInput type="date" formControlName="endDate" />
        </mat-form-field>
        <mat-form-field appearance="fill">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Event Description"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button class="submit-btn" [disabled]="eventForm.invalid" (click)="onSave()">Save</button>
    </mat-dialog-actions>
  `,
  styles: []
})
export class AddEventDialogComponent {
  eventForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddEventDialogComponent>
  ) {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      description: ['']
    });
  }

  onSave(): void {
    if (this.eventForm.valid) {
      this.dialogRef.close(this.eventForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}