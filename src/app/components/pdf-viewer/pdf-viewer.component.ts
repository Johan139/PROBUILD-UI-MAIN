import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild, ElementRef, AfterViewInit, HostListener, Renderer2, HostBinding, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { PdfViewerStateService } from '../../services/pdf-viewer-state.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { PdfJsViewerModule, PagesInfo } from 'ng2-pdfjs-viewer';
import Panzoom from '@panzoom/panzoom';
import { PanzoomObject } from '@panzoom/panzoom/dist/src/types';
import { BlueprintOverlayComponent } from '../blueprint-overlay/blueprint-overlay.component';
import { BlueprintAnalysisData } from '../../models/blueprint.model';
import { OverlayStateService } from '../../services/overlay-state.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { v4 as uuidv4 } from 'uuid';

export interface BlueprintDocument {
  name: string; pdfUrl: string; pageImageUrls: string[]; analysisData: { [page: number]: BlueprintAnalysisData }; totalPages: number;
}

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [ CommonModule, MatCardModule, MatButtonModule, MatIconModule, PdfJsViewerModule, BlueprintOverlayComponent, MatButtonToggleModule, MatProgressSpinnerModule, MatTooltipModule, FormsModule ],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnChanges, OnDestroy, AfterViewInit {
  @Input() document: { url: string, name: string } | null = null;
  @Input() blueprints: BlueprintDocument[] = [];
  @ViewChild('viewerContainer') viewerContainer!: ElementRef;
  @ViewChild('panzoomContent') panzoomContent!: ElementRef;
  @ViewChild('pdfViewerCard') pdfViewerCard!: ElementRef;
  @ViewChild('externalPdfViewer') externalPdfViewer: any;

  @Input() selectedBlueprint: BlueprintDocument | null = null;
  @Output() panzoomInstanceCreated = new EventEmitter<PanzoomObject>();
  viewMode: 'pdf' | 'interactive' = 'pdf';
  isBlueprintLoaded = false;
  isImageLoading = false;
  page = 1;
  totalPages = 1;
  currentImageUrl: string | null = null;
  displayedImageUrl: string | null = null;
  imageDimensions: { width: number, height: number } | null = null;
  public panzoomInstance: PanzoomObject | null = null;
  private isResizing = false;
  private lastDownX = 0;
  private windowCounter = 0;
  isPoppedOut = false;
  @HostBinding('class.hidden')
  get isHidden() {
    return !this.isVisible;
  }
  isVisible = true;
  externalWindow = false;
  showPdfViewer = true;
  externalViewerId = '';
  showAdjustmentControls = false;

  constructor(
    public overlayState: OverlayStateService,
    private renderer: Renderer2,
    private router: Router,
    private pdfViewerState: PdfViewerStateService
  ) {
    this.pdfViewerState.isPoppedOut$.subscribe(isPoppedOut => {
      this.isPoppedOut = isPoppedOut;
    });

    this.pdfViewerState.visibility$.subscribe(isVisible => {
      this.isVisible = isVisible;
    });

    this.pdfViewerState.selectedBlueprint$.subscribe(blueprint => {
      if (blueprint) {
        this.selectBlueprint(blueprint);
      }
    });
  }

  get pdfSrc(): string | Blob | Uint8Array {
    return this.selectedBlueprint?.pdfUrl || this.document?.url || '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('PdfViewerComponent: ngOnChanges triggered', changes);
    if (changes['blueprints'] && this.blueprints && this.blueprints.length > 0) {
      console.log('PdfViewerComponent: Blueprints input changed', this.blueprints);
      this.isBlueprintLoaded = true;
      if (this.selectedBlueprint) {
        const currentSelection = this.blueprints.find(b => b.pdfUrl === this.selectedBlueprint?.pdfUrl);
        this.selectBlueprint(currentSelection || this.blueprints[0]);
      } else {
        this.selectBlueprint(this.blueprints[0]);
      }
    } else if (changes['selectedBlueprint'] && this.selectedBlueprint) {
      console.log('PdfViewerComponent: selectedBlueprint input changed', this.selectedBlueprint);
      this.selectBlueprint(this.selectedBlueprint);
    } else if (changes['document'] && this.document) {
      console.log('PdfViewerComponent: Document input changed', this.document);
      this.isBlueprintLoaded = false;
      this.selectedBlueprint = null;
      this.viewMode = 'pdf';
    }
  }

  selectBlueprint(blueprint: BlueprintDocument): void {
    this.selectedBlueprint = blueprint;
    this.totalPages = this.selectedBlueprint.totalPages;
    this.viewMode = 'interactive'; // Default to interactive for blueprints TODO: Maybe change this, can get annoying between toggles
    this.page = 1;
    this.currentImageUrl = this.selectedBlueprint.pageImageUrls[0];
    this.displayedImageUrl = this.currentImageUrl;
    console.log('PdfViewerComponent: Setting blueprint data in overlay state', this.selectedBlueprint.analysisData);
    if (this.selectedBlueprint.analysisData[1]) {
      this.overlayState.setBlueprintData(this.selectedBlueprint.analysisData[1]);
    } else {
      this.overlayState.setBlueprintData(null);
    }
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

    this.hidePageInput();
  }

  ngOnDestroy(): void { this.panzoomInstance?.destroy(); }

  initializePanzoom(): void {
    if (this.panzoomContent?.nativeElement) {
      const elem = this.panzoomContent.nativeElement;
      this.panzoomInstance = Panzoom(elem, { maxScale: 10, minScale: 0.3, canvas: true });
      this.viewerContainer.nativeElement.addEventListener('wheel', this.panzoomInstance.zoomWithWheel);
      this.panzoomInstanceCreated.emit(this.panzoomInstance);
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
        const newPageData = this.selectedBlueprint.analysisData[pageNumber];
        this.overlayState.setBlueprintData(newPageData || null);
      } else {
        // This will trigger the page change in the ng2-pdfjs-viewer
      }
    }
  }

  onImageLoad(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    this.isImageLoading = false;
    this.displayedImageUrl = this.currentImageUrl;
    this.imageDimensions = { width: imgElement.naturalWidth, height: imgElement.naturalHeight };
    console.log('PdfViewerComponent: Image loaded with dimensions', this.imageDimensions);
  }

  onPdfTotalPages(pagesInfo: PagesInfo): void { this.totalPages = pagesInfo.pagesCount; }

  onViewModeChange(newMode: 'pdf' | 'interactive'): void {
    this.viewMode = newMode;
    this.setPage(1);
    if (newMode === 'interactive') {
      this.overlayState.setOverlayVisibility(true);
      if (!this.panzoomInstance) {
        setTimeout(() => this.initializePanzoom(), 0);
      }
    } else if (newMode === 'pdf') {
      this.overlayState.setOverlayVisibility(false);
      // Hide page input when switching to PDF view
      setTimeout(() => this.hidePageInput(), 500);
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
    console.log('PdfViewerComponent: Opening popout...');
    console.log('PdfViewerComponent: Dispatching blueprints to state', this.blueprints);
    console.log('PdfViewerComponent: Dispatching selected blueprint to state', this.selectedBlueprint);
    this.pdfViewerState.setBlueprints(this.blueprints);
    this.pdfViewerState.setSelectedBlueprint(this.selectedBlueprint);
    this.pdfViewerState.setIsPoppedOut(true);

    const tree = this.router.createUrlTree(['/pdf-viewer-popout']);
    const url = `${window.location.origin}${this.router.serializeUrl(tree)}`;
    const features = [
      'noopener', 'noreferrer',
      'width=1200', 'height=900',
      'menubar=no', 'toolbar=no', 'location=no', 'status=no'
    ].join(',');
    const popoutWindow = window.open(url, 'probuild-blueprint-popout', features);

    const checkPopoutClosed = setInterval(() => {
      if (popoutWindow?.closed) {
        clearInterval(checkPopoutClosed);
        this.pdfViewerState.setIsPoppedOut(false);
        // Ensure the main viewer is visible when the pop-out is closed
        if (!this.isVisible) {
          this.pdfViewerState.toggleVisibility();
        }
      }
    }, 1000);
  }

  toggleVisibility(): void {
    this.pdfViewerState.toggleVisibility();
  }

  openInNewTab(): void {
    if (!this.externalPdfViewer) {
      console.error('External PDF viewer not initialized');
      return;
    }

    const pdfUrl = this.selectedBlueprint?.pdfUrl || this.document?.url;

    if (!pdfUrl) {
      console.warn('No PDF URL available to open in new tab');
      return;
    }

    console.log('Opening PDF in new tab with ng2-pdfjs-viewer');

    this.externalViewerId = `external-pdf-viewer-${uuidv4()}`;
    this.externalPdfViewer.pdfSrc = pdfUrl;

    setTimeout(() => {
      this.externalPdfViewer.refresh();
    }, 100);
  }

  private hidePageInput(): void {
    const attemptHide = (retries = 0, maxRetries = 10) => {
      const iframe = document.querySelector('ng2-pdfjs-viewer iframe') as HTMLIFrameElement;
      if (iframe) {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const pageInput = iframeDoc.querySelector('#toolbarViewerLeft .loadingInput.start.toolbarHorizontalGroup');
            if (pageInput) {
              const style = iframeDoc.createElement('style');
              style.textContent = `
                #toolbarViewerLeft .loadingInput.start.toolbarHorizontalGroup {
                  display: none !important;
                }
              `;
              iframeDoc.head.appendChild(style);
              return;
            }
          }
        } catch (e) {
          console.warn('Cannot access PDF viewer iframe (likely CORS issue):', e);
        }
      }

      if (retries < maxRetries) {
        const delay = retries === 0 ? 0 : Math.min(100 * retries, 500);
        setTimeout(() => attemptHide(retries + 1, maxRetries), delay);
      }
    };

    attemptHide();
  }
}
