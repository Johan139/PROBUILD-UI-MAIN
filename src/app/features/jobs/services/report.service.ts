import { Injectable } from '@angular/core';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { marked } from 'marked';
import { Permit } from '../../../models/permit';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(
    private jobsService: JobsService,
    private snackBar: MatSnackBar,
  ) {}

  async getPermitsAndApprovalsReport(jobId: string): Promise<Permit[]> {
    try {
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return [];
      }
      const fullResponse = results[0].fullResponse;

      const startMarker = '### 4. Permits and Approvals Report';
      const endMarker = '### 5. Blueprint Review & Error Report';

      const startIndex = fullResponse.indexOf(startMarker);
      if (startIndex === -1) return [];

      let sectionContent = fullResponse.substring(startIndex);
      const endIndex = sectionContent.indexOf(endMarker);
      if (endIndex !== -1) {
        sectionContent = sectionContent.substring(0, endIndex);
      }

      const lines = sectionContent.split('\n');
      const permits: Permit[] = [];
      let inTable = false;

      for (const line of lines) {
        if (line.trim().startsWith('|') && line.includes('---')) {
          inTable = true;
          continue;
        }

        if (inTable && line.trim().startsWith('|')) {
          const parts = line
            .split('|')
            .map((p) => p.trim())
            .filter((p) => p !== '');
          if (parts.length >= 3) {
            const name = parts[0].replace(/\*\*/g, '');
            const agency = parts[1].replace(/\*\*/g, '');
            const requirements = parts[2].replace(/\*\*/g, '');

            if (name !== 'Permit Name') {
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

  async getEnvironmentalReportContent(jobId: string): Promise<string | null> {
    try {
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
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
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
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
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
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
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
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
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
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
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
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
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
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
      // Look for the table under "2. Room Identification"
      const roomSectionStart = fullResponse.indexOf(
        '### 2. Room Identification',
      );
      if (roomSectionStart !== -1) {
        const tableStart = fullResponse.indexOf(
          '| Room Name | Area',
          roomSectionStart,
        );
        if (tableStart !== -1) {
          const tableEnd = fullResponse.indexOf(
            '**Total (Sum):**',
            tableStart,
          );
          if (tableEnd !== -1) {
            const tableContent = fullResponse.substring(tableStart, tableEnd);
            // Count lines that start with '|' and are not header/separator
            const lines = tableContent.split('\n').filter((line) => {
              const trimmed = line.trim();
              return (
                trimmed.startsWith('|') &&
                !trimmed.includes('Room Name') &&
                !trimmed.includes(':---')
              );
            });
            roomCount = lines.length;

            rooms = lines
              .map((line) => {
                const parts = line
                  .split('|')
                  .map((p) => p.trim())
                  .filter((p) => p !== '');
                if (parts.length >= 2) {
                  return { name: parts[0], area: parts[1] };
                }
                return null;
              })
              .filter((r): r is { name: string; area: string } => r !== null);
          }
        }
      }

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
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return null;
      }
      const fullResponse = results[0].fullResponse;

      const parseCurrency = (raw: string): number => {
        const cleaned = String(raw || '').replace(/\*\*/g, '');
        const match = cleaned.match(/-?\$?\s*([\d,]+(?:\.\d+)?)/);
        return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
      };

      const extractValue = (regex: RegExp) => {
        const match = fullResponse.match(regex);
        return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
      };

      const materialCost = extractValue(
        /\|\s*Total Material Cost.*?\$\s*([\d,]+\.?\d*)/,
      );
      const laborCost = extractValue(
        /\|\s*Total Labor Cost.*?\$\s*([\d,]+\.?\d*)/,
      );
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

      const taxes =
        extractValue(/\|\s*Sales Tax.*?\$\s*([\d,]+\.?\d*)/) ||
        extractValue(/\|\s*Taxes.*?\$\s*([\d,]+\.?\d*)/);

      // Handle potential markdown bold markers (**Calculated GC Bid Price**)
      const suggestedBid = extractValue(
        /Calculated GC Bid Price.*?\$\s*([\d,]+\.?\d*)/,
      );
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

      // Phase 26 table parser (authoritative source for bid proposal values)
      const phase26SectionMatch = fullResponse.match(
        /###\s*Phase\s*26:[\s\S]*?(?=\n###\s*Phase\s*27:|\n\s*Ready for the next prompt|$)/i,
      );

      let phase26Direct = 0;
      let phase26Overhead = 0;
      let phase26OverheadPct = 0;
      let phase26Contingency = 0;
      let phase26ContingencyPct = 0;
      let phase26Escalation = 0;
      let phase26Taxes = 0;
      let phase26Bid = 0;
      let phase26MarketBid = 0;
      let phase26CostPerSqFt = 0;
      let phase26RangeLow = 0;
      let phase26RangeHigh = 0;

      if (phase26SectionMatch && phase26SectionMatch[0]) {
        const tableLines = phase26SectionMatch[0]
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

          const label = String(cols[0] || '').toLowerCase();
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
          const moneyToken = valueCols.find((v) => /\$/.test(v)) || amountCol;
          const percentToken = valueCols.find((v) => /%/.test(v)) || pctCol;
          const amount = parseCurrency(moneyToken);
          const pct = parseCurrency(percentToken);

          if (label.includes('subtotal (direct')) {
            phase26Direct = amount;
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

          if (label.includes('sales tax') || label === 'taxes') {
            phase26Taxes = amount;
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

      const finalDirectSubtotal = phase26Direct > 0 ? phase26Direct : directSubtotal;
      const finalOverhead = phase26Overhead > 0 ? phase26Overhead : overhead;
      const finalOverheadPct = phase26OverheadPct > 0 ? phase26OverheadPct : overheadPct;
      const finalContingency =
        phase26Contingency > 0 ? phase26Contingency : contingency;
      const finalContingencyPct =
        phase26ContingencyPct > 0 ? phase26ContingencyPct : contingencyPct;
      const escalation = phase26Escalation || extractValue(/Cost Escalation Allowance.*?\$\s*([\d,]+\.?\d*)/);
      const finalTaxes = phase26Taxes > 0 ? phase26Taxes : taxes;
      const finalSuggestedBid = phase26Bid > 0 ? phase26Bid : suggestedBid;
      let finalSuggestedMarketBid =
        phase26MarketBid > 0 ? phase26MarketBid : suggestedMarketBid;
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
          escalation +
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
        materialCost,
        laborCost,
        directSubtotal: finalDirectSubtotal, // Cost to Build
        overhead: finalOverhead,
        overheadPct: finalOverheadPct,
        contingency: finalContingency,
        contingencyPct: finalContingencyPct,
        escalation,
        taxes: finalTaxes,
        suggestedBid: finalSuggestedBid,
        suggestedMarketBid: finalSuggestedMarketBid,
        costPerSqFt: finalCostPerSqFt,
        marketLow,
        marketHigh,
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
