import { Component, Inject, OnInit } from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { FileUploadService } from '../../../services/file-upload.service';
import { CommonModule } from '@angular/common';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { PdfViewerComponent } from '../../../components/pdf-viewer/pdf-viewer.component';
import { ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BidsService } from '../../../services/bids.service';
import { BomService } from '../../jobs/services/bom.service';
import { FormsModule } from '@angular/forms';

interface BidTargetTradePackage {
  id: number;
  trade: string;
}

@Component({
  selector: 'app-submit-bid-dialog',
  templateUrl: './submit-bid-dialog.component.html',
  styleUrls: ['./submit-bid-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSelectModule,
    PdfViewerComponent,
    MatDialogModule,
  ],
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
  availableTradePackages: BidTargetTradePackage[] = [];
  selectedTradePackageId: number | null = null;
  loadingTradePackages = false;

  constructor(
    public dialogRef: MatDialogRef<SubmitBidDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number; tradePackageId?: number },
    private fileUploadService: FileUploadService,
    private bomService: BomService,
    private bidsService: BidsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const inputTradePackageId = Number(this.data.tradePackageId || 0);
    if (inputTradePackageId > 0) {
      this.selectedTradePackageId = inputTradePackageId;
    }

    this.loadingTradePackages = true;
    this.bomService.getTradePackages(String(this.data.jobId)).subscribe({
      next: (packages) => {
        this.availableTradePackages = (packages || [])
          .filter(
            (pkg: any) =>
              !!pkg &&
              Number(pkg.id) > 0 &&
              pkg.postedToMarketplace === true &&
              !pkg.isInHouse &&
              !pkg.isInactive &&
              !pkg.isHidden,
          )
          .map((pkg: any) => ({
            id: Number(pkg.id),
            trade: String(pkg.trade || pkg.tradeName || 'Trade Package'),
          }));

        if (
          !this.selectedTradePackageId &&
          this.availableTradePackages.length === 1
        ) {
          this.selectedTradePackageId = this.availableTradePackages[0].id;
        }

        this.loadingTradePackages = false;
      },
      error: () => {
        this.loadingTradePackages = false;
      },
    });
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
    this.fileUploadService
      .uploadQuotePdf(this.selectedFile, this.data.jobId)
      .subscribe({
        next: (event) => {
          if (typeof event === 'number') {
            this.uploadProgress = event;
          } else if (event.url) {
            this.uploadedFileUrl = event.url;
            this.isUploading = false;
            this.uploadComplete = true;
            this.stepper.next();
            this.snackBar.open('File uploaded successfully', 'Close', {
              duration: 3000,
            });
          }
        },
        error: () => {
          this.isUploading = false;
          // Handle error
        },
      });
  }

  submitBid(): void {
    if (!this.uploadedFileUrl) {
      return;
    }

    const hasMarketplacePackageOptions = this.availableTradePackages.length > 0;
    const selectedPackageIdRaw = Number(
      this.selectedTradePackageId || this.data.tradePackageId || 0,
    );
    const tradePackageId =
      selectedPackageIdRaw > 0 ? selectedPackageIdRaw : undefined;

    if (hasMarketplacePackageOptions && !tradePackageId) {
      this.snackBar.open(
        'Select the trade package for this bid before submitting.',
        'Close',
        {
          duration: 3200,
        },
      );
      return;
    }

    this.bidsService
      .uploadBidPdf(this.data.jobId, this.uploadedFileUrl, tradePackageId)
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
          this.snackBar.open('Bid submitted successfully', 'Close', {
            duration: 3000,
          });
        },
        error: () => {
          // Handle error
        },
      });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
