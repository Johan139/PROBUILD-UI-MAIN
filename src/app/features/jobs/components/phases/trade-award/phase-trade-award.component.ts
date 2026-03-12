import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';
import {
  PhaseNavigationHeaderComponent,
  PhaseReportRequestType,
} from '../shared/phase-navigation-header.component';
import { BomService } from '../../../services/bom.service';
import { BiddingService } from '../../../../../services/bidding.service';
import { BidsService } from '../../../../../services/bids.service';
import { FileUploadService } from '../../../../../services/file-upload.service';
import { DragAndDropDirective } from '../../../../../directives/drag-and-drop.directive';

type AwardTab = 'trades' | 'vendors' | 'suppliers';

interface TradePackageVm {
  id: number;
  jobId: number;
  trade: string;
  category: string;
  scopeOfWork: string;
  csiCode: string;
  estimatedManHours?: number;
  hourlyRate?: number;
  estimatedDuration?: string;
  startDate?: string | Date | null;
  bidDeadline?: string | Date | null;
  budget: number;
  laborBudget: number;
  materialBudget: number;
  totalBudget: number;
  laborType: string;
  status: string;
  postedToMarketplace: boolean;
  isInHouse: boolean;
  awardedBidId?: number | null;
  linkedTradePackageId?: number | null;
  isInactive?: boolean;
  isHidden?: boolean;
  sourceType?: string | null;
}

interface PackageBidVm {
  id: number;
  bidId: number;
  tradePackageId: number;
  bidderName: string;
  rating: number;
  googleRating?: number;
  googleReviews?: number;
  proBuildRating?: number;
  proBuildReviews?: number;
  location: string;
  amount: number;
  leadTime: string;
  status: string;
  specialty?: string;
  insurance?: boolean;
  licenseNo?: string;
  bondable?: boolean;
  completedJobs?: number;
  yearsInBusiness?: number;
  quoteRef?: string;
  submittedLabel?: string;
  validUntil?: string;
  contact?: string;
  phone?: string;
  email?: string;
  inclusions?: string[];
  exclusions?: string[];
  submittedAt?: string;
  documentUrl?: string | null;
  insuranceCoverage?: string;
  warranty?: string;
  quotedScope?: string;
}

interface BidDetailDialogState {
  item: TradePackageVm;
  bid: PackageBidVm;
}

interface BidAnalysisVm {
  summary: string;
  recommendedBidId: number | null;
  reasons: string[];
  topCandidates: Array<{ bidId: number; score: number; reason: string }>;
}

@Component({
  selector: 'app-phase-trade-award',
  standalone: true,
  imports: [CommonModule, LucideIconsModule, PhaseNavigationHeaderComponent, DragAndDropDirective],
  templateUrl: './phase-trade-award.component.html',
  styleUrl: './phase-trade-award.component.scss',
})
export class PhaseTradeAwardComponent implements OnInit, OnChanges {
  @Input() projectDetails: any;
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();

  awardTab: AwardTab = 'trades';
  isLoading = false;

  tradePackages: TradePackageVm[] = [];
  bidsByPackageId: Record<number, PackageBidVm[]> = {};

  expandedIds = new Set<number>();
  expandedBidIds = new Set<string>();
  analyzingPackageIds = new Set<number>();
  analyzedPackageIds = new Set<number>();

  awardedBidByPackageId: Record<number, number> = {};
  inHouseUploadByPackageId: Record<number, { name: string; url: string; uploadedAt: string }> = {};
  naPackageIds = new Set<number>();

  analysisByPackageId: Record<number, BidAnalysisVm> = {};
  detailDialog: BidDetailDialogState | null = null;

  private lastLoadedJobId: number | null = null;

  constructor(
    private readonly bomService: BomService,
    private readonly biddingService: BiddingService,
    private readonly bidsService: BidsService,
    private readonly fileUploadService: FileUploadService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.triggerLoadIfNeeded();
  }

