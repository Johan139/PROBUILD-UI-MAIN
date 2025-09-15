import { Component, OnInit } from '@angular/core';
import { JobsService } from '../../services/jobs.service';
import { Job } from '../../models/job';
import { GoogleMap, GoogleMapsModule, MapMarker } from '@angular/google-maps';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-find-work',
  templateUrl: './find-work.component.html',
  styleUrls: ['./find-work.component.scss'],
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
})
export class FindWorkComponent implements OnInit {
  jobs: Job[] = [];
  myBids: Job[] = [];
  viewMode: 'map' | 'list' = 'map';
  activeTab: 'allJobs' | 'myBids' = 'allJobs';

  // Map properties
  center: google.maps.LatLngLiteral = { lat: 24, lng: 12 };
  zoom = 4;
  markerOptions: google.maps.MarkerOptions = { draggable: false };
  markerPositions: google.maps.LatLngLiteral[] = [];

  constructor(private jobsService: JobsService) { }

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.jobsService.getAllJobs().subscribe(jobs => {
      this.jobs = jobs;
      this.updateMapMarkers();
    });
  }

  loadMyBids(): void {
    // Assuming we have the current user's ID.
    const userId = 'current-user-id'; // Placeholder
    this.jobsService.getBiddedJobs(userId).subscribe(jobs => {
      this.myBids = jobs;
    });
  }

  toggleView(view: 'map' | 'list'): void {
    this.viewMode = view;
  }

  setActiveTab(tab: 'allJobs' | 'myBids'): void {
    this.activeTab = tab;
    if (tab === 'allJobs') {
      this.loadJobs();
    } else {
      this.loadMyBids();
    }
  }

  updateMapMarkers(): void {
    this.markerPositions = this.jobs.map(job => ({
      lat: job.address.latitude,
      lng: job.address.longitude
    }));
  }
}
