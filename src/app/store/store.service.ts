import { Injectable, Inject, InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

// Define an InjectionToken for the initial state
export const INITIAL_STATE = new InjectionToken<any>('Initial State');

@Injectable({
  providedIn: 'root',
})
export class Store<T> {
  private state$: BehaviorSubject<T>;

  constructor(@Inject(INITIAL_STATE) initialState: T) {
    this.state$ = new BehaviorSubject<T>(initialState);
  }

  // Get the current state
  getState(): T {
    return this.state$.getValue();
  }

  // Select a slice of the state
  select<K>(selector: (state: T) => K): Observable<K> {
    return this.state$.asObservable().pipe(
      map(selector),
      distinctUntilChanged()
    );
  }

  // Update the state
  setState(newState: Partial<T>): void {
    const currentState = this.state$.getValue();
    this.state$.next({
      ...currentState,
      ...newState,
    });
  }

  // Reset the state
  resetState(newState: T): void {
    this.state$.next(newState);
  }
}
