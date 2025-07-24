import { Component, OnInit, Inject, PLATFORM_ID, TemplateRef, ViewChild } from '@angular/core';
import { Router } from "@angular/router";
import { CommonModule, DatePipe, NgIf, isPlatformBrowser } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { LoaderComponent } from '../../../loader/loader.component';
import { LoginService } from "../../../services/login.service";
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { JobsService } from '../../../services/jobs.service';
import { FileSizePipe } from '../../Documents/filesize.pipe';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input'; // also needed for matInput
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JobDataService } from '../../jobs/services/job-data.service';
import { AuthService } from '../../../authentication/auth.service';
import { filter, take, switchMap } from 'rxjs/operators';
import { TeamManagementService } from '../../../services/team-management.service';
import { NoteDetailDialogComponent } from '../../../shared/dialogs/note-detail-dialog/note-detail-dialog.component';

const BASE_URL = environment.BACKEND_URL;
@Component({
  selector: 'app-new-user-dashboard',
  standalone: true,
  imports: [
    NgIf,
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatDividerModule,
    LoaderComponent,
    MatDialogModule,
    FileSizePipe,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatMenuModule,
    MatIconModule,
    MatTableModule
],
  templateUrl: './new-user-dashboard.component.html',
  styleUrls: ['./new-user-dashboard.component.scss'],
  providers: [provideNativeDateAdapter(), DatePipe]
})
export class NewUserDashboardComponent implements OnInit {
  @ViewChild('documentsDialog') documentsDialog!: TemplateRef<any>;
  @ViewChild('approvalReasonDialog') approvalReasonDialog!: TemplateRef<any>;

  userType: string = '';
  isSubContractor: boolean = false;
  userJobs: {id: number, projectName: string, createdAt: string, progress: number }[] = [];
  jobDisplayedColumns: string[] = ['project', 'created', 'progress', 'actions'];
  jobsLoading: boolean = false;
  isLoading: boolean = false;
  documentDialogRef: MatDialogRef<any> | null = null;
  projectDetails: any;
  isApprovalMode = false;
  approvalReason: string = '';
  groupedNotes: { [subtaskId: string]: any[] } = {};
  approvalReasonDialogRef: MatDialogRef<any> | null = null;
  isBrowser: boolean;
  showApprovalInput: boolean = false;
  noteBeingApproved: any = null;
  alertMessage: string = '';
  showAlert: boolean = false;
  documents: any[] = [];
  isDocumentsLoading: boolean = false;
  documentsError: string | null = null;
  notes: any[] = [];
  taskData: any[] = [
    { id: '1', name: 'Roof Structure', start: new Date(2025, 2, 1), end: new Date(2025, 2, 15), progress: 0, dependencies: null },
    { id: '2', name: 'Foundation', start: new Date(2025, 1, 1), end: new Date(2025, 1, 20), progress: 20, dependencies: null },
    { id: '3', name: 'Wall Structure', start: new Date(2025, 1, 21), end: new Date(2025, 2, 10), progress: 0, dependencies: '2' },
  ];
  teams: any[] = [];
  selectedTeam: any = null;

  constructor(
    private userService: LoginService,
     private datePipe: DatePipe,
    private router: Router,
    private dialog: MatDialog,
    private jobService: JobsService,
    private jobsService: JobsService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private jobDataService: JobDataService,
    private authService: AuthService,
    private teamManagementService: TeamManagementService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  onViewNote(note: any): void {
    // You can open a modal, route to a detail page, or fetch more info here.
  }

  getNoteStatus(note: any): string {
    if (!note.notes || note.notes.length === 0) {
      return 'Pending';
    }
    const lastNote = note.notes[note.notes.length - 1];
    if (lastNote.approved) {
      return 'Approved';
    }
    if (lastNote.rejected) {
      return 'Rejected';
    }
    if (lastNote.archived) {
      return 'Archived';
    }
    return 'Pending';
  }
  ngOnInit() {
    this.isLoading = true;
    this.userType = this.userService.getUserType();

    if (this.authService.isTeamMember()) {
      this.teamManagementService.getMyTeams().subscribe(teams => {
        this.teams = teams;
        console.log('Teams:', teams);
        if (teams && teams.length > 0) {
          this.selectedTeam = teams[0];
        }
      });
    }

    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1),
      switchMap(user => {
        return this.http.get(`${BASE_URL}/Jobs/GetNotesByUserId/${user.id}`);
      })
    ).subscribe({
      next: (notes: any) => {
        this.notes = notes.map(note => ({
          ...note,
          status: this.getNoteStatus(note)
        }));
        this.groupedNotes = this.groupNotesBySubtask(this.notes);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
      }
    });

