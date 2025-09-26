import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root'
})
export class BiddingService {
  private apiUrl = `${BASE_URL}/Bidding`;

  constructor(private http: HttpClient) { }

  startBidding(jobId: number, biddingType: string, requiredTrades: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/start`, { biddingType, requiredTrades });
  }

  selectFinalists(jobId: number, finalistIds: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/select-finalists`, { finalistIds });
  }

  awardJob(jobId: number, winningBidId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/award`, { winningBidId });
  }

  analyzeBids(jobId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/analyze-bids`, {});
  }

  getBidsForJob(jobId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${jobId}/bids`);
  }

  submitPdfBid(jobId: number, documentUrl: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload`, { jobId, documentUrl });
  }
}
