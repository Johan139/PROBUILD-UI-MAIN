import { Injectable } from '@angular/core';

@Injectable()
export class BidService {
  private jobDetails = {
    title: 'Website Development Project',
    description:
      'Develop a responsive website for a small business, including a homepage, about page, and contact form.',
    budget: 5000,
    deadline: '2025-06-01',
  };

  private userBids: any[] = [];

  getJobDetails() {
    return this.jobDetails;
  }

  getUserBids() {
    return this.userBids;
  }

  submitBid(bid: any) {
    this.userBids.push(bid);
  }
}
