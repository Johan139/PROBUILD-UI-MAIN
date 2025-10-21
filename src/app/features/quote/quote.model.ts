export interface ExtraCost {
  type: string;
  value: number;
  title: string;
}

export interface QuoteRow {
  id?: number;
  quoteId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  quote?: Quote | null;
}

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
  extraCosts: ExtraCost[];
  createdBy: string;
  createdID: string;
  jobID?: string;
  version?: number;
  status?: string;
  logoId?: string;
}