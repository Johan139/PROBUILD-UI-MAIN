import { Injectable } from '@angular/core';
import { Quote } from '../quote/quote.model';

@Injectable({
  providedIn: 'root',
})
export class QuoteDataService {
  private quote: Quote | null = null;

  setQuote(quote: Quote): void {
    this.quote = quote;
  }

  getQuote(): Quote | null {
    return this.quote;
  }

  clearQuote(): void {
    this.quote = null;
  }
}