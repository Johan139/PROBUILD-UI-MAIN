import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { LoaderComponent } from '../../../loader/loader.component';
import { ProjectCardComponent } from '../../my-projects/project-card/project-card.component';
import { ProjectsTableComponent } from '../../../components/projects-table/projects-table.component';
import { Project } from '../../../models/project';
import { MeasurementService } from '../../../services/measurement.service';
import { AuthService } from '../../../authentication/auth.service';
import { AddressService } from '../services/address.service';
import { JobDataService } from '../services/job-data.service';
import { BudgetService } from '../services/budget.service';
import { BidsService } from '../../../services/bids.service';
import { JobsService } from '../../../services/jobs.service';
import { ProjectService } from '../../../services/project.service';
import { ReportService } from '../services/report.service';
import { TimelineGroup } from '../../../components/timeline/timeline.component';
import { WeatherImpactService } from '../services/weather-impact.service';
import { PermitsDialogComponent } from '../permits-dialog/permits-dialog.component';
import { PermitsService } from '../services/permits.service';
import {
  LucideAngularModule,
  Building2,
  User,
  Users,
  MapPin,
  FileStack,
  Hash,
  Home,
  Ruler,
  CheckCircle2,
  Clock,
  PieChart,
  Hammer,
  ShieldAlert,
  CloudRain,
  FileWarning,
  Folder,
  Camera,
  Activity,
  AlertCircle,
  DollarSign,
  Eye,
  Edit,
  Trash2,
} from 'lucide-angular';

@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatTooltipModule,
    LoaderComponent,
    LucideAngularModule,
    ProjectCardComponent,
    ProjectsTableComponent,
  ],

  templateUrl: './project-overview.component.html',
  styleUrls: ['./project-overview.component.scss'],
})
export class ProjectOverviewComponent {
  @Input() projects: Project[] = [];
  @Input() liveProjectsCount: number = 0;
  @Input() biddingProjectsCount: number = 0;
  @Input() teamMemberCount: number = 0;
  @Input() timelineData: TimelineGroup[] = [];

  // Job Details & Weather Inputs
  @Input() projectDetails: any;
  @Input() isLoading: boolean = false;
  @Input() startDateDisplay: any;
  @Input() forecast: any[] | undefined = [];
  @Input() weatherError: string | null | undefined = null;
  @Input() temperatureUnit: string = 'C';

  @Output() selectProject = new EventEmitter<string>();
  @Output() navigateToTab = new EventEmitter<string>();

  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;

  // Lucide Icons
  Building2 = Building2;
  User = User;
  Users = Users;
  MapPin = MapPin;
  FileStack = FileStack;
  Hash = Hash;
  Home = Home;
  Ruler = Ruler;
  CheckCircle2 = CheckCircle2;
  Clock = Clock;
  PieChart = PieChart;
  Hammer = Hammer;
  ShieldAlert = ShieldAlert;
  CloudRain = CloudRain;
  FileWarning = FileWarning;
  Folder = Folder;
  Camera = Camera;
  Activity = Activity;
  AlertCircle = AlertCircle;
  DollarSign = DollarSign;
  Eye = Eye;
  Edit = Edit;
  Trash2 = Trash2;

  // Address Editing State
  isEditingAddress: boolean = false;
  addressControl = new FormControl<string>('');
  addressSuggestions: { description: string; place_id: string }[] = [];
  selectedPlace: google.maps.places.PlaceResult | null = null;
  private selectedAddress: any;

  // Dynamic Data Properties
  ownerName: string = 'HARDCODED';
  clientName: string = '';
  activeValue: number = 0;
  costByPhase: { name: string; value: number }[] = [];
  materialPercent: number = 0;
  laborPercent: number = 0;
  bidsReceived: number = 0;
  totalDuration: number = 0;
  currentWeek: number = 0;
  outlookTasks: { name: string; date: string }[] = [];
  behindScheduleCount: number = 0;
  weatherRiskMessage: string = 'None';
  weatherRiskLevel: 'none' | 'warning' | 'critical' = 'none';
  completedTasksCount: number = 0;

  // Blueprint Intelligence
  blueprintSheetCount: number = 0;
  blueprintRoomCount: number = 0;
  blueprintConfidenceScore: number = 0;

  // Bidding Status
  tradesRequiredCount: number = 0;
  invitedPlatformCount: number = 0;
  invitedExternalCount: number = 0;
  pendingResponseCount: number = 0;
  biddingRound: number = 1;

