export interface QuoteExtraCostDto {
  type: string;
  value: number;
  title: string;
}

export interface QuoteRowDto {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface QuoteDto {
  quoteId: string | null;
  jobID: number | null;
  companyId: number;
  number: string;
  documentType: 'QUOTE' | 'INVOICE';

  from: string;
  to: string;

  date?: string;
  dueDate?: string;

  notes?: string;
  terms?: string;
  paymentTerms?: string;
  total: number;

  createdID: string;
  createdBy: string;

  clientAddress: string;
  clientPhone: string;
  clientEmail: string;

  projectName: string;
  projectAddress: string;
  logoId?: string | null;
  rows: QuoteRowDto[];
  extraCosts: QuoteExtraCostDto[];
}
export interface QuoteViewDto {
  quoteId: string;
  number: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  documentType: 'QUOTE' | 'INVOICE';
  currentVersion: number;
  logoUrl?: string;
  version: QuoteVersionDto;
  rows: QuoteRowDto[];
  extraCosts: QuoteExtraCostDto[];
  createdID: string;
  sentTo: string;
}
export interface QuoteVersionDto {
  version: number;
  header: string;
  from: string;
  to: string;
  date: string;
  dueDate: string;
  notes: string;
  terms: string;
  total: number;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  paymentTerms?: string;
  logoId?: string | null;
  projectName: string;
  projectAddress: string;
}
export interface QuoteListItemDto {
  id: string;

  jobId: number;

  number: string;
  createdBy: string;
  createdDate: string;
  direction: 'Outbound' | 'Inbound';
  sentTo?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  documentType?: 'QUOTE' | 'INVOICE';
  jobName?: string;
  clientName?: string;
  total?: number;
  documentUrl?: string;
}
export interface LogoDto {
  id: string;
  url: string;
  fileName?: string;
}
export type QuoteStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
export interface PhaseMaterials {
  phase: string;
  csiCode: string;
  description?: string;
  materials: {
    item: string;
    cost: number;
  }[];
  labor: number;
  totalAmount: number;
}
