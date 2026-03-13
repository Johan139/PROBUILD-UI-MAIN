import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, FileText, Home, MapPin, ClipboardList, AlertTriangle, Truck, Shield, CheckCircle2, Loader2, ChevronUp, ChevronDown, Info, ArrowRight, Calculator } from 'lucide-angular';
import { SignalrService, AnalysisProgressUpdate } from '../../../services/signalr.service';
import { Subscription } from 'rxjs';
import { interval } from 'rxjs';
import { startWith } from 'rxjs/operators';

type AnalysisStep = 'metadata' | 'rooms' | 'zoning' | 'permits' | 'blueprint-review' | 'site-logistics' | 'quality-management' | 'cost-estimation' | 'complete';

@Component({
  selector: 'app-job-analysis-walkthrough',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './job-analysis-walkthrough.component.html',
  styleUrls: ['./job-analysis-walkthrough.component.scss']
})
export class JobAnalysisWalkthroughComponent implements OnInit, OnDestroy {
  @Input() jobId!: number;
  @Input() initialProgress: number = 0;
  @Output() continue = new EventEmitter<void>();

  analysisProgress: number = 0;
  currentStep: AnalysisStep = 'metadata';
  completedSteps: AnalysisStep[] = [];
  expandedSections: string[] = ['metadata'];
  statusMessage: string = 'Initializing analysis...';

  private signalRSubscription: Subscription | null = null;
  private analysisDataSubscription: Subscription | null = null;
  private analysisStatePollingSubscription: Subscription | null = null;

  FileText = FileText;
  Home = Home;
  MapPin = MapPin;
  ClipboardList = ClipboardList;
  AlertTriangle = AlertTriangle;
  Truck = Truck;
  Shield = Shield;
  CheckCircle2 = CheckCircle2;
  Loader2 = Loader2;
  ChevronUp = ChevronUp;
  ChevronDown = ChevronDown;
  Info = Info;
  ArrowRight = ArrowRight;
  Calculator = Calculator;

  analysisSteps: { id: AnalysisStep; label: string; icon: any }[] = [
    { id: 'metadata', label: 'Project Info', icon: FileText },
    { id: 'rooms', label: 'Room Detection', icon: Home },
    { id: 'zoning', label: 'Zoning & Site', icon: MapPin },
    { id: 'permits', label: 'Permits', icon: ClipboardList },
    { id: 'blueprint-review', label: 'Blueprint Review', icon: AlertTriangle },
    { id: 'site-logistics', label: 'Site Logistics', icon: Truck },
    { id: 'quality-management', label: 'Quality Plan', icon: Shield },
    { id: 'cost-estimation', label: 'Cost Estimation', icon: Calculator },
  ];

  // Data is streamed from the backend via SignalR
  metadata: any = {};
  rooms: any[] = [];
  zoningData: any = {
    zoning: '',
    lotSize: '',
    setbacks: {},
    utilities: [],
    unforeseenWork: []
  };
  permits: any[] = [];
  blueprintIssues: any[] = [];
  siteLogistics: any = {
    zones: [],
    equipment: [],
    hazards: [],
    ppe: []
  };
  qualityManagement: any = {
    codes: [],
    mockups: [],
    holdPoints: []
  };

  constructor(
    private signalrService: SignalrService,
    private cdr: ChangeDetectorRef
  ) {}

  get totalArea(): number {
    return this.rooms.reduce((sum, r) => sum + r.area, 0);
  }

  get objectKeys() {
    return Object.keys;
  }

  handlePermitUpload(id: string) {
    // TODO: Mock upload handler, need to make it REAL
    const permit = this.permits.find((p) => p.id === id);
    if (permit) {
      permit.status = 'uploaded';
      permit.file = 'uploaded-permit.pdf' as any;
    }
  }