  // Subcontractor Overview
  confirmedSubsCount: number = 0;
  pendingSubsCount: number = 0;
  projectTrades: { name: string; status: 'confirmed' | 'pending' | 'none' }[] =
    [];

  // Permits
  permitStatus: 'success' | 'warning' | 'none' = 'none';
  permitStatusText: string = 'No Data';

  // Document Hub
  contractCount: number = 0;
  rfiCount: number = 0;
  inspectionCount: number = 0;
  photoCount: number = 0;

  // Carousel State
  currentIndex = 0;
  projectView: 'grid' | 'list' = 'grid';

  private localStorageKey = '';

  constructor(
    public measurementService: MeasurementService,
    public authService: AuthService,
    private addressService: AddressService,
    private jobDataService: JobDataService,
    private budgetService: BudgetService,
    private bidsService: BidsService,
    private jobsService: JobsService,
    private projectService: ProjectService,
    private snackBar: MatSnackBar,
    private router: Router,
    private reportService: ReportService,
    private weatherImpactService: WeatherImpactService,
    private dialog: MatDialog,
    private permitsService: PermitsService,
  ) {}

  ngOnChanges(): void {
    if (this.projectDetails?.jobId) {
      this.localStorageKey = `project_overview_${this.projectDetails.jobId}`;
      this.loadProjectData();
    }
    if (this.timelineData) {
      this.processTimelineData();
    }
  }

  private loadFromCache(): void {
    const cached = localStorage.getItem(this.localStorageKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      this.ownerName = data.ownerName || this.ownerName;
      this.clientName = data.clientName || '';
      this.activeValue = data.activeValue || 0;
      this.costByPhase = data.costByPhase || [];
      this.materialPercent = data.materialPercent || 0;
      this.laborPercent = data.laborPercent || 0;
      this.bidsReceived = data.bidsReceived || 0;
      this.completedTasksCount = data.completedTasksCount || 0;
    } catch (e) {
      console.error('Failed to parse cached overview data', e);
    }
  }
}

