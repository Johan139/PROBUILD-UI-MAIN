import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';

export type PhaseReportRequestType =
  | 'fullReport'
  | 'billOfMaterials'
  | 'executiveSummary'
  | 'environmentalReport'
  | 'procurementSchedule'
  | 'dailyConstructionPlan';

@Component({
  selector: 'app-phase-navigation-header',
  standalone: true,
  imports: [CommonModule, LucideIconsModule],
  templateUrl: './phase-navigation-header.component.html',
  styleUrl: './phase-navigation-header.component.scss',
})
export class PhaseNavigationHeaderComponent {
  @Input() stageLabel = 'Preliminary Scope Review';
  @Input() backLabel = 'Back';
  @Input() discardLabel = 'Discard Project';
  @Input() exportLabel = 'Export Reports';
  @Input() proceedLabel = 'Proceed';
  @Input() projectName = 'N/A';
  @Input() clientName = 'N/A';
  @Input() projectAddress = 'N/A';
  @Input() projectSizeSqFt = 'N/A';
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;
  @Input() proceedDisabled = false;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();

  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();

  showExportMenu = false;

  get showDevProceedButton(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.location.href.startsWith('http://localhost:4200/');
  }

  forceProceed(): void {
    this.proceed.emit();
  }

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  closeExportMenu(): void {
    this.showExportMenu = false;
  }

  requestDocuments(): void {
    this.showExportMenu = false;
    this.documentsRequested.emit();
  }

  request(reportType: PhaseReportRequestType): void {
    this.showExportMenu = false;
    this.reportRequested.emit(reportType);
  }
}

