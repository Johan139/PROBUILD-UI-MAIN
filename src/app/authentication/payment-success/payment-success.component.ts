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
ngAfterViewInit(): void
{
    if ((this.source ?? '').toLowerCase() === 'profile') {
    this.router.navigate(['/profile'], {
      queryParams: { subSuccess: 1 },
      replaceUrl: true // avoid leaving the intermediate success page in history
    });
}
}
  goToDashboard() {
    if (this.source === 'register') {
      this.router.navigate(['/login']);
    } 
  }
}