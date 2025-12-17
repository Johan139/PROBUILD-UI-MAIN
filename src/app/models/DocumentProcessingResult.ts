export interface DocumentProcessingResult {
  id: number;
  jobId: number;
  documentId: number;
  bomJson: string;
  materialsEstimateJson: string;
  fullResponse: string;
  createdAt: string; // ISO date string
}
