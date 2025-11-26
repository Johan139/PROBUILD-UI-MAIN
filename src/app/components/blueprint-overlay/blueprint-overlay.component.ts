import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { OverlayStateService, SelectableElement } from '../../services/overlay-state.service';
import { BlueprintAnalysisData, Point, Room } from '../../models/blueprint.model';

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
  offsetX$: Observable<number>;
  offsetY$: Observable<number>;
  scale$: Observable<number>;

  constructor(public overlayState: OverlayStateService) {
    this.blueprintData$ = this.overlayState.blueprintData$;
    this.selectedElement$ = this.overlayState.selectedElement$;
    this.offsetX$ = this.overlayState.offsetX$;
    this.offsetY$ = this.overlayState.offsetY$;
    this.scale$ = this.overlayState.scale$;
  }

  getPolygonPoints(points: Point[]): string { return points.map(p => `${p.x},${p.y}`).join(' '); }
  getRoomColor(roomId: string): string {
    let hash = 0;
    for (let i = 0; i < roomId.length; i++) { hash = roomId.charCodeAt(i) + ((hash << 5) - hash); }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return "#" + "00000".substring(0, 6 - c.length) + c;
  }
  onElementClick(element: SelectableElement): void { this.overlayState.selectElement(element); }

  onMouseMove(event: MouseEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformedPoint = point.matrixTransform(svg.getScreenCTM()?.inverse());
    this.overlayState.setCursorPosition({ x: Math.round(transformedPoint.x), y: Math.round(transformedPoint.y) });
  }

  public static transformBlueprintData(data: any): BlueprintAnalysisData {
    if (data && data.rooms) {
      data.rooms.forEach((room: Room) => {
        if (room.textLabels && room.textLabels.length > 0) {
          room.name = room.textLabels[0].text.replace('\n', ' ');
        } else {
          room.name = 'Unknown';
        }
        if (room.polygonPoints) {
          room.polygon = room.polygonPoints;
        }
      });
    }
    return data as BlueprintAnalysisData;
  }
}
