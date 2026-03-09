import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith, switchMap } from 'rxjs/operators';
import { Observable, combineLatest } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import {
  EmailLogsService,
  EmailLogListItem,
  EmailLogStatus,
} from '../email-logs.service';

@Component({
  selector: 'app-email-logs-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './email-logs-list.component.html',
  styleUrls: ['./email-logs-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailLogsListComponent {
  private service = inject(EmailLogsService);
  private router = inject(Router);

  recipient = new FormControl<string>('', { nonNullable: true });
  status = new FormControl<EmailLogStatus | ''>('', { nonNullable: true });

  displayedColumns: string[] = [
    'createdAt',
    'toEmail',
    'subject',
    'templateName',
    'lastEventType',
    'lastEventAt',
    'actions',
  ];

  readonly statuses: { label: string; value: EmailLogStatus | '' }[] = [
    { label: 'All', value: '' },
    { label: 'Processed', value: 'processed' },
    { label: 'Sent', value: 'sent' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Deferred', value: 'deferred' },
    { label: 'Bounce', value: 'bounce' },
    { label: 'Dropped', value: 'dropped' },
    { label: 'Spam Report', value: 'spamreport' },
    { label: 'Unsubscribed', value: 'unsubscribe' },
    { label: 'Open', value: 'open' },
    { label: 'Click', value: 'click' },
  ];

  logs$: Observable<EmailLogListItem[]> = combineLatest([
    this.recipient.valueChanges.pipe(startWith(this.recipient.value)),
    this.status.valueChanges.pipe(startWith(this.status.value)),
  ]).pipe(
    switchMap(([recipient, status]) => {
      return this.service.getLogs({
        recipient: recipient || undefined,
        status: status || undefined,
        take: 100,
        skip: 0,
      });
    }),
  );

  trackById(index: number, item: EmailLogListItem) {
    return item.id;
  }

  openDetails(item: EmailLogListItem) {
    this.router.navigate(['/crm/email-logs', item.id]);
  }
}
