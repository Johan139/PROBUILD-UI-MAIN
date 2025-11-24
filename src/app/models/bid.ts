import { Job } from './job';

export class Bid {
    id!: number;
    jobId!: string;
    subcontractorId!: string;
    subcontractorName!: string;
    amount!: number;
    isFinalist!: boolean;
    job?: Job;
    status?: string;
    quoteId?: string;
    documentUrl?: string;
  }
  