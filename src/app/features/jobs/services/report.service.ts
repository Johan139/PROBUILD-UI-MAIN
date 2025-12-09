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

      return marked(fullResponse);
    } catch (err) {
      console.error('Failed to get full report content:', err);
      return null;
    }
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
  }> {
    try {
      const results = await this.jobsService
        .GetBillOfMaterials(jobId)
        .toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        return { confidenceScore: 0, sheetCount: 0, roomCount: 0 };
      }
      const fullResponse = results[0].fullResponse;

      let confidenceScore = 0;
      let sheetCount = 0;
      let roomCount = 0;

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

      const sheetMatch = fullResponse.match(/Sheet Numbers\*\* \| (.*?)\s*\|/);
      if (sheetMatch && sheetMatch[1]) {
        const sheets = sheetMatch[1].split(',').map((s) => s.trim());
        sheetCount = sheets.length;
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
            roomCount = lines.length - 1; // TODO Check if header or total lines are counted
          }
        }
      }

      return { confidenceScore, sheetCount, roomCount };
    } catch (err) {
      console.error('Failed to get blueprint intelligence:', err);
      return { confidenceScore: 0, sheetCount: 0, roomCount: 0 };
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
}
