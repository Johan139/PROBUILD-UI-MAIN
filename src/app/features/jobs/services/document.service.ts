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

  constructor(
    private httpClient: HttpClient,
    private jobsService: JobsService,
    private snackBar: MatSnackBar
  ) {}

  fetchDocuments(jobId: string): Observable<any[]> {
    this.isDocumentsLoading = true;
    this.documentsError = null;
    return this.jobsService.getJobDocuments(jobId).pipe(
      tap((docs: any[]) => {
        this.documents = docs.map((doc) => ({
          id: doc.id,
          name: doc.fileName,
          type: this.getFileType(doc.fileName),
          size: doc.size,
        }));
        this.isDocumentsLoading = false;
      }),
      catchError((err) => {
        console.error('Error fetching documents:', err);
        this.documentsError = 'Failed to load documents.';
        this.isDocumentsLoading = false;
        return of([]);
      })
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
            { duration: 3000 }
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

  uploadFile(
    file: File,
    jobId: string,
    sessionId: string
  ): Observable<any> {
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
}
