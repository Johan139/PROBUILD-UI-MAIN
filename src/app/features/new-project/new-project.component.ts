import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Upload, Loader2, MapPin, MousePointer, Hand, ZoomIn, ZoomOut, Maximize2, Ruler, RotateCw, Check } from 'lucide-angular';

// --- Flow State Machine ---
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
    LucideAngularModule
  ],
  templateUrl: './new-project.component.html',
  styleUrls: ['./new-project.component.scss']
})
export class NewProjectComponent implements OnInit {
  Upload = Upload;
  Loader2 = Loader2;
  MapPin = MapPin;
  MousePointer = MousePointer;
  Hand = Hand;
  ZoomIn = ZoomIn;
  ZoomOut = ZoomOut;
  Maximize2 = Maximize2;
  Ruler = Ruler;
  RotateCw = RotateCw;
  Check = Check;
  // --- Brand Colors ---
  BRAND = {
    gray433: '#1E2329',
    gray426: '#2A2F35',
    gray432: '#3B4046',
    grayTooltip: '#6B7280',
    yellow012: '#FCD109',
    yellow120: '#FFE473',
    redWarn: '#F43F5E',
  };

  // --- Component State ---
  darkMode = true;
  flow: FlowState = { step: 'idle' };
  addressField = '21 Featherstone Rd & 21st St, Red Wing';
  zoom = 100;
  metric = true;
  analysisMode: 'full' | 'selected' | 'renovation' = 'full';

  // --- Data ---
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
    { key: 'fit', icon: this.Maximize2, label: 'Fit' },
    { key: 'measure', icon: this.Ruler, label: 'Measure' },
    { key: 'rotate', icon: this.RotateCw, label: 'Rotate' },
  ];

  progressSteps: { k: string, done: boolean }[] = [];
  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor() { }

  ngOnInit(): void {
    this.updateProgressSteps();
  }

  // Type guards for template
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
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.setFlow('uploaded', { fileName: file.name });
    }
  }

  setFlow(step: FlowState['step'], data?: any): void {
    this.flow = { step, ...data };
    this.updateProgressSteps();
  }

  handleToolbarClick(key: string): void {
    if (key === 'zoomin') {
      this.zoom = Math.min(400, this.zoom + 10);
    } else if (key === 'zoomout') {
      this.zoom = Math.max(10, this.zoom - 10);
    } else if (key === 'fit') {
      this.zoom = 100;
    }
  }

  analyze(): void {
    if (this.flow.step === 'idle') return;
    if (this.flow.step === 'uploaded') this.setFlow('extracting', { pct: 5 });
    if (this.flow.step === 'walkthrough') this.setFlow('finalizing', { pct: 5 });
    if (this.flow.step === 'extracting') this.setFlow('address', { detectedAddress: this.addressField });
    if (this.flow.step === 'finalizing') setTimeout(() => this.setFlow('done'), 300);
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
