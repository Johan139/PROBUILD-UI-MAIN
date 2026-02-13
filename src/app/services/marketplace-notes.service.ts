import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type MarketplaceNoteVisibility = 'public' | 'private' | 'team-only';

export interface MarketplaceNote {
  id: number;
  jobId?: number | null;
  tradePackageId?: number | null;
  noteText: string;
  visibility: MarketplaceNoteVisibility;
  createdByUserId: string;
  createdByDisplayName: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateMarketplaceNoteRequest {
  jobId?: number | null;
  tradePackageId?: number | null;
  createdByUserId: string;
  noteText: string;
  visibility: MarketplaceNoteVisibility;
}

export interface UpdateMarketplaceNoteRequest {
  requesterUserId: string;
  noteText: string;
  visibility: MarketplaceNoteVisibility;
}

@Injectable({
  providedIn: 'root',
})
export class MarketplaceNotesService {
  private readonly baseUrl = `${environment.BACKEND_URL}/Notes/marketplace`;

  constructor(private http: HttpClient) {}

  getNotesForContext(
    requesterUserId: string,
    jobId?: number | null,
    tradePackageId?: number | null,
  ): Observable<MarketplaceNote[]> {
    let params = new HttpParams().set('requesterUserId', requesterUserId);

    if (typeof jobId === 'number' && Number.isFinite(jobId) && jobId > 0) {
      params = params.set('jobId', String(jobId));
    }

    if (
      typeof tradePackageId === 'number' &&
      Number.isFinite(tradePackageId) &&
      tradePackageId > 0
    ) {
      params = params.set('tradePackageId', String(tradePackageId));
    }

    return this.http.get<MarketplaceNote[]>(this.baseUrl, { params });
  }

  createNote(payload: CreateMarketplaceNoteRequest): Observable<MarketplaceNote> {
    return this.http.post<MarketplaceNote>(this.baseUrl, payload);
  }

  updateNote(noteId: number, payload: UpdateMarketplaceNoteRequest): Observable<MarketplaceNote> {
    return this.http.put<MarketplaceNote>(`${this.baseUrl}/${noteId}`, payload);
  }

  deleteNote(noteId: number, requesterUserId: string): Observable<void> {
    const params = new HttpParams().set('requesterUserId', requesterUserId);
    return this.http.delete<void>(`${this.baseUrl}/${noteId}`, { params });
  }
}

