/// <reference lib="webworker" />

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fetchAsDataURL = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper function to clean Unicode characters that cause issues in jsPDF
const cleanTextForPDF = (text: string): string => {
  return text
    .replace(/CO₂/g, 'CO2')           // Replace CO₂ with CO2
    .replace(/₂/g, '2')              // Replace any other subscript 2
    .replace(/₁/g, '1')              // Replace subscript 1
    .replace(/₃/g, '3')              // Replace subscript 3
    .replace(/₄/g, '4')              // Replace subscript 4
    .replace(/₀/g, '0')              // Replace subscript 0
    .replace(/[^\x00-\x7F]/g, '?')   // Replace any other non-ASCII chars with ?
    .replace(/\?+/g, '?');           // Clean up multiple ?s
};

// Function to recursively clean table data
const cleanTableData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(cleanTableData);
  } else if (typeof data === 'string') {
    return cleanTextForPDF(data);
  } else if (typeof data === 'object' && data !== null) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      cleaned[key] = cleanTableData(value);
    }
    return cleaned;
  }
  return data;
};

addEventListener('message', async ({ data }) => {
  const { reportContent } = data;

  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const logoUrl = '/assets/logo.jpg';
    const logoDataUrl = await fetchAsDataURL(logoUrl);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = margin;

    // Calculate available widths
    const usableWidth = pageWidth - 2 * margin; // 180mm for A4 with 15mm margins

    // Helper function to get proper line height
    const getLineHeight = (fontSize: number): number => {
      return fontSize * 1.1;
    };

    // Header
    doc.addImage(logoDataUrl, 'JPEG', margin, currentY, 40, 15);
    currentY += 20;
    doc.setDrawColor(255, 215, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Environmental Lifecycle Report', pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    // Content
    for (const element of reportContent) {
      // Check for page break
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
      }

      switch (element.type) {
        case 'h3':
          currentY += 4;
          const h3FontSize = 14;
          doc.setFontSize(h3FontSize);
          doc.setFont('helvetica', 'bold');
          const cleanH3Text = cleanTextForPDF(element.text);
          const h3Lines = doc.splitTextToSize(cleanH3Text, usableWidth);
          const h3LineHeight = getLineHeight(h3FontSize);

          h3Lines.forEach((line: string, index: number) => {
            if (currentY > pageHeight - 40) {
              doc.addPage();
              currentY = margin;
            }
            doc.text(line, margin, currentY);
            if (index < h3Lines.length - 1) {
              currentY += h3LineHeight;
            }
          });
          currentY += h3LineHeight + 1;
          break;

        case 'p':
          currentY += 1;
          const pFontSize = 10;
          doc.setFontSize(pFontSize);
          doc.setFont('helvetica', 'normal');
          const cleanPText = cleanTextForPDF(element.text);
          const pLines = doc.splitTextToSize(cleanPText, usableWidth);
          const pLineHeight = getLineHeight(pFontSize);

          pLines.forEach((line: string, index: number) => {
            if (currentY > pageHeight - 40) {
              doc.addPage();
              currentY = margin;
            }
            doc.text(line, margin, currentY);
            if (index < pLines.length - 1) {
              currentY += pLineHeight;
            }
          });
          currentY += pLineHeight + 1;
          break;

        case 'ul':
          currentY += 1;
          const ulFontSize = 10;
          doc.setFontSize(ulFontSize);
          doc.setFont('helvetica', 'normal');
          const ulLineHeight = getLineHeight(ulFontSize);
          const bulletIndent = 5;
          const ulTextWidth = usableWidth - bulletIndent;

          element.items.forEach((item: string, itemIndex: number) => {
            if (currentY > pageHeight - 40) {
              doc.addPage();
              currentY = margin;
            }
            const cleanItem = cleanTextForPDF(item);
            const itemLines = doc.splitTextToSize(`• ${cleanItem}`, ulTextWidth);
            itemLines.forEach((line: string, lineIndex: number) => {
              doc.text(line, margin + bulletIndent, currentY);
              if (lineIndex < itemLines.length - 1) {
                currentY += ulLineHeight;
              }
            });
            if (itemIndex < element.items.length - 1) {
              currentY += ulLineHeight * 0.8;
            }
          });
          currentY += ulLineHeight + 1;
          break;

        case 'ol':
          currentY += 1;
          const olFontSize = 10;
          doc.setFontSize(olFontSize);
          doc.setFont('helvetica', 'normal');
          const olLineHeight = getLineHeight(olFontSize);
          const numberIndent = 5;
          const olTextWidth = usableWidth - numberIndent;
          let olCounter = 1;

          element.items.forEach((item: string, itemIndex: number) => {
            if (currentY > pageHeight - 40) {
              doc.addPage();
              currentY = margin;
            }
            const cleanItem = cleanTextForPDF(item);
            const itemLines = doc.splitTextToSize(`${olCounter}. ${cleanItem}`, olTextWidth);
            itemLines.forEach((line: string, lineIndex: number) => {
              doc.text(line, margin + numberIndent, currentY);
              if (lineIndex < itemLines.length - 1) {
                currentY += olLineHeight;
              }
            });
            if (itemIndex < element.items.length - 1) {
              currentY += olLineHeight * 0.8;
            }
            olCounter++;
          });
          currentY += olLineHeight + 1;
          break;

        case 'table':
          currentY += 2;

          // Clean the table data of problematic Unicode characters
          const cleanElement = cleanTableData(element);

          // Determine table layout based on number of columns
          const numCols = cleanElement.head[0]?.length || 3;
          let columnStyles: any = {};

          if (numCols === 3) {
            // 3-column table
            columnStyles = {
              0: { cellWidth: 45, overflow: 'linebreak' },
              1: { cellWidth: 100, overflow: 'linebreak' },
              2: { cellWidth: 35, overflow: 'linebreak' }
            };
          } else if (numCols === 6) {
            // 6-column table
            columnStyles = {
              0: { cellWidth: 35, overflow: 'linebreak' },
              1: { cellWidth: 20, overflow: 'linebreak' },
              2: { cellWidth: 15, overflow: 'linebreak' },
              3: { cellWidth: 25, overflow: 'linebreak' },
              4: { cellWidth: 30, overflow: 'linebreak' },
              5: { cellWidth: 20, overflow: 'linebreak' }
            };
          } else {
            // Default: distribute evenly
            const colWidth = usableWidth / numCols;
            for (let i = 0; i < numCols; i++) {
              columnStyles[i] = { cellWidth: colWidth, overflow: 'linebreak' };
            }
          }

          autoTable(doc, {
            head: cleanElement.head,
            body: cleanElement.body,
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            tableWidth: usableWidth,
            styles: {
              fontSize: 7,
              cellPadding: 1.5,
              overflow: 'linebreak',
              lineWidth: 0.1,
              lineColor: [200, 200, 200],
              valign: 'top',
              halign: 'left'
            },
            headStyles: {
              fillColor: '#FFC107',
              textColor: '#000000',
              fontStyle: 'bold',
              overflow: 'linebreak',
              fontSize: 7,
              cellPadding: 1.5
            },
            bodyStyles: {
              textColor: '#333333',
              overflow: 'linebreak',
              valign: 'top',
              fontSize: 7,
              cellPadding: 1.5
            },
            columnStyles: columnStyles,
            alternateRowStyles: {
              fillColor: '#f9f9f9'
            },
            showHead: 'everyPage',
            pageBreak: 'auto',
            didDrawPage: (data) => {
              currentY = data.cursor?.y ?? currentY;
            }
          });
          currentY = (doc as any).lastAutoTable.finalY + 3;
          break;
      }
    }

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Page ${i} of ${totalPages} - This report was generated by AI. View our terms and conditions`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    const pdfBlob = doc.output('blob');
    postMessage({ success: true, pdfBlob });

  } catch (error) {
    console.error('Error generating PDF in worker:', error);
    postMessage({ success: false, error: 'Failed to generate PDF' });
  }
});
