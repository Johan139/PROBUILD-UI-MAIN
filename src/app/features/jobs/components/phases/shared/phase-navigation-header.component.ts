import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';

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
  @Output() fullReportRequested = new EventEmitter<void>();
  @Output() billOfMaterialsRequested = new EventEmitter<void>();
  @Output() executiveSummaryRequested = new EventEmitter<void>();
  @Output() environmentalReportRequested = new EventEmitter<void>();
  @Output() procurementScheduleRequested = new EventEmitter<void>();
  @Output() dailyConstructionPlanRequested = new EventEmitter<void>();

  showExportMenu = false;

  toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
  }

  closeExportMenu(): void {
    this.showExportMenu = false;
  }

  request(action: EventEmitter<void>): void {
    this.showExportMenu = false;
    action.emit();
  }
}

