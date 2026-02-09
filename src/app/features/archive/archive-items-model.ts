export interface ArchivedItem {
  id: string;
  type: 'JOB' | 'QUOTE' | 'INVOICE' | 'DOCUMENT' | 'TASK';
  title: string;
  status: string;
  client: string;
  archivedAt: string;
  amount: number;
}
