import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Quote } from './quote.model';
import { AuthService } from '../../authentication/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class QuoteService {
  private apiUrl = `${environment.BACKEND_URL}/quotes`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  saveQuote(quote: Quote): Observable<Quote> {
    // console.log('Saving quote to:', this.apiUrl, 'with data:', quote);
    return this.http
      .post<Quote>(this.apiUrl, quote, { headers: this.getHeaders() })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error saving quote:', error);
          return throwError(() => new Error('Failed to save quote data.'));
        }),
      );
  }

  getQuote(id: string): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/GetQuote/${id}`, { headers: this.getHeaders() })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error loading quote:', error);
          return throwError(() => new Error('Failed to load quote data.'));
        }),
      );
  }

  getAllQuotes(): Observable<Quote[]> {
    const userId = this.authService.currentUserSubject.value?.id;
    return this.http
      .get<
        Quote[]
      >(`${this.apiUrl}/GetQuotes/${userId}`, { headers: this.getHeaders() })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error fetching quotes:', error);
          return throwError(() => new Error('Failed to fetch quotes.'));
        }),
      );
  }

  updateQuote(quote: Quote): Observable<Quote> {
    // console.log('Updating quote at:', `${this.apiUrl}/${quote.id}`, 'with data:', quote);
    return this.http
      .post<Quote>(`${this.apiUrl}/UpdateQuote/${quote.id}`, quote, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error updating quote:', error);
          return throwError(() => new Error('Failed to update quote data.'));
        }),
      );
  }

  getJobQuotes(jobId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/GetJobQuotes/${jobId}`);
  }

  getQuotesByUser(userId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/GetJobQuotesByUserId/${userId}`,
    );
  }

  saveQuoteWithVersion(quote: Quote): Observable<Quote> {
    return this.http.post<Quote>(`${this.apiUrl}/SaveQuoteWithVersion`, quote);
  }

  changeStatus(quoteId: string, newStatus: string): Observable<Quote> {
    return this.http.post<Quote>(
      `${this.apiUrl}/ChangeStatus/${quoteId}`,
      JSON.stringify(newStatus), // Important: serialize the string
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
