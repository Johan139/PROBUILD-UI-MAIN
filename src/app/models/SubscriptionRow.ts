export interface SubscriptionRow {
  package: string;
  validUntil: Date | null;
  amount: number;
  assignedUser: string | null;
  assignedUserName?: string | null;
  status: string;
  subscriptionId: string;
  cancelAtPeriodEnd: boolean; // ✅ Add this line
}
