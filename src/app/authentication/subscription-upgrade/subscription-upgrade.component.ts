import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { StripeService } from '../../services/StripeService';
import { MatRadioModule } from '@angular/material/radio';

export interface SubscriptionDialogData {
  packages: { value: string; display: string; amount: number; annualAmount: number }[];
  currentValue: string | null;
  isTeamMember: boolean;
  subscriptionId?: string;
  userId?: string;
  annualAmount : number;
}
interface ProrationPreviewLineDto { description: string; amount: number; }
interface ProrationPreviewDto {
  prorationDateUnix: number;
  currency: string;
  prorationSubtotal: number;
  previewTotal: number;
  nextBillingDate: string; // ISO
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
        MatButtonModule
    ],
    templateUrl: './subscription-upgrade.component.html',
    styleUrls: ['./subscription-upgrade.component.scss']
})
export class SubscriptionUpgradeComponent implements OnInit {
  form!: FormGroup;

  prorationPreview: ProrationPreviewDto | null = null;
  previewLoading = false;
  previewError: string | null = null;

  constructor(
    private fb: FormBuilder,
    private stripeService: StripeService,
    public dialogRef: MatDialogRef<SubscriptionUpgradeComponent, SubscriptionUpgradeResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionDialogData
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      subscriptionPackage: [null, Validators.required],
      billingCycle: ['monthly']
    });

    // Auto-select the first *previewable* option (paid, not trial/basic/free, not current)
    const firstPreviewable = (this.data.packages ?? []).find(p => this.isPreviewable(p.value));
    if (firstPreviewable) {
      this.form.get('subscriptionPackage')!.setValue(firstPreviewable.value, { emitEvent: false });
      // Trigger an initial preview so the user immediately sees the numbers
      this.onPackageChange(firstPreviewable.value);
    }
  }

  // Call from (selectionChange) in the template
  onPackageChange(selectedPackage: string) {
    // Skip if same plan, non-previewable (trial/basic/free), or no subscription to preview against
    if (!selectedPackage ||
        selectedPackage === this.data.currentValue ||
        !this.isPreviewable(selectedPackage) ||
        !this.data.subscriptionId) {
      this.previewLoading = false;
      this.prorationPreview = null;
      this.previewError = null;
      return;
    }

    this.previewLoading = true;
    this.previewError = null;
    this.prorationPreview = null;

    this.stripeService.previewUpgradeByPackage({
      subscriptionId: this.data.subscriptionId,
      packageName: selectedPackage,
      prorationDate: Math.floor(Date.now() / 1000),
      userId: this.data.userId
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
      }
    });
  }

  /** Only paid, non-trial/basic/free, and not the current plan should preview */
  private isPreviewable(pkgValue: string): boolean {
    if (!pkgValue) return false;
    if (pkgValue === this.data.currentValue) return false;

    const pkg = (this.data.packages ?? []).find(p => p.value === pkgValue);
    if (!pkg) return false;

    const nameBlob = `${pkg.value ?? ''} ${pkg.display ?? ''}`.toLowerCase();
    const isZero = (pkg.amount ?? 0) <= 0;
    const isTrialOrBasicOrFree =
      nameBlob.includes('trial') || nameBlob.includes('basic') || nameBlob.includes('free');

    return !isZero && !isTrialOrBasicOrFree;
  }

  cancel(): void {
    this.dialogRef.close();
  }

save(): void {
  if (this.form.valid) {
    const billingCycle = this.form.value.billingCycle as BillingCycle;
    const subscriptionPackage = this.form.value.subscriptionPackage as string;
console.log(subscriptionPackage)
    this.dialogRef.close({ subscriptionPackage, billingCycle });
  }
}

  formatCurrency(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: (currency || 'USD').toUpperCase()
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${(currency || '').toUpperCase()}`;
    }
  }
}
