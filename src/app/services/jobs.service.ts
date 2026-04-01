import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

const BASE_URL = `${environment.BACKEND_URL}/Jobs`;

export interface UploadThumbnailResponse {
  thumbnailUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class JobsService {
  private jobQuote: any;

  private readonly bomCacheTtlMs = 15 * 1000;
  private bomCache = new Map<string, { cachedAt: number; request$: Observable<any> }>();

  private readonly bomStatusCacheTtlMs = 5 * 1000;
  private bomStatusCache = new Map<
    string,
    { cachedAt: number; request$: Observable<any> }
  >();

  private readonly jobDetailsCacheTtlMs = 30 * 1000;
  private jobDetailsCache = new Map<
    string,
    { cachedAt: number; request$: Observable<any> }
  >();

  constructor(private httpClient: HttpClient) {}

  createJob(jobForm: any, addressModel: any) {
    return this.httpClient.post(`${BASE_URL}/Jobs`, {
      job: jobForm,
      address: addressModel,
    });
  }

  updateJob(jobData: any, id: any): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    const payload = { ...jobData };
    delete payload.Blueprint;
    delete payload.UserContextFile;

    // console.log('Final payload being sent:', JSON.stringify(payload, null, 2));
    return this.httpClient.post<any>(`${BASE_URL}/${id}`, payload, { headers });
  }

  getAllJobsByUserId(userId: string): Observable<any> {
    return this.httpClient.get(BASE_URL + '/userId/' + userId, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getAssignedJobsForTeamMember(userId: string): Observable<any> {
    return this.httpClient.get(
      `${environment.BACKEND_URL}/Jobs/assigned/${userId}`,
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  getAssignedJobs(userId: string): Observable<any> {
    return this.httpClient.get(
      `${environment.BACKEND_URL}/JobAssignment/GetAssignedUsers/${userId}`,
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  getSubtasks(jobId: number) {
    return this.httpClient.get<any[]>(`${BASE_URL}/subtasks/${jobId}`);
  }

  downloadJobDocument(documentId: number): Observable<Blob> {
    return this.httpClient.get(`${BASE_URL}/download/${documentId}`, {
      responseType: 'blob',
    });
  }

  downloadJobDocumentFile(fileUrl: string): Observable<Blob> {
    return this.httpClient.get(`${BASE_URL}/downloadFile?fileUrl=` + fileUrl, {
      responseType: 'blob',
    });
  }

  getJobDocuments(jobId: string): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/documents/` + jobId);
  }

  getAllJobs(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/public`);
  }

  getBiddedJobs(userId: string): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/bidded/${userId}`);
  }

  saveSubtasks(subtaskList: any[], userId: string | null): Observable<any> {
    return this.httpClient.post(
      `${BASE_URL}/subtask`,
      { subtasks: subtaskList, userId: userId },
      {
        headers: { 'Content-Type': 'application/json' },
        responseType: 'text' as 'json',
      },
    );
  }

  getJobSubtasks(jobId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/subtasks/${jobId}`);
  }

  getSpecificJob(jobId: any): Observable<any> {
    const key = String(jobId);
    const now = Date.now();
    const cached = this.jobDetailsCache.get(key);
    if (cached && now - cached.cachedAt < this.jobDetailsCacheTtlMs) {
      return cached.request$;
    }

    const request$ = this.httpClient
      .get(BASE_URL + '/Id/' + jobId)
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.jobDetailsCache.set(key, { cachedAt: now, request$ });
    return request$;
  }

  GetBillOfMaterials(jobId: any): Observable<any> {
    const key = String(jobId);
    const now = Date.now();
    const cached = this.bomCache.get(key);
    if (cached && now - cached.cachedAt < this.bomCacheTtlMs) {
      return cached.request$;
    }

    const request$ = this.httpClient
      .get(BASE_URL + '/processing-results/' + jobId)
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.bomCache.set(key, { cachedAt: now, request$ });
    return request$;
  }

  GetBillOfMaterialsStatus(jobId: any): Observable<any> {
    const key = String(jobId);
    const now = Date.now();
    const cached = this.bomStatusCache.get(key);
    if (cached && now - cached.cachedAt < this.bomStatusCacheTtlMs) {
      return cached.request$;
    }

    const request$ = this.httpClient
      .get(BASE_URL + '/processing-status/' + jobId)
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    this.bomStatusCache.set(key, { cachedAt: now, request$ });
    return request$;
  }

  setJobCard(jobForm: any) {
    this.jobQuote = jobForm;
  }

  getJobCard() {
    return this.jobQuote;
  }

  archiveJob(jobId: number): Observable<void> {
    return this.httpClient.put<void>(`${BASE_URL}/${jobId}/archive`, {});
  }

  deleteJob(jobId: number): Observable<void> {
    return this.httpClient.delete<void>(`${BASE_URL}/${jobId}`);
  }

  getArchivedJobs(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/archived`);
  }
  getArchivedJobsByUserId(userId: string): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/archivedbyuserid/${userId}`);
  }
  getDashboardJobs(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/dashboard`);
  }

  getUserDashboard(userId: string): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/user-dashboard/${userId}`);
  }

  uploadJobThumbnail(
    jobId: number,
    file: File,
  ): Observable<UploadThumbnailResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post<UploadThumbnailResponse>(
      `${BASE_URL}/${jobId}/thumbnail`,
      formData,
    );
  }

  getClientDetails(jobId: number): Observable<any> {
    return this.httpClient.get<any>(`${BASE_URL}/${jobId}/client-details`);
  }

  updateClientDetails(jobId: number, details: any): Observable<any> {
    return this.httpClient.put<any>(
      `${BASE_URL}/${jobId}/client-details`,
      details,
    );
  }

  updateJobStatus(jobId: number, status: string): Observable<any> {
    return this.httpClient.put<any>(`${BASE_URL}/${jobId}/status`, { status });
  }

  getPlanningData(jobId: number): Observable<any> {
    return this.httpClient.get<any>(`${BASE_URL}/${jobId}/planning-data`);
  }
}
