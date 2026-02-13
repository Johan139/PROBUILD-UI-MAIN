export interface SubtaskLoadResult {
  source: 'subtasks';
  data: any[];
}

export interface BomLoadResult {
  source: 'bom';
  markdown: string;
}

export type JobLoadResult = SubtaskLoadResult | BomLoadResult;
