export interface Quote {
  id: string | null;
  rows: QuoteRow[];
  total: number;
  createdDate: Date;
  extraCosts: { type: 'extraCost' | 'taxPercent' | 'flatTotal' | 'discount'; value: number; title: string }[];
}

export interface QuoteRow {
  description: string;
  quantity: number;
  unitPrice: number;
  total: string;
}