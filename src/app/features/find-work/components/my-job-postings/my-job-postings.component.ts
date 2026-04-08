import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Job } from '../../../../models/job';
import {
  ExternalCompanyWithContacts,
  ExternalContact,
} from '../../../../models/external-data';
import { ExternalDataService } from '../../../../services/external-data.service';
import { InvitationService } from '../../../../services/invitation.service';
import { BomService } from '../../../jobs/services/bom.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../quote/confirmation-dialog.component';
@Component({
  selector: 'app-my-job-postings',
  templateUrl: './my-job-postings.component.html',
  styleUrls: ['./my-job-postings.component.scss'],
  standalone: true,
  imports: [MatIconModule, MatButtonModule, FormsModule],
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

  availableSubcontractorsByJob: Record<number, ExternalCompanyWithContacts[]> =
    {};
  subcontractorLoadingByJob: Record<number, boolean> = {};
  subcontractorErrorByJob: Record<number, string> = {};

  constructor(
    private externalDataService: ExternalDataService,
    private invitationService: InvitationService,
    private bomService: BomService,
    private dialog: MatDialog,
  ) {}

  getTotalBidsReceived(): number {
    return this.myPostings.reduce(
      (acc, job) => acc + (job.numberOfBids || 0),
      0,
    );
  }

  getTotalPostingsValue(): string {
    const total = this.myPostings.reduce((acc, job) => {
      if (job.tradeBudgets && job.tradeBudgets.length > 0) {
        return (
          acc + job.tradeBudgets.reduce((sum, item) => sum + item.budget, 0)
        );
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
  archiveJob(job: Job, event: MouseEvent): void {
    event.stopPropagation();

    const tradePackageId = (job as any).tradePackageId;
    if (!tradePackageId) {
      alert('No trade package found for this job.');
      return;
    }

    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          title: 'Archive Job',
          message: `Are you sure you want to archive "${job.projectName}"?`,
          confirmText: 'Archive',
          confirmColor: 'warn',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.bomService.archivePackage(tradePackageId).subscribe({
          next: () => {
            this.myPostings = this.myPostings.filter(
              (j) => j.jobId !== job.jobId,
            );
          },
          error: () => {
            alert('Failed to archive job. Please try again.');
          },
        });
      });
  }
  getJobBudget(job: Job): string {
    if (job.tradeBudgets && job.tradeBudgets.length > 0) {
      const total = job.tradeBudgets.reduce(
        (sum, item) => sum + item.budget,
        0,
      );
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

    if (this.expandedJobId === jobId) {
      const job = this.myPostings.find((x) => x.jobId === jobId);
      if (job) {
        this.loadSubcontractorsForJob(job);
      }
    }
  }

  loadSubcontractorsForJob(job: Job): void {
    const radius = Number(this.inviteRadius[job.jobId] || 25);
    const tradeName = this.getPrimaryTrade(job);

    this.subcontractorLoadingByJob[job.jobId] = true;
    this.subcontractorErrorByJob[job.jobId] = '';

    this.externalDataService
      .discoverSubcontractors({
        tradePackageId: (job as any).tradePackageId || undefined,
        jobId: job.jobId,
        tradeName,
        city: job.city || undefined,
        state: job.state || undefined,
        radiusMiles: radius,
        limit: 12,
        searchText: this.subcontractorSearch?.trim() || undefined,
      })
      .subscribe({
        next: (results) => {
          this.availableSubcontractorsByJob[job.jobId] = Array.isArray(results)
            ? results
            : [];
          this.subcontractorLoadingByJob[job.jobId] = false;
        },
        error: () => {
          this.availableSubcontractorsByJob[job.jobId] = [];
          this.subcontractorLoadingByJob[job.jobId] = false;
          this.subcontractorErrorByJob[job.jobId] =
            'Unable to load subcontractors right now.';
        },
      });
  }

  getVisibleSubcontractors(job: Job): ExternalCompanyWithContacts[] {
    const list = this.availableSubcontractorsByJob[job.jobId] || [];
    const q = this.subcontractorSearch.trim().toLowerCase();
    if (!q) {
      return list;
    }

    return list.filter((row) => {
      const name = row.company?.name?.toLowerCase() || '';
      const industry = row.company?.industry?.toLowerCase() || '';
      const domain = row.company?.domain?.toLowerCase() || '';
      return name.includes(q) || industry.includes(q) || domain.includes(q);
    });
  }

  getPrimaryContact(row: ExternalCompanyWithContacts): ExternalContact | null {
    if (!row?.contacts?.length) {
      return null;
    }

    const withEmail = row.contacts.find((c) => !!c.email?.trim());
    return withEmail || row.contacts[0] || null;
  }

  getPrimaryContactLabel(row: ExternalCompanyWithContacts): string {
    const contact = this.getPrimaryContact(row);
    if (!contact) {
      return 'No contact found';
    }

    return contact.fullName || contact.title || contact.email || 'Contact';
  }

  inviteSubcontractor(
    row: ExternalCompanyWithContacts,
    event: MouseEvent,
  ): void {
    event.stopPropagation();

    const contact = this.getPrimaryContact(row);
    const email = contact?.email?.trim();
    if (!email) {
      alert(`No email address found for ${row.company.name}.`);
      return;
    }

    const nameParts = (contact?.fullName || '')
      .trim()
      .split(' ')
      .filter(Boolean);
    const firstName = nameParts[0] || row.company.name;
    const lastName = nameParts.slice(1).join(' ') || 'Team';

    this.invitationService
      .inviteUser({
        email,
        firstName,
        lastName,
        phoneNumber: contact?.phone || undefined,
      })
      .subscribe({
        next: () => {
          alert(`Invitation sent to ${email}`);
        },
        error: () => {
          alert(`Failed to send invitation to ${email}`);
        },
      });
  }

  sendDirectInvite(event: MouseEvent): void {
    event.stopPropagation();
    const email = this.emailInvite.trim();
    if (!email) {
      return;
    }

    this.invitationService
      .inviteUser({
        email,
        firstName: 'Invite',
        lastName: 'Recipient',
      })
      .subscribe({
        next: () => {
          alert(`Invitation sent to ${email}`);
          this.emailInvite = '';
        },
        error: () => {
          alert(`Failed to send invitation to ${email}`);
        },
      });
  }
}
