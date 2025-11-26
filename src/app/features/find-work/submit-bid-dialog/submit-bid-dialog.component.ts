import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FileUploadService } from '../../../services/file-upload.service';
import { BiddingService } from '../../../services/bidding.service';
import { CommonModule } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PdfViewerComponent } from '../../../components/pdf-viewer/pdf-viewer.component';
import { ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-submit-bid-dialog',
    templateUrl: './submit-bid-dialog.component.html',
    styleUrls: ['./submit-bid-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        MatStepperModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressBarModule,
        PdfViewerComponent,
        MatDialogModule
    ]
})

export class SubmitBidDialogComponent implements OnInit {
  @ViewChild('stepper')
  stepper!: MatStepper;
  selection: 'create' | 'upload' | null = null;
  currentStep = 1;
  selectedFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  uploadedFileUrl: string | null = null;
  uploadComplete = false;

  constructor(
    public dialogRef: MatDialogRef<SubmitBidDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number },
    private fileUploadService: FileUploadService,
    private biddingService: BiddingService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
  }

  selectOption(selection: 'create' | 'upload'): void {
    this.selection = selection;
    if (selection === 'create') {
      this.dialogRef.close('create');
    }
  }

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
          this.uploadedFileUrl = event.url;
          this.isUploading = false;
          this.uploadComplete = true;
          this.stepper.next();
          this.snackBar.open('File uploaded successfully', 'Close', {
            duration: 3000
          });
        }
      },
      error: () => {
        this.isUploading = false;
        // Handle error
      }
    });
  }

  submitBid(): void {
    if (!this.uploadedFileUrl) {
      return;
    }

    this.biddingService.submitPdfBid(this.data.jobId, this.uploadedFileUrl).subscribe({
      next: () => {
        this.dialogRef.close(true);
        this.snackBar.open('Bid submitted successfully', 'Close', {
          duration: 3000
        });
      },
      error: () => {
        // Handle error
      }
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
