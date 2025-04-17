import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { JobAssignmentService } from './job-assignment.service';
import { MatTableModule } from '@angular/material/table';
import { JobAssignment, JobUser } from './job-assignment.model'; // Import JobAssignmentList
import { NgForOf, NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardModule } from '@angular/material/card';
import { LoaderComponent } from '../../../loader/loader.component';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-job-assignment',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgForOf,
    MatButton,
    LoaderComponent,
    MatCard,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './job-assignment.component.html',
  styleUrls: ['./job-assignment.component.scss']
})
export class JobAssignmentComponent implements OnInit {
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  showAlert = false;
  alertMessage = '';
  jobAssignmentList: JobAssignment[] = []; // Simplified type to JobAssignment[]
  assignmentColumns: string[] = ['id', 'projectName', 'assignedUser', 'jobRole', 'phoneNumber', 'actions'];
  isSaving = false;
  selectedJob: JobAssignment | null = null; // Changed to single JobAssignment or null
  selectedUser: JobUser | null = null;
  newAssignment: { email: string; jobRole: string } = { email: '', jobRole: '' };

  constructor(private jobAssignmentService: JobAssignmentService) {}

  ngOnInit(): void {
    console.log('ngOnInit called');
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    try {
      this.jobAssignmentService.getJobAssignment().subscribe({
        next: (data: JobAssignment[]) => { // Correct type: JobAssignmentList
          this.jobAssignmentList = data || []; // Access jobAssignment property
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.showError('Failed to load job assignments. Please try again.');
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      this.showError('An unexpected error occurred.');
      this.isLoading = false;
    }
  }

  submitAssignment(): void {
    if (!this.selectedJob || !this.selectedUser || !this.newAssignment.jobRole) {
      this.showError('Please fill in all required fields');
      return;
    }

    this.isSaving = true;
    const assignmentData = {
      userId: this.selectedUser.id,
      jobId: this.selectedJob.id,
      jobRole: this.newAssignment.jobRole
    };

    this.jobAssignmentService.createJobAssignment(assignmentData).subscribe({
      next: (response: JobAssignment) => {
        this.jobAssignmentList.push(response);
        this.showSuccess('Job assignment created successfully');
        this.resetForm();
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error creating assignment:', error);
        this.showError('Failed to create job assignment');
        this.isSaving = false;
      }
    });
  }

  deleteAssignment(jobAssignment: JobAssignment): void {
    if (!jobAssignment.jobUser) {
      this.showError('No user are assigned to this project');
      return;
    }
    this.isLoading = true;
    this.jobAssignmentService.deleteJobAssignment(jobAssignment).subscribe({
      next: () => {
        this.jobAssignmentList = this.jobAssignmentList.filter(
          assignment => assignment.id !== jobAssignment.id
        );
        this.showSuccess('Job assignment deleted successfully');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error deleting assignment:', error);
        this.showError('Failed to delete job assignment');
        this.isLoading = false;
      }
    });
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = null;
    this.alertMessage = message;
    this.showAlert = true;
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = null;
    this.alertMessage = message;
    this.showAlert = true;
  }

  private resetForm(): void {
    this.selectedJob = null;
    this.newAssignment = { email: '', jobRole: '' };
  }

  closeAlert(): void {
    this.showAlert = false;
    this.alertMessage = '';
  }
}