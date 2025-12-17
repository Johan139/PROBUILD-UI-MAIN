export interface Permit {
  id?: number;
  jobId: number;
  name: string;
  issuingAgency?: string;
  requirements?: string;
  status: string;
  startDate?: string | Date;
  expirationDate?: string | Date;
  documentId?: number;
  isAiGenerated: boolean;
  document?: {
    id: number;
    fileName: string;
    blobUrl: string;
  };
}
