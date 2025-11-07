import { Component, ElementRef, OnInit, ViewChild, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { UploadOptionsDialogComponent } from '../jobs/job-quote/upload-options-dialog.component';
import { LucideAngularModule, Loader, MapPin, MousePointer, Hand, ZoomIn, ZoomOut, Maximize2, Ruler, RotateCw, Check } from 'lucide-angular';
import { DragAndDropDirective } from '../../directives/drag-and-drop.directive';
import { PdfJsViewerModule } from 'ng2-pdfjs-viewer';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

type FlowState =
  | { step: 'idle' }
  | { step: 'uploaded'; fileName: string }
  | { step: 'extracting'; pct: number }
  | { step: 'address'; detectedAddress?: string }
  | { step: 'walkthrough'; index: number; notes: Record<string, string> }
  | { step: 'finalizing'; pct: number }
  | { step: 'done' };

@Component({
  selector: 'app-new-project',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    DragAndDropDirective,
    PdfJsViewerModule
  ],
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.scss']
})
export class NewProjectComponent implements OnInit {
  Loader2 = Loader;
  MapPin = MapPin;
  MousePointer = MousePointer;
  Hand = Hand;
  ZoomIn = ZoomIn;
  ZoomOut = ZoomOut;
  Maximize2 = Maximize2;
  Ruler = Ruler;
  RotateCw = RotateCw;
  Check = Check;

  BRAND = {
    gray433: '#1E2329',
    gray426: '#2A2F35',
    gray432: '#3B4046',
    grayTooltip: '#6B7280',
    yellow012: '#FCD109',
    yellow120: '#FFE473',
    redWarn: '#F43F5E',
  };

  darkMode = true;
  flow: FlowState = { step: 'idle' };
  addressField = '21 Featherstone Rd & 21st St, Red Wing';
  zoom = 1; // Start at 100%
  metric = true;
  analysisMode: 'full' | 'selected' | 'renovation' = 'full';

  uploadedFiles: File[] = [];
  selectedFile: File | null = null;
  pdfSrc: string | Uint8Array | null = null;

  SECTION_ORDER = [
    { key: 'Foundation', color: '#22C55E' },
    { key: 'Walls', color: '#60A5FA' },
    { key: 'Roof', color: '#F87171' },
    { key: 'Kitchen', color: '#F59E0B' },
  ];

  HIGHLIGHTS: Record<string, { left: string; top: string; w: string; h: string }> = {
    Foundation: { left: '10%', top: '60%', w: '80%', h: '30%' },
    Walls: { left: '12%', top: '20%', w: '76%', h: '55%' },
    Roof: { left: '8%', top: '10%', w: '84%', h: '40%' },
    Kitchen: { left: '55%', top: '35%', w: '25%', h: '20%' },
  };

  defaultDesc: Record<string, string> = {
    Foundation: 'Concrete slab with Class-III vapor barrier, #4 rebar @ 12" O.C., 25 MPa concrete, perimeter insulation as per climate zone.',
    Walls: 'Exterior 2x6 studs @ 16" O.C., R-21 insulation, sheathing + weather barrier, selected cladding; interior 2x4 @ 16" O.C.',
    Roof: 'Timber trusses, 30-year shingles, underlayment, drip edge, ridge vent; R-38 attic insulation.',
    Kitchen: 'Base & wall cabinets, soft-close hardware, quartz/granite tops, undermount sink, appliance allowances.',
  };

  rightToolbarButtons = [
    { key: 'select', icon: this.MousePointer, label: 'Select' },
    { key: 'pan', icon: this.Hand, label: 'Pan' },
    { key: 'zoomin', icon: this.ZoomIn, label: 'Zoom In' },
    { key: 'zoomout', icon: this.ZoomOut, label: 'Zoom Out' },
    { key: 'fit', icon: this.Maximize2, label: 'Fit to Page' },
    { key: 'measure', icon: this.Ruler, label: 'Measure', disabled: true }, // TODO: Reenable when interactive blueprint implemented
    { key: 'rotate', icon: this.RotateCw, label: 'Rotate' },
  ];

  progressSteps: { k: string, done: boolean }[] = [];
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('pdfViewer') pdfViewer: any;

  constructor(public dialog: MatDialog, private renderer: Renderer2) { }

  ngOnInit(): void {
    this.updateProgressSteps();
  }

  isUploaded(flow: FlowState): flow is Extract<FlowState, { step: 'uploaded' }> {
    return flow.step === 'uploaded';
  }

