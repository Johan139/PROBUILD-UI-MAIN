import { Component, Inject, OnInit } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-client-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
],
  templateUrl: './edit-client-dialog.component.html',
  styleUrls: ['./edit-client-dialog.component.scss'],
})
export class EditClientDialogComponent implements OnInit {
  clientForm: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private jobsService: JobsService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EditClientDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number },
  ) {
    this.clientForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      companyName: [''],
      position: [''],
    });
  }

  ngOnInit(): void {
    this.loadClientDetails();
  }

  loadClientDetails(): void {
    this.isLoading = true;
    this.jobsService.getClientDetails(this.data.jobId).subscribe({
      next: (details) => {
        this.clientForm.patchValue({
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          phone: details.phone,
          companyName: details.companyName,
          position: details.position,
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading client details', err);
        this.snackBar.open('Failed to load client details', 'Close', {
          duration: 3000,
        });
        this.isLoading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.clientForm.valid) {
      this.isLoading = true;
      this.jobsService
        .updateClientDetails(this.data.jobId, this.clientForm.value)
        .subscribe({
          next: () => {
            this.snackBar.open('Client details updated successfully', 'Close', {
              duration: 3000,
            });
            this.dialogRef.close(true);
          },
          error: (err) => {
            console.error('Error updating client details', err);
            this.snackBar.open('Failed to update client details', 'Close', {
              duration: 3000,
            });
            this.isLoading = false;
          },
        });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
