import { Component, EventEmitter, Input, Output, ViewChild, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Bid } from '../../../../models/bid';
import { Job } from '../../../../models/job';
import { QuoteListItemDto } from '../../../../features/quote/quote.model';
import { JobCardComponent } from '../../../../components/job-card/job-card.component';
import { Router } from '@angular/router';
import { QuoteService } from '../../../../features/quote/quote.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-my-bids',
  templateUrl: './my-bids.component.html',
  styleUrls: ['./my-bids.component.scss'],
  standalone: true,
  imports: [CommonModule, MatPaginatorModule, JobCardComponent]
})
export class MyBidsComponent implements OnChanges {
  @Input() myBids: Bid[] = [];
  @Input() loading: boolean = false;
  @Input() userTrade: string | undefined;
  @Input() myQuotes: QuoteListItemDto[] = [];

  @Output() viewMoreInfo = new EventEmitter<Job>();
  @Output() refreshJobs = new EventEmitter<void>();

  quoteStatusFilter: 'All' | 'Draft' | 'Submitted' | 'Rejected' = 'All';
  dataSource = new MatTableDataSource<Bid>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
      private router: Router,
      private quoteService: QuoteService,
      private dialog: MatDialog
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['myBids'] || changes['myQuotes']) {
       this.applyLocalFilter();
    }
  }

  ngAfterViewInit() {
      this.dataSource.paginator = this.paginator;
  }

  setFilter(filter: 'All' | 'Draft' | 'Submitted' | 'Rejected') {
      this.quoteStatusFilter = filter;
      this.applyLocalFilter();
  }

  applyLocalFilter() {
      let filtered = this.myBids;
      if (this.quoteStatusFilter !== 'All') {
          filtered = this.myBids.filter(bid => {
              const quote = this.getQuoteForBid(bid);
              return quote?.status === this.quoteStatusFilter;
          });
      }

      this.dataSource.data = filtered;
      if (this.paginator) {
          this.dataSource.paginator = this.paginator;
      }
  }

  getQuoteForBid(bid: Bid): QuoteListItemDto | null {
    if (!bid?.quoteId) return null;
    return this.myQuotes.find((q) => q.id === bid.quoteId) ?? null;
  }

  trackByBidId(index: number, bid: Bid): number {
    return bid.id;
  }

  onViewQuote(quote: QuoteListItemDto | null): void {
    if (!quote) return;
    this.router.navigate(['/quote'], {
      queryParams: { quoteId: quote.id },
    });
  }

  onWithdrawBid(bid: Bid | null): void {
    if (!bid?.quoteId) return;

    const quote = this.myQuotes.find((q) => q.id === bid.quoteId);
    if (!quote) return;

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Withdraw Bid',
        message:
          'Are you sure you want to withdraw this bid? This action cannot be undone.',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && quote) {
        this.quoteService
          .changeStatus(quote.id, 'Withdrawn')
          .subscribe(() => this.refreshJobs.emit());
      }
    });
  }

  onEditBid(bid: Bid | null): void {
    if (!bid?.quoteId) return;

    this.router.navigate(['/quote'], {
      queryParams: { quoteId: bid.quoteId, edit: true },
    });
  }

  onViewMoreInfoClick(job: Job): void {
      this.viewMoreInfo.emit(job);
  }
}
