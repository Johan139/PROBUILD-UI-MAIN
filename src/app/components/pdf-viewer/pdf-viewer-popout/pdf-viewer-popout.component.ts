import { Component, OnInit, OnDestroy } from '@angular/core';
import { PdfViewerComponent } from '../pdf-viewer.component';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BlueprintDocument } from '../pdf-viewer.component';
import { PdfViewerStateService } from '../../../services/pdf-viewer-state.service';

@Component({
    selector: 'app-pdf-viewer-popout',
    standalone: true,
    imports: [CommonModule, PdfViewerComponent],
    template: `
    <div class="popout-container">
      <app-pdf-viewer [blueprints]="blueprints" [selectedBlueprint]="selectedBlueprint"></app-pdf-viewer>
    </div>
  `,
    styles: [`
    .popout-container {
      width: 100vw;
      height: 100vh;
    }
  `]
})
export class PdfViewerPopoutComponent implements OnInit, OnDestroy {
  blueprints: BlueprintDocument[] = [];
  selectedBlueprint: BlueprintDocument | null = null;
  private stateSubscription!: Subscription;

  constructor(private pdfViewerState: PdfViewerStateService) {}

  ngOnInit(): void {
    // console.log('PopoutComponent: ngOnInit');
    this.stateSubscription = new Subscription();
    this.stateSubscription.add(
      this.pdfViewerState.blueprints$.subscribe(blueprints => {
        // console.log('PopoutComponent: Received blueprints from state', blueprints);
        this.blueprints = blueprints;
      })
    );
    this.stateSubscription.add(
      this.pdfViewerState.selectedBlueprint$.subscribe(blueprint => {
        // console.log('PopoutComponent: Received selected blueprint from state', blueprint);
        this.selectedBlueprint = blueprint;
      })
    );
  }

  ngOnDestroy(): void {
    if (this.stateSubscription) {
      this.stateSubscription.unsubscribe();
    }
  }
}
