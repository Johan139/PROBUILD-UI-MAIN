import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class JobNavigationService {
  constructor(
    private router: Router,
  ) {}

  navigateToJob(notification: any): void {
    const jobId = notification.jobId || notification.id || notification;

    this.router.navigate(['/view-quote'], { queryParams: { jobId } });
  }
}
