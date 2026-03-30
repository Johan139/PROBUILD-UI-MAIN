import { Component } from '@angular/core';

import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-post-job-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule
],
  templateUrl: './post-job-dialog.component.html',
  styleUrls: ['./post-job-dialog.component.scss']
})
export class PostJobDialogComponent {
  jobData = {
    trade: '',
    projectName: '',
    description: '',
    budgetMin: '',
    budgetMax: '',
    startDate: null,
    duration: '',
    laborType: 'Labor and Materials'
  };

  trades = [
    'Electrical', 'Plumbing', 'HVAC', 'Roofing', 'Concrete', 'Framing',
    'Drywall', 'Painting', 'Flooring', 'Landscaping'
  ];

  constructor(public dialogRef: MatDialogRef<PostJobDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.jobData.trade && this.jobData.projectName) {
      this.dialogRef.close(this.jobData);
    }
  }
}
