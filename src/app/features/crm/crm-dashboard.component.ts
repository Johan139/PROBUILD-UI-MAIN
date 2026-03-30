import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-crm-dashboard',
  standalone: true,
  imports: [RouterModule, MatCardModule, MatIconModule],
  templateUrl: './crm-dashboard.component.html',
  styleUrls: ['./crm-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmDashboardComponent {}
