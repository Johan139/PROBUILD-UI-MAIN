import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { JobAssignmentService } from './job-assignment.service';
import { TeamManagementService } from '../../../services/team-management.service';
import { AuthService } from '../../../authentication/auth.service';
import { MatTableModule } from '@angular/material/table';
import { JobAssignment, JobAssignmentLink, JobUser } from './job-assignment.model';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardModule } from '@angular/material/card';
import { LoaderComponent } from '../../../loader/loader.component';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { userTypes } from '../../../data/user-types';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, of } from 'rxjs';
import { startWith, map } from 'rxjs/operators';

@Component({
  selector: 'app-job-assignment',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
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
    MatDividerModule,
    MatAutocompleteModule,
    AsyncPipe,
    MatTooltipModule
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
  jobAssignmentList: JobAssignment[] = [];
  assignmentColumns: string[] = ['id', 'projectName', 'assignedUser', 'jobRole', 'phoneNumber', 'actions'];
  isSaving = false;
  selectedJob: JobAssignment | null = null;
  selectedUser: JobUser | null = null;
  userList: JobUser[] = [];
  teamMembers: any[] = [];
  newAssignment: { email: string; jobRole: string } = { email: '', jobRole: '' };
  filteredJobAssignment: { job: JobAssignment; user: JobUser }[] = [];
  jobRoles: { value: string; display: string; }[] = [];

  jobControl = new FormControl();
  userControl = new FormControl();
  filteredJobs: Observable<JobAssignment[]> = of([]);
  filteredUsers: Observable<JobUser[]> = of([]);

  constructor(
    private jobAssignmentService: JobAssignmentService,
    private cdr: ChangeDetectorRef,
    private teamManagementService: TeamManagementService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('ngOnInit called');
    this.loadInitialData();
    this.jobRoles = userTypes.filter(role => role.value !== 'GENERAL_CONTRACTOR');

  }

  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    try {
      this.jobAssignmentService.getJobAssignment().subscribe({
        next: (data: JobAssignment[]) => {
          this.jobAssignmentList = data;
          const currentUser = this.authService.currentUserSubject.value;
          if (!currentUser || !currentUser.id) {
            this.showError('User not logged in');
            this.isLoading = false;
            return;
          }
          const userId = currentUser.isTeamMember ? currentUser.inviterId : currentUser.id;
          this.teamManagementService.getTeamMembers(userId).subscribe({
            next: (data: any[]) => {
              this.teamMembers = data;
              this.userList = data.map(tm => ({
                id: tm.id,
                firstName: tm.firstName,
                lastName: tm.lastName,
                phoneNumber: tm.phoneNumber,
                userType: tm.role,
                jobRole: tm.role
              }));
              this.filteredUsers = this.userControl.valueChanges.pipe(
                startWith(''),
                map(value => {
                  if (!value) {
                    this.newAssignment.jobRole = '';
                  }
                  return this._filterUsers(value);
                })
              );
            },
            error: (error) => {
              console.error('Error getting team members', error);
              this.showError('Failed to get team members');
              this.isLoading = false;
            }
          });
          this.filteredJobs = this.jobControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterJobs(value))
          );
          this.filterAssignments();
          this.isLoading = false;
          this.cdr.detectChanges();
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

  private flattenAssignments(assignments: JobAssignment[]): { job: JobAssignment; user: JobUser }[] {
    return assignments.flatMap(job =>
      job.jobUser.map(user => ({ job, user }))
    );
  }

  private filterAssignments(): void {
    if (this.selectedJob && this.selectedJob.id !== 0) {
      this.filteredJobAssignment = this.flattenAssignments(
        this.jobAssignmentList.filter(job => job.id === this.selectedJob!.id)
      );
    } else {
      this.filteredJobAssignment = this.flattenAssignments(this.jobAssignmentList);
    }
    this.cdr.detectChanges();
  }

  submitAssignment(): void {
    if (!this.selectedJob || !this.selectedUser || !this.newAssignment.jobRole) {
      this.showError('Please fill in all required fields');
      return;
    }

    this.isSaving = true;
    const assignmentData: JobAssignmentLink = {
      userId: this.selectedUser.id,
      jobId: this.selectedJob.id,
      jobRole: this.newAssignment.jobRole
    };

    this.jobAssignmentService.createJobAssignment(assignmentData).subscribe({
      next: (response: JobAssignment) => {
        // Find the existing job in the list
        const jobIndex = this.jobAssignmentList.findIndex(job => job.id === this.selectedJob!.id);
        if (jobIndex !== -1) {
          // Update the jobUser array with the new user
          const updatedJob = {
            ...this.jobAssignmentList[jobIndex],
            jobUser: [
              ...this.jobAssignmentList[jobIndex].jobUser,
              {
                id: this.selectedUser!.id,
                firstName: this.selectedUser!.firstName,
                lastName: this.selectedUser!.lastName,
                phoneNumber: this.selectedUser!.phoneNumber,
                userType: this.selectedUser!.userType,
                jobRole: this.newAssignment.jobRole
              }
            ]
          };
          this.jobAssignmentList[jobIndex] = updatedJob;
        } else {
          // If the job doesn't exist (unlikely), add it
          this.jobAssignmentList = [...this.jobAssignmentList, response];
        }

        this.filterAssignments();
        this.showSuccess('Job assignment created successfully');
        this.resetForm();
        this.isSaving = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error creating assignment:', error);
        this.showError('Failed to create job assignment');
        this.isSaving = false;
      }
    });
  }

  deleteUserAssignment(job: JobAssignment, user: JobUser): void {
    if (!job || !user) {
      this.showError('Invalid job assignment or user');
      return;
    }
    this.isLoading = true;
    const assignmentLink: JobAssignmentLink = {
      userId: user.id,
      jobId: job.id,
      jobRole: user.jobRole || ''
    };
    this.jobAssignmentService.deleteUserAssignment(assignmentLink).subscribe({
      next: () => {
        const updatedAssignment = {
          ...job,
          jobUser: job.jobUser.filter(u => u.id !== user.id)
        };
        this.jobAssignmentList = this.jobAssignmentList.map(assignment =>
          assignment.id === job.id ? updatedAssignment : assignment
        );
        this.filterAssignments();
        this.showSuccess('Job assignment deleted successfully');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error deleting assignment:', error);
        this.showError('Failed to delete job assignment');
        this.isLoading = false;
      }
    });
  }

  private resetForm(): void {
    this.selectedUser = null;
    this.newAssignment = { email: '', jobRole: '' };
  }

  onJobSelectionChange(job: JobAssignment): void {
    this.selectedJob = job;
    this.filterAssignments();
  }

  onUserSelected(user: JobUser): void {
    this.selectedUser = user;
    if (user && user.id) {
      const selectedTeamMember = this.teamMembers.find(member => member.id === user.id);
      if (selectedTeamMember) {
        this.newAssignment.jobRole = selectedTeamMember.role;
      }
    } else {
      this.newAssignment.jobRole = '';
    }
  }

  private _filterJobs(value: string | JobAssignment): JobAssignment[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : (value.projectName || '').toLowerCase();
    const filtered = this.jobAssignmentList.filter(job => (job.projectName || '').toLowerCase().includes(filterValue));
    return [
      { id: 0, projectName: '', jobUser: [] },
      ...filtered
    ];
  }

  private _filterUsers(value: string | JobUser): JobUser[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : (value ? `${value.firstName} ${value.lastName}` : '').toLowerCase();
    const filtered = this.userList.filter(user =>
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(filterValue)
    );
    return [
      { id: '', firstName: '', lastName: '', phoneNumber: '', userType: '', jobRole: '' },
      ...filtered
    ];
  }

  displayJob(job: JobAssignment): string {
    if (job && job.id === 0) {
      return '';
    }
    return job && job.projectName ? job.projectName : '';
  }

  displayUser(user: JobUser): string {
    if (user && !user.id) {
      return '';
    }
    return user && user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '';
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

  closeAlert(): void {
    this.showAlert = false;
    this.alertMessage = '';
  }
}
