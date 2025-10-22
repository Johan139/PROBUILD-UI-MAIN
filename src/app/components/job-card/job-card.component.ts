import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Job } from '../../models/job';
import { Bid } from '../../models/bid';
import { Quote } from '../../features/quote/quote.model';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-job-card',
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class JobCardComponent  {
  @Input() job!: Job;
  @Input() userTrade: string | undefined;
  @Input() showBidButton: boolean = true;
  @Input() bid: Bid | null = null;
  @Input() quote: Quote | null = null;
  @Output() viewQuote = new EventEmitter<Quote | Bid>();
  @Output() viewPdf = new EventEmitter<string>();
  @Output() withdrawBid = new EventEmitter<Quote | Bid>();
  @Output() editBid = new EventEmitter<Quote | Bid>();



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
    if (this.quote) {
      this.viewQuote.emit(this.quote);
    } else if (this.bid) {
      this.viewQuote.emit(this.bid);
    }
  }

  onViewPdfClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.bid && this.bid.documentUrl) {
      this.viewPdf.emit(this.bid.documentUrl);
    }
  }

  onWithdrawBidClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.quote) {
      this.withdrawBid.emit(this.quote);
    } else if (this.bid) {
      this.withdrawBid.emit(this.bid);
    }
  }

  onEditBidClick(event: MouseEvent): void {
    event.stopPropagation();
    if (this.quote) {
      this.editBid.emit(this.quote);
    } else if (this.bid) {
      this.editBid.emit(this.bid);
    }
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}
