import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BlueprintAnalysisData, Room, Fixture } from '../models/blueprint.model';

export type SelectableElement = Room | Fixture | null;

@Injectable({ providedIn: 'root' })
export class OverlayStateService {
  private readonly _blueprintData = new BehaviorSubject<BlueprintAnalysisData | null>(null);
  public readonly blueprintData$: Observable<BlueprintAnalysisData | null> = this._blueprintData.asObservable();

  private readonly _isOverlayVisible = new BehaviorSubject<boolean>(true);
  public readonly isOverlayVisible$: Observable<boolean> = this._isOverlayVisible.asObservable();

  private readonly _selectedElement = new BehaviorSubject<SelectableElement>(null);
  public readonly selectedElement$: Observable<SelectableElement> = this._selectedElement.asObservable();

  setBlueprintData(data: BlueprintAnalysisData | null): void { this._blueprintData.next(data); }
  toggleOverlayVisibility(): void { this._isOverlayVisible.next(!this._isOverlayVisible.value); }
  setOverlayVisibility(isVisible: boolean): void { this._isOverlayVisible.next(isVisible); }
  selectElement(element: SelectableElement): void {
    if (this._selectedElement.value?.id === element?.id) {
      this._selectedElement.next(null);
    } else {
      this._selectedElement.next(element);
    }
  }
}

