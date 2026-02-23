export interface ArchivedItem {
  id: string;
  type: string;
  title: string;
  status: string;
  archivedAt: Date | string;
  // Quotes / invoices
  client?: string;
  amount?: number;
  // Documents
  project?: string;
  documentType?: string;
  size?: number;
  // Trade Packages (Job Postings)
  tradeName?: string;
  bidsCount?: number;
  jobId?: string;
}
