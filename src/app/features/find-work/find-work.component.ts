// TODO: think about what to do if no geolocation available
// TODO: think about filtering - client/server side - might be a pain to update down the line, server side preferable
// TODO: could implement a search like Airbnb - "Search Here" and refresh the markers or something
// TODO: hide this entire thing from general contractors (maybe?)
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChildren,
  QueryList,
  ChangeDetectorRef,
} from '@angular/core';
import { JobsService } from '../../services/jobs.service';
import { Job } from '../../models/job';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../authentication/auth.service';
import { MapLoaderService } from '../../services/map-loader.service';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { UserService } from '../../services/user.service';
import { ProfileService } from '../../authentication/profile/profile.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ReactiveFormsModule } from '@angular/forms';
import { Bid } from '../../models/bid';
import { BiddingService } from '../../services/bidding.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JOB_TYPES } from '../../data/job-types';
import { Router } from '@angular/router';
import { SubmitBidDialogComponent } from './submit-bid-dialog/submit-bid-dialog.component';
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { JobDetailsDialogComponent } from './job-details-dialog/job-details-dialog.component';
import { PostJobDialogComponent } from './post-job-dialog/post-job-dialog.component';
import { QuoteService } from '../../features/quote/quote.service';
import { QuoteListItemDto } from '../quote/quote.model';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../theme.service';
import { UserAddressStoreService } from '../../services/UserAddressStoreService';
import { UserAddress } from '../../authentication/profile/profile.model';
import { BomService } from '../../features/jobs/services/bom.service';
import { MyJobPostingsComponent } from './components/my-job-postings/my-job-postings.component';
import { BrowseJobsComponent } from './components/browse-jobs/browse-jobs.component';
import { MyBidsComponent } from './components/my-bids/my-bids.component';
import { SavedJobsComponent } from './components/saved-jobs/saved-jobs.component';
import { JobAlertsComponent } from './components/job-alerts/job-alerts.component';
import { FindWorkMapComponent } from './components/find-work-map/find-work-map.component';

interface JobMarker {
  position: google.maps.LatLngLiteral;
  title: string;
  jobId: number;
  marker?: google.maps.marker.AdvancedMarkerElement;
}

