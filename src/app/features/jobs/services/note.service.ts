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

  approveNote(noteId: number, reason: string): Observable<any> {
    const formData = new FormData();
    formData.append('NoteId', noteId.toString());
    formData.append('Reason', reason);
    return this.httpClient.post(`${BASE_URL}/Jobs/ApproveNote`, formData).pipe(
      tap(() => {
        this.snackBar.open('Note approved successfully!', 'Close', {
          duration: 3000,
        });
      }),
      catchError((err) => {
        this.snackBar.open('Failed to approve note. Please try again.', 'Close', {
          duration: 3000,
        });
        return of(err);
      })
    );
  }

  rejectNote(noteId: number, reason: string): Observable<any> {
    const formData = new FormData();
    formData.append('NoteId', noteId.toString());
    formData.append('Reason', reason);
    return this.httpClient.post(`${BASE_URL}/Jobs/RejectNote`, formData).pipe(
      tap(() => {
        this.snackBar.open('Note rejected successfully!', 'Close', {
          duration: 3000,
        });
      }),
      catchError((err) => {
        this.snackBar.open('Failed to reject note. Please try again.', 'Close', {
          duration: 3000,
        });
        return of(err);
      })
    );
  }

  getArchivedNotes(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/Jobs/notes/archived`).pipe(
      catchError((err) => {
        this.snackBar.open('Failed to fetch archived notes.', 'Close', {
          duration: 3000,
        });
        return of([]);
      })
    );
  }
  
  archiveNote(noteId: number): Observable<any> {
    return this.httpClient.post(`${BASE_URL}/Jobs/notes/${noteId}/archive`, {}).pipe(
      tap(() => {
        this.snackBar.open('Note archived successfully!', 'Close', {
          duration: 3000,
        });
      }),
      catchError((err) => {
        this.snackBar.open('Failed to archive note. Please try again.', 'Close', {
          duration: 3000,
        });
        return of(err);
      })
    );
  }
}
