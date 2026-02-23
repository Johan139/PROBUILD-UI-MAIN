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
      //console.log('REPORT SERVICE - Full Response for Executive Summary Data:', fullResponse);

      // Extract Key Highlights
      const totalCostMatch = fullResponse.match(
        /\*\*\s*Total Estimated Cost:?\s*\*\*\s*(\$[0-9,.]+)/i
      );
      const durationMatch = fullResponse.match(
        /\*\*\s*Project Duration:?\s*\*\*\s*(.*?)(?=\n|$)/i
      );
      const veMatch = fullResponse.match(
        /\*\*\s*Value Engineering Potential:?\s*\*\*\s*(\$[0-9,.]+)/i
      );
      const riskMatch = fullResponse.match(
        /\*\*\s*Critical Blueprint Deficiency:?\s*\*\*\s*(.*?)(?=\n|$)/i
      );
      const complianceMatch = fullResponse.match(
        /\*\*\s*Compliance Risk:?\s*\*\*\s*(.*?)(?=\n|$)/i
      );

      // Extract Overall Confidence
      const confidenceMatch = fullResponse.match(
        /\|\s*\*\*Overall Confidence Index\*\*\s*\|\s*\*\*(\d+)%\*\*/
      );

      // Extract Risk Factors from Table
      const risks: any[] = [];
      const riskTableRegex = /\| Risk Category \| Severity \| Probability \| Notes \|\s*\n\| :--- \| :--- \| :--- \| :--- \|\s*\n([\s\S]*?)(?=\n\n)/;
      const riskTableMatch = fullResponse.match(riskTableRegex);

      if (riskTableMatch && riskTableMatch[1]) {
        const lines = riskTableMatch[1].trim().split('\n');
        lines.forEach((line) => {
          const parts = line.split('|').map((p) => p.trim());
          if (parts.length >= 5) {
            risks.push({
              risk: parts[1].replace(/\*\*/g, ''), // Category
              severity: parts[2].toLowerCase(),
              probability: parts[3],
              description: parts[4].replace(/\*\*/g, ''),
            });
          }
        });
      }

      return {
        overview:
          'This document presents a comprehensive construction analysis based on the provided blueprints.', // Default text or extract from "1. Overview"
        keyHighlights: [
          {
            label: 'Total Project Cost',
            value: totalCostMatch ? totalCostMatch[1] : 'N/A',
            note: 'Estimated',
          },
          {
            label: 'Project Duration',
            value: durationMatch ? durationMatch[1] : 'N/A',
            note: 'Estimated',
          },
          {
            label: 'Value Engineering',
            value: veMatch ? veMatch[1] : 'N/A',
            note: 'Potential Savings',
          },
          {
            label: 'Critical Risk',
            value: riskMatch ? 'Deficiencies Found' : 'None Identified',
            note: riskMatch ? riskMatch[1].substring(0, 50) + '...' : '',
          },
        ],
        riskFactors: risks.length > 0 ? risks : [],
        blueprintConfidence: {
          overallConfidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 0,
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
    const logo = new Image();
    logo.src = 'assets/logo.png';

    const generateReport = (logoDataUrl?: string) => {
      const worker = new Worker(
        new URL('../report-generator.worker', import.meta.url),
        { type: 'module' },
      );

      worker.onmessage = ({ data }) => {
        if (data.success) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(data.pdfBlob);
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(link.href);
        } else {
          this.snackBar.open(data.error, 'Close', { duration: 3000 });
        }
        worker.terminate();
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.snackBar.open(
          'An error occurred while generating the PDF.',
          'Close',
          { duration: 3000 },
        );
        worker.terminate();
      };

      const jsonContent = this._parseHtmlToJson(htmlContent);
      worker.postMessage({
        reportContent: jsonContent,
        logoDataUrl: logoDataUrl,
        title: title,
      });
    };

    logo.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = logo.width;
      canvas.height = logo.height;
      ctx!.drawImage(logo, 0, 0);
      const logoDataUrl = canvas.toDataURL('image/png');
      generateReport(logoDataUrl);
    };

    logo.onerror = () => {
      console.warn('Could not load logo, proceeding without it.');
      generateReport();
    };
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
        case 'H3':
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

      return {
        materialCost,
        laborCost,
        directSubtotal, // Cost to Build
        overhead,
        overheadPct,
        contingency,
        contingencyPct,
        taxes,
        suggestedBid,
        suggestedMarketBid,
        costPerSqFt,
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
