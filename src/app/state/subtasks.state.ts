export interface Subtask {
    task: string;
    days: number;
    startDate: string;
    endDate: string;
    cost: number;
  }
  
  export interface SubtaskGroup {
    title: string;
    subtasks: Subtask[];
  }
  
  export interface SubtasksState {
    subtaskGroups: SubtaskGroup[];
  }