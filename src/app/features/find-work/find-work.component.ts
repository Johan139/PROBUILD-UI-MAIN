import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChildren,
  QueryList,
  effect,
} from '@angular/core';
import { JobsService } from '../../services/jobs.service';
import { Job } from '../../models/job';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../authentication/auth.service';
import { MapLoaderService } from '../../services/map-loader.service';
import { forkJoin, Observable, Subject, takeUntil } from 'rxjs';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { UserService } from '../../services/user.service';
import { ProfileService } from '../../authentication/profile/profile.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableDataSource } from '@angular/material/table';
import { Bid } from '../../models/bid';
import { BiddingService } from '../../services/bidding.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JOB_TYPES } from '../../data/job-types';
import { Router } from '@angular/router';
import { SubmitBidDialogComponent } from './submit-bid-dialog/submit-bid-dialog.component';
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { BlueprintDisplayDialogComponent } from './information-display-dialog/information-display-dialog.component';
import { ConfirmationDialogComponent } from '../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { QuoteService } from '../../features/quote/quote.service';
import { QuoteListItemDto } from '../quote/quote.model';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../theme.service';
import { UserAddressStoreService } from '../../services/UserAddressStoreService';
import { UserAddress } from '../../authentication/profile/profile.model';

const lightMapId = 'cfb7ea445a870af896b65c20';
const darkMapId = 'cfb7ea445a870af82d9def4b';

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
    GoogleMapsModule,
    MatDialogModule,
    MatMenuModule,
    MatIconModule,
    MatCheckboxModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    JobCardComponent,
    MatButtonModule,
    RouterModule,
  ],
  providers: [MapLoaderService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FindWorkComponent implements OnInit, OnDestroy {
  @ViewChildren(MatPaginator) paginators = new QueryList<MatPaginator>();
  dataSource = new MatTableDataSource<Job>([]);
  myBidsDataSource = new MatTableDataSource<Bid>([]);
  @ViewChild(GoogleMap) mapComponent!: GoogleMap;

  @ViewChild('customAddressInput') customAddressInput!: any;
  autocomplete: google.maps.places.Autocomplete | null = null;
  private destroy$ = new Subject<void>();
  private markersNeedUpdate = false;
  private markerClusterer: MarkerClusterer | null = null;

  // Data properties
  map!: google.maps.Map;
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  myBids: Bid[] = [];
  myQuotes: QuoteListItemDto[] = [];
  draftQuotes = new Map<number, string>();
  savedJobIds = new Set<number>();

  // New UI properties
  userRole: 'contractor' | 'subcontractor' = 'subcontractor';
  activeTab:
    | 'myPostings'
    | 'browseJobs'
    | 'myBids'
    | 'savedJobs'
    | 'jobAlerts' = 'browseJobs';

  // Tab counts
  myPostingsCount = 0;
  browseJobsCount = 0;
  myBidsCount = 0;
  hasNewAlerts = true;

  // Stats
  availableJobsCount = 0;
  newThisWeekCount = 0;
  matchingTradesCount = 0;

  // Job Alerts properties
  alertsEnabled = true;
  alertRadius = 25;
  alertLocation = '';
  selectedAlertTrades: string[] = [];
  emailAlertsEnabled = true;
  pushAlertsEnabled = true;
  smsAlertsEnabled = false;
  quickDistances = [10, 25, 50, 75, 100];
  matchingPreviewJobs: Job[] = [];

  // Filters
  selectedTradesFilter: string[] = [];
  selectedJobTypesFilter: string[] = [];
  distanceFilter: number | null = 25;

  quoteStatusFilter: 'All' | 'Draft' | 'Submitted' | 'Rejected' = 'All';
  selectedJob: Job | null = null;
  selectedPreferences: { [key: string]: boolean } = {
    'Short-term': false,
    'Long-term': false,
    'Contract-based': false,
    'On-demand': false,
  };
  userAddresses: UserAddress[] = [];
  locationMode: 'saved' | 'custom' = 'saved';
  selectedAddressId: number | null = null;
  addressListLoaded = false;
  userTrade: string | undefined;
  searchTerm: string = '';
  distance: number = 100;
  allTrades: string[] = [];
  tradeCounts: { [trade: string]: number } = {};
  selectedTrades: string[] = [];
  sortBy: string = 'distance';
  sortDirection: 'asc' | 'desc' = 'asc';
  allJobTypes = JOB_TYPES;
  selectedJobTypes: string[] = [];
  customAddressLat: number | null = null;
  customAddressLng: number | null = null;
  selectedAddress: UserAddress | null = null;

  // UI state
  distanceUnit: 'km' | 'mi' = 'mi';
  biddedJobIds = new Set<number>();

  // Loading states
  jobsLoading = false;
  bidsLoading = false;
  isMapLoading = true;
  isMapVisible = true;
  mapLoadError = false;
  filtersLoading = true;

  // Map properties
  isApiLoaded$: Observable<boolean>;
  center: google.maps.LatLngLiteral = { lat: 39.8283, lng: -98.5795 };
  zoom = 4;
  radiusCircle: google.maps.Circle | null = null;
  private userMarker: google.maps.marker.AdvancedMarkerElement | null = null;

  mapOptions: google.maps.MapOptions = {
    zoomControl: false,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    maxZoom: 20,
    minZoom: 3,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeControl: false,
    mapId: lightMapId,
    disableDefaultUI: true,
    gestureHandling: 'greedy',
    styles: [],
  };

  markerPositions: JobMarker[] = [];

  constructor(
    private jobsService: JobsService,
    private authService: AuthService,
    private profileService: ProfileService,
    private mapLoader: MapLoaderService,
    private userService: UserService,
    public dialog: MatDialog,
    public router: Router,
    private addressStore: UserAddressStoreService,
    private biddingService: BiddingService,
    private quoteService: QuoteService,
    private themeService: ThemeService,
  ) {
    this.isApiLoaded$ = this.mapLoader.isApiLoaded$;
    this.setupMapLoadingSubscription();

    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.applyMapTheme(isDark ? 'dark' : 'light');

      if (this.map) {
        this.applyMapTheme(isDark ? 'dark' : 'light');
      } else {
        const mapId = isDark ? darkMapId : lightMapId;
        this.mapOptions = { ...this.mapOptions, mapId };
      }
    });
  }

  ngOnInit(): void {
    const savedId = localStorage.getItem('fw_selectedAddressId');
    if (savedId) {
      this.selectedAddressId = parseInt(savedId, 10);
    }
    this.loadUserAddresses();
    this.selectedJobTypes = this.allJobTypes.map((t) => t.value);
    this.selectedJobTypesFilter = [...this.selectedJobTypes];
    this.loadJobs();
    if (this.userAddresses.length === 0) {
      this.centerOnBrowserLocation();
    }
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.userTrade = user?.trade;
        this.updateMatchingTradesCount();
      });
    this.determineDistanceUnit();

    // Load saved jobs from localStorage
    const savedJobs = localStorage.getItem('savedJobIds');
    if (savedJobs) {
      this.savedJobIds = new Set(JSON.parse(savedJobs));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW UI METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  setUserRole(role: 'contractor' | 'subcontractor'): void {
    this.userRole = role;
    // Optionally reload data based on role
  }

  setActiveTab(
    tab: 'myPostings' | 'browseJobs' | 'myBids' | 'savedJobs' | 'jobAlerts',
  ): void {
    this.activeTab = tab;
    this.selectedJob = null;

    if (tab === 'browseJobs' && this.jobs.length === 0) {
      this.loadJobs();
    } else if (
      tab === 'myBids' &&
      this.myBids.length === 0 &&
      this.myQuotes.length === 0
    ) {
      this.loadJobs();
    } else if (tab === 'savedJobs') {
      this.filterSavedJobs();
    } else if (tab === 'jobAlerts') {
      this.loadAlertPreferences();
      this.updateMatchingPreviewJobs();
    }
  }

  onPostNewJob(): void {
    this.router.navigate(['/post-job']);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JOB ALERTS METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  onAlertsToggle(): void {
    this.saveAlertPreferences();
  }

  onAlertLocationChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.alertLocation = input.value;
  }

  useCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Reverse geocode to get address (simplified - just show coords for now)
          this.alertLocation = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        },
        (error) => {
          console.error('Error getting location:', error);
        },
      );
    }
  }

  selectAllTrades(): void {
    this.selectedAlertTrades = [...this.allTrades];
    this.updateMatchingPreviewJobs();
  }

  clearAllTrades(): void {
    this.selectedAlertTrades = [];
    this.updateMatchingPreviewJobs();
  }

  isTradeSelected(trade: string): boolean {
    return this.selectedAlertTrades.includes(trade);
  }

  toggleAlertTrade(trade: string): void {
    const index = this.selectedAlertTrades.indexOf(trade);
    if (index > -1) {
      this.selectedAlertTrades.splice(index, 1);
    } else {
      this.selectedAlertTrades.push(trade);
    }
    this.updateMatchingPreviewJobs();
  }

  saveAlertPreferences(): void {
    const preferences = {
      alertsEnabled: this.alertsEnabled,
      alertRadius: this.alertRadius,
      alertLocation: this.alertLocation,
      selectedAlertTrades: this.selectedAlertTrades,
      emailAlertsEnabled: this.emailAlertsEnabled,
      pushAlertsEnabled: this.pushAlertsEnabled,
      smsAlertsEnabled: this.smsAlertsEnabled,
    };
    localStorage.setItem('jobAlertPreferences', JSON.stringify(preferences));
    // TODO: Save to backend API
    console.log('Alert preferences saved:', preferences);
  }

  loadAlertPreferences(): void {
    const saved = localStorage.getItem('jobAlertPreferences');
    if (saved) {
      const preferences = JSON.parse(saved);
      this.alertsEnabled = preferences.alertsEnabled ?? true;
      this.alertRadius = preferences.alertRadius ?? 25;
      this.alertLocation = preferences.alertLocation ?? '';
      this.selectedAlertTrades = preferences.selectedAlertTrades ?? [];
      this.emailAlertsEnabled = preferences.emailAlertsEnabled ?? true;
      this.pushAlertsEnabled = preferences.pushAlertsEnabled ?? true;
      this.smsAlertsEnabled = preferences.smsAlertsEnabled ?? false;
    } else {
      // Default: select user's trade if available
      if (this.userTrade && this.allTrades.includes(this.userTrade)) {
        this.selectedAlertTrades = [this.userTrade];
      }
      // Default location from selected address
      if (this.selectedAddress) {
        this.alertLocation = this.selectedAddress.formattedAddress || '';
      }
    }
  }

  updateMatchingPreviewJobs(): void {
    // Filter jobs based on current alert criteria
    this.matchingPreviewJobs = this.jobs
      .filter((job) => {
        // Check if job matches selected trades
        if (this.selectedAlertTrades.length > 0) {
          const jobMatchesTrade = job.trades?.some((trade) =>
            this.selectedAlertTrades.includes(trade),
          );
          if (!jobMatchesTrade) return false;
        }

        // Check distance (if we have distance calculated)
        if (job.distance !== undefined && job.distance > this.alertRadius) {
          return false;
        }

        return true;
      })
      .slice(0, 5); // Show max 5 preview jobs
  }

  isNewJob(job: Job): boolean {
    if (!job.biddingStartDate) return false;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return new Date(job.biddingStartDate) >= oneWeekAgo;
  }

  zoomIn(): void {
    if (this.map && this.zoom < 20) {
      this.zoom++;
      this.map.setZoom(this.zoom);
    }
  }

  zoomOut(): void {
    if (this.map && this.zoom > 3) {
      this.zoom--;
      this.map.setZoom(this.zoom);
    }
  }

  centerOnUser(): void {
    if (this.selectedAddress) {
      this.center = {
        lat: this.selectedAddress.latitude,
        lng: this.selectedAddress.longitude,
      };
    } else {
      this.centerOnBrowserLocation();
    }
    if (this.map) {
      this.map.panTo(this.center);
      this.map.setZoom(12);
    }
  }

  toggleSaveJob(job: Job, event: MouseEvent): void {
    event.stopPropagation();

    if (this.savedJobIds.has(job.jobId)) {
      this.savedJobIds.delete(job.jobId);
    } else {
      this.savedJobIds.add(job.jobId);
    }

    // Persist to localStorage
    localStorage.setItem('savedJobIds', JSON.stringify([...this.savedJobIds]));
  }

  isJobSaved(jobId: number): boolean {
    return this.savedJobIds.has(jobId);
  }

  getJobTypeLabel(jobType: string | undefined): string {
    if (!jobType) return 'Unknown';
    const type = this.allJobTypes.find((t) => t.value === jobType);
    return type?.viewValue || jobType;
  }

  filterSavedJobs(): void {
    if (this.activeTab === 'savedJobs') {
      this.filteredJobs = this.jobs.filter((job) =>
        this.savedJobIds.has(job.jobId),
      );
      this.dataSource.data = this.filteredJobs;
    }
  }

  updateStats(): void {
    this.availableJobsCount = this.filteredJobs.length;
    this.browseJobsCount = this.jobs.length;
    this.myBidsCount = this.myQuotes.length;

    // Calculate new this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    this.newThisWeekCount = this.jobs.filter((job) => {
      if (!job.biddingStartDate) return false;
      return new Date(job.biddingStartDate) >= oneWeekAgo;
    }).length;

    this.updateMatchingTradesCount();
  }

  updateMatchingTradesCount(): void {
    if (!this.userTrade) {
      this.matchingTradesCount = 0;
      return;
    }
    this.matchingTradesCount = this.jobs.filter((job) =>
      job.trades?.includes(this.userTrade!),
    ).length;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAP METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  applyMapTheme(theme: 'light' | 'dark'): void {
    const newMapId = theme === 'dark' ? darkMapId : lightMapId;
    this.mapOptions = { ...this.mapOptions, mapId: newMapId };

    if (this.map) {
      const currentCenter = this.map.getCenter();
      const currentZoom = this.map.getZoom();

      this.map.setOptions({ mapId: newMapId });

      google.maps.event.trigger(this.map, 'resize');
      if (currentCenter) {
        this.map.setCenter(currentCenter);
        this.map.setZoom(currentZoom || this.zoom);
      }
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.map = map;
    this.updateUserPin();
    if (this.jobs.length > 0) {
      setTimeout(() => this.updateMapMarkers(), 100);
    }
    this.updateRadiusCircle();
  }

  private setupMapLoadingSubscription(): void {
    this.isApiLoaded$.pipe(takeUntil(this.destroy$)).subscribe((loaded) => {
      this.isMapLoading = !loaded;
      if (loaded && this.customAddressInput) {
        this.setupAutocomplete();
      }
      if (!loaded) {
        setTimeout(() => {
          if (!this.isMapLoading) return;
          this.mapLoadError = true;
          this.isMapLoading = false;
        }, 10000);
      } else {
        this.mapLoadError = false;
      }
    });
  }

  retryMapLoad(): void {
    this.mapLoadError = false;
    this.isMapLoading = true;
    window.location.reload();
  }

  updateMapMarkers(): void {
    if (!this.map) return;

    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
    }

    this.markerPositions.forEach((marker) => {
      if (marker.marker) {
        marker.marker.map = null;
      }
    });
    this.markerPositions = [];

    google.maps
      .importLibrary('marker')
      .then((markerLibrary) => {
        const { AdvancedMarkerElement, PinElement } =
          markerLibrary as google.maps.MarkerLibrary;

        const jobsToMark = this.jobs.filter((job) => {
          const lat = job.latitude;
          const lng = job.longitude;
          return !isNaN(lat) && !isNaN(lng);
        });

        const markers = jobsToMark.map((job) => {
          const position = { lat: job.latitude, lng: job.longitude };

          // Determine marker color based on job status
          let background = '#4ade80'; // Green for open jobs
          if (this.savedJobIds.has(job.jobId)) {
            background = '#c084fc'; // Purple for saved
          } else if (this.getQuoteForJob(job.jobId)) {
            background = '#60a5fa'; // Blue for bid placed
          }

          const pinElement = new PinElement({
            background,
            borderColor: '#FFFFFF',
            glyphColor: '#FFFFFF',
            scale: 1.0,
          });

          const marker = new AdvancedMarkerElement({
            position,
            title: job.projectName,
            content: pinElement.element,
          });

          marker.addListener('click', () => {
            this.onMarkerClick({
              jobId: job.jobId,
              position,
              title: job.projectName,
            });
          });

          this.markerPositions.push({
            position,
            title: job.projectName,
            jobId: job.jobId,
            marker: marker,
          });

          return marker;
        });

        if (!this.markerClusterer) {
          this.markerClusterer = new MarkerClusterer({
            map: this.map,
            markers: [],
          });
        }

        this.markerClusterer.addMarkers(markers);
      })
      .catch((error) => {
        console.error('Error loading marker library');
      });
  }

  private centerOnBrowserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        this.center = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.zoom = 10;
        if (this.map) {
          this.map.panTo(this.center);
          this.map.setZoom(this.zoom);
        }
      });
    }
    setTimeout(() => {
      this.updateRadiusCircle();
      this.updateUserPin();
    }, 50);
  }

  updateRadiusCircle(): void {
    if (!this.map) return;

    const radiusInMeters =
      this.distanceUnit === 'mi'
        ? this.distance * 1609.34
        : this.distance * 1000;

    if (this.radiusCircle) {
      this.radiusCircle.setCenter(this.center);
      this.radiusCircle.setRadius(radiusInMeters);
    } else {
      this.radiusCircle = new google.maps.Circle({
        strokeColor: '#60a5fa',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: '#60a5fa',
        fillOpacity: 0.1,
        map: this.map,
        center: this.center,
        radius: radiusInMeters,
      });
    }
  }

  private updateUserPin(): void {
    if (!this.map) return;

    google.maps.importLibrary('marker').then((markerLib) => {
      const { AdvancedMarkerElement, PinElement } = markerLib as any;

      const pin = new PinElement({
        background: '#f5c518',
        borderColor: '#FFFFFF',
        glyphColor: '#FFFFFF',
        scale: 1.2,
      });

      if (this.userMarker) {
        this.userMarker.position = this.center;
        return;
      }

      this.userMarker = new AdvancedMarkerElement({
        map: this.map,
        position: this.center,
        content: pin.element,
      });
    });
  }

  onMarkerClick(marker: JobMarker): void {
    this.selectedJob = this.jobs.find((j) => j.jobId === marker.jobId) || null;
  }

  highlightMarker(jobId: number): void {
    const marker = this.markerPositions.find((m) => m.jobId === jobId);
    if (marker && marker.marker) {
      google.maps.importLibrary('marker').then((markerLib) => {
        const { PinElement } = markerLib as any;
        const pinElement = new PinElement({
          background: '#f5c518',
          borderColor: '#000',
          glyphColor: '#000',
          scale: 1.3,
        });
        marker.marker!.content = pinElement.element;
      });
    }
  }

  unhighlightMarker(jobId: number): void {
    const marker = this.markerPositions.find((m) => m.jobId === jobId);
    if (marker && marker.marker) {
      google.maps.importLibrary('marker').then((markerLib) => {
        const { PinElement } = markerLib as any;

        let background = '#4ade80';
        if (this.savedJobIds.has(jobId)) {
          background = '#c084fc';
        } else if (this.getQuoteForJob(jobId)) {
          background = '#60a5fa';
        }

        const pinElement = new PinElement({
          background,
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 1.0,
        });
        marker.marker!.content = pinElement.element;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDRESS METHODS
  // ═══════════════════════════════════════════════════════════════════════════

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
    this.filtersLoading = false;

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
    this.selectedAddress = address;

    setTimeout(() => {
      this.updateRadiusCircle();
      this.updateUserPin();
    }, 50);

    this.jobs.forEach((job) => {
      job.distance = this.calculateDistance(
        userLat,
        userLng,
        job.latitude,
        job.longitude,
      );
    });

    this.sortJobsByDistance();
    this.applyFilters();

    if (this.map) {
      this.updateMapMarkers();
    }
  }

  setupAutocomplete(): void {
    if (!this.customAddressInput) return;

    this.autocomplete = new google.maps.places.Autocomplete(
      this.customAddressInput.nativeElement,
      {
        fields: ['formatted_address', 'geometry'],
      },
    );

    this.autocomplete.addListener('place_changed', () => {
      const place = this.autocomplete!.getPlace();

      if (!place.geometry || !place.geometry.location) {
        console.warn('Place has no geometry');
        return;
      }

      this.customAddressLat = place.geometry.location.lat();
      this.customAddressLng = place.geometry.location.lng();

      this.applyCustomAddress();

      if (this.map) {
        this.map.panTo({
          lat: this.customAddressLat,
          lng: this.customAddressLng,
        });
        this.map.setZoom(12);
      }
    });
  }

  setLocationMode(mode: 'saved' | 'custom'): void {
    this.locationMode = mode;

    if (mode === 'saved') {
      this.customAddressLat = null;
      this.customAddressLng = null;
      this.applySelectedAddress();
    } else {
      setTimeout(() => {
        if (this.customAddressInput) {
          this.setupAutocomplete();
        }
      }, 50);

      if (this.customAddressLat && this.customAddressLng) {
        this.applyCustomAddress();
      }
    }
  }

  applyCustomAddress(): void {
    if (!this.customAddressLat || !this.customAddressLng) return;

    this.center = {
      lat: this.customAddressLat,
      lng: this.customAddressLng,
    };

    this.zoom = 12;

    this.updateRadiusCircle();
    this.updateUserPin();

    this.jobs.forEach((job) => {
      job.distance = this.calculateDistance(
        this.customAddressLat!,
        this.customAddressLng!,
        job.latitude,
        job.longitude,
      );
    });

    this.sortJobsByDistance();
    this.applyFilters();
    this.updateMapMarkers();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JOBS & DATA METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  loadJobs(): void {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.jobsLoading = true;

    forkJoin({
      jobs: this.jobsService.getAllJobs(),
      quotes: this.quoteService.getUserQuotes(userId),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ jobs, quotes }) => {
          this.jobs = jobs.map((job) => ({
            ...job,
            latitude: Number(job.latitude),
            longitude: Number(job.longitude),
          }));

          this.myQuotes = quotes;
          this.draftQuotes.clear();

          quotes.forEach((q) => {
            if (q.status === 'Draft' && q.jobId) {
              this.draftQuotes.set(q.jobId, q.id);
            }
          });

          // Extract all trades from jobs
          const tradesSet = new Set<string>();
          this.jobs.forEach((job) => {
            job.trades?.forEach((trade) => tradesSet.add(trade));
          });
          this.allTrades = [...tradesSet].sort();
          this.selectedTrades = [...this.allTrades];
          this.selectedTradesFilter = [];

          this.getUserLocationAndCalculateDistances();
          this.applyFilters();
          this.updateStats();

          this.jobsLoading = false;
          this.filtersLoading = false;
        },
        error: () => {
          this.jobsLoading = false;
          this.filtersLoading = false;
        },
      });
  }

  private getUserLocationAndCalculateDistances(): void {
    if (this.selectedAddress) {
      const userLat = this.selectedAddress.latitude;
      const userLng = this.selectedAddress.longitude;

      this.jobs.forEach((job) => {
        job.distance = this.calculateDistance(
          userLat,
          userLng,
          job.latitude,
          job.longitude,
        );
      });

      this.sortJobsByDistance();
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          this.jobs.forEach((job) => {
            const jobLat = job.latitude;
            const jobLng = job.longitude;
            job.distance = this.calculateDistance(
              userLat,
              userLng,
              jobLat,
              jobLng,
            );
          });

          this.sortJobsByDistance();
        },
        (error) => {
          console.error('Error getting user location:', error);
          this.applyFilters();
        },
      );
    } else {
      this.applyFilters();
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

  private sortJobsByDistance(): void {
    this.jobs.sort(
      (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
    );
    this.applyFilters();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTER METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  applyFilters(): void {
    let filtered = [...this.jobs];

    // Search term filter
    if (this.searchTerm) {
      const lowercasedTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.projectName &&
            job.projectName.toLowerCase().includes(lowercasedTerm)) ||
          (job.jobType && job.jobType.toLowerCase().includes(lowercasedTerm)) ||
          (job.description &&
            job.description.toLowerCase().includes(lowercasedTerm)) ||
          job.trades?.some((trade) =>
            trade.toLowerCase().includes(lowercasedTerm),
          ),
      );
    }

    // Distance filter
    const effectiveDistance = this.distanceFilter ?? this.distance;
    filtered = filtered.filter(
      (job) => job.distance === undefined || job.distance <= effectiveDistance,
    );

    // Update distance for radius circle
    this.distance = effectiveDistance;
    this.updateRadiusCircle();

    // Trade counts calculation
    this.tradeCounts = this.allTrades.reduce(
      (acc, trade) => {
        acc[trade] = filtered.filter((job) =>
          job.trades?.includes(trade),
        ).length;
        return acc;
      },
      {} as { [trade: string]: number },
    );

    // Trades filter
    if (this.selectedTradesFilter && this.selectedTradesFilter.length > 0) {
      filtered = filtered.filter((job) =>
        job.trades?.some((trade) => this.selectedTradesFilter.includes(trade)),
      );
    }

    // Job types filter
    if (
      this.selectedJobTypesFilter &&
      this.selectedJobTypesFilter.length > 0 &&
      this.selectedJobTypesFilter.length < this.allJobTypes.length
    ) {
      filtered = filtered.filter(
        (job) =>
          job.jobType && this.selectedJobTypesFilter.includes(job.jobType),
      );
    }

    // Handle saved jobs tab
    if (this.activeTab === 'savedJobs') {
      filtered = filtered.filter((job) => this.savedJobIds.has(job.jobId));
    }

    this.filteredJobs = filtered;
    this.dataSource.data = this.filteredJobs;

    if (this.map) {
      this.updateMapMarkers();
    }

    this.updateStats();
    this.saveFiltersToLocalStorage();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.distanceFilter = 25;
    this.distance = 25;
    this.selectedTradesFilter = [];
    this.selectedJobTypesFilter = [];
    this.sortBy = 'distance';
    this.sortDirection = 'asc';
    this.applyFilters();
  }

  sortJobs(): void {
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    switch (this.sortBy) {
      case 'distance':
        this.filteredJobs.sort(
          (a, b) =>
            ((a.distance ?? Infinity) - (b.distance ?? Infinity)) * direction,
        );
        break;
      case 'startDate':
        this.filteredJobs.sort((a, b) => {
          const dateA = a.potentialStartDate
            ? new Date(a.potentialStartDate).getTime()
            : Infinity;
          const dateB = b.potentialStartDate
            ? new Date(b.potentialStartDate).getTime()
            : Infinity;
          return (dateA - dateB) * direction;
        });
        break;
      case 'postedDate':
        this.filteredJobs.sort((a, b) => {
          const dateA = a.biddingStartDate
            ? new Date(a.biddingStartDate).getTime()
            : 0;
          const dateB = b.biddingStartDate
            ? new Date(b.biddingStartDate).getTime()
            : 0;
          return (dateB - dateA) * direction;
        });
        break;
    }

    this.dataSource.data = this.filteredJobs;
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortJobs();
  }

  private saveFiltersToLocalStorage(): void {
    const filters = {
      distance: this.distanceFilter,
      selectedTrades: this.selectedTradesFilter,
      selectedJobTypes: this.selectedJobTypesFilter,
      sortBy: this.sortBy,
    };
    localStorage.setItem('findWorkFilters', JSON.stringify(filters));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JOB INTERACTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  onJobClick(job: Job): void {
    this.selectedJob = job;
    if (job.latitude && job.longitude) {
      this.center = {
        lat: job.latitude,
        lng: job.longitude,
      };
      if (this.map) {
        this.map.panTo(this.center);
        this.map.setZoom(14);
      }
    }
  }

  closeJobInfo(): void {
    this.selectedJob = null;
  }

  trackByJobId(index: number, job: Job): number {
    return job.jobId;
  }

  trackByMarkerId(index: number, marker: JobMarker): string {
    return marker.jobId.toString();
  }

  trackByBidId(index: number, bid: Bid): number {
    return bid.id;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BIDDING & QUOTES METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  openBidDialog(jobId: number, event: MouseEvent): void {
    event.stopPropagation();

    const dialogRef = this.dialog.open(SubmitBidDialogComponent, {
      width: '800px',
      data: { jobId: jobId },
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

  onViewQuote(quote: QuoteListItemDto | null): void {
    if (!quote) return;
    this.router.navigate(['/quote'], {
      queryParams: { quoteId: quote.id },
    });
  }

  onViewPdf(url: string): void {
    window.open(url, '_blank');
  }

  onWithdrawQuote(quote: QuoteListItemDto): void {
    this.quoteService
      .changeStatus(quote.id, 'Withdrawn')
      .subscribe(() => this.loadJobs());
  }

  onEditQuote(quote: QuoteListItemDto): void {
    this.router.navigate(['/quote'], {
      queryParams: { quoteId: quote.id, edit: true },
    });
  }

  onViewMoreInfo(job: Job | null): void {
    if (!job) return;
    this.dialog.open(BlueprintDisplayDialogComponent, {
      width: '90vw',
      height: '90vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      data: {
        jobId: job.jobId,
        projectName: job.projectName,
      },
    });
  }

  hasBidded(jobId: number): boolean {
    return this.myQuotes.some(
      (q) => q.jobId === jobId && q.status === 'Submitted',
    );
  }

  onWithdrawBid(bid: Bid | null): void {
    if (!bid?.quoteId) return;

    const quote = this.myQuotes.find((q) => q.id === bid.quoteId);
    if (!quote) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Withdraw Bid',
        message:
          'Are you sure you want to withdraw this bid? This action cannot be undone.',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && quote) {
        this.quoteService
          .changeStatus(quote.id, 'Withdrawn')
          .subscribe(() => this.loadJobs());
      }
    });
  }

  onEditBid(bid: Bid | null): void {
    if (!bid?.quoteId) return;

    this.router.navigate(['/quote'], {
      queryParams: { quoteId: bid.quoteId, edit: true },
    });
  }

  applyQuoteFilter(): void {
    this.applyFilters();
  }

  getQuoteForBid(bid: Bid): QuoteListItemDto | null {
    if (!bid?.quoteId) return null;
    return this.myQuotes.find((q) => q.id === bid.quoteId) ?? null;
  }
}
