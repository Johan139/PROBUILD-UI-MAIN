import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { BudgetLineItem } from '../../../models/budget-line-item.model';
import { BudgetService } from '../services/budget.service';
import { BomService } from '../services/bom.service';
import { ReportService } from '../services/report.service';
import { ConfirmationDialogComponent } from '../../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { QuoteService } from '../../quote/quote.service';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-project-budget-tracking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    MatExpansionModule,
    DecimalPipe,
    MoneyPipe
],
  templateUrl: './project-budget-tracking.component.html',
  styleUrl: './project-budget-tracking.component.scss',
  providers: [QuoteService],
})
export class ProjectBudgetTrackingComponent implements OnInit, OnChanges {
  @Input() projectDetails: any;

  // Budget Data
  budgetItems: BudgetLineItem[] = [];
  isLoadingBudget: boolean = false;
  isLoadingSummary: boolean = false;
  isBudgetViewReady: boolean = false;
  processingResults: any[] = [];
  isBrowser: boolean;
  totalProjectCost: number = 0;
  private budgetLoaded = false;
  private summaryLoaded = false;
  private currentLoadToken = 0;

  jobInvoices: any[] = [];
  isLoadingInvoices = false;

  // Budget UI State
  isAddingLineItem: boolean = false;
  newBudgetItem: Partial<BudgetLineItem> = {};
  editingItemId: number | null = null;
  editingItem: BudgetLineItem | null = null;
  private isAutoImporting: boolean = false;
  budgetTableTab:
    | 'all'
    | 'Subcontractor'
    | 'Materials'
    | 'Equipment'
    | 'Other' = 'all';
  selectedDivision: string | null = 'all';

