import { Component, OnInit, OnDestroy } from '@angular/core';
import { JobsService } from '../../services/jobs.service';
import { Job } from '../../models/job';
import { GoogleMapsModule } from '@angular/google-maps';
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

interface JobMarker {
  position: google.maps.LatLngLiteral;
  title: string;
  jobId: number;
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
  ],
  providers: [MapLoaderService],
})
export class FindWorkComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  myBids: Job[] = [];
  selectedJob: Job | null = null;
  selectedPreferences: { [key: string]: boolean } = {
    'Short-term': false,
    'Long-term': false,
    'Contract-based': false,
    'On-demand': false,
  };
  userTrade: string | undefined;

  // UI state
  viewMode: 'map' | 'list' = 'map';
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
  };

  markerOptions: google.maps.MarkerOptions = {
    draggable: false,
    animation: google.maps?.Animation?.DROP,
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
          if (window.google?.maps?.Animation) {
            this.markerOptions = {
              ...this.markerOptions,
              animation: window.google.maps.Animation.DROP,
            };
          }
        }
      });
  }

  loadJobs(): void {
    this.jobsLoading = true;
    this.jobsService.getAllJobs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobs) => {
          this.jobs = jobs;
          this.applyFilters();
          this.jobsLoading = false;
          this.getUserLocationAndCalculateDistances();
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

  toggleView(view: 'map' | 'list'): void {
    this.viewMode = view;
    this.selectedJob = null; // Clear selection when switching views
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
    this.markerPositions = this.filteredJobs
      .filter(job => job.latitude && job.longitude)
      .map(job => ({
        position: {
          lat: parseFloat(job.latitude),
          lng: parseFloat(job.longitude)
        },
        title: job.projectName,
        jobId: job.jobId
      }));
  }

  private centerMapOnJobs(): void {
    if (this.jobs.length === 0) return;

    const validJobs = this.jobs.filter(job =>
      job.latitude && job.longitude
    );

    if (validJobs.length === 0) return;

    if (validJobs.length === 1) {
      // Single job - center on it
      this.center = {
        lat: parseFloat(validJobs[0].latitude),
        lng: parseFloat(validJobs[0].longitude)
      };
      this.zoom = 12;
    } else {
      // Multiple jobs - calculate center
      const avgLat = validJobs.reduce((sum, job) => sum + parseFloat(job.latitude), 0) / validJobs.length;
      const avgLng = validJobs.reduce((sum, job) => sum + parseFloat(job.longitude), 0) / validJobs.length;

      this.center = { lat: avgLat, lng: avgLng };
      this.zoom = 8;
    }
  }

  private centerMapOnUserLocation(): void {
    this.userService.getUserAddress()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (address) => {
          if (address && address.latitude && address.longitude) {
            this.center = {
              lat: address.latitude,
              lng: address.longitude
            };
            this.zoom = 10;
          } else {
            this.centerOnBrowserLocation();
          }
        },
        error: (error) => {
          console.error('Error fetching user address:', error);
          this.centerOnBrowserLocation();
        }
      });
  }

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
          const jobLat = parseFloat(job.latitude);
          const jobLng = parseFloat(job.longitude);
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

  applyFilters(): void {
    const selectedPrefs = Object.keys(this.selectedPreferences)
      .filter(key => this.selectedPreferences[key]);

    if (selectedPrefs.length === 0) {
      this.filteredJobs = [...this.jobs];
    } else {
      this.filteredJobs = this.jobs.filter(job => {
        if (!job.jobPreferences) {
          return true;
        }
        return selectedPrefs.some(pref => job.jobPreferences.includes(pref));
      });
    }
    this.updateMapMarkers();
  }

  hasTradeMatch(job: Job): boolean {
    if (!this.userTrade || !job.trades) {
      return true; // Default to true if no user trade or job trades are set
    }
    return job.trades.includes(this.userTrade);
  }
}
