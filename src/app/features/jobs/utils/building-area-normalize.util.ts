/**
 * Normalize blueprint / AI "under roof" area values to square feet for display
 * and calculations. Raw extractions are often unlabeled m² (e.g. 341) while the
 * job record stores sq ft (e.g. 3670).
 */

export type AreaUnit = 'sqft' | 'sqm' | 'unknown';

export interface ParsedArea {
  value: number;
  unit: AreaUnit;
}

export function normalizeNumericText(raw: string): string {
  const compact = raw.replace(/\s/g, '');
  const hasComma = compact.includes(',');
  const hasDot = compact.includes('.');

  if (hasComma && hasDot) {
    return compact.replace(/,/g, '');
  }

  if (hasComma && !hasDot) {
    if (/,(\d{1,2})$/.test(compact)) {
      return compact.replace(',', '.');
    }
    return compact.replace(/,/g, '');
  }

  return compact;
}

export function parseAreaWithUnit(input: unknown): ParsedArea | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const unit: AreaUnit = /\bm²\b|\bm2\b|\bsqm\b|\bsq m\b/.test(lower)
    ? 'sqm'
    : /\bsq\s*ft\b|\bsqft\b|\bft²\b|\bft2\b/.test(lower)
      ? 'sqft'
      : 'unknown';

  const numericText = normalizeNumericText(raw).replace(/[^0-9.-]/g, '');
  const value = Number.parseFloat(numericText);
  if (!Number.isFinite(value)) return null;

  return { value, unit };
}

/** Whole number for UI — no thousands separators (matches plain numeric strings elsewhere). */
export function formatWholeNumberNoGrouping(value: number): string {
  if (!Number.isFinite(value)) {
    return '';
  }
  return String(Math.round(value));
}

/** Returns square feet, or null if input cannot be parsed to a positive area. */
export function normalizeUnderRoofAreaToSqFt(rawArea: unknown): number | null {
  const parsed = parseAreaWithUnit(rawArea);
  if (!parsed || parsed.value <= 0) return null;

  if (parsed.unit === 'sqm') {
    return parsed.value * 10.7639;
  }

  if (parsed.unit === 'sqft') {
    return parsed.value;
  }

  // Unlabeled numeric from extraction: small values are usually m².
  return parsed.value <= 500 ? parsed.value * 10.7639 : parsed.value;
}

/**
 * Square feet for project header / summary: prefer job-record size so the value
 * does not jump when blueprint intelligence loads (e.g. 3670 → 3669 from m² conversion).
 * Use normalized under-roof only when the job has no stored size.
 */
export function resolveDisplayedProjectAreaSqFt(
  buildingSize: unknown,
  projectSize: unknown,
  underRoofRaw: unknown,
): number {
  const fromJob = Number(
    String(buildingSize ?? projectSize ?? 0).replace(/[^0-9.-]/g, ''),
  );
  if (Number.isFinite(fromJob) && fromJob > 0) {
    return fromJob;
  }
  const fromIntel = normalizeUnderRoofAreaToSqFt(underRoofRaw);
  if (fromIntel != null && fromIntel > 0) {
    return fromIntel;
  }
  return 0;
}
