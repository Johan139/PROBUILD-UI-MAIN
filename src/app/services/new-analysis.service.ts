import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FireAndForgetRequestDto } from '../models/fire-and-forget-request.dto';
import { UploadedFileInfo } from './file-upload.service';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root'
})
export class NewAnalysisService {

  constructor(private http: HttpClient) { }

  startStandardAnalysis(request: FormData): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/Jobs`, request);
  }

  startWalkthrough(uploadedFiles: UploadedFileInfo[], startDate: Date, analysisType: string, budgetLevel: string, promptKeys: string[]): Observable<any> {
    const documentUrls = uploadedFiles.map(f => f.url);
    const request = {
      documentUrls,
      startDate,
      analysisType,
      budgetLevel,
      promptKeys
    };
    return this.http.post<any>(`${BASE_URL}/api/analysis/walkthrough/start`, request);
  }

  getNextWalkthroughStep(sessionId: string, applyCostOptimisation?: boolean): Observable<any> {
    let url = `${BASE_URL}/api/analysis/walkthrough/${sessionId}/next`;
    if (applyCostOptimisation) {
      url += `?applyCostOptimisation=true`;
    }
    return this.http.get<any>(url);
  }

  rerunWalkthroughStep(sessionId: string, stepIndex: number, payload: any): Observable<any> {
    return this.http.post<any>(`${BASE_URL}/api/analysis/walkthrough/${sessionId}/rerun/${stepIndex}`, payload);
  }
}
