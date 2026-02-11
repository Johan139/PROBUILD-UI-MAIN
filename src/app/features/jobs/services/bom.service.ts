import { Injectable } from '@angular/core';
import { JobsService } from '../../../services/jobs.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root',
})
export class BomService {
  private apiUrl = environment.BACKEND_URL + '/tradepackages';

  constructor(
    private jobsService: JobsService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
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
      }),
    );
  }

  parseReport(fullResponse: string): any {
    if (!fullResponse) {
      return { sections: [] };
    }

    // console.log('Parsing AI Response:', fullResponse);

    const sections: any[] = [];
    const promptTitles: { [key: number]: string } = {
      1: 'Site Logistics',
      2: 'Quality Management',
      3: 'Demolition',
      4: 'Groundwork & Foundation',
      5: 'Framing & Structure',
      6: 'Roofing',
      7: 'Exterior Enclosure',
      8: 'Electrical',
      9: 'Plumbing',
      10: 'HVAC',
      11: 'Fire Protection',
      12: 'Insulation',
      13: 'Drywall',
      14: 'Painting & Coatings',
      15: 'Interior Trim & Doors',
      16: 'Kitchen & Bath',
      17: 'Flooring',
      18: 'Exterior Flatwork & Landscaping',
      19: 'Cleaning & Final Touches',
      20: 'Risk Analysis',
      21: 'Timeline',
      22: 'General Conditions',
      23: 'Procurement',
      24: 'Daily Construction Plan',
      25: 'Cost Breakdowns',
      26: 'Value Engineering',
      27: 'Environmental Lifecycle',
      28: 'Project Closeout',
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

    let isRenovation = false;
    let isSelected = false;
    try {
      const jsonMatch = fullResponse.match(/```json([\s\S]*?)```/);
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
        // Fallback check
        isRenovation =
          /This concludes the comprehensive project analysis for the .*?\. Standing by\./.test(
            fullResponse,
          );
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

            if (
              headers.includes('task description') &&
              headers.includes('total labor cost')
            ) {
              title = 'Labor Cost Breakdown';
            } else if (
              headers.includes('item') &&
              headers.includes('total cost')
            ) {
              title = 'Bill of Materials';
            } else if (
              headers.includes('category') &&
              headers.includes('amount')
            ) {
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
      const renovationPhaseMap: { [key: string]: string } = {
        'R-1': 'R-1: Demolition & Hazardous Material Abatement',
        'R-2': 'R-2: Structural Alterations & Repair',
        'R-3': 'R-3: MEP Rough-In',
        'R-4': 'R-4: Insulation & Drywall',
        'R-5': 'R-5: Interior Finishes',
        'R-6': 'R-6: Fixtures, Fittings & Equipment (FF&E)',
      };

      // Isolate the main cost breakdown and summary sections
      const costSectionRegex =
        /### \*\*(Part A: Detailed Cost Breakdown|S-1: Detailed Cost Breakdown Summary|Part A: Detailed Cost Breakdown|Part A: Detailed Breakdown)\*\*([\s\S]*?)(?=### \*\*(Part B:|S-2:|Project Summary|$))/;
      const summarySectionRegex =
        /### \*\*(Part B: Project Cost Summary|Part B: Project Summary)\*\*([\s\S]*?)(?=\n###|$)/;

      const costSectionMatch = fullResponse.match(costSectionRegex);
      if (costSectionMatch && costSectionMatch[2]) {
        // Split the cost breakdown section into individual R-tables
        const rSections = costSectionMatch[2].split(
          /^(?=#### \*\*R-|^\*\*R-)/m,
        );
        for (const rSection of rSections) {
          if (rSection.trim() === '') continue;

          const lines = rSection.trim().split('\n');
          const titleLine = lines[0].trim();
          let tableTitle = titleLine.replace(/#|\*/g, '').trim();

          const rNumberMatch = tableTitle.match(/(R-\d+)/);
          if (rNumberMatch && renovationPhaseMap[rNumberMatch[1]]) {
            tableTitle = renovationPhaseMap[rNumberMatch[1]];
          }

          const table = parseTableFromLines(lines, 1);
          if (table) {
            sections.push({ title: tableTitle, type: 'table', ...table });
          }
        }
      }

      const summaryMatch = fullResponse.match(summarySectionRegex);
      if (summaryMatch && summaryMatch[2]) {
        const lines = summaryMatch[2].trim().split('\n');
        const table = parseTableFromLines(lines, 0);
        if (table) {
          sections.push({
            title: 'Project Cost Summary',
            type: 'table',
            ...table,
          });
        }
      }
    } else {
      // Existing logic for Full Analysis prompts
      const reportSections = fullResponse.split(
        /(?=Ready for the next prompt \d+\.)/,
      );

      for (const sectionText of reportSections) {
        const promptNumberMatch = sectionText.match(
          /Ready for the next prompt (\d+)\./,
        );
        if (!promptNumberMatch) continue;

        const promptNumber = parseInt(promptNumberMatch[1], 10);
        const phaseName = promptTitles[promptNumber];

        if (phaseName) {
          const lines = sectionText.trim().split('\n');

          // Find 'Output 1: ... Materials BOM' or just 'Materials BOM'
          const bomTitleIndex = lines.findIndex(
            (l) => l.includes('Output 1:') || l.includes('Materials BOM'),
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

          // Find 'Output 2: Subcontractor Cost Breakdown' or just 'Subcontractor Cost Breakdown'
          const subconTitleIndex = lines.findIndex(
            (l) =>
              l.includes('Output 2:') ||
              l.includes('Subcontractor Cost Breakdown'),
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

    if (costBreakdownTitleIndex !== -1) {
      const table = parseTableFromLines(allLines, costBreakdownTitleIndex + 1);
      if (table) {
        const title = allLines[costBreakdownTitleIndex]
          .replace(/#|\*/g, '')
          .trim();
        const titleExists = sections.some((s) => s.title === title);
        if (!titleExists) {
          sections.push({
            title: 'Total Project Cost Breakdown',
            type: 'table',
            ...table,
          });
        }
      }
    }

    return { sections };
  }

  generateBOMPDF(processingResults: any[], projectName: string): void {
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
          doc.setFontSize(8);
          doc.text(
            'This is an AI-generated estimate for internal use only. Not reviewed or certified by a licensed professional.',
            10,
            28,
          );
          doc.text(
            'Do not rely for regulatory, permitting, or construction purposes without independent validation. ProBuild AI disclaims all liability.',
            10,
            32,
          );
        }
        doc.setFontSize(18);
        doc.text(
          `Bill of Materials for: ${projectName}`,
          10,
          withLogo ? 45 : 15,
        );
      };

      parsedReport.sections.forEach((section: any, index: number) => {
        if (index > 0) {
          doc.addPage();
        }
        addPageHeader();

        doc.setFontSize(14);
        doc.text(section.title, 10, withLogo ? 55 : 25);

        autoTable(doc, {
          head: [section.headers],
          body: section.content,
          startY: withLogo ? 60 : 30,
          theme: 'grid',
          headStyles: {
            fillColor: '#FFC107',
            textColor: '#000000',
          },
        });
      });

      const date = new Date().toISOString().slice(0, 10);
      doc.setProperties({
        title: `${projectName} Bill of Materials`,
        subject: 'AI-Generated Estimate',
        author: 'ProBuild AI',
        keywords: 'BOM, estimate, AI, construction',
        creator: 'ProBuild AI',
      });
      doc.save(`${projectName}_BOM_${date}.pdf`);
    };

    logo.onload = () => {
      drawContent(true);
    };

    logo.onerror = () => {
      this.snackBar.open(
        'Could not load logo, proceeding without it.',
        'Close',
        {
          duration: 3000,
        },
      );
      drawContent(false);
    };
  }

  public extractTotalCost(fullResponse: string): string | null {
    if (!fullResponse) {
      return null;
    }

    const parsedReport = this.parseReport(fullResponse);
    if (
      !parsedReport ||
      !parsedReport.sections ||
      parsedReport.sections.length === 0
    ) {
      return null;
    }

    const lastSection = parsedReport.sections[parsedReport.sections.length - 1];
    if (
      lastSection &&
      lastSection.type === 'table' &&
      lastSection.content &&
      lastSection.content.length > 0
    ) {
      const lastRow = lastSection.content[lastSection.content.length - 1];
      if (lastRow && lastRow.length > 0) {
        const totalCostCell = lastRow[lastRow.length - 1];
        const match = totalCostCell.match(/\$([\d,]+\.\d{2})/);
        if (match && match[1]) {
          return match[1];
        }
        const numberMatch = totalCostCell.match(/[\d,]+\.\d{2}/);
        if (numberMatch && numberMatch[0]) {
          return numberMatch[0];
        }
      }
    }

    return null;
  }

  getValueEngineeringItems(jobId: string): Observable<any[]> {
    return this.getBillOfMaterials(jobId).pipe(
      map((results) => {
        if (!results || results.length === 0 || !results[0].parsedReport) {
          return [];
        }
        const report = results[0].parsedReport;
        // Look for the "Value Engineering Options Table" or section title "Value Engineering"
        const veSection = report.sections.find(
          (s: any) =>
            s.title &&
            (s.title.includes('Value Engineering') ||
              (s.headers && s.headers[0].includes('VE ID')))
        );

        if (!veSection || !veSection.content) {
          return [];
        }

        return veSection.content.map((row: any[]) => {
          const parseCost = (val: string) => {
            if (!val) return 0;
            const num = parseFloat(val.replace(/[^0-9.-]+/g, ''));
            return isNaN(num) ? 0 : num;
          };

          return {
            id: row[0],
            category: row[1],
            original: row[2],
            proposed: row[3],
            originalCost: parseCost(row[4]),
            alternativeCost: parseCost(row[5]),
            savings: parseCost(row[6]),
            analysis: row[7],
            // Helper fields
            scheduleImpact: row[7]?.includes('Schedule Impact')
              ? row[7]
              : 'Unknown',
            performanceImpact: row[7]?.includes('Performance Impact')
              ? row[7]
              : 'Unknown',
          };
        });
      })
    );
  }

  getTradePackages(jobId: string): Observable<any[]> {
    // Try fetching from API first
    return this.http.get<any[]>(`${this.apiUrl}/${jobId}`).pipe(
      map((apiPackages) => {
        if (apiPackages && apiPackages.length > 0) {
          return apiPackages.map((pkg) => ({
            id: pkg.id,
            trade: pkg.tradeName,
            category: pkg.category?.toLowerCase() || 'trade',
            scopeOfWork: pkg.scopeOfWork,
            estimatedManHours: pkg.estimatedManHours,
            hourlyRate: pkg.hourlyRate,
            budget: pkg.budget,
            csiCode: pkg.csiCode,
            bidType: 'labor-material',
            postedToMarketplace: pkg.postedToMarketplace,
            bids: [], // Bids are loaded separately
            hasInternalQuote: false,
          }));
        }
        return [];
      }),
      catchError((err) => {
        console.warn('Failed to fetch trade packages from API, falling back to report parsing', err);
        // Fallback to report parsing if API fails or returns empty (e.g. migration not run)
        return this.getBillOfMaterials(jobId).pipe(
          map((results) => {
            if (!results || results.length === 0 || !results[0].parsedReport) {
              return [];
            }
            const report = results[0].parsedReport;
            const tradePackages: any[] = [];

            // Iterate through sections to find "Subcontractor Cost Breakdown" tables
            report.sections.forEach((section: any) => {
              if (
                section.title &&
                (section.title.includes('Subcontractor Cost Breakdown') ||
                  (section.headers &&
                    section.headers.join(' ').toLowerCase().includes('scope of work')))
              ) {
                section.content.forEach((row: any[]) => {
                  const tradeName = row[0];
                  const scope = row[1];
                  const hours = parseInt(row[2]) || 0;
                  const rate = parseFloat(row[3]?.replace(/[^0-9.]/g, '')) || 0;
                  const totalCost =
                    parseFloat(row[4]?.replace(/[^0-9.]/g, '')) || 0;
                  const csi = row[5];

                  if (tradeName && tradeName !== 'Total Subcontractor Cost') {
                    tradePackages.push({
                      id: csi || tradeName.replace(/\s+/g, '-').toLowerCase(),
                      trade: tradeName,
                      category: 'trade',
                      scopeOfWork: scope,
                      estimatedManHours: hours,
                      hourlyRate: rate,
                      budget: totalCost,
                      csiCode: csi,
                      bidType: 'labor-material',
                      postedToMarketplace: false,
                      bids: [],
                      hasInternalQuote: false,
                    });
                  }
                });
              }
            });

            return tradePackages;
          })
        );
      })
    );
  }

  postTradePackage(id: string | number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/post`, {});
  }

  refreshTradePackages(jobId: string | number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${jobId}/refresh`, {});
  }

  updateTradePackage(id: number, tradePackage: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, tradePackage);
  }

  getMyMarketplacePostings(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/${userId}/postings`);
  }
}
