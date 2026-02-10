import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Job } from '../../../models/job';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../../authentication/auth.service';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';
import { ProjectBlueprintViewerComponent } from '../../../components/project-blueprint-viewer/project-blueprint-viewer.component';
import { DocumentService } from '../../jobs/services/document.service';
import { UploadedFileInfo, FileUploadService } from '../../../services/file-upload.service';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoaderComponent } from '../../../loader/loader.component';

@Component({
  selector: 'app-job-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    FormsModule,
    ProjectBlueprintViewerComponent,
    LoaderComponent
  ],
  templateUrl: './job-details-dialog.component.html',
  styleUrl: './job-details-dialog.component.scss',
})
export class JobDetailsDialogComponent implements OnInit, OnDestroy {
  userTrade: string | undefined;
  tradeMatch: boolean = false;
  private userSubscription: Subscription;

  isSaved: boolean = false;
  userNotes: string = '';

  // Blueprint Viewer Data
  blueprintFiles: UploadedFileInfo[] = [];
  selectedBlueprint: UploadedFileInfo | null = null;
  blueprintPdfSrc: string | Uint8Array | null = null;
  isLoadingBlueprints: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<JobDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { job: Job, saved?: boolean, notes?: string },
    private authService: AuthService,
    private documentService: DocumentService,
    private jobsService: JobsService,
    private fileUploadService: FileUploadService,
    private snackBar: MatSnackBar
  ) {
    this.isSaved = data.saved || false;
    this.userNotes = data.notes || '';

    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      this.userTrade = user?.trade;
      this.checkTradeMatch();
    });
  }

  ngOnInit(): void {
    this.checkTradeMatch();
    if (this.data.job && this.data.job.jobId) {
        this.loadBlueprints();
    }
  }

  checkTradeMatch(): void {
    if (this.userTrade && this.data.job.trades) {
      this.tradeMatch = this.data.job.trades.includes(this.userTrade);
    }
  }

  ngOnDestroy(): void {
    if (this.userSubscription) {
        this.userSubscription.unsubscribe();
    }
  }

  onClose(): void {
    this.dialogRef.close({
        saved: this.isSaved,
        notes: this.userNotes
    });
  }

  toggleSave(): void {
    this.isSaved = !this.isSaved;
  }

  loadBlueprints(): void {
    if (!this.data.job.jobId) return;
    this.isLoadingBlueprints = true;
    // Note: The DocumentService expects string ID in some places, number in others
    this.documentService.fetchDocuments(this.data.job.jobId.toString()).subscribe({
      next: (docs) => {
        // Filter for PDFs and map to UploadedFileInfo
        this.blueprintFiles = docs
          .filter(
            (doc: any) =>
              (doc.name && doc.name.toLowerCase().endsWith('.pdf')) ||
              (doc.type && doc.type.includes('pdf')),
          )
          .map(
            (doc: any) =>
              ({
                name: doc.name || 'Untitled Document',
                url: '', // No direct URL available
                type: doc.type || 'application/pdf',
                size: doc.size || 0,
                id: doc.id,
              }) as any,
          );

        if (this.blueprintFiles.length > 0) {
          this.handleBlueprintSelected(this.blueprintFiles[0]);
        } else {
          this.isLoadingBlueprints = false;
        }
      },
      error: (err) => {
        console.error('Error loading blueprints', err);
        this.isLoadingBlueprints = false;
        // Suppress snackbar if it's just "no docs found" 404, otherwise show
        // this.snackBar.open('Failed to load blueprints.', 'Close', { duration: 3000 });
      },
    });
  }

  handleBlueprintSelected(file: UploadedFileInfo): void {
    this.selectedBlueprint = file;
    this.isLoadingBlueprints = true;

    const docId = (file as any).id;
    if (docId) {
      this.jobsService.downloadJobDocument(docId).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              this.blueprintPdfSrc = new Uint8Array(
                reader.result as ArrayBuffer,
              );
              this.isLoadingBlueprints = false;
            }
          };
          reader.readAsArrayBuffer(blob);
        },
        error: (err) => {
          console.error('Error downloading document', err);
          this.isLoadingBlueprints = false;
          this.snackBar.open('Failed to load blueprint content.', 'Close', {
            duration: 3000,
          });
        },
      });
    } else if (file.url) {
      this.fileUploadService.getFile(file.url).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              this.blueprintPdfSrc = new Uint8Array(
                reader.result as ArrayBuffer,
              );
              this.isLoadingBlueprints = false;
            }
          };
          reader.readAsArrayBuffer(blob);
        },
        error: (err) => {
          console.error('Error fetching blueprint blob', err);
          this.isLoadingBlueprints = false;
          this.snackBar.open('Failed to load blueprint file.', 'Close', {
            duration: 3000,
          });
        },
      });
    }
  }
}
