import { Component, OnInit } from '@angular/core';
import { QuoteService } from '../quote.service';
import { QuoteListItemDto } from './../quote.model';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../authentication/auth.service';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';

type DirectionFilter = 'Outbound' | 'Inbound';
type DocTypeFilter = 'ALL' | 'QUOTE' | 'INVOICE';

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
  // Raw data
  allQuotes: QuoteListItemDto[] = [];

  // Filtered lists
  accepted: QuoteListItemDto[] = [];
  pending: QuoteListItemDto[] = [];
  declined: QuoteListItemDto[] = [];
  draft: QuoteListItemDto[] = [];

  // Current filters
  directionFilter: DirectionFilter = 'Outbound';
  docTypeFilter: DocTypeFilter = 'ALL';

  // Counts for tabs
  outboundCount = 0;
  inboundCount = 0;
  allCount = 0;
  quotesCount = 0;
  invoicesCount = 0;

  // Stats
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
        this.allQuotes = quotes;
        this.computeCounts();
        this.applyFilters();
      },
      error: (err) => console.error(err),
    });
  }

  private computeCounts(): void {
    // Direction counts
    this.outboundCount = this.allQuotes.filter(
      (q) => q.direction === 'Outbound',
    ).length;
    this.inboundCount = this.allQuotes.filter(
      (q) => q.direction === 'Inbound',
    ).length;

    // Doc type counts (based on current direction)
    this.updateDocTypeCounts();
  }

  private updateDocTypeCounts(): void {
    const directionFiltered = this.allQuotes.filter(
      (q) => q.direction === this.directionFilter,
    );

    this.allCount = directionFiltered.length;
    this.quotesCount = directionFiltered.filter(
      (q) => !q.documentType || q.documentType === 'QUOTE',
    ).length;
    this.invoicesCount = directionFiltered.filter(
      (q) => q.documentType === 'INVOICE',
    ).length;
  }

  private applyFilters(): void {
    // Step 1: Filter by direction
    let filtered = this.allQuotes.filter(
      (q) => q.direction === this.directionFilter,
    );

    // Step 2: Filter by document type
    if (this.docTypeFilter === 'QUOTE') {
      filtered = filtered.filter(
        (q) => !q.documentType || q.documentType === 'QUOTE',
      );
    } else if (this.docTypeFilter === 'INVOICE') {
      filtered = filtered.filter((q) => q.documentType === 'INVOICE');
    }

    // Step 3: Build status buckets
    this.buildStatusBuckets(filtered);
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

  // Direction tab change (Outbound / Inbound)
  onDirectionChange(index: number): void {
    this.directionFilter = index === 0 ? 'Outbound' : 'Inbound';
    this.docTypeFilter = 'ALL'; // Reset doc type filter when switching direction
    this.updateDocTypeCounts();
    this.applyFilters();
  }

  // Document type tab change (All / Quotes / Invoices)
  onDocTypeChange(index: number): void {
    const filters: DocTypeFilter[] = ['ALL', 'QUOTE', 'INVOICE'];
    this.docTypeFilter = filters[index];
    this.applyFilters();
  }

  get isInboundView(): boolean {
    return this.directionFilter === 'Inbound';
  }

  get isInvoiceView(): boolean {
    return this.docTypeFilter === 'INVOICE';
  }

  // Navigation
  redirectToQuote(): void {
    this.router.navigate(['/quote']);
  }

  redirectToInvoice(): void {
    this.router.navigate(['/quote'], {
      queryParams: { type: 'invoice' },
    });
  }

  openQuote(id: string): void {
    this.router.navigate(['/quote'], { queryParams: { quoteId: id } });
  }

  sendReminder(id: string): void {
    console.log('Reminder sent for', id);
  }

  // Helper methods
  getDocIcon(doc: QuoteListItemDto): string {
    return doc.documentType === 'INVOICE' ? 'receipt_long' : 'request_quote';
  }

  getStatusLabel(doc: QuoteListItemDto): string {
    const isInvoice = doc.documentType === 'INVOICE';

    if (isInvoice) {
      const labels: { [key: string]: string } = {
        Approved: 'paid',
        Submitted: 'sent',
        Rejected: 'void',
        Draft: 'draft',
      };
      return labels[doc.status] || 'unknown';
    }

    const labels: { [key: string]: string } = {
      Approved: 'accepted',
      Submitted: 'pending',
      Rejected: 'declined',
      Draft: 'draft',
    };
    return labels[doc.status] || 'unknown';
  }

  isInvoice(doc: QuoteListItemDto): boolean {
    return doc.documentType === 'INVOICE';
  }

  // Dynamic labels based on view
  get acceptedLabel(): string {
    if (this.docTypeFilter === 'INVOICE') return 'Paid';
    if (this.docTypeFilter === 'QUOTE') return 'Accepted';
    return 'Accepted / Paid';
  }

  get pendingLabel(): string {
    return 'Pending';
  }

  get declinedLabel(): string {
    if (this.docTypeFilter === 'INVOICE') return 'Void';
    if (this.docTypeFilter === 'QUOTE') return 'Declined';
    return 'Declined / Void';
  }
}
