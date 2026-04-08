import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ExternalCompanyWithContacts,
  GeneralContractorEnrichRequest,
  SubcontractorDiscoveryRequest,
} from '../models/external-data';

@Injectable({
  providedIn: 'root',
})
export class ExternalDataService {
  private apiUrl = `${environment.BACKEND_URL}/ExternalData`;

  constructor(private http: HttpClient) {}

  discoverSubcontractors(
    request: SubcontractorDiscoveryRequest,
  ): Observable<ExternalCompanyWithContacts[]> {
    return this.http.post<ExternalCompanyWithContacts[]>(
      `${this.apiUrl}/subcontractors/discover`,
      request,
    );
  }

  enrichGeneralContractor(
    request: GeneralContractorEnrichRequest,
  ): Observable<ExternalCompanyWithContacts> {
    return this.http.post<ExternalCompanyWithContacts>(
      `${this.apiUrl}/general-contractors/enrich`,
      request,
    );
  }
}

