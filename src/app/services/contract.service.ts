import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { shareReplay } from 'rxjs/operators';

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

export interface GenerateGeneralClientContractRequest {
  executiveSummaryContext?: string;
  projectType?: 'residential' | 'commercial';
  consequentialDamagesWaiverEnabled?: boolean;
  liabilityCapEnabled?: boolean;
  liabilityCapBasis?: string;
  liabilityCapType?: 'contract_sum' | 'fixed_amount';
  liabilityCapFixedAmount?: number;
  liabilityCapCurrency?: string;
  disputeResolutionMode?: 'arbitration' | 'litigation';
  insuranceLimits?: string;
  markups?: string;
  curePeriods?: string;
  ldCap?: string;
  rightToRepairReviewRequired?: boolean;
  depositLimitReviewRequired?: boolean;
  antiIndemnityReviewRequired?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ContractService {
  constructor(private http: HttpClient) {}

  private readonly contractsByJobCacheTtlMs = 30 * 1000;
  private contractsByJobCache = new Map<
    number,
    { cachedAt: number; request$: Observable<ContractRecord[]> }
  >();

  generateContract(jobId: number): Observable<any> {
    return this.http.post(`${BASE_URL}/contracts/${jobId}/generate`, {});
  }

  getContract(contractId: string): Observable<any> {
    return this.http.get(`${BASE_URL}/contracts/${contractId}`);
  }

  getContractsByJobId(jobId: number): Observable<ContractRecord[]> {
    const key = Number(jobId);
    const now = Date.now();
    const cached = this.contractsByJobCache.get(key);

    if (cached && now - cached.cachedAt < this.contractsByJobCacheTtlMs) {
      return cached.request$;
    }

    const request$ = this.http
      .get<ContractRecord[]>(`${BASE_URL}/contracts/job/${jobId}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));

    this.contractsByJobCache.set(key, { cachedAt: now, request$ });
    return request$;
  }

  generateGeneralClientContract(
    jobId: number,
    request?: GenerateGeneralClientContractRequest,
  ): Observable<ContractRecord> {
    const body = request || {};

    return this.http.post<ContractRecord>(
      `${BASE_URL}/contracts/${jobId}/generate-general-client-contract`,
      body,
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
