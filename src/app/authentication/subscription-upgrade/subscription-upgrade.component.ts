import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { StripeService } from '../../services/StripeService';
import { MatRadioModule } from '@angular/material/radio';

export interface SubscriptionDialogData {
  packages: {
    value: string;
    display: string;
    amount: number;
    annualAmount: number;
  }[];
  currentValue: string | null;
  isTeamMember: boolean;
  subscriptionId?: string;
  userId?: string;
  annualAmount: number;
}

interface ProrationPreviewLineDto {
  description: string;
  amount: number;
}

interface ProrationPreviewDto {
  prorationDateUnix: number;
  currency: string;
  prorationSubtotal: number;
  previewTotal: number;
  nextBillingDate: string;
  prorationLines: ProrationPreviewLineDto[];
}

export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionUpgradeResult {
  subscriptionPackage: string;
  billingCycle: BillingCycle;
}

@Component({
  selector: 'app-subscription-upgrade',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
  ],
  templateUrl: './subscription-upgrade.component.html',
  styleUrls: ['./subscription-upgrade.component.scss'],
})
export class SubscriptionUpgradeComponent implements OnInit {
  form!: FormGroup;

  prorationPreview: ProrationPreviewDto | null = null;
  previewLoading = false;
  previewError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private stripeService: StripeService,
    public dialogRef: MatDialogRef<
      SubscriptionUpgradeComponent,
      SubscriptionUpgradeResult | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionDialogData,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      subscriptionPackage: [null, Validators.required],
      billingCycle: ['monthly'],
    });

    // Re-preview whenever billing cycle changes
    this.form.get('billingCycle')?.valueChanges.subscribe(() => {
      const selectedPackage = this.form.get('subscriptionPackage')?.value;
      if (selectedPackage) {
        this.onPackageChange(selectedPackage);
      }
    });

    // Auto-select a previewable package
    const firstPreviewable = this.data.packages.find((p) =>
      this.isPreviewable(p.value),
    );
    if (firstPreviewable) {
      this.form
        .get('subscriptionPackage')!
        .setValue(firstPreviewable.value, { emitEvent: false });
      this.onPackageChange(firstPreviewable.value);
    }
  }

  // ALWAYS USE CURRENT billingCycle — queueMicrotask ensures correctness
  onPackageChange(selectedPackage: string) {
    // Run logic AFTER Angular updates the form control values
    queueMicrotask(() => {
      const billingCycle = this.form.get('billingCycle')?.value as BillingCycle;

      this._runProration(selectedPackage, billingCycle);
    });
  }

  private _runProration(selectedPackage: string, billingCycle: BillingCycle) {
    if (
      !selectedPackage ||
      selectedPackage === this.data.currentValue ||
      !this.isPreviewable(selectedPackage) ||
      !this.data.subscriptionId
    ) {
      this.previewLoading = false;
      this.prorationPreview = null;
      this.previewError = null;
      return;
    }

    this.previewLoading = true;
    this.previewError = null;
    this.prorationPreview = null;

    this.stripeService
      .previewUpgradeByPackage({
        subscriptionId: this.data.subscriptionId,
        packageName: selectedPackage,
        prorationDate: Math.floor(Date.now() / 1000),
        userId: this.data.userId,
        billingCycle: billingCycle,
      })
      .subscribe({
        next: (preview) => {
          this.prorationPreview = preview;
          this.previewLoading = false;
        },
        error: (err) => {
          console.error('Preview failed', err);
          this.previewError = 'Could not fetch proration preview.';
          this.previewLoading = false;
        },
      });
  }

  private isPreviewable(pkgValue: string): boolean {
    if (!pkgValue) return false;
    if (pkgValue === this.data.currentValue) return false;

    const pkg = this.data.packages.find((p) => p.value === pkgValue);
    if (!pkg) return false;

    const blob = `${pkg.value} ${pkg.display}`.toLowerCase();
    const isZero = pkg.amount <= 0;
    const isTrial =
      blob.includes('trial') || blob.includes('basic') || blob.includes('free');

    return !isZero && !isTrial;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.valid) {
      const billingCycle = this.form.value.billingCycle as BillingCycle;
      const subscriptionPackage = this.form.value.subscriptionPackage as string;

      this.dialogRef.close({ subscriptionPackage, billingCycle });
    }
  }

  formatCurrency(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: (currency || 'USD').toUpperCase(),
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${(currency || '').toUpperCase()}`;
    }
  }
}
