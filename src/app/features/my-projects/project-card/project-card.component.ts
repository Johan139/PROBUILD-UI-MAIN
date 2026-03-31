import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Project } from '../../../models/project';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.scss'],
})
export class ProjectCardComponent {
  @Input() project!: Project;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @Output() onView = new EventEmitter<number>();
  @Output() onEdit = new EventEmitter<number>();
  @Output() onDelete = new EventEmitter<number>();
  @Output() onActivate = new EventEmitter<number>();
  @Output() onArchive = new EventEmitter<number>();
  @Output() onUploadThumbnail = new EventEmitter<{
    jobId: number;
    file: File;
  }>();

  constructor(private snackBar: MatSnackBar) {}

  get resolvedStartDate(): Date | null {
    const project = this.project as any;
    const rawDate =
      project?.potentialStartDate ??
      project?.desiredStartDate ??
      project?.startDate ??
      project?.biddingStartDate ??
      project?.PotentialStartDate ??
      null;

    if (!rawDate) return null;

    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime()) || parsed.getFullYear() <= 1) {
      return null;
    }

    return parsed;
  }

  get resolvedSquareFootage(): number | null {
    const project = this.project as any;
    const rawSize =
      project?.buildingSize ??
      project?.projectSize ??
      project?.underRoofArea ??
      project?.BuildingSize ??
      null;

    const parsed = this.parseNumericValue(rawSize);
    return parsed > 0 ? parsed : null;
  }

  private parseNumericValue(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  statusColors: Record<string, string> = {
    INITIATION: 'status-initiation',
    BIDDING: 'status-bid-solicitation',
    BID_SOLICITATION: 'status-bid-solicitation',
    LIVE: 'status-construction-live',
    CONSTRUCTION_LIVE: 'status-construction-live',
    DRAFT: 'status-preliminary-scope',
    PRELIMINARY: 'status-preliminary-scope',
    PRELIMINARY_SCOPE: 'status-preliminary-scope',
    DETAILED_TAKEOFF: 'status-detailed-takeoff',
    CONTRACT_AWARD: 'status-contract-award',
    PRE_CONSTRUCTION: 'status-pre-construction',
    TRADE_AWARD: 'status-trade-award',
    MOBILIZATION: 'status-mobilization',
    CLOSEOUT: 'status-closeout',
    COMPLETED: 'status-closeout',
    FAILED: 'status-failed',
    DISCARD: 'status-discard',
    ARCHIVED: 'status-archived',
    CLOSURE: 'status-archived',
    NEW: 'status-new',
    ANALYZING: 'status-analyzing',
  };

  statusLabels: Record<string, string> = {
    INITIATION: 'Project Initiation',
    BIDDING: 'Bidding Phase',
    BID_SOLICITATION: 'Bid Solicitation',
    LIVE: 'Live Project',
    CONSTRUCTION_LIVE: 'Construction Live',
    DRAFT: 'Preliminary',
    PRELIMINARY: 'Preliminary Scope Review',
    PRELIMINARY_SCOPE: 'Preliminary Scope Review',
    DETAILED_TAKEOFF: 'Detailed Estimating & Takeoff',
    CONTRACT_AWARD: 'Contract Award & Execution',
    PRE_CONSTRUCTION: 'Pre-Construction & Compliance',
    TRADE_AWARD: 'Trade Award & Final Buyout',
    MOBILIZATION: 'Project Mobilization',
    CLOSEOUT: 'Project Closeout & Handover',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    DISCARD: 'Discarded',
    ARCHIVED: 'Archived',
    CLOSURE: 'Closed',
    NEW: 'New',
    ANALYZING: 'Analyzing',
  };

  getStatusColor(status: string | undefined): string {
    if (!status) return 'status-preliminary-scope';
    return this.statusColors[status] || 'status-preliminary-scope';
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return 'Unknown';
    return this.statusLabels[status] || status.replace(/_/g, ' ');
  }

  isActivationStage(status: string | undefined): boolean {
    return (
      status === 'DRAFT' ||
      status === 'NEW'
    );
  }

  openThumbnailPicker(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.fileInputRef?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg'];
      if (allowedTypes.includes(file.type)) {
        this.onUploadThumbnail.emit({ jobId: this.project.jobId, file: file });
      } else {
        this.snackBar.open(
          'Invalid file type. Please upload a PNG or JPEG file.',
          'Close',
          {
            duration: 3000,
          },
        );
      }

      input.value = '';
    }
  }
}
