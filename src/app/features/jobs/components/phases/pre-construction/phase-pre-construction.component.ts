import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Permit } from '../../../../../models/permit';
import { PermitsDialogComponent } from '../../../permits-dialog/permits-dialog.component';
import { FileUploadService } from '../../../../../services/file-upload.service';
import { PermitsService } from '../../../services/permits.service';
import { ReportService } from '../../../services/report.service';
import {
  PhaseNavigationHeaderComponent,
  PhaseReportRequestType,
} from '../shared/phase-navigation-header.component';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';
import { formatMoney } from '../../../../../shared/pipes/money.pipe';

interface PreConstructionTask {
  id: number;
  task: string;
  owner: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'In Progress' | 'Completed';
}

@Component({
  selector: 'app-phase-pre-construction',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PhaseNavigationHeaderComponent,
    LucideIconsModule,
    MatSnackBarModule,
  ],
  templateUrl: './phase-pre-construction.component.html',
  styleUrl: './phase-pre-construction.component.scss',
})
export class PhasePreConstructionComponent implements OnInit, OnChanges, OnDestroy {
  constructor(
    private readonly dialog: MatDialog,
    private readonly permitsService: PermitsService,
    private readonly reportService: ReportService,
    private readonly fileUploadService: FileUploadService,
    private readonly sanitizer: DomSanitizer,
    private readonly snackBar: MatSnackBar,
  ) {}

  @Input() projectDetails: any;
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();

  permits: Permit[] = [];
  permitStatus: 'success' | 'warning' | 'none' = 'none';
  permitStatusText = 'No Permits';
  isPermitLoading = false;
  busyPermitIds = new Set<number>();
  addingPermit = false;
  viewingPermit: Permit | null = null;
  viewingPermitUrl: string | null = null;
  viewingPermitPreviewUrl: SafeResourceUrl | null = null;
  loadingPermitPreview = false;
  newPermitDraft: Pick<Permit, 'name' | 'issuingAgency' | 'requirements'> = {
    name: '',
    issuingAgency: '',
    requirements: '',
  };

  scheduleTasks: PreConstructionTask[] = [
  ];

  addingScheduleTask = false;
  newScheduleTask = {
    task: '',
    owner: '',
    startDate: '',
    endDate: '',
    days: 3,
    status: 'Pending' as PreConstructionTask['status'],
  };
  private nextTaskId = 4;
  private lastLoadedJobId: number | null = null;

  ngOnInit(): void {
    this.lastLoadedJobId = this.jobId;
    this.refreshPermits();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['projectDetails']) {
      return;
    }

    const nextJobId = this.jobId;
    if (!nextJobId || this.lastLoadedJobId === nextJobId) {
      return;
    }

