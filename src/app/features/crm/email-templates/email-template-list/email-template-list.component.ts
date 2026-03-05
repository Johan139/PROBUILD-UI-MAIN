import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import {
  EmailTemplateService,
  EmailTemplate,
} from './../email-template.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-email-template-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './email-template-list.component.html',
  styleUrls: ['./email-template-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailTemplateListComponent {
  private service = inject(EmailTemplateService);
  private router = inject(Router);

  templates$: Observable<EmailTemplate[]> = this.service.getAll();

  trackById(index: number, item: EmailTemplate) {
    return item.templateId;
  }

  editTemplate(template: EmailTemplate) {
    this.router.navigate(['/crm/email-templates', template.templateId]);
  }

  openTemplate(template: EmailTemplate) {
    this.router.navigate(['/crm/email-templates', template.templateId]);
  }
}
