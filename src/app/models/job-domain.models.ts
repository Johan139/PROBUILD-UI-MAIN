export interface JobProjectDetails {
  jobId?: string;

  userId?: string;

  projectName?: string;
  jobType?: string;
  quantity?: number;
  desiredStartDate?: string;

  wallStructure?: string;
  wallInsulation?: string;
  roofStructure?: string;
  roofInsulation?: string;

  foundation?: string;
  finishes?: string;
  electricalSupply?: string;

  stories?: number;
  buildingSize?: number;

  address?: string;
  latitude?: string;
  longitude?: string;

  blueprintPath?: string;

  isSelected?: boolean;
  isRenovation?: boolean;
}

export interface RawSubtask {
  id: number;
  groupTitle: string;
  task?: string;
  taskName?: string;
  days: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  cost?: number;
  deleted?: boolean;
}

export interface GroupedSubtask {
  title: string;
  subtasks: GroupedSubtaskItem[];
  progress: number;
}

export interface GroupedSubtaskItem {
  id: string;
  task: string;

  days: number;

  startDate: string;
  endDate: string;

  status: string;

  cost: number;

  deleted: boolean;
  accepted?: boolean;
}
