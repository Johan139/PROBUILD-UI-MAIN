import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subscription-warning',
  templateUrl: './subscription-warning.component.html',
  styleUrls: ['./subscription-warning.component.scss'],
  standalone: true,
  imports: [],
})
export class SubscriptionWarningComponent {

  @Output() upgradeClicked = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Input() subscriptionActive: boolean = false;
  @Input() isLoading: boolean = true;

  onUpgradeClick(): void {
    this.upgradeClicked.emit();
  }
}
