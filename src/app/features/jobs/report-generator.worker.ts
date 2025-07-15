/// <reference lib="webworker" />

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to format project information
const formatProjectInfo = (text: string): string => {
  // Handle the concatenated project info
  if (text.includes('Project:') && text.includes('Address:') && text.includes('Date:')) {
    return text
      .replace(/RESIDENCEAddress:/g, 'RESIDENCE\nAddress:')
      .replace(/Address:/g, '\nAddress:')
      .replace(/Date:/g, '\nDate:')
  }
  return text;
};

// Helper function to prevent line breaks after colons
const preventColonBreaks = (text: string): string => {
  // Replace colon + space with colon + non-breaking space equivalent
  // This prevents jsPDF from breaking the line right after a colon
  return text.replace(/:\s+/g, ':\u00A0'); // \u00A0 is a non-breaking space
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
          let cleanPText = cleanTextForPDF(element.text);

          // Special handling for project information
          if (cleanPText.includes('Project:') && cleanPText.includes('Address:') && cleanPText.includes('Date:')) {
            // Extract and format each piece of information
            const projectMatch = cleanPText.match(/Project:\s*([^A]+?)(?=Address:|$)/);
            const addressMatch = cleanPText.match(/Address:\s*([^D]+?)(?=Date:|$)/);
            const dateMatch = cleanPText.match(/Date:\s*(.+)/);

            if (projectMatch && addressMatch && dateMatch) {
              const project = projectMatch[1].trim();
              const address = addressMatch[1].trim();
              const date = dateMatch[1].trim();

              // Format as separate lines
              doc.setFont('helvetica', 'bold');
              doc.text('Project:', margin, currentY);
              doc.setFont('helvetica', 'normal');
              doc.text(project, margin + 25, currentY);
              currentY += 6;

              doc.setFont('helvetica', 'bold');
              doc.text('Address:', margin, currentY);
              doc.setFont('helvetica', 'normal');
              const addressLines = doc.splitTextToSize(address, usableWidth - 25);
              doc.text(addressLines, margin + 25, currentY);
              currentY += (addressLines.length * 5);

              doc.setFont('helvetica', 'bold');
              doc.text('Date:', margin, currentY);
              doc.setFont('helvetica', 'normal');
              doc.text(date, margin + 25, currentY);
              currentY += 7;
            } else {
              // Fallback to simple formatting
              cleanPText = formatProjectInfo(cleanPText);
              const pLines = doc.splitTextToSize(cleanPText, usableWidth);
              doc.text(pLines, margin, currentY, { charSpace: 0 });
              currentY += (pLines.length * 5) + 2;
            }
          } else {
            // Regular paragraph handling
            const pLines = doc.splitTextToSize(cleanPText, usableWidth);
            doc.text(pLines, margin, currentY, { charSpace: 0 });
            currentY += (pLines.length * 5) + 2;
          }
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
            let cleanItem = cleanTextForPDF(item);
            cleanItem = preventColonBreaks(cleanItem); // Add this line
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
            let cleanItem = cleanTextForPDF(item);
            cleanItem = preventColonBreaks(cleanItem); // Add this line
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