private saveToCache(): void {
  const data = {
    ownerName: this.ownerName,
    clientName: this.clientName,
    activeValue: this.activeValue,
    costByPhase: this.costByPhase,
    materialPercent: this.materialPercent,
    laborPercent: this.laborPercent,
    bidsReceived: this.bidsReceived,
    completedTasksCount: this.completedTasksCount,
  };
  localStorage.setItem(this.localStorageKey, JSON.stringify(data));
}

  loadProjectData(): void {
    // Load from cache first (Stale-While-Revalidate)
    this.loadFromCache();

    const jobId = this.projectDetails.jobId;

    // 1. Blueprint Intelligence
    this.reportService.getBlueprintIntelligence(jobId).then((data) => {
      this.blueprintConfidenceScore = data.confidenceScore;
      this.blueprintSheetCount = data.sheetCount;
      this.blueprintRoomCount = data.roomCount;
      this.saveToCache();
    });

    // Get Owner Name, Client Name & Subcontractor/Bidding Info from Job
    this.jobsService.getSpecificJob(jobId).subscribe({
      next: (job: any) => {
        if (job?.user) {
          this.ownerName = `${job.user.firstName} ${job.user.lastName}`;
        } else if (this.projectDetails?.userId) {
          // Fallback to current user if matches
          this.authService.currentUser$.subscribe((user) => {
            if (user && user.id === this.projectDetails.userId) {
              this.ownerName = `${user.firstName} ${user.lastName}`;
            }
          });
        }

        // Bidding Status Extraction
        if (
          job.tradeBudgets &&
          Array.isArray(job.tradeBudgets) &&
          job.tradeBudgets.length > 0
        ) {
          this.tradesRequiredCount = job.tradeBudgets.length;
          this.projectTrades = job.tradeBudgets.map((tb: any) => ({
            name: tb.tradeName.replace(/_/g, ' '),
            status: 'none',
          }));
        } else if (job.requiredSubcontractorTypes) {
          const types = Array.isArray(job.requiredSubcontractorTypes)
            ? job.requiredSubcontractorTypes
            : job.requiredSubcontractorTypes.split(',');
          this.tradesRequiredCount = types.length;
          // Fallback if no tradeBudgets
          this.projectTrades = types.map((t: string) => ({
            name: t,
            status: 'none',
          }));
        }
        this.biddingRound = job.biddingRound || 1;

        // Subcontractor Overview Extraction
        if (job.jobAssignments && Array.isArray(job.jobAssignments)) {
          const subs = job.jobAssignments.filter(
            (a: any) => a.role === 'Subcontractor',
          );
          this.confirmedSubsCount = subs.filter(
            (a: any) => a.status === 'Active',
          ).length;
          this.pendingSubsCount = subs.filter(
            (a: any) => a.status === 'Pending',
          ).length;

          // Update statuses in projectTrades
          subs.forEach((sub: any) => {
            if (sub.trade) {
              const normalizedSubTrade = sub.trade
                .toLowerCase()
                .replace(/_/g, ' ');

              const match = this.projectTrades.find((pt) => {
                const normalizedPtName = pt.name
                  .toLowerCase()
                  .replace(/_/g, ' ');
                return (
                  normalizedPtName === normalizedSubTrade ||
                  normalizedPtName.includes(normalizedSubTrade) ||
                  normalizedSubTrade.includes(normalizedPtName)
                );
              });

              if (match) {
                if (sub.status === 'Active') {
                  match.status = 'confirmed';
                } else if (
                  sub.status === 'Pending' &&
                  match.status !== 'confirmed'
                ) {
                  match.status = 'pending';
                }
              }
            }
          });
        }

        // Fetch client details
        this.jobsService.getClientDetails(Number(jobId)).subscribe({
          next: (client) => {
            if (client) {
              this.clientName = `${client.firstName} ${client.lastName}`;
              if (client.companyName) {
                this.clientName += ` (${client.companyName})`;
              }
              this.saveToCache();
            }
          },
          error: (err) => console.error('Failed to load client details', err),
        });
        this.saveToCache();
      },
      error: () => (this.ownerName = 'Unknown'),
    });

    // Check Permit Status
    this.checkPermitStatus(jobId);

    // Documents
    this.jobsService.getJobDocuments(jobId).subscribe({
      next: (docs) => {
        if (docs) {
          // TODO: Simple counting based on category or type, FIXME with actual documents
          this.contractCount = docs.filter((d) =>
            (d.category || d.type || '').toLowerCase().includes('contract'),
          ).length;
          this.rfiCount = docs.filter((d) =>
            (d.category || d.type || '').toLowerCase().includes('rfi'),
          ).length;
          this.inspectionCount = docs.filter((d) =>
            (d.category || d.type || '').toLowerCase().includes('inspection'),
          ).length;
          this.photoCount = docs.filter(
            (d) =>
              (d.category || d.type || '').toLowerCase().includes('photo') ||
              (d.fileType || '').toLowerCase().includes('image'),
          ).length;
        }
      },
      error: (err) => console.error('Failed to load documents', err),
    });

    // Get Budget Stats
    this.budgetService.getBudget(jobId).subscribe({
      next: (items) => {
        this.calculateBudgetStats(items);
        this.saveToCache();
      },
      error: (err) => console.error('Failed to load budget', err),
    });

    // Get Bids Count & Bidding Details
    this.bidsService.getBidsForJob(jobId).subscribe({
      next: (bids) => {
        this.bidsReceived = bids ? bids.length : 0;
        if (bids) {
          this.pendingResponseCount = bids.filter(
            (b) => b.status === 'Pending',
          ).length;
          // TODO: derive invited counts from bids or if we need another endpoint
          this.invitedPlatformCount = bids.length;
        }

        this.saveToCache();
      },
      error: (err) => console.error('Failed to load bids', err),
    });
  }

  calculateBudgetStats(items: any[]): void {
    if (!items || items.length === 0) return;

    // Active Value
    this.activeValue = items.reduce(
      (sum, item) => sum + (item.estimatedCost || 0),
      0,
    );

    // Cost by Division (Phase)
    const phaseMap = new Map<string, number>();
    items.forEach((item) => {
      const phase = item.phase || 'Unassigned';
      const current = phaseMap.get(phase) || 0;
      phaseMap.set(phase, current + (item.estimatedCost || 0));
    });

    this.costByPhase = Array.from(phaseMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4); // Top 4

    // Material vs Labour
    let materialCost = 0;
    let laborCost = 0;
    items.forEach((item) => {
      if (item.category === 'Materials')
        materialCost += item.estimatedCost || 0;
      if (item.category === 'Subcontractor')
        laborCost += item.estimatedCost || 0;
    });

    const totalCategorized = materialCost + laborCost;
    if (totalCategorized > 0) {
      this.materialPercent = Math.round(
        (materialCost / totalCategorized) * 100,
      );
      this.laborPercent = Math.round((laborCost / totalCategorized) * 100);
    }
  }

  processTimelineData(): void {
    if (!this.timelineData || this.timelineData.length === 0) return;

    const allTasks = this.timelineData.flatMap((g) => g.subtasks);
    if (allTasks.length === 0) return;

    const startDates = allTasks
      .map((t) => new Date(t.startDate || t.start).getTime())
      .filter((d) => !isNaN(d));
    const endDates = allTasks
      .map((t) => new Date(t.endDate || t.end).getTime())
      .filter((d) => !isNaN(d));

    if (startDates.length > 0 && endDates.length > 0) {
      const minStart = Math.min(...startDates);
      const maxEnd = Math.max(...endDates);

      // Total Duration in weeks
      const durationMs = maxEnd - minStart;
      this.totalDuration = Math.max(
        1,
        Math.ceil(durationMs / (1000 * 60 * 60 * 24 * 7)),
      );

      // Current Week
      const now = new Date().getTime();
      const elapsedMs = now - minStart;
      this.currentWeek =
        elapsedMs > 0 ? Math.ceil(elapsedMs / (1000 * 60 * 60 * 24 * 7)) : 0;
    }

    // Outlook (Next 7 Days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    this.outlookTasks = allTasks
      .filter((t: any) => {
        const start = new Date(t.startDate || t.start);
        return start >= today && start <= nextWeek;
      })
      .slice(0, 3)
      .map((t: any) => ({
        name: t.name || t.task || 'Untitled Task',
        date: (t.startDate || t.start || '').toString(),
      }));

    // Tasks Behind Schedule
    this.behindScheduleCount = allTasks.filter((t) => {
      const end = new Date(t.endDate || t.end);
      return end < today && t.status !== 'completed' && !t.accepted;
    }).length;

    // Completed Tasks
    this.completedTasksCount = allTasks.filter(
      (t) => t.status === 'completed',
    ).length;

    // Check Weather Impact (Next 10 Days)
    this.checkWeatherRisk(allTasks);
  }

  checkWeatherRisk(tasks: any[]): void {
    if (!this.forecast || this.forecast.length === 0) {
      this.weatherRiskMessage = 'No Data';
      this.weatherRiskLevel = 'none';
      return;
    }

    // Filter tasks that are active in the next 10 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(today.getDate() + 10);
    tenDaysFromNow.setHours(23, 59, 59, 999);

    const activeTasks = tasks.filter((t) => {
      const start = new Date(t.startDate || t.start);
      const end = new Date(t.endDate || t.end);
      return (
        (start <= tenDaysFromNow && end >= today) || // Overlaps with next 10 days
        (start >= today && start <= tenDaysFromNow)
      );
    });

    if (activeTasks.length === 0) {
      this.weatherRiskMessage = 'None';
      this.weatherRiskLevel = 'none';
      return;
    }

    // Check against forecast
    let maxRiskLevel: 'none' | 'warning' | 'critical' = 'none';
    let riskDetails: string[] = [];

    // Simple forecast check first (any bad weather?)
    const adverseDays = this.forecast.filter(
      (day) =>
        day.condition.toLowerCase().includes('rain') ||
        day.condition.toLowerCase().includes('storm') ||
        day.condition.toLowerCase().includes('snow') ||
        day.precipitationProbability > 50,
    );

    if (adverseDays.length > 0) {
      const vulnerableTasks = activeTasks.filter((t) => {
        const name = (t.name || t.task || '').toLowerCase();
        return this.weatherImpactService.RAIN_AFFECTED_CATEGORIES.some((cat) =>
          name.includes(cat),
        );
      });

      if (vulnerableTasks.length > 0) {
        maxRiskLevel = 'warning';
        const taskNames = vulnerableTasks
          .map((t) => t.name || t.task)
          .slice(0, 2)
          .join(', ');
        riskDetails.push(
          `${adverseDays.length} bad weather days affecting ${taskNames}${vulnerableTasks.length > 2 ? '...' : ''}`,
        );
      } else {
        // Bad weather but maybe indoor tasks?
        if (adverseDays.length > 2) {
          maxRiskLevel = 'warning'; // General warning for travel/logistics
          riskDetails.push(`${adverseDays.length} days of adverse weather`);
        }
      }
    }

    if (maxRiskLevel === 'warning') {
      this.weatherRiskLevel = 'warning';
      this.weatherRiskMessage = riskDetails[0] || 'Potential Delays';
    } else {
      this.weatherRiskLevel = 'none';
      this.weatherRiskMessage = 'Low Risk';
    }
  }

  onOpenBudget(): void {
    this.navigateToTab.emit('budget');
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'bidding':
        return 'Bidding Phase';
      case 'live':
        return 'Live Project';
      case 'draft':
        return 'Draft';
      default:
        return status;
    }
  }

  onViewClick(id: string) {
    this.selectProject.emit(id);
  }

  onEditClick(id: string) {
    console.log('Edit project:', id);
  }

  onDeleteClick(id: string) {
    console.log('Delete project:', id);
  }

  onActivateClick(id: string) {
    console.log('Activate project:', id);
  }

  // Carousel Logic
  get visibleProjects() {
    return this.projects.slice(this.currentIndex, this.currentIndex + 3);
  }

  nextProject() {
    if (this.currentIndex < this.projects.length - 3) {
      this.currentIndex++;
    }
  }

  prevProject() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  toggleProjectView(view: 'grid' | 'list') {
    this.projectView = view;
  }

  loadJob(id: any): void {
    this.jobDataService.navigateToJob({ jobId: id }, 'MM/dd/yyyy');
  }

  archiveJob(jobId: number): void {
    this.projectService.archiveProject(jobId);
    this.snackBar.open('Job archived successfully!', 'Close', {
      duration: 3000,
    });
  }

  openPermitsDialog(): void {
    const dialogRef = this.dialog.open(PermitsDialogComponent, {
      width: '90vw',
      maxWidth: '1600px',
      height: '90vh',
      maxHeight: '90vh',
      panelClass: 'full-screen-dialog',
      data: { jobId: this.projectDetails.jobId },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.checkPermitStatus(this.projectDetails.jobId);
    });
  }

  checkPermitStatus(jobId: number): void {
    this.permitsService.getPermits(jobId).subscribe({
      next: (permits) => {
        if (!permits || permits.length === 0) {
          this.permitStatus = 'none';
          this.permitStatusText = 'No Permits';
          return;
        }

        const expired = permits.some(
          (p) => p.status.toLowerCase() === 'expired',
        );
        const pending = permits.some(
          (p) => p.status.toLowerCase() === 'pending',
        );
        const allActive = permits.every(
          (p) =>
            p.status.toLowerCase() === 'active' ||
            p.status.toLowerCase() === 'approved',
        );

        if (expired) {
          this.permitStatus = 'warning';
          this.permitStatusText = 'Expired Permit';
        } else if (pending) {
          this.permitStatus = 'warning';
          this.permitStatusText = 'Pending Approval';
        } else if (allActive) {
          this.permitStatus = 'success';
          this.permitStatusText = 'All Approved';
        } else {
          this.permitStatus = 'none';
          this.permitStatusText = 'In Progress';
        }
      },
      error: () => {
        this.permitStatus = 'none';
        this.permitStatusText = 'Unknown';
      },
    });
  }

  toggleAddressEdit(isEditing: boolean): void {
    this.isEditingAddress = isEditing;
    if (isEditing) {
      this.addressControl.setValue(this.projectDetails.address, {
        emitEvent: true,
      });
      setTimeout(() => {
        if (this.addressInput?.nativeElement) {
          this.addressInput.nativeElement.focus();
        }
      }, 0);
    } else {
      this.selectedPlace = null;
      this.addressSuggestions = [];
    }
  }

  onAddressSelected(event: MatAutocompleteSelectedEvent): void {
    this.addressService
      .onAddressSelected(event, this.addressInput)
      .subscribe((result) => {
        if (result) {
          this.selectedPlace = result.place;
          this.selectedAddress = result.selectedAddress;
          this.addressControl.setValue(result.description, {
            emitEvent: false,
          });
        } else {
          this.selectedPlace = null;
          this.selectedAddress = null;
        }
      });
  }

  saveAddress(): void {
    this.isLoading = true;
    this.addressService
      .saveAddress(this.projectDetails.jobId, this.selectedAddress)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.isEditingAddress = false;
          this.jobDataService.fetchJobData(this.projectDetails);
          this.snackBar.open('Address updated successfully!', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open('Failed to update address.', 'Close', {
            duration: 3000,
          });
        },
      });
  }
}
