import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

const BASE_URL = environment.BACKEND_URL;

export interface AnalysisRequestDto {
  analysisType: string;
  promptKeys: string[];
  documentUrls: string[];
}

export interface AnalysisResponse {
  report: string;
}

@Injectable({
  providedIn: 'root'
})
export class AnalysisService {

  constructor(private http: HttpClient) { }

  performAnalysis(request: AnalysisRequestDto): Observable<AnalysisResponse> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    return this.http.post<AnalysisResponse>(`${BASE_URL}/ProjectAnalysis/perform-selected`, request, { headers });
  }
}
