import { Component, Input } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InvoiceService } from '../../services/invoice.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-invoice-upload',
  templateUrl: './invoice-upload.component.html',
  styleUrls: ['./invoice-upload.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressBarModule, CommonModule],
})
export class InvoiceUploadComponent {
  @Input() jobId!: number;
  uploadForm: FormGroup;
  fileToUpload: File | null = null;
  isUploading = false;
  progress = 0;
  filePreviewUrl: SafeResourceUrl | null = null;

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer,
  ) {
    this.uploadForm = this.fb.group({
      invoice: [null, Validators.required],
      amount: [
        null,
        [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)],
      ],
    });
  }

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList[0]) {
      this.fileToUpload = fileList[0];
      this.filePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        URL.createObjectURL(this.fileToUpload),
      );
    } else {
      this.fileToUpload = null;
      this.filePreviewUrl = null;
    }
  }

  onSubmit(): void {
    if (this.uploadForm.valid && this.fileToUpload) {
      this.isUploading = true;
      this.progress = 0;
      const amount = this.uploadForm.get('amount')?.value;
      this.invoiceService
        .uploadInvoice(this.fileToUpload, this.jobId, amount)
        .subscribe({
          next: (uploadProgress) => {
            this.progress = uploadProgress.progress;
            this.isUploading = uploadProgress.isUploading;
          },
          error: (error) => {
            this.isUploading = false;
            console.error('Upload error:', error);
          },
        });
    }
  }
}
