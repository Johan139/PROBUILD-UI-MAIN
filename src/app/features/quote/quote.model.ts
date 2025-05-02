export interface Quote {
  id: string | null;
  header: string;
  number: string;
  from: string;
  toTitle: string;
  to: string;
  shipToTitle: string;
  shipTo: string;
  date: string;
  paymentTerms: string;
  dueDate: string;
  poNumber: string;
  itemHeader: string;
  quantityHeader: string;
  unitCostHeader: string;
  amountHeader: string;
  amountPaid: number;
  extraCostValue: number;
  taxValue: number;
  discountValue: number;
  flatTotalValue: number;
  notesTitle: string;
  notes: string;
  termsTitle: string;
  terms: string;
  rows: QuoteRow[];
  total: number;
  createdDate: Date;
  createdBy: string;
  extraCosts: { type: 'extraCost' | 'taxPercent' | 'flatTotal' | 'discount'; value: number; title: string }[];
}

export interface QuoteRow {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}