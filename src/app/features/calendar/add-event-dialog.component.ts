import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTimepickerModule } from '@angular/material/timepicker';

@Component({
    selector: 'app-add-event-dialog',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatDividerModule,
        CommonModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatDialogContent,
        MatDialogActions
    ],
    templateUrl: './add-event-dialog.component.html',
    styleUrls: ['./add-event-dialog.component.scss'],
})
export class AddEventDialogComponent {
  eventForm: FormGroup;

  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<AddEventDialogComponent>) {
    this.eventForm = this.fb.group({
      title: ['', Validators.required],
      startDate: ['', Validators.required],
      startTime: [''],
      endDate: [''],
      endTime: [''],
      description: ['']
    });
  }

  onSave(): void {
    if (this.eventForm.valid) {
      const { startDate, startTime, endDate, endTime } = this.eventForm.value;

      const startDateTime = this.combineDateAndTime(startDate, startTime);
      const endDateTime = this.combineDateAndTime(endDate, endTime);

      const eventData = {
        ...this.eventForm.value,
        startDate: startDateTime,
        endDate: endDateTime,
      };
      delete eventData.startTime;
      delete eventData.endTime;

      this.dialogRef.close(eventData);
    }
  }

  private combineDateAndTime(date: Date, time: string): Date | null {
    if (!date) return null;
    if (!time) return date;

    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes);
    return newDate;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
