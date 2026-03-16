import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { BudgetLineItem } from '../../../models/budget-line-item.model';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private apiUrl = `${environment.BACKEND_URL}/budget`;

  private readonly budgetByJobCacheTtlMs = 15 * 1000;
  private budgetByJobCache = new Map<
    number,
    { cachedAt: number; request$: Observable<BudgetLineItem[]> }
  >();

  constructor(private http: HttpClient) {}

  getBudget(jobId: number): Observable<BudgetLineItem[]> {
    const key = Number(jobId);
    const now = Date.now();
    const cached = this.budgetByJobCache.get(key);
    if (cached && now - cached.cachedAt < this.budgetByJobCacheTtlMs) {
      return cached.request$;
    }

    const request$ = this.http
      .get<BudgetLineItem[]>(`${this.apiUrl}/${jobId}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.budgetByJobCache.set(key, { cachedAt: now, request$ });
    return request$;
  }

  addBudgetItem(item: BudgetLineItem): Observable<BudgetLineItem> {
    return this.http.post<BudgetLineItem>(this.apiUrl, item);
  }

  addBudgetItemsBatch(items: BudgetLineItem[]): Observable<BudgetLineItem[]> {
    return this.http.post<BudgetLineItem[]>(`${this.apiUrl}/batch`, items);
  }

  updateBudgetItem(
    id: number,
    item: BudgetLineItem,
  ): Observable<BudgetLineItem> {
    return this.http.put<BudgetLineItem>(`${this.apiUrl}/${id}`, item);
  }

  deleteBudgetItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  syncBudget(jobId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/sync`, {});
  }
}
