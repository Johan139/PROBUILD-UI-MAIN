export interface ProrationPreviewLineDto {
  description: string;
  amount: number; // already in currency units (e.g. dollars)
}

export interface ProrationPreviewDto {
  prorationDateUnix: number;
  currency: string; // e.g. "usd"
  prorationSubtotal: number; // decimal, already divided by 100 on server
  previewTotal: number; // decimal, already divided by 100 on server
  nextBillingDate: string; // ISO string (or Date if you prefer)
  prorationLines: ProrationPreviewLineDto[];
}
