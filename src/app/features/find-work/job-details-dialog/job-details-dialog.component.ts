import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { Job } from '../../../models/job';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../../authentication/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-job-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatCardModule],
  templateUrl: './job-details-dialog.component.html',
  styleUrl: './job-details-dialog.component.scss'
})
export class JobDetailsDialogComponent {
  userTrade: string | undefined;
  tradeMatch: boolean = false;
  private userSubscription: Subscription;

  constructor(
    public dialogRef: MatDialogRef<JobDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { job: Job },
    private authService: AuthService
  ) {
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.userTrade = user?.trade;
      this.checkTradeMatch();
    });
  }

  checkTradeMatch(): void {
    if (this.userTrade && this.data.job.trades) {
      this.tradeMatch = this.data.job.trades.includes(this.userTrade);
    }
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
