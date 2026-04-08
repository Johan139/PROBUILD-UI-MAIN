import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ArchivedItem } from '../../features/archive/archive-items-model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../authentication/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ArchiveService {
  private readonly baseUrl = `${environment.BACKEND_URL}/archive`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /** Get ALL archived items for the current user */
  getArchivedItems(userId: string): Observable<ArchivedItem[]> {
    return this.http.get<ArchivedItem[]>(`${this.baseUrl}?userId=${userId}`);
  }

  /** Restore archived item (type-aware on backend) */
  unarchive(itemId: string, type: ArchivedItem['type']): Observable<void> {
    const userId = this.authService.currentUserSubject.value?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const params = new HttpParams()
      .set('itemId', itemId)
      .set('itemType', type)
      .set('userId', userId);

    return this.http.post<void>(`${this.baseUrl}/unarchive`, null, { params });
  }

  /** Permanently delete archived item */
  delete(itemId: string, type: ArchivedItem['type']): Observable<void> {
    const userId = this.authService.currentUserSubject.value?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const params = new HttpParams()
      .set('itemId', itemId)
      .set('itemType', type)
      .set('userId', userId);

    return this.http.post<void>(`${this.baseUrl}/delete`, null, { params });
  }

  archiveQuoteInvoice(itemId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/archivequoteinvoice?itemId=${itemId}`,
      null,
    );
  }
  archiveJob(jobId: number): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/archiveJob?jobId=${jobId}`,
      null,
    );
  }
  /** Empty entire archive */
  emptyArchive(): Observable<void> {
    const userId = this.authService.currentUserSubject.value?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    const params = new HttpParams().set('userId', userId);
    return this.http.delete<void>(`${this.baseUrl}`, { params });
  }
}
