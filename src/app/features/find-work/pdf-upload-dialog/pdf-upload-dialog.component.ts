import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { FileUploadService } from '../../../services/file-upload.service';
import { BiddingService } from '../../../services/bidding.service';

@Component({
  selector: 'app-pdf-upload-dialog',
  templateUrl: './pdf-upload-dialog.component.html',
  styleUrls: ['./pdf-upload-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressBarModule,
    MatButtonModule
  ],
})
export class PdfUploadDialogComponent {
  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;

  constructor(
    public dialogRef: MatDialogRef<PdfUploadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number },
    private fileUploadService: FileUploadService,
    private biddingService: BiddingService
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUpload(): void {
    if (!this.selectedFile) {
      return;
    }

    this.isUploading = true;
    this.fileUploadService.uploadQuotePdf(this.selectedFile, this.data.jobId).subscribe({
      next: (event) => {
        if (typeof event === 'number') {
          this.uploadProgress = event;
        } else if (event.url) {
          this.biddingService.submitPdfBid(this.data.jobId, event.url).subscribe({
            next: () => {
              this.isUploading = false;
              this.dialogRef.close(true);
            },
            error: () => {
              this.isUploading = false;
              // Handle error (e.g., show a snackbar)
            }
          });
        }
      },
      error: () => {
        this.isUploading = false;
        // Handle error
      }
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