@Component({
  selector: 'app-find-work',
  templateUrl: './find-work.component.html',
  styleUrls: ['./find-work.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatMenuModule,
    MatIconModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    JobCardComponent,
    MatButtonModule,
    RouterModule,
    MyJobPostingsComponent,
    BrowseJobsComponent,
    MyBidsComponent,
    SavedJobsComponent,
    JobAlertsComponent,
    FindWorkMapComponent,
  ],
  providers: [MapLoaderService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FindWorkComponent implements OnInit, OnDestroy {
  @ViewChildren(MatPaginator) paginators = new QueryList<MatPaginator>();
  @ViewChild(FindWorkMapComponent) mapChild!: FindWorkMapComponent;

  private destroy$ = new Subject<void>();

  // Data properties
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  myBids: Bid[] = [];
  myQuotes: QuoteListItemDto[] = [];
  draftQuotes = new Map<number, string>(); // jobId → quoteId

  quoteStatusFilter: 'All' | 'Draft' | 'Submitted' | 'Rejected' = 'All';
  selectedJob: Job | null = null;

  userAddresses: UserAddress[] = [];
  locationMode: 'saved' | 'custom' = 'saved';
  selectedAddressId: number | null = null;
  addressListLoaded = false;
  userTrade: string | undefined;

  allTrades: string[] = [
    'New Build',
    'Electrical',
    'Plumbing',
    'HVAC',
    'Roofing',
    'Concrete',
    'Framing',
    'Drywall',
    'Painting',
    'Flooring',
    'Landscaping',
    'Masonry',
    'Insulation',
    'Windows & Doors',
    'Cabinetry',
    'Tile & Stone',
    'Demolition',
    'Excavation',
    'Steel & Welding',
  ];
  selectedTrades: string[] = []; // For Alerts
  allJobTypes = JOB_TYPES;

  customAddressLat: number | null = null;
  customAddressLng: number | null = null;
  selectedAddress: UserAddress | null = null;

  // UI state
  activeTab: 'postings' | 'browse' | 'bids' | 'saved' | 'alerts' | 'invite' =
    'browse';
  distanceUnit: 'km' | 'mi' = 'km';
  biddedJobIds: number[] = [];
  myPostings: Job[] = [];
  savedJobs: number[] = [];
  jobNotes: { [jobId: number]: string } = {};
  showAIAnalysis = false;
  showQuoteUpload = false;

  notificationPreferences = {
    email: true,
    push: true,
    sms: false,
  };

  // Loading states
  jobsLoading = false;
  bidsLoading = false;
  filtersLoading = true;

  // Map properties
  center: google.maps.LatLngLiteral = { lat: 39.8283, lng: -98.5795 }; // Center of USA
  zoom = 4;

  constructor(
    private jobsService: JobsService,
    private authService: AuthService,
    private profileService: ProfileService,
    private userService: UserService,
    public dialog: MatDialog,
    public router: Router,
    private addressStore: UserAddressStoreService,
    private biddingService: BiddingService,
    private quoteService: QuoteService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private bomService: BomService,
  ) {}

  ngOnInit(): void {
    const savedId = localStorage.getItem('fw_selectedAddressId');
    if (savedId) {
      this.selectedAddressId = parseInt(savedId, 10);
    }
    this.loadUserAddresses();
    this.loadJobs();
    if (this.userAddresses.length === 0) {
      this.centerOnBrowserLocation();
    }
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.userTrade = user?.trade;
      });
    this.determineDistanceUnit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserAddresses(): void {
    this.userAddresses = this.addressStore.getAddresses() ?? [];

    if (this.userAddresses.length === 0) {
      const userId = this.authService.getUserId();
      if (userId) {
        this.profileService.getUserAddresses(userId).subscribe({
          next: (addresses) => {
            this.userAddresses = addresses;
            this.addressStore.setAddresses(addresses);
            this.afterAddressesLoaded();
          },
          error: () => {
            this.afterAddressesLoaded();
          },
        });
        return;
      }
    }

    this.afterAddressesLoaded();
  }

  private afterAddressesLoaded(): void {
    this.addressListLoaded = true;

    if (this.selectedAddressId) {
      this.applySelectedAddress();
      return;
    }

    if (this.userAddresses.length === 1) {
      this.selectedAddressId = this.userAddresses[0].id;
      this.applySelectedAddress();
      return;
    }

    if (this.userAddresses.length === 0) {
      this.filteredJobs = [...this.jobs];
    }
  }

  onAddressSelected(): void {
    this.selectedAddress =
      this.userAddresses.find((a) => a.id === this.selectedAddressId) || null;
    if (this.selectedAddressId) {
      localStorage.setItem(
        'fw_selectedAddressId',
        this.selectedAddressId.toString(),
      );
    }
    this.applySelectedAddress();
  }

  private applySelectedAddress(): void {
    if (!this.selectedAddressId) return;

    const address = this.userAddresses.find(
      (a) => a.id === this.selectedAddressId,
    );
    if (!address) return;

    const userLat = address.latitude;
    const userLng = address.longitude;

    if (!userLat || !userLng) return;

    this.center = { lat: userLat, lng: userLng };
    this.zoom = 10;

    this.recalculateDistances(userLat, userLng);
  }

  setLocationMode(mode: 'saved' | 'custom') {
    this.locationMode = mode;

    if (mode === 'saved') {
      this.customAddressLat = null;
      this.customAddressLng = null;
      this.applySelectedAddress();
    } else {
      if (this.customAddressLat && this.customAddressLng) {
        this.applyCustomAddress();
      }
    }
  }

  onLocationModeChange() {
    if (this.locationMode === 'saved') {
      this.applySelectedAddress();
    } else {
      if (this.customAddressLat && this.customAddressLng) {
        this.applyCustomAddress();
      }
    }
  }

  applyCustomAddress() {
    if (!this.customAddressLat || !this.customAddressLng) return;

    this.center = {
      lat: this.customAddressLat,
      lng: this.customAddressLng,
    };

    this.zoom = 12;

    this.recalculateDistances(this.customAddressLat, this.customAddressLng);
  }

  onCustomLocationChange(event: { lat: number; lng: number }) {
    this.customAddressLat = event.lat;
    this.customAddressLng = event.lng;
    this.applyCustomAddress();
  }

  private recalculateDistances(lat: number, lng: number) {
    this.jobs.forEach((job) => {
      job.distance = this.calculateDistance(
        lat,
        lng,
        job.latitude,
        job.longitude,
      );
    });

    this.jobs = [...this.jobs]; // Trigger change detection for inputs
    // filteredJobs will be updated by BrowseJobsComponent when it receives new jobs
  }

  loadJobs(): void {
    const userId = this.authService.getUserId();

    if (!userId) {
      this.filtersLoading = false;
      return;
    }

    this.jobsLoading = true;

    forkJoin({
      jobs: this.jobsService.getAllJobs(),
      myPostings: this.bomService.getMyMarketplacePostings(userId),
      quotes: this.quoteService.getUserQuotes(userId),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ jobs, myPostings, quotes }) => {
          const parseCoord = (val: any) =>
            typeof val === 'string'
              ? parseFloat(val.replace(',', '.'))
              : Number(val);

          this.jobs = jobs.map((job) => ({
            ...job,
            latitude: parseCoord(job.latitude),
            longitude: parseCoord(job.longitude),
          }));

          if (Array.isArray(myPostings)) {
            this.myPostings = myPostings
              .filter((pkg: any) => !pkg.isHidden && !pkg.isInactive)
              .map((pkg: any) => {
              const durationInDays = this.parseDurationInDays(
                pkg.estimatedDuration,
                Number(pkg.estimatedManHours || 0),
              );
              const laborBudget = Number(pkg.laborBudget || 0);
              const materialBudget = Number(pkg.materialBudget || 0);
              const laborBudgetVisible = pkg.laborBudgetVisible !== false;
              const materialBudgetVisible = pkg.materialBudgetVisible !== false;
              const visibleBudget =
                (laborBudgetVisible ? laborBudget : 0) +
                (materialBudgetVisible ? materialBudget : 0);

              return {
                jobId: pkg.jobId,
                projectName: pkg.projectName,
                jobType: pkg.category,
                status: pkg.status,
                address: pkg.address,
                city: pkg.city,
                state: pkg.state,
                streetNumber: '',
                streetName: '',
                postalCode: '',
                country: '',
                latitude: 0,
                longitude: 0,
                googlePlaceId: '',
                description: pkg.scopeOfWork,
                title: pkg.tradeName,
                biddingType: pkg.laborType || 'Labor and Materials',
                jobPreferences: '',
                trades: [pkg.tradeName],
                tradeBudgets: [
                  {
                    tradeName: pkg.tradeName,
                    budget: Number(visibleBudget || 0),
                  },
                ],
                potentialStartDate: pkg.startDate
                  ? new Date(pkg.startDate)
                  : undefined,
                durationInDays,
                numberOfBids: 0,
                createdAt: pkg.createdAt,
                biddingStartDate: pkg.bidDeadline || pkg.createdAt,
                tradePackageId: pkg.id,
                tradePackageStatus: pkg.status,
                tradePackageEstimatedManHours: pkg.estimatedManHours,
                tradePackageHourlyRate: pkg.hourlyRate,
                tradePackageLaborBudget: laborBudget,
                tradePackageMaterialBudget: materialBudget,
                tradePackageLaborBudgetVisible: laborBudgetVisible,
                tradePackageMaterialBudgetVisible: materialBudgetVisible,
                tradePackageTotalBudget: Number(pkg.totalBudget || pkg.budget || 0),
                tradePackageEffectiveBudget: Number(pkg.effectiveBudget || pkg.budget || 0),
                tradePackageEstimatedDuration: pkg.estimatedDuration,
                tradePackageStartDate: pkg.startDate,
                tradePackageBidDeadline: pkg.bidDeadline,
                tradePackageLaborType: pkg.laborType,
                tradePackageCsiCode: pkg.csiCode,
                tradePackageLinkedTradePackageId: pkg.linkedTradePackageId,
                tradePackageIsAutoGenerated: !!pkg.isAutoGenerated,
                tradePackageIsInactive: !!pkg.isInactive,
                tradePackageIsHidden: !!pkg.isHidden,
                tradePackageSourceType: pkg.sourceType || null,
                tradePackageIsInHouse: !!pkg.isInHouse,
                tradePackagePostedToMarketplace: pkg.postedToMarketplace,
                tradePackageCreatedAt: pkg.createdAt,
              } as Job;
            });
          } else {
            this.myPostings = [];
          }

          this.myQuotes = quotes;
          this.draftQuotes.clear();
          this.biddedJobIds = [];

          quotes.forEach((q) => {
            if (q.status === 'Draft' && q.jobId) {
              this.draftQuotes.set(q.jobId, q.id);
            }
            if (q.status === 'Submitted' && q.jobId) {
              this.biddedJobIds.push(q.jobId);
            }
          });

          this.getUserLocationAndCalculateDistances();
          this.filteredJobs = [...this.jobs];

          this.jobsLoading = false;
          this.filtersLoading = false;
        },
        error: (err) => {
          this.jobsLoading = false;
          this.filtersLoading = false;
        },
      });
  }

  setActiveTab(
    tab: 'postings' | 'browse' | 'bids' | 'saved' | 'alerts' | 'invite',
  ): void {
    this.activeTab = tab;
    this.selectedJob = null;
  }

  private centerOnBrowserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.center = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.zoom = 10;
      });
    }
  }

  private getUserLocationAndCalculateDistances(): void {
    if (this.selectedAddress) {
      const userLat = this.selectedAddress.latitude;
      const userLng = this.selectedAddress.longitude;
      this.recalculateDistances(userLat, userLng);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          this.recalculateDistances(userLat, userLng);
        },
        (error) => {
          console.error('Error getting user location:', error);
        },
      );
    }
  }

  private determineDistanceUnit(): void {
    const userLocale = navigator.language || (navigator as any).userLanguage;
    if (userLocale === 'en-US' || userLocale === 'en-GB') {
      this.distanceUnit = 'mi';
    } else {
      this.distanceUnit = 'km';
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = this.distanceUnit === 'mi' ? 3959 : 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  onMarkerClick(marker: JobMarker): void {
    this.selectedJob = this.jobs.find((j) => j.jobId === marker.jobId) || null;
  }

  closeJobInfo(): void {
    this.selectedJob = null;
  }

  trackByJobId(index: number, job: Job): number {
    return job.jobId;
  }

  trackByBidId(index: number, bid: Bid): number {
    return bid.id;
  }

  highlightMarker(jobId: number): void {
    if (this.mapChild) {
      this.mapChild.highlightMarker(jobId);
    }
  }

  unhighlightMarker(jobId: number): void {
    if (this.mapChild) {
      this.mapChild.unhighlightMarker(jobId);
    }
  }

  onJobClick(job: Job): void {
    this.selectedJob = job;
    if (job.latitude && job.longitude) {
      this.center = {
        lat: job.latitude,
        lng: job.longitude,
      };
      this.zoom = 12;
    }
    this.onViewMoreInfo(job);
  }

  onFilteredJobsChange(filteredJobs: Job[]) {
    this.filteredJobs = filteredJobs;
  }

  private loadFiltersFromLocalStorage(): void {
    const savedJobsStr = localStorage.getItem('fw_savedJobs');
    if (savedJobsStr) {
      this.savedJobs = JSON.parse(savedJobsStr);
    }

    const jobNotesStr = localStorage.getItem('fw_jobNotes');
    if (jobNotesStr) {
      this.jobNotes = JSON.parse(jobNotesStr);
    }
  }

  saveSavedJobs(): void {
    localStorage.setItem('fw_savedJobs', JSON.stringify(this.savedJobs));
  }

  toggleSavedJob(jobId: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();

    if (this.savedJobs.includes(jobId)) {
      this.savedJobs = this.savedJobs.filter((id) => id !== jobId);
    } else {
      this.savedJobs.push(jobId);
    }
    this.saveSavedJobs();
    if (this.activeTab === 'saved') {
      this.filteredJobs = this.jobs.filter((job) =>
        this.savedJobs.includes(job.jobId),
      );
    }
  }

  saveJobNotes(): void {
    localStorage.setItem('fw_jobNotes', JSON.stringify(this.jobNotes));
  }

  openPostJobDialog(): void {
    const dialogRef = this.dialog.open(PostJobDialogComponent, {
      width: '600px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('New Job Posted:', result);
      }
    });
  }

  openBidDialog(jobId: number, tradePackageId: number | undefined, event: MouseEvent): void {
    event.stopPropagation();

    const dialogRef = this.dialog.open(SubmitBidDialogComponent, {
      width: '800px',
      data: { jobId: jobId, tradePackageId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'create') {
        this.router.navigate(['/quote'], { queryParams: { jobId: jobId } });
      } else if (result) {
        this.loadJobs();
      }
    });
  }

  getDraftQuoteId(jobId: number): string | undefined {
    return this.draftQuotes.get(jobId);
  }

  getQuoteForJob(jobId: number): QuoteListItemDto | null {
    return this.myQuotes.find((q) => q.jobId === jobId) ?? null;
  }

  getBidForJob(jobId: number): Bid | null {
    const bid =
      this.myBids.find((b) => b.jobId?.toString() === jobId.toString()) || null;
    return bid;
  }

  onViewMoreInfo(job: Job | null): void {
    if (!job) return;

    const canEdit = this.myPostings.some((posting: any) => {
      const sameTrade = posting.trades?.[0] === job.trades?.[0];
      return posting.jobId === job.jobId && sameTrade;
    });

    const dialogRef = this.dialog.open(JobDetailsDialogComponent, {
      width: '720px',
      height: '90vh',
      maxWidth: '92vw',
      maxHeight: '100vh',
      data: {
        job: job,
        saved: this.savedJobs.includes(job.jobId),
        notes: this.jobNotes[job.jobId],
        canEdit,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result.saved && !this.savedJobs.includes(job.jobId)) {
          this.savedJobs.push(job.jobId);
          this.saveSavedJobs();
        } else if (!result.saved && this.savedJobs.includes(job.jobId)) {
          this.savedJobs = this.savedJobs.filter((id) => id !== job.jobId);
          this.saveSavedJobs();
        }

        if (result.notes !== undefined) {
          this.jobNotes[job.jobId] = result.notes;
          this.saveJobNotes();
        }

        if (result.updatedJob) {
          const updateLocalJob = (target: Job) => {
            target.tradeBudgets = result.updatedJob.tradeBudgets;
            target.potentialStartDate = result.updatedJob.potentialStartDate;
            target.durationInDays = result.updatedJob.durationInDays;
            target.biddingType = result.updatedJob.biddingType;
            target.biddingStartDate = result.updatedJob.biddingStartDate;
          };

          const posting = this.myPostings.find(
            (j) => j.jobId === job.jobId && j.trades?.[0] === job.trades?.[0],
          );
          if (posting) updateLocalJob(posting);

          const listJob = this.jobs.find((j) => j.jobId === job.jobId);
          if (listJob) updateLocalJob(listJob);
        }

        if (result.tradePackageUpdate?.id) {
          this.bomService
            .updateTradePackage(
              result.tradePackageUpdate.id,
              result.tradePackageUpdate,
            )
            .subscribe({
              next: () => {
                this.loadJobs();
              },
              error: (err) => {
                console.error('Failed to persist trade package updates', err);
              },
            });
        }
      }
    });
  }

  hasBidded(jobId: number): boolean {
    return this.myQuotes.some(
      (q) => q.jobId === jobId && q.status === 'Submitted',
    );
  }

  private parseDurationInDays(
    estimatedDuration: string | null | undefined,
    estimatedManHours: number,
  ): number | undefined {
    const text = String(estimatedDuration || '').trim();
    const fromText = text.match(/(\d+(?:\.\d+)?)/);
    if (fromText) {
      const parsed = Number(fromText[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        return Math.ceil(parsed);
      }
    }

    if (Number.isFinite(estimatedManHours) && estimatedManHours > 0) {
      return Math.max(1, Math.ceil(estimatedManHours / 8));
    }

    return undefined;
  }
}