    this.loadUserJobs();
    this.isSubContractor = this.userType === 'SUBCONTRACTOR' || this.userType === 'CONSTRUCTION';

    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
  }

  closeDocumentsDialog() {
    if (this.documentDialogRef) {
      this.documentDialogRef.close();
      this.documentDialogRef = null; // optionally clear it
    } else {
    }
  }

  openNoteDialog(group: any) {
    const dialogRef = this.dialog.open(NoteDetailDialogComponent, {
      width: '80vw',
      maxWidth: '900px',
      maxHeight: '100vh',
      panelClass: 'custom-dialog-container',
      data: group
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.refreshNotes();
      }
    });
  }


  loadJob(id: any): void {
    this.jobDataService.navigateToJob({ jobId: id }, 'MM/dd/yyyy');
  }

  onApprovalReasonChanged(event: any) {
    this.approvalReason = event.target.innerText.trim();
  }

  submitApproval() {
    if (!this.approvalReason.trim()) {
      alert('Please enter an approval reason.');
      return;
    }

    const formData = new FormData();
    //formData.append('Id', this.noteBeingApproved.Id.toString());
    formData.append('jobSubtaskId', this.noteBeingApproved.jobSubtaskId.toString());
    formData.append('Approved', 'true');
    formData.append('Rejected', 'false');
    formData.append('JobId', this.noteBeingApproved.jobId);
    formData.append('NoteText', this.approvalReason);
    formData.append("CreatedByUserId", localStorage.getItem("userId") || "");

    this.http.post(`${BASE_URL}/Jobs/UpdateNoteStatus`, formData).subscribe({
      next: () => {
        this.snackBar.open('Note saved successfully!', 'Close', {
          duration: 3000,
          panelClass: ['custom-snackbar']
        });
        this.approvalReasonDialogRef?.close(); // Close the dialog
        this.dialog.closeAll(); // Also close the note details if needed
        this.resetApproval();
      },
      error: (err) => {
        this.snackBar.open('Failed to save note. Try again.', 'Close', {
          duration: 4000,
          panelClass: ['custom-snackbar']
        });
      }
    });
  }

  cancelApproval() {
    this.approvalReasonDialogRef?.close();
    this.resetApproval();
  }

  groupNotesBySubtask(notes: any[]): { [subtaskId: string]: any[] } {
    const grouped: { [subtaskId: string]: any[] } = {};

    notes.forEach(note => {
      const subtaskId = note.jobSubtaskId;

      if (!grouped[subtaskId]) {
        grouped[subtaskId] = [];
      }
      grouped[subtaskId].push(note);
    });

    return grouped;
  }

  refreshNotes() {
    this.isLoading = true;
    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1),
      switchMap(user => {
        return this.http.get(`${BASE_URL}/Jobs/GetNotesByUserId/${user.id}`);
      })
    ).subscribe({
      next: (notes: any) => {
        this.notes = notes;
        this.groupedNotes = this.groupNotesBySubtask(notes);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
      }
    });
  }

  isMine(note: any): boolean {
    const myUserId = localStorage.getItem('userId');
    return note.createdByUserId?.toString() === myUserId;
  }

  groupedSubtaskIds(): string[] {
    return Object.keys(this.groupedNotes);
  }

  resetApproval() {
    this.showApprovalInput = false;
    this.noteBeingApproved = null;
    this.approvalReason = '';
  }

  calculateJobProgress(subtasks: any[]): number {
    const completedDays = subtasks
      .filter(st => st.status?.toLowerCase() === 'completed')
      .reduce((sum, st) => sum + st.days, 0);

    const totalDays = subtasks.reduce((sum, st) => sum + st.days, 0);

    return totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  }

  loadUserJobs() {
    this.jobsLoading = true;
    const isTeamMember = this.authService.isTeamMember();
    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1),
      switchMap(user => {
        if (isTeamMember) {
          return this.jobService.getAssignedJobsForTeamMember(user.id);
        } else {
          return this.jobService.getAllJobsByUserId(user.id);
        }
      })
    ).subscribe({
      next: jobs => {
        if (!jobs) {
          this.userJobs = [];
          this.jobsLoading = false;
          return;
        }

        const uniqueProjectsMap = new Map<string, any>();

        const nonArchivedJobs = jobs.filter(job => job.status !== 'ARCHIVED');

        nonArchivedJobs.forEach(job => {
          if (!uniqueProjectsMap.has(job.projectName)) {
            uniqueProjectsMap.set(job.projectName, job);
          }
        });

        const uniqueJobs = Array.from(uniqueProjectsMap.values());

        if (uniqueJobs.length === 0) {
          this.userJobs = [];
          this.jobsLoading = false;
          return;
        }

        // Now for each unique job, fetch its subtasks separately:
        const jobProgressPromises = uniqueJobs.map(job =>
          this.jobsService.getJobSubtasks(job.id).toPromise().then(subtasks => {
            const progress = this.calculateJobProgress(subtasks || []);

            return {
              id: job.id,
              projectName: job.projectName,
              createdAt: job.desiredStartDate,
              progress
            };
          }).catch(err => {
            return {
              id: job.id,
              projectName: job.projectName,
              createdAt: job.createdAt,
              progress: 0
            };
          })
        );

        Promise.all(jobProgressPromises).then(results => {
          this.userJobs = results.sort((a, b) => b.progress - a.progress);
          this.jobsLoading = false;
        });
      },
      error: (err) => {
        this.userJobs = [];
        this.jobsLoading = false;
      }
    });
  }

  archiveJob(jobId: number): void {
    this.jobService.archiveJob(jobId).subscribe({
      next: () => {
        this.snackBar.open('Job archived successfully!', 'Close', {
          duration: 3000,
        });
        this.loadUserJobs();
      },
      error: () => {
        this.snackBar.open('Failed to archive job.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  startApproval(note: any) {
    this.noteBeingApproved = note;
    this.approvalReason = ''; // Clear previous reason if any
    this.approvalReasonDialogRef = this.dialog.open(this.approvalReasonDialog, {
      width: '80vw', // 80% of the viewport width
      maxWidth: '900px', // Cap the maximum width
      maxHeight: '100vh',
      autoFocus:true,
      panelClass: 'custom-dialog-container',
      data: { approvalReason: '' }
    });
  }

  getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }

  fetchDocuments(noteId: number): void {
    this.isDocumentsLoading = true;
    this.documentsError = null;
    this.documents = [];
    this.http.get<any[]>(`${BASE_URL}/Jobs/GetNoteDocuments/${noteId}`).subscribe({
      next: (docs) => {
        if (!docs || docs.length === 0) {
          this.documentsError = 'No documents found for this note.';
          this.isDocumentsLoading = false;
          return;
        }
        this.documents = docs.map(doc => ({
          id: doc.id,
          name: doc.fileName,
          type: this.getFileType(doc.fileName),
          size: doc.size,
          url: doc.fileUrl
        }));
        this.isDocumentsLoading = false;
      },
      error: (err) => {
        this.documentsError = err.error?.message;
        this.isDocumentsLoading = false;
      }
    });
  }

  openDocumentsDialog(note: any) {
    const activeElement = document.activeElement as HTMLElement;

    this.fetchDocuments(note.jobSubtaskId); // ✅ pass the note ID

    this.documentDialogRef = this.dialog.open(this.documentsDialog, {
      width: '500px',
      maxHeight: '80vh',
      autoFocus: true
    });
    this.documentDialogRef.afterClosed().subscribe(() => {
      if (activeElement) {
        activeElement.focus();
      }
    });

  }

  rejectNote(note: any) {
    const formData = new FormData();
    formData.append('Id', note.id.toString());
    formData.append('Approved', 'false');
    formData.append('jobSubtaskId', note.jobSubtaskId.toString()); // ✅ fix here
    formData.append('Rejected', 'true');

    this.http.post(`${BASE_URL}/Jobs/UpdateNoteStatus`, formData).subscribe({
      next: () => {
        this.dialog.closeAll();
      },
      error: (err) => {
      }
    });
  }

  viewDocument(document: any) {
    this.jobsService.downloadNoteDocument(document.id).subscribe({
      next: (response: Blob) => {
        const blob = new Blob([response], { type: document.type });
        const url = window.URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');
        if (!newTab) {
          this.alertMessage = 'Failed to open document. Please allow pop-ups for this site.';
          this.showAlert = true;
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: (err) => {
        this.alertMessage = 'Failed to view document.';
        this.showAlert = true;
      }
    });
  }

  Close() {
    // You can make an API call here
    this.dialog.closeAll();
  }

  navigateToProjects() {
    this.router.navigateByUrl('/projects');
  }

  navigateToJobs() {
    this.router.navigateByUrl('job-quote');
  }
}
