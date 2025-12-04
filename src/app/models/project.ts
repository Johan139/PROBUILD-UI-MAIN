import { Job as JobModel } from './job';

export interface Project extends JobModel {
  team?: number;
  progress?: number;
  thumbnailUrl?: string;
  budget?: string;
  deadline?: string;
  status: 'BIDDING' | 'LIVE' | 'DRAFT' | 'FAILED' | 'DISCARD' | 'NEW' | string;
}
