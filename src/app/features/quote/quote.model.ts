export type DocumentType = 'QUOTE' | 'INVOICE';
export type QuoteStatus =
  | 'Draft'
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Withdrawn';
export type QuoteDirection = 'Outbound' | 'Inbound';

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
  documentType: DocumentType;

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
  status: QuoteStatus;
  documentType: DocumentType;
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
  direction: QuoteDirection;
  sentTo?: string;
  status: QuoteStatus;
  documentType?: DocumentType;
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
export interface PhaseMaterials {
  phase: string;
  csiCode: string;
  description?: string;
  materials: {
    item: string;
    quantity: number;
    unit: string;
    cost: number;
  }[];
  labor: number;
  totalAmount: number;
}
