import { Routes } from '@angular/router';
import { EmailTemplateListComponent } from './email-template-list/email-template-list.component';
import { EmailTemplateEditorComponent } from './email-template-editor/email-template-editor.component';

export const EMAIL_TEMPLATE_ROUTES: Routes = [
  {
    path: '',
    component: EmailTemplateListComponent,
  },
  {
    path: ':id',
    component: EmailTemplateEditorComponent,
  },
];
