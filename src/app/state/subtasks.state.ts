import { GroupedSubtask, JobProjectDetails } from '../models/job-domain.models';
import { PhaseMaterials } from '../features/quote/quote.model';
import { ForecastDay } from '../services/weather.service';

export interface Subtask {
  id: number;
  task: string;
  days: number;
  startDate: string;
  endDate: string;
  cost: number;
  status: string;
  deleted: boolean;
  accepted?: boolean;
  description?: string;
  location?: string;
  notes?: string;
  detailsJson?: string;
  materials?: string[];
  checklist?: { item: string; done: boolean }[];
  photos?: { url: string; caption: string; date: string }[];
}

export interface SubtaskGroup {
  title: string;
  subtasks: Subtask[];
}

export interface SubtasksState {
  projectDetails: JobProjectDetails | null;
  subtaskGroups: GroupedSubtask[];
  materialGroups: PhaseMaterials[];
  forecast: any[];
  weatherDescription: string;
  weatherError: string | null;
}
