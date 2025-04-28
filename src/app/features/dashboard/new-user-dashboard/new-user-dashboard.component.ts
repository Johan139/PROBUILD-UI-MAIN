import { Component, OnInit, Inject, PLATFORM_ID, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from "@angular/router";
import { CommonModule, NgIf, NgOptimizedImage, isPlatformBrowser } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule, MatCardHeader, MatCardTitle, MatCardContent } from "@angular/material/card";
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
import { MatInputModule } from '@angular/material/input'; // also needed for matInput
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
    MatDividerModule,
    GanttChartComponent,
    LoaderComponent,
    RouterLink,
    MatDialogModule,     // ✅ ADDED HERE
    FileSizePipe,
    MatFormFieldModule,  // ✅ added
    MatInputModule,      // ✅ added
    FormsModule     
  ],
  templateUrl: './new-user-dashboard.component.html',
  styleUrls: ['./new-user-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class NewUserDashboardComponent implements OnInit {
  @ViewChild('noteDetailDialog') noteDetailDialog!: TemplateRef<any>;
  @ViewChild('documentsDialog') documentsDialog!: TemplateRef<any>;
  @ViewChild('approvalReasonDialog') approvalReasonDialog!: TemplateRef<any>;

  userType: string = '';
  isSubContractor: boolean = false;
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
    
    private router: Router,
    private dialog: MatDialog,
    private jobsService: JobsService,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  onViewNote(note: any): void {
    console.log('View clicked for note:', note);
    // You can open a modal, route to a detail page, or fetch more info here.
  }
  ngOnInit() {
    this.isLoading = true;
    this.userType = this.userService.getUserType();

    const userId = localStorage.getItem('userId');
    this.http.get(`${BASE_URL}/Jobs/GetNotesByUserId/${userId}`).subscribe({
      next: (notes: any) => {
        this.notes = notes;
        this.groupedNotes = this.groupNotesBySubtask(notes);
        this.isLoading = false;
        console.log('Notes loaded:', this.notes);
      },
      error: (err) => {
        console.error('Error loading notes:', err);
        this.isLoading = false;
      }
    });
 
    console.log(this.userType);
    this.isSubContractor = this.userType === 'BUILDER' || this.userType === 'CONSTRUCTION';
    console.log(this.isSubContractor);
    setTimeout(() => {
      this.isLoading = false;
    }, 1000); // Simulate loading
  }
  closeDocumentsDialog() {
    if (this.documentDialogRef) {
      this.documentDialogRef.close();
      this.documentDialogRef = null; // optionally clear it
    } else {
      console.warn('Document dialog ref is not set.');
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
        console.log('✅ Note approved with reason');
        this.approvalReasonDialogRef?.close(); // Close the dialog
        this.dialog.closeAll(); // Also close the note details if needed
        this.resetApproval();
      },
      error: (err) => {
        console.error('Error approving note:', err);
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
        console.error('Error fetching note documents:', err);
        this.documentsError = 'Failed to load documents.';
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
        console.log('❌ Note rejected');
        this.dialog.closeAll();
      },
      error: (err) => {
        console.error('Error rejecting note:', err);
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
        console.error('Error viewing document:', err);
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
