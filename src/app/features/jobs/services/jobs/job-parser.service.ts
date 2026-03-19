import { Injectable } from '@angular/core';
import { PhaseMaterials } from '../../../quote/quote.model';
import { GroupedSubtask } from '../../../../models/job-domain.models';

@Injectable({
  providedIn: 'root',
})
export class JobParserService {
  // ================================
  // DAILY PLAN
  // ================================

  parseDailyConstructionPlan(report: string): any[] {
    if (!report) return [];

    const dailyPlan: any[] = [];
    const startMarker = '### Phase 25: Daily Construction & Logistics Plan';
    const tableHeaderRegex =
      /\|\s*Project Day\s*\|\s*Date\s*\|\s*Phase\s*\|\s*Daily Tasks & Instructions\s*\|\s*Materials Required On-Site\s*\|\s*Equipment Required On-Site\s*\|\s*Personnel Required On-Site\s*\|\s*Key Milestones\/Inspections\s*\|/;

    let startIndex = report.indexOf(startMarker);
    if (startIndex === -1) return [];

    const lines = report.substring(startIndex).split('\n');
    let tableStarted = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('Ready for the next prompt')) {
        break;
      }

      if (!tableStarted && tableHeaderRegex.test(trimmedLine)) {
        tableStarted = true;
        continue;
      }

      if (
        !tableStarted ||
        !trimmedLine.startsWith('|') ||
        trimmedLine.includes('---')
      ) {
        continue;
      }

      const columns = trimmedLine
        .split('|')
        .map((c) => c.trim())
        .slice(1, -1);

      if (columns.length < 8) continue;

      const day = columns[0].replace(/\*\*/g, '');
      const date = columns[1];
      const phase = columns[2];
      const tasks = columns[3];
      const materials = columns[4];
      const equipment = columns[5];
      const personnel = columns[6];
      const milestones = columns[7];

