import { Injectable } from '@angular/core';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { BlueprintDocument } from '../components/pdf-viewer/pdf-viewer.component';

@Injectable({
  providedIn: 'root',
})
export class PdfViewerStateService {
  private isPoppedOutSubject = new BehaviorSubject<boolean>(false);
  isPoppedOut$ = this.isPoppedOutSubject.asObservable();

  private blueprintsSubject = new ReplaySubject<BlueprintDocument[]>(1);
  blueprints$ = this.blueprintsSubject.asObservable();

  private visibilitySubject = new BehaviorSubject<boolean>(true);
  visibility$ = this.visibilitySubject.asObservable();

  private selectedBlueprintSubject =
    new ReplaySubject<BlueprintDocument | null>(1);
  selectedBlueprint$ = this.selectedBlueprintSubject.asObservable();

  setIsPoppedOut(isPoppedOut: boolean): void {
    this.isPoppedOutSubject.next(isPoppedOut);
  }

  setBlueprints(blueprints: BlueprintDocument[]): void {
    // console.log('StateService: Setting blueprints', blueprints);
    this.blueprintsSubject.next(blueprints);
  }

  setSelectedBlueprint(blueprint: BlueprintDocument | null): void {
    // console.log('StateService: Setting selected blueprint', blueprint);
    this.selectedBlueprintSubject.next(blueprint);
  }

  toggleVisibility(): void {
    this.visibilitySubject.next(!this.visibilitySubject.value);
  }
}
