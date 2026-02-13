import { Component, inject, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';
import { FileSizePipe } from '../features/Documents/filesize.pipe';
import { JobsService } from '../services/jobs.service';

@Component({
  selector: 'app-quote-documents-dialog',
  standalone: true,
  imports: [MatDialogModule, CommonModule, LoaderComponent, FileSizePipe],
  template: `
    <div class="documents-dialog">
      <h2 mat-dialog-title>Quote Documents</h2>
      <mat-dialog-content>
        <!-- Show loading indicator while fetching documents -->
        <div *ngIf="isLoading" class="loading-documents">
          <app-loader></app-loader>
          <p>Loading documents...</p>
        </div>
        <!-- Show content only when not loading -->
        <div *ngIf="!isLoading">
          <div *ngIf="documents.length === 0 && !error" class="no-documents">
            <p>No documents available for this quote.</p>
          </div>
          <div *ngIf="error" class="no-documents">
            <p>{{ error }}</p>
          </div>
          <div *ngIf="documents.length > 0" class="documents-list">
            <div class="document-item" *ngFor="let doc of documents">
              <div class="document-info">
                <span class="document-name">{{ doc.name }}</span>
                <span class="document-meta">
                  {{ doc.type }} - {{ doc.size | filesize }}
                </span>
              </div>
              <button class="view-btn" mat-button (click)="viewDocument(doc)">
                View
              </button>
            </div>
          </div>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button class="submit-btn" mat-raised-button (click)="close()">
          Cancel
        </button>
        <button
          class="submit-btn"
          mat-flat-button
          color="primary"
          (click)="close()"
        >
          Continue
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .submit-btn {
        background: #fbd008;
        border-radius: 10px;
        padding: 0 16px;
        font-weight: 500;
        color: #000000;
        margin: 0 0.5rem;
      }

      .submit-btn:hover {
        background: #e6bf00;
      }

      .view-btn {
        background-color: #fbd008;
        color: #000000;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        min-width: 40px;
        padding: 0;
        line-height: 40px;
        text-align: center;
        margin-left: 1rem;
        box-shadow: none;
        border: none;
      }

      .view-btn:hover {
        background-color: #e6bf00;
      }

      .document-meta {
        font-size: 0.85rem;
        color: #333333;
        margin-left: 0.5rem;
        display: inline;
      }

      .document-name {
        font-size: 0.9rem;
        display: inline;
        word-break: break-all;
      }

      .document-info {
        display: flex;
        flex-direction: row;
        align-items: center;
        overflow: hidden;
        white-space: nowrap;
      }

      .document-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: none;
      }

      .documents-list {
        max-height: 60vh;
        overflow-y: auto;
        padding: 0;
      }

      .no-documents {
        text-align: center;
        padding: 1rem;
        color: #333333;
      }

      .no-documents p {
        margin: 0;
        font-size: 1rem;
      }

      .loading-documents {
        text-align: center;
        padding: 1rem;
        color: #333333;
      }

      .loading-documents p {
        margin: 0.5rem 0 0;
        font-size: 1rem;
      }

      .documents-dialog {
        padding: 0.5rem;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      }
    `,
  ],
})
export class QuoteDocumentsDialogComponent {
  private dialogRef = inject(MatDialogRef<QuoteDocumentsDialogComponent>);
  private data = inject<{ fileUrls: string[] }>(MAT_DIALOG_DATA);

  documents: any[] = [];
  isLoading = true;
  error = '';

  constructor(private jobsService: JobsService) {
    this.fetchDocuments();
  }

  fetchDocuments(): void {
    if (!this.data?.fileUrls || this.data.fileUrls.length === 0) {
      this.error = 'No uploaded documents available.';
      this.isLoading = false;
      return;
    }

    this.documents = this.data.fileUrls.map((url, index) => {
      const name = decodeURIComponent(
        url.split('/').pop() || `Document-${index + 1}`,
      );
      return {
        name,
        type: this.getFileType(name),
        size: this.getFileSize(url),
        url,
      };
    });
    // console.log(this.documents);
    this.isLoading = false;
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
      case 'docx':
      case 'doc':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx':
      case 'xls':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  }

  getFileSize(url: string): number {
    try {
      return 840 * 1024; // 840 KB in bytes
    } catch (e) {
      console.error('Error fetching file size:', e);
      return 0;
    }
  }

  viewDocument(doc: any) {
    const blobUrl = doc.url;
    this.jobsService.downloadJobDocumentFile(blobUrl).subscribe({
      next: (response: Blob) => {
        const contentType = doc.type;
        // console.log('Content Type:', contentType);
        const blob = new Blob([response], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');

        if (newTab) {
          setTimeout(() => window.URL.revokeObjectURL(url), 10000);
        } else {
          console.error('Failed to open new tab');
        }
      },
      error: (err) => {
        console.error('Error viewing document:', err);
      },
    });
  }

  close() {
    this.dialogRef.close();
  }
}
