import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { QuoteDto, QuoteViewDto } from './quote.model';
import { AuthService } from '../../authentication/auth.service';
import { environment } from '../../../environments/environment';
export interface SendToClientRequest {
  quoteId: string;
  clientEmail: string;
  clientName?: string;
  personalMessage?: string;
  attachPdf?: boolean;
}

export interface SendToClientResponse {
  success: boolean;
  message: string;
  quoteId: string;
  status: string;
}
@Injectable({ providedIn: 'root' })
export class QuoteService {
  private apiUrl = `${environment.BACKEND_URL}/quotes`;

  constructor(private http: HttpClient) {}

  saveDraft(dto: QuoteDto) {
    console.log(dto);
    return this.http.post<{ quoteId: string; version: number }>(
      `${this.apiUrl}/draft`,
      dto,
    );
  }

  submitQuote(quoteId: string) {
    return this.http.post<void>(`${this.apiUrl}/${quoteId}/submit`, {});
  }

  getQuote(quoteId: string) {
    return this.http.get<QuoteViewDto>(`${this.apiUrl}/${quoteId}`);
  }

  changeStatus(quoteId: string, status: string) {
    return this.http.post<void>(
      `${this.apiUrl}/${quoteId}/status`,
      JSON.stringify(status),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  getUserQuotes(userId: string) {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}`);
  }

  sendToClient(request: SendToClientRequest): Observable<SendToClientResponse> {
    return this.http
      .post<SendToClientResponse>(
        `${this.apiUrl}/${request.quoteId}/send-to-client`,
        request,
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Error sending quote to client:', error);
          return throwError(
            () =>
              new Error(
                error.error?.message || 'Failed to send quote to client',
              ),
          );
        }),
      );
  }

  /**
   * Resend a quote that was already sent
   */
  resendToClient(
    quoteId: string,
    clientEmail: string,
    personalMessage?: string,
  ): Observable<SendToClientResponse> {
    return this.sendToClient({
      quoteId,
      clientEmail,
      personalMessage,
    });
  }
}
