import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type EmailLogStatus =
  | 'processed'
  | 'sent'
  | 'delivered'
  | 'deferred'
  | 'bounce'
  | 'dropped'
  | 'spamreport'
  | 'unsubscribe'
  | 'open'
  | 'click'
  | 'unknown';

export interface EmailLogListItem {
  id: string;
  createdAt: string;
  toEmail: string;
  fromEmail?: string;
  subject?: string;
  templateId?: number;
  templateName?: string;
  lastEventType?: EmailLogStatus;
  lastEventAt?: string;
}

export interface EmailLogEvent {
  type: EmailLogStatus;
  timestamp: string;
  reason?: string;
  sgEventId?: string;
  response?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
}

export interface EmailLogDetails {
  id: string;
  createdAt: string;
  fromEmail?: string;
  toEmail: string;
  subject?: string;
  templateId?: number;
  templateName?: string;
  status?: EmailLogStatus;
  events: EmailLogEvent[];
}

export interface EmailLogsQuery {
  from?: string;
  to?: string;
  status?: EmailLogStatus;
  recipient?: string;
  templateId?: number;
  take?: number;
  skip?: number;
}

@Injectable({ providedIn: 'root' })
export class EmailLogsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.BACKEND_URL}/EmailLogs`;

  getLogs(query: EmailLogsQuery = {}): Observable<EmailLogListItem[]> {
    let params = new HttpParams();

    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    if (query.status) params = params.set('status', query.status);
    if (query.recipient) params = params.set('recipient', query.recipient);
    if (query.templateId != null)
      params = params.set('templateId', String(query.templateId));
    if (query.take != null) params = params.set('take', String(query.take));
    if (query.skip != null) params = params.set('skip', String(query.skip));

    return this.http.get<EmailLogListItem[]>(this.baseUrl, { params });
  }

  getById(id: string): Observable<EmailLogDetails> {
    return this.http.get<EmailLogDetails>(`${this.baseUrl}/${id}`);
  }
}
