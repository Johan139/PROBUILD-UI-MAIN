import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface Logo {
  id: string;
  url: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
}

@Injectable({ providedIn: 'root' })
export class LogoService {
  private apiUrl = `${environment.BACKEND_URL}/logos`;

  constructor(private http: HttpClient) {}

  uploadLogo(file: File, type: 'quote' | 'profile', uploadedBy: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('uploadedBy', uploadedBy);
    return this.http.post<Logo>(this.apiUrl, formData);
  }

  getLogo(id: string) {
    return this.http.get<Logo>(`${this.apiUrl}/${id}`);
  }

  setUserLogo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/user-logo`, formData);
  }

  getUserLogo() {
    return this.http.get<Logo>(`${this.apiUrl}/user-logo`);
  }

  deleteUserLogo() {
    return this.http.delete(`${this.apiUrl}/user-logo`);
  }
}
