export interface JobDocument {
  id: number;
  jobId?: number;
  fileName: string;
  blobUrl: string;
  sessionId: string;
  uploadedAt: string;
  displayName: string;
  type?: string;
  size?: number;
}
