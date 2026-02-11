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
import { DocumentService } from '../../jobs/services/document.service';
import { UploadedFileInfo, FileUploadService } from '../../../services/file-upload.service';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoaderComponent } from '../../../loader/loader.component';
import { RatingService } from '../../../services/rating.service';
import { Rating } from '../../../models/rating';
import { BidsService } from '../../../services/bids.service';

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
  canInlineEdit: boolean = false;
  hasInlineEdits: boolean = false;
  hasPendingTradePackageSync: boolean = false;

  editable = {
    budget: null as number | null,
    startDate: '',
    durationInDays: null as number | null,
    laborType: 'Labor & Materials',
    bidDeadline: '',
  };
  stars = [1, 2, 3, 4, 5];

  googleRating: number | null = null;
  googleReviews: number | null = null;
  probuildRating: number | null = null;
  probuildReviews: number | null = null;
  ratingsLoading: boolean = false;
  ratingNotice: string = '';

  // Mocked data. TODO: get real data
  yearsInBusiness: number = 12;
  // Mocked data. TODO: get real data
  completedProjects: number = 48;

  // Blueprint Viewer Data
  blueprintFiles: UploadedFileInfo[] = [];
  selectedBlueprint: UploadedFileInfo | null = null;
  blueprintPdfSrc: string | Uint8Array | null = null;
  isLoadingBlueprints: boolean = false;

  selectedQuoteFile: File | null = null;
  isQuoteUploading: boolean = false;
  quoteUploadProgress: number = 0;
  uploadedQuoteUrl: string | null = null;
  isSubmittingBid: boolean = false;
  isQuoteDropZoneActive: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<JobDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { job: Job, saved?: boolean, notes?: string, canEdit?: boolean },
    private authService: AuthService,
    private documentService: DocumentService,
    private jobsService: JobsService,
    private fileUploadService: FileUploadService,
    private bidsService: BidsService,
    private snackBar: MatSnackBar,
    private ratingService: RatingService
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
    this.canInlineEdit = !!this.data.canEdit;
    this.initializeEditableFields();
    this.initializeRatingCards();
    if (this.data.job && this.data.job.jobId) {
        this.loadBlueprints();
    }
  }

  private initializeEditableFields(): void {
    const jobAny = this.data.job as any;
    this.editable.budget = this.data.job.tradeBudgets?.[0]?.budget ?? null;
    this.editable.startDate = this.toDateInputValue(jobAny.tradePackageStartDate || this.data.job.potentialStartDate);
    this.editable.durationInDays = this.data.job.durationInDays ?? null;
    this.editable.laborType = this.normalizeLaborType(jobAny.tradePackageLaborType || this.data.job.biddingType || 'Labor and Materials');
    this.editable.bidDeadline = this.toDateInputValue(jobAny.tradePackageBidDeadline || this.data.job.biddingStartDate);
  }

  private normalizeLaborType(value: string): string {
    if (!value) return 'Labor and Materials';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'labor only') return 'Labor';
    if (normalized === 'labor & materials') return 'Labor and Materials';
    if (normalized === 'labor and materials') return 'Labor and Materials';
    return value;
  }

  private toDateInputValue(value: Date | string | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  markInlineEdited(): void {
    this.hasInlineEdits = true;
  }

  applyInlineEdits(): void {
    if (!this.canInlineEdit) return;

    if (this.editable.budget !== null) {
      if (!this.data.job.tradeBudgets || this.data.job.tradeBudgets.length === 0) {
        this.data.job.tradeBudgets = [{
          tradeName: this.getPrimaryTrade(),
          budget: Number(this.editable.budget) || 0,
        }];
      } else {
        this.data.job.tradeBudgets[0].budget = Number(this.editable.budget) || 0;
      }
    }

    this.data.job.potentialStartDate = this.editable.startDate ? new Date(this.editable.startDate) : undefined;
    this.data.job.durationInDays = this.editable.durationInDays ?? undefined;
    this.data.job.biddingType = this.editable.laborType || 'Labor and Materials';
    this.data.job.biddingStartDate = this.editable.bidDeadline ? new Date(this.editable.bidDeadline) : undefined;

    this.hasInlineEdits = false;
    this.hasPendingTradePackageSync = true;
    this.snackBar.open('Job details updated.', 'Close', { duration: 1800 });
  }

  private buildTradePackageUpdatePayload(): any | null {
    const jobAny = this.data.job as any;
    const tradePackageId = Number(jobAny.tradePackageId || 0);
    if (!tradePackageId) return null;

    return {
      id: tradePackageId,
      jobId: this.data.job.jobId,
      tradeName: this.getPrimaryTrade(),
      category: jobAny.tradePackageCategory || this.data.job.jobType || null,
      scopeOfWork: this.data.job.description || jobAny.tradePackageScopeOfWork || '',
      budget: Number(this.editable.budget || 0),
      status: jobAny.tradePackageStatus || this.data.job.status || 'Draft',
      estimatedManHours: Number(jobAny.tradePackageEstimatedManHours || 0),
      hourlyRate: Number(jobAny.tradePackageHourlyRate || 0),
      estimatedDuration: this.editable.durationInDays ? `${this.editable.durationInDays} days` : (jobAny.tradePackageEstimatedDuration || ''),
      startDate: this.editable.startDate ? new Date(this.editable.startDate).toISOString() : null,
      bidDeadline: this.editable.bidDeadline ? new Date(this.editable.bidDeadline).toISOString() : null,
      laborType: this.editable.laborType || null,
      csiCode: jobAny.tradePackageCsiCode || null,
      postedToMarketplace: jobAny.tradePackagePostedToMarketplace ?? true,
      createdAt: jobAny.tradePackageCreatedAt || this.data.job.createdAt || new Date().toISOString(),
    };
  }

  getLaborTypeOptions(): string[] {
    return ['Labor', 'Labor and Materials'];
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
    if (this.canInlineEdit && this.hasInlineEdits) {
      this.applyInlineEdits();
    }

    const tradePackageUpdate = this.canInlineEdit && this.hasPendingTradePackageSync
      ? this.buildTradePackageUpdatePayload()
      : null;

    this.dialogRef.close({
        saved: this.isSaved,
        notes: this.userNotes,
        updatedJob: this.canInlineEdit ? this.data.job : null,
        tradePackageUpdate,
      });
  }

  toggleSave(): void {
    this.isSaved = !this.isSaved;
  }

  getPrimaryTrade(): string {
    const trade = this.data.job.trades?.[0]?.trim();
    if (!trade) return 'General';
    const cleanedTrade = trade.replace(/^\*+|\*+$/g, '').trim();
    return cleanedTrade || 'General';
  }

  getStatusLabel(): string {
    const rawStatus = (this.data.job.status || 'Open').toString().trim();
    if (!rawStatus) return 'Open';
    return rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
  }

  getStatusClass(): string {
    const status = (this.data.job.status || 'open').toString().trim().toLowerCase();
    if (status === 'open' || status === 'accepted') return 'green';
    if (status === 'reviewing') return 'yellow';
    if (status === 'pending' || status === 'under review') return 'blue';
    if (status === 'rejected' || status === 'closed') return 'red';
    return 'neutral';
  }

  getLocationText(): string {
    if (this.data.job.address) return this.data.job.address;
    const cityState = [this.data.job.city, this.data.job.state].filter(Boolean).join(', ');
    return cityState || 'Location not provided';
  }

  hasBidders(): boolean {
    const bidders = (this.data.job as any)?.bidders;
    return Array.isArray(bidders) && bidders.length > 0;
  }

  getBidders(): any[] {
    const bidders = (this.data.job as any)?.bidders;
    return Array.isArray(bidders) ? bidders : [];
  }

  showContractorSection(): boolean {
    return !this.hasBidders();
  }

  private initializeRatingCards(): void {
    const jobAny = this.data.job as any;
    this.googleRating = typeof this.data.job.clientRating === 'number' ? this.data.job.clientRating : null;
    this.googleReviews =
      typeof jobAny?.clientGoogleReviews === 'number'
        ? jobAny.clientGoogleReviews
        : typeof jobAny?.googleReviews === 'number'
          ? jobAny.googleReviews
          : null;

    this.yearsInBusiness =
      // Mocked data. TODO: get real data
      typeof jobAny?.yearsInBusiness === 'number' ? jobAny.yearsInBusiness : this.yearsInBusiness;
    this.completedProjects =
      // Mocked data. TODO: get real data
      typeof jobAny?.completedProjects === 'number' ? jobAny.completedProjects : this.completedProjects;

    const ratedUserId = this.getRatedUserId();
    if (!ratedUserId) {
      this.probuildRating = null;
      this.probuildReviews = 0;
      this.ratingNotice = 'No linked contractor profile was provided for ProBuild ratings.';
      return;
    }

    this.ratingsLoading = true;
    this.ratingService.getRatingsForUser(ratedUserId).subscribe({
      next: (ratings: Rating[]) => {
        this.ratingsLoading = false;
        this.probuildReviews = ratings.length;
        if (!ratings.length) {
          this.probuildRating = null;
          this.ratingNotice = 'No ProBuild ratings yet.';
          return;
        }

        const total = ratings.reduce((sum, rating) => sum + (rating.ratingValue || 0), 0);
        this.probuildRating = Number((total / ratings.length).toFixed(1));
        this.ratingNotice = '';
      },
      error: () => {
        this.ratingsLoading = false;
        this.probuildRating = null;
        this.probuildReviews = 0;
        this.ratingNotice = 'Unable to load ProBuild ratings at the moment.';
      }
    });
  }

  private getRatedUserId(): string | null {
    const jobAny = this.data.job as any;
    const candidate =
      jobAny?.clientUserId ||
      jobAny?.clientId ||
      jobAny?.userId ||
      jobAny?.ownerUserId ||
      jobAny?.contractorUserId;

    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate : null;
  }

  getRatingValue(type: 'google' | 'probuild'): number | null {
    return type === 'google' ? this.googleRating : this.probuildRating;
  }

  getRatingText(type: 'google' | 'probuild'): string {
    const rating = this.getRatingValue(type);
    return typeof rating === 'number' ? rating.toFixed(1) : 'N/A';
  }

  isStarFilled(star: number, type: 'google' | 'probuild'): boolean {
    const rating = this.getRatingValue(type);
    if (typeof rating !== 'number') return false;
    return star <= Math.round(rating);
  }

  getGoogleReviewsText(): string {
    if (typeof this.googleReviews === 'number') return `${this.googleReviews} reviews`;
    return 'Review count unavailable';
  }

  getProbuildReviewsText(): string {
    if (this.ratingsLoading) return 'Loading ratings...';
    if (typeof this.probuildReviews === 'number' && this.probuildReviews > 0) {
      return `${this.probuildReviews} verified reviews`;
    }
    return this.ratingNotice || 'No verified reviews yet';
  }

  getQuickStatsLocation(): string {
    const state = this.data.job.state || '';
    const city = this.data.job.city || '';
    const location = [city, state].filter(Boolean).join(', ');
    return location || 'Location unavailable';
  }

  onShare(): void {
    this.snackBar.open('Share dialog is coming soon.', 'Close', { duration: 2500 });
  }

  onAddNotes(): void {
    this.snackBar.open('Notes are saved when closing this dialog.', 'Close', { duration: 2500 });
  }

  onDownloadDescription(): void {
    this.snackBar.open('Download Job Description is not wired yet.', 'Close', { duration: 2500 });
  }

  viewBlueprintDocument(file: UploadedFileInfo, event?: MouseEvent): void {
    event?.stopPropagation();
    this.documentService.viewDocument(file as any);
  }

  downloadBlueprintDocument(file: UploadedFileInfo, event?: MouseEvent): void {
    event?.stopPropagation();
    this.documentService.downloadDocument(file as any, file.name);
  }

  onImportToAnalyzer(): void {
    this.snackBar.open('Import to AI Analyzer coming soon.', 'Close', { duration: 2500 });
  }

  onUploadQuote(): void {
    this.snackBar.open('Choose a PDF to upload your quote.', 'Close', {
      duration: 2200,
    });
  }

  onQuoteDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isQuoteDropZoneActive = true;
  }

  onQuoteDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isQuoteDropZoneActive = false;
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    this.isQuoteDropZoneActive = false;

    const file = event.dataTransfer?.files?.[0];
    this.handleQuoteFileSelection(file ?? null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;
    this.handleQuoteFileSelection(file);

    if (input) {
      input.value = '';
    }
  }

  uploadQuote(): void {
    if (!this.selectedQuoteFile || this.isQuoteUploading || this.isSubmittingBid) {
      return;
    }

    const jobId = Number(this.data.job?.jobId || 0);
    if (!jobId) {
      this.snackBar.open('Unable to determine job ID for this posting.', 'Close', {
        duration: 3200,
      });
      return;
    }

    this.isQuoteUploading = true;
    this.quoteUploadProgress = 0;
    this.uploadedQuoteUrl = null;

    this.fileUploadService.uploadQuotePdf(this.selectedQuoteFile, jobId).subscribe({
      next: (event) => {
        if (typeof event === 'number') {
          this.quoteUploadProgress = event;
          return;
        }

        if (!event.url) {
          return;
        }

        this.uploadedQuoteUrl = event.url;
        this.isQuoteUploading = false;
        this.submitUploadedQuoteBid(jobId, event.url);
      },
      error: () => {
        this.isQuoteUploading = false;
        this.snackBar.open('Quote PDF upload failed. Please try again.', 'Close', {
          duration: 3200,
        });
      },
    });
  }

  private submitUploadedQuoteBid(jobId: number, documentUrl: string): void {
    const jobAny = this.data.job as any;
    const tradePackageIdRaw = Number(jobAny?.tradePackageId || 0);
    const tradePackageId = tradePackageIdRaw > 0 ? tradePackageIdRaw : undefined;

    this.isSubmittingBid = true;
    this.bidsService.uploadBidPdf(jobId, documentUrl, tradePackageId).subscribe({
      next: () => {
        this.isSubmittingBid = false;
        this.snackBar.open('Bid submitted successfully.', 'Close', {
          duration: 2800,
        });
      },
      error: () => {
        this.isSubmittingBid = false;
        this.snackBar.open('Bid submission failed after upload.', 'Close', {
          duration: 3400,
        });
      },
    });
  }

  private handleQuoteFileSelection(file: File | null): void {
    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.snackBar.open('Please select a PDF file.', 'Close', { duration: 2600 });
      return;
    }

    this.selectedQuoteFile = file;
    this.uploadedQuoteUrl = null;
    this.quoteUploadProgress = 0;
    this.snackBar.open(`Selected: ${file.name}`, 'Close', { duration: 2000 });
  }

  onDownloadAll(): void {
    this.snackBar.open('Download all documents is not wired yet.', 'Close', { duration: 2500 });
  }

  onMessageBidders(): void {
    this.snackBar.open('Messaging bidders is coming soon.', 'Close', { duration: 2500 });
  }

  onContactContractor(): void {
    this.snackBar.open('Contractor messaging is coming soon.', 'Close', { duration: 2500 });
  }

  loadBlueprints(): void {
    if (!this.data.job.jobId) return;
    this.isLoadingBlueprints = true;
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
