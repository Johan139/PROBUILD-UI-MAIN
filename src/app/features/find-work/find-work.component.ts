import { Component, OnInit, OnDestroy, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { JobsService } from '../../services/jobs.service';
import { Job } from '../../models/job';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../authentication/auth.service';
import { MapLoaderService } from '../../services/map-loader.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { UserService } from '../../services/user.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Bid } from '../../models/bid';

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
  ],
  providers: [MapLoaderService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FindWorkComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  dataSource = new MatTableDataSource<Job>([]);
  @ViewChild(GoogleMap) mapComponent!: GoogleMap;
  private destroy$ = new Subject<void>();
  private markersNeedUpdate = false;

  // Data properties
  map!: google.maps.Map;
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  myBids: Bid[] = [];
  selectedJob: Job | null = null;
  selectedPreferences: { [key: string]: boolean } = {
    'Short-term': false,
    'Long-term': false,
    'Contract-based': false,
    'On-demand': false,
  };
  userTrade: string | undefined;
  searchTerm: string = '';
  distance: number = 100;
  allTrades: string[] = [];
  selectedTrades: string[] = [];
  sortBy: string = 'distance';
  allJobTypes: string[] = ['Short-term', 'Long-term', 'Contract-based', 'On-demand'];
  selectedJobTypes: string[] = [];

  // UI state
  activeTab: 'allJobs' | 'myBids' = 'allJobs';
  distanceUnit: 'km' | 'mi' = 'km';

  // Loading states
  jobsLoading = false;
  bidsLoading = false;
  isMapLoading = true;
  mapLoadError = false;

  // Map properties
  isApiLoaded$: Observable<boolean>;
  center: google.maps.LatLngLiteral = { lat: 39.8283, lng: -98.5795 }; // Center of USA
  zoom = 4;

  mapOptions: google.maps.MapOptions = {
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    maxZoom: 20,
    minZoom: 3,
    streetViewControl: false,
    fullscreenControl: true,
    mapTypeControl: false,
    mapId: 'DEMO_MAP_ID', // Required for Advanced Markers
  };


  markerPositions: JobMarker[] = [];

  constructor(
    private jobsService: JobsService,
    private authService: AuthService,
    private mapLoader: MapLoaderService,
    private userService: UserService,
    public dialog: MatDialog
  ) {
    this.isApiLoaded$ = this.mapLoader.isApiLoaded$;
    this.setupMapLoadingSubscription();
  }

  ngOnInit(): void {
    this.loadJobs();
    this.centerOnBrowserLocation();
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
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
    console.log('Map initialized:', !!this.map);

    if (this.jobs.length > 0) {
      setTimeout(() => this.updateMapMarkers(), 100);
    }
  }

  private setupMapLoadingSubscription(): void {
    this.isApiLoaded$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loaded => {
        this.isMapLoading = !loaded;
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

  loadJobs(): void {
    this.jobsLoading = true;
    this.jobsService.getAllJobs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobs) => {
          console.log('Raw job data received:', jobs);
          this.jobs = jobs.map(job => ({
            ...job,
            latitude: parseFloat(job.latitude as any),
            longitude: parseFloat(job.longitude as any)
          }));
          this.allTrades = [...new Set(this.jobs.flatMap(job => job.trades))];
          this.getUserLocationAndCalculateDistances(); // This must be called before applyFilters
          this.applyFilters();
          this.dataSource = new MatTableDataSource(this.filteredJobs);
          this.dataSource.paginator = this.paginator;
          this.jobsLoading = false;

          if (this.map) {
            setTimeout(() => this.updateMapMarkers(), 100);
          }
        },
        error: (error) => {
          console.error('Error loading jobs:', error);
          this.jobsLoading = false;
        }
      });
  }

  loadMyBids(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      console.warn('User not authenticated');
      return;
    }

    this.bidsLoading = true;
    this.jobsService.getBiddedJobs(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobs) => {
          this.myBids = jobs;
          this.bidsLoading = false;
        },
        error: (error) => {
          console.error('Error loading bids:', error);
          this.bidsLoading = false;
        }
      });
  }


  setActiveTab(tab: 'allJobs' | 'myBids'): void {
    this.activeTab = tab;
    this.selectedJob = null; // Clear selection when switching tabs

    if (tab === 'allJobs') {
      if (this.jobs.length === 0) {
        this.loadJobs();
      }
    } else {
      if (this.myBids.length === 0) {
        this.loadMyBids();
      }
    }
  }

  updateMapMarkers(): void {
    console.log('updateMapMarkers called');
    if (!this.map) {
      console.log('Map not initialized, returning');
      return;
    }

    console.log('Clearing existing markers...');
    this.markerPositions.forEach(marker => {
      if (marker.marker) {
        marker.marker.map = null;
      }
    });
    this.markerPositions = [];
    console.log('Existing markers cleared');

    google.maps.importLibrary("marker").then(markerLibrary => {
      console.log('Marker library loaded');
      const { AdvancedMarkerElement, PinElement } = markerLibrary as google.maps.MarkerLibrary;

      const jobsToMark = this.filteredJobs.filter(job => {
        const lat = job.latitude;
        const lng = job.longitude;
        return !isNaN(lat) && !isNaN(lng);
      });
      console.log(`Found ${jobsToMark.length} jobs with coordinates to mark`);

      jobsToMark.forEach((job, index) => {
        const position = {
          lat: job.latitude,
          lng: job.longitude
        };
        console.log(`Processing job #${index + 1}: ${job.projectName} at`, position);

        const pinElement = new PinElement({
          background: '#FF0000',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 1.2,
        });
        console.log('PinElement created for job', job.projectName);

        try {
          const marker = new AdvancedMarkerElement({
            position,
            map: this.map,
            title: job.projectName,
            content: pinElement.element,
          });
          console.log('AdvancedMarkerElement created for job', job.projectName);

          marker.addListener('click', () => {
            this.onMarkerClick({
              jobId: job.jobId,
              position,
              title: job.projectName
            });
          });

          this.markerPositions.push({
            position,
            title: job.projectName,
            jobId: job.jobId,
            marker: marker
          });
        } catch (error) {
          console.error(`Error creating marker for job ${job.projectName}:`, error);
        }
      });

      console.log(`Finished processing. Created ${this.markerPositions.length} markers`);
    }).catch(error => {
      console.error('Error loading marker library:', error);
    });
  }


  private createMarkerContent(job: Job): HTMLElement {
    const content = document.createElement('div');
    content.style.width = '20px';
    content.style.height = '20px';
    content.style.backgroundColor = 'red';
    content.style.borderRadius = '50%';
    content.style.border = '2px solid white';
    content.style.cursor = 'pointer';
    content.title = job.projectName;
    return content;
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
          lng: position.coords.longitude
        };
        this.zoom = 10;
      });
    }
  }

  private getUserLocationAndCalculateDistances(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        this.jobs.forEach(job => {
          const jobLat = job.latitude;
          const jobLng = job.longitude;
          job.distance = this.calculateDistance(userLat, userLng, jobLat, jobLng);
        });

        this.sortJobsByDistance();
      });
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

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = this.distanceUnit === 'km' ? 6371 : 3959; // Radius of the Earth in km or miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private sortJobsByDistance(): void {
    this.jobs.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    this.applyFilters();
  }

  onMarkerClick(marker: JobMarker): void {
    this.selectedJob = this.jobs.find(j => j.jobId === marker.jobId) || null;
  }

  closeJobInfo(): void {
    this.selectedJob = null;
  }


  retryMapLoad(): void {
    this.mapLoadError = false;
    this.isMapLoading = true;
    // The MapLoaderService will handle the retry logic
    window.location.reload();
  }

  // TrackBy functions for performance
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
    const marker = this.markerPositions.find(m => m.jobId === jobId);
    if (marker && marker.marker) {
      google.maps.importLibrary("marker").then((markerLib) => {
        const { PinElement } = markerLib as any;
        const pinElement = new PinElement({
          background: '#FBBC04',
          borderColor: '#000',
          glyphColor: '#000',
          scale: 1.3, // Slightly larger when highlighted
        });
        marker.marker!.content = pinElement.element;
      });
    }
  }

  unhighlightMarker(jobId: number): void {
    const marker = this.markerPositions.find(m => m.jobId === jobId);
    if (marker && marker.marker) {
      google.maps.importLibrary("marker").then((markerLib) => {
        const { PinElement } = markerLib as any;
        const pinElement = new PinElement({
          background: '#ff0404ff',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 1.2,
        });
        marker.marker!.content = pinElement.element;
      });
    }
  }

  applyFilters(): void {
    const selectedPrefs = Object.keys(this.selectedPreferences)
      .filter(key => this.selectedPreferences[key]);

    let filtered = [...this.jobs];

    if (selectedPrefs.length > 0) {
      filtered = filtered.filter(job => {
        if (!job.jobPreferences) {
          return true;
        }
        return selectedPrefs.some(pref => job.jobPreferences.includes(pref));
      });
    }

    if (this.searchTerm) {
      const lowercasedTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        job.projectName.toLowerCase().includes(lowercasedTerm) ||
        job.jobType.toLowerCase().includes(lowercasedTerm) ||
        job.description.toLowerCase().includes(lowercasedTerm)
      );
    }

    filtered = filtered.filter(job => job.distance === undefined || job.distance <= this.distance);

    if (this.selectedTrades.length > 0) {
      filtered = filtered.filter(job =>
        job.trades.some(trade => this.selectedTrades.includes(trade))
      );
    }

    if (this.selectedJobTypes.length > 0) {
      filtered = filtered.filter(job => {
        if (!job.jobPreferences) {
          return true;
        }
        return this.selectedJobTypes.some(pref => job.jobPreferences.includes(pref));
      });
    }

    this.filteredJobs = filtered;
  }

  sortJobs(): void {
    switch (this.sortBy) {
      case 'distance':
        this.filteredJobs.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        break;
      case 'startDate':
        this.filteredJobs.sort((a, b) => {
          const dateA = a.potentialStartDate ? new Date(a.potentialStartDate).getTime() : Infinity;
          const dateB = b.potentialStartDate ? new Date(b.potentialStartDate).getTime() : Infinity;
          return dateA - dateB;
        });
        break;
      case 'postedDate':
        // Assuming jobs have a postedDate property
        // this.filteredJobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
        break;
    }
  }

  getStarRating(rating: number): string[] {
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push('star');
      } else if (i - 0.5 <= rating) {
        stars.push('star_half');
      } else {
        stars.push('star_border');
      }
    }
    return stars;
  }

  onJobClick(job: Job): void {
    this.selectedJob = job;
    if (job.latitude && job.longitude) {
      this.center = {
        lat: job.latitude,
        lng: job.longitude
      };
      this.zoom = 12;
    }
  }

  hasTradeMatch(job: Job): boolean {
    if (!this.userTrade || !job.trades) {
      return true; // Default to true if no user trade or job trades are set
    }
    return job.trades.includes(this.userTrade);
  }
}
