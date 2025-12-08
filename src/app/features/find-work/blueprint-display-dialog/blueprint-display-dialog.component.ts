import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ProjectBlueprintViewerComponent } from '../../../components/project-blueprint-viewer/project-blueprint-viewer.component';
import { DocumentService } from '../../../features/jobs/services/document.service';
import { UploadedFileInfo, FileUploadService } from '../../../services/file-upload.service';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoaderComponent } from '../../../loader/loader.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-blueprint-display-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ProjectBlueprintViewerComponent,
    LoaderComponent,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './blueprint-display-dialog.component.html',
  styleUrls: ['./blueprint-display-dialog.component.scss']
})
export class BlueprintDisplayDialogComponent implements OnInit {
  blueprintFiles: UploadedFileInfo[] = [];
  selectedBlueprint: UploadedFileInfo | null = null;
  blueprintPdfSrc: string | Uint8Array | null = null;
  isLoadingBlueprints: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number, projectName: string },
    public dialogRef: MatDialogRef<BlueprintDisplayDialogComponent>,
    private documentService: DocumentService,
    private jobsService: JobsService,
    private fileUploadService: FileUploadService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadBlueprints();
  }

  loadBlueprints(): void {
    if (!this.data.jobId) return;
    this.isLoadingBlueprints = true;
    this.documentService.fetchDocuments(this.data.jobId.toString()).subscribe({
      next: (docs) => {
        // Filter for PDFs and map to UploadedFileInfo
        this.blueprintFiles = docs
          .filter(
            (doc: any) =>
              (doc.name && doc.name.toLowerCase().endsWith('.pdf')) ||
              (doc.type && doc.type.includes('pdf'))
          )
          .map(
            (doc: any) =>
              ({
                name: doc.name || 'Untitled Document',
                url: '', // No direct URL available
                type: doc.type || 'application/pdf',
                size: doc.size || 0,
                id: doc.id,
              }) as any
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
        this.snackBar.open('Failed to load blueprints.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  handleBlueprintSelected(file: UploadedFileInfo): void {
    this.selectedBlueprint = file;
    this.isLoadingBlueprints = true;

    const docId = (file as any).id;
    if (docId) {
      // Check cache first
      const cachedBlob = this.documentService.getCachedDocument(docId);
      if (cachedBlob) {
        this.displayBlob(cachedBlob);
      } else {
        this.jobsService.downloadJobDocument(docId).subscribe({
          next: (blob) => {
            this.documentService.cacheDocument(docId, blob);
            this.displayBlob(blob);
          },
          error: (err) => {
            console.error('Error downloading document', err);
            this.isLoadingBlueprints = false;
            this.snackBar.open('Failed to load blueprint content.', 'Close', {
              duration: 3000,
            });
          },
        });
      }
    } else if (file.url) {
      this.fileUploadService.getFile(file.url).subscribe({
        next: (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              this.blueprintPdfSrc = new Uint8Array(
                reader.result as ArrayBuffer
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

  private displayBlob(blob: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        this.blueprintPdfSrc = new Uint8Array(reader.result as ArrayBuffer);
        this.isLoadingBlueprints = false;
      }
    };
    reader.readAsArrayBuffer(blob);
  }

  close(): void {
    this.dialogRef.close();
  }
}
