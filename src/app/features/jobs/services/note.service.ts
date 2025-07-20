import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  constructor(
    private httpClient: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  saveNote(
    jobId: string,
    userIds: string,
    subtaskId: string,
    noteText: string,
    createdByUserId: string,
    sessionId: string
  ): Observable<any> {
    const formData = new FormData();
    formData.append('JobId', jobId);
    formData.append('UserIds', userIds);
    formData.append('JobSubtaskId', subtaskId);
    formData.append('NoteText', noteText);
    formData.append('CreatedByUserId', createdByUserId || '');
    formData.append('SessionId', sessionId);

    return this.httpClient
      .post(BASE_URL + '/Jobs/SaveSubtaskNote', formData)
      .pipe(
        tap(() => {
          this.snackBar.open('Note saved successfully!', 'Close', {
            duration: 3000,
            panelClass: ['custom-snackbar'],
          });
        }),
        catchError((err) => {
          this.snackBar.open('Failed to save note. Try again.', 'Close', {
            duration: 4000,
            panelClass: ['custom-snackbar'],
          });
          return of(err);
        })
      );
  }
}