    this.lastLoadedJobId = nextJobId;
    this.refreshPermits();
  }

  ngOnDestroy(): void {
    this.releasePermitPreviewUrl();
  }

  get clientName(): string {
    if (this.projectDetails?.clientName) {
      return this.projectDetails.clientName;
    }

    const first = this.projectDetails?.clientFirstName || '';
    const last = this.projectDetails?.clientLastName || '';
    const joined = `${first} ${last}`.trim();
    return joined || 'Jacques Barnard';
  }

  get projectAddress(): string {
    return this.projectDetails?.address || this.projectDetails?.projectAddress || 'Belicia Ln, Round Rock, TX';
  }

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize || '2,450';
  }

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '228';
    }

    return formatMoney(Math.round(numeric * 0.0929), false, 0);
  }

  get completedCount(): number {
    return this.permits.filter((permit) => this.isPermitHandled(permit)).length;
  }

  get totalPermitCount(): number {
    return this.permits.length;
  }

  get permitProgressPercent(): number {
    if (!this.totalPermitCount) {
      return 0;
    }

    return (this.completedCount / this.totalPermitCount) * 100;
  }

  get canProceed(): boolean {
    return this.totalPermitCount > 0 && this.completedCount === this.totalPermitCount;
  }

  onProceedRequested(): void {
    if (this.canProceed) {
      this.proceed.emit();
      return;
    }

    this.snackBar.open(
      'Please upload a document or mark as N/A for each compliance item before proceeding.',
      'OK',
      {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
      },
    );
  }

  get completedScheduleCount(): number {
    return this.scheduleTasks.filter((task) => task.status === 'Completed').length;
  }

  openPermitsDialog(): void {
    if (!this.jobId) {
      return;
    }

    const dialogRef = this.dialog.open(PermitsDialogComponent, {
      width: '90vw',
      maxWidth: '1600px',
      height: '90vh',
      maxHeight: '90vh',
      panelClass: 'full-screen-dialog',
      data: { jobId: this.jobId },
    });

    dialogRef.afterClosed().subscribe(() => {
      this.checkPermitStatus(this.jobId!);
    });
  }

  checkPermitStatus(jobId: number): void {
    this.isPermitLoading = true;

    this.permitsService.getPermits(jobId).subscribe({
      next: (permits) => {
        if (!permits || permits.length === 0) {
          this.loadAiPermits(jobId);
          return;
        }

        const normalizedPermits = this.getUniquePermits(permits);
        this.permits = normalizedPermits;
        const expired = normalizedPermits.some((p) => this.normalizeStatus(p.status) === 'expired');
        const pending = normalizedPermits.some((p) => this.normalizeStatus(p.status) === 'pending');
        const allActive = normalizedPermits.every((p) => this.isPermitApproved(p.status));

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

        this.isPermitLoading = false;
      },
      error: () => {
        this.loadAiPermits(jobId);
      },
    });
  }

  private loadAiPermits(jobId: number): void {
    this.reportService
      .getPermitsAndApprovalsReport(jobId.toString())
      .then((aiPermits) => {
        if (!aiPermits || aiPermits.length === 0) {
          this.permits = [];
          this.permitStatus = 'none';
          this.permitStatusText = 'No Permits';
          this.isPermitLoading = false;
          return;
        }

        const uniqueAiPermits = this.getUniquePermits(aiPermits);

        this.permitsService.savePermitsBatch(uniqueAiPermits).subscribe({
          next: (savedPermits) => {
            this.applyPermitStatus(savedPermits.length ? savedPermits : uniqueAiPermits);
            this.isPermitLoading = false;
          },
          error: () => {
            this.applyPermitStatus(uniqueAiPermits);
            this.isPermitLoading = false;
          },
        });
      })
      .catch(() => {
        this.permits = [];
        this.permitStatus = 'none';
        this.permitStatusText = 'Unknown';
        this.isPermitLoading = false;
      });
  }

  private applyPermitStatus(permits: Permit[]): void {
    const uniquePermits = this.getUniquePermits(permits || []);
    this.permits = uniquePermits;

    if (!uniquePermits.length) {
      this.permitStatus = 'none';
      this.permitStatusText = 'No Permits';
      return;
    }

    const expired = uniquePermits.some((p) => this.normalizeStatus(p.status) === 'expired');
    const pending = uniquePermits.some((p) => this.normalizeStatus(p.status) === 'pending');
    const allActive = uniquePermits.every((p) => this.isPermitApproved(p.status));

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
  }

  isPermitHandled(permit: Permit): boolean {
    return !!permit.documentId || this.isPermitNA(permit.status) || this.isPermitApproved(permit.status);
  }

  isPermitNA(status: string): boolean {
    const normalized = this.normalizeStatus(status);
    return normalized === 'n/a' || normalized === 'na' || normalized === 'not applicable' || normalized === 'not_applicable';
  }

  getPermitIconName(permitName: string): string {
    const name = (permitName || '').toLowerCase();

    if (name.includes('building')) return 'building-2';
    if (name.includes('electrical')) return 'zap';
    if (name.includes('plumbing') || name.includes('sewage') || name.includes('septic')) return 'activity';
    if (name.includes('mechanical') || name.includes('hvac')) return 'wrench';
    if (name.includes('fire')) return 'shield-alert';
    if (name.includes('accessibility') || name.includes('tas')) return 'check-circle-2';
    if (name.includes('environment')) return 'shield-check';

    return 'clipboard-list';
  }

  onPermitFileSelected(permit: Permit, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || !permit.id) {
      input.value = '';
      return;
    }

    this.busyPermitIds.add(permit.id);

    this.permitsService.uploadPermitDocument(file, permit.id, crypto.randomUUID()).subscribe({
      next: (response) => {
        permit.documentId = response.documentId;
        permit.document = {
          id: response.documentId,
          fileName: file.name,
          blobUrl: response.url,
        };

        if (this.isPermitNA(permit.status)) {
          permit.status = 'Pending';
        }

        this.persistPermit(permit, false);
        input.value = '';
      },
      error: () => {
        this.busyPermitIds.delete(permit.id!);
        this.snackBar.open('Failed to upload permit document', 'Close', { duration: 2500 });
        input.value = '';
      },
    });
  }

  markPermitNA(permit: Permit): void {
    permit.status = 'Not Applicable';
    this.persistPermit(permit);
  }

  undoPermitNA(permit: Permit): void {
    permit.status = permit.documentId ? 'Pending' : 'Pending';
    this.persistPermit(permit);
  }

  removePermitDocument(permit: Permit): void {
    permit.documentId = undefined;
    permit.document = undefined;
    if (!this.isPermitNA(permit.status)) {
      permit.status = 'Pending';
    }
    this.persistPermit(permit);
  }

  viewPermitDocument(permit: Permit): void {
    if (!permit.document?.blobUrl) {
      return;
    }

    if (!this.canPreviewPermitDocument(permit)) {
      this.downloadPermitDocument(permit);
      return;
    }

    this.loadingPermitPreview = true;
    this.viewingPermit = permit;
    this.releasePermitPreviewUrl();

    this.fileUploadService.getFile(permit.document.blobUrl).subscribe({
      next: (blob) => {
        this.viewingPermitUrl = window.URL.createObjectURL(blob);
        this.viewingPermitPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.viewingPermitUrl);
        this.loadingPermitPreview = false;
      },
      error: () => {
        this.loadingPermitPreview = false;
        this.viewingPermit = null;
        this.snackBar.open('Failed to open permit document', 'Close', { duration: 2500 });
      },
    });
  }

  closePermitPreview(): void {
    this.viewingPermit = null;
    this.loadingPermitPreview = false;
    this.releasePermitPreviewUrl();
  }

  onReplaceFromPreview(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onPreviewFileSelected(event: Event): void {
    if (!this.viewingPermit) {
      const input = event.target as HTMLInputElement;
      input.value = '';
      return;
    }

    this.onPermitFileSelected(this.viewingPermit, event);
    this.closePermitPreview();
  }

  openPermitPreviewInNewTab(): void {
    if (!this.viewingPermitUrl) {
      return;
    }

    window.open(this.viewingPermitUrl, '_blank', 'noopener,noreferrer');
  }

  canPreviewPermitDocument(permit: Permit): boolean {
    const extension = this.getPermitDocumentExtension(permit);
    return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(extension);
  }

  getPermitDocumentActionIcon(permit: Permit): string {
    return this.canPreviewPermitDocument(permit) ? 'eye' : 'download';
  }

  getPermitDocumentActionLabel(permit: Permit): string {
    const fileName = permit.document?.fileName;
    if (fileName) {
      return fileName;
    }

    return this.canPreviewPermitDocument(permit) ? 'View document' : 'Download document';
  }

  private downloadPermitDocument(permit: Permit): void {
    if (!permit.document?.blobUrl) {
      return;
    }

    this.busyPermitIds.add(permit.id!);

    this.fileUploadService.getFile(permit.document.blobUrl).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = permit.document?.fileName || `${permit.name || 'permit-document'}`;
        link.click();
        window.URL.revokeObjectURL(url);
        if (permit.id) {
          this.busyPermitIds.delete(permit.id);
        }
      },
      error: () => {
        if (permit.id) {
          this.busyPermitIds.delete(permit.id);
        }
        this.snackBar.open('Failed to download permit document', 'Close', { duration: 2500 });
      },
    });
  }

  private getPermitDocumentExtension(permit: Permit): string {
    const fileName = permit.document?.fileName || '';
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || '';
  }

  isPermitBusy(permit: Permit): boolean {
    return !!permit.id && this.busyPermitIds.has(permit.id);
  }

  startAddPermit(): void {
    this.addingPermit = true;
    this.newPermitDraft = {
      name: '',
      issuingAgency: '',
      requirements: '',
    };
  }

  cancelAddPermit(): void {
    this.addingPermit = false;
    this.newPermitDraft = {
      name: '',
      issuingAgency: '',
      requirements: '',
    };
  }

  saveNewPermit(): void {
    if (!this.jobId) {
      return;
    }

    const name = this.newPermitDraft.name.trim();
    if (!name) {
      this.snackBar.open('Permit name is required', 'Close', { duration: 2200 });
      return;
    }

    const newPermit: Permit = {
      jobId: this.jobId,
      name,
      issuingAgency: (this.newPermitDraft.issuingAgency || '').trim(),
      requirements: (this.newPermitDraft.requirements || '').trim(),
      status: 'Pending',
      isAiGenerated: false,
    };

    this.isPermitLoading = true;
    this.permitsService.savePermit(newPermit).subscribe({
      next: (saved) => {
        this.cancelAddPermit();
        this.permits = this.getUniquePermits([saved, ...this.permits]);
        this.applyPermitStatus(this.permits);
        this.isPermitLoading = false;
        this.snackBar.open('Permit added', 'Close', { duration: 1800 });
      },
      error: () => {
        this.isPermitLoading = false;
        this.snackBar.open('Failed to add permit', 'Close', { duration: 2500 });
      },
    });
  }

  private persistPermit(permit: Permit, notify = true): void {
    if (!permit.id) {
      this.applyPermitStatus(this.permits);
      return;
    }

    this.busyPermitIds.add(permit.id);
    this.permitsService.updatePermit(permit).subscribe({
      next: () => {
        this.busyPermitIds.delete(permit.id!);
        this.applyPermitStatus(this.permits);
        if (notify) {
          this.snackBar.open('Permit updated', 'Close', { duration: 1800 });
        }
      },
      error: () => {
        this.busyPermitIds.delete(permit.id!);
        this.applyPermitStatus(this.permits);
        this.snackBar.open('Failed to update permit', 'Close', { duration: 2500 });
      },
    });
  }

  getPermitStatusClass(status: string): string {
    if (this.isPermitApproved(status)) {
      return 'is-approved';
    }

    const normalized = this.normalizeStatus(status);
    if (normalized === 'pending') {
      return 'is-pending';
    }

    if (normalized === 'expired') {
      return 'is-expired';
    }

    return 'is-neutral';
  }

  getPermitStatusLabel(status: string): string {
    const normalized = this.normalizeStatus(status);
    if (!normalized) {
      return 'Unknown';
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private normalizeStatus(status: string): string {
    return (status || '').toLowerCase();
  }

  private isPermitApproved(status: string): boolean {
    const normalized = this.normalizeStatus(status);
    return normalized === 'active' || normalized === 'approved';
  }

  private refreshPermits(): void {
    if (!this.jobId) {
      this.permits = [];
      this.permitStatus = 'none';
      this.permitStatusText = 'No Permits';
      return;
    }

    this.checkPermitStatus(this.jobId);
  }

  private get jobId(): number | null {
    const id = Number(this.projectDetails?.jobId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private getUniquePermits(permits: Permit[]): Permit[] {
    const byKey = new Map<string, Permit>();

    for (const permit of permits) {
      const key = `${(permit.name || '').trim().toLowerCase()}|${(permit.issuingAgency || '').trim().toLowerCase()}`;
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, permit);
        continue;
      }

      const existingHasDoc = !!existing.documentId;
      const currentHasDoc = !!permit.documentId;
      if (!existingHasDoc && currentHasDoc) {
        byKey.set(key, permit);
      }
    }

    return Array.from(byKey.values());
  }

  private releasePermitPreviewUrl(): void {
    if (!this.viewingPermitUrl) {
      this.viewingPermitPreviewUrl = null;
      return;
    }

    window.URL.revokeObjectURL(this.viewingPermitUrl);
    this.viewingPermitUrl = null;
    this.viewingPermitPreviewUrl = null;
  }

  toggleAddScheduleTask(): void {
    this.addingScheduleTask = !this.addingScheduleTask;
    if (!this.addingScheduleTask) {
      return;
    }

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 3);

    this.newScheduleTask = {
      task: '',
      owner: '',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      days: 3,
      status: 'Pending',
    };
  }

  updateNewScheduleDates(field: 'startDate' | 'endDate' | 'days', value: string | number): void {
    if (field === 'startDate') {
      const start = new Date(String(value));
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + this.newScheduleTask.days);
        this.newScheduleTask.startDate = String(value);
        this.newScheduleTask.endDate = end.toISOString().split('T')[0];
      }
      return;
    }

    if (field === 'days') {
      const days = Number(value) || 0;
      this.newScheduleTask.days = days;
      if (this.newScheduleTask.startDate) {
        const start = new Date(this.newScheduleTask.startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + days);
        this.newScheduleTask.endDate = end.toISOString().split('T')[0];
      }
      return;
    }

    this.newScheduleTask.endDate = String(value);
    if (this.newScheduleTask.startDate) {
      const start = new Date(this.newScheduleTask.startDate);
      const end = new Date(this.newScheduleTask.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      this.newScheduleTask.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  addScheduleTask(): void {
    if (!this.newScheduleTask.task.trim() || !this.newScheduleTask.owner.trim()) {
      return;
    }

    this.scheduleTasks = [
      ...this.scheduleTasks,
      {
        id: this.nextTaskId++,
        task: this.newScheduleTask.task.trim(),
        owner: this.newScheduleTask.owner.trim(),
        startDate: this.newScheduleTask.startDate,
        endDate: this.newScheduleTask.endDate,
        days: this.newScheduleTask.days,
        status: this.newScheduleTask.status,
      },
    ];

    this.addingScheduleTask = false;
  }

  updateScheduleTaskField(
    task: PreConstructionTask,
    field: 'task' | 'owner' | 'startDate' | 'endDate' | 'days' | 'status',
    value: string | number,
  ): void {
    (task as any)[field] = value;

    if (field === 'startDate' || field === 'days') {
      const start = new Date(task.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + Number(task.days || 0));
      task.endDate = end.toISOString().split('T')[0];
      return;
    }

    if (field === 'endDate') {
      const start = new Date(task.startDate);
      const end = new Date(String(value));
      const diffTime = Math.abs(end.getTime() - start.getTime());
      task.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  removeScheduleTask(taskId: number): void {
    this.scheduleTasks = this.scheduleTasks.filter((task) => task.id !== taskId);
  }
}

