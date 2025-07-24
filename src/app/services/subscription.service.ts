// subscription.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  constructor(private http: HttpClient) {}

  submitSubscription(data: any): Observable<any> {
    return this.http.post('/api/subscription/confirm', data);
  }
}
