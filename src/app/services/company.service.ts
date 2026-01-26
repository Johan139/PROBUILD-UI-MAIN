import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
const BASE_URL = environment.BACKEND_URL;
@Injectable({ providedIn: 'root' })
export class CompanyService {
  constructor(private http: HttpClient) {}
  private apiUrl = `${BASE_URL}/company`;

  updateCompanyProfile(payload: any, userId: string | null) {
    console.log('COMPANY PAYLOAD SENT:', payload);
    return this.http.put(`${this.apiUrl}/saveCompany/` + userId, payload);
  }

  getCompanyProfile(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/GetProfileCompany/${userId}`);
  }
}
