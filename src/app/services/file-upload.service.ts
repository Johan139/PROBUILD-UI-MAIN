import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { UploadOptionsDialogComponent } from '../features/jobs/job-quote/upload-options-dialog.component';
import { environment } from '../../environments/environment';
import { DocumentsDialogComponent } from '../shared/dialogs/documents-dialog/documents-dialog.component';
import { JobDocument } from '../models/JobDocument';

const BASE_URL = environment.BACKEND_URL;

export interface UploadedFileInfo {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface UploadProgress {
    progress: number;
    isUploading: boolean;
    files?: UploadedFileInfo[];
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {

  constructor(
    private dialog: MatDialog,
    private httpClient: HttpClient,
    private snackBar: MatSnackBar
  ) { }

  openUploadOptionsDialog(): Observable<string | undefined> {
    const dialogRef = this.dialog.open(UploadOptionsDialogComponent);
    return dialogRef.afterClosed();
  }

  uploadFiles(files: File[], sessionId: string, conversationId?: string): Observable<UploadProgress> {
    const formData = new FormData();
    files.forEach(file => {
        const key = conversationId ? 'files' : 'Blueprint';
        formData.append(key, file);
    });

    let url = `${BASE_URL}/Jobs/UploadImage`;
    if (conversationId) {
        url = `${BASE_URL}/Chat/${conversationId}/upload`;
    } else {
        formData.append('sessionId', sessionId);
    }

    const uploadSubject = new Subject<UploadProgress>();

    this.httpClient
      .post<any>(url, formData, {
        reportProgress: true,
        observe: 'events',
        headers: new HttpHeaders({ Accept: 'application/json' }),
      })
      .pipe(timeout(300000))
      .subscribe({
        next: (httpEvent) => {
          if (httpEvent.type === HttpEventType.UploadProgress && httpEvent.total) {
            const progress = Math.round((100 * httpEvent.loaded) / httpEvent.total);
            uploadSubject.next({ progress: progress, isUploading: true });
          } else if (httpEvent.type === HttpEventType.Response) {
            let newFileInfos: UploadedFileInfo[] = [];
            if (httpEvent.body?.fileUrls && httpEvent.body.fileUrls.length > 0) {
              newFileInfos = httpEvent.body.fileUrls.map((url: string, index: number) => {
                const file = files[index];
                return {
                  name: file.name,
                  url: url,
                  type: file.type || this.getFileType(file.name),
                  size: file.size,
                };
              });
            } else {
               console.error('No fileUrls returned in response:', httpEvent.body);
            }
            uploadSubject.next({ progress: 100, isUploading: false, files: newFileInfos });
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


  private handleUploadError(error: HttpErrorResponse): void {
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (error.error instanceof ErrorEvent) {
      // Client-side or network error
      errorMessage = `An error occurred: ${error.error.message}`;
    } else if (error.status === 400) {
      // Bad request from the server
      if (error.error && typeof error.error.error === 'string') {
        errorMessage = error.error.error;
      } else {
        errorMessage = 'Invalid request. Please check the uploaded files.';
      }
    } else if (error.status === 413) {
      // Payload Too Large
      errorMessage = 'The file size exceeds the 200MB limit. Please upload a smaller file.';
    } else if (error.status === 500) {
      // Internal Server Error
      errorMessage = 'A server error occurred. Please try again later.';
    }

    this.snackBar.open(errorMessage, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'application/pdf';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'docx':
      case 'doc': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx':
      case 'xls': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default: return 'application/octet-stream';
    }
  }
  viewUploadedFiles(documents: JobDocument[]): void {
    const dialogRef = this.dialog.open(DocumentsDialogComponent, {
      width: '800px',
      data: { documents }
    });


    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }

  getUploadedFileNames(uploadedFileInfos: UploadedFileInfo[]): string {
    return uploadedFileInfos.map(file => file.name).join(', ');
  }
}
