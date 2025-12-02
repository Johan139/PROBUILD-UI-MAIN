import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root',
})
export class SpreadsheetService {
  constructor() {}

  public generateCsv(data: { [key: string]: any[] }, fileName: string): void {
    for (const sheetName in data) {
      if (Object.prototype.hasOwnProperty.call(data, sheetName)) {
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
          data[sheetName],
        );
        const csvOutput: string = XLSX.utils.sheet_to_csv(worksheet);
        this.downloadFile(
          csvOutput,
          `${fileName}_${sheetName}.csv`,
          'text/csv',
        );
      }
    }
  }

  public generateExcel(data: { [key: string]: any[] }, fileName: string): void {
    const workbook: XLSX.WorkBook = { Sheets: {}, SheetNames: [] };
    const usedSheetNames: { [key: string]: number } = {};

    for (const sheetName in data) {
      if (Object.prototype.hasOwnProperty.call(data, sheetName)) {
        let safeSheetName = sheetName
          .replace(/[:\\/?*[\]]/g, '')
          .substring(0, 31);

        if (usedSheetNames[safeSheetName]) {
          const newName = `${safeSheetName.substring(0, 28)}_${usedSheetNames[safeSheetName]++}`;
          safeSheetName = newName;
        } else {
          usedSheetNames[safeSheetName] = 1;
        }

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
          data[sheetName],
        );
        workbook.Sheets[safeSheetName] = worksheet;
        workbook.SheetNames.push(safeSheetName);
      }
    }

    workbook.Props = {
      Title: `${fileName}`,
      Subject: 'AI-Generated Estimate',
      Author: 'ProBuild AI',
      Comments:
        'This is an AI-generated estimate for internal use only. Not reviewed or certified by a licensed professional. Do not rely for regulatory, permitting, or construction purposes without independent validation. ProBuild AI disclaims all liability.',
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    this.downloadFile(
      excelBuffer,
      `${fileName}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  private downloadFile(data: any, fileName: string, type: string): void {
    const blob = new Blob([data], { type: type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
