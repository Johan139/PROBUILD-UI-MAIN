import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BudgetLineItem } from '../../../models/budget-line-item.model';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private apiUrl = `${environment.BACKEND_URL}/budget`;

  constructor(private http: HttpClient) {}

  getBudget(jobId: number): Observable<BudgetLineItem[]> {
    return this.http.get<BudgetLineItem[]>(`${this.apiUrl}/${jobId}`);
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
