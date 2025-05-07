import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  templateUrl: './payment-success.component.html',
  styleUrls: ['./payment-success.component.scss']
})
export class PaymentSuccessComponent implements OnInit {
  source: string = 'register';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.source = params['source'] || 'register';
    });
  }

  goToDashboard() {
    if (this.source === 'register') {
      this.router.navigate(['/login']);
    } else if (this.source === 'Profile') {
      this.router.navigate(['/dashboard']);
    }
  }
}