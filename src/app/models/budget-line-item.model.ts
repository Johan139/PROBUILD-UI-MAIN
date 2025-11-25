export interface BudgetLineItem {
  id: number;
  jobId: number;
  category: string;
  item: string;
  trade: string;
  estimatedCost: number;
  actualCost: number;
  percentComplete: number;
  status: string;
  notes: string;
  source: string;
  sourceId?: string;
  forecastToComplete?: number;
}
