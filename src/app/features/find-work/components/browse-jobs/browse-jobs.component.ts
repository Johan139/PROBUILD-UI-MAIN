import { Component, EventEmitter, Input, Output, OnInit, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { Job } from '../../../../models/job';
import { UserAddress } from '../../../../authentication/profile/profile.model';
import { JOB_TYPES } from '../../../../data/job-types';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-browse-jobs',
  templateUrl: './browse-jobs.component.html',
  styleUrls: ['./browse-jobs.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatPaginatorModule, FormsModule, MatSelectModule, MatFormFieldModule]
})
export class BrowseJobsComponent implements OnInit, OnChanges {
  @Input() jobs: Job[] = []; // Raw jobs with distances calculated
  @Input() savedJobs: number[] = [];
  @Input() loading: boolean = false;
  @Input() userAddresses: UserAddress[] = [];
  @Input() selectedAddressId: number | null = null;
  @Input() locationMode: 'saved' | 'custom' = 'saved';

  // Outputs for parent to handle map interactions
  @Output() filteredJobsChange = new EventEmitter<Job[]>();
  @Output() locationModeChange = new EventEmitter<'saved' | 'custom'>();
  @Output() selectedAddressIdChange = new EventEmitter<number | null>();
  @Output() jobClick = new EventEmitter<Job>();
  @Output() toggleSaved = new EventEmitter<{jobId: number, event: MouseEvent}>();
  @Output() openBid = new EventEmitter<{jobId: number, event: MouseEvent}>();
  @Output() highlightMarker = new EventEmitter<number>();
  @Output() unhighlightMarker = new EventEmitter<number>();
  @Output() addressSelected = new EventEmitter<void>();
  @Output() customLocationChange = new EventEmitter<{lat: number, lng: number}>();

  // Filter State
  searchTerm: string = '';
  distance: number = 100;
  selectedTrades: string[] = [];
  selectedJobTypes: string[] = [];
  sortBy: string = 'distance';
  sortDirection: 'asc' | 'desc' = 'asc';

  filteredJobs: Job[] = [];
  dataSource = new MatTableDataSource<Job>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('customAddressInput') customAddressInput!: ElementRef;
  autocomplete: google.maps.places.Autocomplete | null = null;

  allTrades: string[] = [
    "Electrical", "Plumbing", "HVAC", "Roofing", "Concrete", "Framing",
    "Drywall", "Painting", "Flooring", "Landscaping", "Masonry",
    "Insulation", "Windows & Doors", "Cabinetry", "Tile & Stone",
    "Demolition", "Excavation", "Steel & Welding"
  ];
  tradeCounts: { [trade: string]: number } = {};
  allJobTypes = JOB_TYPES;
  distanceUnit: 'km' | 'mi' = 'km';

  ngOnInit(): void {
    // Determine unit based on locale
    const userLocale = navigator.language;
    if (userLocale === 'en-US' || userLocale === 'en-GB') {
        this.distanceUnit = 'mi';
    }
    this.selectedJobTypes = this.allJobTypes.map(t => t.value);
    this.applyFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['jobs']) {
      this.applyFilters();
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    if (this.locationMode === 'custom') {
        this.setupAutocomplete();
    }
  }

  setupAutocomplete() {
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

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      this.customLocationChange.emit({ lat, lng });
    });
  }

  applyFilters(): void {
    let filtered = [...this.jobs];

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
    this.sortJobs(); // Sort also updates datasource and emits
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
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }

    // Notify parent about filtered jobs (for map)
    this.filteredJobsChange.emit(this.filteredJobs);
  }

  toggleSortDirection(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortJobs();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.distance = 100;
    this.selectedTrades = [];
    this.selectedTrades = [...this.allTrades];
    this.selectedJobTypes = this.allJobTypes.map((t) => t.value);
    this.sortBy = 'distance';
    this.sortDirection = 'asc';
    this.applyFilters();
  }

  onSearchChange(val: string) {
    this.searchTerm = val;
    this.applyFilters();
  }

  onDistanceChange(val: number) {
    this.distance = val;
    this.applyFilters();
  }

  onLocationModeSelect(mode: 'saved' | 'custom') {
    this.locationModeChange.emit(mode);
    if (mode === 'custom') {
        setTimeout(() => this.setupAutocomplete(), 50);
    }
  }

  onTradeFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const trade = select.value;
    if (trade === '') {
        this.selectedTrades = [...this.allTrades];
    } else {
        this.selectedTrades = [trade];
    }
    this.applyFilters();
  }

  onJobTypeFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const type = select.value;
    if (type === '') {
        this.selectedJobTypes = this.allJobTypes.map(t => t.value);
    } else {
        this.selectedJobTypes = [type];
    }
    this.applyFilters();
  }

  trackByJobId(index: number, job: Job): number {
    return job.jobId;
  }

  onAddressChange() {
      this.selectedAddressIdChange.emit(this.selectedAddressId);
      this.addressSelected.emit();
  }

  getJobBudget(job: Job): string {
    if (job.tradeBudgets && job.tradeBudgets.length > 0) {
      const total = job.tradeBudgets.reduce((sum, item) => sum + item.budget, 0);
      return `$${total.toLocaleString()}`;
    }
    return 'N/A';
  }
}
