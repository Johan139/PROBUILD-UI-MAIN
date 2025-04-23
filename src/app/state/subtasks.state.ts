export interface Subtask {
    id: number;
    task: string;
    days: number;
    startDate: string;
    endDate: string;
    cost: number;
    status: string;
    deleted: boolean;
  }
  
  export interface SubtaskGroup {
    title: string;
    subtasks: Subtask[];
  }
  
  export interface SubtasksState {
    subtaskGroups: SubtaskGroup[];
  }