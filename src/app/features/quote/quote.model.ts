export interface Quote {
    id: string | null;
    rows: QuoteRow[];
    total: number;
    createdDate: Date;
    extraCosts: { type: 'none' | 'multiplyPercent' | 'dividePercent' | 'multiplyValue' | 'divideValue' | 'addFixedValue'; value: number }[];
  }
  
  export interface QuoteRow {
    description: string;
    quantity: number;
    unitPrice: number;
    total: string;
  }