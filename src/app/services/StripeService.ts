import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE_URL = `${environment.BACKEND_URL}/stripe`;

export interface PaymentIntentRequest {
  amount: number;      // in smallest unit, e.g., 5000 cents = $50.00
  currency: string;    // e.g., "usd"
}
export interface SubscriptionOption {
    id: number;
    subscription: string;
    amount: number;
  }
@Injectable({
  providedIn: 'root'
})

export class StripeService {

  constructor(private httpClient: HttpClient) {}

  createCheckoutSession(subscription: {source:string,userId: string, packageName: string; amount: number }): Observable<{ url: string }> {
    return this.httpClient.post<{ url: string }>(
      `${BASE_URL}/create-checkout-session`,
      subscription
    );
  }
  
  getSubscriptions(): Observable<SubscriptionOption[]> {
    return this.httpClient.get<SubscriptionOption[]>(`${BASE_URL}/GetSubscriptions`);
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
}
