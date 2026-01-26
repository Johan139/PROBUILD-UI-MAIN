import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Job } from '../../models/job';
import { Bid } from '../../models/bid';
import { QuoteListItemDto } from '../../features/quote/quote.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-job-card',
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTooltipModule],
})
export class JobCardComponent {
  @Input() job!: Job;
  @Input() userTrade: string | undefined;
  @Input() showBidButton: boolean = true;
  @Input() showNewTag: boolean = true;
  @Input() quote: QuoteListItemDto | null = null;
  @Output() viewQuote = new EventEmitter<QuoteListItemDto>();
  @Output() withdrawQuote = new EventEmitter<QuoteListItemDto>();
  @Output() editQuote = new EventEmitter<QuoteListItemDto>();

  @Output() viewPdf = new EventEmitter<string>();

  @Output() viewMoreInfo = new EventEmitter<Job>();

  getStarRating(rating: number): string[] {
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push('star');
      } else if (i - 0.5 <= rating) {
        stars.push('star_half');
      } else {
        stars.push('star_border');
      }
    }
    return stars;
  }

  hasTradeMatch(job: Job): boolean {
    if (!this.userTrade || !job.trades) {
      return true;
    }
    return job.trades.includes(this.userTrade);
  }

  getTradeTooltip(trade: string): string {
    if (this.userTrade && this.userTrade === trade) {
      return `This job requires your trade: ${trade}`;
    }
    if (this.userTrade && this.userTrade !== trade) {
      return `This job requires a different trade: ${trade}`;
    }
    return `Trade required: ${trade}`;
  }

  onViewQuoteClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.quote) return;
    this.viewQuote.emit(this.quote);
  }

  onViewPdfClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.quote?.documentUrl) return;
    this.viewPdf.emit(this.quote.documentUrl);
  }

  onWithdrawQuoteClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.quote) return;
    this.withdrawQuote.emit(this.quote);
  }

  onEditQuoteClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.quote) return;
    this.editQuote.emit(this.quote);
  }

  onViewMoreInfoClick(event: MouseEvent): void {
    event.stopPropagation();
    this.viewMoreInfo.emit(this.job);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}
