import { Injectable } from '@angular/core';
import { QuoteDto } from '../quote/quote.model';

@Injectable({
  providedIn: 'root',
})
export class QuoteDataService {
  private quote: QuoteDto | null = null;

  setQuote(quote: QuoteDto): void {
    this.quote = quote;
  }

  getQuote(): QuoteDto | null {
    return this.quote;
  }

  clearQuote(): void {
    this.quote = null;
  }
}
