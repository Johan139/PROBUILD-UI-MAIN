import { Component, OnInit, Inject, PLATFORM_ID, TemplateRef, ViewChild } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { JobsService } from '../../../services/jobs.service';
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
    MatDialogModule // ✅ THIS LINE
  ],
  templateUrl: './new-user-dashboard.component.html',
  styleUrls: ['./new-user-dashboard.component.scss']
})
export class NewUserDashboardComponent implements OnInit {
  @ViewChild('noteDetailDialog') noteDetailDialog!: TemplateRef<any>;
  userType: string = '';
  isSubContractor: boolean = false;
  isLoading: boolean = false;
  isBrowser: boolean;
  alertMessage: string = '';
  showAlert: boolean = false;
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

  openNoteDialog(note: any) {
    console.log(note.jobSubtaskId.toString())
    this.dialog.open(this.noteDetailDialog, {
      width: '500px',
      data: note
      
    });
  }
  
  approveNote(note: any) {
    console.log(note.jobSubtaskId.toString())
    const formData = new FormData();
    formData.append('Id', note.id.toString());
    formData.append('jobSubtaskId', note.jobSubtaskId.toString()); // ✅ fix here
    formData.append('Approved', 'true');
    formData.append('Rejected', 'false');
  
    this.http.post(`${BASE_URL}/Jobs/UpdateNoteStatus`, formData).subscribe({
      next: () => {
        console.log('✅ Note approved');
        this.dialog.closeAll();
      },
      error: (err) => {
        console.error('Error approving note:', err);
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
    this.jobsService.downloadJobDocument(document.id).subscribe({
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