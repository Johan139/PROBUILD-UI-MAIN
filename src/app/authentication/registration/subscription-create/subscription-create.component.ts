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

// dialog interfaces
export interface SubscriptionDialogData {
  packages: SubscriptionPackage[];
  currentValue: string | null;
  isTeamMember: boolean;
  userId: string;
  teamMembers?: { id: string; name?: string; email?: string }[];
  activeByUserId?: Record<
    string,
    { subscriptionId: string; packageLabel?: string }
  >;
  notice?: string; // 👈
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
  activeByUserId?: Record<
    string,
    { subscriptionId: string; packageLabel?: string }
  >;
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
    return !!this.data.activeByUserId?.[userId];
  }
  activeLabel(userId?: string | null): string | undefined {
    return this.data.activeByUserId?.[userId!]?.packageLabel;
  }
  ngOnInit(): void {
    const currentPkg = this.data.currentValue
      ? (this.data.packages.find((p) => p.value === this.data.currentValue) ??
        null)
      : null;

    const selfBlocked = this.hasActiveFor(this.data.userId);

    this.form = this.fb.group({
      subscriptionPackage: [currentPkg, Validators.required],
      forWhom: [selfBlocked ? 'team' : 'self', Validators.required],
      teamMemberId: [null],
      billingCycle: ['monthly'], // default value
    });

    this.form.get('forWhom')!.valueChanges.subscribe((val) => {
      const tm = this.form.get('teamMemberId')!;
      if (val === 'team') tm.setValidators([Validators.required]);
      else {
        tm.clearValidators();
        tm.setValue(null);
      }
      tm.updateValueAndValidity({ emitEvent: false });
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    const forWhom = this.form.value.forWhom;
    const assigneeUserId =
      forWhom === 'team' ? this.form.value.teamMemberId : this.data.userId;

    // 🔒 Hard guard – covers self and team
    if (this.form.invalid || this.hasActiveFor(assigneeUserId)) return;

    const pkg = this.form.value.subscriptionPackage as SubscriptionPackage;
    const billingCycle = this.form.value.billingCycle as 'monthly' | 'yearly';

    this.dialogRef.close({ pkg, assigneeUserId, billingCycle });
  }
  hasActiveForAssignee(): boolean {
    const forWhom = this.form.value.forWhom;
    const targetId =
      forWhom === 'self' ? this.data.userId : this.form.value.teamMemberId;
    return !!(targetId && this.data.activeByUserId?.[targetId]);
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