      dailyPlan.push({
        day,
        date,
        phase,
        tasks,
        materials,
        equipment,
        personnel,
        milestones,
      });
    }

    return dailyPlan;
  }

  // ================================
  // TIMELINE PARSING
  // ================================

  parseTimelineToTaskGroups(report: string): GroupedSubtask[] {
    if (!report) return [];

    const taskGroupMap = new Map<string, any[]>();
    let isSelected = false;
    let isRenovation = false;

    try {
      const jsonMatch = report.match(/```json([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.isSelected === 'true') {
          isSelected = true;
        }
        if (parsedJson.isRenovation === 'true') {
          isRenovation = true;
        }
      }

      if (!isRenovation) {
        isRenovation =
          /This concludes the comprehensive project analysis for the .*?\. Standing by\./.test(
            report,
          );
      }
    } catch (e) {
      console.error('Error parsing JSON for timeline:', e);
    }

    // ------------------------
    // SELECTED PATH
    // ------------------------

    if (isSelected) {
      const lines = report.split('\n');
      let tableStarted = false;
      let currentPhase = '';
      let inTimelineSection = false;
      let timelinePromptNumber: number | null = null;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!inTimelineSection) {
          const timelineHeadingMatch = trimmedLine.match(
            /^###\s*Phase\s+(\d+)\s*:\s*Timeline\b/i,
          );
          if (timelineHeadingMatch) {
            inTimelineSection = true;
            timelinePromptNumber = Number(timelineHeadingMatch[1]);
          }
        }

        if (!inTimelineSection) {
          continue;
        }

        if (
          trimmedLine.toLowerCase().startsWith('ready for the next prompt') &&
          (timelinePromptNumber === null ||
            trimmedLine.includes(String(timelinePromptNumber)))
        ) {
          break;
        }

        // If a new phase section starts after we began parsing the timeline table, stop.
        if (tableStarted && /^###\s*Phase\s+\d+\s*:/i.test(trimmedLine)) {
          break;
        }

        // Hard stop if we hit the next output section after timeline
        if (tableStarted && /^###\s*\*{0,2}Output\b/i.test(trimmedLine)) {
          break;
        }

        if (trimmedLine.startsWith('| Phase | Task |')) {
          tableStarted = true;
          continue;
        }

        if (
          !tableStarted ||
          !trimmedLine.startsWith('|') ||
          trimmedLine.includes('---')
        ) {
          continue;
        }

        const columns = trimmedLine
          .split('|')
          .map((c) => c.trim())
          .slice(1, -1);

        if (columns.length < 6) continue;

        const phaseRaw = columns[0].replace(/\*\*/g, '').trim();
        if (phaseRaw) {
          currentPhase = phaseRaw;
        }

        const taskName = columns[1];
        const durationStr = columns[3];
        let startDateStr = columns[4];
        const endDateStr = columns[5];
        const costStr = columns.length > 8 ? columns[8] : undefined;

        const cost = this.parseCost(costStr);

        if (
          phaseRaw
            .toLowerCase()
            .replace(/\*/g, '')
            .includes('total project duration')
        ) {
          continue;
        }

        const duration = this.parseDurationDays(durationStr);
        if (duration === null) {
          continue;
        }

        let endDate = this.parseDate(endDateStr);
        let startDate = this.parseDate(startDateStr);

        if (!startDate && endDate && duration > 0) {
          startDate = new Date(endDate);
          startDate.setDate(endDate.getDate() - duration);
        } else if (!startDate && endDate) {
          startDate = endDate;
        }

        if (!startDate || !endDate) {
          continue;
        }

        if (!taskGroupMap.has(currentPhase)) {
          taskGroupMap.set(currentPhase, []);
        }

        taskGroupMap.get(currentPhase)?.push({
          task: this.cleanTaskName(taskName),
          days: duration,
          startDate: startDate ? this.formatDateToYYYYMMDD(startDate) : '',
          endDate: endDate ? this.formatDateToYYYYMMDD(endDate) : '',
          status: 'Pending',
          cost,
          deleted: false,
          accepted: false,
        });
      }
    }

    // ------------------------
    // FULL ANALYSIS PATH
    // ------------------------
    else {
      const lines = report.split('\n');
      let tableStarted = false;
      const headerRegex =
        /\|\s*Phase\s*\|\s*Task\s*\|\s*Duration(?:\s*\((?:Workdays|Days)\))?\s*\|/i;
      let currentPhase = '';
      let inTimelineSection = false;
      let timelinePromptNumber: number | null = null;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!inTimelineSection) {
          const timelineHeadingMatch = trimmedLine.match(
            /^###\s*Phase\s+(\d+)\s*:\s*Timeline\b/i,
          );
          if (timelineHeadingMatch) {
            inTimelineSection = true;
            timelinePromptNumber = Number(timelineHeadingMatch[1]);
          }
        }

        if (!inTimelineSection) continue;

        if (
          trimmedLine.toLowerCase().startsWith('ready for the next prompt') &&
          (timelinePromptNumber === null ||
            trimmedLine.includes(String(timelinePromptNumber)))
        ) {
          break;
        }

        // If a new section starts after we began parsing the timeline table, stop.
        if (tableStarted && /^###\s*Phase\s+\d+\s*:/i.test(trimmedLine)) {
          break;
        }

        // Hard stop if we hit the next output section after timeline
        if (tableStarted && /^###\s*\*{0,2}Output\b/i.test(trimmedLine)) {
          break;
        }

        if (!tableStarted && headerRegex.test(trimmedLine)) {
          tableStarted = true;
          continue;
        }

        if (
          !tableStarted ||
          !trimmedLine.startsWith('|') ||
          trimmedLine.includes('---')
        ) {
          continue;
        }

        const columns = trimmedLine
          .split('|')
          .map((c) => c.trim())
          .slice(1, -1);

        if (columns.length < 6) continue;

        const phaseRaw = columns[0];
        const taskName = columns[1];
        const duration = columns[2];
        const startDate = columns[4];
        const endDate = columns[5];
        const costStr = columns.length > 8 ? columns[8] : undefined;

        const cost = this.parseCost(costStr);

        if (
          phaseRaw.includes('Financial Milestone') ||
          taskName.includes('Financial Milestone')
        ) {
          continue;
        }

        const phaseName = phaseRaw.replace(/\*\*|\\/g, '').trim();
        if (phaseName) currentPhase = phaseName;

        if (!taskGroupMap.has(currentPhase)) {
          taskGroupMap.set(currentPhase, []);
        }

        if (!taskName) continue;

        const formatDateString = (dateStr: string) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        };

        const parsedDuration = this.parseDurationDays(duration);
        if (parsedDuration === null) {
          continue;
        }

        const formattedStart = formatDateString(startDate);
        const formattedEnd = formatDateString(endDate);
        if (!formattedStart || !formattedEnd) {
          continue;
        }

        taskGroupMap.get(currentPhase)?.push({
          task: this.cleanTaskName(taskName),
          days: parsedDuration,
          startDate: formattedStart,
          endDate: formattedEnd,
          status: 'Pending',
          cost,
          deleted: false,
          accepted: false,
        });
      }
    }

    if (taskGroupMap.size === 0) {
      return [];
    }

    const groups = Array.from(taskGroupMap.entries()).map(([title, subtasks]) => {
      const completedCount = subtasks.filter(
        (s) => s.status && s.status.toLowerCase() === 'completed',
      ).length;

      const progress =
        subtasks.length > 0
          ? Math.round((completedCount / subtasks.length) * 100)
          : 0;

      return {
        title: this.cleanTaskName(title),
        subtasks,
        progress,
      };
    });

    return this.enrichConstructionPhaseSubtasks(groups);
  }

  // ================================
  // MATERIALS
  // ================================

  extractMaterialGroups(markdown: string): PhaseMaterials[] {
    if (!markdown) return [];

    const quotationSection = markdown.match(
      /###\s*\*\*Output 1: Quotation Data[\s\S]*?```json\s*([\s\S]*?)\s*```/,
    );

    if (!quotationSection || !quotationSection[1]) {
      const allJsonBlocks = markdown.matchAll(/```json\s*([\s\S]*?)\s*```/g);

      for (const match of allJsonBlocks) {
        if (match[1].includes('Categorized_Materials')) {
          return this.parseMaterialsFromJson(match[1]);
        }
      }

      return [];
    }

    return this.parseMaterialsFromJson(quotationSection[1]);
  }

  private parseMaterialsFromJson(jsonString: string): PhaseMaterials[] {
    try {
      const raw = JSON.parse(jsonString);

      if (!Array.isArray(raw)) return [];

      const filtered = raw.filter(
        (x) =>
          x['Categorized_Materials'] &&
          Array.isArray(x['Categorized_Materials']) &&
          x['Categorized_Materials'].length > 0,
      );

      return filtered.map((x) => ({
        phase: x['Phase_Item'],
        csiCode: x['CSI_Code'],
        description: x['Description'],
        materials: x['Categorized_Materials'].map((m: any) => ({
          item: m.Item,
          quantity: m.Quantity,
          unit: m.Unit,
          cost: Number(m.Rate) || 0,
        })),
        labor: Number(x.Labor) || 0,
        totalAmount: Number(x.Amount) || 0,
      }));
    } catch {
      return [];
    }
  }

  // ================================
  // HELPERS
  // ================================

  private parseCost(costStr: string | undefined): number {
    if (!costStr) return 0;

    if (
      costStr.toLowerCase() === 'n/a' ||
      costStr.trim() === '-' ||
      costStr.trim() === ''
    ) {
      return 0;
    }

    const numeric = costStr.replace(/[^0-9.]/g, '');
    const value = parseFloat(numeric);

    return isNaN(value) ? 0 : value;
  }

  private parseDate(dateStr: string): Date | null {
    if (
      !dateStr ||
      dateStr.trim() === '-' ||
      dateStr.toLowerCase().includes('assumed complete')
    ) {
      return null;
    }

    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  private formatDateToYYYYMMDD(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private enrichConstructionPhaseSubtasks(groups: GroupedSubtask[]): GroupedSubtask[] {
    if (!Array.isArray(groups) || groups.length === 0) {
      return groups;
    }

    const isInvalidGroupTitle = (title: string) => {
      const t = (title || '').trim().toLowerCase();
      if (!t) return true;

      // day buckets from daily plan / prompt artifacts
      if (t === 'project day') return true;
      if (/^day\s*\d+\b/.test(t)) return true;
      if (/^days\s*\d+\s*-\s*\d+\b/.test(t)) return true;
      if (/\bready for the next prompt\b/.test(t)) return true;

      // common non-phase item names that should never become "phase" groups
      const looksLikeMaterialItem =
        t.includes('cabinet') ||
        t.includes('tile') ||
        t.includes('quartz') ||
        t.includes('shower') ||
        t.includes('door') ||
        t.includes('vinyl');
      if (looksLikeMaterialItem) return true;

      return false;
    };

    return groups.filter((g) => !isInvalidGroupTitle(g?.title));
  }

  private parseDurationDays(durationStr: string | undefined | null): number | null {
    const raw = String(durationStr ?? '').trim();
    if (!raw) {
      return null;
    }

    const match = raw.match(/\d{1,4}/);
    if (!match) {
      return null;
    }

    const value = Number(match[0]);
    if (!Number.isFinite(value)) {
      return null;
    }

    if (value <= 0 || value > 365) {
      return null;
    }

    return value;
  }

  private cleanTaskName(name: string): string {
    if (typeof name === 'string') {
      return name.replace(/^\*\*|\*\*$/g, '').trim();
    }
    return name;
  }
}
