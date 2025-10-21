import { Job } from './job';

export interface Portfolio {
  id: number;
  userId: string;
  jobs: Job[];
}
