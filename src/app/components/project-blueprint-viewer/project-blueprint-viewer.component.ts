import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  Renderer2,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LucideAngularModule,
  HardHat,
  MapPin,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Ruler,
  RotateCw,
  CheckCircle,
} from 'lucide-angular';
import { PdfJsViewerModule } from 'ng2-pdfjs-viewer';
import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';
import { DragAndDropDirective } from '../../directives/drag-and-drop.directive';
import {
  UploadedFileInfo,
  FileUploadService,
} from '../../services/file-upload.service';
import { Prompt } from '../../features/ai-chat/models/ai-chat.models';
import { UploadOptionsDialogComponent } from '../../features/jobs/job-quote/upload-options-dialog.component';
import { ConfirmationDialogComponent } from '../../features/new-project/confirmation-dialog.component';

export type ViewerMode = 'create' | 'view';

export type FlowState =
  | { step: 'idle' }
  | { step: 'uploaded'; fileName: string }
  | { step: 'extracting'; pct: number }
  | { step: 'address'; detectedAddress?: string }
  | { step: 'walkthrough'; index: number; notes: Record<string, string> }
  | { step: 'finalizing'; pct: number }
  | { step: 'done' };

@Component({
  selector: 'app-project-blueprint-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    DragAndDropDirective,
    PdfJsViewerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './project-blueprint-viewer.component.html',
  styleUrls: ['./project-blueprint-viewer.component.scss'],
})
export class ProjectBlueprintViewerComponent implements OnInit {
  @Input() mode: ViewerMode = 'create';

  // Inputs for 'create' mode mainly, or shared
  @Input() flow: FlowState = { step: 'idle' };
  @Input() uploadedFiles: UploadedFileInfo[] = [];
  @Input() selectedFile: UploadedFileInfo | null = null;
  @Input() pdfSrc: string | Uint8Array | null = null;

  // Inputs specifically for 'create' mode analysis
  @Input() analysisMode: 'full' | 'selected' | 'renovation' = 'full';
  @Input() availablePrompts$: Observable<Prompt[]> | null = null;
  @Input() selectedPrompts = new FormControl([]);

  // Outputs to notify parent of changes
  @Output() flowChange = new EventEmitter<FlowState>();
  @Output() fileUploaded = new EventEmitter<{
    files: UploadedFileInfo[];
    selected: UploadedFileInfo | null;
    pdfSrc: string | Uint8Array | null;
  }>();
  @Output() fileSelected = new EventEmitter<UploadedFileInfo>();
  @Output() fileRemoved = new EventEmitter<UploadedFileInfo>();
  @Output() analysisModeChange = new EventEmitter<
    'full' | 'selected' | 'renovation'
  >();
  @Output() startProject = new EventEmitter<void>();
  @Output() cancelProject = new EventEmitter<void>();
  @Output() addressConfirmed = new EventEmitter<string>();
  @Output() addressEdit = new EventEmitter<void>();

  // Internal state
  viewerId = uuidv4();
  zoom = 1;
  metric = true;
  isFileListCollapsed = false;

  // For 'view' mode, to handle external file list loading
  @Input() viewModeFiles: any[] = [];

  HardHat = HardHat;
  MapPin = MapPin;
  MousePointer = MousePointer;
  Hand = Hand;
  ZoomIn = ZoomIn;
  ZoomOut = ZoomOut;
  Maximize2 = Maximize2;
  Ruler = Ruler;
  RotateCw = RotateCw;
  Check = CheckCircle;

  BRAND = {
    gray433: '#1E2329',
    gray426: '#2A2F35',
    gray432: '#3B4046',
    grayTooltip: '#6B7280',
    yellow012: '#FCD109',
    yellow120: '#FFE473',
    redWarn: '#F43F5E',
  };

  rightToolbarButtons = [
    { key: 'select', icon: this.MousePointer, label: 'Select' },
    { key: 'pan', icon: this.Hand, label: 'Pan' },
    { key: 'zoomin', icon: this.ZoomIn, label: 'Zoom In' },
    { key: 'zoomout', icon: this.ZoomOut, label: 'Zoom Out' },
    { key: 'fit', icon: this.Maximize2, label: 'Fit to Page' },
    { key: 'measure', icon: this.Ruler, label: 'Measure', disabled: true },
    { key: 'rotate', icon: this.RotateCw, label: 'Rotate' },
  ];

  SECTION_ORDER = [
    { key: 'Foundation', color: '#22C55E' },
    { key: 'Walls', color: '#60A5FA' },
    { key: 'Roof', color: '#F87171' },
    { key: 'Kitchen', color: '#F59E0B' },
  ];

  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('pdfViewer') pdfViewer: any;

