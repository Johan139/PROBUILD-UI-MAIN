import { Component, OnInit } from '@angular/core';
import { QuoteService } from '../quote.service';
import { QuoteListItemDto } from './../quote.model';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../authentication/auth.service';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
@Component({
  selector: 'app-quotes-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatCardModule,
    CommonModule,
    MatIconModule,
    MatTabsModule,
  ],
  templateUrl: './quotes-list.component.html',
  styleUrls: ['./quotes-list.component.scss'],
  providers: [QuoteService],
})
export class QuotesListComponent implements OnInit {
  quotes: QuoteListItemDto[] = [];
  outboundQuotes: QuoteListItemDto[] = [];
  inboundQuotes: QuoteListItemDto[] = [];
  accepted: QuoteListItemDto[] = [];
  pending: QuoteListItemDto[] = [];
  declined: QuoteListItemDto[] = [];
  draft: QuoteListItemDto[] = [];
  totals = {
    count: 0,
    accepted: 0,
    pending: 0,
    declined: 0,
    value: 0,
  };

  constructor(
    private quoteService: QuoteService,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadQuotes();
  }

  loadQuotes(): void {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) return;

    this.quoteService.getUserQuotes(userId).subscribe({
      next: (quotes) => {
        this.quotes = quotes;
        this.computeView();
      },
      error: (err) => console.error(err),
    });
  }
  redirectToQuote(): void {
    this.router.navigate(['/quote']);
  }
  private computeView(): void {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) return;
    console.log(this.quotes);
    this.outboundQuotes = this.quotes.filter((q) => q.createdBy === userId);

    this.inboundQuotes = this.quotes.filter((q) => q.createdBy !== userId);

    // Default view = outbound
    this.buildStatusBuckets(this.outboundQuotes);
  }
  private buildStatusBuckets(source: QuoteListItemDto[]): void {
    this.accepted = source.filter((q) => q.status === 'Approved');
    this.pending = source.filter((q) => q.status === 'Submitted');
    this.declined = source.filter((q) => q.status === 'Rejected');
    this.draft = source.filter((q) => q.status === 'Draft');

    this.totals = {
      count: source.length,
      accepted: this.accepted.length,
      pending: this.pending.length,
      declined: this.declined.length,
      value: source.reduce((sum, q) => sum + (q.total ?? 0), 0),
    };
  }
  onTabChange(index: number): void {
    const source = index === 0 ? this.outboundQuotes : this.inboundQuotes;

    this.buildStatusBuckets(source);
  }

  openQuote(id: string): void {
    this.router.navigate(['/quote'], { queryParams: { quoteId: id } });
  }

  sendReminder(id: string): void {
    console.log('Reminder sent for', id);
  }
}
