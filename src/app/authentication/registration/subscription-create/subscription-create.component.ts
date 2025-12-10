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
import { MatRadioModule } from '@angular/material/radio';

export interface SubscriptionPackage {
  value: string;
  display: string;
  amount: number;
  annualAmount: number;
}

export interface SubscriptionDialogData {
  packages: SubscriptionPackage[];
  currentValue: string | null;
  isTeamMember: boolean;
  userId: string;

  // ONLY FOR SELF (not team)
  activeSubscription?: { subscriptionId: string; packageLabel?: string };

  notice?: string;
}

export type BillingCycle = 'monthly' | 'yearly';
export interface SubscriptionSelection {
  pkg: SubscriptionPackage;
  assigneeUserId: string;
  billingCycle: BillingCycle;
}

@Component({
  selector: 'app-subscription-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatRadioModule,
  ],
  templateUrl: './subscription-create.component.html',
  styleUrls: ['./subscription-create.component.scss'],
})
export class SubscriptionCreateComponent implements OnInit {
  form!: FormGroup;

  // team logic
  // activeByUserId?: Record<string, { subscriptionId: string; packageLabel?: string }>;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<
      SubscriptionCreateComponent,
      SubscriptionSelection | undefined
    >,
    @Inject(MAT_DIALOG_DATA) public data: SubscriptionDialogData,
  ) {}

  hasActiveFor(userId?: string | null): boolean {
    if (!userId) return false;

    // ONLY check self
    return userId === this.data.userId && !!this.data.activeSubscription;
  }

  activeLabel(userId?: string | null): string | undefined {
    if (userId === this.data.userId)
      return this.data.activeSubscription?.packageLabel;
    return undefined;
  }

  ngOnInit(): void {
    const currentPkg = this.data.currentValue
      ? (this.data.packages.find((p) => p.value === this.data.currentValue) ??
        null)
      : null;

    const selfBlocked = this.hasActiveFor(this.data.userId);

    this.form = this.fb.group({
      subscriptionPackage: [currentPkg, Validators.required],

      // team logic removed — always "self"
      forWhom: ['self'], // ← fixed
      // teamMemberId: [null], // ⛔ removed

      billingCycle: ['monthly'],
    });

    // team logic removed
    // this.form.get('forWhom')!.valueChanges.subscribe(...)
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) return;

    // always assign to self
    const assigneeUserId = this.data.userId;

    // still block active subscription
    if (this.hasActiveFor(assigneeUserId)) return;

    const pkg = this.form.value.subscriptionPackage as SubscriptionPackage;
    const billingCycle = this.form.value.billingCycle as BillingCycle;

    this.dialogRef.close({ pkg, assigneeUserId, billingCycle });
  }

  hasActiveForAssignee(): boolean {
    // team logic removed — only check self
    return false;
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
