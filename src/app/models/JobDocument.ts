export interface JobDocument {
    id: number;
    jobId?: number;
    fileName: string;
    blobUrl: string;
    sessionId: string;
    uploadedAt: string;
  }