  licenseDisplay(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const normalized = raw.toLowerCase();
    if (normalized === 'n/a' || normalized === 'na' || normalized === 'none') return null;
    if (normalized === '0' || normalized === '1') return null;

    return raw;
  }

  private specialtyDisplay(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const normalized = raw.toLowerCase();
    if (normalized === 'n/a' || normalized === 'na' || normalized === 'none') return null;
    if (normalized === '0' || normalized === '1') return null;

    return raw;
  }

  bidKey(item: TradePackageVm, bid: PackageBidVm): string {
    return `${item.id}-${bid.bidId}`;
  }

  isBidExpanded(item: TradePackageVm, bid: PackageBidVm): boolean {
    return this.expandedBidIds.has(this.bidKey(item, bid));
  }

  toggleBidExpanded(item: TradePackageVm, bid: PackageBidVm): void {
    const next = new Set(this.expandedBidIds);
    const key = this.bidKey(item, bid);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expandedBidIds = next;
  }

  openBidDialog(item: TradePackageVm, bid: PackageBidVm): void {
    this.detailDialog = { item, bid };
  }

  private getRelativeSubmittedLabel(submittedAt: any): string {
    const dt = submittedAt ? new Date(submittedAt) : null;
    if (!dt || Number.isNaN(dt.getTime())) return 'recently';
    const minutes = Math.floor((Date.now() - dt.getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  closeBidDialog(): void {
    this.detailDialog = null;
  }

  budgetVarianceAmount(item: TradePackageVm, bid: PackageBidVm): number {
    return Number((bid.amount || 0) - this.itemBudget(item));
  }

  budgetVariancePercent(item: TradePackageVm, bid: PackageBidVm): number {
    const budget = this.itemBudget(item);
    if (budget <= 0) {
      return 0;
    }

    return Math.round((Math.abs(this.budgetVarianceAmount(item, bid)) / budget) * 100);
  }

  budgetVarianceLabel(item: TradePackageVm, bid: PackageBidVm): string {
    const variance = this.budgetVarianceAmount(item, bid);
    const percent = this.budgetVariancePercent(item, bid);

    if (variance < 0) {
      return `${percent}% under budget`;
    }

    if (variance > 0) {
      return `${percent}% over budget`;
    }

    return 'On budget';
  }

  budgetVarianceClass(item: TradePackageVm, bid: PackageBidVm): 'good' | 'bad' | 'neutral' {
    const variance = this.budgetVarianceAmount(item, bid);
    if (variance < 0) {
      return 'good';
    }
    if (variance > 0) {
      return 'bad';
    }
    return 'neutral';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectDetails'] && !changes['projectDetails'].firstChange) {
      this.triggerLoadIfNeeded();
    }
  }

  private triggerLoadIfNeeded(): void {
    const currentJobId = this.jobId;

    if (!currentJobId) {
      this.lastLoadedJobId = null;
      this.tradePackages = [];
      this.bidsByPackageId = {};
      this.expandedIds = new Set<number>();
      this.isLoading = false;
      return;
    }

    if (this.lastLoadedJobId === currentJobId) {
      return;
    }

    this.lastLoadedJobId = currentJobId;
    this.loadTradeAwardData();
  }

  get jobId(): number {
    return Number(this.projectDetails?.jobId || 0);
  }

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize || '2,450';
  }

  get clientName(): string {
    const explicitClient = this.projectDetails?.clientName;
    if (explicitClient) {
      return explicitClient;
    }
    const first = this.projectDetails?.clientFirstName || '';
    const last = this.projectDetails?.clientLastName || '';
    return `${first} ${last}`.trim();
  }

  get projectAddress(): string {
    return this.projectDetails?.address || this.projectDetails?.projectAddress;
  }

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '228';
    }
    return Math.round(numeric * 0.0929).toLocaleString();
  }

  get tradeItems(): TradePackageVm[] {
    return this.tradePackages.filter(
      (p) =>
        p.category === 'trade' &&
        !p.isInactive &&
        !p.isHidden &&
        (p.postedToMarketplace || p.isInHouse),
    );
  }

  get vendorItems(): TradePackageVm[] {
    return this.tradePackages.filter(
      (p) =>
        p.category === 'trade' &&
        !p.isInactive &&
        !p.isHidden &&
        (p.postedToMarketplace || p.isInHouse) &&
        this.isLaborOnly(p) &&
        p.materialBudget > 0,
    );
  }

  get supplierItems(): TradePackageVm[] {
    return this.tradePackages.filter(
      (p) =>
        p.category === 'supplier' &&
        !p.isInactive &&
        !p.isHidden &&
        (p.postedToMarketplace || p.isInHouse),
    );
  }

  get currentItems(): TradePackageVm[] {
    if (this.awardTab === 'trades') {
      return this.tradeItems;
    }
    if (this.awardTab === 'vendors') {
      return this.vendorItems;
    }
    return this.supplierItems;
  }

  get awardedCount(): number {
    const completed = new Set<number>();
    this.trackablePackageIds.forEach((id) => {
      if (
        !!this.awardedBidByPackageId[id] ||
        !!this.inHouseUploadByPackageId[id] ||
        this.naPackageIds.has(id)
      ) {
        completed.add(id);
      }
    });

    return completed.size;
  }

  get totalCount(): number {
    return this.trackablePackageIds.size;
  }

  get pendingCount(): number {
    return Math.max(0, this.totalCount - this.awardedCount);
  }

  get completionPercent(): number {
    if (!this.totalCount) {
      return 0;
    }
    return Math.min(100, (this.awardedCount / this.totalCount) * 100);
  }

  get canProceed(): boolean {
    return this.totalCount > 0 && this.awardedCount >= this.totalCount;
  }

  private get trackablePackageIds(): Set<number> {
    return new Set<number>([
      ...this.tradeItems.map((p) => p.id),
      ...this.vendorItems.map((p) => p.id),
      ...this.supplierItems.map((p) => p.id),
    ]);
  }

  setTab(tab: AwardTab): void {
    this.awardTab = tab;
  }

  isExpanded(packageId: number): boolean {
    return this.expandedIds.has(packageId);
  }

  toggleExpanded(packageId: number): void {
    const next = new Set(this.expandedIds);
    if (next.has(packageId)) {
      next.delete(packageId);
    } else {
      next.add(packageId);
    }
    this.expandedIds = next;
  }

  bidsForPackage(item: TradePackageVm): PackageBidVm[] {
    if (this.awardTab === 'vendors' && item.linkedTradePackageId) {
      return this.bidsByPackageId[item.linkedTradePackageId] || [];
    }
    return this.bidsByPackageId[item.id] || [];
  }

  isInHouse(item: TradePackageVm): boolean {
    return !!item.isInHouse;
  }

  isAwarded(item: TradePackageVm): boolean {
    return !!this.awardedBidByPackageId[item.id] || !!this.inHouseUploadByPackageId[item.id];
  }

  isNotApplicable(item: TradePackageVm): boolean {
    return this.naPackageIds.has(item.id);
  }

  toggleAward(item: TradePackageVm, bidId: number): void {
    if (this.awardedBidByPackageId[item.id] === bidId) {
      this.persistAwardForPackage(item, null);
      return;
    }

    this.persistAwardForPackage(item, bidId);
  }

  toggleNotApplicable(item: TradePackageVm): void {
    if (this.naPackageIds.has(item.id)) {
      this.naPackageIds.delete(item.id);
      const restoredStatus = item.isInHouse
        ? 'In House'
        : item.postedToMarketplace
          ? 'Posted'
          : 'Draft';
      this.persistTradePackageStatus(item, restoredStatus);
      return;
    }

    this.naPackageIds.add(item.id);
    const hadAward = !!this.awardedBidByPackageId[item.id];
    delete this.awardedBidByPackageId[item.id];
    delete this.inHouseUploadByPackageId[item.id];
    if (hadAward) {
      this.persistAwardForPackage(item, null);
    }
    this.persistTradePackageStatus(item, 'N/A');
  }

  runAiAnalysis(item: TradePackageVm): void {
    if (item.isInHouse) {
      this.snackBar.open('AI analysis is only available for marketplace bid packages.', 'Close', {
        duration: 3000,
      });
      return;
    }

    if (!this.jobId) {
      return;
    }

    this.analyzingPackageIds.add(item.id);

    this.biddingService.analyzeTradePackage(this.jobId, item.id).subscribe({
      next: (result) => {
        this.applyAnalysisResult(item.id, result);
      },
      error: () => {
        this.analyzingPackageIds.delete(item.id);
        this.snackBar.open('AI analysis failed for this package.', 'Close', { duration: 3000 });
      },
    });
  }

  uploadInHouseQuote(item: TradePackageVm, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadInHouseFile(item, file);
    input.value = '';
  }

  analysisFor(item: TradePackageVm): BidAnalysisVm | null {
    return this.analysisByPackageId[item.id] || null;
  }

  cardType(item: TradePackageVm): 'trade' | 'vendor' | 'supplier' {
    if (this.awardTab === 'vendors') {
      return 'vendor';
    }

    if (this.awardTab === 'suppliers' || item.category === 'supplier') {
      return 'supplier';
    }

    return 'trade';
  }

  cardIcon(item: TradePackageVm): string {
    const type = this.cardType(item);
    if (type === 'vendor') {
      return 'users';
    }

    if (type === 'supplier') {
      return 'folder';
    }

    return 'hammer';
  }

  itemLaneLabel(item: TradePackageVm): string {
    if (this.cardType(item) === 'vendor') {
      return 'Vendor Materials';
    }

    if (this.cardType(item) === 'supplier') {
      return 'Supplier';
    }

    return item.isInHouse ? 'In-House' : 'Marketplace';
  }

  workTypeLabel(item: TradePackageVm): string {
    if (this.cardType(item) === 'supplier') {
      return 'Supply';
    }

    return this.isLaborOnly(item) ? 'Labor' : 'Labor & Materials';
  }

  workTypeClass(item: TradePackageVm): 'labor-only' | 'labor-materials' | 'supply' {
    if (this.cardType(item) === 'supplier') {
      return 'supply';
    }

    return this.isLaborOnly(item) ? 'labor-only' : 'labor-materials';
  }

  itemBudget(item: TradePackageVm): number {
    if (this.cardType(item) === 'vendor') {
      return Math.max(0, item.materialBudget || 0);
    }

    return Number(item.budget || 0);
  }

  onInHouseFilesDropped(item: TradePackageVm, files: FileList): void {
    const file = files?.item(0);
    if (!file) {
      return;
    }

    this.uploadInHouseFile(item, file);
  }

  onInHouseFileSelected(item: TradePackageVm, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.uploadInHouseFile(item, file);
    input.value = '';
  }

  private loadTradeAwardData(): void {
    if (!this.jobId) {
      this.tradePackages = [];
      this.expandedIds = new Set<number>();
      this.loadBids();
      return;
    }

    this.isLoading = true;

    this.bomService.getTradePackages(String(this.jobId)).subscribe({
      next: (packages) => {
        this.tradePackages = (packages || []).map((pkg) => ({
          id: Number(pkg.id),
          jobId: Number(pkg.jobId),
          trade: pkg.trade,
          category: String(pkg.category || 'trade').toLowerCase(),
          scopeOfWork: pkg.scopeOfWork || 'No scope provided.',
          csiCode: pkg.csiCode || 'N/A',
          estimatedManHours: Number(pkg.estimatedManHours || 0),
          hourlyRate: Number(pkg.hourlyRate || 0),
          estimatedDuration: pkg.estimatedDuration || '',
          startDate: pkg.startDate || null,
          bidDeadline: pkg.bidDeadline || null,
          budget: Number(pkg.budget || 0),
          laborBudget: Number(pkg.laborBudget || 0),
          materialBudget: Number(pkg.materialBudget || 0),
          totalBudget: Number(pkg.totalBudget || pkg.budget || 0),
          laborType: pkg.laborType || 'Labor and Materials',
          status: pkg.status || 'Draft',
          postedToMarketplace: !!pkg.postedToMarketplace,
          isInHouse: !!pkg.isInHouse,
          awardedBidId: Number(pkg.awardedBidId || 0) || null,
          linkedTradePackageId: pkg.linkedTradePackageId || null,
          isInactive: !!pkg.isInactive,
          isHidden: !!pkg.isHidden,
          sourceType: pkg.sourceType || null,
        }));

        this.awardedBidByPackageId = this.tradePackages.reduce(
          (acc, pkg) => {
            const awardedBidId = Number(pkg.awardedBidId || 0);
            if (awardedBidId > 0) {
              acc[pkg.id] = awardedBidId;
            }
            return acc;
          },
          {} as Record<number, number>,
        );

        this.naPackageIds = new Set(
          this.tradePackages
            .filter((pkg) => String(pkg.status || '').trim().toLowerCase() === 'n/a')
            .map((pkg) => pkg.id),
        );

        this.expandedIds = new Set<number>();

        this.loadBids();
      },
      error: () => {
        this.tradePackages = [];
        this.expandedIds = new Set<number>();
        this.loadBids();
        this.snackBar.open('Unable to load trade packages.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  private loadBids(): void {
    this.bidsByPackageId = {};

    if (!this.jobId) {
      this.isLoading = false;
      return;
    }

    this.bidsService.getBidsForJob(String(this.jobId)).subscribe({
      next: (bids: any) => {
        const items = Array.isArray(bids) ? bids : [];
        const persistedInHouseUploads: Record<number, { name: string; url: string; uploadedAt: string }> = {};
        const inHousePackageIds = new Set(
          this.tradePackages.filter((pkg) => !!pkg.isInHouse).map((pkg) => pkg.id),
        );

        items.forEach((bid: any) => {
          const packageId = Number(bid.tradePackageId || 0);
          if (!packageId) {
            return;
          }

          if (!this.bidsByPackageId[packageId]) {
            this.bidsByPackageId[packageId] = [];
          }

          this.bidsByPackageId[packageId].push({
            id: Number(bid.id),
            bidId: Number(bid.id),
            tradePackageId: packageId,
            bidderName: bid.companyName || `Bidder #${bid.id}`,
            rating: Number(bid.rating || 0),
            googleRating: Number(bid.googleRating || 0),
            googleReviews: Number(bid.googleReviews || 0),
            proBuildRating: Number(bid.proBuildRating || 0),
            proBuildReviews: Number(bid.proBuildReviews || 0),
            location: bid.location || 'N/A',
            amount: Number(bid.amount || 0),
            leadTime: Number(bid.duration || 0) > 0 ? `${Number(bid.duration)} days` : 'N/A',
            status: bid.status || 'Submitted',
            specialty: this.specialtyDisplay(bid.specialty) ?? undefined,
            insurance: bid.insurance ?? false,
            licenseNo: bid.licenseNo || 'N/A',
            bondable: bid.bondable ?? false,
            completedJobs: Number(bid.completedJobs || 0),
            yearsInBusiness: Number(bid.yearsInBusiness || 0),
            quoteRef: bid.quoteRef || `Q-${bid.id}`,
            submittedLabel: bid.submittedLabel || this.getRelativeSubmittedLabel(bid.submittedAt),
            validUntil: bid.validUntil || 'TBC',
            contact: bid.contact || 'N/A',
            phone: bid.phone || 'N/A',
            email: bid.email || 'N/A',
            inclusions: this.normalizeBidList(bid.inclusions, ['Quoted scope as submitted']),
            exclusions: this.normalizeBidList(bid.exclusions, ['No exclusions specified']),
            submittedAt: bid.submittedAt,
            documentUrl: bid.documentUrl,
          });

          if (inHousePackageIds.has(packageId) && bid.documentUrl) {
            const uploadedAt =
              (typeof bid.submittedAt === 'string' && bid.submittedAt) ||
              new Date().toISOString();
            const existing = persistedInHouseUploads[packageId];

            if (!existing || new Date(uploadedAt).getTime() >= new Date(existing.uploadedAt).getTime()) {
              persistedInHouseUploads[packageId] = {
                name: this.fileNameFromUrl(String(bid.documentUrl)),
                url: String(bid.documentUrl),
                uploadedAt,
              };
            }
          }

          if ((bid.status || '').toString().toLowerCase() === 'awarded') {
            this.awardedBidByPackageId[packageId] = Number(bid.id);
          }
        });

        this.inHouseUploadByPackageId = persistedInHouseUploads;

        Object.keys(this.bidsByPackageId).forEach((key) => {
          this.bidsByPackageId[Number(key)] = this.bidsByPackageId[Number(key)].sort(
            (a, b) => a.amount - b.amount,
          );
        });

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Unable to load bids right now.', 'Close', {
          duration: 2500,
        });
      },
    });
  }

  private isLaborOnly(pkg: TradePackageVm): boolean {
    const normalized = String(pkg.laborType || '').trim().toLowerCase();
    return normalized === 'labor' || normalized === 'labor only';
  }

  private normalizeBidList(value: unknown, fallback: string[]): string[] {
    if (Array.isArray(value)) {
      const cleaned = value
        .map((x) => String(x ?? '').trim())
        .filter((x) => !!x);
      return cleaned.length ? cleaned : fallback;
    }

    if (typeof value === 'string') {
      const raw = value.trim();
      if (!raw) {
        return fallback;
      }

      if (raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const cleaned = parsed
              .map((x) => String(x ?? '').trim())
              .filter((x) => !!x);
            return cleaned.length ? cleaned : fallback;
          }
        } catch {
          // fall through
        }
      }

      const parts = raw
        .split(/\r?\n|,/g)
        .map((x) => x.trim())
        .filter((x) => !!x);

      return parts.length ? parts : fallback;
    }

    return fallback;
  }

  private uploadInHouseFile(item: TradePackageVm, file: File): void {
    if (!this.jobId) {
      this.snackBar.open('Job id not found. Unable to upload quote.', 'Close', { duration: 3000 });
      return;
    }

    this.fileUploadService.uploadFiles([file], `${this.jobId}`).subscribe({
      next: (upload) => {
        if (upload.isUploading || !upload.files?.length) {
          return;
        }

        const uploaded = upload.files[0];
        this.inHouseUploadByPackageId[item.id] = {
          name: file.name,
          url: uploaded.url,
          uploadedAt: new Date().toISOString(),
        };
        delete this.awardedBidByPackageId[item.id];
        this.naPackageIds.delete(item.id);

        this.bidsService.uploadBidPdf(this.jobId, uploaded.url, item.id).subscribe({
          next: () => {
            this.persistTradePackageStatus(item, 'In House');
            this.snackBar.open('In-house quote uploaded.', 'Close', { duration: 2500 });
          },
          error: () => {
            this.snackBar.open('Quote uploaded, but bid record creation failed.', 'Close', {
              duration: 3500,
            });
          },
        });
      },
      error: () => {
        this.snackBar.open('Failed to upload in-house quote.', 'Close', { duration: 3000 });
      },
    });
  }

  private persistTradePackageStatus(item: TradePackageVm, status: string): void {
    if (!this.jobId) {
      item.status = status;
      return;
    }

    const payload = {
      id: item.id,
      jobId: item.jobId,
      tradeName: item.trade,
      category: item.category,
      scopeOfWork: item.scopeOfWork,
      status,
      estimatedManHours: Number(item.estimatedManHours || 0),
      hourlyRate: Number(item.hourlyRate || 0),
      estimatedDuration: item.estimatedDuration || '',
      startDate: item.startDate || null,
      bidDeadline: item.bidDeadline || null,
      laborType: item.laborType || null,
      csiCode: item.csiCode || null,
      linkedTradePackageId: item.linkedTradePackageId || null,
      isAutoGenerated: false,
      isInactive: !!item.isInactive,
      isHidden: !!item.isHidden,
      sourceType: item.sourceType || null,
      isInHouse: !!item.isInHouse,
      laborBudget: Number(item.laborBudget || 0),
      materialBudget: Number(item.materialBudget || 0),
      totalBudget: Number(item.totalBudget || item.budget || 0),
      effectiveBudget: Number(item.totalBudget || item.budget || 0),
      budget: Number(item.budget || 0),
      postedToMarketplace: !!item.postedToMarketplace,
      notes: (item as any).notes || null,
      laborBudgetVisible: (item as any).laborBudgetVisible !== false,
      materialBudgetVisible: (item as any).materialBudgetVisible !== false,
    };

    this.bomService.updateTradePackage(item.id, payload).subscribe({
      next: () => {
        item.status = status;
      },
      error: () => {
        this.snackBar.open('Failed to persist package status change.', 'Close', {
          duration: 3200,
        });
      },
    });
  }

  private persistAwardForPackage(item: TradePackageVm, bidId: number | null): void {
    if (!this.jobId) {
      if (bidId) {
        this.awardedBidByPackageId[item.id] = bidId;
        this.naPackageIds.delete(item.id);
      } else {
        delete this.awardedBidByPackageId[item.id];
      }
      return;
    }

    this.bidsService.awardTradePackageBid(this.jobId, item.id, bidId).subscribe({
      next: () => {
        if (bidId) {
          this.awardedBidByPackageId[item.id] = bidId;
          this.naPackageIds.delete(item.id);
          item.status = item.isInHouse ? 'In House' : 'Awarded';
          item.awardedBidId = bidId;
        } else {
          delete this.awardedBidByPackageId[item.id];
          item.status = item.isInHouse
            ? 'In House'
            : item.postedToMarketplace
              ? 'Posted'
              : 'Draft';
          item.awardedBidId = null;
        }
      },
      error: () => {
        this.snackBar.open('Failed to persist award selection.', 'Close', {
          duration: 3200,
        });
      },
    });
  }

  private fileNameFromUrl(url: string): string {
    try {
      const decoded = decodeURIComponent(url);
      const normalized = decoded.split('?')[0].split('#')[0];
      const segments = normalized.split('/');
      return segments[segments.length - 1] || 'Uploaded quote.pdf';
    } catch {
      return 'Uploaded quote.pdf';
    }
  }

  openBidDocument(url: string | null | undefined, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const link = (url ?? '').trim();
    if (!link) {
      return;
    }

    const normalized =
      link.startsWith('http://') || link.startsWith('https://')
        ? link
        : link.startsWith('/')
          ? link
          : `/${link}`;

    window.open(normalized, '_blank', 'noopener');
  }

  private applyAnalysisResult(packageId: number, result: any): void {
    this.analyzingPackageIds.delete(packageId);
    this.analyzedPackageIds.add(packageId);

    const analysis: BidAnalysisVm = {
      summary: result?.summary || 'Analysis complete.',
      recommendedBidId: Number(result?.recommendedBidId || 0) || null,
      reasons: Array.isArray(result?.reasons) ? result.reasons : [],
      topCandidates: Array.isArray(result?.topCandidates) ? result.topCandidates : [],
    };

    this.analysisByPackageId[packageId] = analysis;
  }
}

