import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { marked } from 'marked';
import {
  AlignmentType,
  Document as DocxDocument,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { PhaseNavigationHeaderComponent } from '../shared/phase-navigation-header.component';
import { LucideIconsModule } from '../../../../../shared/lucide-icons.module';
import {
  ContractRecord,
  ContractService,
} from '../../../../../services/contract.service';
import { DragAndDropDirective } from '../../../../../directives/drag-and-drop.directive';

@Component({
  selector: 'app-phase-contract-award',
  standalone: true,
  imports: [
    CommonModule,
    PhaseNavigationHeaderComponent,
    LucideIconsModule,
    DragAndDropDirective,
  ],
  templateUrl: './phase-contract-award.component.html',
  styleUrl: './phase-contract-award.component.scss',
})
export class PhaseContractAwardComponent implements OnInit, OnChanges {
  constructor(private contractService: ContractService) {}

  @Input() projectDetails: any;
  @Input() liveStageTemplate: TemplateRef<any> | null = null;
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;

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

  contractMethod: 'ai' | 'upload' | null = null;
  contractGenerating = false;
  contractGenerated = false;
  uploadedContractName = '';
  generatedContractFileName = '';
  generatedContractMarkdown = '';
  activeContractId: string | null = null;
  isUploading = false;
  isDownloading = false;
  private lastLoadedJobId: number | null = null;

  ngOnInit(): void {
    const jobId = this.jobId;
    if (!jobId) {
      return;
    }

    this.lastLoadedJobId = jobId;
    this.resetContractState();
    this.loadExistingContract(jobId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['projectDetails']) {
      return;
    }

    const jobId = this.jobId;
    if (!jobId || this.lastLoadedJobId === jobId) {
      return;
    }

    this.lastLoadedJobId = jobId;
    this.resetContractState();
    this.loadExistingContract(jobId);
  }

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize || '2,450';
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

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '228';
    }

    return Math.round(numeric * 0.0929).toLocaleString();
  }

  get generatedContractName(): string {
    if (this.contractMethod === 'ai') {
      const projectName = this.projectDetails?.projectName || 'Project';
      const normalized = this.generatedContractFileName || `${projectName}_GC_Client_Contract.docx`;
      return normalized.toLowerCase().endsWith('.pdf')
        ? normalized.replace(/\.pdf$/i, '.docx')
        : normalized;
    }

    if (this.generatedContractFileName) {
      return this.generatedContractFileName;
    }

    const projectName = this.projectDetails?.projectName || 'Project';
    return `${projectName}_Contract_v1.pdf`;
  }

  private get jobId(): number | null {
    const id = Number(this.projectDetails?.jobId);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get completedItems(): number {
    const method = this.contractMethod ? 1 : 0;
    const completed =
      this.contractMethod === 'ai'
        ? this.contractGenerated
          ? 1
          : 0
        : this.contractMethod === 'upload'
          ? this.uploadedContractName
            ? 1
            : 0
          : 0;

    return method + completed;
  }

  get canProceed(): boolean {
    return !!this.contractMethod;
  }

  selectMethod(method: 'ai' | 'upload'): void {
    this.contractMethod = method;
    if (method === 'ai') {
      this.uploadedContractName = '';
    }
    if (method === 'upload') {
      this.contractGenerating = false;
      this.contractGenerated = false;
    }
  }

  generateContract(): void {
    if (this.contractMethod !== 'ai' || this.contractGenerating) {
      return;
    }

    const jobId = this.jobId;
    if (!jobId) {
      console.error('Missing job id for contract generation.');
      return;
    }

    if (this.activeContractId) {
      const shouldOverwrite = window.confirm(
        'A GC/client contract already exists for this job. Generating a new one will overwrite it. Continue?',
      );

      if (!shouldOverwrite) {
        return;
      }
    }

    this.contractGenerating = true;
    this.contractService.generateGeneralClientContract(jobId).subscribe({
      next: (contract) => {
        this.hydrateContractState(contract);
        this.contractMethod = 'ai';
        this.contractGenerated = true;
        this.contractGenerating = false;
      },
      error: (err) => {
        console.error('Failed to generate client contract', err);
        this.contractGenerating = false;
      },
    });
  }

  onContractFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.uploadExistingContract(file);
    input.value = '';
  }

  onContractFilesDropped(files: FileList): void {
    const file = files?.item(0);
    if (!file) {
      return;
    }

    this.uploadExistingContract(file);
  }

  viewContract(): void {
    this.downloadContract(true);
  }

  downloadContract(openInNewTab = false): void {
    if (this.isDownloading) {
      return;
    }

    if (
      this.contractMethod === 'ai' &&
      this.generatedContractMarkdown.trim().length > 0
    ) {
      this.isDownloading = true;
      const markdown = this.generatedContractMarkdown;

      (openInNewTab
        ? this.buildContractHtml(markdown).then((html) => {
            const previewBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const previewUrl = URL.createObjectURL(previewBlob);
            window.open(previewUrl, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(previewUrl), 12000);
          })
        : this.downloadAsDocx(markdown))
        .catch((err) => {
          console.error('Failed to generate client contract word document on client', err);
        })
        .finally(() => {
          this.isDownloading = false;
        });
      return;
    }

    if (!this.activeContractId) {
      return;
    }

    this.isDownloading = true;
    this.contractService.downloadClientContractPdf(this.activeContractId).subscribe({
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob);

        if (openInNewTab) {
          window.open(blobUrl, '_blank', 'noopener');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 12000);
        } else {
          const anchor = document.createElement('a');
          anchor.href = blobUrl;
          anchor.download = this.generatedContractName;
          anchor.click();
          URL.revokeObjectURL(blobUrl);
        }

        this.isDownloading = false;
      },
      error: (err) => {
        console.error('Failed to download contract pdf', err);
        this.isDownloading = false;
      },
    });
  }

  private uploadExistingContract(file: File): void {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      console.error('Only PDF contracts are supported.');
      return;
    }

    const jobId = this.jobId;
    if (!jobId || this.isUploading) {
      return;
    }

    this.isUploading = true;
    this.contractMethod = 'upload';

    const runUpload = (contractId: string) => {
      this.contractService.uploadClientContractPdf(contractId, file).subscribe({
        next: (updated) => {
          this.hydrateContractState(updated);
          this.uploadedContractName = file.name;
          this.generatedContractMarkdown = '';
          this.contractGenerated = true;
          this.isUploading = false;
        },
        error: (err) => {
          console.error('Failed to upload client contract pdf', err);
          this.isUploading = false;
        },
      });
    };

    if (this.activeContractId) {
      runUpload(this.activeContractId);
      return;
    }

    this.contractService.generateGeneralClientContract(jobId).subscribe({
      next: (contract) => {
        this.hydrateContractState(contract);
        if (!this.activeContractId) {
          this.isUploading = false;
          return;
        }
        runUpload(this.activeContractId);
      },
      error: (err) => {
        console.error('Failed to initialize contract before upload', err);
        this.isUploading = false;
      },
    });
  }

  private hydrateContractState(contract: ContractRecord): void {
    this.activeContractId = contract.id || this.activeContractId;
    this.generatedContractFileName = contract.fileName || this.generatedContractFileName;
    this.generatedContractMarkdown =
      contract.contractText || this.generatedContractMarkdown;

    if (contract.status === 'UPLOADED') {
      this.contractMethod = 'upload';
      this.uploadedContractName = contract.fileName || this.uploadedContractName;
    } else {
      this.contractMethod = 'ai';
      this.uploadedContractName = '';
    }
  }

  private loadExistingContract(jobId: number): void {
    this.contractService.getContractsByJobId(jobId).subscribe({
      next: (contracts) => {
        const existing = this.resolveExistingGeneralClientContract(contracts || []);
        if (!existing) {
          return;
        }

        this.hydrateContractState(existing);
        this.contractGenerated = true;
      },
      error: (err) => {
        console.error('Failed to load existing client contract for job', err);
      },
    });
  }

  private resolveExistingGeneralClientContract(
    contracts: ContractRecord[],
  ): ContractRecord | null {
    const matches = contracts.filter(
      (c) =>
        c.contractType === 'GC_CLIENT' ||
        (!c.contractType && c.gcId && c.scVendorId && c.gcId === c.scVendorId),
    );

    if (!matches.length) {
      return null;
    }

    return matches.sort((a, b) => {
      const left = Date.parse(a.updatedAt || a.createdAt || '') || 0;
      const right = Date.parse(b.updatedAt || b.createdAt || '') || 0;
      return right - left;
    })[0];
  }

  private resetContractState(): void {
    this.contractMethod = null;
    this.contractGenerating = false;
    this.contractGenerated = false;
    this.uploadedContractName = '';
    this.generatedContractFileName = '';
    this.generatedContractMarkdown = '';
    this.activeContractId = null;
    this.isUploading = false;
    this.isDownloading = false;
  }

  private async buildContractHtml(markdown: string): Promise<string> {
    const parsed = await Promise.resolve(marked.parse(markdown) as string);
    const title = `${this.projectDetails?.projectName || 'Project'} Client Contract`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${this.escapeHtml(title)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; line-height: 1.45; margin: 24px; color: #111; }
    h1,h2,h3,h4 { margin: 16px 0 8px; }
    p { margin: 8px 0; }
    ul,ol { margin: 8px 0 8px 22px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th,td { border: 1px solid #bbb; padding: 6px; text-align: left; }
    blockquote { border-left: 3px solid #ccc; margin: 8px 0; padding-left: 10px; color: #555; }
    code { font-family: Consolas, monospace; }
  </style>
</head>
<body>
${parsed}
</body>
</html>`;
  }

  private async downloadAsDocx(markdown: string): Promise<void> {
    const fileName = this.ensureExtension(this.generatedContractName, '.docx');
    const docxBlob = await this.buildDocxBlobFromMarkdown(markdown);
    this.triggerFileDownload(docxBlob, fileName);
  }

  private async buildDocxBlobFromMarkdown(markdown: string): Promise<Blob> {
    const safeMarkdown = this.sanitizeForOpenXml(markdown);
    const lines = safeMarkdown.replace(/\r\n/g, '\n').split('\n');
    const children: Paragraph[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        children.push(new Paragraph({ text: '' }));
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        children.push(
          new Paragraph({
            heading: this.mapHeadingLevel(headingMatch[1].length),
            children: [new TextRun(this.stripMarkdownInline(headingMatch[2]))],
          }),
        );
        continue;
      }

      const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
      if (bulletMatch) {
        children.push(
          new Paragraph({
            children: [new TextRun(this.stripMarkdownInline(bulletMatch[1]))],
            bullet: { level: 0 },
          }),
        );
        continue;
      }

      const numberMatch = line.match(/^\d+\.\s+(.+)$/);
      if (numberMatch) {
        children.push(
          new Paragraph({
            children: [new TextRun(this.stripMarkdownInline(line))],
          }),
        );
        continue;
      }

      children.push(
        new Paragraph({
          children: [new TextRun(this.stripMarkdownInline(line))],
        }),
      );
    }

    const doc = new DocxDocument({
      numbering: {
        config: [
          {
            reference: 'contract-numbering',
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.LEFT,
              },
            ],
          },
        ],
      },
      sections: [
        {
          children: children.length ? children : [new Paragraph({ text: '' })],
        },
      ],
    });

    return Packer.toBlob(doc);
  }

  private mapHeadingLevel(level: number) {
    switch (level) {
      case 1:
        return HeadingLevel.HEADING_1;
      case 2:
        return HeadingLevel.HEADING_2;
      case 3:
        return HeadingLevel.HEADING_3;
      case 4:
        return HeadingLevel.HEADING_4;
      case 5:
        return HeadingLevel.HEADING_5;
      default:
        return HeadingLevel.HEADING_6;
    }
  }

  private stripMarkdownInline(value: string): string {
    return this.sanitizeForOpenXml(
      value
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1'),
    );
  }

  private ensureExtension(fileName: string, extension: '.docx' | '.doc'): string {
    if (fileName.toLowerCase().endsWith(extension)) {
      return fileName;
    }

    return fileName.replace(/\.(pdf|docx|doc)$/i, '') + extension;
  }

  private triggerFileDownload(blob: Blob, fileName: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  }

  private sanitizeForOpenXml(value: string): string {
    // Remove control characters not allowed in XML 1.0; keep tab/newline/carriage return.
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

