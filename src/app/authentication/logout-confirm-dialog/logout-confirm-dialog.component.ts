import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-logout-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './logout-confirm-dialog.component.html',
  styleUrls: ['./logout-confirm-dialog.component.scss'],
})
export class LogoutConfirmDialogComponent {}
