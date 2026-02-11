import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Job } from '../../../../models/job';

@Component({
  selector: 'app-my-job-postings',
  templateUrl: './my-job-postings.component.html',
  styleUrls: ['./my-job-postings.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, FormsModule]
})
export class MyJobPostingsComponent {
  @Input() myPostings: Job[] = [];
  @Output() postJob = new EventEmitter<void>();
  @Output() jobClick = new EventEmitter<Job>();
  @Output() invite = new EventEmitter<any>();

  // Local state for expandable items
  expandedJobId: number | null = null;
  inviteRadius: { [jobId: number]: number } = {};
  subcontractorSearch: string = '';
  emailInvite: string = '';

  // Mock subcontractors. TODO: Real data from Apollo
  availableSubcontractors = [
    { id: 101, company: 'PowerLine Electrical', trade: 'Electrical', rating: 4.9, distance: 5, verified: true },
    { id: 102, company: 'GreenScape Landscaping', trade: 'Landscaping', rating: 4.7, distance: 8, verified: true },
    { id: 103, company: 'ProCoat Painters', trade: 'Painting', rating: 4.8, distance: 15, verified: true },
    { id: 104, company: 'Elite Drywall', trade: 'Drywall', rating: 4.6, distance: 12, verified: false },
    { id: 105, company: 'Foundation Masters', trade: 'Concrete', rating: 4.9, distance: 6, verified: true },
  ];

  getTotalBidsReceived(): number {
    return this.myPostings.reduce((acc, job) => acc + (job.numberOfBids || 0), 0);
  }

  getTotalPostingsValue(): string {
    const total = this.myPostings.reduce((acc, job) => {
        if (job.tradeBudgets && job.tradeBudgets.length > 0) {
            return acc + job.tradeBudgets.reduce((sum, item) => sum + item.budget, 0);
        }
        return acc;
    }, 0);

    if (total > 1000000) {
        return `$${(total / 1000000).toFixed(1)}M`;
    } else if (total > 1000) {
        return `$${(total / 1000).toFixed(0)}K`;
    }
    return `$${total}`;
  }

  getJobBudget(job: Job): string {
    if (job.tradeBudgets && job.tradeBudgets.length > 0) {
      const total = job.tradeBudgets.reduce((sum, item) => sum + item.budget, 0);
      return `$${total.toLocaleString()}`;
    }
    return 'N/A';
  }

  getPrimaryTrade(job: Job): string {
    const trade = job.trades?.[0]?.trim();

    if (!trade) {
      return 'General';
    }

    const cleanedTrade = trade.replace(/^\*+|\*+$/g, '').trim();
    return cleanedTrade || 'General';
  }

  onPostJob(): void {
    this.postJob.emit();
  }

  onJobClick(job: Job): void {
    this.jobClick.emit(job);
  }

  aiAnalyze(job: Job, event: MouseEvent): void {
    event.stopPropagation();
    alert('AI Analysis initiated for ' + job.projectName);
  }

  toggleExpandJob(jobId: number, event: MouseEvent): void {
    event.stopPropagation();
    this.expandedJobId = this.expandedJobId === jobId ? null : jobId;
  }

  inviteSubcontractor(sub: any, event: MouseEvent): void {
    event.stopPropagation();
    alert(`Invitation sent to ${sub.company}!`);
  }
}
