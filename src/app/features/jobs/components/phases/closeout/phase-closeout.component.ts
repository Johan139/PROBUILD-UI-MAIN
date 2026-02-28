import { CommonModule } from '@angular/common';
import { HttpEventType } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';
import { DocumentService } from '../../../services/document.service';
import { JobsService } from '../../../../../services/jobs.service';
import {
  PhaseNavigationHeaderComponent,
  PhaseReportRequestType,
} from '../shared/phase-navigation-header.component';

interface CloseoutItem {
  key: string;
  iconName: string;
  label: string;
  desc: string;
  detail: string;
}

interface CloseoutUpload {
  name: string;
  date: string;
  type: string;
  progress?: number;
  uploading?: boolean;
  error?: string;
}

@Component({
  selector: 'app-phase-closeout',
  standalone: true,
  imports: [CommonModule, PhaseNavigationHeaderComponent, LucideIconsModule],
  templateUrl: './phase-closeout.component.html',
  styleUrl: './phase-closeout.component.scss',
})
export class PhaseCloseoutComponent implements OnInit {
  constructor(
    private readonly documentService: DocumentService,
    private readonly jobsService: JobsService,
  ) {}

  @Input() projectDetails: any;
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() archive = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();

  activeCloseoutKey: string | null = null;
  readonly completedItemKeys = new Set<string>();
  readonly closeoutUploads: Record<string, CloseoutUpload> = {};

  ngOnInit(): void {
    this.loadExistingUploads();
  }

  get closeoutItems(): CloseoutItem[] {
    return [
      {
        key: 'inspections',
        iconName: 'shield-check',
        label: 'Final Inspections',
        desc: 'Complete all remaining municipal and owner inspections',
        detail: 'Municipal final, fire dept. sign-off, owner walkthrough',
      },
      {
        key: 'punch',
        iconName: 'clipboard-list',
        label: 'Punch List',
        desc: 'Document, track, and resolve all outstanding deficiency items',
        detail: '0 of 0 items resolved',
      },
      {
        key: 'asbuilt',
        iconName: 'file-text',
        label: 'As-Built Documentation',
        desc: 'Compile final as-built drawings and project documentation',
        detail: 'Drawings, specifications, submittals, RFIs',
      },
      {
        key: 'warranty',
        iconName: 'shield',
        label: 'Warranty Handover',
        desc: 'Assemble and deliver all warranties to the client',
        detail: 'Manufacturer warranties, workmanship guarantees, maintenance manuals',
      },
      {
        key: 'payment',
        iconName: 'dollar-sign',
        label: 'Final Payment Release',
        desc: 'Process retainage release and final payment certification',
        detail: `Retainage: ${this.retainageDisplay} pending release`,
      },
    ];
  }

  readonly closureStats = [
    { label: 'Closeout Package', value: '100%' },
    { label: 'Signoffs', value: 'Owner · PM · Finance' },
    { label: 'Retention', value: 'Released' },
    { label: 'Archive State', value: 'Ready' },
  ];

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

  get projectName(): string {
    return this.projectDetails?.projectName || 'Hernandez Residence';
  }

  get clientName(): string {
    const first = this.projectDetails?.clientFirstName || '';
    const last = this.projectDetails?.clientLastName || '';
    const fullName = `${first} ${last}`.trim();

    return fullName || this.projectDetails?.clientName || this.projectDetails?.name || 'Jacques Barnard';
  }

  get projectAddress(): string {
    return this.projectDetails?.address || 'Belicia Ln, Round Rock, TX';
  }

  get retainageDisplay(): string {
    const budget =
      Number(this.projectDetails?.suggestedBid) ||
      Number(this.projectDetails?.budget) ||
      Number(this.projectDetails?.projectValue) ||
      0;

    if (budget <= 0) {
      return '$0';
    }

    return `$${Math.round(budget * 0.05).toLocaleString()}`;
  }

  get completedCount(): number {
    return this.completedItemKeys.size;
  }

  get completionPercent(): number {
    return Math.round((this.completedCount / this.closeoutItems.length) * 100);
  }

  get canArchive(): boolean {
    return this.completedCount === this.closeoutItems.length;
  }

  get archiveState(): string {
    return this.canArchive ? 'Ready' : 'Pending checklist';
  }

  isComplete(itemKey: string): boolean {
    return this.completedItemKeys.has(itemKey);
  }

  getUpload(itemKey: string): CloseoutUpload | null {
    return this.closeoutUploads[itemKey] || null;
  }

  isUploading(itemKey: string): boolean {
    return !!this.closeoutUploads[itemKey]?.uploading;
  }

  uploadProgress(itemKey: string): number {
    return this.closeoutUploads[itemKey]?.progress ?? 0;
  }

  uploadError(itemKey: string): string | null {
    return this.closeoutUploads[itemKey]?.error || null;
  }

  triggerFilePicker(itemKey: string, fileInput: HTMLInputElement): void {
    this.activeCloseoutKey = itemKey;
    fileInput.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file && this.activeCloseoutKey) {
      this.uploadCloseoutFile(this.activeCloseoutKey, file);
    }

