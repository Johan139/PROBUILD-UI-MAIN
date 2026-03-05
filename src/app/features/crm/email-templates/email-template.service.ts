import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
export interface EmailTemplate {
  templateId: number;
  templateName: string;
  subject: string;
  description: string;
  languageCode?: string;
  versionNumber: number;
  isActive: boolean;
  createdDate: string;
  modifiedDate?: string;
}

@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.BACKEND_URL}/emailtemplates`;

  getAll(): Observable<EmailTemplate[]> {
    return this.http.get<EmailTemplate[]>(this.baseUrl);
  }
  getById(id: number) {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  update(id: number, payload: any) {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }
}
