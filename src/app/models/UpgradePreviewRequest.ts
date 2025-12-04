export interface UpgradePreviewRequest {
  subscriptionId: string;
  packageName: string; // server maps this to Stripe Price
  prorationDate?: number; // unix seconds (optional)
  userId?: string; // if your server needs it
}
