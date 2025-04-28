import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Quote } from './quote.model';

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  // Simulate saving a quote (replace with actual API call)
  saveQuote(quote: Quote): Observable<Quote> {
    // Assign a dummy ID for demonstration
    quote.id = 'quote_' + new Date().getTime();
    return of(quote);
  }
}