    input.value = '';
    this.activeCloseoutKey = null;
  }

  private uploadCloseoutFile(itemKey: string, file: File): void {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.pdf')) {
      this.closeoutUploads[itemKey] = {
        name: file.name,
        date: new Date().toLocaleDateString(),
        type: this.documentTypeLabel(itemKey),
        error: 'Only PDF files are supported for closeout uploads.',
      };
      return;
    }

    const jobId = this.projectDetails?.jobId || this.projectDetails?.id;
    if (!jobId) {
      this.closeoutUploads[itemKey] = {
        name: file.name,
        date: new Date().toLocaleDateString(),
        type: this.documentTypeLabel(itemKey),
        error: 'Missing job id, cannot upload file.',
      };
      return;
    }

    const metadataType = this.documentTypeKey(itemKey);
    const metadataLabel = this.documentTypeLabel(itemKey);
    const sessionId = this.projectDetails?.sessionId || this.createSessionId();

    this.closeoutUploads[itemKey] = {
      name: file.name,
      date: new Date().toLocaleDateString(),
      type: metadataLabel,
      progress: 0,
      uploading: true,
    };

    this.documentService
      .uploadFile(file, String(jobId), sessionId, {
        title: `${metadataLabel} - Closeout`,
        description: `Closeout handover document: ${metadataLabel}`,
        type: metadataType,
      })
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const pct = Math.round((100 * event.loaded) / event.total);
            this.closeoutUploads[itemKey] = {
              ...this.closeoutUploads[itemKey],
              progress: pct,
              uploading: true,
            };
            return;
          }

          if (event.type === HttpEventType.Response) {
            this.closeoutUploads[itemKey] = {
              name: file.name,
              date: new Date().toLocaleDateString(),
              type: metadataLabel,
              progress: 100,
              uploading: false,
            };
            this.completedItemKeys.add(itemKey);
          }
        },
        error: () => {
          this.closeoutUploads[itemKey] = {
            name: file.name,
            date: new Date().toLocaleDateString(),
            type: metadataLabel,
            uploading: false,
            error: 'Upload failed. Please retry.',
          };
        },
      });
  }

  private documentTypeKey(itemKey: string): string {
    return this.documentTypeLabel(itemKey);
  }

  private documentTypeLabel(itemKey: string): string {
    const item = this.closeoutItems.find((entry) => entry.key === itemKey);
    return item?.label || 'Closeout Document';
  }

  private createSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `closeout-${Date.now()}`;
  }

  private loadExistingUploads(): void {
    const jobId = this.projectDetails?.jobId || this.projectDetails?.id;
    if (!jobId) {
      return;
    }

    this.jobsService.getJobDocuments(String(jobId)).subscribe({
      next: (docs) => {
        for (const doc of docs || []) {
          const mappedKey = this.itemKeyFromType(doc?.type, doc?.fileName);
          if (!mappedKey) {
            continue;
          }

          this.closeoutUploads[mappedKey] = {
            name: doc?.fileName || 'Document',
            date: doc?.uploadedAt
              ? new Date(doc.uploadedAt).toLocaleDateString()
              : new Date().toLocaleDateString(),
            type: doc?.type || this.documentTypeLabel(mappedKey),
            progress: 100,
            uploading: false,
          };
          this.completedItemKeys.add(mappedKey);
        }
      },
      error: () => {
        // no-op: closeout can still function with fresh uploads
      },
    });
  }

  private itemKeyFromType(type?: string, fileName?: string): string | null {
    const normalizedType = (type || '').trim().toLowerCase();
    const normalizedFile = (fileName || '').toLowerCase();

    const typeMap: Record<string, string> = {
      'final inspections': 'inspections',
      'punch list': 'punch',
      'as-built documentation': 'asbuilt',
      'warranty handover': 'warranty',
      'final payment release': 'payment',
      closeout_inspections: 'inspections',
      closeout_punch: 'punch',
      closeout_asbuilt: 'asbuilt',
      closeout_warranty: 'warranty',
      closeout_payment: 'payment',
    };

    if (typeMap[normalizedType]) {
      return typeMap[normalizedType];
    }

    if (normalizedFile.includes('inspection')) return 'inspections';
    if (normalizedFile.includes('punch')) return 'punch';
    if (normalizedFile.includes('as-built') || normalizedFile.includes('asbuilt')) return 'asbuilt';
    if (normalizedFile.includes('warranty')) return 'warranty';
    if (normalizedFile.includes('payment') || normalizedFile.includes('retainage')) return 'payment';

    return null;
  }

  toggleItem(itemKey: string): void {
    if (this.completedItemKeys.has(itemKey)) {
      this.completedItemKeys.delete(itemKey);
      return;
    }

    this.completedItemKeys.add(itemKey);
  }

  removeUpload(itemKey: string): void {
    delete this.closeoutUploads[itemKey];
    this.completedItemKeys.delete(itemKey);
  }
}

