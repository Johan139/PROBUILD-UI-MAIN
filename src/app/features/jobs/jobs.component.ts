import { Component, OnInit, Inject, PLATFORM_ID, TemplateRef, ViewChild, OnDestroy, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { NgForOf, NgIf, isPlatformBrowser, DecimalPipe, CurrencyPipe, CommonModule } from "@angular/common";
import { MatButton } from "@angular/material/button";
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { SubtasksState } from '../../state/subtasks.state';
import { Store } from '../../store/store.service';
import { LoaderComponent } from '../../loader/loader.component';
import { FormGroup, FormsModule, FormControl, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { FileSizePipe } from '../Documents/filesize.pipe';
import { Subscription, debounceTime, switchMap, of, map, filter, take } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { v4 as uuidv4 } from 'uuid';
import { Location } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TimelineComponent, TimelineGroup } from '../../components/timeline/timeline.component';
import { JobDataService } from './services/job-data.service';
import { SubtaskService } from './services/subtask.service';
import { DocumentService } from './services/document.service';
import { BomService } from './services/bom.service';
import { ReportService } from './services/report.service';
import { AddressService } from './services/address.service';
import { NoteService } from './services/note.service';
import { TimelineService } from './services/timeline.service';
import { SignalrService } from './services/signalr.service';
import { JobAssignmentService } from './job-assignment/job-assignment.service';
import { AuthService } from '../../authentication/auth.service';
import { WeatherService } from '../../weather.service';
import { WeatherImpactService } from './services/weather-impact.service';
import { InitiateBiddingDialogComponent } from './initiate-bidding-dialog/initiate-bidding-dialog.component';
import { MeasurementService, TemperatureUnit } from '../../services/measurement.service';
import { SpreadsheetService } from './services/spreadsheet.service';
import { ConfirmationDialogComponent } from '../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { TeamManagementService } from '../../services/team-management.service';
import { JobAssignment, JobUser, JobAssignmentLink } from './job-assignment/job-assignment.model';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../shared/shared.module';
import { userTypes } from '../../data/user-types';
import { BudgetService } from './services/budget.service';
import { BudgetLineItem } from '../../models/budget-line-item.model';

@Component({
    selector: 'app-jobs',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NgIf,
        NgForOf,
        DecimalPipe,
        CurrencyPipe,
        MatButton,
        MatCard,
        MatCardHeader,
        MatCardTitle,
        MatCardContent,
        MatDivider,
        MatIconModule,
        MatTooltipModule,
        LoaderComponent,
        MatDialogModule,
        MatListModule,
        MatIconModule,
        MatProgressBarModule,
        MatFormFieldModule,
        MatInputModule,
        FileSizePipe,
        MatCheckboxModule,
        TimelineComponent,
        MatAutocompleteModule,
        MatMenuModule,
        MatExpansionModule,
        MatSelectModule,
        SharedModule
    ],
    templateUrl: './jobs.component.html',
    styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('documentsDialog') documentsDialog!: TemplateRef<any>;
  @ViewChild('billOfMaterialsDialog') billOfMaterialsDialog!: TemplateRef<any>;
  @ViewChild('reportDialog') reportDialog!: TemplateRef<any>;
  @ViewChild('noteDialog') noteDialog!: TemplateRef<any>;
  @ViewChild('addressInput') addressInput!: ElementRef<HTMLInputElement>;
  addressSuggestions: { description: string; place_id: string }[] = [];

  projectDetails: any;
  isEditingAddress: boolean = false;
  addressControl = new FormControl<string>('');
  selectedPlace: google.maps.places.PlaceResult | null = null;
  private selectedAddress: any;
  startDateDisplay: any;
  initialStartDate: any;
  noteText: string = '';
  documents: any[] = [];
  documentsError: string | null = null;
  alertMessage: string = '';
  isDialogOpened: boolean = false;
  isBomLoading: boolean = false;
  isBomProcessing: boolean = false;
  bomError: string | null = null;
  bom: any = null;
  processingResults: any[] = [];
  showAlert: boolean = false;
  routeURL: string = '';
  isLoading: boolean = false;
  isDocumentsLoading: boolean = false;
  isBrowser: boolean;
  IsAIProcessed: boolean = false;
  currentNoteTarget: any = null;
  noteDialogRef: any;
  progress: number = 0;
  isUploading: boolean = false;
  uploadedFilesCount: number = 0;
  uploadedFileNames: string[] = [];
  uploadedFileUrls: string[] = [];
  jobCardForm: FormGroup;
  sessionId: string = '';
  public isGeneratingReport = false;
  public isReportLoading = false;
  public reportHtml: string | null = null;
  public reportTitle: string = 'Full Project Analysis Report';
  public reportError: string | null = null;
  public isProjectOwner = false;
  public currentUserId: string = '';
  private pollingSubscription: Subscription | null = null;
  timelineGroups: TimelineGroup[] = [];
  temperatureUnit: TemperatureUnit = 'C';

  // Tab State
  activeTab: 'overview' | 'budget' | 'timeline' | 'team' = 'budget';

  // Budget Data
  budgetItems: BudgetLineItem[] = [];
  isLoadingBudget: boolean = false;

  // Budget UI State
  isAddingLineItem: boolean = false;
  newBudgetItem: Partial<BudgetLineItem> = {};
  editingItemId: number | null = null;
  editingItem: BudgetLineItem | null = null; // Copy of item being edited
  budgetTableTab: 'all' | 'Subcontractor' | 'Materials' | 'Equipment' | 'Other' = 'all';

  // Team Data
  assignedTeamMembers: JobUser[] = [];
  isLoadingTeam: boolean = false;
  teamForm: FormGroup;
  availableRoles: { value: string; display: string; }[] = [];
  isSendingInvite: boolean = false;

  constructor(
    private route: ActivatedRoute,
    public store: Store<SubtasksState>,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    public jobDataService: JobDataService,
    public subtaskService: SubtaskService,
    public documentService: DocumentService,
    public bomService: BomService,
    public reportService: ReportService,
    public addressService: AddressService,
    public noteService: NoteService,
    public timelineService: TimelineService,
    private signalrService: SignalrService,
    private jobAssignmentService: JobAssignmentService,
    private teamManagementService: TeamManagementService,
    public authService: AuthService,
    private weatherService: WeatherService,
    private weatherImpactService: WeatherImpactService,
    public measurementService: MeasurementService,
    private spreadsheetService: SpreadsheetService,
    private fb: FormBuilder,
    private budgetService: BudgetService
  ) {
    this.jobCardForm = new FormGroup({});
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Initialise Team Form
    this.teamForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      role: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.availableRoles = userTypes.filter(role => role.value !== 'GENERAL_CONTRACTOR');
  }

  // Budget Calculations
  get totalEstimated(): number {
    return this.budgetItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  }

  get totalActual(): number {
    return this.budgetItems.reduce((sum, item) => sum + item.actualCost, 0);
  }

  get totalForecast(): number {
    // If no forecast provided, assume estimated cost for now
    return this.budgetItems.reduce((sum, item) => sum + (item.forecastToComplete ?? item.estimatedCost), 0);
  }

  get variance(): number {
    return this.totalEstimated - this.totalForecast;
  }

  get variancePercent(): string {
    return this.totalEstimated > 0
      ? ((this.variance / this.totalEstimated) * 100).toFixed(1)
      : '0.0';
  }

  get cpi(): string {
    return this.totalForecast > 0
      ? (this.totalEstimated / this.totalForecast).toFixed(2)
      : '1.00';
  }

  get procurementCommitments(): number {
    return this.budgetItems
      .filter(item => item.category === 'Materials')
      .reduce((sum, item) => sum + item.estimatedCost, 0);
  }

  getVariance(item: BudgetLineItem): number {
    const forecast = item.forecastToComplete ?? item.estimatedCost;
    return item.estimatedCost - forecast;
  }

  getVariancePercent(item: BudgetLineItem): string {
    const v = this.getVariance(item);
    return item.estimatedCost > 0
      ? ((v / item.estimatedCost) * 100).toFixed(1)
      : '0.0';
  }

  get filteredBudgetItems(): BudgetLineItem[] {
    if (this.budgetTableTab === 'all') {
      return this.budgetItems;
    }
    if (this.budgetTableTab === 'Subcontractor') {
        // Include 'Labor' category items in Subcontractor tab for consolidation
        return this.budgetItems.filter(item => item.category === 'Subcontractor' || item.category === 'Labor');
    }
    return this.budgetItems.filter(item => item.category === this.budgetTableTab);
  }

  get subcontractorSummary(): BudgetLineItem[] {
    // Return all items categorized as Subcontractor, sorted by highest Actual Cost
    return this.budgetItems
      .filter(item => item.category === 'Subcontractor')
      .sort((a, b) => b.actualCost - a.actualCost)
      .slice(0, 5); // Show top 5
  }

  importAiEstimates(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Import AI Estimates',
        message: 'This will import estimated costs derived from the AI analysis. These are estimates only and should be verified. Do you want to proceed?',
        confirmButtonText: 'Import',
        cancelButtonText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.processAiImport();
      }
    });
  }

  private processAiImport(): void {
    // TODO: Check for duplicates first? For now just append as requested, user can delete.
    if (!this.processingResults || this.processingResults.length === 0) {
        this.isLoadingBudget = true;
        this.bomService.getBillOfMaterials(this.projectDetails.jobId).subscribe(results => {
            this.processingResults = results.length ? results : [results];
            this.runImportLogic();
        });
    } else {
        this.runImportLogic();
    }
  }

  private runImportLogic(): void {
    this.isLoadingBudget = true;
    const newItems: BudgetLineItem[] = [];
    const report = this.processingResults[0]?.parsedReport;

    if (report && report.sections) {
        report.sections.forEach((section: any) => {
            let category = 'Other';
            let phase = section.title.replace(/ - (Bill of Materials|Subcontractor Cost Breakdown|Cost Breakdown)/i, '').trim();

            if (section.title.toLowerCase().includes('material')) category = 'Materials';
            else if (section.title.toLowerCase().includes('labor') || section.title.toLowerCase().includes('subcontractor')) category = 'Subcontractor';

            // Filter out summary tables
            // Explicitly filter summary sections to avoid duplication
            if (
                (section.title.toLowerCase().includes('total') && section.title.toLowerCase().includes('breakdown')) ||
                section.title.toLowerCase().includes('project cost summary') ||
                section.title.toLowerCase().includes('summary of costs')
            ) {
                return;
            }

            if (section.type === 'table' && section.content) {
                // Helper to find index by header name (case insensitive)
                const getIndex = (headers: string[], ...names: string[]) =>
                    headers.findIndex(h => names.some(n => h.toLowerCase().includes(n.toLowerCase())));

                const headers = section.headers || [];

                // Column Indices
                const itemIdx = getIndex(headers, 'Item', 'Task', 'Description');
                const tradeIdx = getIndex(headers, 'Trade');
                const qtyIdx = getIndex(headers, 'Quantity', 'Qty', 'Hours');
                const unitIdx = getIndex(headers, 'Unit');
                // Make 'Total Cost' more specific to avoid grabbing CSI codes
                const costIdx = getIndex(headers, 'Total Cost', 'Total Estimated Cost', 'Est. Cost', 'Total Price');
                const unitCostIdx = getIndex(headers, 'Unit Cost', 'Rate', 'Hourly Rate');

                section.content.forEach((row: any[]) => {
                    const item = itemIdx > -1 ? row[itemIdx] : (tradeIdx > -1 ? row[tradeIdx] : 'Unknown Item');
                    const trade = tradeIdx > -1 ? row[tradeIdx] : phase; // Fallback to Phase if no Trade column

                    let cost = 0;
                    let qty = 0;
                    let unitCost = 0;

                    // Parse Quantity
                    if (qtyIdx > -1) {
                         const qStr = row[qtyIdx]?.toString() || '';
                         qty = parseFloat(qStr.replace(/[^0-9.-]+/g, '')) || 0;
                    }

                    // Parse Unit Cost
                    if (unitCostIdx > -1) {
                         const ucStr = row[unitCostIdx]?.toString() || '';
                         unitCost = parseFloat(ucStr.replace(/[^0-9.-]+/g, '')) || 0;
                    }

                    // Parse Total Cost with validation
                    if (costIdx > -1) {
                        const cStr = row[costIdx]?.toString() || '';
                        cost = parseFloat(cStr.replace(/[^0-9.-]+/g, '')) || 0;
                    }

                    // Validation: If we have Qty and UnitCost, use them to calculate/verify Total
                    const calculatedCost = qty * unitCost;
                    if (calculatedCost > 0) {
                        // If Total Cost is missing, zero, or suspiciously different (e.g. > 10% variance), trust the calculation
                        // This fixes the issue where "38100" was parsed from "38" x 100'" description overflow
                        if (cost === 0 || Math.abs(cost - calculatedCost) > (calculatedCost * 0.1)) {
                            cost = calculatedCost;
                        }
                    } else if (cost === 0 && costIdx === -1) {
                         // Only fallback to last column if we really have no other data
                         // and ensure it looks like a price (contains dot or currency symbol)
                         const lastVal = row[row.length - 1]?.toString() || '';
                         if (lastVal.includes('.') || lastVal.includes('$')) {
                             cost = parseFloat(lastVal.replace(/[^0-9.-]+/g, '')) || 0;
                         }
                    }

                    const unit = unitIdx > -1 ? row[unitIdx] : (category === 'Labor' ? 'Hours' : 'ea');

                    // Skip items that couldn't be identified or have no cost
                    if (item === 'Unknown Item') {
                        return;
                    }

                    if (cost > 0) {
                        newItems.push({
                            jobId: Number(this.projectDetails.jobId),
                            category: category,
                            phase: phase,
                            item: item,
                            trade: trade,
                            estimatedCost: cost,
                            actualCost: 0,
                            percentComplete: 0,
                            quantity: qty > 0 ? qty : undefined,
                            unit: qty > 0 ? unit : undefined,
                            unitCost: unitCost > 0 ? unitCost : undefined,
                            status: 'Pending',
                            notes: 'Imported from AI Analysis',
                            source: 'AI',
                            id: 0
                        } as BudgetLineItem);
                    }
                });
            }
        });
    }

    if (newItems.length === 0) {
        this.isLoadingBudget = false;
        this.snackBar.open('No estimable items found in AI report.', 'Close', { duration: 3000 });
        return;
    }

    // warning if clicked twice. Check if items with source='AI' already exist.
    const existingAiItems = this.budgetItems.filter(i => i.source === 'AI');
    if (existingAiItems.length > 0) {
        if (!confirm(`You already have ${existingAiItems.length} AI-imported items. This will add duplicates. Continue?`)) {
            this.isLoadingBudget = false;
            return;
        }
    }

    this.budgetService.addBudgetItemsBatch(newItems).subscribe({
        next: (savedItems) => {
            this.budgetItems = [...this.budgetItems, ...savedItems];
            this.isLoadingBudget = false;
            this.snackBar.open(`Successfully imported ${savedItems.length} items from AI.`, 'Close', { duration: 3000 });
        },
        error: (err) => {
            console.error('Batch import failed', err);
            this.isLoadingBudget = false;
            this.snackBar.open('Failed to import items.', 'Close', { duration: 3000 });
        }
    });
  }

  setBudgetTableTab(tab: any): void {
    this.budgetTableTab = tab;
    this.cancelAddLineItem(); // Cancel add if switching tabs
    this.cancelEditLineItem();
  }

  getStatusColor(estimated: number, forecast: number | undefined): string {
    const f = forecast ?? estimated;
    const diff = estimated > 0 ? ((f - estimated) / estimated) * 100 : 0;
    if (diff <= 0) return 'text-color-green';
    if (diff <= 5) return 'text-color-yellow';
    return 'text-color-red';
  }

  getStatusIcon(estimated: number, forecast: number | undefined): string {
    const f = forecast ?? estimated;
    const diff = estimated > 0 ? ((f - estimated) / estimated) * 100 : 0;
    if (diff <= 0) return 'check_circle';
    if (diff <= 5) return 'error_outline';
    return 'error';
  }

  setActiveTab(tab: 'overview' | 'budget' | 'timeline' | 'team'): void {
    this.activeTab = tab;
    if (tab === 'team') {
      this.loadAssignedTeam();
    } else if (tab === 'budget') {
      this.loadBudget();
    }
  }

  loadBudget(): void {
    if (!this.projectDetails?.jobId) return;
    this.isLoadingBudget = true;
    this.budgetService.getBudget(this.projectDetails.jobId).subscribe({
      next: (items) => {
        this.budgetItems = items;
        this.isLoadingBudget = false;
      },
      error: (err) => {
        console.error('Error loading budget', err);
        this.isLoadingBudget = false;
        this.snackBar.open('Failed to load budget.', 'Close', { duration: 3000 });
      }
    });
  }

  syncBudget(): void {
    // Check if there are unsaved changes or unaccepted subtasks
    const unaccepted = this.store.getState().subtaskGroups
      .flatMap(group => group.subtasks)
      .filter(st => !st.deleted && !st.accepted);

    if (unaccepted.length > 0) {
      this.snackBar.open('Please accept all subtasks and Save the job before syncing the budget.', 'Close', { duration: 5000 });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Sync Budget',
        message: 'This will update the budget based on the last SAVED project timeline. Any unsaved changes will not be included. Continue?',
        confirmButtonText: 'Sync',
        cancelButtonText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoadingBudget = true;
        this.budgetService.syncBudget(this.projectDetails.jobId).subscribe({
          next: () => {
            this.snackBar.open('Budget synced successfully.', 'Close', { duration: 3000 });
            this.loadBudget();
          },
          error: (err) => {
            console.error('Error syncing budget', err);
            this.isLoadingBudget = false;
            this.snackBar.open('Failed to sync budget.', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  // Budget Inline Actions
  startAddLineItem(): void {
    this.isAddingLineItem = true;
    this.newBudgetItem = {
      jobId: Number(this.projectDetails.jobId),
      item: '',
      trade: '',
      category: this.budgetTableTab === 'all' ? 'Labor' : this.budgetTableTab, // Default category
      estimatedCost: 0,
      actualCost: 0,
      forecastToComplete: 0,
      percentComplete: 0,
      notes: '',
      status: 'Pending',
      source: 'Manual'
    };
  }

  cancelAddLineItem(): void {
    this.isAddingLineItem = false;
    this.newBudgetItem = {};
  }

  recalculateEstimatedCost(item: Partial<BudgetLineItem>): void {
    if ((item.quantity || item.quantity === 0) && (item.unitCost || item.unitCost === 0)) {
      item.estimatedCost = item.quantity * item.unitCost;
      // Default forecast to estimated if not set, or update it if it matches estimated
      if (item.forecastToComplete === undefined || item.forecastToComplete === 0) {
          item.forecastToComplete = item.estimatedCost;
      }
    }
  }

  saveNewLineItem(): void {
    if (!this.newBudgetItem.item || !this.newBudgetItem.trade) {
      this.snackBar.open('Please fill in Item and Trade fields.', 'Close', { duration: 3000 });
      return;
    }

    // Default values if missing
    const itemToSave: BudgetLineItem = {
      ...this.newBudgetItem,
      estimatedCost: this.newBudgetItem.estimatedCost || 0,
      actualCost: this.newBudgetItem.actualCost || 0,
      // Default forecast to estimated cost if not manually entered
      forecastToComplete: this.newBudgetItem.forecastToComplete ?? this.newBudgetItem.estimatedCost ?? 0,
      percentComplete: this.newBudgetItem.percentComplete || 0,
      jobId: Number(this.projectDetails.jobId)
    } as BudgetLineItem;

    this.isLoadingBudget = true;
    this.budgetService.addBudgetItem(itemToSave).subscribe({
      next: (newItem) => {
        this.budgetItems = [...this.budgetItems, newItem]; // Add to local list
        this.isLoadingBudget = false;
        this.isAddingLineItem = false;
        this.newBudgetItem = {};
        this.snackBar.open('Line item added successfully.', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Error adding budget item', err);
        this.isLoadingBudget = false;
        this.snackBar.open('Failed to add line item.', 'Close', { duration: 3000 });
      }
    });
  }

  startEditLineItem(item: BudgetLineItem): void {
    this.editingItemId = item.id;
    this.editingItem = { ...item }; // Deep copy for editing
  }

  cancelEditLineItem(): void {
    this.editingItemId = null;
    this.editingItem = null;
  }

  saveEditLineItem(): void {
    if (!this.editingItem) return;

    this.isLoadingBudget = true;
    this.budgetService.updateBudgetItem(this.editingItem.id, this.editingItem).subscribe({
      next: (updatedItem) => {
        // Update local list
        const index = this.budgetItems.findIndex(i => i.id === updatedItem.id);
        if (index !== -1) {
          this.budgetItems[index] = updatedItem;
        }
        this.isLoadingBudget = false;
        this.editingItemId = null;
        this.editingItem = null;
        this.snackBar.open('Line item updated successfully.', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Error updating budget item', err);
        this.isLoadingBudget = false;
        this.snackBar.open('Failed to update line item.', 'Close', { duration: 3000 });
      }
    });
  }

  deleteLineItem(item: BudgetLineItem): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Line Item',
        message: `Are you sure you want to delete "${item.item}"?`,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoadingBudget = true;
        this.budgetService.deleteBudgetItem(item.id).subscribe({
          next: () => {
            this.budgetItems = this.budgetItems.filter(i => i.id !== item.id);
            this.isLoadingBudget = false;
            this.snackBar.open('Line item deleted.', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error deleting budget item', err);
            this.isLoadingBudget = false;
            this.snackBar.open('Failed to delete line item.', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  loadAssignedTeam(): void {
    if (!this.projectDetails?.jobId) return;

    this.isLoadingTeam = true;
    this.jobAssignmentService.getJobAssignment().subscribe({
      next: (assignments) => {
        const jobId = Number(this.projectDetails.jobId);
        const assignment = assignments.find(a => a.id === jobId);
        if (assignment && assignment.jobUser) {
          this.assignedTeamMembers = assignment.jobUser;
        } else {
          this.assignedTeamMembers = [];
        }
        this.isLoadingTeam = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading assignments', err);
        this.isLoadingTeam = false;
        this.snackBar.open('Failed to load team members', 'Close', { duration: 3000 });
      }
    });
  }

  inviteTeamMember(): void {
    if (this.teamForm.valid) {
      this.isSendingInvite = true;
      const newMember = this.teamForm.value;
      const inviterId = this.currentUserId;

      if (!inviterId) {
         this.snackBar.open('Cannot invite: User ID not found.', 'Close', { duration: 3000 });
         this.isSendingInvite = false;
         return;
      }

      // First add to team
      this.teamManagementService.addTeamMember(newMember, inviterId).subscribe({
        next: (member) => {
           // Then assign to this job
           const assignmentLink: JobAssignmentLink = {
             userId: member.id,
             jobId: Number(this.projectDetails.jobId),
             jobRole: newMember.role
           };

           this.jobAssignmentService.createJobAssignment(assignmentLink).subscribe({
             next: () => {
               this.snackBar.open('Team member invited and assigned!', 'Close', { duration: 3000 });
               this.isSendingInvite = false;
               this.teamForm.reset();
               // Refresh list
               this.loadAssignedTeam();
             },
             error: (err) => {
                console.error('Error assigning to job', err);
                this.snackBar.open('Member invited but failed to assign to job.', 'Close', { duration: 3000 });
                this.isSendingInvite = false;
             }
           });
        },
        error: (error) => {
          if (error.status === 409) {
             this.snackBar.open(error.error.message, 'Close', { duration: 5000 });
          } else {
             this.snackBar.open('Failed to invite team member.', 'Close', { duration: 3000 });
          }
          this.isSendingInvite = false;
        }
      });
    }
  }

  removeTeamMember(user: JobUser): void {
     if (!confirm(`Are you sure you want to remove ${user.firstName} from this project?`)) return;

     const link: JobAssignmentLink = {
       userId: user.id,
       jobId: Number(this.projectDetails.jobId),
       jobRole: user.jobRole || ''
     };

     this.jobAssignmentService.deleteUserAssignment(link).subscribe({
       next: () => {
         this.snackBar.open('User removed from project.', 'Close', { duration: 3000 });
         this.loadAssignedTeam();
       },
       error: (err) => {
         console.error('Error removing user', err);
         this.snackBar.open('Failed to remove user.', 'Close', { duration: 3000 });
       }
     });
  }

  get isDialogOpen(): boolean {
    return this.dialog.openDialogs.length > 0;
  }

  ngOnInit() {
    this.sessionId = uuidv4();
    this.measurementService.getSettings().subscribe(settings => {
      this.temperatureUnit = settings.temperature;
    });
    this.signalrService.startConnection();
    this.signalrService.progress.subscribe((progress) => {
      this.progress = progress;
    });
    this.signalrService.uploadComplete.subscribe(() => {
      this.isUploading = false;
      this.resetFileInput();
    });

    this.route.queryParams.pipe(
      take(1),
      switchMap(params => {
        this.jobDataService.fetchJobData(params);
        return this.store.select(state => state.projectDetails);
      }),
      filter(projectDetails => !!projectDetails)
    ).subscribe(projectDetails => {
      this.projectDetails = projectDetails;
      if (this.projectDetails?.date) {
  const d = new Date(this.projectDetails.date);
  this.startDateDisplay = isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
} else {
  this.startDateDisplay = null;
}

      if (this.projectDetails?.jobId) {
        this.authService.currentUser$.pipe(
          filter(user => !!user),
          take(1)
        ).subscribe(user => {
          if (user) {
            this.currentUserId = user.id;
            this.checkProjectOwnerStatus(this.projectDetails.jobId, user.id);
          }
        });
      }
    });

    this.store.select(state => state.projectDetails).pipe(
      switchMap(projectDetails => {
        if (!projectDetails || !projectDetails.latitude || !projectDetails.longitude) {
          return of([]);
        }
        return this.timelineService.timelineGroups$.pipe(
          switchMap(timelineGroups =>
            this.store.select(s => s.forecast).pipe(
              map(forecast => {
                if (!forecast) return timelineGroups;
                return this.weatherImpactService.applyWeatherImpact(timelineGroups, forecast);
              })
            )
          )
        );
      })
    ).subscribe(processedTimelineGroups => {
      this.timelineGroups = processedTimelineGroups;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.addressService.loadGoogleMapsScript().then(() => {
        this.addressControl.valueChanges
          .pipe(
            debounceTime(300),
            switchMap((value) =>
              this.addressService.getPlacePredictions(value)
            )
          )
          .subscribe((predictions) => {
            this.addressSuggestions = predictions;
          });
      });
    }
  }

  ngOnDestroy(): void {
    this.signalrService.stopConnection();
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) {
      return;
    }
    const file = input.files[0];
    this.isUploading = true;
    this.progress = 0;
    this.documentService
      .uploadFile(file, this.projectDetails.jobId, this.sessionId)
      .subscribe((e) => {
        if (e.type === 1 && e.total) {
          this.progress = Math.round((100 * e.loaded) / e.total);
        } else if (e.type === 4) {
          this.isUploading = false;
          this.resetFileInput();
          if (e.body?.fileUrls) {
            this.uploadedFileUrls = [
              ...this.uploadedFileUrls,
              ...e.body.fileUrls,
            ];
          }
        }
      });
  }

  resetFileInput(): void {
    const fileInput = document.getElementById(
      'file-upload'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  openNoteDialog(subtask: any): void {
    this.currentNoteTarget = subtask;
    this.noteDialogRef = this.dialog.open(this.noteDialog, {
      width: '250vw',
      height: '60vh',
      panelClass: 'subtask-note-dialog',
      data: {
        note: subtask?.note || '',
        jobId: this.projectDetails?.jobId,
        subtaskId: subtask?.id,
        createdByUserId: localStorage.getItem('userId'),
        sessionId: this.sessionId,
      },
    });
  }

  saveNoteDialog(): void {
    const userId: string | null = localStorage.getItem('userId');
    this.noteService
      .saveNote(
        this.projectDetails.jobId,
        this.projectDetails.userId,
        this.currentNoteTarget.id,
        this.noteText,
        userId || '',
        this.sessionId
      )
      .subscribe(() => {
        this.jobCardForm.reset();
        this.uploadedFilesCount = 0;
        this.uploadedFileNames = [];
        this.uploadedFileUrls = [];
        this.noteText = '';
        this.noteDialogRef.close();
      });
  }

  closeNoteDialog(): void {
    this.noteDialogRef.close();
  }

  openBillOfMaterialsDialog(): void {
    this.isBomLoading = true;
    this.bomService
      .getBillOfMaterials(this.projectDetails.jobId)
      .subscribe((result) => {
        this.isBomLoading = false;
        if (result.error) {
          this.bomError = result.error;
        } else {
          this.processingResults = result;
          this.IsAIProcessed = true;
        }
        this.dialog.open(this.billOfMaterialsDialog, {
          width: '20000px',
          maxHeight: '100vh',
          maxWidth: '150vw',
        });
      });
  }

  closeBillOfMaterialsDialog(): void {
    this.dialog.closeAll();
  }

  generateBOMPDF(): void {
    this.bomService.generateBOMPDF(this.processingResults, this.projectDetails.projectName);
  }

  downloadEnvironmentalReport(jobId: string): void {
    this.isGeneratingReport = true;
    this.reportService
      .downloadEnvironmentalReport(jobId)
      .finally(() => (this.isGeneratingReport = false));
  }

  openReportDialog(): void {
    this.isReportLoading = true;
    this.reportError = null;
    this.reportHtml = null;
    this.reportTitle = 'Full Project Analysis Report';

    this.reportService.getFullReportContent(this.projectDetails.jobId)
      .then(content => {
        if (content) {
          this.reportHtml = content;
          this.dialog.open(this.reportDialog, {
            width: '90vw',
            height: '90vh',
            maxWidth: '1200px',
            maxHeight: '90vh'
          });
        } else {
          this.snackBar.open('Could not retrieve report content.', 'Close', { duration: 3000 });
        }
      })
      .catch(err => {
        console.error(err);
        this.snackBar.open('An error occurred while fetching the report.', 'Close', { duration: 3000 });
      })
      .finally(() => {
        this.isReportLoading = false;
      });
  }

  openExecutiveSummaryDialog(): void {
    this.isReportLoading = true;
    this.reportError = null;
    this.reportHtml = null;
    this.reportTitle = 'Executive Summary';

    this.reportService.getExecutiveSummary(this.projectDetails.jobId)
      .then(content => {
        if (content) {
          this.reportHtml = content;
          this.dialog.open(this.reportDialog, {
            width: '90vw',
            height: '90vh',
            maxWidth: '1200px',
            maxHeight: '90vh'
          });
        } else {
          this.snackBar.open('Could not retrieve Executive Summary.', 'Close', { duration: 3000 });
        }
      })
      .catch(err => {
        console.error(err);
        this.snackBar.open('An error occurred while fetching the Executive Summary.', 'Close', { duration: 3000 });
      })
      .finally(() => {
        this.isReportLoading = false;
      });
  }

  openEnvironmentalReportDialog(): void {
    this.isReportLoading = true;
    this.reportError = null;
    this.reportHtml = null;
    this.reportTitle = 'Environmental Lifecycle Report';

    this.reportService.getEnvironmentalReportContent(this.projectDetails.jobId)
      .then(content => {
        if (content) {
          this.reportHtml = content;
          this.dialog.open(this.reportDialog, {
            width: '90vw',
            height: '90vh',
            maxWidth: '1200px',
            maxHeight: '90vh'
          });
        } else {
          this.snackBar.open('Could not retrieve Environmental Report.', 'Close', { duration: 3000 });
        }
      })
      .catch(err => {
        console.error(err);
        this.snackBar.open('An error occurred while fetching the Environmental Report.', 'Close', { duration: 3000 });
      })
      .finally(() => {
        this.isReportLoading = false;
      });
  }

  closeReportDialog(): void {
    this.dialog.closeAll();
  }

  downloadFullReport(): void {
    if (!this.reportHtml) return;

    this.isGeneratingReport = true;
    const cleanTitle = this.reportTitle.replace(/ /g, '_');
    const fileName = `${this.projectDetails.projectName}_${cleanTitle}.pdf`;

    this.reportService.generatePdfFromHtml(this.reportHtml, fileName, this.reportTitle)
      .finally(() => {
        this.isGeneratingReport = false;
      });
  }

  downloadAsSpreadsheet(format: 'csv' | 'excel'): void {
    const data: { [key: string]: any[] } = {};
    this.processingResults.forEach(result => {
      result.parsedReport.sections.forEach((section: { title: string; headers: any[]; content: any[][]; }) => {
        if (!data[section.title]) {
          data[section.title] = [];
        }
        section.content.forEach((row: { [x: string]: any; }) => {
          const newRow: { [key: string]: any } = {};
          section.headers.forEach((header: string | number, index: string | number) => {
            newRow[header] = row[index];
          });
          data[section.title].push(newRow);
        });
      });
    });

    const date = new Date().toISOString().slice(0, 10);
    const fileName = `${this.projectDetails.projectName}_BOM_${date}`;

    if (format === 'csv') {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: {
          title: 'Download Multiple CSVs',
          message: 'This will download a separate CSV file for each section of the Bill of Materials. Do you want to continue?',
          confirmButtonText: 'Yes, Download All',
          cancelButtonText: 'Cancel'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.spreadsheetService.generateCsv(data, fileName);
        }
      });
    } else if (format === 'excel') {
      this.spreadsheetService.generateExcel(data, fileName);
    }
  }

  openDocumentsDialog() {
    this.documentService
      .fetchDocuments(this.projectDetails.jobId)
      .subscribe((docs) => {
        this.documents = docs;

        this.dialog.open(this.documentsDialog, {
          width: '500px',
          maxHeight: '80vh',
          autoFocus: true,
        });
      });
  }

  closeDocumentsDialog() {
    this.dialog.closeAll();
  }

  viewDocument(document: any) {
    this.documentService.viewDocument(document);
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

  handleGroupMove(event: { groupId: string; newStartDate: Date; newEndDate: Date; }): void {
    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1)
    ).subscribe(user => {
      this.timelineService.handleGroupMove(event, this.projectDetails.jobId, user.id);
    });
  }

  NavigateBack(): void {
    this.location.back();
  }


  publishJob(): void {
    const dialogRef = this.dialog.open(InitiateBiddingDialogComponent, {
      width: '400px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.biddingType) {
        this.projectDetails.biddingType = result.biddingType;
        this.projectDetails.requiredSubcontractorTypes = result.requiredSubcontractorTypes;
        this.projectDetails.status = 'BIDDING';
        this.subtaskService.publishJob(this.projectDetails.jobId, this.projectDetails).subscribe(() => {
          this.snackBar.open('Job published successfully!', 'Close', {
            duration: 3000
          });
        });
      }
    });
  }

  closeAlert(): void {
    this.showAlert = false;
  }

  private checkProjectOwnerStatus(jobId: string, userId: string): void {
    if (!userId || !jobId) {
      this.isProjectOwner = false;
      return;
    }

    this.store.select(state => state.projectDetails).subscribe(projectDetails => {
      if (projectDetails && projectDetails.userId === userId) {
        this.isProjectOwner = true;
      } else {
        this.jobAssignmentService.getJobAssignment().subscribe(assignments => {
          const numericJobId = +jobId;
          const jobAssignment = assignments.find(assignment => assignment.id === numericJobId);
          if (jobAssignment) {
            const user = jobAssignment.jobUser.find(u => u.id === userId);
            this.isProjectOwner = !!user;
          } else {
            this.isProjectOwner = false;
          }
        });
      }
    });
  }
}
