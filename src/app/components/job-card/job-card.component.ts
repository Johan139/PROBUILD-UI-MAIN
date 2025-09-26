import { Component, Input } from '@angular/core';
import { Job } from '../../models/job';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { title } from 'process';

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
export class JobCardComponent {
  @Input() job!: Job;
  @Input() userTrade: string | undefined;
  @Input() showBidButton: boolean = true;

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
}