  constructor(
    private budgetService: BudgetService,
    private bomService: BomService,
    private reportService: ReportService,
    private quoteService: QuoteService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.projectDetails?.jobId) {
      this.loadBudgetViewData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectDetails'] && this.projectDetails?.jobId) {
      this.loadBudgetViewData();
    }
  }

  private loadBudgetViewData(): void {
    const jobId = this.projectDetails?.jobId;
    if (!jobId) return;

    const loadToken = ++this.currentLoadToken;
    this.isBudgetViewReady = false;
    this.isLoadingBudget = true;
    this.isLoadingSummary = true;
    this.budgetLoaded = false;
    this.summaryLoaded = false;

    this.loadBudget(loadToken);
    this.loadCostSummary(loadToken);
    this.loadInvoices(loadToken);
  }

  private loadInvoices(loadToken: number): void {
    const jobId = Number(this.projectDetails?.jobId);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      this.jobInvoices = [];
      return;
    }

    this.isLoadingInvoices = true;
    this.quoteService.getJobInvoices(jobId).subscribe({
      next: (invoices) => {
        if (loadToken !== this.currentLoadToken) {
          return;
        }
        this.jobInvoices = Array.isArray(invoices) ? invoices : [];
        this.isLoadingInvoices = false;
      },
      error: (err) => {
        if (loadToken !== this.currentLoadToken) {
          return;
        }
        console.error('Failed to load job invoices', err);
        this.jobInvoices = [];
        this.isLoadingInvoices = false;
      },
    });
  }

  get pendingInvoices(): any[] {
    return (this.jobInvoices || []).filter(
      (inv) => String(inv?.status || '') === 'Approved',
    );
  }

  get pendingInvoicesCount(): number {
    return this.pendingInvoices.length;
  }

  get pendingInvoicesAmount(): number {
    return this.pendingInvoices.reduce(
      (sum, inv) => sum + (Number(inv?.total) || 0),
      0,
    );
  }

  private loadCostSummary(loadToken: number): void {
    if (!this.projectDetails?.jobId) return;

    this.reportService
      .getDetailedCostSummary(this.projectDetails.jobId)
      .then((summary) => {
        if (loadToken !== this.currentLoadToken) {
          return;
        }
        this.totalProjectCost = Number(summary?.suggestedBid || 0);
        this.summaryLoaded = true;
        this.isLoadingSummary = false;
        this.updateBudgetViewReadyState(loadToken);
      })
      .catch((err) => {
        if (loadToken !== this.currentLoadToken) {
          return;
        }
        console.error('Failed to load detailed cost summary for budget tracking', err);
        this.totalProjectCost = 0;
        this.summaryLoaded = true;
        this.isLoadingSummary = false;
        this.updateBudgetViewReadyState(loadToken);
      });
  }

  // Budget Calculations
  get totalEstimated(): number {
    return this.budgetItems.reduce((sum, item) => sum + item.estimatedCost, 0);
  }

  get totalActual(): number {
    return this.budgetItems.reduce((sum, item) => sum + item.actualCost, 0);
  }

  get totalForecast(): number {
    return this.budgetItems.reduce(
      (sum, item) => sum + (item.forecastToComplete ?? item.estimatedCost),
      0,
    );
  }

  get variance(): number {
    return this.totalEstimated - this.totalForecast;
  }

  get variancePercent(): string {
    return this.totalEstimated > 0
      ? ((this.variance / this.totalEstimated) * 100).toFixed(1)
      : '0.0';
  }

  get displayTotalBudget(): number {
    return this.totalProjectCost > 0 ? this.totalProjectCost : this.totalEstimated;
  }

  get budgetVariance(): number {
    return this.displayTotalBudget - this.totalForecast;
  }

  get budgetVariancePercent(): string {
    return this.displayTotalBudget > 0
      ? ((this.budgetVariance / this.displayTotalBudget) * 100).toFixed(1)
      : '0.0';
  }

  get cpi(): string {
    return this.totalForecast > 0
      ? (this.totalEstimated / this.totalForecast).toFixed(2)
      : '1.00';
  }

  get procurementCommitments(): number {
    return this.budgetItems
      .filter((item) => item.category === 'Materials')
      .reduce((sum, item) => sum + item.estimatedCost, 0);
  }

  get filteredBudgetItems(): BudgetLineItem[] {
    if (this.budgetTableTab === 'all') {
      return this.budgetItems;
    }
    if (this.budgetTableTab === 'Subcontractor') {
      return this.budgetItems.filter(
        (item) =>
          item.category === 'Subcontractor' || item.category === 'Labor',
      );
    }
    return this.budgetItems.filter(
      (item) => item.category === this.budgetTableTab,
    );
  }

  get subcontractorSummary(): BudgetLineItem[] {
    return this.budgetItems
      .filter((item) => item.category === 'Subcontractor')
      .sort((a, b) => b.actualCost - a.actualCost)
      .slice(0, 5);
  }

  get costByPhase(): { name: string; value: number }[] {
    const phaseMap = new Map<string, number>();
    this.budgetItems.forEach((item) => {
      const phase = item.phase || 'Unassigned';
      const current = phaseMap.get(phase) || 0;
      phaseMap.set(phase, current + (item.estimatedCost || 0));
    });

    return Array.from(phaseMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }

  get currentDivisionStats() {
    let items = this.budgetItems;
    let name = 'All Divisions';
    let total = this.displayTotalBudget;

    if (this.selectedDivision !== 'all' && this.selectedDivision) {
      items = this.budgetItems.filter((i) => i.phase === this.selectedDivision);
      name = this.selectedDivision;
      total = items.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
    }

    if (total === 0) {
      return {
        name,
        amount: 0,
        pct: '0%',
        materials: 0,
        labor: 0,
      };
    }

    const materials = items
      .filter((i) => i.category === 'Materials')
      .reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
    const labor = items
      .filter((i) => i.category === 'Subcontractor' || i.category === 'Labor')
      .reduce((sum, i) => sum + (i.estimatedCost || 0), 0);

    return {
      name,
      amount: total,
      pct:
        this.displayTotalBudget > 0
          ? Math.round((total / this.displayTotalBudget) * 100) + '%'
          : '0%',
      materials: Math.round((materials / total) * 100),
      labor: Math.round((labor / total) * 100),
      materialAmount: materials,
      laborAmount: labor,
    };
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

  getStatusColor(estimated: number, forecast: number | undefined): string {
    const f = forecast ?? estimated;
    const diff = estimated > 0 ? ((f - estimated) / estimated) * 100 : 0;
    if (diff <= 0) return 'text-green';
    if (diff <= 5) return 'text-yellow';
    return 'text-red';
  }

  getStatusIcon(estimated: number, forecast: number | undefined): string {
    const f = forecast ?? estimated;
    const diff = estimated > 0 ? ((f - estimated) / estimated) * 100 : 0;
    if (diff <= 0) return 'check_circle';
    if (diff <= 5) return 'error_outline';
    return 'error';
  }

  setBudgetTableTab(tab: any): void {
    this.budgetTableTab = tab;
    this.cancelAddLineItem();
    this.cancelEditLineItem();
  }

  loadBudget(loadToken: number): void {
    if (!this.projectDetails?.jobId) return;

    const storageKey = `budget_${this.projectDetails.jobId}`;
    if (this.isBrowser) {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          this.budgetItems = JSON.parse(cached);
        } catch (e) {
          // silent fail
        }
      }
    }

    this.budgetService.getBudget(this.projectDetails.jobId).subscribe({
      next: (items) => {
        if (loadToken !== this.currentLoadToken) {
          return;
        }
        this.budgetItems = items;
        if (this.isBrowser) {
          localStorage.setItem(storageKey, JSON.stringify(this.budgetItems));
        }
        this.isLoadingBudget = false;
        this.budgetLoaded = true;
        this.updateBudgetViewReadyState(loadToken);
        this.checkAndAutoImportAiEstimates();
      },
      error: (err) => {
        if (loadToken !== this.currentLoadToken) {
          return;
        }
        console.error('Error loading budget', err);
        this.isLoadingBudget = false;
        this.budgetLoaded = true;
        this.updateBudgetViewReadyState(loadToken);
        this.snackBar.open('Failed to load budget.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  private updateBudgetViewReadyState(loadToken: number): void {
    if (loadToken !== this.currentLoadToken) {
      return;
    }

    this.isBudgetViewReady = this.budgetLoaded && this.summaryLoaded;
  }

  private checkAndAutoImportAiEstimates(): void {
    const hasAiItems = this.budgetItems.some((item) => item.source === 'AI');
    if (!hasAiItems) {
      this.isAutoImporting = true;
      this.processAiImport();
    }
  }

  private processAiImport(): void {
    if (!this.processingResults || this.processingResults.length === 0) {
      this.isLoadingBudget = true;
      this.bomService
        .getBillOfMaterials(this.projectDetails.jobId)
        .subscribe((results) => {
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
        let phase = section.title
          .replace(
            / - (Bill of Materials|Subcontractor Cost Breakdown|Cost Breakdown)/i,
            '',
          )
          .trim();

        if (section.title.toLowerCase().includes('material'))
          category = 'Materials';
        else if (
          section.title.toLowerCase().includes('labor') ||
          section.title.toLowerCase().includes('subcontractor')
        )
          category = 'Subcontractor';

        if (
          (section.title.toLowerCase().includes('total') &&
            section.title.toLowerCase().includes('breakdown')) ||
          section.title.toLowerCase().includes('project cost breakdown') ||
          section.title.toLowerCase().includes('project cost summary') ||
          section.title.toLowerCase().includes('summary of costs')
        ) {
          return;
        }

        if (section.type === 'table' && section.content) {
          const getIndex = (headers: string[], ...names: string[]) =>
            headers.findIndex((h) =>
              names.some((n) => h.toLowerCase().includes(n.toLowerCase())),
            );

          const headers = section.headers || [];

          const itemIdx = getIndex(headers, 'Item', 'Task', 'Description');
          const tradeIdx = getIndex(headers, 'Trade');
          const qtyIdx = getIndex(headers, 'Quantity', 'Qty', 'Hours');
          const unitIdx = getIndex(headers, 'Unit');
          const specIdx = getIndex(headers, 'Specification', 'Spec', 'Model');
          const detailIdx = getIndex(
            headers,
            'Size/Detail',
            'Detail',
            'Size',
            'Dimensions',
          );

          const costIdx = getIndex(
            headers,
            'Total Cost',
            'Total Estimated Cost',
            'Est. Cost',
            'Total Price',
          );
          const unitCostIdx = getIndex(
            headers,
            'Unit Cost',
            'Rate',
            'Hourly Rate',
          );

          section.content.forEach((row: any[]) => {
            let item =
              itemIdx > -1
                ? row[itemIdx]
                : tradeIdx > -1
                  ? row[tradeIdx]
                  : 'Unknown Item';
            const trade = tradeIdx > -1 ? row[tradeIdx] : phase;

            if (
              item.toLowerCase().includes('total') ||
              item.toLowerCase().includes('subtotal') ||
              item.toLowerCase().includes('overhead') ||
              item.toLowerCase().includes('contingency') ||
              item.toLowerCase().includes('escalation') ||
              item.toLowerCase().includes('calculated gc bid')
            ) {
              return;
            }

            if (specIdx > -1 && row[specIdx]) {
              item += ` - ${row[specIdx]}`;
            }

            let notes = 'Imported from AI Analysis';
            if (detailIdx > -1 && row[detailIdx]) {
              notes = `${row[detailIdx]}; ${notes}`;
            }

            let cost = 0;
            let qty = 0;
            let unitCost = 0;

            if (qtyIdx > -1) {
              const qStr = row[qtyIdx]?.toString() || '';
              qty = parseFloat(qStr.replace(/[^0-9.-]+/g, '')) || 0;
            }

            if (unitCostIdx > -1) {
              const ucStr = row[unitCostIdx]?.toString() || '';
              unitCost = parseFloat(ucStr.replace(/[^0-9.-]+/g, '')) || 0;
            }

            if (costIdx > -1) {
              const cStr = row[costIdx]?.toString() || '';
              cost = parseFloat(cStr.replace(/[^0-9.-]+/g, '')) || 0;
            }

            const calculatedCost = qty * unitCost;
            if (calculatedCost > 0) {
              if (
                cost === 0 ||
                Math.abs(cost - calculatedCost) > calculatedCost * 0.1
              ) {
                cost = calculatedCost;
              }
            } else if (cost === 0 && costIdx === -1) {
              const lastVal = row[row.length - 1]?.toString() || '';
              if (lastVal.includes('.') || lastVal.includes('$')) {
                cost = parseFloat(lastVal.replace(/[^0-9.-]+/g, '')) || 0;
              }
            }

            const unit =
              unitIdx > -1
                ? row[unitIdx]
                : category === 'Labor'
                  ? 'Hours'
                  : 'ea';

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
                notes: notes,
                source: 'AI',
                id: 0,
              } as BudgetLineItem);
            }
          });
        }
      });
    }

    if (newItems.length === 0) {
      this.isLoadingBudget = false;
      if (!this.isAutoImporting) {
        this.snackBar.open('No estimable items found in AI report.', 'Close', {
          duration: 3000,
        });
      }
      this.isAutoImporting = false;
      return;
    }

    const existingAiItems = this.budgetItems.filter((i) => i.source === 'AI');
    if (existingAiItems.length > 0) {
      this.isLoadingBudget = false;
      this.isAutoImporting = false;
      return;
    }

    this.budgetService.addBudgetItemsBatch(newItems).subscribe({
      next: (savedItems) => {
        this.budgetItems = [...this.budgetItems, ...savedItems];
        this.isLoadingBudget = false;
        if (!this.isAutoImporting) {
          this.snackBar.open(
            `Successfully imported ${savedItems.length} items from AI.`,
            'Close',
            { duration: 3000 },
          );
        }
        this.isAutoImporting = false;
      },
      error: (err) => {
        console.error('Batch import failed', err);
        this.isLoadingBudget = false;
        if (!this.isAutoImporting) {
          this.snackBar.open('Failed to import items.', 'Close', {
            duration: 3000,
          });
        }
        this.isAutoImporting = false;
      },
    });
  }

  startAddLineItem(): void {
    this.isAddingLineItem = true;
    this.newBudgetItem = {
      jobId: Number(this.projectDetails.jobId),
      item: '',
      trade: '',
      category: this.budgetTableTab === 'all' ? 'Labor' : this.budgetTableTab,
      estimatedCost: 0,
      actualCost: 0,
      forecastToComplete: 0,
      percentComplete: 0,
      notes: '',
      status: 'Pending',
      source: 'Manual',
    };
  }

  cancelAddLineItem(): void {
    this.isAddingLineItem = false;
    this.newBudgetItem = {};
  }

  recalculateEstimatedCost(item: Partial<BudgetLineItem>): void {
    if (
      (item.quantity || item.quantity === 0) &&
      (item.unitCost || item.unitCost === 0)
    ) {
      item.estimatedCost = item.quantity * item.unitCost;
      if (
        item.forecastToComplete === undefined ||
        item.forecastToComplete === 0
      ) {
        item.forecastToComplete = item.estimatedCost;
      }
    }
  }

  saveNewLineItem(): void {
    if (!this.newBudgetItem.item || !this.newBudgetItem.trade) {
      this.snackBar.open('Please fill in Item and Trade fields.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const itemToSave: BudgetLineItem = {
      ...this.newBudgetItem,
      estimatedCost: this.newBudgetItem.estimatedCost || 0,
      actualCost: this.newBudgetItem.actualCost || 0,
      forecastToComplete:
        this.newBudgetItem.forecastToComplete ??
        this.newBudgetItem.estimatedCost ??
        0,
      percentComplete: this.newBudgetItem.percentComplete || 0,
      jobId: Number(this.projectDetails.jobId),
    } as BudgetLineItem;

    this.isLoadingBudget = true;
    this.budgetService.addBudgetItem(itemToSave).subscribe({
      next: (newItem) => {
        this.budgetItems = [...this.budgetItems, newItem];
        this.isLoadingBudget = false;
        this.isAddingLineItem = false;
        this.newBudgetItem = {};
        this.snackBar.open('Line item added successfully.', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        console.error('Error adding budget item', err);
        this.isLoadingBudget = false;
        this.snackBar.open('Failed to add line item.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  startEditLineItem(item: BudgetLineItem): void {
    this.editingItemId = item.id;
    this.editingItem = { ...item };
  }

  cancelEditLineItem(): void {
    this.editingItemId = null;
    this.editingItem = null;
  }

  saveEditLineItem(): void {
    if (!this.editingItem) return;

    this.isLoadingBudget = true;
    this.budgetService
      .updateBudgetItem(this.editingItem.id, this.editingItem)
      .subscribe({
        next: (updatedItem) => {
          const index = this.budgetItems.findIndex(
            (i) => i.id === updatedItem.id,
          );
          if (index !== -1) {
            this.budgetItems[index] = updatedItem;
          }
          this.isLoadingBudget = false;
          this.editingItemId = null;
          this.editingItem = null;
          this.snackBar.open('Line item updated successfully.', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          console.error('Error updating budget item', err);
          this.isLoadingBudget = false;
          this.snackBar.open('Failed to update line item.', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  deleteLineItem(item: BudgetLineItem): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Line Item',
        message: `Are you sure you want to delete "${item.item}"?`,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.isLoadingBudget = true;
        this.budgetService.deleteBudgetItem(item.id).subscribe({
          next: () => {
            this.budgetItems = this.budgetItems.filter((i) => i.id !== item.id);
            this.isLoadingBudget = false;
            this.snackBar.open('Line item deleted.', 'Close', {
              duration: 3000,
            });
          },
          error: (err) => {
            console.error('Error deleting budget item', err);
            this.isLoadingBudget = false;
            this.snackBar.open('Failed to delete line item.', 'Close', {
              duration: 3000,
            });
          },
        });
      }
    });
  }
}