  isExtracting(flow: FlowState): flow is Extract<FlowState, { step: 'extracting' }> {
    return flow.step === 'extracting';
  }

  isAddress(flow: FlowState): flow is Extract<FlowState, { step: 'address' }> {
    return flow.step === 'address';
  }

  isWalkthrough(flow: FlowState): flow is Extract<FlowState, { step: 'walkthrough' }> {
    return flow.step === 'walkthrough';
  }

  isFinalizing(flow: FlowState): flow is Extract<FlowState, { step: 'finalizing' }> {
    return flow.step === 'finalizing';
  }

  get currentKey(): string {
    if (this.isWalkthrough(this.flow)) {
      return this.SECTION_ORDER[this.flow.index].key;
    }
    return 'Foundation';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.onFileDropped(input.files);
    }
  }

  onFileDropped(files: FileList): void {
    if (files && files.length > 0) {
      this.uploadedFiles = Array.from(files);
      this.selectedFile = this.uploadedFiles[0];
      this.setFlow('uploaded', { fileName: this.selectedFile.name });
      this.displayPdf(this.selectedFile);
    }
  }

  onPdfSelectionChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedFileName = selectElement.value;
    const newSelection = this.uploadedFiles.find(f => f.name === selectedFileName);
    if (newSelection) {
      this.selectedFile = newSelection;
      this.displayPdf(this.selectedFile);
    }
  }

  displayPdf(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        this.pdfSrc = new Uint8Array(reader.result as ArrayBuffer);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  openUploadDialog(): void {
    const dialogRef = this.dialog.open(UploadOptionsDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result === 'folder') {
          this.renderer.setAttribute(this.fileInput.nativeElement, 'webkitdirectory', 'true');
        } else {
          this.renderer.removeAttribute(this.fileInput.nativeElement, 'webkitdirectory');
        }
        this.fileInput.nativeElement.click();
      }
    });
  }

  setFlow(step: FlowState['step'], data?: any): void {
    this.flow = { step, ...data };
    this.updateProgressSteps();
  }

  async handleToolbarClick(key: string): Promise<void> {
    if (!this.pdfViewer) {
      return;
    }

    switch (key) {
      case 'zoomin':
        this.zoom = Math.min(4, this.zoom + 0.25); // Max zoom 400%
        await this.pdfViewer.setZoom(this.zoom);
        break;
      case 'zoomout':
        this.zoom = Math.max(0.25, this.zoom - 0.25); // Min zoom 25%
        await this.pdfViewer.setZoom(this.zoom);
        break;
      case 'fit':
        this.zoom = 1; // Reset to 100%
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

  analyze(): void {
    if (this.flow.step === 'idle') return;
    if (this.flow.step === 'uploaded') this.setFlow('extracting', { pct: 5 });
    if (this.flow.step === 'walkthrough') this.setFlow('finalizing', { pct: 5 });
    if (this.flow.step === 'extracting') this.setFlow('address', { detectedAddress: this.addressField });
    if (this.flow.step === 'finalizing') setTimeout(() => this.setFlow('done'), 300);
  }

  cancel(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.setFlow('idle');
        this.uploadedFiles = [];
        this.selectedFile = null;
        this.pdfSrc = null;
      }
    });
  }

  viewUploadedFiles(): void {
    alert('Open files drawer (stub)');
  }

  nextStep(): void {
    if (this.flow.step === 'walkthrough') {
      if (this.flow.index < this.SECTION_ORDER.length - 1) {
        this.setFlow('walkthrough', { ...this.flow, index: this.flow.index + 1 });
      } else {
        this.setFlow('finalizing', { pct: 5 });
      }
    }
  }

  getPlaceholder(key: string): string {
    switch (key) {
      case 'Kitchen':
        return 'e.g., Solid wood fronts, granite top, matte black hardware';
      case 'Foundation':
        return 'e.g., Increase rebar density; add waterproofing membrane';
      default:
        return 'e.g., Switch to light-gauge steel; adjust sheathing';
    }
  }

  updateProgressSteps(): void {
    this.progressSteps = [
      { k: 'Upload', done: this.flow.step !== 'idle' },
      { k: 'Extract', done: ['extracting', 'address', 'walkthrough', 'finalizing', 'done'].includes(this.flow.step) },
      { k: 'Address', done: ['address', 'walkthrough', 'finalizing', 'done'].includes(this.flow.step) },
      { k: 'Walkthrough', done: ['walkthrough', 'finalizing', 'done'].includes(this.flow.step) },
      { k: 'Finalize', done: ['finalizing', 'done'].includes(this.flow.step) },
    ];
  }
}