  ngOnInit() {
    this.analysisProgress = this.initialProgress;

    this.signalrService.getAnalysisState(this.jobId).subscribe((state) => {
      if (state) {
        this.restoreState(state);
      }
    });

    this.signalrService.startConnection();
    this.signalRSubscription = this.signalrService.analysisProgress.subscribe((update: AnalysisProgressUpdate) => {
      if (update && update.jobId === this.jobId) {
        this.handleProgressUpdate(update);
      }
    });

    this.analysisDataSubscription = this.signalrService.analysisData.subscribe((update: any) => {
      if (update && update.jobId === this.jobId) {
        this.updateData(update.dataType, update.data);
      }
    });

    // Poll persisted state as a fallback when SignalR events are missed/reconnected
    this.analysisStatePollingSubscription = interval(4000)
      .pipe(startWith(0))
      .subscribe(() => {
        this.signalrService.getAnalysisState(this.jobId).subscribe((state) => {
          if (!state) {
            return;
          }

          const statusMessage = state.statusMessage ?? state.StatusMessage ?? this.statusMessage;
          const currentStep = state.currentStep ?? state.CurrentStep ?? 0;
          const totalSteps = state.totalSteps ?? state.TotalSteps ?? 0;
          const isComplete = !!(state.isComplete ?? state.IsComplete);
          const hasFailed = !!(state.hasFailed ?? state.HasFailed);
          const errorMessage = state.errorMessage ?? state.ErrorMessage ?? '';

          const mappedUpdate: AnalysisProgressUpdate = {
            jobId: this.jobId,
            statusMessage,
            currentStep,
            totalSteps,
            isComplete,
            hasFailed,
            errorMessage,
          };

          this.handleProgressUpdate(mappedUpdate);
        });
      });
  }

  restoreState(state: any) {
    const statusMessage = state.statusMessage ?? state.StatusMessage ?? '';
    const currentStep = state.currentStep ?? state.CurrentStep ?? 0;
    const totalSteps = state.totalSteps ?? state.TotalSteps ?? 0;
    const isComplete = !!(state.isComplete ?? state.IsComplete);
    const extractedDataJson = state.extractedDataJson ?? state.ExtractedDataJson;

    const derivedComplete = !isComplete && totalSteps > 0 && currentStep >= totalSteps;

    if (currentStep > 0) {
      this.statusMessage = statusMessage;
      if (totalSteps > 0) {
        this.analysisProgress = (currentStep / totalSteps) * 100;
      }
      this.mapStatusToStep(statusMessage, currentStep);
    }

    if (isComplete || derivedComplete) {
      this.currentStep = 'complete';
      this.analysisProgress = 100;
      this.completedSteps = this.analysisSteps.map((s) => s.id as AnalysisStep);
    }

    if (extractedDataJson) {
      try {
        const data = JSON.parse(extractedDataJson);
        if (data.metadata) this.metadata = data.metadata;
        if (data.rooms) this.rooms = data.rooms;
        if (data.zoning) this.zoningData = data.zoning;
        if (data.permits) this.permits = data.permits;
        if (data['blueprint-issues'])
          this.blueprintIssues = data['blueprint-issues'];
        if (data['site-logistics']) this.siteLogistics = data['site-logistics'];
        if (data['quality-management'])
          this.qualityManagement = data['quality-management'];
      } catch (e) {
        console.error('Failed to parse restored data', e);
      }
    }

    this.cdr.detectChanges();
  }

