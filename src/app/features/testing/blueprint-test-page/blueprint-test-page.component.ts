import { Component, OnInit, OnDestroy } from '@angular/core';
import { PdfViewerStateService } from '../../../services/pdf-viewer-state.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { PdfViewerComponent, BlueprintDocument } from '../../../components/pdf-viewer/pdf-viewer.component';
import { BlueprintOverlayComponent } from '../../../components/blueprint-overlay/blueprint-overlay.component';
import * as hernandezWallPlanAnalysisData from '../../../../assets/sample-pdfs/json/hernandez_wall_plan_and_frame_plan.json';
import * as hernandezCdPage1 from '../../../../assets/sample-pdfs/json/hernandez_cd/1.json';
import * as hernandezCdPage2 from '../../../../assets/sample-pdfs/json/hernandez_cd/2.json';
import * as hernandezCdPage3 from '../../../../assets/sample-pdfs/json/hernandez_cd/3.json';
import * as hernandezCdPage4 from '../../../../assets/sample-pdfs/json/hernandez_cd/4.json';
import * as hernandezCdPage5 from '../../../../assets/sample-pdfs/json/hernandez_cd/5.json';
import * as hernandezCdPage6 from '../../../../assets/sample-pdfs/json/hernandez_cd/6.json';
import * as hernandezCdPage7 from '../../../../assets/sample-pdfs/json/hernandez_cd/7.json';

@Component({
    selector: 'app-blueprint-test-page',
    standalone: true,
    imports: [CommonModule, PdfViewerComponent],
    templateUrl: './blueprint-test-page.component.html',
    styleUrls: ['./blueprint-test-page.component.scss']
})
export class BlueprintTestPageComponent implements OnInit, OnDestroy {
  blueprints: BlueprintDocument[] = [];
  isPoppedOut = false;
  isViewerVisible = true;
  private popoutSubscription!: Subscription;
  private visibilitySubscription!: Subscription;

  constructor(private pdfViewerState: PdfViewerStateService) {}

  ngOnInit(): void {
    this.blueprints = [
      {
        name: 'Hernandez Residence CDs',
        pdfUrl: '/assets/sample-pdfs/hernandez_cd.pdf',
        pageImageUrls: [
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-1.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-2.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-3.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-4.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-5.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-6.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-7.png'
        ],
        analysisData: {
          1: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage1),
          2: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage2),
          3: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage3),
          4: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage4),
          5: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage5),
          6: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage6),
          7: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage7)
        },
        totalPages: 7
      },
      {
        name: 'Hernandez Wall Plan and Frame Plan',
        pdfUrl: '/assets/sample-pdfs/hernandez_wall_plan_and_frame_plan.pdf',
        pageImageUrls: [
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-1.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-2.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-3.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-4.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-5.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-6.png'
        ],
        analysisData: { 1: BlueprintOverlayComponent.transformBlueprintData(hernandezWallPlanAnalysisData) },
        totalPages: 6
      }
    ];

    this.popoutSubscription = this.pdfViewerState.isPoppedOut$.subscribe(isPoppedOut => {
      this.isPoppedOut = isPoppedOut;
    });

    this.visibilitySubscription = this.pdfViewerState.visibility$.subscribe(isVisible => {
      this.isViewerVisible = isVisible;
    });
  }


  ngOnDestroy(): void {
    if (this.popoutSubscription) {
      this.popoutSubscription.unsubscribe();
    }
    if (this.visibilitySubscription) {
      this.visibilitySubscription.unsubscribe();
    }
  }
}
