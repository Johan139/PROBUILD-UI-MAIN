
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';
import { MatDialog } from '@angular/material/dialog';
import { ValidationDialogComponent } from '../../../../../shared/dialogs/validation-dialog/validation-dialog.component';
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
  imports: [LucideIconsModule],
  templateUrl: './phase-navigation-header.component.html',
  styleUrl: './phase-navigation-header.component.scss',
})
export class PhaseNavigationHeaderComponent {
  @Input() stageLabel = 'Preliminary Scope Review';
  @Input() showBack = true;
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
  @Input() proceedValidationTitle = 'this phase';
  @Input() proceedValidationCompleted: string[] = [];
  @Input() proceedValidationMissing: string[] = [];

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();
  @Output() devProceed = new EventEmitter<void>();

  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();

  showExportMenu = false;
  constructor(private dialog: MatDialog) {}
  get showDevProceedButton(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.location.href.startsWith('http://localhost:4200/');
  }
  onProceedClick(): void {
    if (!this.proceedDisabled) {
      this.proceed.emit();
      return;
    }

    this.dialog.open(ValidationDialogComponent, {
      data: {
        title: this.proceedValidationTitle,
        completed: this.proceedValidationCompleted,
        missing: this.proceedValidationMissing,
      },
      width: '100%',
      maxWidth: '448px',
      panelClass: 'validation-dialog-panel',
      backdropClass: 'validation-dialog-backdrop',
      autoFocus: false,
    });
  }
  forceProceed(): void {
    this.devProceed.emit();
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
