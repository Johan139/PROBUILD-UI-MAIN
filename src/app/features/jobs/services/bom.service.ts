import { Injectable } from '@angular/core';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root',
})
export class BomService {
  constructor(
    private jobsService: JobsService,
    private snackBar: MatSnackBar
  ) {}

  getBillOfMaterials(jobId: string): Observable<any> {
    return this.jobsService.GetBillOfMaterials(jobId).pipe(
      map((status: any) => {
        if (status.length > 0) {
          return status.map((doc: any) => ({
            id: doc.id,
            jobId: doc.jobId,
            documentId: doc.DocumentId,
            bomJson: '',
            materialsEstimateJson: doc.materialsEstimateJson,
            fullResponse: doc.fullResponse,
            createdAt: doc.createdAt,
            parsedReport: this.parseReport(doc.fullResponse),
          }));
        }
        return { message: status.message, isProcessingComplete: false };
      }),
      catchError((error) => {
        return of({
          error: error.error?.error || 'Failed to check AI processing status.',
        });
      })
    );
  }

  parseReport(fullResponse: string): any {
    if (!fullResponse) {
      return { sections: [] };
    }

    const sections: any[] = [];
    const promptTitles: { [key: number]: string } = {
      2: 'Groundwork & Foundation',
      3: 'Framing & Structure',
      4: 'Roofing',
      5: 'Exterior Enclosure',
      6: 'Electrical',
      7: 'Plumbing',
      8: 'HVAC',
      9: 'Insulation',
      10: 'Drywall',
      11: 'Painting & Coatings',
      12: 'Interior Trim & Doors',
      13: 'Kitchen & Bath',
      14: 'Flooring',
      15: 'Exterior Flatwork & Landscaping',
      16: 'Cleaning & Final Touches',
    };

    const parseTableFromLines = (lines: string[], startIndex: number) => {
      let tableHeaderIndex = -1;
      for (let j = startIndex; j < lines.length; j++) {
        if (lines[j].trim().startsWith('|') && !lines[j].includes('---')) {
          tableHeaderIndex = j;
          break;
        }
      }

      if (tableHeaderIndex !== -1) {
        const tableHeaders = lines[tableHeaderIndex]
          .split('|')
          .map((cell) => cell.trim().replace(/\*\*/g, ''))
          .slice(1, -1);
        const tableContent: any[] = [];

        for (let j = tableHeaderIndex + 2; j < lines.length; j++) {
          const line = lines[j];
          const trimmedLine = line.trim();

          if (trimmedLine.startsWith('|')) {
            const row = trimmedLine
              .split('|')
              .map((cell) => cell.trim().replace(/\*/g, ''))
              .slice(1, -1);
            if (row.length > 0 && row.join('').trim() !== '') {
              tableContent.push(row);
            }
          } else if (
            trimmedLine.startsWith('###') ||
            trimmedLine.startsWith('Ready for the next prompt') ||
            trimmedLine.startsWith('*Note:')
          ) {
            break;
          }
        }

        if (tableHeaders.length > 0 && tableContent.length > 0) {
          return {
            headers: tableHeaders,
            content: tableContent,
          };
        }
      }
      return null;
    };

    const isRenovation = fullResponse.includes(
      'This concludes the comprehensive project analysis for the renovation. Standing by.'
    );

    let isSelected = false;
    try {
      const jsonMatch = fullResponse.match(/```json([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.isSelected === 'true') {
          isSelected = true;
        }
      }
    } catch (e) {
      console.error('Error parsing JSON from AI response:', e);
    }

    if (isSelected) {
      const lines = fullResponse.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const trimmedLine = lines[i].trim();
        if (trimmedLine.startsWith('|') && !trimmedLine.includes('---')) {
          const table = parseTableFromLines(lines, i);
          if (table && table.headers) {
            const headers = table.headers.join(' ').toLowerCase();
            let title = '';

            if (headers.includes('task description') && headers.includes('total labor cost')) {
              title = 'Labor Cost Breakdown';
            } else if (headers.includes('item') && headers.includes('total cost')) {
              title = 'Bill of Materials';
            } else if (headers.includes('category') && headers.includes('amount')) {
              title = 'Financial Summary';
            }

            if (title) {
              sections.push({
                title: title,
                type: 'table',
                ...table,
              });
              // Skip past the parsed table to avoid re-processing
              i += table.content.length + 2;
            }
          }
        }
      }
    } else if (isRenovation) {
      // For renovation prompts, only parse the detailed cost breakdown section
      const costSummaryMatch = fullResponse.match(/### \*\*S-1: Detailed Cost Breakdown Summary\*\*([\s\S]*?)(?=### \*\*S-2:|$)/);
      if (costSummaryMatch && costSummaryMatch[1]) {
        const costSummaryText = costSummaryMatch[1];
        const costLines = costSummaryText.trim().split('\n');

        // Find all tables within the section
        for (let i = 0; i < costLines.length; i++) {
          if (costLines[i].trim().startsWith('|') && !costLines[i].includes('---')) {
            const table = parseTableFromLines(costLines, i);

            // A table is considered a cost table if it has a "Total Cost" column OR both "Description" and "Amount" columns
            const isCostTable = table && (
              table.headers.some((h: string) => h.toLowerCase().includes('total cost')) ||
              (table.headers.includes('Description') && table.headers.some((h: string) => h.includes('Amount')))
            );

            if (isCostTable) {
              let tableTitle = 'Cost Breakdown'; // Default title
              // Find the nearest preceding header to use as a title
              for (let k = i - 1; k >= 0; k--) {
                const trimmedLine = costLines[k].trim();
                if (trimmedLine.startsWith('####') || trimmedLine.startsWith('### **Part B')) {
                  tableTitle = trimmedLine.replace(/#|\*/g, '').trim();
                  break;
                }
              }
              sections.push({
                title: tableTitle,
                type: 'table',
                ...table,
              });
              // Skip past the table we just parsed
              if(table.content) {
                i += table.content.length + 2;
              }
            }
          }
        }
      }
    } else {
      // Existing logic for Full Analysis prompts
      const reportSections = fullResponse.split(
        /(?=Ready for the next prompt \d+\.)/
      );

      for (const sectionText of reportSections) {
        const promptNumberMatch = sectionText.match(
          /Ready for the next prompt (\d+)\./
        );
        if (!promptNumberMatch) continue;

        const promptNumber = parseInt(promptNumberMatch[1], 10);
        const phaseName = promptTitles[promptNumber];

        if (phaseName) {
          const lines = sectionText.trim().split('\n');

          const bomTitleIndex = lines.findIndex((l) =>
            l.includes('Materials Bill of Materials (BOM)')
          );
          if (bomTitleIndex !== -1) {
            const table = parseTableFromLines(lines, bomTitleIndex + 1);
            if (table) {
              sections.push({
                title: `${phaseName} - Bill of Materials`,
                type: 'table',
                ...table,
              });
            }
          }

          const subconTitleIndex = lines.findIndex((l) =>
            l.includes('Subcontractor Cost Breakdown')
          );
          if (subconTitleIndex !== -1) {
            const table = parseTableFromLines(lines, subconTitleIndex + 1);
            if (table) {
              sections.push({
                title: `${phaseName} - Subcontractor Cost Breakdown`,
                type: 'table',
                ...table,
              });
            }
          }
        }
      }
    }

    // Global fallback for final cost breakdown
    const allLines = fullResponse.split('\n');
    let costBreakdownTitleIndex = -1;

    const prioritizedRegex = [
      /### \*\*.*Detailed Cost Breakdown\*\*/i,
      /### \*\*.*As-Specced Project Budget\*\*/i,
      /### \*\*.*Cost Breakdown\*\*/i,
    ];

    for (const regex of prioritizedRegex) {
      const index = allLines.findIndex((line) => regex.test(line));
      if (index !== -1) {
        costBreakdownTitleIndex = index;
        break;
      }
    }

    if (costBreakdownTitleIndex !== -1 && isRenovation === false) {
      const table = parseTableFromLines(allLines, costBreakdownTitleIndex + 1);
      if (table) {
        // Avoid duplicating if already found in renovation parse
        const titleExists = sections.some(s => s.title.includes('Cost Breakdown'));
        if (!titleExists) {
          sections.push({
            title: 'Total Cost Breakdown',
            type: 'table',
            ...table,
          });
        }
      }
    }

    return { sections };
  }

  generateBOMPDF(processingResults: any[]): void {
    if (!processingResults || processingResults.length === 0) {
      this.snackBar.open('No data available to generate PDF.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const doc = new jsPDF();
    const logo = new Image();
    logo.src = 'assets/logo.png';

    const parsedReport = processingResults[0].parsedReport;

    const drawContent = (withLogo: boolean) => {
      const addPageHeader = () => {
        if (withLogo) {
          doc.addImage(logo, 'PNG', 10, 10, 50, 15);
        }
        doc.setFontSize(18);
        doc.text('Bill of Materials', 10, withLogo ? 35 : 15);
      };

      parsedReport.sections.forEach((section: any, index: number) => {
        if (index > 0) {
          doc.addPage();
        }
        addPageHeader();

        doc.setFontSize(14);
        doc.text(section.title, 10, withLogo ? 45 : 25);

        autoTable(doc, {
          head: [section.headers],
          body: section.content,
          startY: withLogo ? 50 : 30,
          theme: 'grid',
          headStyles: {
            fillColor: '#FFC107',
            textColor: '#000000',
          },
        });
      });

      doc.save('bill-of-materials.pdf');
    };

    logo.onload = () => {
      drawContent(true);
    };

    logo.onerror = () => {
      this.snackBar.open('Could not load logo, proceeding without it.', 'Close', {
        duration: 3000,
      });
      drawContent(false);
    };
  }
}
