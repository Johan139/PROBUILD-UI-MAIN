import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Job } from '../../../../models/job';
import { JobCardComponent } from '../../../../components/job-card/job-card.component';
import { QuoteListItemDto } from '../../../../features/quote/quote.model';

@Component({
  selector: 'app-saved-jobs',
  templateUrl: './saved-jobs.component.html',
  styleUrls: ['./saved-jobs.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, JobCardComponent]
})
export class SavedJobsComponent {
  @Input() savedJobsList: Job[] = [];
  @Input() savedJobIds: number[] = [];
  @Input() userTrade: string | undefined;
  @Input() myQuotes: QuoteListItemDto[] = []; // Needed to pass to JobCard

  @Output() clearAll = new EventEmitter<void>();
  @Output() browseJobs = new EventEmitter<void>();
  @Output() jobClick = new EventEmitter<Job>();
  @Output() toggleSaved = new EventEmitter<{jobId: number, event: MouseEvent}>();
  @Output() viewMoreInfo = new EventEmitter<Job>();

  getQuoteForJob(jobId: number): QuoteListItemDto | null {
    return this.myQuotes.find((q) => q.jobId === jobId) ?? null;
  }
}
