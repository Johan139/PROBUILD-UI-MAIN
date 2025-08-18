import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SubscriptionUpgradeDTO } from '../authentication/profile/profile.component';
import { UpgradePreviewRequest } from '../models/UpgradePreviewRequest';
import { ProrationPreviewDto } from '../models/ProrationPreviewDto';

const BASE_URL = `${environment.BACKEND_URL}/stripe`;

export interface PaymentIntentRequest {
  amount: number;      // in smallest unit, e.g., 5000 cents = $50.00
  currency: string;    // e.g., "usd"
}
export interface SubscriptionOption {
    id: number;
    subscription: string;
    amount: number;
    StripeProductId: string;
  }
@Injectable({
  providedIn: 'root'
})

export class StripeService {

  constructor(private httpClient: HttpClient) {}

  createCheckoutSession(subscription: {source:string,userId: string, packageName: string; amount: number, assignedUser: string }): Observable<{ url: string }> {
    console.log(subscription)
    return this.httpClient.post<{ url: string }>(
      `${BASE_URL}/create-checkout-session`,
      subscription
    );
  }
  
  getSubscriptions(): Observable<SubscriptionOption[]> {
    return this.httpClient.get<SubscriptionOption[]>(`${BASE_URL}/GetSubscriptions`);
  }
cancelSubscription(subscriptionId: string): Observable<string> {
  return this.httpClient.post(`${BASE_URL}/cancelsubscription/${subscriptionId}`, {}, { responseType: 'text' });
}
  createPaymentIntent(request: PaymentIntentRequest): Observable<{ clientSecret: string }> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.httpClient.post<{ clientSecret: string }>(
      `${BASE_URL}/create-payment-intent`,
      request,
      { headers }
    );
  }
upgradeSubscriptionByPackage(payload: SubscriptionUpgradeDTO): Observable<{ url: string }> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

  return this.httpClient.post<{ url: string }>(
    `${BASE_URL}/upgrade-by-package`,
      payload,
    { headers }
  );
}
  previewUpgradeByPackage(payload: UpgradePreviewRequest): Observable<ProrationPreviewDto> {
    return this.httpClient.post<ProrationPreviewDto>(
      `${BASE_URL}/preview-upgrade`,
      payload
    );
  }
}
