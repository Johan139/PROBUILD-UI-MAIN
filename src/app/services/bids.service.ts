import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root',
})
export class BidsService {
  private apiUrl = `${BASE_URL}/Bids`;

  constructor(private http: HttpClient) {}

  getBidsForJob(jobId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/job/${jobId}`);
  }

  uploadBidPdf(
    jobId: number,
    documentUrl: string,
    tradePackageId?: number,
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload`, {
      jobId,
      documentUrl,
      tradePackageId: tradePackageId ?? null,
    });
  }

  analyzeTradePackage(jobId: number, tradePackageId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/analyze-trade-package`, {
      jobId,
      tradePackageId,
    });
  }

  awardTradePackageBid(
    jobId: number,
    tradePackageId: number,
    bidId?: number | null,
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/award-trade-package-bid`, {
      jobId,
      tradePackageId,
      bidId: bidId ?? null,
    });
  }
}
