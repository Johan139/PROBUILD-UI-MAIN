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

  private readonly _offsetX = new BehaviorSubject<number>(0);
  public readonly offsetX$: Observable<number> = this._offsetX.asObservable();
  public get offsetX(): number { return this._offsetX.value; }

  private readonly _offsetY = new BehaviorSubject<number>(0);
  public readonly offsetY$: Observable<number> = this._offsetY.asObservable();
  public get offsetY(): number { return this._offsetY.value; }

  private readonly _scale = new BehaviorSubject<number>(1);
  public readonly scale$: Observable<number> = this._scale.asObservable();
  public get scale(): number { return this._scale.value; }

  private readonly _cursorPosition = new BehaviorSubject<{ x: number; y: number }>({ x: 0, y: 0 });
  public readonly cursorPosition$: Observable<{ x: number; y: number }> = this._cursorPosition.asObservable();

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

  setOffsetX(event: Event | number): void {
    const value = typeof event === 'number' ? event : parseFloat((event.target as HTMLInputElement).value);
    this._offsetX.next(value);
  }

  setOffsetY(event: Event | number): void {
    const value = typeof event === 'number' ? event : parseFloat((event.target as HTMLInputElement).value);
    this._offsetY.next(value);
  }

  setScale(event: Event | number): void {
    const value = typeof event === 'number' ? event : parseFloat((event.target as HTMLInputElement).value);
    this._scale.next(value);
  }
  setCursorPosition(position: { x: number; y: number }): void {
    this._cursorPosition.next(position);
  }
}

