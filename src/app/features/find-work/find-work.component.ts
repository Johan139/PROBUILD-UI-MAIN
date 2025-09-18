import { Component, OnInit, OnDestroy } from '@angular/core';
import { JobsService } from '../../services/jobs.service';
import { Job } from '../../models/job';
import { GoogleMapsModule } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../authentication/auth.service';
import { MapLoaderService } from '../../services/map-loader.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { UserService } from '../../services/user.service';

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
  imports: [CommonModule, GoogleMapsModule],
  providers: [MapLoaderService],
})
export class FindWorkComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  jobs: Job[] = [];
  myBids: Job[] = [];
  selectedJob: Job | null = null;

  // UI state
  viewMode: 'map' | 'list' = 'map';
  activeTab: 'allJobs' | 'myBids' = 'allJobs';

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
    private userService: UserService
  ) {
    this.isApiLoaded$ = this.mapLoader.isApiLoaded$;
    this.setupMapLoadingSubscription();
  }

  ngOnInit(): void {
    this.loadJobs();
    this.centerMapOnUserLocation();
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
          this.updateMapMarkers();
          this.jobsLoading = false;

          // Center map on jobs if available
          if (jobs.length > 0) {
            this.centerMapOnJobs();
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
    this.markerPositions = this.jobs
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

  onMarkerClick(marker: JobMarker): void {
    const job = this.jobs.find(j => j.jobId === marker.jobId);
    if (job) {
      this.selectedJob = job;
      // Center map on selected marker
      this.center = marker.position;
      this.zoom = Math.max(this.zoom, 12);
    }
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
}
