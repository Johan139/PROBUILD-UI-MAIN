import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, TemplateRef } from '@angular/core';
import {
  PhaseNavigationHeaderComponent,
  PhaseReportRequestType,
} from '../shared/phase-navigation-header.component';
import { BomService } from '../../../services/bom.service';
import { ReportService } from '../../../services/report.service';
import { BudgetService } from '../../../services/budget.service';
import { BudgetLineItem } from '../../../../../models/budget-line-item.model';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { JobsService } from '../../../../../services/jobs.service';
import { QuoteService } from '../../../../../features/quote/quote.service';
import { AuthService } from '../../../../../authentication/auth.service';
import { LocalStorageService } from '../../../../../services/local-storage.service';
import { QuoteDto, QuoteRowDto } from '../../../../../features/quote/quote.model';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';

interface BomMaterialRow {
  item: string;
  spec: string;
  unit: string;
  qty: string | number;
  unitCost: string | number;
  total: number;
}

interface BomLaborRow {
  trade: string;
  scope: string;
  hours: string | number;
  rate: string | number;
  total: number;
}

interface BomSection {
  key: string;
  name: string;
  summary: string;
  totalMaterialCost: number;
  totalLaborCost: number;
  confidence: number;
  materials: BomMaterialRow[];
  labor: BomLaborRow[];
}

@Component({
  selector: 'app-phase-detailed-takeoff',
  standalone: true,
  imports: [CommonModule, PhaseNavigationHeaderComponent, LucideIconsModule],
  templateUrl: './phase-detailed-takeoff.component.html',
  styleUrl: './phase-detailed-takeoff.component.scss',
})
export class PhaseDetailedTakeoffComponent implements OnInit {
  @Input() projectDetails: any;
  @Input() liveStageTemplate: TemplateRef<any> | null = null;
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();

  billsOfMaterials: Record<string, BomSection> = {};
  expandedBomSections: string[] = [];
  confirmedBomSections = new Set<string>();
  valueEngineering: any[] = [];

  isLoading = true;
  activeTab: 'estimation' | 'overview' | 'timeline' | 'blueprints' = 'estimation';

  veOpen = true;
  appliedVE = new Set<string>();
  expandedVE: string | number | null = null;
  veSavingIds = new Set<string>();
  persistedVeBudgetItemIds = new Map<string, number>();
  persistedBomBudgetItemIds = new Map<string, number>();
  persistedBomConfirmationItemIds = new Map<string, number>();

  quoteGenerated = false;
  generatedQuoteId: string | null = null;
  generatedQuote: QuoteDto | null = null;
  isSending = false;
  isGeneratingQuote = false;

  costAnalysis: any = null;
  editingCell:
    | {
        key: string;
        rowType: 'materials' | 'labor';
        rowIndex: number;
        field: 'qty' | 'unitCost' | 'hours' | 'rate';
      }
    | null = null;
  editBuffer = '';

