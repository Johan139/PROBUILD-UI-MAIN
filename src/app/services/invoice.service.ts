import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Invoice } from '../models/invoice';

const BASE_URL = environment.BACKEND_URL;

export interface UploadProgress {
    progress: number;
    isUploading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  private apiUrl = `${BASE_URL}/api/invoices`;

  constructor(
    private httpClient: HttpClient,
    private snackBar: MatSnackBar
  ) { }

  uploadInvoice(file: File, jobId: number, amount: number): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('jobId', jobId.toString());
    formData.append('amount', amount.toString());

    const uploadSubject = new Subject<UploadProgress>();

    this.httpClient
      .post<any>(`${this.apiUrl}/upload`, formData, {
        reportProgress: true,
        observe: 'events',
        headers: new HttpHeaders({ Accept: 'application/json' }),
      })
      .pipe(timeout(300000)) // 5-minute timeout
      .subscribe({
        next: (httpEvent) => {
          if (httpEvent.type === HttpEventType.UploadProgress && httpEvent.total) {
            const progress = Math.round((100 * httpEvent.loaded) / httpEvent.total);
            uploadSubject.next({ progress: progress, isUploading: true });
          } else if (httpEvent.type === HttpEventType.Response) {
            this.snackBar.open('Invoice uploaded successfully!', 'Close', { duration: 3000 });
            uploadSubject.next({ progress: 100, isUploading: false });
            uploadSubject.complete();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.handleUploadError(error);
          uploadSubject.next({ progress: 0, isUploading: false });
          uploadSubject.error(error);
        },
      });
      return uploadSubject.asObservable();
  }

  getInvoicesForJob(jobId: number): Observable<Invoice[]> {
    return this.httpClient.get<Invoice[]>(`${this.apiUrl}/job/${jobId}`);
  }

  updateInvoiceStatus(invoiceId: string, status: string): Observable<any> {
    return this.httpClient.put(`${this.apiUrl}/${invoiceId}/status`, { status });
  }

  private handleUploadError(error: HttpErrorResponse): void {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `An error occurred: ${error.error.message}`;
    } else if (error.status === 400) {
      // Bad request from the server
      errorMessage = 'Invalid request. Please check the uploaded file and data.';
    } else if (error.status === 413) {
      // Payload Too Large
      errorMessage = 'The file size is too large. Please upload a smaller file.';
    } else if (error.status === 500) {
      // Internal Server Error
      errorMessage = 'A server error occurred. Please try again later.';
    }

    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
