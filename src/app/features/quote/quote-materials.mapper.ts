import { PhaseMaterials } from './quote.model';

export interface QuoteRowSeed {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}
export function mapMaterialsToQuoteRows(
  materialGroups: PhaseMaterials[],
): any[] {
  const rows: any[] = [];
  materialGroups.forEach((phase) => {
    // Add each material as a separate row
    phase.materials.forEach((material) => {
      rows.push({
        description: `${phase.phase} - ${material.item}`,
        quantity: material.quantity,
        unit: material.unit, // Lump Sum
        unitPrice: material.cost,
        total: material.cost,
      });
    });

    // Optionally add labor as a separate row
    if (phase.labor > 0) {
      rows.push({
        description: `${phase.phase} - Labor`,
        quantity: 1,
        unit: 'LS',
        unitPrice: phase.labor,
        total: phase.labor,
      });
    }
  });

  return rows;
}
export function mapMaterialsToQuoteRowsByPhase(
  materialGroups: PhaseMaterials[],
): any[] {
  const rows: any[] = [];

  materialGroups.forEach((phase) => {
    // Calculate total materials cost for this phase
    const materialsCost = phase.materials.reduce(
      (sum, m) => sum + m.cost * m.quantity,
      0,
    );

    // Add phase as a single row with materials + labor
    rows.push({
      description: phase.phase,
      quantity: 1,
      unit: 'LS',
      unitPrice: materialsCost + phase.labor,
      total: materialsCost + phase.labor,
    });
  });

  return rows;
}
