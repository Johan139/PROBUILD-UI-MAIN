import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CrmSubscriptionPackageOption {
  name: string;
  amount: number;
  annualAmount?: number | null;
  stripeProductId?: string | null;
  stripeProductIdAnnually?: string | null;
}

export interface CrmUserSubscriptionSummary {
  hasActiveSubscription: boolean;
  status?: string;
  package?: string;
  validUntil?: string;
  amount?: number;
  isTrial?: boolean;
  cancelled?: boolean;
  cancelledDate?: string;
  subscriptionId?: string;
}

export interface CrmUserDetails {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  emailConfirmed?: boolean;
  phoneNumber?: string;
  countryNumberCode?: string;
  userType?: string;
  isAdmin?: boolean;
  companyName?: string;
  companyRegNo?: string;
  vatNo?: string;
  trade?: string;
  supplierType?: string;
  subscriptionPackage?: string;
  country?: string;
  state?: string;
  city?: string;
  isActive: boolean;
  isVerified: boolean;
  subscription?: CrmUserSubscriptionSummary;
}

export interface CrmUserUpdate {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  emailConfirmed?: boolean | null;
  phoneNumber?: string | null;
  countryNumberCode?: string | null;
  userType?: string | null;
  isAdmin?: boolean | null;
  companyName?: string | null;
  companyRegNo?: string | null;
  vatNo?: string | null;
  trade?: string | null;
  supplierType?: string | null;
  subscriptionPackage?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  streetNumber?: string | null;
  streetName?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  googlePlaceId?: string | null;
  countryCode?: string | null;
  addressType?: string | null;
  isActive?: boolean | null;
  isVerified?: boolean | null;
}

export interface CrmUserAddress {
  id?: number;
  streetNumber?: string | null;
  streetName?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  googlePlaceId?: string | null;
  addressType?: string | null;
  userId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CrmUsersService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.BACKEND_URL}/CrmUsers`;

  getById(id: string): Observable<CrmUserDetails> {
    return this.http.get<CrmUserDetails>(`${this.baseUrl}/${id}`);
  }

  update(id: string, payload: CrmUserUpdate): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }

  getSubscription(id: string): Observable<CrmUserSubscriptionSummary> {
    return this.http.get<CrmUserSubscriptionSummary>(`${this.baseUrl}/${id}/subscription`);
  }

  getSubscriptionPackages(): Observable<CrmSubscriptionPackageOption[]> {
    return this.http.get<CrmSubscriptionPackageOption[]>(
      `${this.baseUrl}/subscription-packages`,
    );
  }

  sendPasswordReset(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/password-reset`, {});
  }

  getPrimaryAddress(id: string): Observable<CrmUserAddress | null> {
    return this.http.get<CrmUserAddress | null>(`${this.baseUrl}/${id}/address`);
  }

  upsertPrimaryAddress(id: string, payload: CrmUserAddress): Observable<CrmUserAddress> {
    return this.http.put<CrmUserAddress>(`${this.baseUrl}/${id}/address`, payload);
  }
}
