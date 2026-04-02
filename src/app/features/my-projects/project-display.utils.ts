import { Project } from '../../models/project';
import {
  formatWholeNumberNoGrouping,
  resolveDisplayedProjectAreaSqFt,
} from '../jobs/utils/building-area-normalize.util';

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

/**
 * Same square-foot basis as Preliminary Scope Review: prefer job building/project
 * size, then normalize blueprint under-roof (unlabeled m² vs sq ft heuristics).
 */
export function parseProjectBuildingSizeSqFt(project: unknown): number | null {
  const p = project as Record<string, unknown>;
  const n = resolveDisplayedProjectAreaSqFt(
    p?.['buildingSize'] ?? p?.['BuildingSize'],
    p?.['projectSize'] ?? p?.['ProjectSize'],
    p?.['underRoofArea'] ?? p?.['UnderRoofArea'],
  );
  return n > 0 ? n : null;
}

/** Always sq ft — matches Scope Review header (not country-based sq m). */
export function formatProjectBuildingAreaDisplay(project: Project | unknown): string {
  const sqFt = parseProjectBuildingSizeSqFt(project);
  if (sqFt == null) {
    return 'TBD';
  }
  return `${formatWholeNumberNoGrouping(sqFt)} sq ft`;
}

export function getProjectStatusLabel(status: string | undefined): string {
  if (!status) {
    return 'Unknown';
  }
  const key = status.toUpperCase();
  return PROJECT_STATUS_LABELS[key] ?? status.replace(/_/g, ' ');
}
