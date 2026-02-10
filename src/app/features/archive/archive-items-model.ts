export interface ArchivedItem {
  id: string;
  type: 'JOB' | 'QUOTE' | 'INVOICE' | 'DOCUMENT' | 'TASK';
  title: string;
  status: string;
  archivedAt: string;

  // Quote / invoice specific
  client?: string;
  amount?: number;

  // Document specific
  project?: string;
  documentType?: string;
  size?: number;
}
