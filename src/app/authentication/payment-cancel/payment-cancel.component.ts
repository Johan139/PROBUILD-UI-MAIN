import { Component } from '@angular/core';
import { Router } from '@angular/router';

// ✅ Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-payment-cancel',
  standalone: true, // ✅ NOW this component supports imports
  imports: [MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './payment-cancel.component.html',
  styleUrls: ['./payment-cancel.component.scss'],
})
export class PaymentCancelComponent {
  constructor(private router: Router) {}

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }
}
