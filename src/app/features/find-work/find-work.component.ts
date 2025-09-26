// TODO: think about what to do if no geolocation available
// TODO: think about filtering - client/server side - might be a pain to update down the line, server side preferable
// TODO: could implement a search like Airbnb - "Search Here" and refresh the markers or something
// TODO: hide this entire thing from general contractors (maybe?)
import { Component, OnInit, OnDestroy, ViewChild, CUSTOM_ELEMENTS_SCHEMA, ViewChildren, QueryList } from '@angular/core';
import { JobsService } from '../../services/jobs.service';
import { Job } from '../../models/job';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../authentication/auth.service';
import { MapLoaderService } from '../../services/map-loader.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { UserService } from '../../services/user.service';
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
import { BidOptionsDialogComponent } from './bid-options-dialog/bid-options-dialog.component';
import { PdfUploadDialogComponent } from './pdf-upload-dialog/pdf-upload-dialog.component';
import { Router } from '@angular/router';
import { JobCardComponent } from '../../components/job-card/job-card.component';
import { ConfirmationDialogComponent } from '../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';

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
  ],
  providers: [MapLoaderService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FindWorkComponent implements OnInit, OnDestroy {
  @ViewChildren(MatPaginator) paginators = new QueryList<MatPaginator>();
  dataSource = new MatTableDataSource<Job>([]);
  myBidsDataSource = new MatTableDataSource<Bid>([]);
  @ViewChild(GoogleMap) mapComponent!: GoogleMap;
  private destroy$ = new Subject<void>();
  private markersNeedUpdate = false;
  private markerClusterer: MarkerClusterer | null = null;

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
  tradeCounts: { [trade: string]: number } = {};
  selectedTrades: string[] = [];
  sortBy: string = 'distance';
  sortDirection: 'asc' | 'desc' = 'asc';
  allJobTypes = JOB_TYPES;
  selectedJobTypes: string[] = [];

  // UI state
  activeTab: 'allJobs' | 'myBids' = 'allJobs';
  distanceUnit: 'km' | 'mi' = 'km';
  biddedJobIds = new Set<number>();

  // Loading states
  jobsLoading = false;
  bidsLoading = false;
  isMapLoading = true;
  mapLoadError = false;
  filtersLoading = true;

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
    public dialog: MatDialog,
    private router: Router,
    private biddingService: BiddingService
  ) {
    this.isApiLoaded$ = this.mapLoader.isApiLoaded$;
    this.setupMapLoadingSubscription();
  }

  ngOnInit(): void {
    this.selectedJobTypes = this.allJobTypes.map(t => t.value);
    this.loadJobs();
    this.loadMyBids(); 
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
          if (!jobs || jobs.length === 0) {
            console.warn('No jobs received from the service.');
            this.jobs = [];
            this.filteredJobs = [];
          } else {
            this.jobs = jobs.map(job => {
              const lat = parseFloat(job.latitude as any);
              const lng = parseFloat(job.longitude as any);
              if (isNaN(lat) || isNaN(lng)) {
              }
              return {
                ...job,
                latitude: lat,
                longitude: lng
              };
            });
          }

          this.allTrades = [...new Set(this.jobs.flatMap(job => job.trades))].sort();
          this.selectedTrades = [...this.allTrades];
          this.loadFiltersFromLocalStorage();
          this.getUserLocationAndCalculateDistances(); // This will now handle the filtering
          this.dataSource.data = this.filteredJobs;
          this.filtersLoading = false;
          if (this.paginators.toArray()[0]) {
            this.dataSource.paginator = this.paginators.toArray()[0];
          }
          this.jobsLoading = false;

          if (this.map) {
            setTimeout(() => this.updateMapMarkers(), 100);
          } else {
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
        next: (bids) => {
          this.myBids = bids;
          this.biddedJobIds = new Set(bids.map(b => b.jobId));
          this.myBidsDataSource.data = this.myBids;
          if (this.paginators.toArray()[1]) {
            this.myBidsDataSource.paginator = this.paginators.toArray()[1];
          }
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
    if (!this.map) {
      console.log('Map not initialized, returning');
      return;
    }

    // Clear existing markers from the clusterer
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
    }

    this.markerPositions.forEach(marker => {
      if (marker.marker) {
        marker.marker.map = null;
      }
    });
    this.markerPositions = [];

    google.maps.importLibrary("marker").then(markerLibrary => {
      const { AdvancedMarkerElement, PinElement } = markerLibrary as google.maps.MarkerLibrary;

      const jobsToMark = this.jobs.filter(job => { // TODO:Use this.jobs to show all markers, use this.filteredJobs to show only filtered markers
        const lat = job.latitude;
        const lng = job.longitude;
        return !isNaN(lat) && !isNaN(lng);
      });

      const markers = jobsToMark.map(job => {
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
          this.onMarkerClick({ jobId: job.jobId, position, title: job.projectName });
        });

        this.markerPositions.push({
          position,
          title: job.projectName,
          jobId: job.jobId,
          marker: marker
        });

        return marker;
      });

      if (!this.markerClusterer) {
        this.markerClusterer = new MarkerClusterer({ map: this.map, markers: [] });
      }

      this.markerClusterer.addMarkers(markers);

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

        this.sortJobsByDistance(); // This will sort and then call applyFilters
      }, (error) => {
        console.error('Error getting user location:', error);
        // If location fails, apply filters without distance
        this.applyFilters();
      });
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

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = this.distanceUnit === 'mi' ? 3959 : 6371; // Radius of the Earth in miles or km
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
    this.applyFilters(); // Apply filters AFTER sorting is complete
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
          background: '#fbd008',
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
        (job.projectName && job.projectName.toLowerCase().includes(lowercasedTerm)) ||
        (job.jobType && job.jobType.toLowerCase().includes(lowercasedTerm)) ||
        (job.description && job.description.toLowerCase().includes(lowercasedTerm))
      );
    }

    filtered = filtered.filter(job => job.distance === undefined || job.distance <= this.distance);

    // Calculate trade counts based on currently filtered jobs (before applying trade filter itself)
    this.tradeCounts = this.allTrades.reduce((acc, trade) => {
      acc[trade] = filtered.filter(job => job.trades.includes(trade)).length;
      return acc;
    }, {} as { [trade: string]: number });


    if (this.selectedTrades && this.selectedTrades.length > 0 && this.selectedTrades.length < this.allTrades.length) {
      filtered = filtered.filter(job =>
        job.trades.some(trade => this.selectedTrades.includes(trade))
      );
    }

    if (this.selectedJobTypes && this.selectedJobTypes.length > 0 && this.selectedJobTypes.length < this.allJobTypes.length) {
      filtered = filtered.filter(job =>
        job.jobType && this.selectedJobTypes.includes(job.jobType)
      );
    }

    this.filteredJobs = filtered;
    this.dataSource.data = this.filteredJobs;
    if (this.map) {
      this.updateMapMarkers();
    }
    this.saveFiltersToLocalStorage();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.distance = 100;
    this.selectedTrades = [...this.allTrades];
    this.selectedJobTypes = this.allJobTypes.map(t => t.value);
    this.sortBy = 'distance';
    this.sortDirection = 'asc';
    this.applyFilters();
  }

  sortJobs(): void {
    const direction = this.sortDirection === 'asc' ? 1 : -1;

    switch (this.sortBy) {
      case 'distance':
        this.filteredJobs.sort((a, b) => ((a.distance ?? Infinity) - (b.distance ?? Infinity)) * direction);
        break;
      case 'startDate':
        this.filteredJobs.sort((a, b) => {
          const dateA = a.potentialStartDate ? new Date(a.potentialStartDate).getTime() : Infinity;
          const dateB = b.potentialStartDate ? new Date(b.potentialStartDate).getTime() : Infinity;
          return (dateA - dateB) * direction;
        });
        break;
      case 'postedDate':
        this.filteredJobs.sort((a, b) => {
          const dateA = a.biddingStartDate ? new Date(a.biddingStartDate).getTime() : 0;
          const dateB = b.biddingStartDate ? new Date(b.biddingStartDate).getTime() : 0;
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
        lng: job.longitude
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
      this.selectedJobTypes = filters.selectedJobTypes ?? this.allJobTypes.map(t => t.value);
      this.sortBy = filters.sortBy ?? this.sortBy;
      }
  }

  openBidDialog(jobId: number, event: MouseEvent): void {
   event.stopPropagation();

   const dialogRef = this.dialog.open(BidOptionsDialogComponent, {
     width: '600px',
     data: { jobId: jobId }
   });

   dialogRef.afterClosed().subscribe(result => {
     if (result === 'create') {
       this.router.navigate(['/quote'], { queryParams: { jobId: jobId } });
     } else if (result === 'upload') {
       this.dialog.open(PdfUploadDialogComponent, {
         width: '500px',
         data: { jobId: jobId }
       });
     }
   });
 }

 onViewQuote(bid: Bid): void {
   if (bid && bid.quoteId) {
     this.router.navigate(['/quote'], { queryParams: { quoteId: bid.quoteId } });
   }
 }

 onWithdrawBid(bid: Bid): void {
   const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
     width: '400px',
     data: {
       title: 'Confirm Withdrawal',
       message: 'Are you sure you want to withdraw this bid? This action cannot be undone.'
     }
   });

   dialogRef.afterClosed().subscribe(result => {
     if (result) {
       this.biddingService.withdrawBid(bid.id).subscribe({
         next: () => {
           const index = this.myBids.findIndex(b => b.id === bid.id);
           if (index > -1) {
             this.myBids[index].status = 'Withdrawn';
             this.myBidsDataSource.data = [...this.myBids];
           }
         },
         error: (err) => {
           console.error('Failed to withdraw bid:', err);
           // Optionally, show an error message to the user
         }
       });
     }
   });
 }

 onEditBid(bid: Bid): void {
   if (bid && bid.quoteId) {
     this.router.navigate(['/quote'], { queryParams: { quoteId: bid.quoteId, edit: true } });
   }
 }

 hasBidded(jobId: number): boolean {
   return this.biddedJobIds.has(jobId);
 }
}
