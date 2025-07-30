import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { UploadOptionsDialogComponent } from '../features/jobs/job-quote/upload-options-dialog.component';
import { environment } from '../../environments/environment';

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
    private httpClient: HttpClient
  ) { }

  openUploadOptionsDialog(): Observable<string | undefined> {
    const dialogRef = this.dialog.open(UploadOptionsDialogComponent);
    return dialogRef.afterClosed();
  }

  uploadFiles(files: File[], sessionId: string, title: string = 'test', description: string = 'tester'): Observable<UploadProgress> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('Blueprint', file);
    });

    formData.append('Title', title);
    formData.append('Description', description);
    formData.append('sessionId', sessionId);

    const uploadSubject = new Subject<UploadProgress>();

    this.httpClient
      .post<any>(`${BASE_URL}/Jobs/UploadImage`, formData, {
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
        error: (error) => {
          console.error('Upload error:', error);
          uploadSubject.next({ progress: 0, isUploading: false });
          uploadSubject.error(error);
        },
      });
      return uploadSubject.asObservable();
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
}
