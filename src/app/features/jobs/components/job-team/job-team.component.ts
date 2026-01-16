import {
  Component,
  Input,
  OnChanges,
  Output,
  EventEmitter,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobUser } from '../../job-assignment/job-assignment.model';
import { ConfirmationDialogComponent } from '../../../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { JobAssignmentService } from '../../job-assignment/job-assignment.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AddTeamMemberDialogComponent } from './dialogs/add-team-member-dialog/add-team-member-dialog.component';
import { AddSubcontractorDialogComponent } from './dialogs/add-subcontractor-dialog/add-subcontractor-dialog.component';
import { TeamMemberDetailDialogComponent } from './dialogs/team-member-detail-dialog/team-member-detail-dialog.component';
import { SubcontractorDetailDialogComponent } from './dialogs/subcontractor-detail-dialog/subcontractor-detail-dialog.component';
import { PostToMarketplaceDialogComponent } from './dialogs/post-to-marketplace-dialog/post-to-marketplace-dialog.component';
import { RatingService } from '../../../../services/rating.service';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-job-team',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule,
    SharedModule
  ],
  templateUrl: './job-team.component.html',
  styleUrls: ['./job-team.component.scss'],
})
export class JobTeamComponent implements OnChanges {
  @Input() projectDetails: any;
  @Input() assignedTeamMembers: JobUser[] = [];
  @Output() refreshTeam = new EventEmitter<void>();

  internalTeam: JobUser[] = [];
  subcontractors: JobUser[] = [];
  ratings: { [userId: string]: number } = {};

  constructor(
    private dialog: MatDialog,
    private jobAssignmentService: JobAssignmentService,
    private ratingService: RatingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assignedTeamMembers']) {
      this.filterMembers();
    }
  }

  filterMembers(): void {
    this.internalTeam = [];
    this.subcontractors = [];

    if (this.assignedTeamMembers) {
      this.assignedTeamMembers.forEach((member) => {
        const isSubcontractor =
          member.userType === 'SUBCONTRACTOR' ||
          member.jobRole === 'SUBCONTRACTOR' ||
          member.jobRole === 'Subcontractor';

        if (isSubcontractor) {
          this.subcontractors.push(member);
          this.loadRating(member.id);
        } else {
          this.internalTeam.push(member);
        }
      });
    }
  }

  loadRating(userId: string): void {
    this.ratingService.getRatingsForUser(userId).subscribe({
      next: (ratings) => {
        if (ratings && ratings.length > 0) {
          const avg =
            ratings.reduce((sum: any, r: any) => sum + (r.ratingValue || 0), 0) /
            ratings.length;
          this.ratings[userId] = parseFloat(avg.toFixed(1));
        } else {
          this.ratings[userId] = 0;
        }
      },
      error: () => {
        this.ratings[userId] = 0;
      },
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  openAddTeamMemberDialog(): void {
    const dialogRef = this.dialog.open(AddTeamMemberDialogComponent, {
      width: '500px',
      data: { jobId: this.projectDetails?.jobId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refreshTeam.emit();
      }
    });
  }

  openAddSubcontractorDialog(): void {
    const dialogRef = this.dialog.open(AddSubcontractorDialogComponent, {
      width: '500px',
      data: { jobId: this.projectDetails?.jobId },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.refreshTeam.emit();
      }
    });
  }

  openMemberDetail(member: JobUser): void {
    this.dialog.open(TeamMemberDetailDialogComponent, {
      width: '500px',
      data: { member },
    });
  }

  openSubcontractorDetail(sub: JobUser): void {
    this.dialog.open(SubcontractorDetailDialogComponent, {
      width: '500px',
      data: { sub },
    });
  }

  confirmRemove(member: JobUser, type: 'team' | 'sub'): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Removal',
        message: `Are you sure you want to remove ${member.firstName} ${member.lastName} from the project? This action cannot be undone.`,
        confirmButtonText: 'Remove',
        cancelButtonText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.removeMember(member, type);
      }
    });
  }

  removeMember(member: JobUser, type: 'team' | 'sub'): void {
    const link = {
      userId: member.id,
      jobId: Number(this.projectDetails?.jobId),
      jobRole: member.jobRole || '',
    };

    this.jobAssignmentService.deleteUserAssignment(link).subscribe({
      next: () => {
        this.snackBar.open(
          `${type === 'team' ? 'Team member' : 'Subcontractor'} removed successfully`,
          'Close',
          { duration: 3000 }
        );
        this.refreshTeam.emit();

        if (type === 'sub') {
          this.promptPostToMarketplace(member);
        }
      },
      error: (err) => {
        console.error('Error removing user', err);
        this.snackBar.open('Failed to remove user.', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  promptPostToMarketplace(member: JobUser): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Subcontractor Removed',
        message: `${member.firstName} ${member.lastName} has been removed. Would you like to post this trade to the Marketplace to find a replacement?`,
        confirmButtonText: 'Post to Marketplace',
        cancelButtonText: 'No Thanks',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.openPostToMarketplaceDialog(member);
      }
    });
  }

  openPostToMarketplaceDialog(removedMember?: JobUser): void {
    // TODO: Infer trade from removed member
    const prefilledTrade = removedMember?.jobRole;

    const dialogRef = this.dialog.open(PostToMarketplaceDialogComponent, {
      width: '600px',
      data: {
        jobId: this.projectDetails?.jobId,
        prefilledTrade: prefilledTrade,
        projectDetails: this.projectDetails,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Post logic is handled within the dialog or returns data to handle here
        // If handled in dialog, just show a success message or refresh
        this.snackBar.open('Job posted to Marketplace', 'Close', {
          duration: 3000,
        });
      }
    });
  }
}
