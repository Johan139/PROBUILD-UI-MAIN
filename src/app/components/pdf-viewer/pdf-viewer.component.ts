import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PdfJsViewerModule, PagesInfo } from 'ng2-pdfjs-viewer';
import Panzoom from '@panzoom/panzoom';
import { PanzoomObject } from '@panzoom/panzoom/dist/src/types';
import { BlueprintOverlayComponent } from '../blueprint-overlay/blueprint-overlay.component';
import { BlueprintAnalysisData } from '../../models/blueprint.model';
import { OverlayStateService } from '../../services/overlay-state.service';

export interface BlueprintDocument {
  name: string; pdfUrl: string; pageImageUrls: string[]; analysisData: BlueprintAnalysisData; totalPages: number;
}

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [ CommonModule, MatCardModule, MatButtonModule, MatIconModule, PdfJsViewerModule, BlueprintOverlayComponent, MatButtonToggleModule, MatProgressSpinnerModule ],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() document: { url: string, name: string } | null = null;
  @Input() blueprints: BlueprintDocument[] = [];
  @ViewChild('viewerContainer') viewerContainer!: ElementRef;
  @ViewChild('panzoomContent') panzoomContent!: ElementRef;
  @ViewChild('pdfViewerCard') pdfViewerCard!: ElementRef;

  selectedBlueprint: BlueprintDocument | null = null;
  viewMode: 'pdf' | 'interactive' = 'pdf';
  isBlueprintLoaded = false;
  isImageLoading = false;
  page = 1;
  totalPages = 1;
  currentImageUrl: string | null = null;
  imageDimensions: { width: number, height: number } | null = null;
  private panzoomInstance: PanzoomObject | null = null;
  private isResizing = false;
  private lastDownX = 0;

  constructor(public overlayState: OverlayStateService, private renderer: Renderer2, private router: Router) {}

  get pdfSrc(): string | Blob | Uint8Array {
    return this.selectedBlueprint?.pdfUrl || this.document?.url || '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['blueprints'] && this.blueprints && this.blueprints.length > 0) {
      this.isBlueprintLoaded = true;
      this.selectBlueprint(this.blueprints[0]);
    } else if (changes['document'] && this.document) {
      this.isBlueprintLoaded = false;
      this.selectedBlueprint = null;
      this.viewMode = 'pdf';
    }
  }

  selectBlueprint(blueprint: BlueprintDocument): void {
    this.selectedBlueprint = blueprint;
    this.totalPages = this.selectedBlueprint.totalPages;
    this.viewMode = 'interactive'; // Default to interactive for blueprints
    this.setPage(1);
    this.overlayState.setBlueprintData(this.selectedBlueprint.analysisData);
  }

  onPdfSelectionChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedPdfUrl = selectElement.value;
    const newSelection = this.blueprints.find(b => b.pdfUrl === selectedPdfUrl);
    if (newSelection) {
      this.selectBlueprint(newSelection);
    }
  }
  ngAfterViewInit(): void {
    if (this.viewMode === 'interactive') {
        this.initializePanzoom();
    }
  }
  ngOnDestroy(): void { this.panzoomInstance?.destroy(); }

  initializePanzoom(): void {
    if (this.panzoomContent?.nativeElement) {
      const elem = this.panzoomContent.nativeElement;
      this.panzoomInstance = Panzoom(elem, { maxScale: 10, minScale: 0.3, canvas: true });
      this.viewerContainer.nativeElement.addEventListener('wheel', this.panzoomInstance.zoomWithWheel);
    }
  }

  setPage(pageNumber: number): void {
    if (pageNumber > 0 && pageNumber <= this.totalPages) {
      this.page = pageNumber;
      if (this.viewMode === 'interactive' && this.selectedBlueprint) {
        this.isImageLoading = true;
        this.imageDimensions = null;
        this.currentImageUrl = this.selectedBlueprint.pageImageUrls[this.page - 1];
        this.panzoomInstance?.reset();
      }
    }
  }

  onImageLoad(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    this.isImageLoading = false;
    this.imageDimensions = { width: imgElement.naturalWidth, height: imgElement.naturalHeight };
  }

  onPdfTotalPages(pagesInfo: PagesInfo): void { this.totalPages = pagesInfo.pagesCount; }

  onViewModeChange(newMode: 'pdf' | 'interactive'): void {
      this.viewMode = newMode;
      this.setPage(1);
      if (newMode === 'interactive') {
          if (!this.panzoomInstance) {
              setTimeout(() => this.initializePanzoom(), 0);
          }
      }
  }

  onResizeStart(event: MouseEvent): void {
    if (!this.pdfViewerCard?.nativeElement) {
      return;
    }
    this.isResizing = true;
    this.lastDownX = event.clientX;
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onResize(event: MouseEvent): void {
    if (!this.isResizing || !this.pdfViewerCard?.nativeElement) {
      return;
    }

    const offset = this.lastDownX - event.clientX;
    const newWidth = this.pdfViewerCard.nativeElement.offsetWidth + offset;

    this.renderer.setStyle(this.pdfViewerCard.nativeElement, 'width', `${newWidth}px`);

    this.lastDownX = event.clientX;
  }

  @HostListener('window:mouseup')
  onResizeEnd(): void {
    this.isResizing = false;
  }

  openPopout(): void {
    const tree = this.router.createUrlTree(['/blueprint-test']);
    const url = `${window.location.origin}${this.router.serializeUrl(tree)}`;
    const features = [
      'noopener', 'noreferrer',
      'width=1200', 'height=900',
      'menubar=no', 'toolbar=no', 'location=no', 'status=no'
    ].join(',');
    window.open(url, 'probuild-blueprint-popout', features);
  }
}
