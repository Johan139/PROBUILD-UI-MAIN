import { Component, Input } from '@angular/core';


@Component({
  selector: 'app-subscription-warning',
  templateUrl: './subscription-warning.component.html',
  styleUrls: ['./subscription-warning.component.scss'],
  standalone: true,
  imports: [],
})
export class SubscriptionWarningComponent {
  @Input() subscriptionActive: boolean = false;
  @Input() isLoading: boolean = true;
}
