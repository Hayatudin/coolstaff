import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TEMPLATES: Record<string, { name: string; fullName: string }> = {
  'all': { name: 'ALL', fullName: '' },
  'ussus': { name: 'USSUS', fullName: 'USSUS ALENJAZ RECRUITMENT COMPANY' },
  'al-shablan': { name: 'AL-Shablan', fullName: 'AL-SHABLAN RECRUITMENT COMPANY' },
  'alm': { name: 'ALAALAM', fullName: 'ALEM RECRUITMENT AGENCY' },
  'ka7': { name: 'KAAFAAT', fullName: 'KAAFAAT ALAALAM RECRUITMENT COMPANY' },
  'ku2': { name: 'KHUZAM', fullName: 'KHUZAM  RECRUITMENT COMPANY' },
  'ma': { name: 'MA Standard', fullName: 'NAKHLAH RECRUITMENT COMPANY' },
  'ra': { name: 'RAYAAT', fullName: 'RAYAAT RECRUITMENT COMPANY' },
  'vision': { name: 'Vision Office', fullName: 'VISION RECRUITMENT OFFICE' }
};

const getAgencyName = (templateId: string | null | undefined): string => {
  if (!templateId) return 'N/A';
  const tid = templateId.toLowerCase().trim();
  const found = TEMPLATES[tid];
  return found ? found.fullName : templateId.toUpperCase();
};

const formatDateKey = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (_) {
    return 'N/A';
  }
};

export const generateDeploymentsPdf = (candidates: any[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Title and Header Design
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Sleek charcoal/slate
  doc.text('DAERA AGENCY', 14, 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('CANDIDATE DEPLOYMENT LIST BY DATE', 14, 26);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 31);

  // Add thin divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  // Group candidates by deployment date
  const groups: Record<string, any[]> = {};
  for (const c of candidates) {
    const depDateVal = c.invoices?.[0]?.deployedDate;
    const key = formatDateKey(depDateVal);
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  // Sort groups (chronologically if possible, N/A last)
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'N/A') return 1;
    if (b === 'N/A') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const columns = [
    'Name',
    'Passport Number',
    'Agency (CV Template Full Name)',
    'Broker',
    'Deployment Date',
  ];

  const bodyData: any[] = [];

  sortedKeys.forEach((dateKey, index) => {
    // 1. Full-row header for the date (distinct styles will be applied in drawCell)
    bodyData.push([
      {
        content: `DEPLOYMENT DATE: ${dateKey.toUpperCase()} (${groups[dateKey].length} Candidates)`,
        colSpan: 5,
        isDateHeader: true,
      },
    ]);

    // 2. Add candidates for this date
    groups[dateKey].forEach(c => {
      const templateId = c.generatedCVs?.[0]?.templateId;
      const agencyName = getAgencyName(templateId);
      const fullName = `${c.givenNames} ${c.surname}`;
      const passport = c.passportNumber || 'N/A';
      const broker = c.broker?.name || 'DIRECT';
      
      bodyData.push([
        fullName,
        passport,
        agencyName,
        broker,
        dateKey,
      ]);
    });

    // 3. Add 1 empty row gap if not the last date group
    if (index < sortedKeys.length - 1) {
      bodyData.push([
        {
          content: '',
          colSpan: 5,
          isEmptyRow: true,
        },
      ]);
    }
  });

  autoTable(doc, {
    startY: 40,
    head: [columns],
    body: bodyData,
    theme: 'plain',
    headStyles: {
      fillColor: [79, 70, 229], // Premium Indigo color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [51, 65, 85],
      lineColor: [241, 245, 249],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 30 },
      2: { cellWidth: 65 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
    },
    didParseCell: (data) => {
      const row = data.row.raw as any[];
      const firstCell = row[0];

      if (firstCell && typeof firstCell === 'object') {
        if (firstCell.isDateHeader) {
          data.cell.styles.fillColor = [238, 242, 255]; // Soft Indigo background
          data.cell.styles.textColor = [67, 56, 202]; // Deep Indigo text
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 9.5;
          // Set thin top/bottom borders for headers
          data.cell.styles.lineColor = [199, 210, 254];
          data.cell.styles.lineWidth = 0.5;
        } else if (firstCell.isEmptyRow) {
          data.cell.styles.fillColor = [255, 255, 255];
          data.cell.styles.minCellHeight = 6;
          data.cell.styles.lineWidth = 0; // Hide borders
        }
      }
    },
  });

  // Save the PDF
  doc.save('Candidate_Deployments_Report.pdf');
};
