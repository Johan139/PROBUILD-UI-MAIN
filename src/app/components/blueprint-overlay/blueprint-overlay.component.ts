import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { OverlayStateService, SelectableElement } from '../../services/overlay-state.service';
import { BlueprintAnalysisData, Point } from '../../models/blueprint.model';

@Component({
  selector: 'app-blueprint-overlay',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './blueprint-overlay.component.html',
  styleUrls: ['./blueprint-overlay.component.scss']
})
export class BlueprintOverlayComponent {
  @Input() imageDimensions!: { width: number; height: number; };

  blueprintData$: Observable<BlueprintAnalysisData | null>;
  selectedElement$: Observable<SelectableElement>;

  constructor(public overlayState: OverlayStateService) {
    this.blueprintData$ = this.overlayState.blueprintData$;
    this.selectedElement$ = this.overlayState.selectedElement$;
  }

  getPolygonPoints(points: Point[]): string { return points.map(p => `${p.x},${p.y}`).join(' '); }
  getRoomColor(roomId: string): string {
    let hash = 0;
    for (let i = 0; i < roomId.length; i++) { hash = roomId.charCodeAt(i) + ((hash << 5) - hash); }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
  }
  onElementClick(element: SelectableElement): void { this.overlayState.selectElement(element); }
}
