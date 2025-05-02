import { Component, OnInit } from '@angular/core';
import { QuoteService } from '../quote.service';
import { Quote } from '../quote.model';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-quotes-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatCardModule,
    HttpClientModule,
    MatIconModule,
  ],
  templateUrl: './quotes-list.component.html',
  styleUrls: ['./quotes-list.component.scss'],
  providers: [QuoteService],
})
export class QuotesListComponent implements OnInit {
  displayedColumns: string[] = ['number', 'createdBy', 'createdDate', 'total', 'actions'];
  dataSource = new MatTableDataSource<Quote>([]);

  constructor(private quoteService: QuoteService, private router: Router) {}

  ngOnInit(): void {
    this.loadQuotes();
  }

  loadQuotes(): void {
    console.log('Fetching quotes...');
    this.quoteService.getAllQuotes().subscribe({
      next: (quotes) => {
        console.log('Quotes received:', quotes);
        this.dataSource.data = quotes || [];
        console.log('DataSource after update:', this.dataSource.data);
      },
      error: (err) => {
        console.error('Error loading quotes:', err);
      },
    });
  }

  openQuote(quoteId: string | null): void {
    console.log('Attempting to open quote with ID:', quoteId);
    this.router.navigate(['/quote'], {
      queryParams: { quoteId: quoteId }
    });
  }
}