import { Component, OnInit, Inject, PLATFORM_ID, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { CommonModule, DatePipe, NgIf, NgOptimizedImage, isPlatformBrowser } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from "@angular/material/divider";
import { GanttChartComponent } from '../../../components/gantt-chart/gantt-chart.component';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { provideNativeDateAdapter } from '@angular/material/core';
import { JobDataService } from '../../jobs/services/job-data.service';
import { AuthService } from '../../../authentication/auth.service';
import { filter, take, switchMap } from 'rxjs/operators';

const BASE_URL = environment.BACKEND_URL;
@Component({
  selector: 'app-new-user-dashboard',
  standalone: true,
  imports: [
    NgIf,
    CommonModule,
    NgOptimizedImage,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,   // ✅ ADD THIS HERE
    MatDividerModule,
    GanttChartComponent,
    LoaderComponent,
    RouterLink,
    MatDialogModule,     // ✅ ADDED HERE
    FileSizePipe,
    MatFormFieldModule,  // ✅ added
    MatInputModule,      // ✅ added
    FormsModule,
  ],
  templateUrl: './new-user-dashboard.component.html',
  styleUrls: ['./new-user-dashboard.component.scss'],
  providers: [provideNativeDateAdapter(), DatePipe],
  encapsulation: ViewEncapsulation.None
})
export class NewUserDashboardComponent implements OnInit {
  @ViewChild('noteDetailDialog') noteDetailDialog!: TemplateRef<any>;
  @ViewChild('documentsDialog') documentsDialog!: TemplateRef<any>;
  @ViewChild('approvalReasonDialog') approvalReasonDialog!: TemplateRef<any>;

  userType: string = '';
  isSubContractor: boolean = false;
  userJobs: {id: number, projectName: string, createdAt: string, progress: number }[] = [];
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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  onViewNote(note: any): void {
    // You can open a modal, route to a detail page, or fetch more info here.
  }
  ngOnInit() {
    this.isLoading = true;
    this.userType = this.userService.getUserType();

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
    this.dialog.open(this.noteDetailDialog, {
      width: '80vw',
      maxWidth: '900px',
      maxHeight: '100vh',
      panelClass: 'custom-dialog-container',
      data: group
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
    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1),
      switchMap(user => this.jobService.getAllJobsByUserId(user.id))
    ).subscribe(jobs => {
      if (!jobs) {
        this.userJobs = [];
        return;
      }

      const uniqueProjectsMap = new Map<string, any>();

      jobs.forEach(job => {
        if (!uniqueProjectsMap.has(job.projectName)) {
          uniqueProjectsMap.set(job.projectName, job);
        }
      });

      const uniqueJobs = Array.from(uniqueProjectsMap.values());

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
});
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
