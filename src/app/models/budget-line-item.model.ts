export interface BudgetLineItem {
  id: number;
  jobId: number;
  category: string;
  item: string;
  phase?: string;
  trade: string;
  vendor?: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  estimatedCost: number;
  actualCost: number;
  percentComplete: number;
  status: string;
  notes: string;
  source: string;
  sourceId?: string;
  forecastToComplete: number;
}
