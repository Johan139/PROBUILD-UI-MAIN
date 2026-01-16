import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE_URL = environment.BACKEND_URL;

@Injectable({
  providedIn: 'root',
})
export class ContractService {
  constructor(private http: HttpClient) {}

  generateContract(jobId: number): Observable<any> {
    return this.http.post(`${BASE_URL}/api/contracts/${jobId}/generate`, {});
  }

  getContract(contractId: string): Observable<any> {
    return this.http.get(`${BASE_URL}/api/contracts/${contractId}`);
  }

  getContractsByJobId(jobId: number): Observable<any[]> {
    return this.http.get<any[]>(`${BASE_URL}/api/contracts/job/${jobId}`);
  }

  signContract(contractId: string, signature: string): Observable<any> {
    return this.http.post(`${BASE_URL}/api/contracts/${contractId}/sign`, {
      signature,
    });
  }
}
