import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PdfJsViewerModule, PagesInfo } from 'ng2-pdfjs-viewer';
import Panzoom from '@panzoom/panzoom';
import { PanzoomObject } from '@panzoom/panzoom/dist/src/types';
import { BlueprintOverlayComponent } from '../blueprint-overlay/blueprint-overlay.component'; // Adjust path
import { BlueprintAnalysisData } from '../../models/blueprint.model'; // Adjust path
import { OverlayStateService } from '../../services/overlay-state.service'; // Adjust path

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

  selectedBlueprint: BlueprintDocument | null = null;
  viewMode: 'pdf' | 'interactive' = 'pdf';
  isBlueprintLoaded = false;
  isImageLoading = false;
  page = 1;
  totalPages = 1;
  currentImageUrl: string | null = null;
  imageDimensions: { width: number, height: number } | null = null;
  private panzoomInstance: PanzoomObject | null = null;

  constructor(public overlayState: OverlayStateService) {}

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
}
