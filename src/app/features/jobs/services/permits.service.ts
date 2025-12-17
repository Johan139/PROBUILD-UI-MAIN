import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Permit } from '../../../models/permit';

const BASE_URL = `${environment.BACKEND_URL}/Permits`;

@Injectable({
  providedIn: 'root',
})
export class PermitsService {
  constructor(private httpClient: HttpClient) {}

  getPermits(jobId: number): Observable<Permit[]> {
    return this.httpClient.get<Permit[]>(`${BASE_URL}/job/${jobId}`);
  }

  savePermit(permit: Permit): Observable<Permit> {
    return this.httpClient.post<Permit>(BASE_URL, permit);
  }

  savePermitsBatch(permits: Permit[]): Observable<Permit[]> {
    return this.httpClient.post<Permit[]>(`${BASE_URL}/batch`, permits);
  }

  updatePermit(permit: Permit): Observable<void> {
    return this.httpClient.put<void>(`${BASE_URL}/${permit.id}`, permit);
  }

  deletePermit(id: number): Observable<void> {
    return this.httpClient.delete<void>(`${BASE_URL}/${id}`);
  }

  uploadPermitDocument(
    file: File,
    permitId: number,
    sessionId: string,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    return this.httpClient.post(
      `${BASE_URL}/${permitId}/upload`,
      formData,
    );
  }
}
