import { Component, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { MatIconModule } from '@angular/material/icon';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Job } from '../../../../models/job';
import { ThemeService } from '../../../../theme.service';
import { MapLoaderService } from '../../../../services/map-loader.service';
import { Observable, Subject, takeUntil } from 'rxjs';

interface JobMarker {
  position: google.maps.LatLngLiteral;
  title: string;
  jobId: number;
  marker?: google.maps.marker.AdvancedMarkerElement;
}

const lightMapId = 'cfb7ea445a870af896b65c20';
const darkMapId = 'cfb7ea445a870af82d9def4b';

@Component({
  selector: 'app-find-work-map',
  templateUrl: './find-work-map.component.html',
  styleUrls: ['./find-work-map.component.scss'],
  standalone: true,
  imports: [CommonModule, GoogleMapsModule, MatIconModule],
  providers: [MapLoaderService]
})
export class FindWorkMapComponent implements OnChanges, OnInit, OnDestroy {
  @Input() center: google.maps.LatLngLiteral = { lat: 39.8283, lng: -98.5795 };
  @Input() zoom: number = 4;
  @Input() jobs: Job[] = []; // Jobs to display (filtered)
  @Input() distance: number = 100; // For radius circle
  @Input() distanceUnit: 'km' | 'mi' = 'km';

  // Lists for coloring
  @Input() myPostings: Job[] = [];
  @Input() biddedJobIds: number[] = []; // IDs of jobs with bids
  @Input() savedJobs: number[] = []; // IDs of saved jobs
  @Input() activeTab: string = 'browse';

  @Output() markerClick = new EventEmitter<JobMarker>();
  @Output() mapReady = new EventEmitter<google.maps.Map>();

  @ViewChild(GoogleMap) mapComponent!: GoogleMap;
  map!: google.maps.Map;

  markerClusterer: MarkerClusterer | null = null;
  markerPositions: JobMarker[] = [];
  radiusCircle: google.maps.Circle | null = null;
  userMarker: google.maps.marker.AdvancedMarkerElement | null = null;

  isApiLoaded$: Observable<boolean>;
  isMapLoading = true;
  mapLoadError = false;
  private destroy$ = new Subject<void>();

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

  constructor(private themeService: ThemeService, private mapLoader: MapLoaderService) {
    this.isApiLoaded$ = this.mapLoader.isApiLoaded$;

    effect(() => {
      const isDark = this.themeService.isDarkMode();
      this.applyMapTheme(isDark ? 'dark' : 'light');
    });
  }

  ngOnInit(): void {
      this.setupMapLoadingSubscription();
  }

  ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
  }

  private setupMapLoadingSubscription(): void {
    this.isApiLoaded$.pipe(takeUntil(this.destroy$)).subscribe((loaded) => {
      this.isMapLoading = !loaded;
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['jobs'] || changes['activeTab'] || changes['savedJobs'] || changes['biddedJobIds']) {
      this.updateMapMarkers();
    }
    if (changes['center'] && this.map) {
       this.map.panTo(this.center);
       this.updateRadiusCircle();
       this.updateUserPin();
    }
    if (changes['zoom'] && this.map) {
        this.map.setZoom(this.zoom);
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.map = map;
    this.mapReady.emit(map);
    this.updateUserPin();
    this.updateMapMarkers();
    this.updateRadiusCircle();
  }

  applyMapTheme(theme: 'light' | 'dark') {
    const newMapId = theme === 'dark' ? darkMapId : lightMapId;
    this.mapOptions = { ...this.mapOptions, mapId: newMapId };

    if (this.map) {
      // Force map to re-render
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

    google.maps.importLibrary('marker').then((markerLibrary) => {
        const { AdvancedMarkerElement, PinElement } = markerLibrary as google.maps.MarkerLibrary;

        // Filter out invalid coordinates
        const validJobs = this.jobs.filter((job) => {
          const lat = job.latitude;
          const lng = job.longitude;
          return !isNaN(lat) && !isNaN(lng);
        });

        const markers = validJobs.map((job) => {
          const position = { lat: job.latitude, lng: job.longitude };

          let bgColor = '#22c55e'; // Green (Open)

          if (this.activeTab === 'postings') {
              bgColor = '#FCD109';
          } else if (this.biddedJobIds.includes(job.jobId)) {
              bgColor = '#3b82f6';
          } else if (this.savedJobs.includes(job.jobId)) {
              bgColor = '#a855f7';
          }

          const pinElement = new PinElement({
            background: bgColor,
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
            const jobMarker: JobMarker = {
              jobId: job.jobId,
              position,
              title: job.projectName,
              marker: marker
            };
            this.markerClick.emit(jobMarker);
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
      }).catch((error) => {
        console.error('Error loading marker library', error);
      });
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

  updateUserPin(): void {
    if (!this.map) return;

    google.maps.importLibrary('marker').then((markerLib) => {
      const { AdvancedMarkerElement, PinElement } = markerLib as any;

      const pin = new PinElement({
        background: '#4285F4', 
        borderColor: '#FFFFFF',
        glyphColor: '#FFFFFF',
        scale: 1.4,
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
}
