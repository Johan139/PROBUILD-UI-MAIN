export interface Invoice {
  id: string;
  jobId: number;
  uploaderId: string;
  filePath: string;
  status: string;
  amount: number;
  uploadedAt: Date;
}
