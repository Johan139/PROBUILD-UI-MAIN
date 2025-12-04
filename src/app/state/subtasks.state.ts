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
}

export interface SubtaskGroup {
  title: string;
  subtasks: Subtask[];
}

export interface SubtasksState {
  subtaskGroups: SubtaskGroup[];
  projectDetails?: any;
  forecast?: ForecastDay[];
  weatherDescription?: string;
  weatherError?: string | null;
}
