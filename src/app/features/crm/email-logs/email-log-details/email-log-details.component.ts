import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { EmailLogsService, EmailLogDetails } from '../email-logs.service';

@Component({
  selector: 'app-email-log-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
  ],
  templateUrl: './email-log-details.component.html',
  styleUrls: ['./email-log-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailLogDetailsComponent {
  private route = inject(ActivatedRoute);
  private service = inject(EmailLogsService);

  displayedColumns: string[] = ['timestamp', 'type', 'reason', 'response'];

  log$ = this.route.paramMap.pipe(
    switchMap((params) => {
      const id = params.get('id');
      if (!id) throw new Error('Missing email log id');
      return this.service.getById(id);
    }),
  );

  trackByIndex(index: number) {
    return index;
  }

  asArray(log: EmailLogDetails) {
    return log.events || [];
  }
}
