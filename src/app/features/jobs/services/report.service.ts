import { Injectable } from '@angular/core';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { marked } from 'marked';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  constructor(
    private jobsService: JobsService,
    private snackBar: MatSnackBar
  ) {}

  async downloadEnvironmentalReport(jobId: string): Promise<void> {
    try {
      const results = await this.jobsService.GetBillOfMaterials(jobId).toPromise();
      if (!results || results.length === 0 || !results[0].fullResponse) {
        this.snackBar.open('Could not retrieve the report data.', 'Close', {
          duration: 3000,
        });
        return;
      }

      const fullResponse = results[0].fullResponse;
      let reportContent = '';
      const isRenovation = fullResponse.includes(
        'This concludes the comprehensive project analysis for the renovation. Standing by.'
      );

      if (isRenovation) {
        const renovationMatch = fullResponse.match(/### \*\*S-3: Environmental Impact Report\*\*([\s\S]*?)(?=### \*\*S-4:|$|### \*\*Final Executive Briefing)/);
        if (renovationMatch && renovationMatch[1]) {
          reportContent = renovationMatch[1].trim();
        }
      } else {
        const reportStartMarker = 'Ready for the next prompt 20.';
        const reportEndMarker = 'Ready for the next prompt 21.';
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
        this.snackBar.open('Environmental report section not found.', 'Close', {
          duration: 3000,
        });
        return;
      }
      const linesToRemove = [
        'Here is the comprehensive Environmental Lifecycle Report for the Hernandez Residence.',
        '**Prepared By:** Gemini Sustainability Consulting',
        '**From:** Gemini - Sustainability Consultant & Estimator',
        '### **Phase 20: Environmental Lifecycle Report**',
        'Ready for the next prompt 10.'
      ];
      linesToRemove.forEach((line) => {
        reportContent = reportContent
          .replace(
            new RegExp(line.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'),
            ''
          )
          .trim();
      });

      // Remove the dynamic introductory paragraph
      reportContent = reportContent.replace(/As a Sustainability and Environmental Construction Analyst,[\s\S]*?\n\n/, '').trim();

      const parsedContent = await Promise.resolve(marked(reportContent));

      const logo = new Image();
      logo.src = 'assets/logo.png';

      const generateReport = (logoDataUrl?: string) => {
        const worker = new Worker(
          new URL('../report-generator.worker', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = ({ data }) => {
          if (data.success) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(data.pdfBlob);
            link.download = 'environmental-lifecycle-report.pdf';
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
            { duration: 3000 }
          );
          worker.terminate();
        };

        const jsonContent = this._parseHtmlToJson(parsedContent);
        worker.postMessage({
          reportContent: jsonContent,
          logoDataUrl: logoDataUrl,
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
    } catch (err) {
      console.error('Failed to get bill of materials for report:', err);
      this.snackBar.open('Failed to fetch report data.', 'Close', {
        duration: 3000,
      });
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
            (li) => li.textContent || ''
          );
          json.push({ type: 'ul', items });
          break;
        case 'OL':
          const olItems = Array.from(el.querySelectorAll('li')).map(
            (li) => li.textContent || ''
          );
          json.push({ type: 'ol', items: olItems });
          break;
        case 'TABLE':
          const head = Array.from(el.querySelectorAll('thead tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th')).map((th) => th.textContent || '')
          );
          const body = Array.from(el.querySelectorAll('tbody tr')).map((tr) =>
            Array.from(tr.querySelectorAll('td')).map((td) => td.textContent || '')
          );
          json.push({ type: 'table', head, body });
          break;
      }
    });

    return json;
  }
}
