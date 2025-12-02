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
}
