export interface Subtask {
  id?: number;
  task: string;
  days: number;
  status?: string;
  deleted?: boolean;
  accepted?: boolean;
  startDate?: string;
  endDate?: string;
  cost: number;
  description?: string;
  location?: string;
  notes?: string;
  detailsJson?: string;
  materials?: string[];
  checklist?: { item: string; done: boolean }[];
  photos?: { url: string; caption: string; date: string }[];
}
