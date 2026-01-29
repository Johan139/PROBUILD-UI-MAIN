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
  draftQuotes = new Map<number, string>(); // jobId → quoteId

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
  activeTab: 'allJobs' | 'myBids' = 'allJobs';
  distanceUnit: 'km' | 'mi' = 'km';
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
  center: google.maps.LatLngLiteral = { lat: 39.8283, lng: -98.5795 }; // Center of USA
  zoom = 4;
  radiusCircle: google.maps.Circle | null = null;
  private userMarker: google.maps.marker.AdvancedMarkerElement | null = null;

  applyMapTheme(theme: 'light' | 'dark') {
    const newMapId = theme === 'dark' ? darkMapId : lightMapId;

    // console.log(`Applying mapId: ${newMapId}`);
    this.mapOptions = { ...this.mapOptions, mapId: newMapId };

    if (this.map) {
      // Force map to re-render with new theme
      const currentCenter = this.map.getCenter();
      const currentZoom = this.map.getZoom();

      this.map.setOptions({ mapId: newMapId });

      // Sometimes needed to force refresh
      google.maps.event.trigger(this.map, 'resize');
      if (currentCenter) {
        this.map.setCenter(currentCenter);
        this.map.setZoom(currentZoom || this.zoom);
      }
    }
  }

  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    maxZoom: 20,
    minZoom: 3,
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: false,
    mapId: lightMapId,
    disableDefaultUI: false,
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
    // 🔥 Restore selected saved address
    const savedId = localStorage.getItem('fw_selectedAddressId');
    if (savedId) {
      this.selectedAddressId = parseInt(savedId, 10);
    }
    this.loadUserAddresses();
    this.selectedJobTypes = this.allJobTypes.map((t) => t.value);
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

  onMapInitialized(map: google.maps.Map): void {
    this.map = map;
    this.updateUserPin();
    if (this.jobs.length > 0) {
      setTimeout(() => this.updateMapMarkers(), 100);
    }
    this.updateRadiusCircle();
  }
  private loadUserAddresses(): void {
    // Load from global store first
    this.userAddresses = this.addressStore.getAddresses() ?? [];

    // 🔥 If store is empty → fetch directly from API
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
            this.afterAddressesLoaded(); // continue anyway
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

    // Update map center
    this.center = { lat: userLat, lng: userLng };
    this.zoom = 10;
    this.updateRadiusCircle();
    setTimeout(() => {
      this.updateRadiusCircle();
      this.updateUserPin();
    }, 50);
    // Recalculate distances
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

  private setupMapLoadingSubscription(): void {
    this.isApiLoaded$.pipe(takeUntil(this.destroy$)).subscribe((loaded) => {
      this.isMapLoading = !loaded;
      if (loaded && this.customAddressInput) {
        this.setupAutocomplete();
      }
      if (!loaded) {
        // Add a delay to distinguish between loading and error
        setTimeout(() => {
          if (!this.isMapLoading) return;
          this.mapLoadError = true;
          this.isMapLoading = false;
        }, 10000); // 10 second timeout
      } else {
        this.mapLoadError = false;
        // Update marker options with animation once Google Maps is loaded
      }
    });
  }
  setupAutocomplete() {
    if (!this.customAddressInput) return;

    this.autocomplete = new google.maps.places.Autocomplete(
      this.customAddressInput.nativeElement,
      {
        fields: ['formatted_address', 'geometry'],
        // componentRestrictions: { country: 'za' }, // optional: remove to allow global
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

      // 🔥 Immediately apply new center + filtering + markers
      this.applyCustomAddress();

      // 🔥 Smooth pan animation
      if (this.map) {
        this.map.panTo({
          lat: this.customAddressLat,
          lng: this.customAddressLng,
        });
        this.map.setZoom(12);
      }
    });
  }
  setLocationMode(mode: 'saved' | 'custom') {
    this.locationMode = mode;

    if (mode === 'saved') {
      this.customAddressLat = null;
      this.customAddressLng = null;
      this.applySelectedAddress();
    } else {
      // 🔥 Wait a tick so Angular renders the input, then attach autocomplete
      setTimeout(() => {
        if (this.customAddressInput) {
          this.setupAutocomplete();
        }
      }, 50);

      // If user already selected before
      if (this.customAddressLat && this.customAddressLng) {
        this.applyCustomAddress();
      }
    }
  }

  onLocationModeChange() {
    if (this.locationMode === 'saved') {
      this.applySelectedAddress();
    } else {
      // Use custom mode => recenter map only if user typed something
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

    this.updateRadiusCircle();
    this.updateUserPin();

    // Recalculate distances for every job
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

          this.getUserLocationAndCalculateDistances();
          this.applyFilters();

          this.jobsLoading = false;
        },
        error: () => {
          this.jobsLoading = false;
        },
      });
  }

  setActiveTab(tab: 'allJobs' | 'myBids'): void {
    this.activeTab = tab;
    this.selectedJob = null;

    if (tab === 'allJobs' && this.jobs.length === 0) {
      this.loadJobs();
    } else if (
      tab === 'myBids' &&
      this.myBids.length === 0 &&
      this.myQuotes.length === 0
    ) {
      this.loadJobs();
    }
  }

  updateMapMarkers(): void {
    if (!this.map) {
      return;
    }

    // Clear existing markers from the clusterer
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
          // Use this.jobs to show all markers, use this.filteredJobs to show only filtered markers
          const lat = job.latitude;
          const lng = job.longitude;
          return !isNaN(lat) && !isNaN(lng);
        });

        const markers = jobsToMark.map((job) => {
          const position = { lat: job.latitude, lng: job.longitude };
          const pinElement = new PinElement({
            background: '#e6bf00',
            borderColor: '#FFFFFF',
            glyphColor: '#FFFFFF',
            scale: 1.2,
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

  // private centerMapOnJobs(): void {
  //   if (this.jobs.length === 0) return;
  //   const validJobs = this.jobs.filter(job =>
  //     job.latitude && job.longitude
  //   );
  //   if (validJobs.length === 0) return;
  //   if (validJobs.length === 1) {
  //     // Single job - center on it
  //     this.center = {
  //       lat: parseFloat(validJobs[0].latitude),
  //       lng: parseFloat(validJobs[0].longitude)
  //     };
  //     this.zoom = 12;
  //   } else {
  //     // Multiple jobs - calculate center
  //     const avgLat = validJobs.reduce((sum, job) => sum + parseFloat(job.latitude), 0) / validJobs.length;
  //     const avgLng = validJobs.reduce((sum, job) => sum + parseFloat(job.longitude), 0) / validJobs.length;
  //     this.center = { lat: avgLat, lng: avgLng };
  //     this.zoom = 8;
  //   }
  // }

  // private centerMapOnUserLocation(): void {
  //   this.userService.getUserAddress()
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (address) => {
  //         if (address && address.latitude && address.longitude) {
  //           this.center = {
  //             lat: address.latitude,
  //             lng: address.longitude
  //           };
  //           this.zoom = 10;
  //         } else {
  //           this.centerOnBrowserLocation();
  //         }
  //       },
  //       error: (error) => {
  //         console.error('Error fetching user address:', error);
  //         this.centerOnBrowserLocation();
  //       }
  //     });
  // }

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
    setTimeout(() => {
      this.updateRadiusCircle();
      this.updateUserPin();
    }, 50);
  }

  private getUserLocationAndCalculateDistances(): void {
    // If user selected an address → calculate based on that, not GPS
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
          // If location fails, apply filters without distance
          this.applyFilters();
        },
      );
    } else {
      // If geolocation is not supported, apply filters without distance
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
    const R = this.distanceUnit === 'mi' ? 3959 : 6371; // Radius of the Earth in miles or km
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
    this.applyFilters(); // Apply filters AFTER sorting is complete
  }

  onMarkerClick(marker: JobMarker): void {
    this.selectedJob = this.jobs.find((j) => j.jobId === marker.jobId) || null;
  }

  closeJobInfo(): void {
    this.selectedJob = null;
  }

  retryMapLoad(): void {
    this.mapLoadError = false;
    this.isMapLoading = true;
    window.location.reload();
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

  highlightMarker(jobId: number): void {
    const marker = this.markerPositions.find((m) => m.jobId === jobId);
    if (marker && marker.marker) {
      google.maps.importLibrary('marker').then((markerLib) => {
        const { PinElement } = markerLib as any;
        const pinElement = new PinElement({
          background: '#fbd008',
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
        const pinElement = new PinElement({
          background: '#e6bf00',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 1.2,
        });
        marker.marker!.content = pinElement.element;
      });
    }
  }

  applyFilters(): void {
    const selectedPrefs = Object.keys(this.selectedPreferences).filter(
      (key) => this.selectedPreferences[key],
    );

    let filtered = [...this.jobs];

    if (selectedPrefs.length > 0) {
      filtered = filtered.filter((job) => {
        if (!job.jobPreferences) {
          return true;
        }
        return selectedPrefs.some((pref) => job.jobPreferences.includes(pref));
      });
    }

    if (this.searchTerm) {
      const lowercasedTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.projectName &&
            job.projectName.toLowerCase().includes(lowercasedTerm)) ||
          (job.jobType && job.jobType.toLowerCase().includes(lowercasedTerm)) ||
          (job.description &&
            job.description.toLowerCase().includes(lowercasedTerm)),
      );
    }

    filtered = filtered.filter(
      (job) => job.distance === undefined || job.distance <= this.distance,
    );

    // Calculate trade counts based on currently filtered jobs (before applying trade filter itself)
    this.tradeCounts = this.allTrades.reduce(
      (acc, trade) => {
        acc[trade] = filtered.filter((job) =>
          job.trades?.includes(trade),
        ).length;
        return acc;
      },
      {} as { [trade: string]: number },
    );

    if (
      this.selectedTrades &&
      this.selectedTrades.length > 0 &&
      this.selectedTrades.length < this.allTrades.length
    ) {
      filtered = filtered.filter((job) =>
        job.trades?.some((trade) => this.selectedTrades.includes(trade)),
      );
    }

    if (
      this.selectedJobTypes &&
      this.selectedJobTypes.length > 0 &&
      this.selectedJobTypes.length < this.allJobTypes.length
    ) {
      filtered = filtered.filter(
        (job) => job.jobType && this.selectedJobTypes.includes(job.jobType),
      );
    }

    this.filteredJobs = filtered;
    this.dataSource.data = this.filteredJobs;
    if (this.map) {
      this.updateMapMarkers();
    }
    this.saveFiltersToLocalStorage();
    this.updateRadiusCircle();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.distance = 100;
    this.selectedTrades = [...this.allTrades];
    this.selectedJobTypes = this.allJobTypes.map((t) => t.value);
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
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortJobs();
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
  }

  private saveFiltersToLocalStorage(): void {
    const filters = {
      distance: this.distance,
      selectedTrades: this.selectedTrades,
      selectedJobTypes: this.selectedJobTypes,
      sortBy: this.sortBy,
    };
    localStorage.setItem('findWorkFilters', JSON.stringify(filters));
  }

  private loadFiltersFromLocalStorage(): void {
    const savedFilters = localStorage.getItem('findWorkFilters');
    if (savedFilters) {
      const filters = JSON.parse(savedFilters);
      this.distance = filters.distance ?? this.distance;
      this.selectedTrades = filters.selectedTrades ?? [...this.allTrades];
      this.selectedJobTypes =
        filters.selectedJobTypes ?? this.allJobTypes.map((t) => t.value);
      this.sortBy = filters.sortBy ?? this.sortBy;
    }
  }

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
  // 🔁 Template adapter methods (DO NOT put logic here)

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
        strokeColor: '#61A0AF',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#61A0AF',
        fillOpacity: 0.15,
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
        background: '#4285F4', // Google blue
        borderColor: '#FFFFFF',
        glyphColor: '#FFFFFF',
        scale: 1.4,
      });

      // Update existing pin
      if (this.userMarker) {
        this.userMarker.position = this.center;
        return;
      }

      // Create new pin
      this.userMarker = new AdvancedMarkerElement({
        map: this.map,
        position: this.center,
        content: pin.element,
      });
    });
  }
}