  constructor(
    private bomService: BomService,
    private reportService: ReportService,
    private budgetService: BudgetService,
    private dialog: MatDialog,
    private jobsService: JobsService,
    private quoteService: QuoteService,
    private authService: AuthService,
    private localStorageService: LocalStorageService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    if (!this.projectDetails?.jobId) {
      this.isLoading = false;
      return;
    }

    this.loadData(this.projectDetails.jobId);
  }

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize || '2,450';
  }

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '228';
    }

    return Math.round(numeric * 0.0929).toLocaleString();
  }

  get bomKeys(): string[] {
    return Object.keys(this.billsOfMaterials);
  }

  get allPhasesConfirmed(): boolean {
    return this.bomKeys.length > 0 && this.confirmedBomSections.size === this.bomKeys.length;
  }

  get directCosts(): number {
    const fromDirectSubtotal = Number(this.costAnalysis?.directSubtotal || 0);
    if (fromDirectSubtotal > 0) {
      return fromDirectSubtotal;
    }

    const fromAnalysis =
      (Number(this.costAnalysis?.materialCost) || 0) + (Number(this.costAnalysis?.laborCost) || 0);

    if (fromAnalysis > 0) {
      return fromAnalysis;
    }

    return this.bomKeys.reduce((sum, key) => {
      const section = this.billsOfMaterials[key];
      return sum + section.totalMaterialCost + section.totalLaborCost;
    }, 0);
  }

  get totalVeSavings(): number {
    return this.valueEngineering
      .filter((ve) => this.appliedVE.has(String(ve.id)))
      .reduce((sum, ve) => sum + this.asNumber(ve.savings), 0);
  }

  get adjustedEstimateTotal(): number {
    return this.directCosts - this.totalVeSavings;
  }

  get projectBudget(): number {
    const suggestedBid = Number(this.costAnalysis?.suggestedBid || 0);
    if (suggestedBid > 0) {
      return suggestedBid;
    }

    const fromProject = Number(this.projectDetails?.budget || this.projectDetails?.projectBudget || 0);
    if (fromProject > 0) {
      return fromProject;
    }

    return this.adjustedEstimateTotal * 1.2;
  }

  get recommendedBid(): number {
    const marketBid = Number(this.costAnalysis?.suggestedMarketBid || 0);
    if (marketBid > 0 || this.projectBudget > 0) {
      return Math.max(this.projectBudget, marketBid);
    }

    return this.adjustedEstimateTotal * 1.32;
  }

  get confirmedProgressPercent(): number {
    if (this.bomKeys.length === 0) {
      return 0;
    }
    return (this.confirmedBomSections.size / this.bomKeys.length) * 100;
  }

  get canProceed(): boolean {
    return this.allPhasesConfirmed;
  }

  setActiveTab(tab: 'estimation' | 'overview' | 'timeline' | 'blueprints'): void {
    this.activeTab = tab;
  }

  objectKeys(value: Record<string, unknown>): string[] {
    return Object.keys(value || {});
  }

  loadData(jobId: string): void {
    this.isLoading = true;
    this.checkExistingQuote(jobId);

    Promise.all([
      firstValueFrom(this.bomService.getBillOfMaterials(jobId)),
      this.reportService.getDetailedCostSummary(jobId),
      this.reportService.getValueEngineeringReport(jobId),
      firstValueFrom(this.budgetService.getBudget(Number(jobId))),
    ])
      .then(([boms, costSummary, veReport, budgetItems]) => {
        const persistedBudgetItems = Array.isArray(budgetItems) ? budgetItems : [];
        this.costAnalysis = costSummary || null;
        this.valueEngineering = Array.isArray(veReport) ? veReport : [];
        this.hydratePersistedVeSelections(persistedBudgetItems);

        if (Array.isArray(boms) && boms.length > 0 && boms[0].parsedReport) {
          this.processBoms(boms[0].parsedReport);
          this.hydratePersistedBomEdits(persistedBudgetItems);
          this.hydratePersistedBomConfirmations(persistedBudgetItems);
        }
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  processBoms(report: any): void {
    const next: Record<string, BomSection> = {};
    (report?.sections || []).forEach((section: any) => {
      if (section.title && section.title.includes('Bill of Materials')) {
        const key = section.title.split(' - ')[0].replace(/\s+/g, '').toLowerCase();
        let totalMat = 0;

        const materials = (section.content || [])
          .filter(
            (row: any[]) =>
              row[0] && !String(row[0]).toLowerCase().includes('total') && row.length > 1,
          )
          .map((row: any[]) => {
            const cost = this.asNumber(row[5]);
            totalMat += cost;
            return {
              item: row[0],
              spec: row[1],
              unit: row[2],
              qty: row[3],
              unitCost: String(row[4] ?? '').replace('$', ''),
              total: cost,
            } as BomMaterialRow;
          });

        if (!next[key]) {
          next[key] = {
            key,
            name: section.title.replace(' - Bill of Materials', ''),
            summary: 'Materials Breakdown',
            totalMaterialCost: totalMat,
            totalLaborCost: 0,
            confidence: 90,
            materials,
            labor: [],
          };
        } else {
          next[key].materials = materials;
          next[key].totalMaterialCost = totalMat;
        }
      } else if (section.title && section.title.includes('Subcontractor Cost Breakdown')) {
        const key = section.title.split(' - ')[0].replace(/\s+/g, '').toLowerCase();
        let totalLab = 0;

        const labor = (section.content || [])
          .filter(
            (row: any[]) =>
              row[0] && !String(row[0]).toLowerCase().includes('total') && row.length > 1,
          )
          .map((row: any[]) => {
            const cost = this.asNumber(row[4]);
            totalLab += cost;
            return {
              trade: row[0],
              scope: row[1],
              hours: row[2],
              rate: String(row[3] ?? '').replace('$', ''),
              total: cost,
            } as BomLaborRow;
          });

        if (!next[key]) {
          next[key] = {
            key,
            name: section.title.replace(' - Subcontractor Cost Breakdown', ''),
            summary: 'Labor Breakdown',
            totalMaterialCost: 0,
            totalLaborCost: totalLab,
            confidence: 90,
            materials: [],
            labor,
          };
        } else {
          next[key].labor = labor;
          next[key].totalLaborCost = totalLab;
        }
      }
    });

    this.billsOfMaterials = next;
  }

  toggleBomSection(key: string): void {
    if (this.expandedBomSections.includes(key)) {
      this.expandedBomSections = this.expandedBomSections.filter((k) => k !== key);
    } else {
      this.expandedBomSections = [...this.expandedBomSections, key];
    }
  }

  expandAll(): void {
    this.expandedBomSections = [...this.bomKeys];
  }

  collapseAll(): void {
    this.expandedBomSections = [];
  }

  toggleSectionConfirm(key: string): void {
    const next = new Set(this.confirmedBomSections);
    if (next.has(key)) {
      next.delete(key);
      this.removeBomConfirmation(key);
    } else {
      next.add(key);
      this.persistBomConfirmation(key);
      this.advanceToNextBomSection(key);
    }
    this.confirmedBomSections = next;
  }

  private advanceToNextBomSection(currentKey: string): void {
    const keys = this.bomKeys;
    const currentIndex = keys.indexOf(currentKey);
    if (currentIndex < 0) {
      return;
    }

    const nextKey = keys[currentIndex + 1];
    this.expandedBomSections = nextKey ? [nextKey] : [];

    if (!nextKey) {
      return;
    }

    setTimeout(() => {
      const element = document.querySelector(`[data-bom-key="${nextKey}"]`) as HTMLElement | null;
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  confirmAllPhases(): void {
    if (!this.bomKeys.length) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '420px',
      data: {
        title: 'Confirm all BOM phases?',
        message:
          'This will mark every BOM card as reviewed and confirmed. You can still remove individual confirmations afterwards.',
        confirmButtonText: 'Confirm All',
        cancelButtonText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.confirmedBomSections = new Set(this.bomKeys);
        this.bomKeys.forEach((key) => this.persistBomConfirmation(key));
      }
    });
  }

  startCellEdit(
    key: string,
    rowType: 'materials' | 'labor',
    rowIndex: number,
    field: 'qty' | 'unitCost' | 'hours' | 'rate',
    currentValue: string | number,
  ): void {
    this.editingCell = { key, rowType, rowIndex, field };
    this.editBuffer = String(currentValue ?? '');
  }

  commitCellEdit(): void {
    if (!this.editingCell) {
      return;
    }

    const { key, rowType, rowIndex, field } = this.editingCell;
    const section = this.billsOfMaterials[key];
    if (!section) {
      this.cancelCellEdit();
      return;
    }

    const numericValue = this.asNumber(this.editBuffer);
    if (rowType === 'materials') {
      const row = section.materials[rowIndex];
      if (!row) {
        this.cancelCellEdit();
        return;
      }

      if (field === 'qty' || field === 'unitCost') {
        row[field] = numericValue;
        row.total = this.asNumber(row.qty) * this.asNumber(row.unitCost);
      }
    } else {
      const row = section.labor[rowIndex];
      if (!row) {
        this.cancelCellEdit();
        return;
      }

      if (field === 'hours' || field === 'rate') {
        row[field] = numericValue;
        row.total = this.asNumber(row.hours) * this.asNumber(row.rate);
      }
    }

    this.recalculateSectionTotals(section);
    this.persistBomRowEdit(key, rowType, rowIndex);
    this.cancelCellEdit();
  }

  handleEditKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitCellEdit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelCellEdit();
    }
  }

  isEditingCell(
    key: string,
    rowType: 'materials' | 'labor',
    rowIndex: number,
    field: 'qty' | 'unitCost' | 'hours' | 'rate',
  ): boolean {
    return !!this.editingCell &&
      this.editingCell.key === key &&
      this.editingCell.rowType === rowType &&
      this.editingCell.rowIndex === rowIndex &&
      this.editingCell.field === field;
  }

  private cancelCellEdit(): void {
    this.editingCell = null;
    this.editBuffer = '';
  }

  private recalculateSectionTotals(section: BomSection): void {
    section.totalMaterialCost = section.materials.reduce((sum, item) => sum + this.asNumber(item.total), 0);
    section.totalLaborCost = section.labor.reduce((sum, item) => sum + this.asNumber(item.total), 0);
  }

  toggleVeOpen(): void {
    this.veOpen = !this.veOpen;
  }

  isVeApplied(veId: string | number): boolean {
    return this.appliedVE.has(String(veId));
  }

  isVeSaving(veId: string | number): boolean {
    return this.veSavingIds.has(String(veId));
  }

  stripMarkdown(value: unknown): string {
    return String(value ?? '')
      .replace(/[*_`~>#]/g, '')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getVeOriginalCost(ve: any): number {
    const direct = this.asNumber(ve?.originalCost ?? ve?.baselineCost ?? ve?.currentCost);
    if (direct > 0) {
      return direct;
    }
    return this.extractCurrencyFromText(ve?.original);
  }

  getVeAlternativeCost(ve: any): number {
    const direct = this.asNumber(ve?.alternativeCost ?? ve?.proposedCost ?? ve?.newCost);
    if (direct > 0) {
      return direct;
    }

    const original = this.getVeOriginalCost(ve);
    const savings = this.asNumber(ve?.savings);
    if (original > 0 && savings > 0) {
      return Math.max(original - savings, 0);
    }

    return this.extractCurrencyFromText(ve?.proposed);
  }

  getVeSavings(ve: any): number {
    const direct = this.asNumber(ve?.savings);
    if (direct > 0) {
      return direct;
    }

    const original = this.getVeOriginalCost(ve);
    const alternative = this.getVeAlternativeCost(ve);
    if (original > 0 && alternative > 0) {
      return Math.max(original - alternative, 0);
    }

    return 0;
  }

  toggleVeExpanded(veId: string | number): void {
    this.expandedVE = this.expandedVE === veId ? null : veId;
  }

  applyOrRemoveVe(veId: string | number): void {
    const id = String(veId);
    if (this.veSavingIds.has(id)) {
      return;
    }

    const persistedBudgetItemId = this.persistedVeBudgetItemIds.get(id);

    if (this.appliedVE.has(id)) {
      if (!persistedBudgetItemId) {
        const next = new Set(this.appliedVE);
        next.delete(id);
        this.appliedVE = next;
        return;
      }

      this.setVeSaving(id, true);
      this.budgetService.deleteBudgetItem(persistedBudgetItemId).subscribe({
        next: () => {
          const next = new Set(this.appliedVE);
          next.delete(id);
          this.appliedVE = next;
          this.persistedVeBudgetItemIds.delete(id);
          this.setVeSaving(id, false);
        },
        error: (err) => {
          console.error('Failed to remove VE selection persistence', err);
          this.setVeSaving(id, false);
        },
      });
      return;
    }

    const jobId = Number(this.projectDetails?.jobId);
    const ve = this.valueEngineering.find((item) => String(item?.id) === id);
    if (!ve || Number.isNaN(jobId)) {
      const next = new Set(this.appliedVE);
      next.add(id);
      this.appliedVE = next;
      return;
    }

    this.setVeSaving(id, true);
    this.budgetService.addBudgetItem(this.toVeBudgetItem(ve, jobId)).subscribe({
      next: (saved) => {
        const next = new Set(this.appliedVE);
        next.add(id);
        this.appliedVE = next;
        this.persistedVeBudgetItemIds.set(id, saved.id);
        this.setVeSaving(id, false);
      },
      error: (err) => {
        console.error('Failed to persist VE selection', err);
        this.setVeSaving(id, false);
      },
    });
  }

  private hydratePersistedVeSelections(items: BudgetLineItem[]): void {
    const veItems = items.filter((item) => String(item.source || '').toUpperCase() === 'VE');

    this.appliedVE = new Set(
      veItems
        .map((item) => String(item.sourceId || '').trim())
        .filter((id) => id.length > 0),
    );

    this.persistedVeBudgetItemIds = new Map(
      veItems
        .map((item) => [String(item.sourceId || '').trim(), item.id] as const)
        .filter(([id]) => id.length > 0),
    );
  }

  private hydratePersistedBomEdits(items: BudgetLineItem[]): void {
    this.persistedBomBudgetItemIds = new Map();
    const touchedSections = new Set<string>();

    items
      .filter((item) => String(item.source || '').toUpperCase() === 'BOM')
      .forEach((item) => {
        const sourceId = String(item.sourceId || '').trim();
        const parsed = this.parseBomSourceId(sourceId);
        if (!parsed) {
          return;
        }

        const { key, rowType, rowIndex } = parsed;
        const section = this.billsOfMaterials[key];
        if (!section) {
          return;
        }

        this.persistedBomBudgetItemIds.set(sourceId, item.id);

        if (rowType === 'materials') {
          const row = section.materials[rowIndex];
          if (!row) {
            return;
          }
          if (item.quantity != null) {
            row.qty = Number(item.quantity);
          }
          if (item.unitCost != null) {
            row.unitCost = Number(item.unitCost);
          }
          row.total =
            item.estimatedCost != null
              ? Number(item.estimatedCost)
              : this.asNumber(row.qty) * this.asNumber(row.unitCost);
        } else {
          const row = section.labor[rowIndex];
          if (!row) {
            return;
          }
          if (item.quantity != null) {
            row.hours = Number(item.quantity);
          }
          if (item.unitCost != null) {
            row.rate = Number(item.unitCost);
          }
          row.total =
            item.estimatedCost != null
              ? Number(item.estimatedCost)
              : this.asNumber(row.hours) * this.asNumber(row.rate);
        }

        touchedSections.add(key);
      });

    touchedSections.forEach((key) => {
      const section = this.billsOfMaterials[key];
      if (section) {
        this.recalculateSectionTotals(section);
      }
    });
  }

  private hydratePersistedBomConfirmations(items: BudgetLineItem[]): void {
    const confirmations = items.filter(
      (item) => String(item.source || '').toUpperCase() === 'BOM_CONFIRM',
    );

    this.persistedBomConfirmationItemIds = new Map();
    const confirmedKeys = new Set<string>();

    confirmations.forEach((item) => {
      const sourceId = String(item.sourceId || '').trim();
      if (!sourceId.startsWith('BOM_CONFIRM:')) {
        return;
      }

      const key = sourceId.replace('BOM_CONFIRM:', '');
      if (!key || !this.billsOfMaterials[key]) {
        return;
      }

      confirmedKeys.add(key);
      this.persistedBomConfirmationItemIds.set(key, item.id);
    });

    this.confirmedBomSections = confirmedKeys;
  }

  private persistBomConfirmation(key: string): void {
    const existingId = this.persistedBomConfirmationItemIds.get(key);
    if (existingId) {
      return;
    }

    const jobId = Number(this.projectDetails?.jobId);
    const section = this.billsOfMaterials[key];
    if (Number.isNaN(jobId) || !section) {
      return;
    }

    this.budgetService
      .addBudgetItem({
        id: 0,
        jobId,
        category: 'BOM Confirmation',
        item: `${section.name} - Confirmed`,
        phase: section.name,
        trade: section.name,
        quantity: 1,
        unit: 'ea',
        unitCost: 0,
        estimatedCost: 0,
        actualCost: 0,
        percentComplete: 100,
        status: 'Confirmed',
        notes: 'Phase confirmation acknowledged by user',
        source: 'BOM_CONFIRM',
        sourceId: `BOM_CONFIRM:${key}`,
        forecastToComplete: 0,
      })
      .subscribe({
        next: (saved) => {
          this.persistedBomConfirmationItemIds.set(key, saved.id);
        },
        error: (err) => {
          console.error('Failed to persist BOM phase confirmation', err);
        },
      });
  }

  private removeBomConfirmation(key: string): void {
    const existingId = this.persistedBomConfirmationItemIds.get(key);
    if (!existingId) {
      return;
    }

    this.budgetService.deleteBudgetItem(existingId).subscribe({
      next: () => {
        this.persistedBomConfirmationItemIds.delete(key);
      },
      error: (err) => {
        console.error('Failed to remove BOM phase confirmation persistence', err);
      },
    });
  }

  private persistBomRowEdit(
    key: string,
    rowType: 'materials' | 'labor',
    rowIndex: number,
  ): void {
    const jobId = Number(this.projectDetails?.jobId);
    const section = this.billsOfMaterials[key];
    if (!section || Number.isNaN(jobId)) {
      return;
    }

    const sourceId = this.bomSourceId(key, rowType, rowIndex);
    const existingId = this.persistedBomBudgetItemIds.get(sourceId);
    const payload = this.toBomBudgetItem(section, rowType, rowIndex, sourceId, jobId, existingId);
    if (!payload) {
      return;
    }

    if (existingId) {
      this.budgetService.updateBudgetItem(existingId, payload).subscribe({
        next: (saved) => {
          this.persistedBomBudgetItemIds.set(sourceId, saved.id);
        },
        error: (err) => {
          console.error('Failed to update BOM persistence row', err);
        },
      });
      return;
    }

    this.budgetService.addBudgetItem(payload).subscribe({
      next: (saved) => {
        this.persistedBomBudgetItemIds.set(sourceId, saved.id);
      },
      error: (err) => {
        console.error('Failed to add BOM persistence row', err);
      },
    });
  }

  private bomSourceId(
    key: string,
    rowType: 'materials' | 'labor',
    rowIndex: number,
  ): string {
    return `BOM:${key}:${rowType}:${rowIndex}`;
  }

  private parseBomSourceId(
    sourceId: string,
  ): { key: string; rowType: 'materials' | 'labor'; rowIndex: number } | null {
    if (!sourceId.startsWith('BOM:')) {
      return null;
    }

    const parts = sourceId.split(':');
    if (parts.length !== 4) {
      return null;
    }

    const rowType = parts[2] as 'materials' | 'labor';
    const rowIndex = Number(parts[3]);
    if ((rowType !== 'materials' && rowType !== 'labor') || Number.isNaN(rowIndex)) {
      return null;
    }

    return { key: parts[1], rowType, rowIndex };
  }

  private toBomBudgetItem(
    section: BomSection,
    rowType: 'materials' | 'labor',
    rowIndex: number,
    sourceId: string,
    jobId: number,
    existingId?: number,
  ): BudgetLineItem | null {
    if (rowType === 'materials') {
      const row = section.materials[rowIndex];
      if (!row) {
        return null;
      }

      return {
        id: existingId || 0,
        jobId,
        category: 'Material',
        item: String(row.item || 'Material Item'),
        phase: section.name,
        trade: section.name,
        quantity: this.asNumber(row.qty),
        unit: String(row.unit || 'ea'),
        unitCost: this.asNumber(row.unitCost),
        estimatedCost: this.asNumber(row.total),
        actualCost: 0,
        percentComplete: 0,
        status: 'Pending',
        notes: String(row.spec || ''),
        source: 'BOM',
        sourceId,
        forecastToComplete: this.asNumber(row.total),
      };
    }

    const row = section.labor[rowIndex];
    if (!row) {
      return null;
    }

    return {
      id: existingId || 0,
      jobId,
      category: 'Labor',
      item: String(row.scope || row.trade || 'Labor Item'),
      phase: section.name,
      trade: String(row.trade || section.name),
      quantity: this.asNumber(row.hours),
      unit: 'Hours',
      unitCost: this.asNumber(row.rate),
      estimatedCost: this.asNumber(row.total),
      actualCost: 0,
      percentComplete: 0,
      status: 'Pending',
      notes: String(row.scope || ''),
      source: 'BOM',
      sourceId,
      forecastToComplete: this.asNumber(row.total),
    };
  }

  private toVeBudgetItem(ve: any, jobId: number): BudgetLineItem {
    const veId = String(ve?.id || '').trim();
    const savings = this.getVeSavings(ve);
    return {
      id: 0,
      jobId,
      category: 'Value Engineering',
      item: `${veId} - ${this.stripMarkdown(ve?.category || 'VE Option')}`,
      phase: this.stripMarkdown(ve?.category || 'Value Engineering'),
      trade: 'Value Engineering',
      estimatedCost: Math.max(savings, 0),
      actualCost: 0,
      percentComplete: 0,
      status: 'Applied',
      notes: this.stripMarkdown(ve?.analysis || ''),
      source: 'VE',
      sourceId: veId,
      forecastToComplete: 0,
    };
  }

  private setVeSaving(veId: string, saving: boolean): void {
    const next = new Set(this.veSavingIds);
    if (saving) {
      next.add(veId);
    } else {
      next.delete(veId);
    }
    this.veSavingIds = next;
  }

  generateQuotation(): void {
    if (!this.allPhasesConfirmed || this.isGeneratingQuote) {
      return;
    }

    const currentUser = this.authService.currentUserSubject.value;
    const job = this.projectDetails;
    if (!currentUser || !job?.jobId) {
      this.snackBar.open('Missing user/job context. Unable to generate quote.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isGeneratingQuote = true;

    this.jobsService.getClientDetails(Number(job.jobId)).subscribe({
      next: (clientDetails) => this.createQuote(currentUser, job, clientDetails),
      error: () => this.createQuote(currentUser, job, null),
    });
  }

  private createQuote(currentUser: any, job: any, clientDetails: any): void {
    let clientName = job.projectName || 'Client';
    let clientEmail = '';
    let clientPhone = '';

    if (clientDetails) {
      clientName = `${clientDetails.firstName} ${clientDetails.lastName}`.trim();
      if (clientDetails.companyName) {
        clientName += ` (${clientDetails.companyName})`;
      }
      clientEmail = clientDetails.email || '';
      clientPhone = clientDetails.phone || '';
    }

    const totalCost = this.recommendedBid;
    const phaseRows: QuoteRowDto[] = this.bomKeys
      .map((key) => {
        const phase = this.billsOfMaterials[key];
        if (!phase) return null;

        const phaseCost = Number(phase.totalMaterialCost || 0) + Number(phase.totalLaborCost || 0);
        if (phaseCost <= 0) return null;

        return {
          description: `${phase.name || key} Cost`,
          quantity: 1,
          unit: 'LS',
          unitPrice: phaseCost,
          total: phaseCost,
        } as QuoteRowDto;
      })
      .filter((row): row is QuoteRowDto => row !== null);

    const rows: QuoteRowDto[] = [...phaseRows];
    const directSubtotal = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const adjustment = Number((totalCost - directSubtotal).toFixed(2));

    if (Math.abs(adjustment) > 0.01) {
      rows.push({
        description: 'GC Overhead, Contingency & Market Adjustment',
        quantity: 1,
        unit: 'LS',
        unitPrice: adjustment,
        total: adjustment,
      });
    }

    const quoteDto: QuoteDto = {
      quoteId: null,
      jobID: Number(job.jobId),
      companyId: currentUser.companyId || 0,
      number: '',
      documentType: 'QUOTE',
      from: currentUser.companyName || `${currentUser.firstName} ${currentUser.lastName}`,
      to: clientName,
      clientAddress: job.address || '',
      clientEmail,
      clientPhone,
      projectName: job.projectName || '',
      projectAddress: job.address || '',
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Detailed estimating quotation based on confirmed BOM phases.',
      terms: 'Standard terms and conditions apply.',
      total: totalCost,
      createdID: currentUser.id,
      createdBy: currentUser.firstName,
      rows,
      extraCosts: [],
    };

    this.quoteService.saveDraft(quoteDto).subscribe({
      next: (res: any) => {
        this.quoteGenerated = true;
        this.generatedQuoteId = res.quoteId || res.QuoteId;
        this.generatedQuote = { ...quoteDto, quoteId: this.generatedQuoteId };

        if (this.generatedQuoteId) {
          this.localStorageService.setItem('quote_job_' + job.jobId, this.generatedQuoteId);
        }

        this.isGeneratingQuote = false;
        this.snackBar.open('Quotation generated successfully.', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Failed to generate quote', err);
        this.isGeneratingQuote = false;
        this.snackBar.open('Failed to generate quote.', 'Close', { duration: 3000 });
      },
    });
  }

  viewQuote(): void {
    if (!this.generatedQuoteId) {
      return;
    }

    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/quote'], {
        queryParams: { quoteId: this.generatedQuoteId },
      }),
    );
    window.open(url, '_blank');
  }

  sendToClient(): void {
    if (!this.generatedQuote?.clientEmail) {
      this.snackBar.open('Client email is missing. Unable to send quote.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.isSending = true;
    this.quoteService
      .saveAndSend({
        quote: this.generatedQuote,
        send: {
          clientEmail: this.generatedQuote.clientEmail,
          clientName: this.generatedQuote.to,
          attachPdf: true,
        },
      })
      .subscribe({
        next: () => {
          this.isSending = false;
          this.snackBar.open('Quote sent to client successfully.', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Failed to send quote', err);
          this.isSending = false;
          this.snackBar.open('Failed to send quote.', 'Close', { duration: 3000 });
        },
      });
  }

  regenerateQuote(): void {
    const jobId = this.projectDetails?.jobId;
    if (!jobId) {
      return;
    }

    const confirmed = window.confirm(
      'Regenerating will delete the current quote and create a new one. Continue?',
    );
    if (!confirmed) {
      return;
    }

    const existingQuoteId =
      this.generatedQuoteId || this.localStorageService.getItem('quote_job_' + jobId);

    const resetAndGenerate = () => {
      this.quoteGenerated = false;
      this.generatedQuoteId = null;
      this.generatedQuote = null;
      this.localStorageService.removeItem('quote_job_' + jobId);
      this.generateQuotation();
    };

    if (!existingQuoteId) {
      resetAndGenerate();
      return;
    }

    this.isGeneratingQuote = true;
    this.quoteService.deleteQuote(existingQuoteId).subscribe({
      next: () => {
        this.isGeneratingQuote = false;
        resetAndGenerate();
      },
      error: (err) => {
        console.error('Failed to delete quote before regeneration', err);
        this.isGeneratingQuote = false;
        this.snackBar.open('Could not delete existing quote. Regeneration cancelled.', 'Close', {
          duration: 4000,
        });
      },
    });
  }

  startQuoteRevision(): void {
    const jobId = this.projectDetails?.jobId;
    this.quoteGenerated = false;
    this.generatedQuote = null;
    this.generatedQuoteId = null;

    if (jobId) {
      this.localStorageService.removeItem('quote_job_' + jobId);
    }
  }

  private checkExistingQuote(jobId: string): void {
    const existingQuoteId = this.localStorageService.getItem('quote_job_' + jobId);
    if (!existingQuoteId) {
      return;
    }

    this.quoteService.getQuote(existingQuoteId).subscribe({
      next: (quoteView) => {
        this.quoteGenerated = true;
        this.generatedQuoteId = existingQuoteId;
        this.generatedQuote = {
          quoteId: quoteView.quoteId,
          jobID: Number(jobId),
          companyId: 0,
          number: quoteView.number,
          documentType: quoteView.documentType,
          from: quoteView.version.from,
          to: quoteView.version.to,
          clientAddress: quoteView.version.clientAddress,
          clientEmail: quoteView.version.clientEmail,
          clientPhone: quoteView.version.clientPhone,
          projectName: quoteView.version.projectName,
          projectAddress: quoteView.version.projectAddress,
          date: quoteView.version.date,
          dueDate: quoteView.version.dueDate,
          notes: quoteView.version.notes,
          terms: quoteView.version.terms,
          paymentTerms: quoteView.version.paymentTerms,
          total: quoteView.version.total,
          logoId: quoteView.version.logoId,
          createdID: quoteView.createdID,
          createdBy: '',
          rows: quoteView.rows,
          extraCosts: quoteView.extraCosts,
        };
      },
      error: () => {
        this.localStorageService.removeItem('quote_job_' + jobId);
      },
    });
  }

  private asNumber(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    return Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
  }

  private extractCurrencyFromText(value: unknown): number {
    const text = String(value ?? '');
    const match = text.match(/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/);
    return match ? this.asNumber(match[1]) : 0;
  }
}

