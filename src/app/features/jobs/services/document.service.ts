import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { JobsService } from '../../../services/jobs.service';
import { environment } from '../../../../environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, tap, timeout } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private documents: any[] = [];
  private documentsError: string | null = null;
  private isDocumentsLoading: boolean = false;
  private documentCache = new Map<number, Blob>();
  private documentListCache = new Map<string, any[]>();

  constructor(
    private httpClient: HttpClient,
    private jobsService: JobsService,
    private snackBar: MatSnackBar,
  ) {}

  fetchDocuments(jobId: string): Observable<any[]> {
    this.isDocumentsLoading = true;
    this.documentsError = null;

    if (this.documentListCache.has(jobId)) {
      this.documents = this.documentListCache.get(jobId)!;
      this.isDocumentsLoading = false;
      return of(this.documents);
    }

    return this.jobsService.getJobDocuments(jobId).pipe(
      map((docs: any[]) => {
        const mappedDocs = docs.map((doc) => ({
          id: doc.id,
          name: doc.fileName || doc.name,
          type: this.getFileType(doc.fileName || doc.name || ''),
          size: doc.size,
        }));
        this.documents = mappedDocs;
        this.documentListCache.set(jobId, mappedDocs);
        this.isDocumentsLoading = false;
        return mappedDocs;
      }),
      catchError((err) => {
        console.error('Error fetching documents:', err);
        this.documentsError = 'Failed to load documents.';
        this.isDocumentsLoading = false;
        return of([]);
      }),
    );
  }

  viewDocument(document: any): void {
    this.jobsService.downloadJobDocument(document.id).subscribe({
      next: (response: Blob) => {
        const blob = new Blob([response], { type: 'application/pdf' }); // Force PDF MIME type
        const url = window.URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');
        if (!newTab) {
          this.snackBar.open(
            'Failed to open document. Please allow pop-ups for this site.',
            'Close',
            { duration: 3000 },
          );
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: (err) => {
        console.error('Error viewing document:', err);
        this.snackBar.open('Failed to view document.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  downloadDocument(doc: any, fileName?: string): void {
    this.jobsService.downloadJobDocument(doc.id).subscribe({
      next: (response: Blob) => {
        const blob = new Blob([response], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = fileName || doc.name || `document-${doc.id}.pdf`;
        link.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: (err) => {
        console.error('Error downloading document:', err);
        this.snackBar.open('Failed to download document.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      default:
        return 'application/octet-stream';
    }
  }

  uploadFile(file: File, jobId: string, sessionId: string): Observable<any> {
    const formData = new FormData();
    formData.append('Blueprint', file);
    formData.append('Title', 'test');
    formData.append('Description', 'tester');
    formData.append('sessionId', sessionId);

    return this.httpClient
      .post<any>(`${BASE_URL}/Jobs/UploadNoteImage`, formData, {
        reportProgress: true,
        observe: 'events',
        headers: new HttpHeaders({ Accept: 'application/json' }),
      })
      .pipe(timeout(300000));
  }

  deleteTemporaryFiles(blobUrls: string[]): Observable<any> {
    if (blobUrls.length === 0) {
      return of(null);
    }
    return this.httpClient.post(`${BASE_URL}/Jobs/DeleteTemporaryFiles`, {
      blobUrls,
    });
  }

  getCachedDocument(documentId: number): Blob | undefined {
    return this.documentCache.get(documentId);
  }

  cacheDocument(documentId: number, blob: Blob): void {
    this.documentCache.set(documentId, blob);
  }
}
