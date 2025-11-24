import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BidService } from './bid.service';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { NgIf } from '@angular/common';

@Component({
    selector: 'app-bid',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatTableModule,
        MatDividerModule,
        NgIf
    ],
    templateUrl: './bid.component.html', // Fixed to point to the correct HTML file
    styleUrls: ['./bid.component.scss'],
    providers: [BidService]
})
export class BidComponent implements OnInit {
  bidForm: FormGroup;
  jobDetails: any;
  dataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['amount', 'notes', 'submittedAt'];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private bidService: BidService
  ) {
    this.bidForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    // Fetch job details and user's bids
    this.jobDetails = this.bidService.getJobDetails();
    this.loadUserBids();
  }

  loadUserBids(): void {
    const bids = this.bidService.getUserBids();
    this.dataSource.data = bids;
  }

  onSubmit(): void {
    if (this.bidForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const bidData = {
      amount: this.bidForm.get('amount')?.value,
      notes: this.bidForm.get('notes')?.value,
      submittedAt: new Date().toISOString()
    };

    // Simulate submitting the bid
    this.bidService.submitBid(bidData);
    this.loadUserBids();

    // Reset form
    this.bidForm.reset();
    this.isSubmitting = false;
  }
}
