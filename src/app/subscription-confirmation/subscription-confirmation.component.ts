// subscription-confirmation.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SubscriptionService } from '../../app/services/subscription.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subscription-confirmation',
  templateUrl: './subscription-confirmation.component.html',
  styleUrls: ['./subscription-confirmation.component.scss'],
  standalone: true, // <== ✅ make sure this is here
  imports: [CommonModule, ReactiveFormsModule], // <== ✅ add ReactiveFormsModule here
})
export class SubscriptionConfirmationComponent {
  form: FormGroup;
  submitted = false;

  constructor(private fb: FormBuilder, private subscriptionService: SubscriptionService) {
    this.form = this.fb.group({
      legalName: ['', Validators.required],
      contactName: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      subscriptionType: ['', Validators.required],
      platformTier: [''],
      numSeats: [''],
      customTerms: [''],
      acceptMSA: [false, Validators.requiredTrue],
      acceptPrivacy: [false, Validators.requiredTrue],
      confirmAuthority: [false, Validators.requiredTrue]
    });
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.valid) {
      this.subscriptionService.submitSubscription(this.form.value).subscribe({
        next: () => alert('Subscription confirmed and emailed.'),
        error: (err) => alert('Error sending form: ' + err.message)
      });
    }
  }
}