import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BiddingService } from '../../services/bidding.service';
import { Bid } from '../../models/bid';
import { Job } from '../../models/job';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-job-bidding',
  templateUrl: './job-bidding.component.html',
  styleUrls: ['./job-bidding.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class JobBiddingComponent implements OnInit {
  jobId!: number;
  job: Job | undefined;
  bids: Bid[] = [];
  filteredBids: Bid[] = [];
  selectedBids: Set<number> = new Set();
  analysisResult: any;

  sortColumn: string = 'amount';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private route: ActivatedRoute,
    private biddingService: BiddingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.jobId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadBids();
  }

  loadBids(): void {
    this.biddingService.getBidsForJob(this.jobId).subscribe(bids => {
      this.bids = bids;
      this.filteredBids = [...this.bids];
    });
  }

  filterBids(filterValue: string): void {
    if (!filterValue) {
      this.filteredBids = [...this.bids];
    } else {
      this.filteredBids = this.bids.filter(bid =>
        bid.subcontractorName.toLowerCase().includes(filterValue.toLowerCase())
      );
    }
  }

  sortBids(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredBids.sort((a, b) => {
      const aValue = a[column as keyof Bid];
      const bValue = b[column as keyof Bid];

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  toggleBidSelection(bidId: number): void {
    if (this.selectedBids.has(bidId)) {
      this.selectedBids.delete(bidId);
    } else {
      this.selectedBids.add(bidId);
    }
  }

  selectFinalists(): void {
    const finalistIds = Array.from(this.selectedBids).map(String);
    this.biddingService.selectFinalists(this.jobId, finalistIds).subscribe(() => {
      // Add notification or UI update logic here
      console.log('Finalists selected');
      this.loadBids(); // Refresh bids to show finalist status
    });
  }

  awardJob(bidId: number): void {
    this.biddingService.awardJob(this.jobId, bidId).subscribe((response) => {
      // Add notification or UI update logic here
      console.log('Job awarded to bid:', bidId);
      this.router.navigate(['/contracts', response.contractId, 'sign']);
    });
  }

  analyzeBids(): void {
    const bidIds = Array.from(this.selectedBids);
    this.biddingService.analyzeBids(this.jobId).subscribe(result => {
      this.analysisResult = result;
      console.log('Analysis result:', result);
    });
  }
}
