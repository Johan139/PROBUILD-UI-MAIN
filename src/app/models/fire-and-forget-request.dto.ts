import { UploadedFileInfo } from '../services/file-upload.service';

export interface FireAndForgetRequestDto {
  analysisType: 'sequential' | 'selected' | 'renovation';
  budgetLevel: 'high' | 'medium' | 'low';
  selectedPrompts: number[];
  uploadedFiles: UploadedFileInfo[];
}
