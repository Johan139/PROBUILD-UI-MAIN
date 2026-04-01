import { Project } from '../../models/project';

/** Building size from API is stored in square feet. */
const SQ_FT_PER_SQ_M = 10.76391041671;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  INITIATION: 'Project Initiation',
  BIDDING: 'Bidding Phase',
  BID_SOLICITATION: 'Bid Solicitation',
  LIVE: 'Live Project',
  CONSTRUCTION_LIVE: 'Construction Live',
  DRAFT: 'Preliminary',
  PRELIMINARY: 'Preliminary Scope Review',
  PRELIMINARY_SCOPE: 'Preliminary Scope Review',
  DETAILED_TAKEOFF: 'Detailed Estimating & Takeoff',
  CONTRACT_AWARD: 'Contract Award & Execution',
  PRE_CONSTRUCTION: 'Pre-Construction & Compliance',
  TRADE_AWARD: 'Trade Award & Final Buyout',
  MOBILIZATION: 'Project Mobilization',
  CLOSEOUT: 'Project Closeout & Handover',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  DISCARD: 'Discarded',
  ARCHIVED: 'Archived',
  CLOSURE: 'Closed',
  NEW: 'New',
  ANALYZING: 'Analyzing',
};

export function formatDateDdMmmYyyy(
  value: Date | string | null | undefined,
): string {
  if (value == null || value === '') {
    return '';
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime()) || d.getFullYear() <= 1) {
    return '';
  }
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS[d.getMonth()];
  const y = d.getFullYear();
  return `${day}-${mon}-${y}`;
}

export function parseProjectStartDate(project: unknown): Date | null {
  const p = project as Record<string, unknown>;
  const rawDate =
    p?.['potentialStartDate'] ??
    p?.['desiredStartDate'] ??
    p?.['startDate'] ??
    p?.['biddingStartDate'] ??
    p?.['PotentialStartDate'] ??
    p?.['DesiredStartDate'] ??
    null;

  if (rawDate == null || rawDate === '') {
    return null;
  }

  const parsed = new Date(rawDate as string | number | Date);
  if (isNaN(parsed.getTime()) || parsed.getFullYear() <= 1) {
    return null;
  }

  return parsed;
}

export function parseProjectBuildingSizeSqFt(project: unknown): number | null {
  const p = project as Record<string, unknown>;
  const rawSize =
    p?.['buildingSize'] ??
    p?.['projectSize'] ??
    p?.['underRoofArea'] ??
    p?.['BuildingSize'] ??
    null;

  const n = parseNumericValue(rawSize);
  return n > 0 ? n : null;
}

function parseNumericValue(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCountry(c: string | undefined | null): string {
  return (c ?? '').trim().toLowerCase();
}

function inferMetricFromAddress(address: string | undefined): boolean | null {
  if (!address) {
    return null;
  }
  const a = address.toLowerCase();
  if (/,?\s*usa\s*$/i.test(a) || /,?\s*united states\s*$/i.test(a)) {
    return false;
  }
  const metricHints = [
    'south africa',
    'united kingdom',
    'australia',
    'new zealand',
    'ireland',
    'germany',
    'france',
    'spain',
    'italy',
    'netherlands',
    'belgium',
    'sweden',
    'norway',
    'denmark',
    'finland',
    'austria',
    'switzerland',
    'portugal',
    'poland',
    'india',
    'japan',
    'china',
    'brazil',
    'mexico',
    'argentina',
    'canada',
  ];
  for (const h of metricHints) {
    if (a.includes(h)) {
      return true;
    }
  }
  return null;
}

/** True = show sq ft; false = show sq m (converted from stored sq ft). */
export function useImperialAreaDisplay(project: Project | unknown): boolean {
  const p = project as Record<string, unknown>;
  const c = normalizeCountry(p?.['country'] as string | undefined);
  if (
    c === 'us' ||
    c === 'usa' ||
    c === 'united states' ||
    c === 'united states of america'
  ) {
    return true;
  }
  if (c.length > 0) {
    return false;
  }
  const inferred = inferMetricFromAddress(p?.['address'] as string | undefined);
  if (inferred !== null) {
    return !inferred;
  }
  return true;
}

export function formatProjectBuildingAreaDisplay(project: Project | unknown): string {
  const sqFt = parseProjectBuildingSizeSqFt(project);
  if (sqFt == null) {
    return 'TBD';
  }
  const imperial = useImperialAreaDisplay(project);
  if (imperial) {
    return `${sqFt.toLocaleString('en-US', { maximumFractionDigits: 0 })} sq ft`;
  }
  const sqM = sqFt / SQ_FT_PER_SQ_M;
  return `${sqM.toLocaleString('en-US', { maximumFractionDigits: 0 })} sq m`;
}

export function getProjectStatusLabel(status: string | undefined): string {
  if (!status) {
    return 'Unknown';
  }
  const key = status.toUpperCase();
  return PROJECT_STATUS_LABELS[key] ?? status.replace(/_/g, ' ');
}
