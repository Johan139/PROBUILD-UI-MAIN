/// <reference lib="webworker" />

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const { reportContent, logoDataUrl } = data;

  try {
    const doc = new jsPDF('p', 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = margin;

    // Header with logo (only if logoDataUrl is provided)
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', margin, currentY, 40, 15);
      } catch (logoError) {
        console.warn('Could not add logo to PDF:', logoError);
      }
    }

    currentY += 20;
    doc.setDrawColor(255, 215, 0); // Yellow color for the line
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Environmental Lifecycle Report', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Content
    const usableWidth = pageWidth - 2 * margin;

    for (let i = 0; i < reportContent.length; i++) {
      const element = reportContent[i];

      // Handling for headings
      if (element.type === 'h3') {
        const minSpaceAfterHeading = 30; // Minimum space needed after heading (for content)

        // Check if need to break to next page for the heading
        if (currentY > pageHeight - margin - minSpaceAfterHeading) {
          doc.addPage();
          currentY = margin;
        }
      } else {
        // Regular page break check for non-headings
        if (currentY > pageHeight - margin) {
          doc.addPage();
          currentY = margin;
        }
      }

      switch (element.type) {
        case 'h3':
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          const cleanH3Text = cleanTextForPDF(element.text);
          const h3Lines = doc.splitTextToSize(cleanH3Text, usableWidth);
          doc.text(h3Lines, margin, currentY, { charSpace: 0 });
          currentY += (h3Lines.length * 7) + 2;
          break;
        case 'p':
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const cleanPText = cleanTextForPDF(element.text);
          const pLines = doc.splitTextToSize(cleanPText, usableWidth);
          doc.text(pLines, margin, currentY, { charSpace: 0 });
          currentY += (pLines.length * 5) + 2;
          break;
        case 'ul':
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          element.items.forEach((item: string) => {
            if (currentY > pageHeight - margin) {
              doc.addPage();
              currentY = margin;
            }
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const cleanItem = cleanTextForPDF(item);
            const itemLines = doc.splitTextToSize(`• ${cleanItem}`, usableWidth - 5);
            doc.text(itemLines, margin + 5, currentY, { charSpace: 0 });
            currentY += (itemLines.length * 5) + 2;
          });
          break;
        case 'ol':
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          let olCounter = 1;
          element.items.forEach((item: string) => {
            if (currentY > pageHeight - margin) {
              doc.addPage();
              currentY = margin;
            }
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const cleanItem = cleanTextForPDF(item);
            const itemLines = doc.splitTextToSize(`${olCounter}. ${cleanItem}`, usableWidth - 5);
            doc.text(itemLines, margin + 5, currentY, { charSpace: 0 });
            currentY += (itemLines.length * 5) + 2;
            olCounter++;
          });
          break;
        case 'table':
          // Clean the table data of problematic Unicode characters
          const cleanElement = cleanTableData(element);

          autoTable(doc, {
            head: cleanElement.head,
            body: cleanElement.body,
            startY: currentY,
            theme: 'grid',
            margin: { left: margin, right: margin },
            headStyles: {
              fillColor: '#FFC107',
              textColor: '#000000'
            },
            didDrawPage: (data) => {
               currentY = data.cursor?.y ?? currentY;
            }
          });
          currentY = (doc as any).lastAutoTable.finalY + 10;
          break;
      }
    }

    // Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
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