  updateData(dataType: string, data: any) {
    console.log('JobAnalysisWalkthroughComponent: Updating data', dataType, data);
    switch (dataType) {
      case 'metadata':
        this.metadata = data;
        break;
      case 'rooms':
        this.rooms = data;
        break;
      case 'zoning':
        this.zoningData = data;
        break;
      case 'permits':
        this.permits = data;
        break;
      case 'blueprint-issues':
        this.blueprintIssues = data;
        break;
      case 'site-logistics':
        this.siteLogistics = data;
        break;
      case 'quality-management':
        this.qualityManagement = data;
        break;
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
    if (this.analysisDataSubscription) {
      this.analysisDataSubscription.unsubscribe();
    }
    if (this.analysisStatePollingSubscription) {
      this.analysisStatePollingSubscription.unsubscribe();
    }
  }

  handleProgressUpdate(update: AnalysisProgressUpdate) {
    this.statusMessage = update.statusMessage;

    if (update.totalSteps > 0) {
      this.analysisProgress = (update.currentStep / update.totalSteps) * 100;
    }

    const derivedComplete =
      !update.isComplete && update.totalSteps > 0 && update.currentStep >= update.totalSteps;

    if (update.isComplete || derivedComplete) {
      this.currentStep = 'complete';
      this.analysisProgress = 100;
      this.completedSteps = this.analysisSteps.map(s => s.id as AnalysisStep);

      if (this.analysisStatePollingSubscription) {
        this.analysisStatePollingSubscription.unsubscribe();
        this.analysisStatePollingSubscription = null;
      }
    } else {
      this.mapStatusToStep(update.statusMessage, update.currentStep);
    }

    this.cdr.detectChanges();
  }

  private mapStatusToStep(status: string, currentStepIndex: number) {
    const lowerStatus = status.toLowerCase();
    let newStep: AnalysisStep = this.currentStep;

    // map backend status message to visual steps
    // Backend prompt names: prompt-01-site-logistics, prompt-02-quality-management, etc.

    if (lowerStatus.includes('site logistics')) {
      newStep = 'site-logistics';
      // If we jumped here, assume previous are done (metadata...blueprint-review). TODO: Make this smarter
      this.markStepsComplete(['metadata', 'rooms', 'zoning', 'permits', 'blueprint-review']);
    } else if (lowerStatus.includes('quality management')) {
      newStep = 'quality-management';
      this.markStepsComplete(['metadata', 'rooms', 'zoning', 'permits', 'blueprint-review', 'site-logistics']);
    } else if (
        lowerStatus.includes('demolition') ||
        lowerStatus.includes('groundwork') ||
        lowerStatus.includes('framing') ||
        lowerStatus.includes('roofing') ||
        lowerStatus.includes('electrical') ||
        lowerStatus.includes('plumbing') ||
        lowerStatus.includes('hvac') ||
        lowerStatus.includes('insulation') ||
        lowerStatus.includes('drywall') ||
        lowerStatus.includes('painting') ||
        lowerStatus.includes('trim') ||
        lowerStatus.includes('kitchen') ||
        lowerStatus.includes('flooring') ||
        lowerStatus.includes('exterior') ||
        lowerStatus.includes('cleaning') ||
        lowerStatus.includes('risk') ||
        lowerStatus.includes('timeline') ||
        lowerStatus.includes('general conditions') ||
        lowerStatus.includes('procurement') ||
        lowerStatus.includes('cost') ||
        lowerStatus.includes('value engineering') ||
        lowerStatus.includes('environmental') ||
        lowerStatus.includes('closeout') ||
        lowerStatus.includes('summary')
    ) {
      newStep = 'cost-estimation';
      this.markStepsComplete(['metadata', 'rooms', 'zoning', 'permits', 'blueprint-review', 'site-logistics', 'quality-management']);
    } else {
    }

    if (newStep !== this.currentStep) {
      this.currentStep = newStep;
      if (!this.completedSteps.includes(newStep)) {
         // Current step is not complete
      }
      if (this.expandedSections.length === 0) {
        this.expandedSections = [newStep];
      }
    }
  }

  private markStepsComplete(stepIds: AnalysisStep[]) {
    stepIds.forEach(id => {
      if (!this.completedSteps.includes(id)) {
        this.completedSteps.push(id);
      }
    });
  }

  toggleSection(stepId: string) {
    if (this.expandedSections.includes(stepId)) {
      this.expandedSections = this.expandedSections.filter(s => s !== stepId);
    } else {
      this.expandedSections.push(stepId);
    }
  }

  isStepComplete(stepId: string): boolean {
    return this.completedSteps.includes(stepId as AnalysisStep);
  }

  isStepActive(stepId: string): boolean {
    return this.currentStep === stepId;
  }

  onContinue() {
    this.continue.emit();
  }
}
