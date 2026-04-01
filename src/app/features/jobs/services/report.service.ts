import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { marked } from 'marked';
import { Permit } from '../../../models/permit';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly bomResultsCacheTtlMs = 2 * 60 * 1000;
  private bomResultsCache = new Map<
    string,
    { cachedAt: number; results: any[] | null }
  >();

  constructor(
    private jobsService: JobsService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
  ) {}

  invalidateBomResultsCache(jobId?: string): void {
    const key = String(jobId || '').trim();
    if (key) {
      this.bomResultsCache.delete(key);
      return;
    }
    this.bomResultsCache.clear();
  }

  private sortBomResultsNewestFirst(results: any[]): any[] {
    return [...results].sort((a: any, b: any) => {
      const timeA = new Date(a?.createdAt || 0).getTime();
      const timeB = new Date(b?.createdAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;

      const idA = Number(a?.id || 0);
      const idB = Number(b?.id || 0);
      return idB - idA;
    });
  }

  private selectBestBomResult(results: any[] | null): any | null {
    if (!Array.isArray(results) || results.length === 0) return null;

    const withResponse = results.filter(
      (r) => typeof r?.fullResponse === 'string' && r.fullResponse.trim().length > 0,
    );
    if (withResponse.length === 0) return null;

    const scored = [...withResponse].sort((a: any, b: any) => {
      const textA = String(a?.fullResponse || '');
      const textB = String(b?.fullResponse || '');
      const hasPhase30A = /###\s*Phase\s*30\s*:/i.test(textA) ? 1 : 0;
      const hasPhase30B = /###\s*Phase\s*30\s*:/i.test(textB) ? 1 : 0;
      if (hasPhase30A !== hasPhase30B) return hasPhase30B - hasPhase30A;

      const timeA = new Date(a?.createdAt || 0).getTime();
      const timeB = new Date(b?.createdAt || 0).getTime();
      if (timeA !== timeB) return timeB - timeA;

      const idA = Number(a?.id || 0);
      const idB = Number(b?.id || 0);
      if (idA !== idB) return idB - idA;

      return textB.length - textA.length;
    });

    return scored[0] || null;
  }

  private async getBomResults(jobId: string): Promise<any[] | null> {
    const key = String(jobId);
    const now = Date.now();
    const cached = this.bomResultsCache.get(key);
    if (cached && now - cached.cachedAt < this.bomResultsCacheTtlMs) {
      return cached.results;
    }

    try {
      const results = await this.jobsService.GetBillOfMaterials(jobId).toPromise();
      const normalized = Array.isArray(results)
        ? this.sortBomResultsNewestFirst(results)
        : null;
      this.bomResultsCache.set(key, { cachedAt: now, results: normalized });
      return normalized;
    } catch (err) {
      this.bomResultsCache.delete(key);
      throw err;
    }
  }

  async getPermitsAndApprovalsReport(jobId: string): Promise<Permit[]> {
    try {
      const results = await this.getBomResults(jobId);
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return [];
      }
      const fullResponse = results[0].fullResponse;

      const sectionContent = this.extractPermitsSection(fullResponse);
      if (!sectionContent) {
        return [];
      }

      const lines = sectionContent.split('\n');
      const permits: Permit[] = [];
      let inTable = false;

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed.startsWith('|')) {
          if (inTable) {
            break;
          }
          continue;
        }

        if (trimmed.includes('---')) {
          inTable = true;
          continue;
        }

        if (inTable) {
          const parts = line
            .split('|')
            .map((p) => p.trim())
            .filter((p) => p !== '');
          if (parts.length >= 3) {
            const name = parts[0].replace(/\*\*/g, '');
            const agency = parts[1].replace(/\*\*/g, '');
            const requirements = parts[2].replace(/\*\*/g, '');

            if (name.toLowerCase() !== 'permit name') {
              permits.push({
                jobId: parseInt(jobId),
                name: name,
                issuingAgency: agency,
                requirements: requirements,
                status: 'Pending',
                isAiGenerated: true,
              });
            }
          }
        }
      }

      return permits;
    } catch (err) {
      console.error('Failed to get permits report:', err);
      return [];
    }
  }

  private extractPermitsSection(fullResponse: string): string | null {
    const headingPattern = /^\s*#{2,6}\s*\*{0,2}\s*4\.\s*Permits\s+and\s+Approvals\s+Report\s*\*{0,2}\s*$/im;
    const headingMatch = headingPattern.exec(fullResponse);

    if (!headingMatch || headingMatch.index === undefined) {
      return null;
    }

    const startIndex = headingMatch.index;
    const afterStart = fullResponse.slice(startIndex + headingMatch[0].length);

    const nextHeadingPattern = /^\s*#{2,6}\s*\*{0,2}\s*\d+\./im;
    const nextHeadingMatch = nextHeadingPattern.exec(afterStart);

    if (!nextHeadingMatch || nextHeadingMatch.index === undefined) {
      return fullResponse.slice(startIndex);
    }

    return fullResponse.slice(startIndex, startIndex + headingMatch[0].length + nextHeadingMatch.index);
  }

  async getEnvironmentalReportContent(jobId: string): Promise<string | null> {
    try {
      const results = await this.getBomResults(jobId);
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }

      const fullResponse = results[0].fullResponse;
      let reportContent = '';
      let isRenovation = false;
      try {
        const jsonMatch = fullResponse.match(/```json([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
          const parsedJson = JSON.parse(jsonMatch[1]);
          if (parsedJson.isRenovation === 'true') {
            isRenovation = true;
          }
        }
        if (!isRenovation) {
          // Fallback check
          isRenovation =
            /This concludes the comprehensive project analysis for the .*?\. Standing by\./.test(
              fullResponse,
            );
        }
      } catch (e) {
        console.error('Error parsing JSON from AI response for report:', e);
      }

      if (isRenovation) {
        const reportStartMarker = 'Ready for the next prompt 9.';
        const reportEndMarker = 'Ready for the next prompt 10.';
        let startIndex = fullResponse.indexOf(reportStartMarker);
        if (startIndex !== -1) {
          startIndex += reportStartMarker.length;
          const endIndex = fullResponse.indexOf(reportEndMarker, startIndex);
          if (endIndex !== -1) {
            reportContent = fullResponse.substring(startIndex, endIndex).trim();
          }
        }
      } else {
        const reportStartMarker = 'Ready for the next prompt 27.';
        const reportEndMarker = 'Ready for the next prompt 28.';
        let startIndex = fullResponse.indexOf(reportStartMarker);
        if (startIndex !== -1) {
          startIndex += reportStartMarker.length;
          const endIndex = fullResponse.indexOf(reportEndMarker, startIndex);
          if (endIndex !== -1) {
            reportContent = fullResponse.substring(startIndex, endIndex).trim();
          }
        }
      }

      if (!reportContent) {
        return null;
      }
      const linesToRemove = [
        'Here is the comprehensive Environmental Lifecycle Report for the Hernandez Residence.',
        '**Prepared By:** Gemini Sustainability Consulting',
        '**From:** Gemini - Sustainability Consultant & Estimator',
        '### **Phase 27: Environmental Lifecycle Report**',
        'Ready for the next prompt 10.',
        'Ready for the next prompt 27.',
        'Output 1:',
        'Output 2:',
        'I am Done',
        'Executive Summary Complete.',
      ];
      linesToRemove.forEach((line) => {
        reportContent = reportContent
          .replace(
            new RegExp(line.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
            '',
          )
          .trim();
      });

      // Remove the dynamic introductory paragraph
      reportContent = reportContent
        .replace(
          /As a Sustainability and Environmental Construction Analyst,[\s\S]*?\n\n/,
          '',
        )
        .trim();

      return marked(reportContent);
    } catch (err) {
      console.error('Failed to get bill of materials for report:', err);
      return null;
    }
  }

  async getFullReportContent(jobId: string): Promise<string | null> {
    try {
      const results = await this.getBomResults(jobId);
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }
      let fullResponse = results[0].fullResponse;

      // Ensure Executive Summary appears first in the final compiled report.
      const executiveSummary = this.extractExecutiveSummarySection(fullResponse);

      // Remove initial JSON block
      fullResponse = fullResponse.replace(/```json[\s\S]*?```/g, '').trim();

      // Remove unwanted lines/markers
      const linesToRemove = [
        'I am Done',
        'Executive Summary Complete.',
        'Output 1: ',
        'Output 2: ',
      ];

      // Also remove "Ready for the next prompt X." lines
      fullResponse = fullResponse.replace(
        /Ready for the next prompt \d+\./g,
        '',
      );

      linesToRemove.forEach((line) => {
        fullResponse = fullResponse.replace(new RegExp(line, 'g'), '');
      });

      // Clean up extra newlines that might result from removals
      fullResponse = fullResponse.replace(/\n{3,}/g, '\n\n').trim();

      if (executiveSummary) {
        // Remove any existing Executive Summary section from the body,
        // then prepend it so it always renders at the top.
        const escapedSummary = executiveSummary
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\s+/g, '\\s+');

        fullResponse = fullResponse
          .replace(new RegExp(escapedSummary, 'i'), '')
          .replace(/^\s+/, '')
          .trim();

        fullResponse = `${executiveSummary}\n\n${fullResponse}`.trim();
      }

      return marked(fullResponse);
    } catch (err) {
      console.error('Failed to get full report content:', err);
      return null;
    }
  }

  private extractExecutiveSummarySection(fullResponse: string): string | null {
    let cleanResponse = fullResponse.replace(/```json[\s\S]*?```/g, '').trim();

    const startMarkerRegex = /###?\s*Executive Summary/i;
    const endMarker = 'Executive Summary Complete.';

    const match = cleanResponse.match(startMarkerRegex);
    if (!match || match.index === undefined) {
      return null;
    }

    let content = cleanResponse.substring(match.index);
    const endIndex = content.indexOf(endMarker);
    if (endIndex !== -1) {
      content = content.substring(0, endIndex);
    }

    content = content.replace(startMarkerRegex, '').trim();
    return content ? `### Executive Summary\n\n${content}` : null;
  }

  async getExecutiveSummary(jobId: string): Promise<string | null> {
    try {
      const results = await this.getBomResults(jobId);
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }
      const fullResponse = results[0].fullResponse;

      // Clean up JSON blocks first
      let cleanResponse = fullResponse
        .replace(/```json[\s\S]*?```/g, '')
        .trim();

      const startMarkerRegex = /###?\s*Executive Summary/i;
      const endMarker = 'Executive Summary Complete.';

      const match = cleanResponse.match(startMarkerRegex);

      if (match && match.index !== undefined) {
        let startIndex = match.index;
        let content = cleanResponse.substring(startIndex);

        const endIndex = content.indexOf(endMarker);
        if (endIndex !== -1) {
          content = content.substring(0, endIndex);
        }

        // Remove the title line we just found so we can normalize it
        content = content.replace(startMarkerRegex, '').trim();

        // Add title back as H3 for the PDF/Display
        content = `### Executive Summary\n\n${content}`;

        return marked(content);
      } else {
        console.warn('Executive Summary start marker not found in response.');
        // console.log('Response snippet:', cleanResponse.substring(cleanResponse.length - 500)); // Debug log
      }

      return null;
    } catch (err) {
      console.error('Failed to get executive summary:', err);
      return null;
    }
  }

  async getExecutiveSummaryData(jobId: string): Promise<any> {
    try {
      const results = await this.getBomResults(jobId);
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }
      const fullResponse = results[0].fullResponse;
      const cleaned = fullResponse.replace(/```json[\s\S]*?```/g, '').trim();
      const sectionMatch = cleaned.match(
        /###\s*Executive Summary([\s\S]*?)(?:Executive Summary Complete\.|$)/i,
      );
      const summaryText = sectionMatch?.[1] || cleaned;

      const cleanText = (value: string): string =>
        String(value || '')
          .replace(/\*\*/g, '')
          .replace(/`/g, '')
          .trim();

      const extractBlock = (titleRegex: RegExp, untilRegex?: RegExp): string => {
        const fromTitle = summaryText.match(titleRegex);
        if (!fromTitle || fromTitle.index === undefined) return '';

        const blockStart = fromTitle.index + fromTitle[0].length;
        let block = summaryText.substring(blockStart);
        if (untilRegex) {
          const end = block.match(untilRegex);
          if (end && end.index !== undefined) {
            block = block.substring(0, end.index);
          }
        }
        return cleanText(block);
      };

      const numberedHeading = (numPattern: string, title: string): RegExp =>
        new RegExp(
          `(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${numPattern}\\.?\\s*${title}(?:\\*\\*)?\\s*`,'i',
        );

      const nextNumberedHeading = (numPattern: string): RegExp =>
        new RegExp(`(?:\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${numPattern}\\.?`,'i');

      const overview = extractBlock(
        numberedHeading('1', 'Overview'),
        nextNumberedHeading('2'),
      );

      const keyHighlightsBlock = extractBlock(
        numberedHeading('2', 'Key Highlights'),
        nextNumberedHeading('3'),
      );
      const keyHighlights = keyHighlightsBlock
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => /^[-*]\s+/.test(line))
        .map((line) => line.replace(/^[-*]\s+/, ''))
        .map((line) => {
          const parts = line.split(':');
          const label = cleanText(parts[0] || 'Highlight');
          const valueRaw = cleanText(parts.slice(1).join(':'));
          const money = valueRaw.match(/\$[\d,.]+/);
          const percent = valueRaw.match(/\d+(?:\.\d+)?%/);
          const duration = valueRaw.match(/\b\d+\s*(?:months?|weeks?)\b/i);
          const value = money?.[0] || percent?.[0] || duration?.[0] || valueRaw || 'N/A';
          return {
            label,
            value,
            note: valueRaw,
          };
        });

      const extractBullets = (block: string): string[] =>
        block
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => /^[-*]\s+/.test(line))
          .map((line) => cleanText(line.replace(/^[-*]\s+/, '')))
          .filter(Boolean);

      const opportunities = extractBullets(
        extractBlock(numberedHeading('3\\.1', 'Opportunities'), nextNumberedHeading('3\\.2')),
      );
      const strategicRisks = extractBullets(
        extractBlock(
          numberedHeading('3\\.2', 'Risks\\s*&\\s*Challenges'),
          nextNumberedHeading('3\\.3'),
        ),
      );
      const strategicImplications = extractBullets(
        extractBlock(
          numberedHeading('3\\.3', 'Strategic\\s*Implications'),
          nextNumberedHeading('4'),
        ),
      );

      const recommendation = extractBlock(
        numberedHeading('13', 'Executive Recommendation'),
        /\n\s*Executive Summary Complete\.|\n###/i,
      );

      const priorities = summaryText
        .match(new RegExp(`${numberedHeading('10', 'Top 3 Executive Priorities[\\s\\S]*').source}[\\s\\S]*?(?=${nextNumberedHeading('11').source}|\\n###|$)`, 'i'))?.[0]
        ?.split('\n')
        .map((line) => line.trim())
        .filter((line) => /^\d+\./.test(line))
        .map((line) => cleanText(line.replace(/^\d+\.\s*/, '')))
        .filter(Boolean) || [];

      const risks: any[] = [];
      const riskTableRegex =
        /\|\s*Risk Category\s*\|\s*Severity\s*\|\s*Probability\s*\|\s*Notes\s*\|\s*\n\|[\s:\-\|]+\n([\s\S]*?)(?=\n\n|\n####|\n###|$)/i;
      const riskTableMatch = summaryText.match(riskTableRegex);
      if (riskTableMatch && riskTableMatch[1]) {
        const lines = riskTableMatch[1]
          .trim()
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('|'));

        lines.forEach((line) => {
          const parts = line
            .split('|')
            .map((p) => cleanText(p))
            .filter((p) => p !== '');
          if (parts.length >= 4) {
            risks.push({
              risk: parts[0],
              severity: parts[1].toLowerCase() === 'high' ? 'high' : 'medium',
              probability: parts[2],
              description: parts[3],
            });
          }
        });
      }

      const confidenceMatch =
        summaryText.match(/\*\*Overall Confidence Score\*\*\s*\|\s*\*\*(\d+)%\*\*/i) ||
        summaryText.match(/\*\*Overall Confidence Index\*\*\s*\|\s*\*\*(\d+)%\*\*/i);

      return {
        overview,
        keyHighlights,
        riskFactors: risks,
        strategicAnalysis: {
          opportunities,
          risks: strategicRisks,
          implications: strategicImplications,
        },
        topPriorities: priorities,
        executiveRecommendation: recommendation,
        blueprintConfidence: {
          overallConfidence: confidenceMatch ? parseInt(confidenceMatch[1], 10) : 0,
        },
      };
    } catch (err) {
      console.error('Failed to get executive summary data:', err);
      return null;
    }
  }

  async getProcurementSchedule(jobId: string): Promise<string | null> {
    try {
      const results = await this.getBomResults(jobId);
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }
      const fullResponse = results[0].fullResponse;

      const startMarker = '### Phase 24: Procurement & Submittal Schedule';
      const endMarker = 'Ready for the next prompt 24';

      let startIndex = fullResponse.indexOf(startMarker);
      if (startIndex !== -1) {
        const endIndex = fullResponse.indexOf(endMarker, startIndex);
        let content =
          endIndex !== -1
            ? fullResponse.substring(startIndex, endIndex).trim()
            : fullResponse.substring(startIndex).trim();

        content = content.replace(startMarker, '').trim();
        content = `### Procurement & Submittal Schedule\n\n${content}`;

        return marked(content);
      }
      return null;
    } catch (err) {
      console.error('Failed to get procurement schedule:', err);
      return null;
    }
  }

  async getDailyConstructionPlan(jobId: string): Promise<string | null> {
    try {
      const results = await this.getBomResults(jobId);
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }
      const fullResponse = results[0].fullResponse;

      const startMarker = '### Phase 25: Daily Construction & Logistics Plan';
      const endMarker = 'Ready for the next prompt 25';

      let startIndex = fullResponse.indexOf(startMarker);
      if (startIndex !== -1) {
        const endIndex = fullResponse.indexOf(endMarker, startIndex);
        let content =
          endIndex !== -1
            ? fullResponse.substring(startIndex, endIndex).trim()
            : fullResponse.substring(startIndex).trim();

        content = content.replace(startMarker, '').trim();
        content = `### Daily Construction & Logistics Plan\n\n${content}`;

        return marked(content);
      }
      return null;
    } catch (err) {
      console.error('Failed to get daily construction plan:', err);
      return null;
    }
  }

  async getBlueprintIntelligence(jobId: string): Promise<{
    confidenceScore: number;
    sheetCount: number;
    roomCount: number;
    rooms: { name: string; area: string }[];
    underRoofArea?: number;
    dimensionalAccuracy?: number;
    completeness?: number;
    readability?: number;
  }> {
    try {
      const results = await this.getBomResults(jobId);
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return { confidenceScore: 0, sheetCount: 0, roomCount: 0, rooms: [] };
      }
      const fullResponse = results[0].fullResponse;

      let confidenceScore = 0;
      let sheetCount = 0;
      let roomCount = 0;
      let rooms: { name: string; area: string }[] = [];
      let underRoofArea = 0;
      let dimensionalAccuracy = 0;
      let completeness = 0;
      let readability = 0;

      const patterns = [
        /Overall Confidence Index\*\*\|\s*\*\*(\d+)%\*\*/,
        /Overall Confidence Index\*\*\|\s*(\d+)%/,
        /\|\s*\*\*Overall Confidence Index\*\*\s*\|\s*\*\*(\d+)%\*\*/,
        /Overall Confidence Index.*?(\d{1,3})%/,
      ];

      for (const pattern of patterns) {
        const match = fullResponse.match(pattern);
        if (match && match[1]) {
          confidenceScore = parseInt(match[1], 10);
          break;
        }
      }

      // Extract detailed breakdown
      const dimMatch = fullResponse.match(/Dimensional Accuracy\s*\|\s*(\d+)%/i);
      if (dimMatch && dimMatch[1])
        dimensionalAccuracy = parseInt(dimMatch[1], 10);

      const compMatch = fullResponse.match(
        /Completeness of Sheets\s*\|\s*(\d+)%/i,
      );
      if (compMatch && compMatch[1]) completeness = parseInt(compMatch[1], 10);

      const readMatch = fullResponse.match(
        /Readability & Clarity\s*\|\s*(\d+)%/i,
      );
      if (readMatch && readMatch[1]) readability = parseInt(readMatch[1], 10);

      // Recalculate Overall Score based on components if available to ensure consistency
      if (dimensionalAccuracy > 0 || completeness > 0 || readability > 0) {
        confidenceScore = Math.round(
          (dimensionalAccuracy + completeness + readability) / 3,
        );
      }

      const sheetMatch = fullResponse.match(/Sheet Numbers\*\* \| (.*?)\s*\|/);
      if (sheetMatch && sheetMatch[1]) {
        const sheets = sheetMatch[1].split(',').map((s) => s.trim());
        sheetCount = sheets.length;
      }

      // 2. Extract Total Under-Roof Area from metadata report/table when present
      // Supports values like:
      // - "**Total Under-Roof Area (sq ft)**: 5,030"
      // - "| **Total Under-Roof Area** | 5,171 sq ft (Per Sheet A-1) |"
      const underRoofMatch = fullResponse.match(
        /Total\s+Under[-\s]?Roof\s+Area(?:\s*\(sq\s*ft\))?\*{0,2}\s*(?:[:|]\s*)?(?:\*{0,2}\s*)?([0-9][0-9,]*(?:\.[0-9]+)?)/i,
      );
      if (underRoofMatch && underRoofMatch[1]) {
        const parsed = parseFloat(underRoofMatch[1].replace(/,/g, ''));
        if (!isNaN(parsed)) {
          underRoofArea = parsed;
        }
      }

      // 3. Extract Room Count (from Room Identification Table)
      // Supports markdown table format variants and excludes summary/total rows
      const cleanCell = (value: string): string =>
        value
          .replace(/\*\*/g, '')
          .replace(/`/g, '')
          .replace(/<br\s*\/?>/gi, ' ')
          .trim();

      const splitMarkdownRow = (line: string): string[] =>
        line
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cleanCell(cell));

      const isSeparatorRow = (line: string): boolean => {
        const compact = line.replace(/\s+/g, '');
        return /^\|?[:\-\|]+\|?$/.test(compact);
      };

      const parseRoomsFromTable = (
        source: string,
      ): { name: string; area: string }[] => {
        const lines = source.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith('|')) continue;

          const headerCells = splitMarkdownRow(line).map((c) =>
            c.toLowerCase().trim(),
          );
          if (headerCells.length < 2) continue;

          const roomColIndex = headerCells.findIndex((cell) =>
            /\broom\b/.test(cell),
          );
          const areaColIndex = headerCells.findIndex(
            (cell) => /\barea\b/.test(cell) || /sq\s*ft/.test(cell),
          );

          if (roomColIndex === -1 || areaColIndex === -1) continue;

          let cursor = i + 1;
          if (cursor < lines.length && isSeparatorRow(lines[cursor].trim())) {
            cursor += 1;
          }

          const parsedRows: { name: string; area: string }[] = [];

          for (; cursor < lines.length; cursor++) {
            const rowLine = lines[cursor].trim();
            if (!rowLine.startsWith('|')) break;
            if (isSeparatorRow(rowLine)) continue;

            const cells = splitMarkdownRow(rowLine);
            if (
              cells.length <= roomColIndex ||
              cells.length <= areaColIndex
            ) {
              continue;
            }

            const roomName = cleanCell(cells[roomColIndex]);
            const areaValue = cleanCell(cells[areaColIndex]);
            const normalizedRoom = roomName.toLowerCase();

            if (!roomName || !areaValue) continue;
            if (/\btotal\b|\bsum\b/.test(normalizedRoom)) continue;
            if (/^room\s*name$/i.test(roomName)) continue;

            parsedRows.push({ name: roomName, area: areaValue });
          }

          if (parsedRows.length > 0) {
            return parsedRows;
          }
        }

        return [];
      };

      const roomSectionMatch = fullResponse.match(
        /###\s*\d+\.\s*Room\s+Identification([\s\S]*?)(?=\n###\s*\d+\.|$)/i,
      );

      const roomSectionContent = roomSectionMatch
        ? roomSectionMatch[1]
        : fullResponse;

      rooms = parseRoomsFromTable(roomSectionContent);

      // Fallback for reports where headings vary but table still exists
      if (rooms.length === 0) {
        rooms = parseRoomsFromTable(fullResponse);
      }

      roomCount = rooms.length;

      return {
        confidenceScore,
        sheetCount,
        roomCount,
        rooms,
        underRoofArea,
        dimensionalAccuracy,
        completeness,
        readability,
      };
    } catch (err) {
      console.error('Failed to get blueprint intelligence:', err);
      return {
        confidenceScore: 0,
        sheetCount: 0,
        roomCount: 0,
        rooms: [],
        underRoofArea: 0,
        dimensionalAccuracy: 0,
        completeness: 0,
        readability: 0,
      };
    }
  }

  async generatePdfFromHtml(
    htmlContent: string,
    fileName: string,
    title: string = 'Environmental Lifecycle Report',
  ): Promise<void> {
    const pdfBlob = await this.generatePdfBlobFromHtml(htmlContent, title);
    if (!pdfBlob) {
      this.snackBar.open('An error occurred while generating the PDF.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async generatePdfBlobFromHtml(
    htmlContent: string,
    title: string = 'Environmental Lifecycle Report',
  ): Promise<Blob | null> {
    const logo = new Image();
    logo.src = 'assets/logo.png';

    const generateReport = (logoDataUrl?: string): Promise<Blob> => {
      const worker = new Worker(
        new URL('../report-generator.worker', import.meta.url),
        { type: 'module' },
      );

      return new Promise<Blob>((resolve, reject) => {
        worker.onmessage = ({ data }) => {
          if (data.success && data.pdfBlob) {
            resolve(data.pdfBlob as Blob);
          } else {
            reject(new Error(data.error || 'Failed to generate PDF'));
          }
          worker.terminate();
        };

        worker.onerror = (error) => {
          console.error('Worker error:', error);
          worker.terminate();
          reject(new Error('An error occurred while generating the PDF.'));
        };

        const jsonContent = this._parseHtmlToJson(htmlContent);
        worker.postMessage({
          reportContent: jsonContent,
          logoDataUrl: logoDataUrl,
          title: title,
        });
      });
    };

    try {
      return await new Promise<Blob>((resolve, reject) => {
        logo.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = logo.width;
          canvas.height = logo.height;
          ctx!.drawImage(logo, 0, 0);
          const logoDataUrl = canvas.toDataURL('image/png');

          generateReport(logoDataUrl).then(resolve).catch(reject);
        };

        logo.onerror = () => {
          console.warn('Could not load logo, proceeding without it.');
          generateReport().then(resolve).catch(reject);
        };
      });
    } catch (error) {
      console.error('Failed to generate PDF blob:', error);
      return null;
    }
  }

  async generatePdfBlobFromMarkdown(
    markdownContent: string,
    title: string = 'Generated Report',
  ): Promise<Blob | null> {
    const html = await Promise.resolve(marked.parse(markdownContent) as string);
    return this.generatePdfBlobFromHtml(html, title);
  }

  async downloadEnvironmentalReport(jobId: string): Promise<void> {
    const content = await this.getEnvironmentalReportContent(jobId);
    if (content) {
      await this.generatePdfFromHtml(
        content,
        'environmental-lifecycle-report.pdf',
        'Environmental Lifecycle Report',
      );
    } else {
      this.snackBar.open(
        'Could not retrieve environmental report data.',
        'Close',
        { duration: 3000 },
      );
    }
  }

  private _parseHtmlToJson(htmlString: string): any[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const json: any[] = [];
    const elements = Array.from(doc.body.children);

    elements.forEach((el) => {
      switch (el.tagName) {
        case 'H1':
        case 'H2':
        case 'H3':
        case 'H4':
        case 'H5':
        case 'H6':
          json.push({ type: 'h3', text: el.textContent || '' });
          break;
        case 'P':
          json.push({ type: 'p', text: el.textContent || '' });
          break;
        case 'UL':
          const items = Array.from(el.querySelectorAll('li')).map(
            (li) => li.textContent || '',
          );
          json.push({ type: 'ul', items });
          break;
        case 'OL':
          const olItems = Array.from(el.querySelectorAll('li')).map(
            (li) => li.textContent || '',
          );
          json.push({ type: 'ol', items: olItems });
          break;
        case 'TABLE':
          const head = Array.from(el.querySelectorAll('thead tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th')).map(
              (th) => th.textContent || '',
            ),
          );
          const body = Array.from(el.querySelectorAll('tbody tr')).map((tr) =>
            Array.from(tr.querySelectorAll('td')).map(
              (td) => td.textContent || '',
            ),
          );
          json.push({ type: 'table', head, body });
          break;
      }
    });

    return json;
  }

  async getDetailedCostSummary(jobId: string): Promise<any> {
    try {
      const results = await this.getBomResults(jobId);
      const best = this.selectBestBomResult(results);
      if (!best) {
        return null;
      }
      const fullResponse = String(best.fullResponse || '');
      const hasPhase30Section = /###\s*Phase\s*30\s*:/i.test(fullResponse);

      const detectCurrencySymbol = (text: string): string => {
        const raw = String(text || '');
        const normalized = raw.toLowerCase();

        // Prefer explicit ISO code markers.
        if (/\bZAR\b/i.test(raw)) return 'R';
        if (/\bUSD\b/i.test(raw)) return '$';
        if (/\bGBP\b/i.test(raw)) return '£';
        if (/\bEUR\b/i.test(raw)) return '€';

        // If ISO markers are absent, infer from extracted report location.
        // We intentionally check for location before symbol fallback so
        // location-driven reports still get the correct display currency.
        const southAfricaLocationHints = [
          'south africa',
          'johannesburg',
          'sandton',
          'pretoria',
          'cape town',
          'durban',
        ];
        if (southAfricaLocationHints.some((hint) => normalized.includes(hint))) {
          return 'R';
        }

        const ukLocationHints = ['united kingdom', ' uk ', ' england', ' london'];
        if (ukLocationHints.some((hint) => normalized.includes(hint))) {
          return '£';
        }

        const euroLocationHints = [
          'eurozone',
          'germany',
          'france',
          'spain',
          'italy',
          'netherlands',
          'portugal',
          'belgium',
          'austria',
        ];
        if (euroLocationHints.some((hint) => normalized.includes(hint))) {
          return '€';
        }

        // Fall back to symbol detection.
        if (/€\s*\d/.test(raw) || /\d\s*€/.test(raw)) return '€';
        if (/£\s*\d/.test(raw) || /\d\s*£/.test(raw)) return '£';

        // South African Rand reports often include "R 12,345" and VAT references.
        if (/\bR\s*\d{1,3}(?:[\s,]\d{3})*(?:\.\d+)?\b/.test(raw)) return 'R';

        // Default to USD symbol (also used in several existing reports).
        return '$';
      };

      const currencySymbol = detectCurrencySymbol(fullResponse);

      const extractPhase30QuotationData = (response: string): {
        generalConditions: number;
        permitsAdminFees: number;
        insuranceBonds: number;
        taxes: number;
        suggestedBid: number;
      } | null => {
        if (!response) return null;

        const match = response.match(
          /###\s*Phase\s*30:[\s\S]*?Output\s*1[\s\S]*?```json\s*([\s\S]*?)\s*```/i,
        );
        if (!match || !match[1]) return null;

        const rawPhase30 = String(match[1] || '').trim();

        const extractLeadingJsonArray = (raw: string): string | null => {
          const start = raw.indexOf('[');
          if (start < 0) return null;
          let depth = 0;
          for (let i = start; i < raw.length; i++) {
            const ch = raw[i];
            if (ch === '[') depth++;
            if (ch === ']') {
              depth--;
              if (depth === 0) {
                return raw.slice(start, i + 1);
              }
            }
          }
          return null;
        };

        const extractMoneyFromJsonLine = (value: string): number => {
          if (!value) return 0;
          const m = String(value).match(/-?\d+(?:\.\d+)?/);
          return m ? Number(m[0]) : 0;
        };

        // Fallback parser for when the phase 30 block isn't valid JSON.
        // Some reports output: `[ ... ], "Terms_And_Conditions": ...` which breaks JSON.parse.
        const parseLoosePhase30 = (): {
          generalConditions: number;
          permitsAdminFees: number;
          insuranceBonds: number;
          taxes: number;
          suggestedBid: number;
        } | null => {
          const generalConditions = extractMoneyFromJsonLine(
            rawPhase30.match(
              /"Phase_Item"\s*:\s*"General\s*Conditions"[\s\S]*?"Amount"\s*:\s*([\d.]+)/i,
            )?.[1] ||
              rawPhase30.match(
                /"Phase_Item"\s*:\s*"General\s*Conditions"[\s\S]*?"Amount"\s*"?\s*:?\s*([\d.]+)/i,
              )?.[1] ||
              '',
          );

          const permitsAdminFees = extractMoneyFromJsonLine(
            rawPhase30.match(
              /"Permits\s*&\s*Admin\s*Fees[^\"]*"[\s\S]*?"Total"\s*:\s*([\d.]+)/i,
            )?.[1] ||
              rawPhase30.match(
                /"Permits\s*&\s*Admin\s*Fees[^\"]*"[\s\S]*?"Total"\s*"?\s*:?\s*([\d.]+)/i,
              )?.[1] ||
              '',
          );

          const insuranceBonds = extractMoneyFromJsonLine(
            rawPhase30.match(
              /"Insurance\s*&\s*Bonds"[\s\S]*?"Total"\s*:\s*([\d.]+)/i,
            )?.[1] ||
              rawPhase30.match(
                /"Insurance\s*&\s*Bonds"[\s\S]*?"Total"\s*"?\s*:?\s*([\d.]+)/i,
              )?.[1] ||
              '',
          );

          const taxes = extractMoneyFromJsonLine(
            rawPhase30.match(
              /"Category"\s*:\s*"Taxes"[\s\S]*?"Amount"\s*:\s*([\d.]+)/i,
            )?.[1] ||
              rawPhase30.match(/"VAT"[\s\S]*?"Total"\s*:\s*([\d.]+)/i)?.[1] ||
              '',
          );

          // Not strictly required for the UI cards, but keep a best-effort.
          const suggestedBid = extractMoneyFromJsonLine(
            rawPhase30.match(
              /"Grand\s*Total\s*Project\s*Bid\s*Price"[\s\S]*?"Total"\s*:\s*([\d.]+)/i,
            )?.[1] ||
              '',
          );

          const any =
            generalConditions > 0 ||
            permitsAdminFees > 0 ||
            insuranceBonds > 0 ||
            taxes > 0 ||
            suggestedBid > 0;

          if (!any) {
            return null;
          }

          const extracted = {
            generalConditions,
            permitsAdminFees,
            insuranceBonds,
            taxes,
            suggestedBid,
          };

          console.info('[report][phase30] Loose extracted totals', extracted);

          return extracted;
        };

        try {
          // Many AI variants append extra fields after the array, making the block invalid JSON.
          // Parse the leading array only.
          const arrayJson = extractLeadingJsonArray(rawPhase30);
          const parsed = JSON.parse(arrayJson || rawPhase30);
          if (!Array.isArray(parsed)) {
            const loose = parseLoosePhase30();
            if (loose) {
              return loose;
            }
            return null;
          }

          const sumBy = (predicate: (row: any) => boolean): number =>
            parsed
              .filter((row: any) => row && predicate(row))
              .reduce((sum: number, row: any) => sum + Number(row.Amount || 0), 0);

          const taxes = sumBy(
            (r) => String(r.Category || '').toLowerCase() === 'taxes',
          );

          const sumCategorizedMaterials = (
            row: any,
            predicate: (itemName: string) => boolean,
          ): number => {
            const materials = Array.isArray(row?.Categorized_Materials)
              ? row.Categorized_Materials
              : [];
            return materials
              .filter((m: any) => predicate(String(m?.Item || '').toLowerCase()))
              .reduce((sum: number, m: any) => sum + Number(m?.Total || 0), 0);
          };

          let generalConditions = 0;
          let permitsAdminFees = 0;
          let insuranceBonds = 0;

          // Different report variants classify these rows under either "Direct Costs"
          // or "Indirect Costs", so match by Phase_Item semantics across all rows.
          parsed.forEach((row: any) => {
            const phaseItem = String(row?.Phase_Item || '').toLowerCase();
            const amount = Number(row?.Amount || 0);
            if (!phaseItem) return;

            // General conditions variants: "General Conditions", "General Conditions & Site Services", etc.
            if (phaseItem.includes('general') && phaseItem.includes('condition')) {
              generalConditions += amount;
              return;
            }

            // Fees / permits / insurance can appear as dedicated rows or nested materials.
            const hasPermitsHint =
              phaseItem.includes('permit') ||
              phaseItem.includes('admin');
            const hasInsuranceHint =
              phaseItem.includes('insurance') ||
              phaseItem.includes('bond');

            if (hasPermitsHint || hasInsuranceHint) {
              const permits = sumCategorizedMaterials(row, (name) =>
                name.includes('permit') || name.includes('admin'),
              );
              const insurance = sumCategorizedMaterials(row, (name) =>
                name.includes('insurance') || name.includes('bond'),
              );

              if (permits > 0 || insurance > 0) {
                permitsAdminFees += permits;
                insuranceBonds += insurance;
              } else {
                if (hasPermitsHint && hasInsuranceHint) {
                  // Combined row with no nested breakdown: keep backward-compatible default.
                  permitsAdminFees += amount;
                } else if (hasPermitsHint) {
                  permitsAdminFees += amount;
                } else if (hasInsuranceHint) {
                  insuranceBonds += amount;
                }
              }
            }
          });

          const total = parsed.reduce(
            (sum: number, row: any) => sum + Number(row?.Amount || 0),
            0,
          );

          const extracted = {
            generalConditions,
            permitsAdminFees,
            insuranceBonds,
            taxes,
            suggestedBid: total,
          };

          console.info('[report][phase30] JSON extracted totals', extracted);

          return extracted;
        } catch {
          return parseLoosePhase30();
        }
      };

      const phase30 = extractPhase30QuotationData(fullResponse);

      const parseCurrency = (raw: string): number => {
        const cleaned = String(raw || '').replace(/\*\*/g, '');
        const match = cleaned.match(
          /-?(?:\$|ZAR|R|USD|GBP|EUR|BWP|£|€|P)?\s*([\d,\s]+(?:\.\d+)?)/i,
        );
        return match ? parseFloat(match[1].replace(/[\s,]/g, '')) : 0;
      };

      const parsePercentage = (raw: string): number => {
        const cleaned = String(raw || '').replace(/\*\*/g, '');
        const match = cleaned.match(/(\d+(?:\.\d+)?)\s*%/);
        return match ? parseFloat(match[1]) : 0;
      };

      const parseMoneyLikeCell = (raw: string): number => {
        const cleaned = String(raw || '').replace(/\*\*/g, '').trim();
        if (!cleaned) return 0;
        // Guard: ignore descriptive cells like "Per Phase 23 analysis" so
        // phase numbers are never parsed as currency amounts.
        const alphaStripped = cleaned.replace(
          /^(?:\$|£|€|ZAR|USD|GBP|EUR|BWP|R|P)\s*/i,
          '',
        );
        if (/[A-Za-z]/.test(alphaStripped)) return 0;
        const match = cleaned.match(
          /-?(?:\$|ZAR|R|USD|GBP|EUR|BWP|£|€|P)?\s*([\d][\d,\s]*(?:\.\d+)?)/i,
        );
        if (!match) return 0;
        const numeric = parseFloat(String(match[1]).replace(/[\s,]/g, ''));
        return Number.isFinite(numeric) ? numeric : 0;
      };

      const extractPhaseItemTotalsFromAnyJsonBlock = (
        source: string,
      ): {
        generalConditions: number;
        permitsAdminFees: number;
        insuranceBonds: number;
      } | null => {
        const fenceRegex = /```json\s*([\s\S]*?)\s*```/gi;
        let match: RegExpExecArray | null;

        while ((match = fenceRegex.exec(source)) !== null) {
          const raw = String(match[1] || '').trim();
          if (!raw) continue;

          try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) continue;

            const rows = parsed.filter(
              (r: any) =>
                r &&
                typeof r === 'object' &&
                Object.prototype.hasOwnProperty.call(r, 'Phase_Item') &&
                Object.prototype.hasOwnProperty.call(r, 'Amount'),
            );
            if (!rows.length) continue;

            let generalConditions = 0;
            let permitsAdminFees = 0;
            let insuranceBonds = 0;

            rows.forEach((row: any) => {
              const phaseItem = String(row?.Phase_Item || '').toLowerCase();
              const amount = Number(row?.Amount || 0);
              if (!phaseItem || amount <= 0) return;

              if (phaseItem.includes('general') && phaseItem.includes('condition')) {
                generalConditions += amount;
                return;
              }
              if (phaseItem.includes('permit') || phaseItem.includes('admin')) {
                permitsAdminFees += amount;
                return;
              }
              if (phaseItem.includes('insurance') || phaseItem.includes('bond')) {
                insuranceBonds += amount;
              }
            });

            if (generalConditions > 0 || permitsAdminFees > 0 || insuranceBonds > 0) {
              return {
                generalConditions,
                permitsAdminFees,
                insuranceBonds,
              };
            }
          } catch {
            // Try next json fence
          }
        }

        return null;
      };

      const extractValue = (regex: RegExp) => {
        const match = fullResponse.match(regex);
        return match
          ? parseFloat(String(match[1]).replace(/[\s,]/g, ''))
          : 0;
      };

      const extractTableAmountByLabel = (labelPattern: string): number => {
        const escaped = labelPattern;
        const match = fullResponse.match(
          new RegExp(
            `\\|\\s*(?:\\*{0,2}\\s*)?${escaped}(?:\\s*\\*{0,2})?\\s*\\|\\s*(?:\\*{0,2}\\s*)?(?:\\$|ZAR|R|USD|GBP|EUR|BWP|£|€|P)?\\s*([\\d,]+(?:\\.\\d+)?)\\s*(?:\\*{0,2})?\\s*\\|`,
            'i',
          ),
        );
        return match
          ? parseFloat(String(match[1]).replace(/[\s,]/g, ''))
          : 0;
      };

      // Some AI report variants provide explicit permits/insurance rows as pipe-table lines
      // without a `$` prefix. Prefer these when present.
      const permitsAdminFeesLoose = extractTableAmountByLabel(
        '(?:Total\\s*)?Permits\\s*(?:&|and)?\\s*Admin\\s*Fees',
      );
      const insuranceBondsLoose = extractTableAmountByLabel(
        '(?:Total\\s*)?Insurance\\s*(?:&|and)?\\s*Bonds',
      );

      // Phase 30 formatted client quotation totals (authoritative for Bid Proposal Analysis popup)
      const reportTotalDirectIndirectCosts = extractValue(
        /\|\s*\*\*Total\s*Direct\s*&\s*Indirect\s*Costs\*\*\s*\|\s*(?:\$|ZAR)?\s*([\d,]+(?:\.\d+)?)\s*\|/i,
      );
      const reportAltTotalDirectIndirectCosts2 = extractValue(
        /\|\s*Total\s*Direct\s*&\s*Indirect\s*Costs\s*\|\s*(?:\$|ZAR)?\s*([\d,\s]+(?:\.\d+)?)\s*\|/i,
      );
      const reportOverheadProfit = extractValue(
        /\|\s*GC\s*Overhead\s*&\s*Profit\s*\([^)]*\)\s*\|\s*(?:\$|ZAR)?\s*([\d,]+(?:\.\d+)?)\s*\|/i,
      );
      const reportContingency = extractValue(
        /\|\s*Contingency\s*Reserve\s*\([^)]*\)\s*\|\s*(?:\$|ZAR)?\s*([\d,]+(?:\.\d+)?)\s*\|/i,
      );
      const reportEscalation = extractValue(
        /\|\s*Cost\s*Escalation\s*Allowance\s*\([^)]*\)\s*\|\s*(?:\$|ZAR)?\s*([\d,]+(?:\.\d+)?)\s*\|/i,
      );
      const reportPreTaxProjectCost = extractValue(
        /\|\s*\*\*Total\s*Pre-?Tax\s*Project\s*Cost\*\*\s*\|\s*\*\*\s*(?:\$|ZAR)?\s*([\d,]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );
      const reportVatAmount = extractValue(
        /\|\s*Value\s*Added\s*Tax\s*\(VAT\s*@\s*\d+(?:\.\d+)?%\)\s*\|\s*(?:\$|ZAR)?\s*([\d,]+(?:\.\d+)?)\s*\|/i,
      );
      const reportGrandTotalBidPrice = extractValue(
        /\|\s*\*\*GRAND\s*TOTAL\s*BID\s*PRICE\*\*\s*\|\s*\*\*\s*(?:\$|ZAR)?\s*([\d,]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );

      const reportAltSubtotalDirectIndirectCosts = extractValue(
        /\|\s*Subtotal\s*\(Direct\s*Costs,[^\n]*?\)\s*\|\s*(?:\$|ZAR)?\s*([\d,\s]+(?:\.\d+)?)\s*\|/i,
      );
      const reportAltOverheadProfit = extractValue(
        /\|\s*General\s*Contractor\s*Overhead\s*&\s*Profit\s*\([^)]*\)\s*\|\s*(?:\$|ZAR)?\s*([\d,\s]+(?:\.\d+)?)\s*\|/i,
      );
      const reportAltContingencyEscalation = extractValue(
        /\|\s*Contingency\s*&\s*Escalation\s*Allowance\s*\([^)]*\)\s*\|\s*(?:\$|ZAR)?\s*([\d,\s]+(?:\.\d+)?)\s*\|/i,
      );
      const reportAltContingencyEscalation2 = extractValue(
        /\|\s*Contingency\s*&\s*Escalation\s*Allowances\s*\([^)]*\)\s*\|\s*(?:\$|ZAR)?\s*([\d,\s]+(?:\.\d+)?)\s*\|/i,
      );

      const reportAltSubtotalPreTax = extractValue(
        /\|\s*\*\*\s*Subtotal\s*\(\s*Pre-?Tax\s*\)\s*\*\*\s*\|\s*\*\*\s*(?:\$|ZAR)?\s*([\d,\s]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );
      const reportAltTotalDirectCosts = extractValue(
        /\|\s*Total\s*Direct\s*Costs\s*\([^)]*\)\s*\|\s*\**\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\**\s*\|/i,
      );
      const reportAltEscalationAllowance = extractValue(
        /\|\s*Cost\s*Escalation\s*Allowance\s*\([^)]*\)\s*\|\s*\**\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\**\s*\|/i,
      );
      const reportAltPreTaxProjectCost2 = extractValue(
        /\|\s*\*\*\s*Subtotal\s*\(\s*Pre-?Tax\s*Project\s*Cost\s*\)\s*\*\*\s*\|\s*\*\*\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );
      const reportAltTaxes2 = extractValue(
        /\|\s*Sales\s*Tax\s*(?:on\s*Materials)?\s*(?:\([^)]*\))?\s*\|\s*\**\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\**\s*\|/i,
      );
      const reportTexasSalesTaxPct = extractValue(
        /Texas\s*(?:Material\s*)?Sales\s*Tax\s*\(\s*(\d+(?:\.\d+)?)\s*%\s*\)/i,
      );
      const reportAltGrandTotalBidPrice2 = extractValue(
        /\|\s*\*\*\s*Grand\s*Total\s*\(\s*Calculated\s*GC\s*Bid\s*Price\s*\)\s*\*\*\s*\|\s*\*\*\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );
      const reportAltPreTaxProjectCost = extractValue(
        /\|\s*\*\*Total\s*Pre-?Tax\s*Construction\s*Cost\*\*\s*\|\s*\*\*\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );
      const reportAltTaxes = extractValue(
        /\|\s*Sales\s*Tax\s*\([^)]*\)\s*\|\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\|/i,
      );
      const reportAltGrandTotalBidPrice = extractValue(
        /\|\s*\*\*Grand\s*Total\s*Project\s*Bid\s*Price\*\*\s*\|\s*\*\*\s*(?:\$|ZAR)?\s*([\d,\s]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );

      const reportAltGrandTotalBidPrice3 = extractValue(
        /\|\s*\*\*\s*Grand\s*Total\s*Project\s*Bid\s*Price\s*\*\*\s*\|\s*\*\*\s*(?:\$|ZAR)?\s*([\d,\s]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );

      // Phase 29 "Final Client Quotation" variant labels
      const reportAltTotalDirectInsurableCosts = extractValue(
        /\|\s*Total\s*Direct\s*&\s*Insurable\s*Costs\s*\|\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\|/i,
      );
      const reportAltTotalPreTaxBidPrice = extractValue(
        /\|\s*\*\*\s*Total\s*Pre-?Tax\s*Bid\s*Price\s*\*\*\s*\|\s*\*\*\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );
      const reportAltGrandTotalProjectCost = extractValue(
        /\|\s*\*\*\s*Grand\s*Total\s*Project\s*Cost\s*\*\*\s*\|\s*\*\*\s*\$?\s*([\d,\s]+(?:\.\d+)?)\s*\*\*\s*\|/i,
      );

      const finalReportTotalDirectIndirectCosts =
        reportTotalDirectIndirectCosts > 0
          ? reportTotalDirectIndirectCosts
          : reportAltTotalDirectIndirectCosts2 > 0
            ? reportAltTotalDirectIndirectCosts2
          : reportAltSubtotalDirectIndirectCosts > 0
            ? reportAltSubtotalDirectIndirectCosts
            : reportAltTotalDirectCosts > 0
              ? reportAltTotalDirectCosts
              : reportAltTotalDirectInsurableCosts;
      const finalReportOverheadProfit =
        reportOverheadProfit > 0 ? reportOverheadProfit : reportAltOverheadProfit;
      const finalReportContingency =
        reportContingency > 0
          ? reportContingency
          : reportAltContingencyEscalation > 0
            ? reportAltContingencyEscalation
            : reportAltContingencyEscalation2;
      const finalReportEscalation =
        reportEscalation > 0
          ? reportEscalation
          : reportAltEscalationAllowance > 0
            ? reportAltEscalationAllowance
            : 0;
      const finalReportPreTaxProjectCost =
        reportPreTaxProjectCost > 0
          ? reportPreTaxProjectCost
          : reportAltSubtotalPreTax > 0
            ? reportAltSubtotalPreTax
          : reportAltPreTaxProjectCost > 0
            ? reportAltPreTaxProjectCost
            : reportAltPreTaxProjectCost2 > 0
              ? reportAltPreTaxProjectCost2
              : reportAltTotalPreTaxBidPrice;
      const finalReportVatAmount =
        reportVatAmount > 0
          ? reportVatAmount
          : reportAltTaxes > 0
            ? reportAltTaxes
            : reportAltTaxes2;
      const finalReportGrandTotalBidPrice =
        reportGrandTotalBidPrice > 0
          ? reportGrandTotalBidPrice
          : reportAltGrandTotalBidPrice > 0
            ? reportAltGrandTotalBidPrice
            : reportAltGrandTotalBidPrice2 > 0
              ? reportAltGrandTotalBidPrice2
              : reportAltGrandTotalBidPrice3 > 0
                ? reportAltGrandTotalBidPrice3
              : reportAltGrandTotalProjectCost;

      const reportContingencyIncludesEscalation =
        reportContingency <= 0 && reportAltContingencyEscalation > 0;

      const quotationDataMatch = fullResponse.match(/Quotation Data.*?\n([\s\S]*?)(?:\n\s*\n|$)/i);
      if (quotationDataMatch && quotationDataMatch[1]) {
        try {
          const rawQuotationData = String(quotationDataMatch[1]).trim();
          const withoutCodeFence = rawQuotationData
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
          const jsonBlockMatch = withoutCodeFence.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          const jsonPayload = jsonBlockMatch ? jsonBlockMatch[1] : withoutCodeFence;
          const quotationData = JSON.parse(jsonPayload);
          const materialCost = quotationData.materialCost || 0;
          const laborCost = quotationData.laborCost || 0;
          const generalConditions = quotationData.generalConditions || 0;
          const permitsAdminFees = quotationData.permitsAdminFees || 0;
          const insuranceBonds = quotationData.insuranceBonds || 0;
          const taxes = quotationData.taxes || 0;
          const suggestedBid = quotationData.suggestedBid || 0;
          const suggestedMarketBid = quotationData.suggestedMarketBid || 0;
          const costPerSqFt = quotationData.costPerSqFt || 0;

          return {
            materialCost,
            laborCost,
            generalConditions,
            permitsAdminFees,
            insuranceBonds,
            taxes,
            suggestedBid,
            suggestedMarketBid,
            costPerSqFt,
          };
        } catch (error) {
          console.error('Failed to parse Quotation Data JSON:', error);
        }
      }

      const materialCost = extractValue(/Total Material Cost.*?\$\s*([\d,]+\.?\d*)/);
      const laborCost = extractValue(/Total Labor Cost.*?\$\s*([\d,]+\.?\d*)/);
      const directSubtotal = extractValue(
        /\|\s*Subtotal\s*\(Direct.*?\).*?\$\s*([\d,]+\.?\d*)/,
      );
      const overhead = extractValue(
        /\|\s*GC Overhead & Profit.*?\$\s*([\d,]+\.?\d*)/,
      );
      const overheadPct = extractValue(
        /\|\s*GC Overhead & Profit.*?\|\s*([\d.]+)%/,
      );

      const contingency = extractValue(
        /\|\s*Contingency Reserve.*?\$\s*([\d,]+\.?\d*)/,
      );
      const contingencyPct = extractValue(
        /\|\s*Contingency Reserve.*?\|\s*([\d.]+)%/,
      );
      const generalConditions = extractValue(/General Conditions.*?\$\s*([\d,]+\.?\d*)/);
      const groupedIndirectCosts = extractValue(
        /\|\s*(?:\*{0,2}\s*)?General\s*Conditions(?:[^|]*?)Site\s*Overheads(?:[^|]*?)Permits(?:[^|]*?)Insurance(?:\s*and\s*Bonds)?(?:\s*\*{0,2})?\s*\|\s*(?:\*{0,2}\s*)?\$?\s*([\d,\s]+(?:\.\d+)?)\s*(?:\*{0,2})?\s*\|/i,
      );
      const permitsAdminFeesFromSummaryTable = extractValue(
        /\|\s*(?:\*{0,2}\s*)?(?:Total\s*)?Permits?\s*(?:&|and)?\s*Admin(?:istrative)?\s*Fees?(?:\s*\*{0,2})?\s*\|\s*(?:\*{0,2}\s*)?\$?\s*([\d,\s]+(?:\.\d+)?)\s*(?:\*{0,2})?\s*\|/i,
      );
      const insuranceBondsFromSummaryTable = extractValue(
        /\|\s*(?:\*{0,2}\s*)?Insurance\s*(?:&|and)?\s*Bonds?(?:\s*\*{0,2})?\s*\|\s*(?:\*{0,2}\s*)?\$?\s*([\d,\s]+(?:\.\d+)?)\s*(?:\*{0,2})?\s*\|/i,
      );
      const permitsAdminFees = extractValue(/Permits.*?\$\s*([\d,\s]+\.?\d*)/);
      const insuranceBonds = extractValue(/Insurance.*?\$\s*([\d,\s]+\.?\d*)/);
      const permitsAdminFeesLooseText = extractValue(
        /Permits?\s*(?:&|and)?\s*Admin(?:istrative)?\s*Fees?[^\n]{0,120}\$?\s*([\d,\s]+(?:\.\d+)?)/i,
      );
      const insuranceBondsLooseText = extractValue(
        /Insurance\s*(?:&|and)?\s*Bonds?[^\n]{0,120}\$?\s*([\d,\s]+(?:\.\d+)?)/i,
      );
      const permitsAdminFeesAnyTableRow = extractValue(
        /\|\s*(?:\*{0,2}\s*)?(?:Total\s*)?Permits?(?:\s*&\s*|\s+and\s+)?Admin(?:istrative)?\s*Fees?(?:\s*\*{0,2})?\s*\|[^\n]*?\|\s*(?:\*{0,2}\s*)?\$?\s*([\d,\s]+(?:\.\d+)?)\s*(?:\*{0,2})?\s*\|/i,
      );
      const insuranceBondsAnyTableRow = extractValue(
        /\|\s*(?:\*{0,2}\s*)?(?:Total\s*)?Insurance(?:\s*&\s*|\s+and\s+)?Bonds?(?:\s*\*{0,2})?\s*\|[^\n]*?\|\s*(?:\*{0,2}\s*)?\$?\s*([\d,\s]+(?:\.\d+)?)\s*(?:\*{0,2})?\s*\|/i,
      );
      const taxes = extractValue(/Sales Tax.*?\$\s*([\d,]+\.?\d*)/);

      // Handle potential markdown bold markers (**Calculated GC Bid Price**)
      const suggestedBid = extractValue(/Calculated GC Bid Price.*?\$\s*([\d,]+\.?\d*)/);
      const suggestedMarketBid = extractValue(
        /Suggested Market Bid Price.*?\$\s*([\d,]+\.?\d*)/,
      );
      const costPerSqFt = extractValue(
        /Calculated Cost per Conditioned Area.*?\$\s*([\d,]+\.?\d*)/,
      );

      // Cost Range
      let marketLow = 0;
      let marketHigh = 0;
      const rangeMatch = fullResponse.match(
        /\|\s*Cost Range\s*\|\s*\**\$?([\d,]+\.?\d*)\s*[–-]\s*\$?([\d,]+\.?\d*)\**/,
      );
      if (rangeMatch) {
        marketLow = parseFloat(rangeMatch[1].replace(/,/g, ''));
        marketHigh = parseFloat(rangeMatch[2].replace(/,/g, ''));
      }

      // Cost breakdown table parser (authoritative source for bid proposal values)
      // Supports legacy "Phase 26" and current "Phase 25" numbering.
      const phaseCostSectionMatch = fullResponse.match(
        /###\s*Phase\s*(?:25|26)\s*:\s*Cost\s*Breakdowns?[\s\S]*?(?=\n###\s*Phase\s*(?:26|27)\s*:|\n\s*Ready for the next prompt|$)/i,
      );

      let phase26Direct = 0;
      let phase26Material = 0;
      let phase26Labor = 0;
      let phase26GeneralConditions = 0;
      let phase26PermitsAdminFees = 0;
      let phase26InsuranceBonds = 0;
      let phase26DirectAndInsurableSubtotal = 0;
      let phase26Overhead = 0;
      let phase26OverheadPct = 0;
      let phase26Contingency = 0;
      let phase26ContingencyPct = 0;
      let phase26Escalation = 0;
      let phase26PreTaxSubtotal = 0;
      let phase26Taxes = 0;
      let phase26SalesTaxPct = 0;
      let phase26Bid = 0;
      let phase26MarketBid = 0;
      let phase26CostPerSqFt = 0;
      let phase26RangeLow = 0;
      let phase26RangeHigh = 0;

      if (phaseCostSectionMatch && phaseCostSectionMatch[0]) {
        const tableLines = phaseCostSectionMatch[0]
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('|'));

        tableLines.forEach((line) => {
          if (line.includes(':---')) return;

          const cols = line
            .split('|')
            .map((p) => p.trim().replace(/\*\*/g, ''))
            .filter((p) => p !== '');

          if (cols.length < 2) return;

          const rawLabel = String(cols[0] || '');
          const label = rawLabel.toLowerCase();
          const amountCol = String(cols[1] || '');
          const pctCol = String(cols[2] || '');
          const valueCols = cols.slice(1).map((c) => String(c || ''));

          if (label.includes('cost range')) {
            const rangeText = `${amountCol} ${pctCol}`;
            const values = rangeText.match(/[\d,]+(?:\.\d+)?/g) || [];
            const lowRaw = values[0];
            const highRaw = values[1];
            if (lowRaw && highRaw) {
              phase26RangeLow = parseFloat(lowRaw.replace(/,/g, '')) || phase26RangeLow;
              phase26RangeHigh = parseFloat(highRaw.replace(/,/g, '')) || phase26RangeHigh;
            }
            return;
          }

          // Some report variants swap amount/% columns. Resolve by semantic token.
          // IMPORTANT: Only treat a cell as money if it actually contains a `$`.
          // This prevents phase/cost-code numbers from becoming amounts.
          const moneyToken =
            valueCols.find((v) =>
              /(?:\$|£|€|\bZAR\b|\bUSD\b|\bGBP\b|\bEUR\b|\bBWP\b|(?:^|\s)R(?=\s|[\d,\.])|(?:^|\s)P(?=\s|[\d,\.]))/i.test(
                v,
              ),
            ) || '';
          const percentToken = valueCols.find((v) => /%/.test(v)) || '';
          const plainAmountToken =
            valueCols.find((v) => {
              const cleaned = String(v || '').replace(/\*\*/g, '').trim();
              if (!cleaned || /%/.test(cleaned)) return false;
              // Reject descriptive cells; keep numeric-only amount cells.
              if (/[A-Za-z]/.test(cleaned)) return false;
              return /[\d]/.test(cleaned);
            }) || '';
          const amount = moneyToken
            ? parseCurrency(moneyToken)
            : plainAmountToken
              ? parseMoneyLikeCell(plainAmountToken)
              : parseMoneyLikeCell(amountCol);
          const pctFromCols = parsePercentage(percentToken);
          const pctFromLabel = parsePercentage(rawLabel);
          const pct = pctFromCols > 0 ? pctFromCols : pctFromLabel;

          if (
            label.includes('subtotal (direct') ||
            label.includes('subtotal (direct construction')
          ) {
            phase26Direct = amount;
            return;
          }

          if (label.includes('total material cost')) {
            phase26Material = amount;
            return;
          }

          if (label.includes('total labor cost')) {
            phase26Labor = amount;
            return;
          }

          if (
            label.includes('general conditions') &&
            (label.includes('site services') || !label.includes('overhead'))
          ) {
            phase26GeneralConditions = amount;
            return;
          }

          if (label.includes('permits') || label.includes('admin fees')) {
            if (amount > 0) phase26PermitsAdminFees = amount;
            return;
          }

          if (label.includes('insurance') || label.includes('bond')) {
            if (amount > 0) phase26InsuranceBonds = amount;
            return;
          }

          if (
            label.includes('subtotal') &&
            (label.includes('insurable') || label.includes('direct & insurable'))
          ) {
            if (amount > 0) phase26DirectAndInsurableSubtotal = amount;
            return;
          }

          if (label.includes('gc overhead') || label.includes('general conditions')) {
            phase26Overhead = amount;
            phase26OverheadPct = pct;
            return;
          }

          if (label.includes('contingency')) {
            phase26Contingency = amount;
            phase26ContingencyPct = pct;
            return;
          }

          if (label.includes('cost escalation')) {
            phase26Escalation = amount;
            return;
          }

          if (label.includes('subtotal (pre-tax') || label.includes('pre-tax project cost')) {
            phase26PreTaxSubtotal = amount;
            return;
          }

          if (label.includes('sales tax') || label === 'taxes') {
            phase26Taxes = amount;
            phase26SalesTaxPct = pct;
            return;
          }

          if (label.includes('calculated gc bid price')) {
            phase26Bid = amount;
            return;
          }

          if (label.includes('suggested market bid price')) {
            phase26MarketBid = amount;
            return;
          }

          if (label.includes('calculated cost per conditioned area')) {
            phase26CostPerSqFt = amount;
          }
        });
      }

      // If AI report has no cost data, try to get from BudgetLineItems
      let budgetMaterialCost = 0;
      let budgetLaborCost = 0;
      let budgetGeneralConditions = 0;
      let budgetOverhead = 0;
      let budgetContingency = 0;

      try {
        const budgetItems = await this.http.get<any[]>(`${environment.BACKEND_URL}/budget/${jobId}`).toPromise();
        if (budgetItems && budgetItems.length > 0) {
          budgetItems.forEach((item: any) => {
            const category = String(item.category || '').toLowerCase();
            const trade = String(item.trade || '').toLowerCase();
            const cost = Number(item.estimatedCost || 0);

            if (category.includes('material') || trade.includes('material')) {
              budgetMaterialCost += cost;
            } else if (category.includes('labor') || trade.includes('labor')) {
              budgetLaborCost += cost;
            } else if (category.includes('general') || category.includes('conditions') || trade.includes('general')) {
              budgetGeneralConditions += cost;
            } else if (category.includes('overhead') || trade.includes('overhead')) {
              budgetOverhead += cost;
            } else if (category.includes('contingency') || trade.includes('contingency')) {
              budgetContingency += cost;
            }
          });
          console.log('[Budget] Loaded costs from BudgetLineItems:', {
            material: budgetMaterialCost,
            labor: budgetLaborCost,
            generalConditions: budgetGeneralConditions,
          });
        }
      } catch (budgetErr) {
        console.log('[Budget] Could not load budget items:', budgetErr);
      }

      // Prefer authoritative values parsed from the AI report's cost breakdown table.
      // Only fall back to BudgetLineItems when the report does not provide those fields.
      const finalMaterialCost =
        phase26Material > 0
          ? phase26Material
          : materialCost > 0
            ? materialCost
            : budgetMaterialCost > 0
              ? budgetMaterialCost
              : 0;
      const finalLaborCost =
        phase26Labor > 0
          ? phase26Labor
          : laborCost > 0
            ? laborCost
            : budgetLaborCost > 0
              ? budgetLaborCost
              : 0;
      let finalGeneralConditions =
        phase26GeneralConditions > 0
          ? phase26GeneralConditions
          : phase30?.generalConditions && phase30.generalConditions > 0
            ? phase30.generalConditions
          : groupedIndirectCosts > 0
            ? groupedIndirectCosts
          : budgetGeneralConditions > 0
            ? budgetGeneralConditions
            : 0;
      const finalDirectSubtotal =
        phase26Direct > 0
          ? phase26Direct
          : directSubtotal > 0
            ? directSubtotal
            : finalMaterialCost + finalLaborCost + finalGeneralConditions > 0
              ? finalMaterialCost + finalLaborCost + finalGeneralConditions
              : 0;
      let finalPermitsAdminFees =
        permitsAdminFeesLoose > 0
          ? permitsAdminFeesLoose
          : permitsAdminFeesFromSummaryTable > 0
            ? permitsAdminFeesFromSummaryTable
            : permitsAdminFeesAnyTableRow > 0
              ? permitsAdminFeesAnyTableRow
            : permitsAdminFeesLooseText > 0
              ? permitsAdminFeesLooseText
          : phase26PermitsAdminFees > 0
          ? phase26PermitsAdminFees
          : phase30?.permitsAdminFees && phase30.permitsAdminFees > 0
            ? phase30.permitsAdminFees
            : 0;
      let finalInsuranceBonds =
        insuranceBondsLoose > 0
          ? insuranceBondsLoose
          : insuranceBondsFromSummaryTable > 0
            ? insuranceBondsFromSummaryTable
            : insuranceBondsAnyTableRow > 0
              ? insuranceBondsAnyTableRow
            : insuranceBondsLooseText > 0
              ? insuranceBondsLooseText
          : phase26InsuranceBonds > 0
          ? phase26InsuranceBonds
          : phase30?.insuranceBonds && phase30.insuranceBonds > 0
            ? phase30.insuranceBonds
            : 0;

      if (
        finalGeneralConditions <= 0 ||
        finalPermitsAdminFees <= 0 ||
        finalInsuranceBonds <= 0
      ) {
        const jsonPhaseItemTotals = extractPhaseItemTotalsFromAnyJsonBlock(fullResponse);
        if (jsonPhaseItemTotals) {
          if (finalGeneralConditions <= 0) {
            finalGeneralConditions = Number(jsonPhaseItemTotals.generalConditions || 0);
          }
          if (finalPermitsAdminFees <= 0) {
            finalPermitsAdminFees = Number(jsonPhaseItemTotals.permitsAdminFees || 0);
          }
          if (finalInsuranceBonds <= 0) {
            finalInsuranceBonds = Number(jsonPhaseItemTotals.insuranceBonds || 0);
          }
        }
      }

      if (
        groupedIndirectCosts > 0 &&
        finalPermitsAdminFees <= 0 &&
        finalInsuranceBonds <= 0
      ) {
        finalPermitsAdminFees = Math.round(groupedIndirectCosts * 0.0882 * 100) / 100;
        finalInsuranceBonds = Math.round(groupedIndirectCosts * 0.0259 * 100) / 100;
        finalGeneralConditions = Math.max(
          0,
          groupedIndirectCosts - finalPermitsAdminFees - finalInsuranceBonds,
        );
      }

      // Last-resort normalization: if only General Conditions is available, infer
      // permits/insurance using the same default split ratios used elsewhere.
      if (
        finalGeneralConditions > 0 &&
        finalPermitsAdminFees <= 0 &&
        finalInsuranceBonds <= 0
      ) {
        const inferredGroupedIndirect = finalGeneralConditions / (1 - 0.0882 - 0.0259);
        finalPermitsAdminFees =
          Math.round(inferredGroupedIndirect * 0.0882 * 100) / 100;
        finalInsuranceBonds =
          Math.round(inferredGroupedIndirect * 0.0259 * 100) / 100;
      }
      const finalDirectAndInsurableSubtotal =
        phase26DirectAndInsurableSubtotal > 0
          ? phase26DirectAndInsurableSubtotal
          : finalMaterialCost +
              finalLaborCost +
              finalGeneralConditions +
              finalPermitsAdminFees +
              finalInsuranceBonds;
      let finalOverhead =
        phase26Overhead > 0
          ? phase26Overhead
          : overhead > 0
            ? overhead
            : budgetOverhead > 0
              ? budgetOverhead
              : 0;
      const finalOverheadPct = phase26OverheadPct > 0 ? phase26OverheadPct : overheadPct;
      let finalContingency =
        phase26Contingency > 0
          ? phase26Contingency
          : contingency > 0
            ? contingency
            : budgetContingency > 0
              ? budgetContingency
              : 0;
      const finalContingencyPct =
        phase26ContingencyPct > 0 ? phase26ContingencyPct : contingencyPct;

      let finalEscalation =
        finalReportEscalation > 0
          ? finalReportEscalation
          : phase26Escalation || extractValue(/Cost Escalation Allowance.*?\$\s*([\d,]+\.?\d*)/);
      const finalTaxes =
        phase26Taxes > 0
          ? phase26Taxes
          : phase30?.taxes && phase30.taxes > 0
            ? phase30.taxes
            : taxes;
      const vatPct =
        extractValue(/VAT\s*@\s*(\d+(?:\.\d+)?)\s*%/i) ||
        extractValue(/VAT\s*\(\s*@\s*(\d+(?:\.\d+)?)\s*%/i) ||
        extractValue(/VAT[^\d]{0,12}(\d+(?:\.\d+)?)\s*%/i);
      const phase30SalesTaxPct =
        phase30 && finalMaterialCost > 0
          ? (Number(phase30.taxes || 0) / finalMaterialCost) * 100
          : 0;

      const isReasonableTaxPct = (value: number): boolean =>
        Number.isFinite(value) && value > 0 && value <= 35;

      const finalSalesTaxPct = isReasonableTaxPct(reportTexasSalesTaxPct)
        ? reportTexasSalesTaxPct
        : isReasonableTaxPct(phase26SalesTaxPct)
          ? phase26SalesTaxPct
          : isReasonableTaxPct(vatPct)
            ? vatPct
            : isReasonableTaxPct(phase30SalesTaxPct)
              ? phase30SalesTaxPct
              : 0;

      // Validation gate: if a markup amount clearly looks like a misparsed percent
      // token (e.g. 15.00 instead of 15% of base), rebuild it from percentage.
      const parseIntegrityIssues: string[] = [];
      const normalizeMarkupAmount = (
        label: string,
        amount: number,
        pct: number,
        base: number,
      ): number => {
        if (!(base > 0)) return amount;
        const hasPct = Number.isFinite(pct) && pct > 0 && pct <= 35;
        const looksTinyAbsolute = amount > 0 && amount < 1000 && base >= 100000;
        const expectedFromPct = hasPct ? (base * pct) / 100 : 0;

        if ((amount <= 0 || looksTinyAbsolute) && expectedFromPct > 0) {
          parseIntegrityIssues.push(`${label}:rebuilt_from_pct`);
          return Math.round(expectedFromPct * 100) / 100;
        }

        if (amount > 0 && expectedFromPct > 0) {
          const ratio = amount / expectedFromPct;
          if (ratio < 0.2 || ratio > 5) {
            parseIntegrityIssues.push(`${label}:amount_pct_mismatch`);
            return Math.round(expectedFromPct * 100) / 100;
          }
        }

        return amount;
      };

      finalOverhead = normalizeMarkupAmount(
        'overhead',
        finalOverhead,
        finalOverheadPct,
        finalDirectAndInsurableSubtotal,
      );
      finalContingency = normalizeMarkupAmount(
        'contingency',
        finalContingency,
        finalContingencyPct,
        finalDirectAndInsurableSubtotal,
      );

      // Escalation often has no explicit pct column; protect against tiny literal
      // values leaking through (e.g. "5" from "5%").
      if (finalEscalation > 0 && finalEscalation < 1000 && finalDirectAndInsurableSubtotal >= 100000) {
        const inferredEscalation = Math.round(finalDirectAndInsurableSubtotal * 0.05 * 100) / 100;
        parseIntegrityIssues.push('escalation:rebuilt_default_5pct');
        finalEscalation = inferredEscalation;
      }
      const finalSuggestedBid = phase26Bid > 0 ? phase26Bid : suggestedBid;
      let finalSuggestedMarketBid =
        phase26MarketBid > 0 ? phase26MarketBid : suggestedMarketBid;
      const finalPreTaxSubtotal =
        phase26PreTaxSubtotal > 0
          ? phase26PreTaxSubtotal
          : finalDirectSubtotal + finalOverhead + finalContingency + finalEscalation;
      const finalCostPerSqFt =
        phase26CostPerSqFt > 0 ? phase26CostPerSqFt : costPerSqFt;

      marketLow = phase26RangeLow > 0 ? phase26RangeLow : marketLow;
      marketHigh = phase26RangeHigh > 0 ? phase26RangeHigh : marketHigh;

      const derivedBidBasis =
        finalSuggestedMarketBid ||
        finalSuggestedBid ||
        (finalDirectSubtotal +
          finalOverhead +
          finalContingency +
          finalEscalation +
          finalTaxes);

      // Sensible fallback range if low/high are absent in the source report.
      if (derivedBidBasis > 0) {
        if (marketLow <= 0) {
          marketLow = Math.round(derivedBidBasis * 0.93 * 100) / 100;
        }
        if (marketHigh <= 0) {
          marketHigh = Math.round(derivedBidBasis * 1.08 * 100) / 100;
        }
      }

      if (marketHigh > 0 && marketLow > marketHigh) {
        marketHigh = Math.round(marketLow * 1.05 * 100) / 100;
      }

      if (finalSuggestedMarketBid <= 0 && marketLow > 0 && marketHigh > 0) {
        finalSuggestedMarketBid = Math.round(((marketLow + marketHigh) / 2) * 100) / 100;
      }

      return {
        currencySymbol,
        materialCost: finalMaterialCost,
        laborCost: finalLaborCost,
        directSubtotal: finalDirectSubtotal, // Cost to Build
        generalConditions: finalGeneralConditions,
        permitsAdminFees: finalPermitsAdminFees,
        insuranceBonds: finalInsuranceBonds,
        directAndInsurableSubtotal: finalDirectAndInsurableSubtotal,
        overhead: finalOverhead,
        overheadPct: finalOverheadPct,
        contingency: finalContingency,
        contingencyPct: finalContingencyPct,
        escalation: finalEscalation,
        preTaxSubtotal: finalPreTaxSubtotal,
        taxes: finalTaxes,
        salesTaxPct: finalSalesTaxPct,
        suggestedBid: finalSuggestedBid,
        suggestedMarketBid: finalSuggestedMarketBid,
        costPerSqFt: finalCostPerSqFt,
        marketLow,
        marketHigh,

        reportTotalDirectIndirectCosts: finalReportTotalDirectIndirectCosts,
        reportOverheadProfit: finalReportOverheadProfit,
        reportContingency: finalReportContingency,
        reportEscalation: finalReportEscalation,
        reportPreTaxProjectCost: finalReportPreTaxProjectCost,
        reportVatAmount: finalReportVatAmount,
        reportGrandTotalBidPrice: finalReportGrandTotalBidPrice,
        reportContingencyIncludesEscalation,
        debugIndirect: {
          bomId: Number(best?.id || 0),
          bomCreatedAt: String(best?.createdAt || ''),
          hasPhase30Section,
          phase30GeneralConditions: Number(phase30?.generalConditions || 0),
          phase30PermitsAdminFees: Number(phase30?.permitsAdminFees || 0),
          phase30InsuranceBonds: Number(phase30?.insuranceBonds || 0),
          tablePermitsLoose: Number(permitsAdminFeesLoose || 0),
          tableInsuranceLoose: Number(insuranceBondsLoose || 0),
          finalGeneralConditions: Number(finalGeneralConditions || 0),
          finalPermitsAdminFees: Number(finalPermitsAdminFees || 0),
          finalInsuranceBonds: Number(finalInsuranceBonds || 0),
          parseIntegrityIssues,
        },
      };
    } catch (err) {
      console.error('Failed to get detailed cost summary:', err);
      return null;
    }
  }

  async getValueEngineeringReport(jobId: string): Promise<any[]> {
    try {
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return [];
      }
      const fullResponse = results[0].fullResponse;

      const startMarkerRegex = /### Phase 27: Value Engineering/;
      const endMarkerRegex = /#### \*\*Part 3:/;

      const match = fullResponse.match(startMarkerRegex);
      if (!match || match.index === undefined) return [];

      let sectionContent = fullResponse.substring(match.index);
      const endMatch = sectionContent.match(endMarkerRegex);
      if (endMatch && endMatch.index !== undefined) {
        sectionContent = sectionContent.substring(0, endMatch.index);
      }

      // Find the table
      const tableStartRegex = /\| VE ID \|/;
      const tableMatch = sectionContent.match(tableStartRegex);
      if (!tableMatch || tableMatch.index === undefined) return [];

      const tableContent = sectionContent.substring(tableMatch.index);
      const lines = tableContent.split('\n');
      const veItems: any[] = [];

      for (const line of lines) {
        if (!line.trim().startsWith('|') || line.includes(':---')) continue;

        const parts = line
          .split('|')
          .map((p) => p.trim())
          .filter((p) => p !== '');

        if (parts.length > 0 && parts[0].toLowerCase() === 've id') {
          continue;
        }

        // Expected columns: VE ID, Category/Phase, Original Spec, Proposed Alt, Original Cost, Alt Cost, Savings, Analysis
        if (parts.length >= 8) {
          const originalCostStr = parts[4].replace(/\*\*/g, '').replace(/[$,]/g, '');
          const originalCost = parseFloat(originalCostStr) || 0;

          const altCostStr = parts[5].replace(/\*\*/g, '').replace(/[$,]/g, '');
          const alternativeCost = parseFloat(altCostStr) || 0;

          const savingsStr = parts[6].replace(/\*\*/g, '').replace(/[$,]/g, '');
          const savings = parseFloat(savingsStr) || 0;

          const analysisText = parts[7];
          let scheduleImpact = '';
          let performanceImpact = '';

          // Extract Schedule Impact
          const scheduleMatch = analysisText.match(/\*\*Schedule Impact:\*\*(.*?)(?=\*\*|$)/);
          if (scheduleMatch) {
            scheduleImpact = scheduleMatch[1].trim();
          }

          // Extract Performance Impact
          const performanceMatch = analysisText.match(/\*\*Performance Impact:\*\*(.*?)(?=\*\*|$)/);
          if (performanceMatch) {
            performanceImpact = performanceMatch[1].trim();
          }

          // Cleanup analysis text if needed or just use the full text as fallback
          // For now, we keep analysis as the full text but provide the parsed fields

          veItems.push({
            id: parts[0].replace(/\*\*/g, ''),
            category: parts[1],
            original: parts[2].replace(/\*\*/g, ''),
            proposed: parts[3].replace(/\*\*/g, ''),
            originalCost: originalCost,
            alternativeCost: alternativeCost,
            savings: savings,
            analysis: analysisText,
            scheduleImpact: scheduleImpact,
            performanceImpact: performanceImpact
          });
        }
      }
      return veItems;
    } catch (err) {
      console.error('Failed to get VE report:', err);
      return [];
    }
  }

  async getProcurementSchedulePreliminary(jobId: string): Promise<any[]> {
    try {
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return [];
      }
      const fullResponse = results[0].fullResponse;

      const startMarkerRegex = /### Phase 24: Procurement/;
      const endMarkerRegex = /Ready for the next prompt/;

      const match = fullResponse.match(startMarkerRegex);
      if (!match || match.index === undefined) return [];

      let sectionContent = fullResponse.substring(match.index);
      const endMatch = sectionContent.match(endMarkerRegex);
      if (endMatch && endMatch.index !== undefined) {
        sectionContent = sectionContent.substring(0, endMatch.index);
      }

      // Find the table
      const tableStartRegex = /\| Item \|/; // Simplified check
      const tableMatch = sectionContent.match(tableStartRegex);
      if (!tableMatch || tableMatch.index === undefined) return [];

      const tableContent = sectionContent.substring(tableMatch.index);
      const lines = tableContent.split('\n');
      const items: any[] = [];

      for (const line of lines) {
        if (!line.trim().startsWith('|') || line.includes(':---')) continue;

        const parts = line
          .split('|')
          .map((p) => p.trim())
          .filter((p) => p !== '');

        if (parts.length > 0 && parts[0].toLowerCase() === 'item') {
          continue;
        }

        // Expected columns often: Item, CSI, Vendor, Lead Time, Need-By, Delivery, etc.
        // | Item | CSI | Vendor | Lead Time | Need-By | ...
        if (parts.length >= 5) {
          items.push({
            item: parts[0],
            leadTime: parts[3] + ' weeks', // usually just a number in column
            vendor: parts[2],
            estimatedCost: 0, // Not typically in this table
            status: parts[4] // Using "Need-By Date" as status/date info
          });
        }
      }
      return items;
    } catch (err) {
      console.error('Failed to get procurement schedule:', err);
      return [];
    }
  }

  async getMaxProcurementLeadTimeWeeks(jobId: string): Promise<number | null> {
    try {
      const results = await this.jobsService.GetBillOfMaterials(jobId).toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }

      const fullResponse = results[0].fullResponse;
      const startMarkerRegex = /###\s*Phase\s*24:\s*Procurement\s*&\s*Submittal\s*Schedule/i;
      const endMarkerRegex = /Ready for the next prompt/i;

      const startMatch = fullResponse.match(startMarkerRegex);
      if (!startMatch || startMatch.index === undefined) return null;

      let sectionContent = fullResponse.substring(startMatch.index);
      const endMatch = sectionContent.match(endMarkerRegex);
      if (endMatch && endMatch.index !== undefined) {
        sectionContent = sectionContent.substring(0, endMatch.index);
      }

      const lines = sectionContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('|'));

      if (!lines.length) return null;

      const headerLine = lines.find((line) =>
        /estimated\s*lead\s*time\s*\(weeks\)/i.test(line),
      );
      if (!headerLine) return null;

      const headerParts = headerLine
        .split('|')
        .map((p) => p.trim())
        .filter((p) => p !== '');

      const leadTimeIndex = headerParts.findIndex((part) =>
        /estimated\s*lead\s*time\s*\(weeks\)/i.test(part),
      );
      if (leadTimeIndex === -1) return null;

      let maxWeeks = 0;

      for (const line of lines) {
        if (line.includes(':---')) continue;

        const parts = line
          .split('|')
          .map((p) => p.trim())
          .filter((p) => p !== '');

        if (!parts.length) continue;
        if (/^item$/i.test(parts[0])) continue;
        if (parts.length <= leadTimeIndex) continue;

        const raw = String(parts[leadTimeIndex] || '');
        const match = raw.match(/(\d+(?:\.\d+)?)/);
        if (!match) continue;

        const weeks = Number(match[1]);
        if (Number.isFinite(weeks) && weeks > maxWeeks) {
          maxWeeks = weeks;
        }
      }

      return maxWeeks > 0 ? Math.round(maxWeeks) : null;
    } catch (err) {
      console.error('Failed to parse max procurement lead time weeks:', err);
      return null;
    }
  }

  async getPermittingLeadTimeWeeks(jobId: string): Promise<number | null> {
    try {
      const results = await this.jobsService.GetBillOfMaterials(jobId).toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }

      const fullResponse = results[0].fullResponse;

      const directMatch = fullResponse.match(
        /\|\s*Pre[-\s]*Construction\s*(?:&|and)\s*Permitting\s*\|\s*(\d+(?:\.\d+)?)\s*Weeks?/i,
      );
      if (directMatch && directMatch[1]) {
        const weeks = Number(directMatch[1]);
        return Number.isFinite(weeks) && weeks > 0 ? Math.round(weeks) : null;
      }

      const timelineSectionMatch = fullResponse.match(
        /\*{0,2}#{0,5}\s*6\.2\s*Timeline\s*Table\*{0,2}([\s\S]*?)(?=\n\s*\*{0,2}#{1,6}\s*\d+\.\d+|\n\s*###|\n\s*Ready for the next prompt|$)/i,
      );
      if (timelineSectionMatch && timelineSectionMatch[1]) {
        const fallbackMatch = timelineSectionMatch[1].match(
          /Pre[-\s]*Construction\s*(?:&|and)\s*Permitting[^\n|]*\|\s*(\d+(?:\.\d+)?)\s*Weeks?/i,
        );

        if (fallbackMatch && fallbackMatch[1]) {
          const weeks = Number(fallbackMatch[1]);
          return Number.isFinite(weeks) && weeks > 0 ? Math.round(weeks) : null;
        }
      }

      // Last-resort fallback: any permitting row in the full report table text
      const globalFallbackMatch = fullResponse.match(
        /Pre[-\s]*Construction\s*(?:&|and)\s*Permitting[\s\S]{0,80}?\|\s*(\d+(?:\.\d+)?)\s*Weeks?/i,
      );
      if (globalFallbackMatch && globalFallbackMatch[1]) {
        const weeks = Number(globalFallbackMatch[1]);
        return Number.isFinite(weeks) && weeks > 0 ? Math.round(weeks) : null;
      }

      return null;
    } catch (err) {
      console.error('Failed to parse permitting lead time weeks:', err);
      return null;
    }
  }

  async getCostSummary(jobId: string): Promise<{
    bidPrice: number;
    directCosts: number;
    overheadAndProfit: number;
    contingency: number;
    escalation: number;
    taxes: number;
  }> {
    try {
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return {
          bidPrice: 0,
          directCosts: 0,
          overheadAndProfit: 0,
          contingency: 0,
          escalation: 0,
          taxes: 0,
        };
      }
      const fullResponse = results[0].fullResponse;

      let bidPrice = 0;
      let directCosts = 0;
      let overheadAndProfit = 0;
      let contingency = 0;
      let escalation = 0;
      let taxes = 0;

      // Extract Bid Price
      const bidMatch = fullResponse.match(
        /Calculated GC Bid Price.*?\$([\d,]+\.?\d*)/,
      );
      if (bidMatch && bidMatch[1]) {
        bidPrice = parseFloat(bidMatch[1].replace(/,/g, ''));
      }

      // Extract Direct Costs
      const directMatch = fullResponse.match(
        /Subtotal \(Direct.*?\).*?\$([\d,]+\.?\d*)/,
      );
      if (directMatch && directMatch[1]) {
        directCosts = parseFloat(directMatch[1].replace(/,/g, ''));
      }

      // Extract GC Overhead & Profit
      const profitMatch = fullResponse.match(
        /GC Overhead & Profit.*?\$([\d,]+\.?\d*)/,
      );
      if (profitMatch && profitMatch[1]) {
        overheadAndProfit = parseFloat(profitMatch[1].replace(/,/g, ''));
      }

      // Extract Contingency
      const contingencyMatch = fullResponse.match(
        /Contingency Reserve.*?\$([\d,]+\.?\d*)/,
      );
      if (contingencyMatch && contingencyMatch[1]) {
        contingency = parseFloat(contingencyMatch[1].replace(/,/g, ''));
      }

      // Extract Escalation
      const escalationMatch = fullResponse.match(
        /Cost Escalation Allowance.*?\$([\d,]+\.?\d*)/,
      );
      if (escalationMatch && escalationMatch[1]) {
        escalation = parseFloat(escalationMatch[1].replace(/,/g, ''));
      }

      // Extract Taxes
      const taxesMatch = fullResponse.match(/Sales Tax.*?\$([\d,]+\.?\d*)/);
      if (taxesMatch && taxesMatch[1]) {
        taxes = parseFloat(taxesMatch[1].replace(/,/g, ''));
      }

      return {
        bidPrice,
        directCosts,
        overheadAndProfit,
        contingency,
        escalation,
        taxes,
      };
    } catch (err) {
      console.error('Failed to get cost summary:', err);
      return {
        bidPrice: 0,
        directCosts: 0,
        overheadAndProfit: 0,
        contingency: 0,
        escalation: 0,
        taxes: 0,
      };
    }
  }
}