  constructor(
    public dialog: MatDialog,
    private renderer: Renderer2,
    private fileUploadService: FileUploadService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  ngOnInit(): void {
    if (this.mode === 'view' && this.viewModeFiles.length > 0) {
      // In view mode, we might want to auto-select the first file if provided
      // Logic handled by parent or ngOnChanges if needed
    }
  }

  isExtracting(
    flow: FlowState,
  ): flow is Extract<FlowState, { step: 'extracting' }> {
    return flow.step === 'extracting';
  }

  isFinalizing(
    flow: FlowState,
  ): flow is Extract<FlowState, { step: 'finalizing' }> {
    return flow.step === 'finalizing';
  }

  isWalkthrough(
    flow: FlowState,
  ): flow is Extract<FlowState, { step: 'walkthrough' }> {
    return flow.step === 'walkthrough';
  }

  isUploaded(
    flow: FlowState,
  ): flow is Extract<FlowState, { step: 'uploaded' }> {
    return flow.step === 'uploaded';
  }

  get currentKey(): string {
    if (this.isWalkthrough(this.flow)) {
      // @ts-ignore - TS doesn't narrow the type automatically here despite the check
      return this.SECTION_ORDER[this.flow.index].key;
    }
    return 'Foundation';
  }

  onFileSelected(event: Event): void {
    if (this.mode === 'view') return; // Disable upload in view mode
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.onFileDropped(input.files);
    }
  }

  onFileDropped(files: FileList): void {
    if (this.mode === 'view') return; // Disable upload in view mode
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const sessionId = uuidv4(); // Generate a temp session ID for this upload batch

      this.fileUploadService
        .uploadFiles(fileArray, sessionId)
        .subscribe((upload) => {
          if (upload.files) {
            const isFirstUpload = this.uploadedFiles.length === 0;
            const newFiles = [...this.uploadedFiles, ...upload.files];
            let newSelected = this.selectedFile;
            let newPdfSrc = this.pdfSrc;

            if (isFirstUpload && newFiles.length > 0) {
              newSelected = newFiles[0];
              // Need to fetch the blob for the first file to display it
              this.fileUploadService
                .getFile(newSelected.url)
                .subscribe((blob) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (reader.result) {
                      this.emitFileUpdate(
                        newFiles,
                        newSelected,
                        new Uint8Array(reader.result as ArrayBuffer),
                      );
                    }
                  };
                  reader.readAsArrayBuffer(blob);
                });
              // Emit flow change to parent
              this.flowChange.emit({
                step: 'uploaded',
                fileName: newSelected.name,
              });
            } else {
              // Just update the file list if it's not the first one
              this.emitFileUpdate(newFiles, newSelected, newPdfSrc);
            }
          }
        });
    }
  }

  private emitFileUpdate(
    files: UploadedFileInfo[],
    selected: UploadedFileInfo | null,
    pdfSrc: string | Uint8Array | null,
  ) {
    this.fileUploaded.emit({
      files: files,
      selected: selected,
      pdfSrc: pdfSrc,
    });
  }

  onPdfSelectionChange(file: UploadedFileInfo): void {
    if (file) {
      this.fileSelected.emit(file);
      // Parent should handle fetching the blob and updating pdfSrc
      // But if we want to be self-contained for display logic:
      this.displayPdfByUrl(file.url);

      if (this.mode === 'create') {
        this.flowChange.emit({ step: 'uploaded', fileName: file.name });
      }
    }
  }

  displayPdfByUrl(url: string): void {
    this.fileUploadService.getFile(url).subscribe((blob) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          const newPdfSrc = new Uint8Array(reader.result as ArrayBuffer);
          this.fileUploaded.emit({
            files: this.uploadedFiles,
            selected: this.uploadedFiles.find((f) => f.url === url) || null,
            pdfSrc: newPdfSrc,
          });
          this.viewerId = uuidv4();
        }
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  removeFile(file: UploadedFileInfo): void {
    if (this.mode === 'view') return;
    this.fileRemoved.emit(file);
  }

  openUploadDialog(): void {
    if (this.mode === 'view') return;
    const dialogRef = this.dialog.open(UploadOptionsDialogComponent);

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result === 'folder') {
          this.renderer.setAttribute(
            this.fileInput.nativeElement,
            'webkitdirectory',
            'true',
          );
        } else {
          this.renderer.removeAttribute(
            this.fileInput.nativeElement,
            'webkitdirectory',
          );
        }
        this.fileInput.nativeElement.click();
      }
    });
  }

  async handleToolbarClick(key: string): Promise<void> {
    if (!this.pdfViewer) {
      return;
    }

    switch (key) {
      case 'zoomin':
        this.zoom = Math.min(4, this.zoom + 0.25);
        await this.pdfViewer.setZoom(this.zoom);
        break;
      case 'zoomout':
        this.zoom = Math.max(0.25, this.zoom - 0.25);
        await this.pdfViewer.setZoom(this.zoom);
        break;
      case 'fit':
        this.zoom = 1;
        await this.pdfViewer.setZoom('auto');
        break;
      case 'rotate':
        await this.pdfViewer.triggerRotation('cw');
        break;
      case 'select':
        await this.pdfViewer.setCursor('select');
        break;
      case 'pan':
        await this.pdfViewer.setCursor('hand');
        break;
    }
  }

  onAnalysisModeChange(mode: 'full' | 'selected' | 'renovation') {
    this.analysisModeChange.emit(mode);
  }

  onStartProject() {
    this.startProject.emit();
  }

  onCancel() {
    this.cancelProject.emit();
  }

  onConfirmAddress() {
    // TODO: Logic to confirm address. Or remove as might not be needed
  }

  confirmAddressAction() {
    if (this.flow.step === 'address') {
      this.addressConfirmed.emit(this.flow.detectedAddress);
    }
  }

  editAddressAction() {
    this.addressEdit.emit();
  }
}
