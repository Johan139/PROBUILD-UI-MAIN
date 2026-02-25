import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE_URL = environment.BACKEND_URL;

export interface ContractRecord {
  id: string;
  jobId: number;
  gcId: string;
  scVendorId: string;
  contractText: string;
  status: string;
  contractType?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileContentType?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ContractService {
  constructor(private http: HttpClient) {}

  generateContract(jobId: number): Observable<any> {
    return this.http.post(`${BASE_URL}/contracts/${jobId}/generate`, {});
  }

  getContract(contractId: string): Observable<any> {
    return this.http.get(`${BASE_URL}/contracts/${contractId}`);
  }

  getContractsByJobId(jobId: number): Observable<ContractRecord[]> {
    return this.http.get<ContractRecord[]>(`${BASE_URL}/contracts/job/${jobId}`);
  }

  generateGeneralClientContract(jobId: number): Observable<ContractRecord> {
    return this.http.post<ContractRecord>(
      `${BASE_URL}/contracts/${jobId}/generate-general-client-contract`,
      {},
    );
  }

  uploadClientContractPdf(
    contractId: string,
    file: File,
  ): Observable<ContractRecord> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ContractRecord>(
      `${BASE_URL}/contracts/${contractId}/upload-client-pdf`,
      formData,
    );
  }

  downloadClientContractPdf(contractId: string): Observable<Blob> {
    return this.http.get(
      `${BASE_URL}/contracts/${contractId}/download-client-pdf`,
      {
        responseType: 'blob',
      },
    );
  }

  signContract(contractId: string, signature: string): Observable<any> {
    return this.http.post(`${BASE_URL}/contracts/${contractId}/sign`, {
      signature,
    });
  }
}
